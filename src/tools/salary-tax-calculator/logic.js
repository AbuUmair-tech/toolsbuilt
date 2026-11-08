/**
 * Salary Tax Engine
 * Pure, DOM-free income tax and take-home pay on a salary, driven entirely by a country dataset
 * (src/_data/tax/<cc>-<taxyear>.json) or by custom rates the visitor enters. No rates and no
 * country names live in this file: adding a country or tax year only needs a new data file.
 *
 * Dataset shape (every block except `slabs` is optional):
 *   slabs:              [{ over, upTo|null, rate, fixed? }]  tax = fixed + rate × (taxable − over);
 *                       when `fixed` is missing it is the full tax of the slabs below
 *   statuses:           { <id>: { label, ...any block below } }  one choice that swaps rules, e.g.
 *                       US filing status, UK region, India tax regime. A status's blocks replace
 *                       the dataset's own blocks of the same name.
 *   standardDeduction:  amount taken off gross salary before the slabs
 *   personalAllowance:  { amount, taperAbove, taperRate }  allowance falls by taperRate per unit
 *                       of income above taperAbove (UK: £1 for every £2 over £100,000)
 *   rebate:             { upToIncome, maxAmount, marginalRelief }  tax rebate when taxable income
 *                       is at most upToIncome; with marginal relief, tax above that limit never
 *                       exceeds the income above it (India, section 87A)
 *   surcharge:          { tiers: [{ incomeAbove, rate }], marginalRelief }  a share of the tax
 *   cess:               { rate }  a share of tax plus surcharge (India, health & education cess)
 *   options:            [{ id, type: select|checkbox|percent|amount, default, choices?, max?,
 *                       deduction?: { fromPay } }]  extra inputs shown only for this country.
 *                       `deduction` options are taken off income before tax (a pension % of
 *                       gross, India 80C up to `max`); with fromPay they also reduce take-home pay.
 *   contributions:      [{ id, label, base: gross|incomeTax, bands: [{ over, upTo|null, rate }],
 *                       bandsByStatus?, when?: { option, is } }]  social security and other levies
 *                       on pay (UK National Insurance, US FICA, student loans), each on its own bands
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

  const WEEKS_PER_YEAR = 52;
  const PERIODS = ['monthly', 'annual', 'weekly', 'hourly'];

  /** The dataset with one status's blocks applied (statusId says which). */
  function variant(dataset, status) {
    if (!dataset || typeof dataset !== 'object') throw new Error(T('engine.errors.noData'));
    if (!dataset.statuses) return dataset;
    const id = status || dataset.defaultStatus || Object.keys(dataset.statuses)[0];
    const chosen = dataset.statuses[id];
    if (!chosen) throw new Error(T('engine.errors.unknownStatus', { status }));
    const { label, ...blocks } = chosen;
    return { ...dataset, ...blocks, statusId: id };
  }

  /** Slabs with every fixed amount filled in. */
  function resolveSlabs(rawSlabs) {
    let carried = 0;
    return rawSlabs.map((slab, i) => {
      const fixed = typeof slab.fixed === 'number' ? slab.fixed : carried;
      if (slab.upTo !== null) carried = fixed + slab.rate * (slab.upTo - slab.over);
      return { index: i, over: slab.over, upTo: slab.upTo, rate: slab.rate, fixed };
    });
  }

  /** Resolves a dataset (and filing status, if any) into slabs with every fixed amount filled in. */
  function resolve(dataset, status) {
    const d = variant(dataset, status);
    return { slabs: resolveSlabs(d.slabs), standardDeduction: d.standardDeduction || 0 };
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

  function personalAllowance(d, income) {
    const pa = d.personalAllowance;
    if (!pa) return 0;
    if (pa.taperAbove === undefined || income <= pa.taperAbove) return pa.amount;
    return Math.max(0, pa.amount - (income - pa.taperAbove) * pa.taperRate);
  }

  function rebateFor(d, taxable, tax) {
    const r = d.rebate;
    if (!r) return 0;
    if (taxable <= r.upToIncome) return Math.min(tax, r.maxAmount);
    // Marginal relief: tax may not exceed the income above the rebate limit
    if (r.marginalRelief) return Math.max(0, tax - (taxable - r.upToIncome));
    return 0;
  }

  /** Tax after rebate, before surcharge and cess, for a given taxable income. */
  function taxBeforeSurcharge(d, slabs, taxable) {
    const tax = slabTax(slabs, taxable);
    return tax - rebateFor(d, taxable, tax);
  }

  function surchargeFor(d, slabs, taxable, tax) {
    const s = d.surcharge;
    if (!s || !s.tiers || !s.tiers.length) return 0;
    const tierIndex = s.tiers.reduce((found, tier, i) => (taxable > tier.incomeAbove ? i : found), -1);
    if (tierIndex < 0) return 0;
    const tier = s.tiers[tierIndex];
    const surcharge = tax * tier.rate;
    if (!s.marginalRelief) return surcharge;
    // Marginal relief: tax plus surcharge may not exceed the tax plus surcharge at the threshold
    // by more than the income above the threshold
    const atThreshold = taxBeforeSurcharge(d, slabs, tier.incomeAbove);
    const prevRate = tierIndex > 0 ? s.tiers[tierIndex - 1].rate : 0;
    const ceiling = atThreshold * (1 + prevRate) + (taxable - tier.incomeAbove);
    return Math.max(0, Math.min(surcharge, ceiling - tax));
  }

  /**
   * Annual income tax on an annual gross salary.
   * options.status picks a status; options.deductions ([{ id, label?, amount }]) are taken off
   * income before the standard deduction and allowance (pension, India 80C/80D, ...).
   * Returns exact amounts (not rounded); format for display only.
   */
  function calculate(dataset, annualIncome, options) {
    const income = Number(annualIncome);
    if (!isFinite(income) || income < 0) throw new Error(T('engine.errors.salaryMin'));
    const opts = options || {};
    const d = variant(dataset, opts.status);
    const slabs = resolveSlabs(d.slabs);

    const deductions = [];
    let remaining = income;
    const take = (item) => {
      const amount = Math.max(0, Math.min(remaining, Number(item.amount) || 0));
      remaining -= amount;
      deductions.push({ ...item, amount });
    };
    (opts.deductions || []).filter(x => Number(x.amount) > 0).forEach(take);
    // Adjusted net income: the allowance taper looks at income after pension-style deductions
    const adjustedIncome = remaining;
    if (d.standardDeduction) take({ id: 'standard', label: d.standardDeductionLabel || T('engine.standardDeduction'), amount: d.standardDeduction });
    if (d.personalAllowance) take({ id: 'allowance', label: d.personalAllowance.label || T('engine.personalAllowance'), amount: personalAllowance(d, adjustedIncome) });

    const taxable = Math.max(0, remaining);
    const slab = findSlab(slabs, taxable);
    const grossTax = slabTax(slabs, taxable);
    const rebate = rebateFor(d, taxable, grossTax);
    const taxAfterRebate = grossTax - rebate;
    const surcharge = surchargeFor(d, slabs, taxable, taxAfterRebate);
    const cess = d.cess ? (taxAfterRebate + surcharge) * d.cess.rate : 0;
    const annualTax = taxAfterRebate + surcharge + cess;

    return {
      annualIncome: income,
      status: d.statusId,
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

  /** Annual salary from an amount per month, year, week or hour (hours per week, 52 weeks). */
  function toAnnual(amount, period, hoursPerWeek) {
    const value = Number(amount);
    if (!isFinite(value) || value < 0) throw new Error(T('engine.errors.salaryMin'));
    if (!PERIODS.includes(period)) throw new Error(T('engine.errors.period'));
    if (period === 'monthly') return value * 12;
    if (period === 'weekly') return value * WEEKS_PER_YEAR;
    if (period === 'hourly') {
      const hours = Number(hoursPerWeek);
      if (!isFinite(hours) || hours <= 0 || hours > 168) throw new Error(T('engine.errors.hours'));
      return value * hours * WEEKS_PER_YEAR;
    }
    return value;
  }

  /** Amount due on progressive bands of a base (contributions use the same band shape as slabs). */
  function bandsAmount(bands, base) {
    return bands.reduce((sum, b) => {
      const top = b.upTo === null || b.upTo === undefined ? base : Math.min(base, b.upTo);
      return sum + Math.max(0, top - b.over) * b.rate;
    }, 0);
  }

  /** Option values for a dataset variant: its defaults, overridden by the visitor's choices. */
  function optionValues(d, chosen) {
    const values = {};
    (d.options || []).forEach(o => {
      const v = chosen && chosen[o.id] !== undefined && chosen[o.id] !== '' ? chosen[o.id] : o.default;
      if (o.type === 'checkbox') values[o.id] = v === true || v === 'true' || v === '1' || v === 1;
      else if (o.type === 'percent' || o.type === 'amount') {
        const n = Number(v);
        values[o.id] = isFinite(n) && n > 0 ? n : 0;
      } else values[o.id] = o.choices && o.choices.includes(v) ? v : o.default;
    });
    return values;
  }

  function deductionsFrom(d, values, gross) {
    return (d.options || []).filter(o => o.deduction).map(o => {
      let amount = o.type === 'percent' ? gross * Math.min(values[o.id], 100) / 100 : values[o.id];
      if (typeof o.max === 'number') amount = Math.min(amount, o.max);
      return { id: o.id, label: o.label, amount, fromPay: !!o.deduction.fromPay };
    }).filter(x => x.amount > 0);
  }

  function applies(c, values) {
    if (!c.when) return true;
    return values[c.when.option] === c.when.is;
  }

  // Income tax and contributions (not pension savings) on one annual gross salary
  function payCore(dataset, gross, status, chosen) {
    const d = variant(dataset, status);
    const values = optionValues(d, chosen);
    const deductions = deductionsFrom(d, values, gross);
    const tax = calculate(dataset, gross, { status: d.statusId, deductions });
    const contributions = (d.contributions || []).filter(c => applies(c, values)).map(c => {
      const bands = (c.bandsByStatus && c.bandsByStatus[d.statusId]) || c.bands;
      const base = c.base === 'incomeTax' ? tax.annualTax : gross;
      return { id: c.id, label: c.label, base: c.base || 'gross', amount: bandsAmount(bands, base) };
    });
    const taxes = tax.annualTax + contributions.reduce((s, c) => s + c.amount, 0);
    return { d, values, deductions, tax, contributions, taxes };
  }

  /**
   * Full take-home pay breakdown.
   * input: { amount, period: monthly|annual|weekly|hourly, hoursPerWeek, status, options: { <id>: value } }
   * Returns annual amounts plus monthly and weekly views of every line, effective and marginal rates,
   * and the bracket-by-bracket income tax.
   */
  function calculatePay(dataset, input) {
    const inp = input || {};
    const gross = toAnnual(inp.amount, inp.period || 'annual', inp.hoursPerWeek);
    const core = payCore(dataset, gross, inp.status, inp.options);
    const { tax, contributions, deductions } = core;
    const fromPay = deductions.filter(x => x.fromPay);

    const lines = [{ id: 'incomeTax', kind: 'tax', amount: tax.annualTax }]
      .concat(contributions.map(c => ({ id: c.id, label: c.label, kind: 'contribution', amount: c.amount })))
      .concat(fromPay.map(x => ({ id: x.id, label: x.label, kind: 'saving', amount: x.amount })));
    const totalTaxes = core.taxes;
    const totalDeducted = lines.reduce((s, l) => s + l.amount, 0);
    const net = gross - totalDeducted;

    // Marginal rate: tax and contributions on one more unit of annual salary
    const step = 1;
    const next = payCore(dataset, gross + step, inp.status, inp.options).taxes;
    const marginalRate = ((next - totalTaxes) / step) * 100;

    const bands = tax.slabs.map(s => {
      const top = s.upTo === null ? Math.max(tax.taxableIncome, s.over) : s.upTo;
      const inBand = Math.max(0, Math.min(tax.taxableIncome, top) - s.over);
      return { index: s.index, over: s.over, upTo: s.upTo, rate: s.rate, amount: inBand, tax: inBand * s.rate };
    });

    const views = (annual) => ({ annual, monthly: annual / 12, weekly: annual / WEEKS_PER_YEAR });
    return {
      gross,
      status: tax.status,
      options: core.values,
      deductions: tax.deductions,
      taxableIncome: tax.taxableIncome,
      incomeTax: tax,
      contributions,
      lines: lines.map(l => ({ ...l, ...views(l.amount) })),
      totalTaxes,
      totalDeducted,
      net,
      views: { gross: views(gross), totalTaxes: views(totalTaxes), totalDeducted: views(totalDeducted), net: views(net) },
      effectiveRate: gross > 0 ? (totalTaxes / gross) * 100 : 0,
      incomeTaxRate: gross > 0 ? (tax.annualTax / gross) * 100 : 0,
      marginalRate,
      bandRate: tax.marginalRate,
      bands
    };
  }

  /**
   * A dataset from custom rates (countries without built-in rules).
   * settings: { currency, brackets: [{ from, to, rate }] (rate in %), allowance, deduction,
   *             social (% of gross), socialCap (gross above which no social contribution),
   *             pension (% of gross, before tax), levies: [{ label, rate (%), base: gross|incomeTax }] }
   * Brackets are sorted; a gap between brackets (or below the first one, or above a last bracket
   * that has an upper limit) is taxed at 0%. Overlapping brackets are an error.
   */
  function customDataset(settings) {
    const s = settings || {};
    const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
    const rows = (s.brackets || [])
      .map(b => ({ from: num(b.from), to: num(b.to), rate: num(b.rate) }))
      .filter(b => !(isNaN(b.from) && isNaN(b.to) && isNaN(b.rate)));
    if (!rows.length) throw new Error(T('engine.errors.customNoBrackets'));
    rows.forEach((b, i) => {
      if (isNaN(b.from)) b.from = i === 0 ? 0 : NaN;
      if (!isFinite(b.from) || b.from < 0) throw new Error(T('engine.errors.customFrom', { row: i + 1 }));
      if (!isFinite(b.rate) || b.rate < 0 || b.rate > 100) throw new Error(T('engine.errors.customRate', { row: i + 1 }));
      if (!isNaN(b.to) && b.to <= b.from) throw new Error(T('engine.errors.customTo', { row: i + 1 }));
    });
    rows.sort((a, b) => a.from - b.from);

    const slabs = [];
    let cursor = 0;
    rows.forEach((b, i) => {
      if (b.from < cursor) throw new Error(T('engine.errors.customOverlap', { row: i + 1 }));
      if (b.from > cursor) slabs.push({ over: cursor, upTo: b.from, rate: 0 });
      const nextFrom = i + 1 < rows.length ? rows[i + 1].from : null;
      let upTo = isNaN(b.to) ? nextFrom : b.to;
      if (nextFrom !== null && upTo > nextFrom) throw new Error(T('engine.errors.customOverlap', { row: i + 2 }));
      slabs.push({ over: b.from, upTo, rate: b.rate / 100 });
      cursor = upTo;
    });
    if (slabs[slabs.length - 1].upTo !== null) slabs.push({ over: cursor, upTo: null, rate: 0 });

    const amount = (v) => { const n = num(v); return isFinite(n) && n > 0 ? n : 0; };
    const pct = (v) => Math.min(100, amount(v)) / 100;
    const dataset = { country: s.country || 'XX', taxYear: 'custom', custom: true, currency: s.currency || 'USD', slabs, contributions: [] };
    if (amount(s.allowance)) dataset.personalAllowance = { amount: amount(s.allowance) };
    if (amount(s.deduction)) dataset.standardDeduction = amount(s.deduction);
    if (amount(s.pension)) {
      dataset.options = [{ id: 'pension', type: 'percent', default: amount(s.pension), deduction: { fromPay: true } }];
    }
    if (amount(s.social)) {
      dataset.contributions.push({ id: 'social', base: 'gross', bands: [{ over: 0, upTo: amount(s.socialCap) || null, rate: pct(s.social) }] });
    }
    (s.levies || []).forEach((l, i) => {
      if (!amount(l.rate)) return;
      dataset.contributions.push({
        id: `levy${i + 1}`, label: String(l.label || '').slice(0, 60),
        base: l.base === 'incomeTax' ? 'incomeTax' : 'gross',
        bands: [{ over: 0, upTo: null, rate: pct(l.rate) }]
      });
    });
    return dataset;
  }

  /** Custom settings that start from a built-in dataset's brackets, allowance and deduction. */
  function customFromDataset(dataset, status) {
    const d = variant(dataset, status);
    return {
      currency: dataset.currency,
      brackets: resolveSlabs(d.slabs).map(sl => ({ from: sl.over, to: sl.upTo === null ? '' : sl.upTo, rate: Number((sl.rate * 100).toFixed(4)) })),
      allowance: d.personalAllowance ? d.personalAllowance.amount : '',
      deduction: d.standardDeduction || '',
      social: '', socialCap: '', pension: '', levies: []
    };
  }

  /** Compact text form of custom settings for a shareable URL, and back. */
  function encodeCustom(s) {
    const enc = (v) => encodeURIComponent(v === undefined || v === null ? '' : String(v))
      .replace(/[~*!_]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    const brackets = (s.brackets || []).map(b => [b.from, b.to, b.rate].map(enc).join('_')).join('*');
    const levies = (s.levies || []).map(l => [l.label, l.rate, l.base === 'incomeTax' ? 't' : 'g'].map(enc).join('_')).join('*');
    return ['v1', enc(s.currency), brackets, enc(s.allowance), enc(s.deduction), enc(s.social), enc(s.socialCap), enc(s.pension), levies].join('~');
  }

  function decodeCustom(text) {
    const parts = String(text || '').split('~');
    if (parts[0] !== 'v1' || parts.length < 9) return null;
    const dec = (v) => { try { return decodeURIComponent(v || ''); } catch (e) { return ''; } };
    const list = (v) => (v ? v.split('*').map(item => item.split('_').map(dec)) : []);
    const currency = dec(parts[1]).toUpperCase();
    return {
      currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
      brackets: list(parts[2]).map(([from, to, rate]) => ({ from, to, rate })),
      allowance: dec(parts[3]), deduction: dec(parts[4]), social: dec(parts[5]), socialCap: dec(parts[6]), pension: dec(parts[7]),
      levies: list(parts[8]).map(([label, rate, base]) => ({ label, rate, base: base === 't' ? 'incomeTax' : 'gross' }))
    };
  }

  /** Starting points for custom rates: amounts scale with a typical annual salary in that currency. */
  function customTemplate(kind, currency, typicalAnnual) {
    const unit = Math.max(1, Number(typicalAnnual) || 50000);
    const round = (n) => {
      const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1));
      return Math.round(n / mag) * mag;
    };
    const base = { currency, allowance: '', deduction: '', social: '', socialCap: '', pension: '', levies: [] };
    if (kind === 'flat') return { ...base, brackets: [{ from: 0, to: '', rate: 15 }] };
    return {
      ...base,
      brackets: [
        { from: 0, to: round(unit * 0.25), rate: 0 },
        { from: round(unit * 0.25), to: round(unit * 0.8), rate: 10 },
        { from: round(unit * 0.8), to: round(unit * 2), rate: 20 },
        { from: round(unit * 2), to: '', rate: 30 }
      ]
    };
  }

  return {
    WEEKS_PER_YEAR, PERIODS,
    variant, resolve, calculate, calculateSalary, slabTax,
    toAnnual, calculatePay, optionValues,
    customDataset, customFromDataset, customTemplate, encodeCustom, decodeCustom
  };
});
