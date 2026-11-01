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

  // Messages and period labels come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('salary-to-hourly-calculator')
    : require('../../../scripts/i18n-client.js').scope('salary-to-hourly-calculator');

  const PERIODS = ['hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'annual'];
  // e.g. hourly -> 'per hour'
  const PERIOD_LABELS = {};
  PERIODS.forEach(p => { PERIOD_LABELS[p] = T(`periods.${p}`); });

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
    if (isBlank(input.amount)) return { error: T('errors.amountEmpty'), field: 'amount' };
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: T('errors.amountInvalid'), field: 'amount' };

    const period = input.period || 'annual';
    if (!PERIODS.includes(period)) return { error: T('errors.period'), field: 'period' };

    const hoursPerWeek = isBlank(input.hoursPerWeek) ? 40 : Number(input.hoursPerWeek);
    if (!Number.isFinite(hoursPerWeek) || hoursPerWeek <= 0 || hoursPerWeek > 168) {
      return { error: T('errors.hours'), field: 'hours' };
    }
    const daysPerWeek = isBlank(input.daysPerWeek) ? 5 : Number(input.daysPerWeek);
    if (!Number.isFinite(daysPerWeek) || daysPerWeek <= 0 || daysPerWeek > 7) {
      return { error: T('errors.days'), field: 'days' };
    }
    const weeksPerYear = isBlank(input.weeksPerYear) ? 52 : Number(input.weeksPerYear);
    if (!Number.isFinite(weeksPerYear) || weeksPerYear <= 0 || weeksPerYear > 53) {
      return { error: T('errors.weeks'), field: 'weeks' };
    }
    const unpaidWeeks = isBlank(input.unpaidWeeks) ? 0 : Number(input.unpaidWeeks);
    if (!Number.isFinite(unpaidWeeks) || unpaidWeeks < 0) return { error: T('errors.unpaidNegative'), field: 'unpaid' };
    if (unpaidWeeks >= weeksPerYear) return { error: T('errors.unpaidTooMany'), field: 'unpaid' };

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
