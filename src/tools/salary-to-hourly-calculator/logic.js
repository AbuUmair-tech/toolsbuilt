/**
 * Salary to Hourly Calculator Core Logic
 * Pure, DOM-free conversion between annual, monthly, bi-weekly, weekly, daily and
 * hourly pay. Everything is converted to an annual figure first, then divided out
 * using the hours and paid weeks actually worked.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.SalaryToHourlyLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const PERIODS = ['hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'annual'];
  const PERIOD_LABELS = {
    hourly: 'per hour',
    daily: 'per day',
    weekly: 'per week',
    biweekly: 'every two weeks',
    monthly: 'per month',
    annual: 'per year'
  };

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  /**
   * @param {Object} input
   * @param {number|string} input.amount
   * @param {string} input.period - one of PERIODS
   * @param {number|string} input.hoursPerWeek  (default 40)
   * @param {number|string} input.daysPerWeek   (default 5)
   * @param {number|string} input.weeksPerYear  paid weeks in a normal year (default 52)
   * @param {number|string} input.unpaidWeeks   weeks off without pay (default 0)
   */
  function convertPay(input = {}) {
    if (isBlank(input.amount)) return { error: 'Enter your pay.', field: 'amount' };
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'Pay must be a number greater than 0.', field: 'amount' };

    const period = input.period || 'annual';
    if (!PERIODS.includes(period)) return { error: 'Choose how often this pay is earned.', field: 'period' };

    const hoursPerWeek = isBlank(input.hoursPerWeek) ? 40 : Number(input.hoursPerWeek);
    if (!Number.isFinite(hoursPerWeek) || hoursPerWeek <= 0 || hoursPerWeek > 168) {
      return { error: 'Hours per week must be more than 0 and at most 168.', field: 'hours' };
    }
    const daysPerWeek = isBlank(input.daysPerWeek) ? 5 : Number(input.daysPerWeek);
    if (!Number.isFinite(daysPerWeek) || daysPerWeek <= 0 || daysPerWeek > 7) {
      return { error: 'Days per week must be more than 0 and at most 7.', field: 'days' };
    }
    const weeksPerYear = isBlank(input.weeksPerYear) ? 52 : Number(input.weeksPerYear);
    if (!Number.isFinite(weeksPerYear) || weeksPerYear <= 0 || weeksPerYear > 53) {
      return { error: 'Weeks per year must be more than 0 and at most 53.', field: 'weeks' };
    }
    const unpaidWeeks = isBlank(input.unpaidWeeks) ? 0 : Number(input.unpaidWeeks);
    if (!Number.isFinite(unpaidWeeks) || unpaidWeeks < 0) return { error: 'Unpaid weeks off must be 0 or more.', field: 'unpaid' };
    if (unpaidWeeks >= weeksPerYear) return { error: 'Unpaid weeks off must be fewer than the weeks in the year.', field: 'unpaid' };

    const paidWeeks = weeksPerYear - unpaidWeeks;
    const hoursPerYear = hoursPerWeek * paidWeeks;
    const daysPerYear = daysPerWeek * paidWeeks;

    let annual;
    switch (period) {
      case 'hourly': annual = amount * hoursPerYear; break;
      case 'daily': annual = amount * daysPerYear; break;
      case 'weekly': annual = amount * paidWeeks; break;
      case 'biweekly': annual = amount * paidWeeks / 2; break;
      case 'monthly': annual = amount * 12; break;
      default: annual = amount;
    }

    const weekly = annual / paidWeeks;
    return {
      input: { amount, period },
      paidWeeks,
      hoursPerWeek,
      daysPerWeek,
      hoursPerYear,
      daysPerYear,
      annual: round2(annual),
      monthly: round2(annual / 12),
      biweekly: round2(weekly * 2),
      weekly: round2(weekly),
      daily: round2(weekly / daysPerWeek),
      hourly: round2(weekly / hoursPerWeek),
      exact: {
        annual,
        monthly: annual / 12,
        weekly,
        hourly: weekly / hoursPerWeek
      }
    };
  }

  return { PERIODS, PERIOD_LABELS, convertPay };
});
