export default async function handler(req, res) {
    // אפשר רק POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('קיבלנו בקשה:', req.body);
        
        const formData = req.body;
        const customerName = formData.customerName || formData['שם לקוח'];
        
        // בדיקה בסיסית
        if (!customerName) {
            return res.status(400).json({ 
                success: false, 
                error: 'שם לקוח חסר',
                received: Object.keys(formData || {})
            });
        }
        
        // בדיקה אם יש SendGrid API Key
        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                success: false, 
                error: 'SendGrid API Key לא מוגדר' 
            });
        }
        
        // יצירת HTML לאימיל
        const emailHTML = createEmailHTML(formData, customerName);
        
        // יצירת PDF
        const pdfBuffer = await createPDF(formData, customerName);
        const pdfBase64 = pdfBuffer.toString('base64');
        
        // שליחת אימיל דרך SendGrid API עם PDF מצורף
        const emailData = {
            personalizations: [{
                to: [{ email: 'yus2770@gmail.com' }],
                subject: 'הזמנה חדשה מ-' + customerName
            }],
            from: { email: '9606663@gmail.com' },
            content: [{
                type: 'text/html',
                value: emailHTML
            }],
            attachments: [{
                content: pdfBase64,
                filename: 'הזמנה_' + customerName + '_' + new Date().toLocaleDateString('he-IL').replace(/\//g, '-') + '.pdf',
                type: 'application/pdf',
                disposition: 'attachment'
            }]
        };
        
        console.log('שולח אימיל ל:', emailData.personalizations[0].to[0].email);
        
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('SendGrid Error:', errorText);
            throw new Error('SendGrid API Error: ' + response.status + ' - ' + errorText);
        }
        
        console.log('האימיל נשלח בהצלחה');
        
        res.status(200).json({ 
            success: true, 
            message: 'האימיל נשלח בהצלחה!',
            orderData: formData 
        });

    } catch (error) {
        console.error('שגיאה מפורטת:', error);
        res.status(500).json({ 
            success: false, 
            error: 'שגיאה בשליחת האימיל',
            details: error.message
        });
    }
}

// מיפוי מוצרים לקטגוריות
var CATEGORIES = {
    'מוצרי הודו': [
        'הודו_אדום', 'הודו_אדום_חנות', 'שניצל', 'שווארמה', 'שווארמה_חנות',
        'טחון_הודו', 'טחון_הודו_1_קג', 'טחון_חזה', 'טחון_אדום', 'רולדה_הודו',
        'גרון', 'כנפיים', 'שוקיים', 'צלעות_הודו', 'סטייק_הודו', 'שיפודים',
        'קורקבן', 'כבד_הודו_צלוי'
    ],
    'מוצרי בקר': [
        'טחון_בקר', 'טחון_בקר_1_קג', 'גולש_בקר', 'חמין', 'רולדה_בקר',
        'סטייק_שלם', 'סטייק_פרוס', 'סטייק_דק', 'סטייק_עצם', 'צלעות_מס\'_2',
        'חזה_מס\'_3', 'כתף_מס\'_4', 'צלי_כתף_מס\'_5', 'פילה_מדומה_מס\'_6',
        'מכסה_הצלע_מס\'_7', 'מכסה_ורד_הצלע_מס\'_17', 'שריר_מס\'_8',
        'אסדו_שלם_מס\'_9', 'אסדו_מגש', 'אסדו_99', 'אסדו_עצם_שלם', 'אסדו_עצם_מגש',
        'צוואר_מס\'_10', 'שומן_בקר', 'לב_הצלעות', 'עצמות_מח', 'אצבעות',
        'גידים', 'לשון', 'ראש', 'אוסבוקו', 'שניצל_עגל'
    ],
    'מוצרים': [
        'קבב', 'המבורגר', 'נקיניקיות', 'נקניקיות_חריפות', 'נקניקיות_בקר',
        'מרגז', 'צוריסוס', 'קציצות_בקר', 'סטייקבורגר', 'קוגל_לחמין'
    ],
    'מוסדי': [
        'שניצל_מוסדי', 'גולש_בקר_מוסדי', 'קבב_בקר_מוסדי', 'המבורגר_בקר_מוסדי',
        'נקניקיות_מוסדי', 'נקניקיות_בקר_מוסדי', 'קציצות_בקר_מוסדי', 'שווארמה_מוסדי',
        'שווארמה_תפזורת', 'הודו_אדום_קוביות', 'נתחי_חזה', 'פרפר_מוסדי', 'שומן_הודו',
        'מכסה_הצלע_קוביות', 'טריימינג', 'מרגז_מוסדי', 'צוריסוס_מוסדי',
        'קבב_הודו_מוסדי', 'המבורגר_הודו_מוסדי', 'טחון_הודו_מוסדי', 'טחון_בקר_בקר_מוסדי',
        'רולדה_הודו_מוסדי', 'רולדה_בקר_מוסדי'
    ],
    'נקניקים': [
        'חזה_400', 'רומני_400', 'בקר_400', 'סלמי_400', 'קוניאק_400', 'הודו_400',
        'חזה_200', 'רומני_200', 'בקר_200', 'סלמי_200', 'קוניאק_200', 'הודו_200',
        'חזה_מעושן', 'רומני_מעושן', 'בקר_מעושן', 'נקניק_סלמי', 'נקניק_קוניאק',
        'נקניק_הודו', 'קבנוס', 'קוניאק_יבש'
    ],
    'כבש': [
        'צלעות_כבש', 'כתף_כבש', 'צוואר_כבש', 'זרוע_כבש', 'שומן_כבש',
        'חמין_כבש', 'אסדו_כבש', 'כבד_לא_צלוי', 'טחול', 'אשכים', 'לב'
    ]
};

// פונקציה ליצירת HTML לאימיל עם ארגון לפי קטגוריות
function createEmailHTML(data, customerName) {
    // ארגון המוצרים לפי קטגוריות
    var organizedProducts = {};
    
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.indexOf('כמות_') === 0 && data[key]) {
            var productType = key.replace('כמות_', '');
            var weightKey = 'משקל_' + productType;
            var notesKey = 'הערות_' + productType;
            
            var product = {
                name: productType.replace(/_/g, ' '),
                quantity: data[key],
                weight: data[weightKey] || '',
                notes: data[notesKey] || ''
            };
            
            // מציאת הקטגוריה המתאימה למוצר
            var categoryFound = false;
            var categoryNames = Object.keys(CATEGORIES);
            for (var j = 0; j < categoryNames.length; j++) {
                var categoryName = categoryNames[j];
                var categoryProducts = CATEGORIES[categoryName];
                if (categoryProducts.indexOf(productType) !== -1) {
                    if (!organizedProducts[categoryName]) {
                        organizedProducts[categoryName] = [];
                    }
                    organizedProducts[categoryName].push(product);
                    categoryFound = true;
                    break;
                }
            }
            
            // אם לא נמצאה קטגוריה, הוסף לקטגוריה כללית
            if (!categoryFound) {
                if (!organizedProducts['אחרים']) {
                    organizedProducts['אחרים'] = [];
                }
                organizedProducts['אחרים'].push(product);
            }
        }
    }

    var customerCode = data.customerCode || data['קוד לקוח'] || '';
    var deliveryDate = data.deliveryDate || data['תאריך אספקה'] || '';
    var orderNotes = data.orderNotes || data['הערות כלליות'] || '';

    var html = '<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 800px; margin: 0 auto;">';
    html += '<h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">הזמנה חדשה - מוצרי שייקביץ</h1>';
    html += '<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">';
    html += '<h2 style="color: #34495e; margin-top: 0;">פרטי הלקוח</h2>';
    html += '<p><strong>שם לקוח:</strong> ' + customerName + '</p>';
    
    if (customerCode) {
        html += '<p><strong>קוד לקוח:</strong> ' + customerCode + '</p>';
    }
    
    if (deliveryDate) {
        html += '<p><strong>תאריך אספקה:</strong> ' + formatDate(deliveryDate) + '</p>';
    }
    
    html += '<p><strong>תאריך ההזמנה:</strong> ' + getCurrentDateTime() + '</p>';
    html += '</div>';
    html += '<h2 style="color: #34495e;">פרטי ההזמנה</h2>';

    // יצירת טבלאות לפי קטגוריות
    var organizedCategoryNames = Object.keys(organizedProducts);
    for (var k = 0; k < organizedCategoryNames.length; k++) {
        var categoryName = organizedCategoryNames[k];
        var products = organizedProducts[categoryName];
        
        if (products.length > 0) {
            html += '<div style="margin-bottom: 30px;">';
            html += '<h3 style="color: #2c3e50; background-color: #e8f4f8; padding: 10px; border-radius: 5px; margin-bottom: 10px;">';
            html += categoryName;
            html += '</h3>';
            html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
            html += '<thead>';
            html += '<tr style="background-color: #34495e; color: white;">';
            html += '<th style="padding: 12px; border: 1px solid #ddd; text-align: right;">מוצר</th>';
            html += '<th style="padding: 12px; border: 1px solid #ddd; text-align: center;">כמות</th>';
            html += '<th style="padding: 12px; border: 1px solid #ddd; text-align: center;">משקל (ק״ג)</th>';
            html += '<th style="padding: 12px; border: 1px solid #ddd; text-align: right;">הערות</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';
            
            for (var l = 0; l < products.length; l++) {
                var product = products[l];
                var bgColor = l % 2 === 0 ? '#f8f9fa' : '#ffffff';
                html += '<tr style="background-color: ' + bgColor + ';">';
                html += '<td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">' + product.name + '</td>';
                html += '<td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #27ae60; font-weight: bold;">' + product.quantity + '</td>';
                html += '<td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #2980b9; font-weight: bold;">' + product.weight + '</td>';
                html += '<td style="padding: 10px; border: 1px solid #ddd;">' + product.notes + '</td>';
                html += '</tr>';
            }
            
            html += '</tbody>';
            html += '</table>';
            html += '</div>';
        }
    }
    
    // הערות כלליות
    if (orderNotes) {
        html += '<div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">';
        html += '<h3 style="color: #2c3e50; margin-top: 0;">הערות כלליות</h3>';
        html += '<p>' + orderNotes + '</p>';
        html += '</div>';
    }
    
    // הודעת סיום
    html += '<div style="margin-top: 30px; padding: 15px; background-color: #d4edda; border-radius: 8px;">';
    html += '<p style="margin: 0; color: #155724;">';
    html += '<strong>ההזמנה התקבלה בהצלחה!</strong><br>';
    html += 'קובץ PDF של ההזמנה מצורף למייל זה.';
    html += '</p>';
    html += '</div>';
    html += '</div>';
    
    return html;
}

// פונקציה ליצירת PDF פשוט ועובד
async function createPDF(data, customerName) {
    console.log('Creating simple PDF for:', customerName);
    
    try {
        // ננסה עם PDFShift אם יש API key
        var pdfShiftKey = process.env.PDFSHIFT_API_KEY;
        
        if (pdfShiftKey) {
            console.log('Trying PDFShift API');
            var pdfHTML = createPDFHTML(data, customerName);
            
            var pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(pdfShiftKey + ':').toString('base64'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source: pdfHTML,
                    format: 'A4',
                    margin: '15mm',
                    landscape: false,
                    use_print: true
                })
            });
            
            if (pdfResponse.ok) {
                var pdfBuffer = await pdfResponse.arrayBuffer();
                console.log('PDFShift success, PDF size:', pdfBuffer.byteLength);
                return Buffer.from(pdfBuffer);
            } else {
                console.error('PDFShift failed:', pdfResponse.status);
                throw new Error('PDFShift failed');
            }
        }
        
        // אם אין PDFShift או שזה נכשל, ניצור PDF טקסטואלי פשוט
        console.log('Creating simple text PDF');
        return createSimplePDF(data, customerName);
        
    } catch (error) {
        console.error('PDF creation error:', error);
        // במקרה של כל שגיאה, ניצור PDF טקסטואלי פשוט
        return createSimplePDF(data, customerName);
    }
}

// יצירת HTML עבור ה-PDF עם ארגון לפי קטגוריות
function createPDFHTML(data, customerName) {
    // קוד דומה לאימיל אבל עם CSS מיוחד ל-PDF
    var html = '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">';
    html += '<title>הזמנה - ' + customerName + '</title>';
    html += '<style>body{font-family:Arial,sans-serif;direction:rtl;margin:20px;}</style>';
    html += '</head><body>';
    html += '<h1>מוצרי שייקביץ - הזמנה</h1>';
    html += '<p>שם לקוח: ' + customerName + '</p>';
    html += '<p>תאריך: ' + getCurrentDateTime() + '</p>';
    html += '</body></html>';
    
    return html;
}

// יצירת PDF פשוט ועובד כפתרון חלופי עם ארגון לפי קטגוריות
function createSimplePDF(data, customerName) {
    console.log('Creating simple text-based PDF for:', customerName);
    
    // ארגון המוצרים לפי קטגוריות
    var organizedProducts = {};
    
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.indexOf('כמות_') === 0 && data[key]) {
            var productType = key.replace('כמות_', '');
            var weightKey = 'משקל_' + productType;
            var notesKey = 'הערות_' + productType;
            
            var product = {
                name: productType.replace(/_/g, ' '),
                quantity: data[key],
                weight: data[weightKey] || '',
                notes: data[notesKey] || ''
            };
            
            // מציאת הקטגוריה המתאימה למוצר
            var categoryFound = false;
            var categoryNames = Object.keys(CATEGORIES);
            for (var j = 0; j < categoryNames.length; j++) {
                var categoryName = categoryNames[j];
                var categoryProducts = CATEGORIES[categoryName];
                if (categoryProducts.indexOf(productType) !== -1) {
                    if (!organizedProducts[categoryName]) {
                        organizedProducts[categoryName] = [];
                    }
                    organizedProducts[categoryName].push(product);
                    categoryFound = true;
                    break;
                }
            }
            
            // אם לא נמצאה קטגוריה, הוסף לקטגוריה כללית
            if (!categoryFound) {
                if (!organizedProducts['אחרים']) {
                    organizedProducts['אחרים'] = [];
                }
                organizedProducts['אחרים'].push(product);
            }
        }
    }

    // יצירת תוכן הטקסט בפורמט שניתן להדפסה
    var content = '';
    content += '==================================================\n';
    content += '                מוצרי שייקביץ                    \n';
    content += '                טופס הזמנה                      \n';
    content += '==================================================\n\n';
    
    content += 'פרטי הלקוח:\n';
    content += '------------\n';
    content += 'שם לקוח: ' + customerName + '\n';
    
    if (data.customerCode) {
        content += 'קוד לקוח: ' + data.customerCode + '\n';
    }
    
    if (data.deliveryDate) {
        content += 'תאריך אספקה: ' + formatDate(data.deliveryDate) + '\n';
    }
    
    content += 'תאריך הזמנה: ' + getCurrentDateTime() + '\n\n';
    
    content += 'פרטי ההזמנה:\n';
    content += '=============\n\n';
    
    // הוספת מוצרים לפי קטגוריות
    var organizedCategoryNames = Object.keys(organizedProducts);
    for (var k = 0; k < organizedCategoryNames.length; k++) {
        var categoryName = organizedCategoryNames[k];
        var products = organizedProducts[categoryName];
        
        if (products.length > 0) {
            content += categoryName + ':\n';
            var separator = '';
            for (var s = 0; s < categoryName.length + 1; s++) {
                separator += '-';
            }
            content += separator + '\n';
            
            for (var l = 0; l < products.length; l++) {
                var product = products[l];
                content += '\n• ' + product.name + '\n';
                content += '  כמות: ' + product.quantity;
                if (product.weight) {
                    content += ' | משקל: ' + product.weight + ' ק"ג';
                }
                content += '\n';
                if (product.notes) {
                    content += '  הערות: ' + product.notes + '\n';
                }
            }
            
            content += '\n';
        }
    }
    
    if (data.orderNotes) {
        content += 'הערות כלליות:\n';
        content += '=============\n';
        content += data.orderNotes + '\n\n';
    }
    
    content += '==================================================\n';
    content += 'מסמך זה הופק אוטומטית מטופס ההזמנה המקוון\n';
    content += getCurrentDateTime() + '\n';
    content += '==================================================\n';
    
    console.log('Simple PDF content length:', content.length);
    
    return Buffer.from(content, 'utf8');
}

function formatDate(dateString) {
    var date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

function getCurrentDateTime() {
    var now = new Date();
    return now.toLocaleString('he-IL');
}
