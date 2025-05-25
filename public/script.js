document.addEventListener('DOMContentLoaded', function() {
    // הגדרת תאריך אספקה מינימלי ליום הנוכחי
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${yyyy}-${mm}-${dd}`;
    
    const deliveryDateInput = document.getElementById('deliveryDate');
    if (deliveryDateInput) {
        deliveryDateInput.setAttribute('min', formattedToday);
    }
    
    // פתיחה וסגירה של קטגוריות (Accordion)
    const categoryHeaders = document.querySelectorAll('.category-header');
    
    categoryHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const category = this.parentElement;
            const isActive = category.classList.contains('active');
            
            // סגירת כל הקטגוריות
            document.querySelectorAll('.category').forEach(cat => {
                cat.classList.remove('active');
                cat.querySelector('.toggle-icon').textContent = '+';
            });
            
            // אם הקטגוריה לא הייתה פתוחה, נפתח אותה
            if (!isActive) {
                category.classList.add('active');
                this.querySelector('.toggle-icon').textContent = '×';
            }
        });
    });
    
    // פונקציונליות חיפוש מוצרים
    const searchInput = document.getElementById('productSearch');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim().toLowerCase();
            
            if (searchTerm === '') {
                // אם החיפוש ריק, נסגור את כל הקטגוריות ונאפס את התצוגה
                resetCategoriesDisplay();
                return;
            }
            
            let foundResults = false;
            let openCategories = new Set();
            
            // איפוס כל התצוגה תחילה
            document.querySelectorAll('.product-row').forEach(row => {
                row.classList.remove('highlight');
                row.classList.remove('hidden');
            });
            
            document.querySelectorAll('.category').forEach(category => {
                category.classList.remove('no-results');
            });
            
            // חיפוש בכל שורות המוצרים
            document.querySelectorAll('.product-row').forEach(row => {
                const productName = row.querySelector('.product-name').textContent.toLowerCase();
                const notesInput = row.querySelector('.notes');
                const productNotes = notesInput ? notesInput.value.toLowerCase() : '';
                
                if (productName.includes(searchTerm) || productNotes.includes(searchTerm)) {
                    row.classList.add('highlight');
                    const parentCategory = row.closest('.category');
                    openCategories.add(parentCategory);
                    foundResults = true;
                } else {
                    row.classList.add('hidden');
                }
            });
            
            // פתיחת הקטגוריות שבהן נמצאו מוצרים
            document.querySelectorAll('.category').forEach(category => {
                if (openCategories.has(category)) {
                    category.classList.add('active');
                    category.querySelector('.toggle-icon').textContent = '×';
                } else {
                    category.classList.remove('active');
                    category.querySelector('.toggle-icon').textContent = '+';
                    
                    // בדיקה אם יש מוצרים גלויים בקטגוריה
                    const visibleProducts = category.querySelectorAll('.product-row:not(.hidden)');
                    if (visibleProducts.length === 0) {
                        category.classList.add('no-results');
                    }
                }
            });
            
            // הצגת הודעה אם אין תוצאות חיפוש
            const noResultsMessage = document.querySelector('.no-results-message');
            if (noResultsMessage) {
                noResultsMessage.remove();
            }
            
            if (!foundResults) {
                const message = document.createElement('div');
                message.className = 'no-results-message';
                message.textContent = 'לא נמצאו מוצרים התואמים לחיפוש שלך';
                document.querySelector('.products-container').appendChild(message);
            }
        });
    }
    
    // איפוס תצוגת קטגוריות
    function resetCategoriesDisplay() {
        document.querySelectorAll('.category').forEach(category => {
            category.classList.remove('active');
            category.classList.remove('no-results');
            category.querySelector('.toggle-icon').textContent = '+';
        });
        
        document.querySelectorAll('.product-row').forEach(row => {
            row.classList.remove('highlight');
            row.classList.remove('hidden');
        });
        
        const noResultsMessage = document.querySelector('.no-results-message');
        if (noResultsMessage) {
            noResultsMessage.remove();
        }
    }
    
    // שליחה ל-API במקום FormSubmit
    const orderForm = document.getElementById('meatOrderForm');
    const submitBtn = document.getElementById('submitBtn');
    
    if (orderForm && submitBtn) {
        orderForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // מונע שליחה רגילה של הטופס
            
            // בדיקת שדה חובה: שם לקוח
            const customerName = document.getElementById('customerName');
            if (!customerName || customerName.value.trim() === '') {
                alert('אנא מלא שם לקוח (שדה חובה)');
                return;
            }
            
            // איסוף כל הנתונים מהטופס
            const formData = new FormData(orderForm);
            const orderData = {};
            
            // המרה ל-JSON object
            for (let [key, value] of formData.entries()) {
                if (value && value.trim() !== '') {
                    orderData[key] = value.trim();
                }
            }
            
            console.log('נתוני הטופס:', orderData); // לבדיקה
            
            // בדיקה שנבחרו מוצרים
            const hasProducts = Object.keys(orderData).some(key => 
                key.startsWith('כמות_') && orderData[key] && orderData[key] !== '0'
            );
            
            console.log('יש מוצרים?', hasProducts); // לבדיקה
            
            if (!hasProducts) {
                alert('לא נבחרו מוצרים להזמנה. אנא בחר לפחות מוצר אחד.');
                return;
            }
            
            // הצגת מצב טעינה
            submitBtn.disabled = true;
            submitBtn.textContent = 'שולח הזמנה...';
            
            try {
                // שליחה ל-API
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // הצגת הודעת הצלחה וסיכום
                    showSuccessMessage();
                    displayOrderSummary(orderData);
                    
                    // איפוס הטופס
                    orderForm.reset();
                    resetCategoriesDisplay();
                } else {
                    throw new Error(result.error || 'שגיאה לא ידועה');
                }
                
            } catch (error) {
                console.error('Error:', error);
                showErrorMessage('שגיאה בשליחת ההזמנה: ' + error.message);
            } finally {
                // החזרת כפתור למצב רגיל
                submitBtn.disabled = false;
                submitBtn.textContent = 'שלח הזמנה';
            }
        });
    }
    
    // פונקציה להצגת הודעת הצלחה
    function showSuccessMessage() {
        // הסרת הודעות קודמות
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <strong>ההזמנה נשלחה בהצלחה!</strong><br>
            אימיל מפורט עם קובץ PDF נשלח אליך.
        `;
        
        const submitContainer = document.querySelector('.submit-container');
        if (submitContainer) {
            submitContainer.appendChild(successDiv);
        }
        
        // הסתרת ההודעה אחרי 10 שניות
        setTimeout(() => {
            if (successDiv) {
                successDiv.style.display = 'none';
            }
        }, 10000);
    }
    
    // פונקציה להצגת הודעת שגיאה
    function showErrorMessage(message) {
        // הסרת הודעות קודמות
        const existingMessages = document.querySelectorAll('.success-message, .error-message');
        existingMessages.forEach(msg => msg.remove());
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <strong>שגיאה:</strong><br>
            ${message}
        `;
        
        const submitContainer = document.querySelector('.submit-container');
        if (submitContainer) {
            submitContainer.appendChild(errorDiv);
        }
        
        // הסתרת ההודעה אחרי 15 שניות
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }, 15000);
    }
    
    // פונקציה להצגת סיכום הזמנה
    function displayOrderSummary(orderData) {
        const summaryElement = document.getElementById('orderSummary');
        const summaryContent = document.getElementById('summaryContent');
        
        if (!summaryElement || !summaryContent) return;
        
        // ניקוי תוכן קודם
        summaryContent.innerHTML = '';
        
        // איסוף המוצרים שנבחרו
        const selectedProducts = [];
        Object.keys(orderData).forEach(key => {
            if (key.startsWith('כמות_') && orderData[key]) {
                const productType = key.replace('כמות_', '');
                const weightKey = `משקל_${productType}`;
                const notesKey = `הערות_${productType}`;
                
                selectedProducts.push({
                    name: productType.replace(/_/g, ' '),
                    quantity: orderData[key],
                    weight: orderData[weightKey] || '',
                    notes: orderData[notesKey] || ''
                });
            }
        });
        
        // יצירת תוכן סיכום עם טבלה מסודרת - פתרון מחזק
        let html = `
            <div style="text-align: right; font-family: Arial, sans-serif; direction: rtl;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #dee2e6;">
                    <h3 style="color: #2c3e50; margin: 0 0 15px 0; text-align: center; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">פרטי הלקוח</h3>
                    <p style="margin: 8px 0; font-size: 16px; color: #2c3e50;"><strong>שם לקוח:</strong> ${orderData.customerName || ''}</p>
        `;
        
        if (orderData.customerCode) {
            html += `<p style="margin: 8px 0; font-size: 16px; color: #2c3e50;"><strong>קוד לקוח:</strong> ${orderData.customerCode}</p>`;
        }
        
        if (orderData.deliveryDate) {
            const date = new Date(orderData.deliveryDate);
            html += `<p style="margin: 8px 0; font-size: 16px; color: #2c3e50;"><strong>תאריך אספקה:</strong> ${date.toLocaleDateString('he-IL')}</p>`;
        }
        
        html += `
                    <p style="margin: 8px 0; font-size: 14px; color: #666;"><strong>תאריך ההזמנה:</strong> ${new Date().toLocaleString('he-IL')}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h3 style="color: #2c3e50; margin: 0 0 20px 0; text-align: center; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">פרטי ההזמנה</h3>
        `;
        
        // יצירת הטבלה עם HTML נקי
        html += `
                    <table style="width: 100%; border-collapse: collapse; border: 2px solid #2c3e50; font-family: Arial, sans-serif; margin: 0 auto; background-color: white;">
                        <thead>
                            <tr>
                                <th style="background-color: #34495e; color: white; padding: 15px 10px; border: 1px solid #2c3e50; text-align: center; font-weight: bold; font-size: 14px; width: 25%;">מוצר</th>
                                <th style="background-color: #34495e; color: white; padding: 15px 10px; border: 1px solid #2c3e50; text-align: center; font-weight: bold; font-size: 14px; width: 15%;">כמות</th>
                                <th style="background-color: #34495e; color: white; padding: 15px 10px; border: 1px solid #2c3e50; text-align: center; font-weight: bold; font-size: 14px; width: 20%;">משקל (ק״ג)</th>
                                <th style="background-color: #34495e; color: white; padding: 15px 10px; border: 1px solid #2c3e50; text-align: center; font-weight: bold; font-size: 14px; width: 40%;">הערות</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        // הוספת שורות המוצרים
        selectedProducts.forEach((product, index) => {
            const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
            html += `
                            <tr style="background-color: ${bgColor};">
                                <td style="padding: 12px 10px; border: 1px solid #dee2e6; text-align: center; font-weight: bold; font-size: 14px; color: #2c3e50;">${product.name}</td>
                                <td style="padding: 12px 10px; border: 1px solid #dee2e6; text-align: center; font-size: 16px; font-weight: bold; color: #27ae60;">${product.quantity}</td>
                                <td style="padding: 12px 10px; border: 1px solid #dee2e6; text-align: center; font-size: 14px; color: #2980b9; font-weight: bold;">${product.weight || ''}</td>
                                <td style="padding: 12px 10px; border: 1px solid #dee2e6; text-align: center; font-size: 14px; color: #555;">${product.notes || ''}</td>
                            </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
        `;
        
        // הערות כלליות
        if (orderData.orderNotes) {
            html += `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
                    <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px; text-align: center;">הערות כלליות:</h4>
                    <p style="color: #856404; font-size: 14px; margin: 0; text-align: center;">${orderData.orderNotes}</p>
                </div>
            `;
        }
        
        // הודעת סיום
        html += `
                <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #c3e6cb; text-align: center;">
                    <p style="color: #155724; font-weight: bold; margin: 0; font-size: 16px;">ההזמנה התקבלה בהצלחה!</p>
                    <p style="color: #155724; font-size: 14px; margin: 5px 0 0 0;">פרטי ההזמנה נשלחו אליך באימיל</p>
                </div>
            </div>
        `;
        
        summaryContent.innerHTML = html;
        summaryElement.style.display = 'block';
        
        // גלילה לסיכום
        summaryElement.scrollIntoView({ behavior: 'smooth' });
    }
});
