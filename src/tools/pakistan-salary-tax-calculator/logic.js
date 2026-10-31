/**
 * Pakistan Salary Tax Calculator Core Logic
 * Pure, DOM-free functions for income tax on annual taxable salary income.
 *
 * Rates: Finance Act 2026, First Schedule, Part I, Division I (salaried individuals).
 * Each slab charges a fixed amount plus a marginal rate on the income above its floor.
 * To update for a new budget, change TAX_YEAR and the TAX_TABLES data only.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PakistanSalaryTaxLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TAX_YEAR = '2026-27';
  const PREVIOUS_TAX_YEAR = '2025-26';

  // Slab `over` is the floor: tax = fixed + rate × (income − over), for income above `over`
  // up to `upTo` (inclusive). The last slab has no upper limit.
  const TAX_TABLES = {
    // Tax year 2026-27 (July 2026 – June 2027), Finance Act 2026. No surcharge for salaried individuals.
    '2026-27': {
      label: 'Tax year 2026-27',
      slabs: [
        { over: 0, upTo: 600000, fixed: 0, rate: 0 },
        { over: 600000, upTo: 1200000, fixed: 0, rate: 0.01 },
        { over: 1200000, upTo: 2200000, fixed: 6000, rate: 0.11 },
        { over: 2200000, upTo: 3200000, fixed: 116000, rate: 0.20 },
        { over: 3200000, upTo: 4100000, fixed: 316000, rate: 0.25 },
        { over: 4100000, upTo: 5600000, fixed: 541000, rate: 0.29 },
        { over: 5600000, upTo: 7000000, fixed: 976000, rate: 0.32 },
        { over: 7000000, upTo: null, fixed: 1424000, rate: 0.35 }
      ],
      surcharge: null
    },
    // Tax year 2025-26 (July 2025 – June 2026), kept for comparison.
    '2025-26': {
      label: 'Tax year 2025-26',
      slabs: [
        { over: 0, upTo: 600000, fixed: 0, rate: 0 },
        { over: 600000, upTo: 1200000, fixed: 0, rate: 0.01 },
        { over: 1200000, upTo: 2200000, fixed: 6000, rate: 0.11 },
        { over: 2200000, upTo: 3200000, fixed: 116000, rate: 0.23 },
        { over: 3200000, upTo: 4100000, fixed: 346000, rate: 0.30 },
        { over: 4100000, upTo: null, fixed: 616000, rate: 0.35 }
      ],
      // 9% of the tax amount when taxable income exceeds Rs 10,000,000
      surcharge: { rate: 0.09, incomeAbove: 10000000 }
    }
  };

  function getTable(taxYear) {
    const table = TAX_TABLES[taxYear || TAX_YEAR];
    if (!table) throw new Error(`Unknown tax year "${taxYear}". Choose ${Object.keys(TAX_TABLES).join(' or ')}.`);
    return table;
  }

  function findSlabIndex(slabs, income) {
    for (let i = 0; i < slabs.length; i++) {
      if (slabs[i].upTo === null || income <= slabs[i].upTo) return i;
    }
    return slabs.length - 1;
  }

  /**
   * Annual income tax on annual taxable salary income.
   * Returns exact rupee amounts (not rounded); format for display only.
   */
  function calculateAnnualTax(annualIncome, taxYear) {
    const income = Number(annualIncome);
    if (!isFinite(income) || income < 0) {
      throw new Error('Please enter a salary of 0 or more.');
    }
    const table = getTable(taxYear);
    const slabIndex = findSlabIndex(table.slabs, income);
    const slab = table.slabs[slabIndex];
    const baseTax = income > slab.over ? slab.fixed + slab.rate * (income - slab.over) : slab.fixed;
    const surcharge = table.surcharge && income > table.surcharge.incomeAbove ? baseTax * table.surcharge.rate : 0;
    const tax = baseTax + surcharge;
    return {
      taxYear: taxYear || TAX_YEAR,
      annualIncome: income,
      baseTax,
      surcharge,
      annualTax: tax,
      slabIndex,
      slab,
      marginalRate: slab.rate,
      effectiveRate: income > 0 ? (tax / income) * 100 : 0
    };
  }

  /**
   * Full salary breakdown for an amount entered per month or per year,
   * compared with the previous tax year.
   */
  function calculateSalaryTax(amount, period, taxYear) {
    const value = Number(amount);
    if (!isFinite(value) || value < 0) {
      throw new Error('Please enter a salary of 0 or more.');
    }
    if (period !== 'monthly' && period !== 'annual') {
      throw new Error('Choose whether the salary is monthly or annual.');
    }
    const year = taxYear || TAX_YEAR;
    const annualIncome = period === 'monthly' ? value * 12 : value;
    const current = calculateAnnualTax(annualIncome, year);
    const otherYear = year === TAX_YEAR ? PREVIOUS_TAX_YEAR : TAX_YEAR;
    const other = calculateAnnualTax(annualIncome, otherYear);
    // Compare 2026-27 against 2025-26 regardless of which year is selected
    const newer = year === TAX_YEAR ? current : other;
    const older = year === TAX_YEAR ? other : current;

    return {
      ...current,
      period,
      monthlyIncome: annualIncome / 12,
      monthlyTax: current.annualTax / 12,
      annualTakeHome: annualIncome - current.annualTax,
      monthlyTakeHome: (annualIncome - current.annualTax) / 12,
      comparison: {
        newerYear: TAX_YEAR,
        olderYear: PREVIOUS_TAX_YEAR,
        // Positive: less tax per month under 2026-27 than 2025-26
        monthlySaving: (older.annualTax - newer.annualTax) / 12,
        annualSaving: older.annualTax - newer.annualTax
      }
    };
  }

  /** Rs 1,234,567 (rounded to the nearest rupee) */
  function formatPkr(amount) {
    const rounded = Math.round(Number(amount) || 0);
    const sign = rounded < 0 ? '-' : '';
    return `${sign}Rs ${Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  return {
    TAX_YEAR,
    PREVIOUS_TAX_YEAR,
    TAX_TABLES,
    getTable,
    calculateAnnualTax,
    calculateSalaryTax,
    formatPkr
  };
});
