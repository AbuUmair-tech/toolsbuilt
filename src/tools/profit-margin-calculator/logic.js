/**
 * Profit Margin & Markup Calculator Core Logic
 * Pure, DOM-free functions. Margin is profit as a share of the selling price;
 * markup is profit as a share of the cost.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ProfitMarginLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Messages come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('profit-margin-calculator')
    : require('../../../scripts/i18n-client.js').scope('profit-margin-calculator');

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  const round = (n, dp = 2) => {
    const f = Math.pow(10, dp);
    return Math.round((n + Math.sign(n) * Number.EPSILON) * f) / f;
  };

  function readCost(cost) {
    if (isBlank(cost)) return { error: T('errors.costEmpty'), field: 'cost' };
    const c = Number(cost);
    if (!Number.isFinite(c) || c < 0) return { error: T('errors.costInvalid'), field: 'cost' };
    return { value: c };
  }

  /** Markup % for a margin %: m / (1 − m) */
  function marginToMarkup(marginPercent) {
    const m = Number(marginPercent) / 100;
    if (!(m < 1)) return null;
    return round(m / (1 - m) * 100, 4);
  }

  /** Margin % for a markup %: k / (1 + k) */
  function markupToMargin(markupPercent) {
    const k = Number(markupPercent) / 100;
    if (!(k > -1)) return null;
    return round(k / (1 + k) * 100, 4);
  }

  function summary(cost, price) {
    const profit = price - cost;
    return {
      cost: round(cost),
      price: round(price),
      profit: round(profit),
      marginPercent: price > 0 ? round(profit / price * 100, 2) : null,
      markupPercent: cost > 0 ? round(profit / cost * 100, 2) : null,
      isLoss: profit < 0
    };
  }

  /** Cost and selling price -> profit, margin and markup. */
  function fromCostAndPrice(cost, price) {
    const c = readCost(cost);
    if (c.error) return c;
    if (isBlank(price)) return { error: T('errors.priceEmpty'), field: 'price' };
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return { error: T('errors.priceInvalid'), field: 'price' };
    return Object.assign({ mode: 'cost-price' }, summary(c.value, p));
  }

  /** Cost and target margin % -> selling price: cost ÷ (1 − margin). */
  function priceFromMargin(cost, marginPercent) {
    const c = readCost(cost);
    if (c.error) return c;
    if (isBlank(marginPercent)) return { error: T('errors.marginEmpty'), field: 'margin' };
    const m = Number(marginPercent);
    if (!Number.isFinite(m)) return { error: T('errors.marginInvalid'), field: 'margin' };
    if (m >= 100) return { error: T('errors.marginMax'), field: 'margin' };
    const price = c.value / (1 - m / 100);
    return Object.assign({ mode: 'margin', targetMargin: m, equivalentMarkup: marginToMarkup(m) }, summary(c.value, price));
  }

  /** Cost and markup % -> selling price: cost × (1 + markup). */
  function priceFromMarkup(cost, markupPercent) {
    const c = readCost(cost);
    if (c.error) return c;
    if (isBlank(markupPercent)) return { error: T('errors.markupEmpty'), field: 'markup' };
    const k = Number(markupPercent);
    if (!Number.isFinite(k)) return { error: T('errors.markupInvalid'), field: 'markup' };
    if (k <= -100) return { error: T('errors.markupMin'), field: 'markup' };
    const price = c.value * (1 + k / 100);
    return Object.assign({ mode: 'markup', targetMarkup: k, equivalentMargin: markupToMargin(k) }, summary(c.value, price));
  }

  return { fromCostAndPrice, priceFromMargin, priceFromMarkup, marginToMarkup, markupToMargin };
});
