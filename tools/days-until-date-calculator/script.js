/**
 * Days Until Date Calculator Script
 * Calculates exact total days, weeks, months, and weekday of target date
 * using local timezone midnight boundaries to prevent off-by-one errors.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('calculator-form');
  const targetDateInput = document.getElementById('target-date');
  const eventNameInput = document.getElementById('event-name');
  const resetBtn = document.getElementById('reset-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  // Set default minimum date (optional) or pre-fill with tomorrow's date for ease of use
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  targetDateInput.value = `${yyyy}-${mm}-${dd}`;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateDays();
  });

  resetBtn.addEventListener('click', () => {
    targetDateInput.value = `${yyyy}-${mm}-${dd}`;
    eventNameInput.value = '';
    resultBox.classList.remove('is-visible');
    errorBox.classList.add('hidden');
  });

  function calculateDays() {
    const rawDate = targetDateInput.value;
    const eventName = eventNameInput.value.trim();

    if (!rawDate) {
      showError('Please select a valid target date.');
      return;
    }

    errorBox.classList.add('hidden');

    // Parse date parts to construct local midnight Date object
    const [year, month, day] = rawDate.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);

    // Get today's date at local midnight
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Difference in milliseconds and total days
    const diffTime = targetDate.getTime() - today.getTime();
    const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Get weekday name
    const weekdayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedFullDate = targetDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    // Event title suffix
    const titleSubject = eventName ? eventName : 'Target Date';

    // UI elements to update
    const resultHeader = document.getElementById('result-header-text');
    const resultPrimary = document.getElementById('result-primary-text');
    const statTotalDays = document.getElementById('stat-total-days');
    const statWeeksDays = document.getElementById('stat-weeks-days');
    const statMonthsDays = document.getElementById('stat-months-days');
    const statWeekday = document.getElementById('stat-weekday');

    if (totalDays > 0) {
      // Future Date
      resultHeader.textContent = 'Countdown Calculation Result';
      resultPrimary.textContent = `${totalDays.toLocaleString()} Day${totalDays === 1 ? '' : 's'} Until ${titleSubject}`;
      statTotalDays.textContent = `${totalDays.toLocaleString()} Days`;

      // Weeks & Days calculation
      const weeks = Math.floor(totalDays / 7);
      const remainingDaysAfterWeeks = totalDays % 7;
      statWeeksDays.textContent = `${weeks} week${weeks === 1 ? '' : 's'}, ${remainingDaysAfterWeeks} day${remainingDaysAfterWeeks === 1 ? '' : 's'}`;

      // Months & Days calculation
      const { months, days: remainingDaysAfterMonths } = calculateMonthsAndDays(today, targetDate);
      statMonthsDays.textContent = `${months} month${months === 1 ? '' : 's'}, ${remainingDaysAfterMonths} day${remainingDaysAfterMonths === 1 ? '' : 's'}`;

      statWeekday.textContent = `${weekdayName} (${formattedFullDate})`;

    } else if (totalDays === 0) {
      // Today
      resultHeader.textContent = 'Event Status';
      resultPrimary.textContent = `Today is the day! (${titleSubject})`;
      statTotalDays.textContent = '0 Days';
      statWeeksDays.textContent = '0 weeks, 0 days';
      statMonthsDays.textContent = '0 months, 0 days';
      statWeekday.textContent = `Today is ${weekdayName}`;

    } else {
      // Past Date
      const pastDays = Math.abs(totalDays);
      resultHeader.textContent = 'Past Date Elapsed Calculation';
      resultPrimary.textContent = `${pastDays.toLocaleString()} Day${pastDays === 1 ? '' : 's'} Ago (${titleSubject})`;
      statTotalDays.textContent = `${pastDays.toLocaleString()} Days passed`;

      const weeks = Math.floor(pastDays / 7);
      const remainingDaysAfterWeeks = pastDays % 7;
      statWeeksDays.textContent = `${weeks} week${weeks === 1 ? '' : 's'}, ${remainingDaysAfterWeeks} day${remainingDaysAfterWeeks === 1 ? '' : 's'} ago`;

      const { months, days: remainingDaysAfterMonths } = calculateMonthsAndDays(targetDate, today);
      statMonthsDays.textContent = `${months} month${months === 1 ? '' : 's'}, ${remainingDaysAfterMonths} day${remainingDaysAfterMonths === 1 ? '' : 's'} ago`;

      statWeekday.textContent = `Fell on ${weekdayName} (${formattedFullDate})`;
    }

    resultBox.classList.add('is-visible');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Helper function to calculate months and days between two local midnight dates
   */
  function calculateMonthsAndDays(startDate, endDate) {
    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    let tempDate = new Date(startDate.getFullYear(), startDate.getMonth() + months, startDate.getDate());

    if (tempDate > endDate) {
      months--;
      tempDate = new Date(startDate.getFullYear(), startDate.getMonth() + months, startDate.getDate());
    }

    const remainingMs = endDate.getTime() - tempDate.getTime();
    const days = Math.round(remainingMs / (1000 * 60 * 60 * 24));

    return { months, days };
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
  }
});
