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
        
        // יצירת תוכן סיכום עם טבלה מסודרת
        let html = `
            <div style="text-align: right;">
                <h3 style="color: #2c3e50; margin-bottom: 15px;">פרטי הלקוח</h3>
                <p><strong>שם לקוח:</strong> ${orderData.customerName || ''}</p>
        `;
        
        if (orderData.customerCode) {
            html += `<p><strong>קוד לקוח:</strong> ${orderData.customerCode}</p>`;
        }
        
        if (orderData.deliveryDate) {
            const date = new Date(orderData.deliveryDate);
            html += `<p><strong>תאריך אספקה:</strong> ${date.toLocaleDateString('he-IL')}</p>`;
        }
        
        html += `
                <h3 style="color: #2c3e50; margin: 20px 0 15px 0;">פרטי ההזמנה</h3>
                <table class="summary-table" style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <thead>
                        <tr style="background-color: #34495e; color: white;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">מוצר</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center; width: 80px;">כמות</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: center; width: 100px;">משקל (ק"ג)</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">הערות</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        selectedProducts.forEach((product, index) => {
            const bgColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
            html += `
                        <tr style="background-color: ${bgColor};">
                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; text-align: right;">${product.name}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${product.quantity}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${product.weight || '-'}</td>
                            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${product.notes || '-'}</td>
                        </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
        `;
        
        if (orderData.orderNotes) {
            html += `
                <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #2c3e50; margin-top: 0;">הערות כלליות:</h4>
                    <p>${orderData.orderNotes}</p>
                </div>
            `;
        }
        
        html += '</div>';
        
        summaryContent.innerHTML = html;
        summaryElement.style.display = 'block';
        
        // גלילה לסיכום
        summaryElement.scrollIntoView({ behavior: 'smooth' });
    }
});
