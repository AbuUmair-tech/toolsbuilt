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
    if (!Array.isArray(components)) return { error: 'Add at least one component.' };
    if (components.length > MAX_COMPONENTS) return { error: `Use at most ${MAX_COMPONENTS} components.` };

    const used = [];
    for (let i = 0; i < components.length; i++) {
      const c = components[i] || {};
      const filled = ['obtained', 'total', 'weight'].filter(k => !isBlank(c[k]));
      if (!filled.length) continue;
      const name = c.name && String(c.name).trim() ? String(c.name).trim() : `Component ${i + 1}`;
      for (const key of ['obtained', 'total', 'weight']) {
        if (isBlank(c[key])) {
          const label = { obtained: 'marks obtained', total: 'total marks', weight: 'weight' }[key];
          return { error: `${name}: enter the ${label}.`, rowIndex: i, field: key };
        }
      }
      const obtained = Number(c.obtained);
      const total = Number(c.total);
      const weight = Number(c.weight);
      if (!Number.isFinite(total) || total <= 0) return { error: `${name}: total marks must be more than 0.`, rowIndex: i, field: 'total' };
      if (!Number.isFinite(obtained) || obtained < 0) return { error: `${name}: marks obtained must be 0 or more.`, rowIndex: i, field: 'obtained' };
      if (obtained > total) return { error: `${name}: marks obtained (${obtained}) cannot be more than the total (${total}).`, rowIndex: i, field: 'obtained' };
      if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return { error: `${name}: the weight must be more than 0% and at most 100%.`, rowIndex: i, field: 'weight' };
      used.push({ index: i, name, obtained, total, weight });
    }

    if (!used.length) return { error: 'Enter marks and a weight for at least one component.' };

    const weightTotal = round(used.reduce((s, c) => s + c.weight, 0), 6);
    if (Math.abs(weightTotal - 100) > 1e-6) {
      const diff = round(100 - weightTotal, 4);
      return {
        error: `The weights add up to ${weightTotal}%, but they must total 100%. ${diff > 0 ? `Add ${diff}% more` : `Remove ${-diff}%`} to one or more components.`,
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
      steps: rows.map(r => `${r.name}: ${r.obtained} ÷ ${r.total} × 100 = ${round(r.percentage, 4)}%, × ${r.weight}% weight = ${round(r.contribution, 4)}`)
        .concat([`Aggregate = ${rows.map(r => round(r.contribution, 4)).join(' + ')} = ${round(aggregate, 4)} ≈ ${round(aggregate, 2).toFixed(2)}%`])
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
