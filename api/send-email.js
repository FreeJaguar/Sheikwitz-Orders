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
        const pdfBuffer = await createPDF(emailHTML, customerName);
        
        // שליחת אימיל דרך SendGrid API עם PDF מצורף
        const emailData = {
            personalizations: [{
                to: [{ email: 'yus2770@gmail.com' }], // ** החלף עם המייל שלך **
                subject: `הזמנה חדשה מ-${customerName}`
            }],
            from: { email: 'yus2770@gmail.com' }, // ** החלף עם המייל המאומת **
            content: [{
                type: 'text/html',
                value: emailHTML
            }],
            attachments: [{
                content: pdfBuffer.toString('base64'),
                filename: `הזמנה-${customerName}-${getCurrentDateForFile()}.pdf`,
                type: 'application/pdf',
                disposition: 'attachment'
            }]
        };
        
        console.log('שולח אימיל עם PDF ל:', emailDataexport default async function handler(req, res) {
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
                to: [{ email: 'your-email@example.com' }], // ** החלף עם המייל שלך **
                subject: `הזמנה חדשה מ-${customerName}`
            }],
            from: { email: 'your-verified-email@example.com' }, // ** החלף עם המייל המאומת **
            content: [{
                type: 'text/html',
                value: emailHTML
            }]
        };
        
        console.log('שולח אימיל עם PDF ל:', emailData.personalizations[0].to[0].email);
        
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
        
        console.log('האימיל עם PDF נשלח בהצלחה');
        
        res.status(200).json({ 
            success: true, 
            message: 'האימיל עם PDF נשלח בהצלחה!',
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

// פונקציה ליצירת PDF
async function createPDF(htmlContent, customerName) {
    try {
        // שימוש ב-API חיצוני ליצירת PDF
        const response = await fetch('https://api.html-css-to-pdf.com/v1/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                html: htmlContent,
                css: `
                    body { 
                        font-family: Arial, sans-serif; 
                        direction: rtl; 
                        text-align: right; 
                        margin: 20px;
                        font-size: 12px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0; 
                    }
                    th, td { 
                        border: 1px solid #333; 
                        padding: 8px; 
                        text-align: right; 
                    }
                    th { 
                        background-color: #f0f0f0; 
                        font-weight: bold; 
                    }
                `,
                options: {
                    format: 'A4',
                    margin: {
                        top: '20mm',
                        right: '15mm',
                        bottom: '20mm',
                        left: '15mm'
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error('שגיאה ביצירת PDF');
        }

        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        return pdfBuffer;
        
    } catch (error) {
        console.error('שגיאה ביצירת PDF:', error);
        // אם יש בעיה עם PDF, נחזיר buffer ריק
        return Buffer.from('');
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

    // פורמט אימיל פשוט יותר - בלי טבלאות מורכבות
    let productsText = '';
    selectedProducts.forEach((product, index) => {
        productsText += `
        <div style="background-color: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'}; padding: 15px; margin: 5px 0; border-radius: 5px; border: 1px solid #ddd;">
            <h4 style="color: #2c3e50; margin: 0 0 10px 0;">${product.name}</h4>
            <p style="margin: 5px 0;"><strong>כמות:</strong> ${product.quantity}</p>
            ${product.weight ? `<p style="margin: 5px 0;"><strong>משקל:</strong> ${product.weight} ק"ג</p>` : ''}
            ${product.notes ? `<p style="margin: 5px 0;"><strong>הערות:</strong> ${product.notes}</p>` : ''}
        </div>
        `;
    });

    return `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 15px;">
            הזמנה חדשה - מוצרי שייקביץ
        </h1>
        
        <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #34495e; margin-top: 0;">פרטי הלקוח</h2>
            <p style="font-size: 16px; line-height: 1.6;"><strong>שם לקוח:</strong> ${customerName}</p>
            ${customerCode ? `<p style="font-size: 16px; line-height: 1.6;"><strong>קוד לקוח:</strong> ${customerCode}</p>` : ''}
            ${deliveryDate ? `<p style="font-size: 16px; line-height: 1.6;"><strong>תאריך אספקה:</strong> ${formatDate(deliveryDate)}</p>` : ''}
            <p style="font-size: 16px; line-height: 1.6;"><strong>תאריך ההזמנה:</strong> ${getCurrentDateTime()}</p>
        </div>
        
        <h2 style="color: #34495e; margin-top: 30px;">פרטי ההזמנה:</h2>
        <div style="margin: 20px 0;">
            ${productsText}
        </div>
        
        ${orderNotes ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">הערות כלליות:</h3>
            <p style="color: #856404; font-size: 16px; line-height: 1.6;">${orderNotes}</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding: 20px; background-color: #d4edda; border-radius: 8px; border: 1px solid #c3e6cb; text-align: center;">
            <h3 style="color: #155724; margin: 0;">ההזמנה התקבלה בהצלחה!</h3>
            <p style="color: #155724; margin: 10px 0 0 0;">פרטי ההזמנה מצורפים כקובץ PDF.</p>
        </div>
    </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString('he-IL');
}

function getCurrentDateForFile() {
    const now = new Date();
    return now.toLocaleDateString('he-IL').replace(/\//g, '-');
}.personalizations[0].to[0].email);
        
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

    // פורמט אימיל פשוט יותר - בלי טבלאות מורכבות
    let productsText = '';
    selectedProducts.forEach((product, index) => {
        productsText += `
        <div style="background-color: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'}; padding: 15px; margin: 5px 0; border-radius: 5px; border: 1px solid #ddd;">
            <h4 style="color: #2c3e50; margin: 0 0 10px 0;">${product.name}</h4>
            <p style="margin: 5px 0;"><strong>כמות:</strong> ${product.quantity}</p>
            ${product.weight ? `<p style="margin: 5px 0;"><strong>משקל:</strong> ${product.weight} ק"ג</p>` : ''}
            ${product.notes ? `<p style="margin: 5px 0;"><strong>הערות:</strong> ${product.notes}</p>` : ''}
        </div>
        `;
    });

    return `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 15px;">
            הזמנה חדשה - מוצרי שייקביץ
        </h1>
        
        <div style="background-color: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #34495e; margin-top: 0;">פרטי הלקוח</h2>
            <p style="font-size: 16px; line-height: 1.6;"><strong>שם לקוח:</strong> ${customerName}</p>
            ${customerCode ? `<p style="font-size: 16px; line-height: 1.6;"><strong>קוד לקוח:</strong> ${customerCode}</p>` : ''}
            ${deliveryDate ? `<p style="font-size: 16px; line-height: 1.6;"><strong>תאריך אספקה:</strong> ${formatDate(deliveryDate)}</p>` : ''}
            <p style="font-size: 16px; line-height: 1.6;"><strong>תאריך ההזמנה:</strong> ${getCurrentDateTime()}</p>
        </div>
        
        <h2 style="color: #34495e; margin-top: 30px;">פרטי ההזמנה:</h2>
        <div style="margin: 20px 0;">
            ${productsText}
        </div>
        
        ${orderNotes ? `
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">הערות כלליות:</h3>
            <p style="color: #856404; font-size: 16px; line-height: 1.6;">${orderNotes}</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding: 20px; background-color: #d4edda; border-radius: 8px; border: 1px solid #c3e6cb; text-align: center;">
            <h3 style="color: #155724; margin: 0;">ההזמנה התקבלה בהצלחה!</h3>
            <p style="color: #155724; margin: 10px 0 0 0;">תודה על ההזמנה.</p>
        </div>
    </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString('he-IL');
}
