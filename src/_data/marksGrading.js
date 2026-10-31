// Grade bands for the marks percentage page, read from the tool's logic module so the
// reference table on the page and the calculator always agree.
const logic = require('../tools/marks-percentage-calculator/logic.js');

module.exports = {
  note: logic.GRADING.note,
  rows: logic.GRADING.bands.map((band, index) => ({
    index,
    grade: band.grade,
    range: band.label || (band.max === null ? `${band.min}% and above` : `${band.min}% – ${band.max}%`)
  }))
};
