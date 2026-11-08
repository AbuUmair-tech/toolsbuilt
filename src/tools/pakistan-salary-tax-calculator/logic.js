/**
 * Pakistan Salary Tax Calculator Core Logic
 * Pure, DOM-free functions for income tax on annual taxable salary income.
 *
 * A thin Pakistan wrapper around the shared salary tax engine
 * (/tools/salary-tax-calculator/logic.js). The slabs live in the data files
 * src/_data/tax/pk-<taxyear>.json, with their FBR source and verification date.
 * In the browser the page embeds those files as #tax-datasets JSON.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('../salary-tax-calculator/logic.js'),
      [require('../../_data/tax/pk-2026-27.json'), require('../../_data/tax/pk-2025-26.json')]
    );
  } else {
    const el = root.document && root.document.getElementById('tax-datasets');
    root.PakistanSalaryTaxLogic = factory(root.SalaryTaxEngine, el ? JSON.parse(el.textContent) : []);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine, datasets) {
  'use strict';

  // Error messages come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('pakistan-salary-tax-calculator')
    : require('../../../scripts/i18n-client.js').scope('pakistan-salary-tax-calculator');

  const byYear = {};
  datasets.forEach(d => { byYear[d.taxYear] = d; });
  const TAX_YEAR = (datasets.find(d => d.current) || datasets[0]).taxYear;
  const PREVIOUS_TAX_YEAR = (datasets.find(d => d.taxYear !== TAX_YEAR) || {}).taxYear;

  // Slab `over` is the floor: tax = fixed + rate × (income − over), for income above `over`
  // up to `upTo` (inclusive). The last slab has no upper limit.
  const TAX_TABLES = {};
  datasets.forEach(d => {
    const tier = d.surcharge && d.surcharge.tiers && d.surcharge.tiers[0];
    TAX_TABLES[d.taxYear] = {
      label: d.label,
      slabs: engine.resolve(d).slabs.map(({ over, upTo, fixed, rate }) => ({ over, upTo, fixed, rate })),
      surcharge: tier ? { rate: tier.rate, incomeAbove: tier.incomeAbove } : null
    };
  });

  function getTable(taxYear) {
    const table = TAX_TABLES[taxYear || TAX_YEAR];
    if (!table) throw new Error(T('errors.unknownYear', { year: taxYear, years: Object.keys(TAX_TABLES).join(T('errors.yearSeparator')) }));
    return table;
  }

  /**
   * Annual income tax on annual taxable salary income.
   * Returns exact rupee amounts (not rounded); format for display only.
   */
  function calculateAnnualTax(annualIncome, taxYear) {
    const year = taxYear || TAX_YEAR;
    getTable(year);
    const r = engine.calculate(byYear[year], annualIncome);
    const { over, upTo, fixed, rate } = r.slab;
    return {
      taxYear: year,
      annualIncome: r.annualIncome,
      baseTax: r.grossTax,
      surcharge: r.surcharge,
      annualTax: r.annualTax,
      slabIndex: r.slabIndex,
      slab: { over, upTo, fixed, rate },
      marginalRate: r.marginalRate,
      effectiveRate: r.effectiveRate
    };
  }

  /**
   * Full salary breakdown for an amount entered per month or per year,
   * compared with the previous tax year.
   */
  function calculateSalaryTax(amount, period, taxYear) {
    const value = Number(amount);
    if (!isFinite(value) || value < 0) {
      throw new Error(T('errors.salaryMin'));
    }
    if (period !== 'monthly' && period !== 'annual') {
      throw new Error(T('errors.period'));
    }
    const year = taxYear || TAX_YEAR;
    const annualIncome = period === 'monthly' ? value * 12 : value;
    const current = calculateAnnualTax(annualIncome, year);
    const otherYear = year === TAX_YEAR ? PREVIOUS_TAX_YEAR : TAX_YEAR;
    const other = calculateAnnualTax(annualIncome, otherYear);
    // Compare the current year against the previous one regardless of which year is selected
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
        // Positive: less tax per month under the current year than the previous one
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
