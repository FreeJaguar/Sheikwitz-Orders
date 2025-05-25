const sgMail = require('@sendgrid/mail');

// הגדרת SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
    // אפשר רק POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('קיבלנו בקשה:', req.body);
        
        const formData = req.body;
        
        // בדיקה בסיסית
        if (!formData.customerName) {
            throw new Error('שם לקוח חסר');
        }
        
        // יצירת HTML לאימיל
        const emailHTML = createEmailHTML(formData);
        
        // שליחת האימיל (ללא PDF בינתיים)
        const msg = {
            to: 'yus2770@gmail.com', // ** החלף עם המייל שלך **
            from: 'yus2770@gmail.com', // ** החלף עם המייל המאומת בSendGrid **
            subject: `הזמנה חדשה מ-${formData.customerName}`,
            html: emailHTML
        };

        console.log('שולח אימיל:', msg);
        
        await sgMail.send(msg);
        
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
function createEmailHTML(data) {
    // פילטור המוצרים שנבחרו
    const selectedProducts = [];
    
    // עבור כל שדה בטופס
    Object.keys(data).forEach(key => {
        if (key.startsWith('כמות_') && data[key]) {
            const productType = key.replace('כמות_', '');
            const weightKey = `משקל_${productType}`;
            const notesKey = `הערות_${productType}`;
            
            selectedProducts.push({
                name: productType.replace(/_/g, ' '), // המרת _ לרווח
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
                פרטי ההזמנה מצורפים לעיל.
            </p>
        </div>
    </div>
    `;
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
