// Grade bands for the marks percentage page, read from the tool's logic module so the
// reference table on the page and the calculator always agree. The page writes the range
// text from translation data: `labelled` rows use the band's own label, `open` rows have no
// upper limit ("80% and above"), the rest are "min% – max%".
const logic = require('../tools/marks-percentage-calculator/logic.js');

module.exports = {
  rows: logic.GRADING.bands.map((band, index) => ({
    index,
    grade: band.grade,
    min: band.min,
    max: band.max,
    labelled: Boolean(band.label),
    open: !band.label && band.max === null
  }))
};
