/**
 * Age Calculator Script
 * Calculates exact age in years/months/days, total months, weeks, days, hours,
 * and countdown to next birthday using local midnight boundaries.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('calculator-form');
  const dobInput = document.getElementById('dob-date');
  const targetDateInput = document.getElementById('target-date');
  const resetBtn = document.getElementById('reset-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  // Pre-fill target date as today
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = String(today.getMonth() + 1).padStart(2, '0');
  const todayD = String(today.getDate()).padStart(2, '0');
  targetDateInput.value = `${todayY}-${todayM}-${todayD}`;

  // Pre-fill DOB with sample (e.g., Jan 1, 2000)
  dobInput.value = '2000-01-01';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateAge();
  });

  resetBtn.addEventListener('click', () => {
    dobInput.value = '2000-01-01';
    targetDateInput.value = `${todayY}-${todayM}-${todayD}`;
    resultBox.classList.remove('is-visible');
    errorBox.classList.add('hidden');
  });

  function calculateAge() {
    const rawDob = dobInput.value;
    const rawTarget = targetDateInput.value;

    if (!rawDob || !rawTarget) {
      showError('Please select both a valid date of birth and a target age date.');
      return;
    }

    const [dobY, dobM, dobD] = rawDob.split('-').map(Number);
    const [tY, tM, tD] = rawTarget.split('-').map(Number);

    const dob = new Date(dobY, dobM - 1, dobD);
    const target = new Date(tY, tM - 1, tD);

    if (dob > target) {
      showError('Date of birth cannot be in the future relative to the target calculation date.');
      return;
    }

    errorBox.classList.add('hidden');

    // Years, Months, Days calculation
    let years = target.getFullYear() - dob.getFullYear();
    let months = target.getMonth() - dob.getMonth();
    let days = target.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      const prevMonthLastDay = new Date(target.getFullYear(), target.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    // Total metrics
    const diffTime = target.getTime() - dob.getTime();
    const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = (years * 12) + months;
    const totalHours = totalDays * 24;

    // Next Birthday calculation
    let nextBdayYear = target.getFullYear();
    let nextBday = new Date(nextBdayYear, dobM - 1, dobD);

    // Check if birthday was Feb 29 and nextBdayYear is not leap year
    if (dobM === 2 && dobD === 29 && !isLeapYear(nextBdayYear)) {
      nextBday = new Date(nextBdayYear, 1, 28);
    }

    if (nextBday < target) {
      nextBdayYear++;
      nextBday = new Date(nextBdayYear, dobM - 1, dobD);
      if (dobM === 2 && dobD === 29 && !isLeapYear(nextBdayYear)) {
        nextBday = new Date(nextBdayYear, 1, 28);
      }
    }

    const daysUntilNextBday = Math.round((nextBday.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    const bdayWeekday = nextBday.toLocaleDateString('en-US', { weekday: 'long' });
    const bdayFormattedDate = nextBday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // UI Updates
    document.getElementById('result-header-text').textContent = 'Age Calculation Result';
    document.getElementById('result-primary-text').textContent = `${years} Years, ${months} Months, ${days} Days`;

    document.getElementById('stat-years-months-days').textContent = `${years}y ${months}m ${days}d`;
    document.getElementById('stat-total-months').textContent = `${totalMonths.toLocaleString()} Months`;
    document.getElementById('stat-total-weeks').textContent = `${totalWeeks.toLocaleString()} Weeks`;
    document.getElementById('stat-total-days').textContent = `${totalDays.toLocaleString()} Days`;
    document.getElementById('stat-total-hours').textContent = `${totalHours.toLocaleString()} Hours`;

    if (daysUntilNextBday === 0) {
      document.getElementById('stat-next-birthday').textContent = `Today is your Birthday! (${bdayWeekday})`;
    } else {
      document.getElementById('stat-next-birthday').textContent = `${daysUntilNextBday} days left (${bdayWeekday}, ${bdayFormattedDate})`;
    }

    resultBox.classList.add('is-visible');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
  }

  // Initial auto calculation
  calculateAge();
});
