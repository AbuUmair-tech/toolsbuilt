// Slab tables for the Pakistan salary tax page, read from the tool's own logic module so
// the table on the page and the calculator always use the same data.
const logic = require('../tools/pakistan-salary-tax-calculator/logic.js');

const formatRate = rate => `${Math.round(rate * 100)}%`;

function rows(taxYear) {
  return logic.getTable(taxYear).slabs.map((slab, index) => ({
    index,
    from: slab.over === 0 ? logic.formatPkr(0) : logic.formatPkr(slab.over + 1),
    to: slab.upTo === null ? null : logic.formatPkr(slab.upTo),
    fixed: slab.fixed,
    fixedText: logic.formatPkr(slab.fixed),
    over: logic.formatPkr(slab.over),
    rate: formatRate(slab.rate),
    isZero: slab.rate === 0
  }));
}

module.exports = {
  taxYear: logic.TAX_YEAR,
  previousTaxYear: logic.PREVIOUS_TAX_YEAR,
  current: rows(logic.TAX_YEAR),
  previous: rows(logic.PREVIOUS_TAX_YEAR),
  previousSurcharge: logic.getTable(logic.PREVIOUS_TAX_YEAR).surcharge
};
