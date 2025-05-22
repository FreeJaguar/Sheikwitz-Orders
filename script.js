document.addEventListener('DOMContentLoaded', function() {
    // הגדרת תאריך אספקה מינימלי ליום הנוכחי
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formattedToday = `${yyyy}-${mm}-${dd}`;
    
    document.getElementById('deliveryDate').setAttribute('min', formattedToday);
    
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
            const productNotes = row.querySelector('.notes').value.toLowerCase();
            
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
    
    // ** החלק החדש - שליחה ל-API במקום FormSubmit **
    const orderForm = document.getElementById('meatOrderForm');
    const submitBtn = document.getElementById('submitBtn');
    
    orderForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // מונע שליחה רגילה של הטופס
        
        // בדיקת שדה חובה: שם לקוח
        const customerName = document.getElementById('customerName').value.trim();
        if (customerName === '') {
            alert('אנא מלא שם לקוח (שדה חובה)');
            return;
        }
        
        // איסוף כל הנתונים מהטופס
        const formData = new FormData(orderForm);
        const orderData = {};
        
        // המרה ל-JSON object
        for (let [key, value] of formData.entries()) {
            if (value.trim() !== '') {
                orderData[key] = value;
            }
        }
        
        // בדיקה שנבחרו מוצרים
        const hasProducts = Object.keys(orderData).some(key => 
            key.startsWith('quantity_') && orderData[key]
        );
        
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
                displayOrderSummary(result.orderData);
                
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
        
        document.querySelector('.submit-container').appendChild(successDiv);
        
        // הסתרת ההודעה אחרי 10 שניות
        setTimeout(() => {
            successDiv.style.display = 'none';
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
        
        document.querySelector('.submit-container').appendChild(errorDiv);
        
        // הסתרת ההודעה אחרי 15 שניות
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 15000);
    }
    
    // פונקציה להצגת סיכום הזמנה
    function displayOrderSummary(orderData) {
        const summaryElement = document.getElementById('orderSummary');
        const summaryContent = document.getElementById('summaryContent');
        
        // ניקוי תוכן קודם
        summaryContent.innerHTML = '';
        
        // איסוף המוצרים שנבחרו
        const selectedProducts = [];
        Object.keys(orderData).forEach(key => {
            if (key.startsWith('quantity_') && orderData[key]) {
                const productType = key.replace('quantity_', '');
                const weightKey = `weight_${productType}`;
                const notesKey = `notes_${productType}`;
                
                selectedProducts.push({
                    name: getProductDisplayName(productType),
                    quantity: orderData[key],
                    weight: orderData[weightKey] || '',
                    notes: orderData[notesKey] || ''
                });
            }
        });
        
        // יצירת תוכן סיכום
        let html = `
            <div style="text-align: right;">
                <p><strong>שם לקוח:</strong> ${orderData.customerName}</p>
        `;
        
        if (orderData.customerCode) {
            html += `<p><strong>קוד לקוח:</strong> ${orderData.customerCode}</p>`;
        }
        
        if (orderData.deliveryDate) {
            const date = new Date(orderData.deliveryDate);
            html += `<p><strong>תאריך אספקה:</strong> ${date.toLocaleDateString('he-IL')}</p>`;
        }
        
        html += '<h4>פרטי הזמנה:</h4><ul>';
        
        selectedProducts.forEach(product => {
            html += `<li style="margin-bottom: 5px;">
                <strong>${product.name}</strong>
                ${product.quantity ? ` - כמות: ${product.quantity}` : ''}
                ${product.weight ? ` - משקל: ${product.weight} ק"ג` : ''}
                ${product.notes ? ` - הערות: ${product.notes}` : ''}
            </li>`;
        });
        
        html += '</ul>';
        
        if (orderData.orderNotes) {
            html += `<p><strong>הערות כלליות:</strong> ${orderData.orderNotes}</p>`;
        }
        
        html += '</div>';
        
        summaryContent.innerHTML = html;
        summaryElement.style.display = 'block';
        
        // גלילה לסיכום
        summaryElement.scrollIntoView({ behavior: 'smooth' });
    }
    
    // פונקציה להמרת שם מוצר לתצוגה
    function getProductDisplayName(productType) {
        const productNames = {
            'turkey_red': 'הודו אדום',
            'ground_beef': 'טחון בקר',
            // הוסף כאן עוד מוצרים...
        };
        
        return productNames[productType] || productType;
    }
});