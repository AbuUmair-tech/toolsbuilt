document.addEventListener('DOMContentLoaded', function () {
    const startDateInput = document.getElementById('startDate');
    const amountInput = document.getElementById('amount');
    const unitSelect = document.getElementById('unit');
    const operationSelect = document.getElementById('operation');
    const businessDaysOnlyCheckbox = document.getElementById('businessDaysOnly');
    const todayBtn = document.getElementById('todayBtn');
    
    const resultBox = document.getElementById('resultBox');
    const primaryResult = document.getElementById('primaryResult');
    const resultDetails = document.getElementById('resultDetails');
    const copyResultBtn = document.getElementById('copyResultBtn');

    // Set today as default start date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    startDateInput.value = `${yyyy}-${mm}-${dd}`;

    todayBtn.addEventListener('click', function () {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        startDateInput.value = `${y}-${m}-${d}`;
        calculate();
    });

    [startDateInput, amountInput, unitSelect, operationSelect, businessDaysOnlyCheckbox].forEach(el => {
        el.addEventListener('change', calculate);
        el.addEventListener('input', calculate);
    });

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    function calculate() {
        const startDateStr = startDateInput.value;
        const amount = parseInt(amountInput.value, 10);
        const unit = unitSelect.value;
        const operation = operationSelect.value;
        const businessOnly = businessDaysOnlyCheckbox.checked;

        if (!startDateStr || isNaN(amount) || amount < 0) {
            primaryResult.textContent = 'Please enter a valid start date and count.';
            resultDetails.innerHTML = '';
            return;
        }

        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
        let current = new Date(startYear, startMonth - 1, startDay);

        const direction = operation === 'subtract' ? -1 : 1;

        if (businessOnly) {
            let daysAdded = 0;
            // Scale multiplier if unit is weeks
            let targetBusinessDays = amount;
            if (unit === 'weeks') targetBusinessDays = amount * 5;
            else if (unit === 'months') targetBusinessDays = amount * 21; // ~21 business days/month
            else if (unit === 'years') targetBusinessDays = amount * 252; // ~252 business days/year

            while (daysAdded < targetBusinessDays) {
                current.setDate(current.getDate() + direction);
                const dayOfWeek = current.getDay();
                // 0 = Sunday, 6 = Saturday
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    daysAdded++;
                }
            }
        } else {
            if (unit === 'days') {
                current.setDate(current.getDate() + (direction * amount));
            } else if (unit === 'weeks') {
                current.setDate(current.getDate() + (direction * amount * 7));
            } else if (unit === 'months') {
                const targetMonth = current.getMonth() + (direction * amount);
                current.setMonth(targetMonth);
            } else if (unit === 'years') {
                const targetYear = current.getFullYear() + (direction * amount);
                current.setFullYear(targetYear);
            }
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        const resYear = current.getFullYear();
        const resMonth = current.getMonth();
        const resDay = current.getDate();
        const resDayOfWeek = current.getDay();

        const formattedDate = `${dayNames[resDayOfWeek]}, ${monthNames[resMonth]} ${resDay}, ${resYear}`;

        // Calculate day of year
        const startOfYear = new Date(resYear, 0, 1);
        const diffDaysOfYear = Math.floor((current - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
        const totalDaysInYear = isLeapYear(resYear) ? 366 : 365;
        const remainingDays = totalDaysInYear - diffDaysOfYear;
        const quarter = Math.floor(resMonth / 3) + 1;

        // Total calendar days difference from start
        const startObj = new Date(startYear, startMonth - 1, startDay);
        const totalCalDiff = Math.abs(Math.round((current - startObj) / (1000 * 60 * 60 * 24)));

        primaryResult.textContent = formattedDate;

        const isWeekend = (resDayOfWeek === 0 || resDayOfWeek === 6);
        const dayType = isWeekend ? 'Weekend Day' : 'Business Day';

        resultDetails.innerHTML = `
            <div class="result-card-grid">
                <div class="res-item">
                    <span class="res-label">Formatted Date</span>
                    <span class="res-val">${formattedDate}</span>
                </div>
                <div class="res-item">
                    <span class="res-label">ISO Date</span>
                    <span class="res-val">${resYear}-${String(resMonth + 1).padStart(2, '0')}-${String(resDay).padStart(2, '0')}</span>
                </div>
                <div class="res-item">
                    <span class="res-label">Day of Week</span>
                    <span class="res-val">${dayNames[resDayOfWeek]} (${dayType})</span>
                </div>
                <div class="res-item">
                    <span class="res-label">Calendar Days Shift</span>
                    <span class="res-val">${totalCalDiff} day${totalCalDiff !== 1 ? 's' : ''} ${operation === 'add' ? 'later' : 'earlier'}</span>
                </div>
                <div class="res-item">
                    <span class="res-label">Day of Year</span>
                    <span class="res-val">Day ${diffDaysOfYear} of ${totalDaysInYear} (${remainingDays} days remaining)</span>
                </div>
                <div class="res-item">
                    <span class="res-label">Quarter</span>
                    <span class="res-val">Q${quarter}</span>
                </div>
            </div>
        `;
    }

    if (copyResultBtn) {
        copyResultBtn.addEventListener('click', function () {
            const textToCopy = primaryResult.textContent;
            if (textToCopy && !textToCopy.startsWith('Please')) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = copyResultBtn.textContent;
                    copyResultBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyResultBtn.textContent = originalText;
                    }, 2000);
                });
            }
        });
    }

    calculate();
});
