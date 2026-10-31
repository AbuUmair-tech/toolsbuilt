/**
 * Mean, Median, Mode & Standard Deviation Calculator UI Controller
 * Powered by StatsLogic. Live statistics for pasted data, worked steps,
 * selectable decimal places and shareable links.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.StatsLogic;
  const form = document.getElementById('calculator-form');
  const dataInput = document.getElementById('data');
  const dpSelect = document.getElementById('dp');
  const resetBtn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const statsBox = document.getElementById('result-stats');
  const quartileNote = document.getElementById('quartile-note');
  const sortedText = document.getElementById('sorted-data');
  const stepLists = {
    mean: document.getElementById('steps-mean'),
    median: document.getElementById('steps-median'),
    sd: document.getElementById('steps-sd')
  };

  const DEFAULT_DATA = '2, 4, 4, 4, 5, 5, 7, 9';
  const MAX_SORTED_SHOWN = 200;
  let debounceTimer = null;

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    dataInput.removeAttribute('aria-invalid');
    dataInput.removeAttribute('aria-errormessage');
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
    dataInput.setAttribute('aria-invalid', 'true');
    dataInput.setAttribute('aria-errormessage', 'error-box');
  }

  function renderStats(stats) {
    statsBox.replaceChildren(...stats.map(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'result-stat-card';
      const l = document.createElement('div');
      l.className = 'result-stat-label';
      l.textContent = label;
      const v = document.createElement('div');
      v.className = 'result-stat-value';
      v.textContent = value;
      card.append(l, v);
      return card;
    }));
  }

  function renderSteps(list, steps) {
    list.replaceChildren(...steps.map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
  }

  function calculate() {
    clearError();
    const s = logic.analyse(dataInput.value);
    if (s.error) return showError(s.error);

    const dp = Number(dpSelect.value) || 4;
    const f = (v) => logic.fmt(v, dp);
    const modeText = s.modes.length
      ? `${s.modes.map(f).join(', ')} (appears ${s.modeFrequency} times)`
      : 'No mode';

    headerText.textContent = `Summary of ${s.count} value${s.count === 1 ? '' : 's'}`;
    primaryText.textContent = `Mean ${f(s.mean)} · Median ${f(s.median)} · ${s.modes.length ? `Mode ${s.modes.map(f).join(', ')}` : 'No mode'}`;

    const stats = [
      ['Count (n)', String(s.count)],
      ['Sum', f(s.sum)],
      ['Mean', f(s.mean)],
      ['Median', f(s.median)],
      [s.modes.length > 1 ? 'Modes' : 'Mode', modeText],
      ['Minimum', f(s.min)],
      ['Maximum', f(s.max)],
      ['Range', f(s.range)],
      ['Population SD (σ)', f(s.populationSD)],
      ['Sample SD (s)', s.sampleSD === null ? 'Needs 2+ values' : f(s.sampleSD)],
      ['Population variance (σ²)', f(s.populationVariance)],
      ['Sample variance (s²)', s.sampleVariance === null ? 'Needs 2+ values' : f(s.sampleVariance)],
      ['Q1 (lower quartile)', s.q1 === null ? 'Needs 2+ values' : f(s.q1)],
      ['Q3 (upper quartile)', s.q3 === null ? 'Needs 2+ values' : f(s.q3)],
      ['Interquartile range', s.iqr === null ? 'Needs 2+ values' : f(s.iqr)]
    ];
    renderStats(stats);
    quartileNote.textContent = `Quartile method: ${s.quartileMethod}`;

    const shown = s.sorted.slice(0, MAX_SORTED_SHOWN).map(f).join(', ');
    sortedText.textContent = s.sorted.length > MAX_SORTED_SHOWN ? `${shown}, … (${s.sorted.length - MAX_SORTED_SHOWN} more)` : shown;
    renderSteps(stepLists.mean, s.steps.mean);
    renderSteps(stepLists.median, s.steps.median);
    renderSteps(stepLists.sd, s.steps.sd);

    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = stats.map(([label, value]) => `${label}: ${value}`).join('\n');

    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  function debounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculate, 250);
  }

  dataInput.addEventListener('input', debounced);
  dpSelect.addEventListener('change', calculate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    calculate();
    if (dataInput.getAttribute('aria-invalid') === 'true') dataInput.focus();
  });

  resetBtn.addEventListener('click', () => {
    dataInput.value = DEFAULT_DATA;
    dpSelect.value = '4';
    calculate();
  });

  ToolsBuilt.resultLink.restore();
  calculate();
});
