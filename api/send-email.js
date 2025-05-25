export default async function handler(req, res) {
    try {
        console.log('Method:', req.method);
        console.log('Body:', req.body);
        
        // בדיקה בסיסית
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        // בדיקה אם יש SendGrid API Key
        const apiKey = process.env.SENDGRID_API_KEY;
        console.log('API Key exists:', !!apiKey);
        
        if (!apiKey) {
            return res.status(500).json({ 
                success: false, 
                error: 'SendGrid API Key לא מוגדר' 
            });
        }
        
        // בדיקה בסיסית של הנתונים
        const formData = req.body;
        if (!formData || !formData.customerName) {
            return res.status(400).json({ 
                success: false, 
                error: 'נתונים חסרים - שם לקוח נדרש' 
            });
        }
        
        // נסיון שליחת אימיל פשוט
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(apiKey);
        
        const msg = {
            to: 'yus2770@gmail.com', // ** החלף עם המייל שלך **
            from: 'yus2770@gmail.com', // ** החלף עם המייל המאומת **
            subject: `בדיקת הזמנה מ-${formData.customerName}`,
            text: `הזמנה חדשה התקבלה מ-${formData.customerName}`
        };
        
        console.log('Sending email to:', msg.to);
        
        await sgMail.send(msg);
        
        console.log('Email sent successfully');
        
        return res.status(200).json({ 
            success: true, 
            message: 'אימיל נשלח בהצלחה!',
            orderData: formData 
        });
        
    } catch (error) {
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        return res.status(500).json({ 
            success: false, 
            error: 'שגיאה בשליחת האימיל',
            details: error.message
        });
    }
}
