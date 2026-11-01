/**
 * Merit & Aggregate Calculator Core Logic
 * Pure, DOM-free admission aggregate: each component's percentage
 * (obtained ÷ total) is multiplied by its weight, and the weights must total 100%.
 * Presets (institution weights) live in src/_data/meritPresets.json with their sources.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MeritLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // Messages and steps come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('merit-calculator')
    : require('../../../scripts/i18n-client.js').scope('merit-calculator');

  const MAX_COMPONENTS = 5;

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  const round = (n, dp) => {
    const f = Math.pow(10, dp);
    return Math.round((n + Number.EPSILON) * f) / f;
  };

  /**
   * @param {Array<{name?:string, obtained, total, weight}>} components - up to 5; fully empty rows are skipped
   */
  function calculateMerit(components) {
    if (!Array.isArray(components)) return { error: T('errors.addComponent') };
    if (components.length > MAX_COMPONENTS) return { error: T('errors.tooMany', { max: MAX_COMPONENTS }) };

    const used = [];
    for (let i = 0; i < components.length; i++) {
      const c = components[i] || {};
      const filled = ['obtained', 'total', 'weight'].filter(k => !isBlank(c[k]));
      if (!filled.length) continue;
      const name = c.name && String(c.name).trim() ? String(c.name).trim() : T('componentName', { n: i + 1 });
      for (const key of ['obtained', 'total', 'weight']) {
        if (isBlank(c[key])) {
          const message = { obtained: 'errors.enterObtained', total: 'errors.enterTotal', weight: 'errors.enterWeight' }[key];
          return { error: T(message, { name }), rowIndex: i, field: key };
        }
      }
      const obtained = Number(c.obtained);
      const total = Number(c.total);
      const weight = Number(c.weight);
      if (!Number.isFinite(total) || total <= 0) return { error: T('errors.totalPositive', { name }), rowIndex: i, field: 'total' };
      if (!Number.isFinite(obtained) || obtained < 0) return { error: T('errors.obtainedNonNegative', { name }), rowIndex: i, field: 'obtained' };
      if (obtained > total) return { error: T('errors.obtainedOverTotal', { name, obtained, total }), rowIndex: i, field: 'obtained' };
      if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return { error: T('errors.weightRange', { name }), rowIndex: i, field: 'weight' };
      used.push({ index: i, name, obtained, total, weight });
    }

    if (!used.length) return { error: T('errors.noComponents') };

    const weightTotal = round(used.reduce((s, c) => s + c.weight, 0), 6);
    if (Math.abs(weightTotal - 100) > 1e-6) {
      const diff = round(100 - weightTotal, 4);
      return {
        error: diff > 0 ? T('errors.weightsAddMore', { total: weightTotal, diff }) : T('errors.weightsRemove', { total: weightTotal, diff: -diff }),
        field: 'weight',
        rowIndex: used[used.length - 1].index,
        weightTotal
      };
    }

    const rows = used.map(c => {
      const percentage = c.obtained / c.total * 100;
      const contribution = percentage * c.weight / 100;
      return Object.assign({}, c, {
        percentage,
        contribution,
        percentageRounded: round(percentage, 2),
        contributionRounded: round(contribution, 4)
      });
    });
    const aggregate = rows.reduce((s, r) => s + r.contribution, 0);

    return {
      rows,
      weightTotal,
      aggregate,
      aggregateRounded: round(aggregate, 2),
      steps: rows.map(r => T('steps.component', { name: r.name, obtained: r.obtained, total: r.total, pct: round(r.percentage, 4), weight: r.weight, contribution: round(r.contribution, 4) }))
        .concat([T('steps.aggregate', { sum: rows.map(r => round(r.contribution, 4)).join(' + '), exact: round(aggregate, 4), rounded: round(aggregate, 2).toFixed(2) })])
    };
  }

  /** Checks a preset from meritPresets.json: weights total 100 and a source is recorded. */
  function validatePreset(preset) {
    if (!preset || !Array.isArray(preset.components) || !preset.components.length) return false;
    if (preset.components.length > MAX_COMPONENTS) return false;
    const total = preset.components.reduce((s, c) => s + Number(c.weight), 0);
    return Math.abs(total - 100) < 1e-9 && /^https:\/\//.test(preset.source || '') && /^\d{4}-\d{2}-\d{2}$/.test(preset.verifiedOn || '');
  }

  return { MAX_COMPONENTS, calculateMerit, validatePreset };
});
