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
                to: [{ email: '9606663@gmail.com' }], // ** החלף עם המייל שלך **
                subject: `הזמנה חדשה מ-${customerName}`
            }],
            from: { email: '9606663@gmail.com' }, // ** החלף עם המייל המאומת **
            content: [{
                type: 'text/html',
                value: emailHTML
            }],
            attachments: [{
                content: pdfBase64,
                filename: `הזמנה_${customerName}_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.pdf`,
                type: 'application/pdf',
                disposition: 'attachment'
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

// פונקציה ליצירת HTML לאימיל
function createEmailHTML(data, customerName) {
    // פילטור המוצרים שנבחרו
    const selectedProducts = [];
    
    Object.keys(data).forEach(key => {
        if (key.startsWith('כמות_') && data[key]) {
            const productType = key.replace('כמות_', '');
            const weightKey = `משקל_${productType}`;
            const notesKey = `הערות_${productType}`;
            
            selectedProducts.push({
                name: productType.replace(/_/g, ' '),
                quantity: data[key],
                weight: data[weightKey] || '',
                notes: data[notesKey] || ''
            });
        }
    });

    const customerCode = data.customerCode || data['קוד לקוח'] || '';
    const deliveryDate = data.deliveryDate || data['תאריך אספקה'] || '';
    const orderNotes = data.orderNotes || data['הערות כלליות'] || '';

    return `
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
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="background-color: #34495e; color: white;">
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">מוצר</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">כמות</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">משקל (ק״ג)</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">הערות</th>
                </tr>
            </thead>
            <tbody>
                ${selectedProducts.map(product => `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${product.name}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${product.quantity}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${product.weight}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${product.notes}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${orderNotes ? `
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">הערות כלליות</h3>
            <p>${orderNotes}</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding: 15px; background-color: #d4edda; border-radius: 8px;">
            <p style="margin: 0; color: #155724;">
                <strong>ההזמנה התקבלה בהצלחה!</strong><br>
                קובץ PDF של ההזמנה מצורף למייל זה.
            </p>
        </div>
        
        <div style="margin-top: 20px; text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0; color: #666;">
                <strong>לתשומת לבך:</strong> מצורף קובץ PDF להדפסה נוחה של ההזמנה.
            </p>
        </div>
    </div>
    `;
}

// פונקציה ליצירת PDF
async function createPDF(data, customerName) {
    // יצירת HTML עבור ה-PDF
    const pdfHTML = createPDFHTML(data, customerName);
    
    // בדיקה איזה API להשתמש
    const apiKey = process.env.HTML2PDF_API_KEY;
    const pdfShiftKey = process.env.PDFSHIFT_API_KEY;
    
    try {
        let pdfBuffer;
        
        if (pdfShiftKey) {
            // אפשרות 1: PDFShift (מומלץ - תומך מצוין בעברית)
            console.log('Using PDFShift API');
            const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(pdfShiftKey + ':').toString('base64'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source: pdfHTML,
                    format: 'A4',
                    margin: '20mm',
                    landscape: false,
                    use_print: true
                })
            });
            
            if (!pdfResponse.ok) {
                throw new Error(`PDFShift Error: ${pdfResponse.status}`);
            }
            
            pdfBuffer = await pdfResponse.buffer();
            
        } else if (apiKey) {
            // אפשרות 2: HTML2PDF.app
            console.log('Using HTML2PDF.app API');
            const pdfResponse = await fetch('https://api.html2pdf.app/v1/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication': apiKey // או 'X-API-KEY': apiKey
                },
                body: JSON.stringify({
                    html: pdfHTML,
                    options: {
                        format: 'A4',
                        printBackground: true,
                        margin: {
                            top: '20mm',
                            bottom: '20mm',
                            left: '20mm',
                            right: '20mm'
                        }
                    }
                })
            });
            
            if (!pdfResponse.ok) {
                throw new Error(`HTML2PDF Error: ${pdfResponse.status}`);
            }
            
            pdfBuffer = await pdfResponse.buffer();
            
        } else {
            // אפשרות 3: API Ninjas HTML to PDF (חינמי עד 50,000 בקשות לחודש)
            console.log('Using API Ninjas');
            const apiNinjasKey = process.env.API_NINJAS_KEY;
            
            if (apiNinjasKey) {
                const pdfResponse = await fetch('https://api.api-ninjas.com/v1/htmltopdf', {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': apiNinjasKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        html: pdfHTML
                    })
                });
                
                if (!pdfResponse.ok) {
                    throw new Error(`API Ninjas Error: ${pdfResponse.status}`);
                }
                
                pdfBuffer = await pdfResponse.buffer();
            } else {
                // אם אין API keys, נשתמש בפתרון פשוט
                console.log('No PDF API key found, using simple PDF');
                return createSimplePDF(data, customerName);
            }
        }
        
        return pdfBuffer;
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        // אם יצירת ה-PDF נכשלה, ניצור PDF פשוט עם טקסט בלבד
        return createSimplePDF(data, customerName);
    }
}

// יצירת HTML עבור ה-PDF
function createPDFHTML(data, customerName) {
    const selectedProducts = [];
    
    Object.keys(data).forEach(key => {
        if (key.startsWith('כמות_') && data[key]) {
            const productType = key.replace('כמות_', '');
            const weightKey = `משקל_${productType}`;
            const notesKey = `הערות_${productType}`;
            
            selectedProducts.push({
                name: productType.replace(/_/g, ' '),
                quantity: data[key],
                weight: data[weightKey] || '',
                notes: data[notesKey] || ''
            });
        }
    });

    const customerCode = data.customerCode || data['קוד לקוח'] || '';
    const deliveryDate = data.deliveryDate || data['תאריך אספקה'] || '';
    const orderNotes = data.orderNotes || data['הערות כלליות'] || '';

    return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הזמנה - ${customerName}</title>
        <style>
            @page {
                size: A4;
                margin: 20mm;
            }
            body {
                font-family: Arial, sans-serif;
                direction: rtl;
                text-align: right;
                margin: 0;
                padding: 0;
                color: #333;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #2c3e50;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .title {
                font-size: 24px;
                color: #34495e;
            }
            .customer-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
            }
            .customer-info h2 {
                margin-top: 0;
                color: #2c3e50;
            }
            .info-row {
                margin: 10px 0;
                font-size: 16px;
            }
            .info-row strong {
                display: inline-block;
                width: 150px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            th {
                background-color: #34495e;
                color: white;
                padding: 12px;
                text-align: right;
                border: 1px solid #ddd;
            }
            td {
                padding: 10px;
                border: 1px solid #ddd;
            }
            tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            .quantity-cell, .weight-cell {
                text-align: center;
                font-weight: bold;
            }
            .notes-section {
                background-color: #fff3cd;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                border: 1px solid #ffc107;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #ddd;
                color: #666;
            }
            @media print {
                .pagebreak {
                    page-break-before: always;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">מוצרי שייקביץ</div>
            <div class="title">טופס הזמנה</div>
        </div>
        
        <div class="customer-info">
            <h2>פרטי הלקוח</h2>
            <div class="info-row"><strong>שם לקוח:</strong> ${customerName}</div>
            ${customerCode ? `<div class="info-row"><strong>קוד לקוח:</strong> ${customerCode}</div>` : ''}
            ${deliveryDate ? `<div class="info-row"><strong>תאריך אספקה:</strong> ${formatDate(deliveryDate)}</div>` : ''}
            <div class="info-row"><strong>תאריך ההזמנה:</strong> ${getCurrentDateTime()}</div>
        </div>
        
        <h2>פרטי ההזמנה</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 30%;">מוצר</th>
                    <th style="width: 15%;">כמות</th>
                    <th style="width: 15%;">משקל (ק״ג)</th>
                    <th style="width: 40%;">הערות</th>
                </tr>
            </thead>
            <tbody>
                ${selectedProducts.map(product => `
                <tr>
                    <td style="font-weight: bold;">${product.name}</td>
                    <td class="quantity-cell">${product.quantity}</td>
                    <td class="weight-cell">${product.weight}</td>
                    <td>${product.notes}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${orderNotes ? `
        <div class="notes-section">
            <h3>הערות כלליות</h3>
            <p>${orderNotes}</p>
        </div>
        ` : ''}
        
        <div class="footer">
            <p>מסמך זה הופק אוטומטית מטופס ההזמנה המקוון</p>
            <p>${new Date().toLocaleDateString('he-IL')} | ${new Date().toLocaleTimeString('he-IL')}</p>
        </div>
    </body>
    </html>
    `;
}

// יצירת PDF פשוט כפתרון חלופי
function createSimplePDF(data, customerName) {
    // יצירת טקסט פשוט של ההזמנה
    let content = `הזמנה - מוצרי שייקביץ\n`;
    content += `========================\n\n`;
    content += `שם לקוח: ${customerName}\n`;
    
    if (data.customerCode) {
        content += `קוד לקוח: ${data.customerCode}\n`;
    }
    
    if (data.deliveryDate) {
        content += `תאריך אספקה: ${formatDate(data.deliveryDate)}\n`;
    }
    
    content += `תאריך הזמנה: ${getCurrentDateTime()}\n\n`;
    content += `פרטי ההזמנה:\n`;
    content += `-------------\n`;
    
    Object.keys(data).forEach(key => {
        if (key.startsWith('כמות_') && data[key]) {
            const productType = key.replace('כמות_', '');
            const weightKey = `משקל_${productType}`;
            const notesKey = `הערות_${productType}`;
            
            content += `\n${productType.replace(/_/g, ' ')}:\n`;
            content += `  כמות: ${data[key]}\n`;
            if (data[weightKey]) {
                content += `  משקל: ${data[weightKey]} ק"ג\n`;
            }
            if (data[notesKey]) {
                content += `  הערות: ${data[notesKey]}\n`;
            }
        }
    });
    
    if (data.orderNotes) {
        content += `\n\nהערות כלליות:\n${data.orderNotes}\n`;
    }
    
    // המרת הטקסט ל-Buffer
    return Buffer.from(content, 'utf8');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString('he-IL');
}
