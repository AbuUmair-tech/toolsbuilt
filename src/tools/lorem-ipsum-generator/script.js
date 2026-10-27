/**
 * Lorem Ipsum Generator UI Controller
 * Client-side script handling generation, units (paragraphs, sentences, words),
 * "start with Lorem ipsum" toggle, copy, and live stats.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.LoremIpsumLogic;
  if (!logic) return;

  const countInput = document.getElementById('count-input');
  const unitRadios = document.querySelectorAll('input[name="lorem-unit"]');
  const startLoremToggle = document.getElementById('start-lorem-toggle');
  const htmlTagsToggle = document.getElementById('html-tags-toggle');
  const generateBtn = document.getElementById('generate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const clearBtn = document.getElementById('clear-btn');
  const loremOutput = document.getElementById('lorem-output');
  const statsDisplay = document.getElementById('lorem-stats');

  let debounceTimer = null;

  function getUnit() {
    const checked = document.querySelector('input[name="lorem-unit"]:checked');
    return checked ? checked.value : 'paragraphs';
  }

  function getCount() {
    const val = parseInt(countInput.value, 10);
    const unit = getUnit();
    if (isNaN(val) || val < 1) return 1;
    if (unit === 'paragraphs') return Math.min(val, 50);
    if (unit === 'sentences') return Math.min(val, 200);
    if (unit === 'words') return Math.min(val, 2000);
    return Math.min(val, 50);
  }

  function updateCountBounds() {
    const unit = getUnit();
    if (unit === 'paragraphs') {
      countInput.max = '50';
      if (parseInt(countInput.value, 10) > 50) countInput.value = '50';
    } else if (unit === 'sentences') {
      countInput.max = '200';
      if (parseInt(countInput.value, 10) > 200) countInput.value = '200';
    } else if (unit === 'words') {
      countInput.max = '2000';
      if (parseInt(countInput.value, 10) > 2000) countInput.value = '2000';
    }
  }

  function updateStats(stats) {
    if (!statsDisplay) return;
    const numFmt = new Intl.NumberFormat('en-US');
    statsDisplay.textContent = `${numFmt.format(stats.words)} words | ${numFmt.format(stats.characters)} characters | ${numFmt.format(stats.paragraphs)} paragraph${stats.paragraphs === 1 ? '' : 's'}`;
  }

  function runGeneration() {
    const unit = getUnit();
    const count = getCount();
    const startWithLorem = startLoremToggle ? startLoremToggle.checked : true;
    const asHtml = htmlTagsToggle ? htmlTagsToggle.checked : false;

    const res = logic.generate(unit, count, { startWithLorem, asHtml });
    if (res.success) {
      loremOutput.value = res.text;
      updateStats(res.stats);
    }
  }

  function handleInputDebounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runGeneration();
    }, 150);
  }

  // Event Listeners
  if (countInput) {
    countInput.addEventListener('input', handleInputDebounced);
    countInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runGeneration();
      }
    });
  }

  unitRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateCountBounds();
      runGeneration();
    });
  });

  if (startLoremToggle) {
    startLoremToggle.addEventListener('change', runGeneration);
  }

  if (htmlTagsToggle) {
    htmlTagsToggle.addEventListener('change', runGeneration);
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', runGeneration);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = loremOutput.value;
      if (!text) return;
      if (window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(text, 'Lorem ipsum copied to clipboard');
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      loremOutput.value = '';
      if (statsDisplay) statsDisplay.textContent = '0 words | 0 characters | 0 paragraphs';
      countInput.focus();
    });
  }

  // Initial generation
  runGeneration();
});
