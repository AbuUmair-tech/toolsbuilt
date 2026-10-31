// Weight conversion table for the gold calculator page, read from the tool's logic module
// so the table and the calculator use the same unit definitions.
const logic = require('../tools/gold-calculator/logic.js');

const trim = (n, digits) => Number(n.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });

module.exports = {
  rows: Object.entries(logic.WEIGHT_UNITS).map(([key, unit]) => {
    const w = logic.convertWeight(unit.grams);
    return {
      key,
      label: `1 ${unit.label.toLowerCase()}`,
      tola: trim(w.tola, 5),
      gram: trim(w.gram, 7),
      masha: trim(w.masha, 4),
      ratti: trim(w.ratti, 3)
    };
  })
};
