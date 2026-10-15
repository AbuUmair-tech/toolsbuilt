document.addEventListener('DOMContentLoaded', function () {
    const startDateInput = document.getElementById('startDate');
    const amountInput = document.getElementById('amount');
    const unitSelect = document.getElementById('unit');
    const operationSelect = document.getElementById('operation');
    const businessDaysOnlyCheckbox = document.getElementById('businessDaysOnly');
    const businessDaysNote = document.getElementById('businessDaysNote');
    const todayBtn = document.getElementById('todayBtn');
    const calcBtn = document.getElementById('calcBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    const resultBox = document.getElementById('resultBox');
    const primaryResult = document.getElementById('primaryResult');
    const resultDetails = document.getElementById('resultDetails');
    const copyResultBtn = document.getElementById('copyResultBtn');

    function setDateToToday() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        startDateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Set today as default start date
    setDateToToday();

    todayBtn.addEventListener('click', function () {
        setDateToToday();
        calculate();
    });

    if (calcBtn) {
        calcBtn.addEventListener('click', calculate);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            setDateToToday();
            operationSelect.value = 'add';
            amountInput.value = '30';
            unitSelect.value = 'days';
            businessDaysOnlyCheckbox.checked = false;
            updateBusinessDaysAvailability();
            calculate();
        });
    }

    function updateBusinessDaysAvailability() {
        const unit = unitSelect.value;
        const allowsBusinessDays = (unit === 'days' || unit === 'weeks');
        if (allowsBusinessDays) {
            businessDaysOnlyCheckbox.disabled = false;
            if (businessDaysNote) businessDaysNote.style.display = 'none';
        } else {
            businessDaysOnlyCheckbox.disabled = true;
            if (businessDaysNote) businessDaysNote.style.display = 'block';
        }
    }

    [startDateInput, amountInput, unitSelect, operationSelect, businessDaysOnlyCheckbox].forEach(el => {
        el.addEventListener('change', function () {
            updateBusinessDaysAvailability();
            calculate();
        });
        el.addEventListener('input', function () {
            updateBusinessDaysAvailability();
            calculate();
        });
    });

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }

    function calculate() {
        if (resultBox) {
            resultBox.classList.add('is-visible');
        }

        const startDateStr = startDateInput.value;
        const rawAmount = amountInput.value.trim();
        const amount = parseInt(rawAmount, 10);
        const unit = unitSelect.value;
        const operation = operationSelect.value;
        const businessOnly = businessDaysOnlyCheckbox.checked && !businessDaysOnlyCheckbox.disabled;

        if (!startDateStr) {
            primaryResult.textContent = 'Please enter a valid start date.';
            resultDetails.innerHTML = '';
            return;
        }

        if (rawAmount === '' || isNaN(amount)) {
            primaryResult.textContent = 'Please enter a valid amount.';
            resultDetails.innerHTML = '';
            return;
        }

        if (amount === 0) {
            primaryResult.textContent = 'Please enter an amount greater than 0.';
            resultDetails.innerHTML = '';
            return;
        }

        if (amount < 0) {
            primaryResult.textContent = 'Please enter a positive amount.';
            resultDetails.innerHTML = '';
            return;
        }

        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
        const direction = operation === 'subtract' ? -1 : 1;
        let current;

        if (businessOnly && (unit === 'days' || unit === 'weeks')) {
            const targetBusinessDays = unit === 'weeks' ? amount * 5 : amount;
            current = new Date(startYear, startMonth - 1, startDay);
            let daysAdded = 0;
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
                current = new Date(startYear, startMonth - 1, startDay + (direction * amount));
            } else if (unit === 'weeks') {
                current = new Date(startYear, startMonth - 1, startDay + (direction * amount * 7));
            } else if (unit === 'months') {
                const totalMonths = startYear * 12 + (startMonth - 1) + (direction * amount);
                const targetYear = Math.floor(totalMonths / 12);
                const targetMonth = ((totalMonths % 12) + 12) % 12;
                const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
                const targetDay = Math.min(startDay, maxDay);
                current = new Date(targetYear, targetMonth, targetDay);
            } else if (unit === 'years') {
                const targetYear = startYear + (direction * amount);
                const targetMonth = startMonth - 1;
                const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
                const targetDay = Math.min(startDay, maxDay);
                current = new Date(targetYear, targetMonth, targetDay);
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
        const diffDaysOfYear = Math.floor((Date.UTC(resYear, resMonth, resDay) - Date.UTC(resYear, 0, 1)) / (1000 * 60 * 60 * 24)) + 1;
        const totalDaysInYear = isLeapYear(resYear) ? 366 : 365;
        const remainingDays = totalDaysInYear - diffDaysOfYear;
        const quarter = Math.floor(resMonth / 3) + 1;

        // Total calendar days difference from start
        const totalCalDiff = Math.abs(Math.round((Date.UTC(resYear, resMonth, resDay) - Date.UTC(startYear, startMonth - 1, startDay)) / (1000 * 60 * 60 * 24)));

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

    updateBusinessDaysAvailability();
    calculate();
});
