/**
 * Salary Tax Engine
 * Pure, DOM-free income tax on an annual salary, driven entirely by a country dataset
 * (src/_data/tax/<cc>-<taxyear>.json). No rates live in this file.
 *
 * Dataset shape (every block except `slabs` is optional):
 *   slabs:              [{ over, upTo|null, rate, fixed? }]  tax = fixed + rate × (taxable − over);
 *                       when `fixed` is missing it is the full tax of the slabs below
 *   statuses:           { <id>: { label, standardDeduction, slabs } }  (e.g. US filing status)
 *   standardDeduction:  amount taken off gross salary before the slabs
 *   personalAllowance:  { amount, taperAbove, taperRate }  allowance falls by taperRate per unit
 *                       of income above taperAbove (UK: £1 for every £2 over £100,000)
 *   rebate:             { upToIncome, maxAmount, marginalRelief }  tax rebate when taxable income
 *                       is at most upToIncome; with marginal relief, tax above that limit never
 *                       exceeds the income above it (India, section 87A)
 *   surcharge:          { tiers: [{ incomeAbove, rate }], marginalRelief }  a share of the tax
 *   cess:               { rate }  a share of tax plus surcharge (India, health & education cess)
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.SalaryTaxEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Messages and default labels come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('salary-tax-calculator')
    : require('../../../scripts/i18n-client.js').scope('salary-tax-calculator');

  /** Resolves a dataset (and filing status, if any) into slabs with every fixed amount filled in. */
  function resolve(dataset, status) {
    if (!dataset || typeof dataset !== 'object') throw new Error(T('engine.errors.noData'));
    let base = dataset;
    if (dataset.statuses) {
      const id = status || dataset.defaultStatus || Object.keys(dataset.statuses)[0];
      base = dataset.statuses[id];
      if (!base) throw new Error(T('engine.errors.unknownStatus', { status }));
    }
    let carried = 0;
    const slabs = base.slabs.map((slab, i) => {
      const fixed = typeof slab.fixed === 'number' ? slab.fixed : carried;
      if (slab.upTo !== null) carried = fixed + slab.rate * (slab.upTo - slab.over);
      return { index: i, over: slab.over, upTo: slab.upTo, rate: slab.rate, fixed };
    });
    return {
      slabs,
      standardDeduction: base.standardDeduction !== undefined ? base.standardDeduction : (dataset.standardDeduction || 0)
    };
  }

  function findSlab(slabs, taxable) {
    for (let i = 0; i < slabs.length; i++) {
      if (slabs[i].upTo === null || taxable <= slabs[i].upTo) return slabs[i];
    }
    return slabs[slabs.length - 1];
  }

  function slabTax(slabs, taxable) {
    const slab = findSlab(slabs, taxable);
    return taxable > slab.over ? slab.fixed + slab.rate * (taxable - slab.over) : slab.fixed;
  }

  function personalAllowance(dataset, income) {
    const pa = dataset.personalAllowance;
    if (!pa) return 0;
    if (pa.taperAbove === undefined || income <= pa.taperAbove) return pa.amount;
    return Math.max(0, pa.amount - (income - pa.taperAbove) * pa.taperRate);
  }

  function rebateFor(dataset, taxable, tax) {
    const r = dataset.rebate;
    if (!r) return 0;
    if (taxable <= r.upToIncome) return Math.min(tax, r.maxAmount);
    // Marginal relief: tax may not exceed the income above the rebate limit
    if (r.marginalRelief) return Math.max(0, tax - (taxable - r.upToIncome));
    return 0;
  }

  /** Tax after rebate, before surcharge and cess, for a given taxable income. */
  function taxBeforeSurcharge(dataset, slabs, taxable) {
    const tax = slabTax(slabs, taxable);
    return tax - rebateFor(dataset, taxable, tax);
  }

  function surchargeFor(dataset, slabs, taxable, tax) {
    const s = dataset.surcharge;
    if (!s || !s.tiers || !s.tiers.length) return 0;
    const tierIndex = s.tiers.reduce((found, tier, i) => (taxable > tier.incomeAbove ? i : found), -1);
    if (tierIndex < 0) return 0;
    const tier = s.tiers[tierIndex];
    const surcharge = tax * tier.rate;
    if (!s.marginalRelief) return surcharge;
    // Marginal relief: tax plus surcharge may not exceed the tax plus surcharge at the threshold
    // by more than the income above the threshold
    const atThreshold = taxBeforeSurcharge(dataset, slabs, tier.incomeAbove);
    const prevRate = tierIndex > 0 ? s.tiers[tierIndex - 1].rate : 0;
    const ceiling = atThreshold * (1 + prevRate) + (taxable - tier.incomeAbove);
    return Math.max(0, Math.min(surcharge, ceiling - tax));
  }

  /**
   * Annual income tax on an annual gross salary.
   * Returns exact amounts (not rounded); format for display only.
   */
  function calculate(dataset, annualIncome, options) {
    const income = Number(annualIncome);
    if (!isFinite(income) || income < 0) throw new Error(T('engine.errors.salaryMin'));
    const opts = options || {};
    const { slabs, standardDeduction } = resolve(dataset, opts.status);

    const deductions = [];
    if (standardDeduction) deductions.push({ id: 'standard', label: dataset.standardDeductionLabel || T('engine.standardDeduction'), amount: Math.min(income, standardDeduction) });
    const afterStandard = income - (deductions[0] ? deductions[0].amount : 0);
    const allowance = personalAllowance(dataset, income);
    if (dataset.personalAllowance) deductions.push({ id: 'allowance', label: dataset.personalAllowance.label || T('engine.personalAllowance'), amount: Math.min(afterStandard, allowance) });

    const taxable = Math.max(0, income - deductions.reduce((sum, d) => sum + d.amount, 0));
    const slab = findSlab(slabs, taxable);
    const grossTax = slabTax(slabs, taxable);
    const rebate = rebateFor(dataset, taxable, grossTax);
    const taxAfterRebate = grossTax - rebate;
    const surcharge = surchargeFor(dataset, slabs, taxable, taxAfterRebate);
    const cess = dataset.cess ? (taxAfterRebate + surcharge) * dataset.cess.rate : 0;
    const annualTax = taxAfterRebate + surcharge + cess;

    return {
      annualIncome: income,
      deductions,
      taxableIncome: taxable,
      slabs,
      slab,
      slabIndex: slab.index,
      marginalRate: slab.rate,
      grossTax,
      rebate,
      surcharge,
      cess,
      annualTax,
      effectiveRate: income > 0 ? (annualTax / income) * 100 : 0,
      annualTakeHome: income - annualTax
    };
  }

  /** Same as calculate(), for an amount entered per month or per year. */
  function calculateSalary(dataset, amount, period, options) {
    const value = Number(amount);
    if (!isFinite(value) || value < 0) throw new Error(T('engine.errors.salaryMin'));
    if (period !== 'monthly' && period !== 'annual') throw new Error(T('engine.errors.period'));
    const annual = period === 'monthly' ? value * 12 : value;
    const result = calculate(dataset, annual, options);
    return {
      ...result,
      period,
      monthlyIncome: annual / 12,
      monthlyTax: result.annualTax / 12,
      monthlyTakeHome: result.annualTakeHome / 12
    };
  }

  return { resolve, calculate, calculateSalary, slabTax };
});
