/**
 * Date Difference Calculator Script
 * Calculates total days, business days (Mon-Fri), weeks/days, months/days,
 * and years/months/days breakdown between two local midnight dates.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('calculator-form');
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');
  const includeEndCheckbox = document.getElementById('include-end-date');
  const resetBtn = document.getElementById('reset-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  // Pre-fill defaults: start = today, end = today + 30 days
  const today = new Date();
  const startY = today.getFullYear();
  const startM = String(today.getMonth() + 1).padStart(2, '0');
  const startD = String(today.getDate()).padStart(2, '0');
  startDateInput.value = `${startY}-${startM}-${startD}`;

  const defaultEnd = new Date(today);
  defaultEnd.setDate(defaultEnd.getDate() + 30);
  const endY = defaultEnd.getFullYear();
  const endM = String(defaultEnd.getMonth() + 1).padStart(2, '0');
  const endD = String(defaultEnd.getDate()).padStart(2, '0');
  endDateInput.value = `${endY}-${endM}-${endD}`;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateDifference();
  });

  resetBtn.addEventListener('click', () => {
    startDateInput.value = `${startY}-${startM}-${startD}`;
    endDateInput.value = `${endY}-${endM}-${endD}`;
    includeEndCheckbox.checked = false;
    resultBox.classList.remove('is-visible');
    errorBox.classList.add('hidden');
  });

  function calculateDifference() {
    const rawStart = startDateInput.value;
    const rawEnd = endDateInput.value;
    const includeEnd = includeEndCheckbox.checked;

    if (!rawStart || !rawEnd) {
      showError('Please select both a start date and an end date.');
      return;
    }

    errorBox.classList.add('hidden');

    // Parse local midnight Date objects
    const [sY, sM, sD] = rawStart.split('-').map(Number);
    const [eY, eM, eD] = rawEnd.split('-').map(Number);

    let d1 = new Date(sY, sM - 1, sD);
    let d2 = new Date(eY, eM - 1, eD);

    let swapped = false;
    if (d1 > d2) {
      swapped = true;
      const temp = d1;
      d1 = d2;
      d2 = temp;
    }

    // Base milliseconds difference
    const diffTime = d2.getTime() - d1.getTime();
    let totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (includeEnd) {
      totalDays += 1;
    }

    // Calculate Business Days (Mon-Fri)
    const businessDays = calculateBusinessDays(d1, d2, includeEnd);

    // Calculate Y / M / D breakdown
    const ymd = calculateYMD(d1, d2, includeEnd);

    // Calculate Weeks & Days breakdown
    const weeks = Math.floor(totalDays / 7);
    const remDaysAfterWeeks = totalDays % 7;

    // Calculate Months & Days breakdown
    const md = calculateMonthsAndDays(d1, d2, includeEnd);

    // Format UI Output
    const resultHeader = document.getElementById('result-header-text');
    const resultPrimary = document.getElementById('result-primary-text');
    const statTotalDays = document.getElementById('stat-total-days');
    const statBusinessDays = document.getElementById('stat-business-days');
    const statYMD = document.getElementById('stat-ymd');
    const statWeeksDays = document.getElementById('stat-weeks-days');
    const statMonthsDays = document.getElementById('stat-months-days');

    const formattedStart = d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedEnd = d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (swapped) {
      resultHeader.textContent = 'Reversed Dates (Start date was after End date)';
    } else {
      resultHeader.textContent = 'Date Difference Calculation Result';
    }

    resultPrimary.textContent = `${totalDays.toLocaleString()} Day${totalDays === 1 ? '' : 's'} (${formattedStart} – ${formattedEnd})`;
    statTotalDays.textContent = `${totalDays.toLocaleString()} Days${includeEnd ? ' (inclusive)' : ''}`;
    statBusinessDays.textContent = `${businessDays.toLocaleString()} Business Days`;

    // Format YMD string
    const yParts = [];
    if (ymd.years > 0) yParts.push(`${ymd.years} year${ymd.years === 1 ? '' : 's'}`);
    if (ymd.months > 0) yParts.push(`${ymd.months} month${ymd.months === 1 ? '' : 's'}`);
    if (ymd.days > 0 || yParts.length === 0) yParts.push(`${ymd.days} day${ymd.days === 1 ? '' : 's'}`);
    statYMD.textContent = yParts.join(', ');

    statWeeksDays.textContent = `${weeks} week${weeks === 1 ? '' : 's'}, ${remDaysAfterWeeks} day${remDaysAfterWeeks === 1 ? '' : 's'}`;
    statMonthsDays.textContent = `${md.months} month${md.months === 1 ? '' : 's'}, ${md.days} day${md.days === 1 ? '' : 's'}`;

    resultBox.classList.add('is-visible');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Calculate Business Days (Mon=1, Tue=2, ..., Fri=5)
   */
  function calculateBusinessDays(startDate, endDate, includeEnd) {
    let count = 0;
    const cur = new Date(startDate.getTime());
    const target = new Date(endDate.getTime());

    while (cur < target) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0=Sun, 6=Sat
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (includeEnd) {
      const endDay = target.getDay();
      if (endDay !== 0 && endDay !== 6) {
        count++;
      }
    }

    return count;
  }

  /**
   * Precise Years, Months, and Days breakdown
   */
  function calculateYMD(d1, d2, includeEnd) {
    let targetD2 = new Date(d2.getTime());
    if (includeEnd) {
      targetD2.setDate(targetD2.getDate() + 1);
    }

    let years = targetD2.getFullYear() - d1.getFullYear();
    let months = targetD2.getMonth() - d1.getMonth();
    let days = targetD2.getDate() - d1.getDate();

    if (days < 0) {
      months--;
      // Prev month's total days
      const prevMonthLastDay = new Date(targetD2.getFullYear(), targetD2.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  }

  /**
   * Total Months + Days breakdown
   */
  function calculateMonthsAndDays(d1, d2, includeEnd) {
    let targetD2 = new Date(d2.getTime());
    if (includeEnd) {
      targetD2.setDate(targetD2.getDate() + 1);
    }

    let months = (targetD2.getFullYear() - d1.getFullYear()) * 12 + (targetD2.getMonth() - d1.getMonth());
    let tempDate = new Date(d1.getFullYear(), d1.getMonth() + months, d1.getDate());

    if (tempDate > targetD2) {
      months--;
      tempDate = new Date(d1.getFullYear(), d1.getMonth() + months, d1.getDate());
    }

    const diff = Math.round((targetD2.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24));
    return { months, days: diff };
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
  }
});
