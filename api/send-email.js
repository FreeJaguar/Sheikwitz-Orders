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
        
        // שליחת אימיל דרך SendGrid API עם fetch
        const emailData = {
            personalizations: [{
                to: [{ email: '9606663@gmail.com' }], // ** החלף עם המייל שלך **
                subject: `הזמנה חדשה מ-${customerName}`
            }],
            from: { email: '9606663@gmail.com' }, // ** החלף עם המייל המאומת **
            content: [{
                type: 'text/html',
                value: emailHTML
            }]
        };
        
        console.log('שולח אימיל ל:', emailData.personalizations[0].to[0].email);
        
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('SendGrid Error:', errorText);
            throw new Error(`SendGrid API Error: ${response.status} - ${errorText}`);
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
const CATEGORIES = {
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
    const organizedProducts = {};
    
    Object.keys(data).forEach(key => {
        if (key.startsWith('כמות_') && data[key]) {
            const productType = key.replace('כמות_', '');
            const weightKey = `משקל_${productType}`;
            const notesKey = `הערות_${productType}`;
            
            const product = {
                name: productType.replace(/_/g, ' '),
                quantity: data[key],
                weight: data[weightKey] || '',
                notes: data[notesKey] || ''
            };
            
            // מציאת הקטגוריה המתאימה למוצר
            let categoryFound = false;
            for (const [categoryName, categoryProducts] of Object.entries(CATEGORIES)) {
                if (categoryProducts.includes(productType)) {
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
    });

    const customerCode = data.customerCode || data['קוד לקוח'] || '';
    const deliveryDate = data.deliveryDate || data['תאריך אספקה'] || '';
    const orderNotes = data.orderNotes || data['הערות כלליות'] || '';

    let html = `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
            הזמנה חדשה - מוצרי שייקביץ
        </h1>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #34495e; margin-top: 0;">פרטי הלקוח</h2>
            <p><strong>שם לקוח:</strong> ${customerName}</p>
            ${customerCode ? `<p><strong>קוד לקוח:</strong> ${customerCode}</p>` : ''}
            ${deliveryDate ? `<p><strong>תאריך אספקה:</strong> ${formatDate(deliveryDate)}</p>` : ''}
            <p><strong>תאריך ההזמנה:</strong> ${getCurrentDateTime()}</p>
        </div>
        
        <h2 style="color: #34495e;">פרטי ההזמנה</h2>
    `;

    // יצירת טבלאות לפי קטגוריות
    for (const [categoryName, products] of Object.entries(organizedProducts)) {
        if (products.length > 0) {
            html += `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #2c3e50; background-color: #e8f4f8; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                    ${categoryName}
                </h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #34495e; color: white;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">מוצר</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">כמות</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">משקל (ק״ג)</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">הערות</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            products.forEach((product, index) => {
                const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
                html += `
                        <tr style="background-color: ${bgColor};">
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${product.name}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #27ae60; font-weight: bold;">${product.quantity}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: #2980b9; font-weight: bold;">${product.weight}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${product.notes}</td>
                        </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            </div>
            `;
        }
    }
    
    // הערות כלליות
    if (orderNotes) {
        html += `
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">הערות כלליות</h3>
            <p>${orderNotes}</p>
        </div>
        `;
    }
    
    // הודעת סיום
    html += `
        <div style="margin-top: 30px; padding: 15px; background-color: #d4edda; border-radius: 8px;">
            <p style="margin: 0; color: #155724;">
                <strong>ההזמנה התקבלה בהצלחה!</strong><br>
                פרטי ההזמנה מצורפים לעיל.
            </p>
        </div>
    </div>
    `;
    
    return html;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString('he-IL');
}
