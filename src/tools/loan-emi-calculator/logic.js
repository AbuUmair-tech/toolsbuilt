/**
 * Loan EMI Calculator Core Logic
 * Pure, DOM-free functions for loan amortization, EMI calculations,
 * extra payment acceleration, and CSV export generation.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.LoanEmiLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CURRENCY_MAP = {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
    PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee (₨)' },
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
    AED: { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
    SAR: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)' }
  };

  /**
   * Half-up rounding to 2 decimal places (cents)
   */
  function roundCents(amount) {
    if (isNaN(amount) || !isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Format currency value
   */
  function formatCurrency(amount, currencyCode = 'USD') {
    const curr = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.USD;
    const rounded = roundCents(amount);
    const formattedNum = rounded.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${curr.symbol} ${formattedNum}`;
  }

  /**
   * Calculate standard EMI and full amortization schedule with optional extra payment.
   *
   * @param {number|string} principal - Loan amount
   * @param {number|string} annualRatePercent - Annual interest rate in percent (e.g. 6.5)
   * @param {number|string} tenureValue - Duration in years or months
   * @param {string} tenureUnit - 'years' or 'months' (default: 'years')
   * @param {Object} [options] - Optional settings
   * @param {number|string} [options.extraMonthlyPayment=0] - Optional extra principal payment per month
   * @param {string} [options.currencyCode='USD'] - Selected currency code
   */
  function calculateLoanEmi(principal, annualRatePercent, tenureValue, tenureUnit = 'years', options = {}) {
    const P = parseFloat(principal);
    const R = parseFloat(annualRatePercent);
    const rawTenure = parseFloat(tenureValue);
    const extraPayment = options.extraMonthlyPayment ? parseFloat(options.extraMonthlyPayment) : 0;
    const currencyCode = (options.currencyCode || 'USD').toUpperCase();
    const curr = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.USD;

    if (isNaN(P) || P <= 0) {
      throw new Error('Please enter a valid loan amount greater than zero.');
    }
    if (isNaN(R) || R < 0) {
      throw new Error('Please enter a valid annual interest rate (0% or greater).');
    }
    if (isNaN(rawTenure) || rawTenure <= 0) {
      throw new Error('Please enter a valid loan tenure greater than zero.');
    }
    if (isNaN(extraPayment) || extraPayment < 0) {
      throw new Error('Extra monthly payment must be 0 or greater.');
    }

    const n = tenureUnit === 'months' ? Math.round(rawTenure) : Math.round(rawTenure * 12);
    if (n < 1 || n > 600) {
      throw new Error('Loan tenure must be between 1 month and 50 years (600 months).');
    }

    const r = R / 1200; // monthly fractional rate

    // Standard EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
    let emi = 0;
    if (r === 0) {
      emi = roundCents(P / n);
    } else {
      const pow = Math.pow(1 + r, n);
      emi = roundCents((P * r * pow) / (pow - 1));
    }

    // Build standard amortization schedule
    let bal = P;
    let totInt = 0;
    let totPay = 0;
    const schedule = [];

    for (let m = 1; m <= n; m++) {
      const intVal = r === 0 ? 0 : roundCents(bal * r);
      let payVal = emi;
      let prinVal = roundCents(payVal - intVal);

      if (m === n || bal + intVal <= payVal) {
        // Final payment adjustment to zero out the exact balance
        prinVal = bal;
        payVal = roundCents(prinVal + intVal);
        bal = 0;
      } else {
        bal = roundCents(bal - prinVal);
      }

      totInt = roundCents(totInt + intVal);
      totPay = roundCents(totPay + payVal);

      schedule.push({
        month: m,
        payment: payVal,
        principal: prinVal,
        interest: intVal,
        totalInterest: totInt,
        balance: bal
      });

      if (bal <= 0) break;
    }

    // Calculate Extra Payment Schedule (if extra payment entered)
    let extraInfo = null;
    if (extraPayment > 0) {
      let extraBal = P;
      let extraTotInt = 0;
      let extraTotPay = 0;
      const extraSchedule = [];
      const targetMonthly = roundCents(emi + extraPayment);
      let m = 0;

      while (extraBal > 0 && m < n) {
        m++;
        const intVal = r === 0 ? 0 : roundCents(extraBal * r);
        let payVal = targetMonthly;
        let prinVal = roundCents(payVal - intVal);

        if (extraBal + intVal <= payVal) {
          prinVal = extraBal;
          payVal = roundCents(prinVal + intVal);
          extraBal = 0;
        } else {
          extraBal = roundCents(extraBal - prinVal);
        }

        extraTotInt = roundCents(extraTotInt + intVal);
        extraTotPay = roundCents(extraTotPay + payVal);

        extraSchedule.push({
          month: m,
          payment: payVal,
          principal: prinVal,
          interest: intVal,
          totalInterest: extraTotInt,
          balance: extraBal
        });

        if (extraBal <= 0) break;
      }

      const payoffMonths = m;
      const monthsSaved = Math.max(0, n - payoffMonths);
      const interestSaved = roundCents(Math.max(0, totInt - extraTotInt));

      extraInfo = {
        extraMonthlyPayment: extraPayment,
        totalMonthlyPayment: targetMonthly,
        payoffMonths,
        payoffYears: roundCents(payoffMonths / 12),
        monthsSaved,
        totalPaymentWithExtra: extraTotPay,
        totalInterestWithExtra: extraTotInt,
        interestSaved,
        schedule: extraSchedule
      };
    }

    return {
      principal: P,
      annualRate: R,
      tenureMonths: n,
      tenureYears: roundCents(n / 12),
      monthlyEmi: emi,
      totalPayment: totPay,
      totalInterest: totInt,
      currencyCode: curr.code,
      currencySymbol: curr.symbol,
      schedule,
      extra: extraInfo
    };
  }

  /**
   * Generate RFC 4180 compliant CSV text from an amortization schedule
   */
  function generateAmortizationCsv(schedule, currencySymbol = '$') {
    if (!Array.isArray(schedule) || schedule.length === 0) return '';
    const headers = [
      'Month',
      `Payment (${currencySymbol})`,
      `Principal Paid (${currencySymbol})`,
      `Interest Paid (${currencySymbol})`,
      `Total Interest to Date (${currencySymbol})`,
      `Remaining Balance (${currencySymbol})`
    ];

    const rows = schedule.map(row => [
      row.month,
      row.payment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.totalInterest.toFixed(2),
      row.balance.toFixed(2)
    ]);

    return [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');
  }

  return {
    CURRENCIES: CURRENCY_MAP,
    roundCents,
    formatCurrency,
    calculateLoanEmi,
    generateAmortizationCsv
  };
});
