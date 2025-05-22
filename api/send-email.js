const sgMail = require('@sendgrid/mail');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

// הגדרת SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
    // אפשר רק POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const formData = req.body;
        
        // יצירת HTML לאימיל
        const emailHTML = createEmailHTML(formData);
        
        // יצירת PDF
        const pdfBuffer = await createPDF(emailHTML);
        
        // שליחת האימיל עם PDF מצורף
        const msg = {
            to: 'your-email@example.com', // ** החלף עם המייל שלך **
            from: 'your-verified-email@example.com', // ** החלף עם המייל המאומת בSendGrid **
            subject: `הזמנה חדשה מ-${formData.customerName}`,
            html: emailHTML,
            attachments: [
                {
                    content: pdfBuffer.toString('base64'),
                    filename: `הזמנה-${formData.customerName}-${getCurrentDate()}.pdf`,
                    type: 'application/pdf',
                    disposition: 'attachment'
                }
            ]
        };

        await sgMail.send(msg);
        
        res.status(200).json({ 
            success: true, 
            message: 'האימיל נשלח בהצלחה!',
            orderData: formData 
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'שגיאה בשליחת האימיל', 
            details: error.message 
        });
    }
}

// פונקציה ליצירת HTML לאימיל
function createEmailHTML(data) {
    // פילטור המוצרים שנבחרו
    const selectedProducts = [];
    
    // עבור כל שדה בטופס
    Object.keys(data).forEach(key => {
        if (key.startsWith('quantity_') && data[key]) {
            const productType = key.replace('quantity_', '');
            const weightKey = `weight_${productType}`;
            const notesKey = `notes_${productType}`;
            
            selectedProducts.push({
                name: getProductName(productType),
                quantity: data[key],
                weight: data[weightKey] || '',
                notes: data[notesKey] || ''
            });
        }
    });

    return `
    <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
            הזמנה חדשה - מוצרי שייקביץ
        </h1>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #34495e; margin-top: 0;">פרטי הלקוח</h2>
            <p><strong>שם לקוח:</strong> ${data.customerName}</p>
            ${data.customerCode ? `<p><strong>קוד לקוח:</strong> ${data.customerCode}</p>` : ''}
            ${data.deliveryDate ? `<p><strong>תאריך אספקה:</strong> ${formatDate(data.deliveryDate)}</p>` : ''}
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
        
        ${data.orderNotes ? `
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">הערות כלליות</h3>
            <p>${data.orderNotes}</p>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding: 15px; background-color: #d4edda; border-radius: 8px;">
            <p style="margin: 0; color: #155724;">
                <strong>ההזמנה התקבלה בהצלחה!</strong><br>
                קובץ PDF מפורט מצורף להודעה זו.
            </p>
        </div>
    </div>
    `;
}

// פונקציה ליצירת PDF
async function createPDF(htmlContent) {
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
        }
    });
    
    await browser.close();
    return pdf;
}

// פונקציה להמרת שם מוצר
function getProductName(productType) {
    const productNames = {
        'turkey_red': 'הודו אדום',
        'ground_beef': 'טחון בקר',
        // הוסף כאן עוד מוצרים...
    };
    
    return productNames[productType] || productType;
}

// פונקציה לפורמט תאריך
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

// פונקציה לתאריך ושעה נוכחיים
function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString('he-IL');
}

// פונקציה לתאריך נוכחי (לשם הקובץ)
function getCurrentDate() {
    const now = new Date();
    return now.toLocaleDateString('he-IL').replace(/\//g, '-');
}
