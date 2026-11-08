/**
 * EXACT UNIT CONVERSION FACTORS (NIST SP 811 / BIPM SI)
 * Data object defined at top of script.js as specified.
 */
const UNIT_FACTORS = {
  length: {
    baseUnit: 'm',
    units: {
      'm': { factor: 1 },
      'km': { factor: 1000 },
      'cm': { factor: 0.01 },
      'mm': { factor: 0.001 },
      'mi': { factor: 1609.344 },
      'yd': { factor: 0.9144 },
      'ft': { factor: 0.3048 },
      'in': { factor: 0.0254 },
      'nmi': { factor: 1852 }
    }
  },
  weight: {
    baseUnit: 'kg',
    units: {
      'kg': { factor: 1 },
      'g': { factor: 0.001 },
      'mg': { factor: 0.000001 },
      't': { factor: 1000 },
      'lb': { factor: 0.45359237 },
      'oz': { factor: 0.028349523125 },
      'st': { factor: 6.35029318 },
      'ton': { factor: 907.18474 }
    }
  },
  temperature: {
    baseUnit: 'c',
    units: {
      'c': {},
      'f': {},
      'k': {}
    }
  },
  area: {
    baseUnit: 'sqm',
    units: {
      'sqm': { factor: 1 },
      'sqkm': { factor: 1000000 },
      'sqcm': { factor: 0.0001 },
      'sqmi': { factor: 2589988.110336 },
      'sqyd': { factor: 0.83612736 },
      'sqft': { factor: 0.09290304 },
      'sqin': { factor: 0.00064516 },
      'ha': { factor: 10000 },
      'ac': { factor: 4046.8564224 }
    }
  },
  volume: {
    baseUnit: 'l',
    units: {
      'l': { factor: 1 },
      'ml': { factor: 0.001 },
      'cum': { factor: 1000 },
      'gal': { factor: 3.785411784 },
      'qt': { factor: 0.946352946 },
      'pt': { factor: 0.473176473 },
      'cup': { factor: 0.2365882365 },
      'floz': { factor: 0.0295735295625 },
      'impgal': { factor: 4.54609 }
    }
  },
  speed: {
    baseUnit: 'mps',
    units: {
      'mps': { factor: 1 },
      'kph': { factor: 1 / 3.6 },
      'mph': { factor: 0.44704 },
      'kn': { factor: 1852 / 3600 },
      'fps': { factor: 0.3048 }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const T = ToolsBuilt.scope('unit-converter');

  // Display names come from the tool's translation data: categories.<category>, units.<category>.<id>
  Object.keys(UNIT_FACTORS).forEach(cat => {
    UNIT_FACTORS[cat].name = T(`categories.${cat}`);
    Object.keys(UNIT_FACTORS[cat].units).forEach(id => {
      UNIT_FACTORS[cat].units[id].name = T(`units.${cat}.${id}`);
    });
  });

  const logic = window.UnitConverterLogic || {
    convert: (cat, val, from, to) => {
      const v = parseFloat(val);
      if (cat === 'temperature') {
        let c = from === 'c' ? v : (from === 'f' ? (v - 32) * 5/9 : v - 273.15);
        let out = to === 'c' ? c : (to === 'f' ? c * 9/5 + 32 : c + 273.15);
        return Math.round(out * 10000) / 10000;
      }
      const uA = UNIT_FACTORS[cat].units[from].factor;
      const uB = UNIT_FACTORS[cat].units[to].factor;
      return Math.round((v * uA / uB) * 1e6) / 1e6;
    },
    getConversionTable: (cat, baseUnit, baseVal) => {
      const catUnits = UNIT_FACTORS[cat].units;
      return Object.keys(catUnits).map(k => ({
        unitKey: k,
        unitName: catUnits[k].name,
        value: logic ? logic.convert(cat, baseVal, baseUnit, k) : 0
      }));
    }
  };

  const categoryTabs = document.querySelectorAll('.category-tab-btn');
  const inputA = document.getElementById('unit-val-a');
  const inputB = document.getElementById('unit-val-b');
  const selectA = document.getElementById('unit-select-a');
  const selectB = document.getElementById('unit-select-b');
  const swapBtn = document.getElementById('swap-units-btn');
  const tableBody = document.getElementById('conversion-table-body');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const copyBtn = document.getElementById('copy-result-btn');

  let activeCategory = 'length';
  let lastResultText = '';
  let activeDirection = 'a_to_b'; // or 'b_to_a'

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    inputA.removeAttribute('aria-invalid');
    inputB.removeAttribute('aria-invalid');
  }

  function showError(msg, targetInput) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    if (targetInput) {
      targetInput.setAttribute('aria-invalid', 'true');
      targetInput.focus();
    }
  }

  function populateUnitSelects(category, defaultA, defaultB) {
    const units = UNIT_FACTORS[category].units;
    const keys = Object.keys(units);
    const selAKey = defaultA || keys[0];
    const selBKey = defaultB || (keys.length > 1 ? keys[1] : keys[0]);

    selectA.innerHTML = keys.map(k => `<option value="${k}" ${k === selAKey ? 'selected' : ''}>${units[k].name}</option>`).join('');
    selectB.innerHTML = keys.map(k => `<option value="${k}" ${k === selBKey ? 'selected' : ''}>${units[k].name}</option>`).join('');
  }

  function setCategory(cat) {
    activeCategory = cat;
    categoryTabs.forEach(btn => {
      const isCurrent = (btn.getAttribute('data-cat') === cat);
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    // Defaults per category
    let defA = 'm', defB = 'ft';
    if (cat === 'weight') { defA = 'kg'; defB = 'lb'; }
    else if (cat === 'temperature') { defA = 'c'; defB = 'f'; }
    else if (cat === 'area') { defA = 'sqm'; defB = 'sqft'; }
    else if (cat === 'volume') { defA = 'l'; defB = 'gal'; }
    else if (cat === 'speed') { defA = 'kph'; defB = 'mph'; }

    populateUnitSelects(cat, defA, defB);
    inputA.value = '1';
    activeDirection = 'a_to_b';
    convertFromA();
  }

  function convertFromA() {
    clearError();
    const valA = parseFloat(inputA.value);
    if (isNaN(valA)) {
      if (inputA.value === '') {
        inputB.value = '';
        renderTable();
        return;
      }
      showError(T('errors.numericValue'), inputA);
      return;
    }

    try {
      const uA = selectA.value;
      const uB = selectB.value;
      const res = logic.convert(activeCategory, valA, uA, uB);
      inputB.value = res;
      updateResults(valA, uA, res, uB);
      renderTable(valA, uA);
    } catch (e) {
      showError(e.message, inputA);
    }
  }

  function convertFromB() {
    clearError();
    const valB = parseFloat(inputB.value);
    if (isNaN(valB)) {
      if (inputB.value === '') {
        inputA.value = '';
        renderTable();
        return;
      }
      showError(T('errors.numericValue'), inputB);
      return;
    }

    try {
      const uA = selectA.value;
      const uB = selectB.value;
      const res = logic.convert(activeCategory, valB, uB, uA);
      inputA.value = res;
      updateResults(res, uA, valB, uB);
      renderTable(res, uA);
    } catch (e) {
      showError(e.message, inputB);
    }
  }

  function updateResults(valA, uA, valB, uB) {
    if (!resultBox) return;
    resultBox.classList.add('is-visible');

    const nameA = UNIT_FACTORS[activeCategory].units[uA].name;
    const nameB = UNIT_FACTORS[activeCategory].units[uB].name;
    const primaryEl = document.getElementById('result-primary-text');
    const headerEl = document.getElementById('result-header-text');
    const statsGrid = document.getElementById('result-stats-grid');
    const formulaBox = document.getElementById('formula-explanation');

    if (headerEl) headerEl.textContent = T('result.header', { category: UNIT_FACTORS[activeCategory].name });
    if (primaryEl) {
      primaryEl.textContent = T('result.primary', { valA, nameA, valB, nameB });
    }

    lastResultText = T('result.copy', { valA, nameA, valB, nameB });

    if (statsGrid) {
      const oneUnitEquiv = logic.convert(activeCategory, 1, uA, uB);
      const reverseEquiv = logic.convert(activeCategory, 1, uB, uA);
      statsGrid.innerHTML = `
        <div class="result-stat-card">
          <span class="stat-label">${T('result.quantity', { value: 1, unit: nameA })}</span>
          <span class="stat-value">${T('result.quantity', { value: oneUnitEquiv, unit: nameB })}</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">${T('result.quantity', { value: 1, unit: nameB })}</span>
          <span class="stat-value">${T('result.quantity', { value: reverseEquiv, unit: nameA })}</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">${T('stats.category')}</span>
          <span class="stat-value">${UNIT_FACTORS[activeCategory].name}</span>
        </div>
      `;
    }

    if (formulaBox) {
      if (activeCategory === 'temperature') {
        let tempFormula = '';
        if (uA === 'c' && uB === 'f') tempFormula = `(°C × 9/5) + 32 = °F`;
        else if (uA === 'f' && uB === 'c') tempFormula = `(°F - 32) × 5/9 = °C`;
        else if (uA === 'c' && uB === 'k') tempFormula = `°C + 273.15 = K`;
        else if (uA === 'k' && uB === 'c') tempFormula = `K - 273.15 = °C`;
        else if (uA === 'f' && uB === 'k') tempFormula = `(°F - 32) × 5/9 + 273.15 = K`;
        else if (uA === 'k' && uB === 'f') tempFormula = `(K - 273.15) × 9/5 + 32 = °F`;
        else tempFormula = T('formula.sameUnit');
        formulaBox.innerHTML = T('formula.temperature', { formula: tempFormula });
      } else {
        const factorA = UNIT_FACTORS[activeCategory].units[uA].factor;
        const factorB = UNIT_FACTORS[activeCategory].units[uB].factor;
        const ratio = Math.round((factorA / factorB) * 1e8) / 1e8;
        formulaBox.innerHTML = T('formula.factor', { ratio });
      }
      formulaBox.classList.remove('hidden');
    }

    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) {
      actionCopyBtn.setAttribute('data-copy-text', lastResultText);
    }
  }

  function renderTable(baseVal = 1, baseUnitKey = selectA.value) {
    if (!tableBody) return;
    const items = logic.getConversionTable(activeCategory, baseUnitKey, baseVal || 1);
    const baseName = UNIT_FACTORS[activeCategory].units[baseUnitKey].name;

    tableBody.innerHTML = items.map(item => `
      <tr>
        <td class="py-2 px-3 font-medium">${T('result.quantity', { value: baseVal || 1, unit: baseName })}</td>
        <td class="py-2 px-3 text-right font-bold text-accent">${item.value}</td>
        <td class="py-2 px-3">${item.unitName}</td>
      </tr>
    `).join('');
  }

  // Category tab clicks
  categoryTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      setCategory(cat);
    });
  });

  // Two-way interactive inputs
  inputA.addEventListener('input', () => {
    activeDirection = 'a_to_b';
    convertFromA();
  });
  inputB.addEventListener('input', () => {
    activeDirection = 'b_to_a';
    convertFromB();
  });

  selectA.addEventListener('change', () => {
    if (activeDirection === 'b_to_a') convertFromB();
    else convertFromA();
  });

  selectB.addEventListener('change', () => {
    if (activeDirection === 'b_to_a') convertFromB();
    else convertFromA();
  });

  // Swap button
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const oldA = selectA.value;
      const oldB = selectB.value;
      selectA.value = oldB;
      selectB.value = oldA;
      convertFromA();
    });
  }

  // Copy result
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!lastResultText) return;
      try {
        await navigator.clipboard.writeText(lastResultText);
        const orig = copyBtn.innerHTML;
        copyBtn.innerHTML = `<span>${T('result.copied')}</span>`;
        setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
      } catch (e) {
        console.error('Copy failed:', e);
      }
    });
  }

  // Reset form
  const resetBtn = document.getElementById('reset-unit-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      setCategory('length');
    });
  }

  const globalResetBtn = document.getElementById('action-reset-btn');
  if (globalResetBtn) {
    globalResetBtn.addEventListener('click', () => {
      if (resetBtn) resetBtn.click();
    });
  }

  // Initialize
  setCategory('length');
});
