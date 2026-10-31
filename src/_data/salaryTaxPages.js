// One salary tax page per verified country dataset (src/_data/tax/<cc>-<taxyear>.json with
// current: true and a `page` block). Pakistan has its own page at its original URL.
const fs = require('fs');
const path = require('path');

const TAX_DIR = path.join(__dirname, 'tax');
const countries = require('./countries.json');

module.exports = function () {
  const datasets = fs.readdirSync(TAX_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(TAX_DIR, f), 'utf8')));

  return datasets
    .filter(d => d.current && d.page && d.country !== 'PK')
    .map(d => {
      const country = countries.find(c => c.code === d.country) || {};
      // One rate table per filing status, or a single table
      const tables = d.statuses
        ? Object.entries(d.statuses).map(([id, st]) => ({ id, title: st.label, slabs: st.slabs }))
        : [{ id: 'all', title: '', slabs: d.slabs }];
      // What the page's script needs: the rates plus a few page defaults, not the page text
      const { page, sources, notes, officialExamples, ...rates } = d;
      const engineData = {
        ...rates,
        countryName: country.name,
        page: { slug: page.slug, defaultSalary: page.defaultSalary, defaultPeriod: page.defaultPeriod }
      };
      return { ...d, tables, engineData, countryName: country.name, locale: country.locale, lakhGrouping: !!country.lakhGrouping };
    })
    .sort((a, b) => a.countryName.localeCompare(b.countryName));
};
