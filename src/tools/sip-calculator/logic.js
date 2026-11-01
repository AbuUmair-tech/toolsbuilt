/**
 * SIP Calculator Core Logic
 * Pure, DOM-free functions for Systematic Investment Plan (SIP) returns,
 * compound wealth accumulation, and optional annual step-up modeling.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.SipLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Error messages come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('sip-calculator')
    : require('../../../scripts/i18n-client.js').scope('sip-calculator');
  const locale = (english) => (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.pageLocale) ? ToolsBuilt.pageLocale(english) : english;

  /**
   * Half-up rounding to 2 decimal places
   */
  function roundCents(amount) {
    if (isNaN(amount) || !isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Format currency value
   */
  function formatCurrency(amount, symbol = '$') {
    const rounded = roundCents(amount);
    const formatted = rounded.toLocaleString(locale('en-US'), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formatted}`;
  }

  /**
   * Calculate SIP wealth projection with optional annual step-up.
   * Compounded monthly at the beginning of each period (annuity due).
   *
   * @param {number|string} monthlyInvestment - Initial monthly installment
   * @param {number|string} expectedReturnPercent - Expected annual return in % (e.g. 12)
   * @param {number|string} tenureYears - Investment duration in years
   * @param {Object} [options] - Optional settings
   * @param {number|string} [options.stepUpPercent=0] - Annual step-up percentage (e.g. 10)
   * @param {string} [options.currencySymbol='$'] - Currency symbol for display
   */
  function calculateSip(monthlyInvestment, expectedReturnPercent, tenureYears, options = {}) {
    const P = parseFloat(monthlyInvestment);
    const R = parseFloat(expectedReturnPercent);
    const years = parseFloat(tenureYears);
    const stepUp = options.stepUpPercent ? parseFloat(options.stepUpPercent) : 0;
    const symbol = options.currencySymbol || '$';

    if (isNaN(P) || P <= 0) {
      throw new Error(T('errors.investmentMin'));
    }
    if (isNaN(R) || R < 0) {
      throw new Error(T('errors.returnMin'));
    }
    if (isNaN(years) || years <= 0) {
      throw new Error(T('errors.yearsMin'));
    }
    if (years > 50) {
      throw new Error(T('errors.yearsMax'));
    }
    if (isNaN(stepUp) || stepUp < 0 || stepUp > 100) {
      throw new Error(T('errors.stepUpRange'));
    }

    const totalMonths = Math.round(years * 12);
    const i = R / 1200; // periodic monthly rate

    let totalInvested = 0;
    let maturityValue = 0;

    // Month-by-month calculation to support precise step-up
    for (let m = 1; m <= totalMonths; m++) {
      const yearIdx = Math.floor((m - 1) / 12);
      const currentMonthly = roundCents(P * Math.pow(1 + stepUp / 100, yearIdx));
      totalInvested = roundCents(totalInvested + currentMonthly);

      const monthsToCompound = totalMonths - m + 1;
      const futureVal = i === 0 ? currentMonthly : currentMonthly * Math.pow(1 + i, monthsToCompound);
      maturityValue += futureVal;
    }

    totalInvested = roundCents(totalInvested);
    maturityValue = roundCents(maturityValue);
    const estimatedReturns = roundCents(Math.max(0, maturityValue - totalInvested));

    // Generate yearly milestone breakdown
    const yearlyBreakdown = [];
    let cumInvested = 0;

    for (let y = 1; y <= Math.ceil(years); y++) {
      const monthsUpToYear = Math.min(y * 12, totalMonths);
      const monthsInThisYear = monthsUpToYear - (y - 1) * 12;
      const yearIdx = y - 1;
      const monthlyForThisYear = roundCents(P * Math.pow(1 + stepUp / 100, yearIdx));
      const annualInvested = roundCents(monthlyForThisYear * monthsInThisYear);
      cumInvested = roundCents(cumInvested + annualInvested);

      // Future value of all investments made up to this year, compounded to year y
      let valueAtYear = 0;
      for (let m = 1; m <= monthsUpToYear; m++) {
        const mYearIdx = Math.floor((m - 1) / 12);
        const dep = roundCents(P * Math.pow(1 + stepUp / 100, mYearIdx));
        const comp = monthsUpToYear - m + 1;
        valueAtYear += i === 0 ? dep : dep * Math.pow(1 + i, comp);
      }

      yearlyBreakdown.push({
        year: y,
        monthlyDeposit: monthlyForThisYear,
        annualInvestment: annualInvested,
        totalInvestedToDate: cumInvested,
        futureValue: roundCents(valueAtYear)
      });
    }

    return {
      monthlyInvestment: P,
      expectedReturnPercent: R,
      tenureYears: years,
      totalMonths,
      stepUpPercent: stepUp,
      currencySymbol: symbol,
      totalInvested,
      estimatedReturns,
      maturityValue,
      yearlyBreakdown
    };
  }

  return {
    roundCents,
    formatCurrency,
    calculateSip
  };
});
