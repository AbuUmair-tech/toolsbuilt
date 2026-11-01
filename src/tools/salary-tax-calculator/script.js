/**
 * Salary Tax Calculator hub UI Controller
 * Preselects the visitor's country (saved choice, time zone, browser language; no network),
 * highlights its calculator, and opens it. Without JavaScript the plain list of links works.
 */
document.addEventListener('DOMContentLoaded', () => {
  const T = ToolsBuilt.scope('salary-tax-calculator');
  const form = document.getElementById('country-picker-form');
  const select = document.getElementById('hub-country');
  const note = document.getElementById('hub-country-note');
  const targets = (() => {
    try { return JSON.parse(document.getElementById('hub-countries').textContent); } catch (e) { return []; }
  })();
  if (!form || !select || !targets.length) return;

  form.hidden = false;
  const targetFor = (code) => targets.find(t => t.code === code);

  function show(code) {
    document.querySelectorAll('#country-list a[data-country]').forEach(a => {
      a.classList.toggle('is-suggested', a.dataset.country === code);
    });
    const target = targetFor(code);
    note.textContent = target && target.noTax ? T('hub.noTaxNote', { name: target.name }) : '';
  }

  const guess = ToolsBuilt.guessCountry();
  if (guess && targetFor(guess.code)) select.value = guess.code;
  show(select.value);

  select.addEventListener('change', () => show(select.value));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const target = targetFor(select.value);
    if (target) window.location.href = target.url;
  });
});
