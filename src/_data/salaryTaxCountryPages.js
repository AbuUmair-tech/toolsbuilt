// The salary tax country pages, for the links between them and the hub
// (partials/salary-tax-links.njk): Pakistan first (its own template at its original URL),
// then every country page built from a tax dataset (salaryTaxPages.js).
const salaryTaxPages = require('./salaryTaxPages.js');

module.exports = function () {
  return [{ code: 'PK', slug: 'pakistan-salary-tax-calculator' }]
    .concat(salaryTaxPages().map(p => ({ code: p.country, slug: p.page.slug })));
};
