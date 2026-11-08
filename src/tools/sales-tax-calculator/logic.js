/**
 * GST & Sales Tax Calculator Core Logic
 * Pure, DOM-free functions to add tax to a tax-exclusive price or remove it from a
 * tax-inclusive price.
 *
 * Add tax:    tax = net × rate, total = net + tax
 * Remove tax: net = gross ÷ (1 + rate), tax = gross − net
 * Amounts are rounded to 2 decimals so the net price and tax always add up to the total.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.SalesTaxLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Messages and labels come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('sales-tax-calculator')
    : require('../../../scripts/i18n-client.js').scope('sales-tax-calculator');
  const locale = (english) => (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.pageLocale) ? ToolsBuilt.pageLocale(english) : english;
  // An Error that names the input it is about (price | rate | quantity), so the page can mark it
  const fieldError = (key, field) => Object.assign(new Error(T(key)), { field });

  // Rate presets shown in the calculator; any other rate can be entered as custom
  const RATE_PRESETS = [
    { value: 18, label: T('presets.pk18') },
    { value: 5, label: '5%' },
    { value: 10, label: '10%' },
    { value: 15, label: '15%' }
  ];

  const CURRENCIES = {
    PKR: { symbol: 'Rs', label: 'PKR (Rs)' },
    INR: { symbol: '₹', label: 'INR (₹)' },
    AED: { symbol: 'AED', label: 'AED' },
    USD: { symbol: '$', label: 'USD ($)' },
    GBP: { symbol: '£', label: 'GBP (£)' },
    EUR: { symbol: '€', label: 'EUR (€)' }
  };

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  // field: price | rate | quantity (error key errors.<field>Required)
  function toNumber(value, field) {
    const n = typeof value === 'string' ? parseFloat(value.replace(/,/g, '').trim()) : Number(value);
    if (value === '' || value === null || value === undefined || !isFinite(n)) {
      throw fieldError(`errors.${field}Required`, field);
    }
    return n;
  }

  function checkInputs(priceValue, rateValue, quantityValue) {
    const price = toNumber(priceValue, 'price');
    const rate = toNumber(rateValue, 'rate');
    const quantity = quantityValue === '' || quantityValue === undefined || quantityValue === null ? 1 : toNumber(quantityValue, 'quantity');
    if (price < 0) throw fieldError('errors.priceNegative', 'price');
    if (rate < 0 || rate > 100) throw fieldError('errors.rateRange', 'rate');
    if (quantity <= 0) throw fieldError('errors.quantityPositive', 'quantity');
    return { price, rate, quantity };
  }

  /** Price excluding tax -> tax and total (for quantity items) */
  function addTax(priceValue, rateValue, quantityValue) {
    const { price, rate, quantity } = checkInputs(priceValue, rateValue, quantityValue);
    const net = round2(price * quantity);
    const tax = round2(net * rate / 100);
    return { mode: 'add', unitPrice: price, quantity, rate, net, tax, gross: round2(net + tax) };
  }

  /** Price including tax -> price before tax and the tax inside it (for quantity items) */
  function removeTax(priceValue, rateValue, quantityValue) {
    const { price, rate, quantity } = checkInputs(priceValue, rateValue, quantityValue);
    const gross = round2(price * quantity);
    const net = round2(gross / (1 + rate / 100));
    return { mode: 'remove', unitPrice: price, quantity, rate, net, tax: round2(gross - net), gross };
  }

  function formatMoney(amount, currency) {
    const c = CURRENCIES[currency] || CURRENCIES.PKR;
    const value = round2(Number(amount) || 0);
    const text = Math.abs(value).toLocaleString(locale('en-US'), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${value < 0 ? '-' : ''}${c.symbol} ${text}`;
  }

  return {
    RATE_PRESETS,
    CURRENCIES,
    addTax,
    removeTax,
    formatMoney,
    round2
  };
});
