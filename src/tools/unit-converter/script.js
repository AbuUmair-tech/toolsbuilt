/**
 * EXACT UNIT CONVERSION FACTORS (NIST SP 811 / BIPM SI)
 * Data object defined at top of script.js as specified.
 */
const UNIT_FACTORS = {
  length: {
    baseUnit: 'm',
    name: 'Length',
    units: {
      'm': { name: 'Meter (m)', factor: 1 },
      'km': { name: 'Kilometer (km)', factor: 1000 },
      'cm': { name: 'Centimeter (cm)', factor: 0.01 },
      'mm': { name: 'Millimeter (mm)', factor: 0.001 },
      'mi': { name: 'Mile (mi)', factor: 1609.344 },
      'yd': { name: 'Yard (yd)', factor: 0.9144 },
      'ft': { name: 'Foot (ft)', factor: 0.3048 },
      'in': { name: 'Inch (in)', factor: 0.0254 },
      'nmi': { name: 'Nautical Mile (nmi)', factor: 1852 }
    }
  },
  weight: {
    baseUnit: 'kg',
    name: 'Weight / Mass',
    units: {
      'kg': { name: 'Kilogram (kg)', factor: 1 },
      'g': { name: 'Gram (g)', factor: 0.001 },
      'mg': { name: 'Milligram (mg)', factor: 0.000001 },
      't': { name: 'Metric Ton (t)', factor: 1000 },
      'lb': { name: 'Pound (lb)', factor: 0.45359237 },
      'oz': { name: 'Ounce (oz)', factor: 0.028349523125 },
      'st': { name: 'Stone (st)', factor: 6.35029318 },
      'ton': { name: 'Short Ton (US ton)', factor: 907.18474 }
    }
  },
  temperature: {
    baseUnit: 'c',
    name: 'Temperature',
    units: {
      'c': { name: 'Celsius (°C)' },
      'f': { name: 'Fahrenheit (°F)' },
      'k': { name: 'Kelvin (K)' }
    }
  },
  area: {
    baseUnit: 'sqm',
    name: 'Area',
    units: {
      'sqm': { name: 'Square Meter (m²)', factor: 1 },
      'sqkm': { name: 'Square Kilometer (km²)', factor: 1000000 },
      'sqcm': { name: 'Square Centimeter (cm²)', factor: 0.0001 },
      'sqmi': { name: 'Square Mile (mi²)', factor: 2589988.110336 },
      'sqyd': { name: 'Square Yard (yd²)', factor: 0.83612736 },
      'sqft': { name: 'Square Foot (ft²)', factor: 0.09290304 },
      'sqin': { name: 'Square Inch (in²)', factor: 0.00064516 },
      'ha': { name: 'Hectare (ha)', factor: 10000 },
      'ac': { name: 'Acre (ac)', factor: 4046.8564224 }
    }
  },
  volume: {
    baseUnit: 'l',
    name: 'Volume',
    units: {
      'l': { name: 'Liter (L)', factor: 1 },
      'ml': { name: 'Milliliter (mL)', factor: 0.001 },
      'cum': { name: 'Cubic Meter (m³)', factor: 1000 },
      'gal': { name: 'US Gallon (gal)', factor: 3.785411784 },
      'qt': { name: 'US Quart (qt)', factor: 0.946352946 },
      'pt': { name: 'US Pint (pt)', factor: 0.473176473 },
      'cup': { name: 'US Cup', factor: 0.2365882365 },
      'floz': { name: 'US Fluid Ounce (fl oz)', factor: 0.0295735295625 },
      'impgal': { name: 'Imperial Gallon (imp gal)', factor: 4.54609 }
    }
  },
  speed: {
    baseUnit: 'mps',
    name: 'Speed',
    units: {
      'mps': { name: 'Meter per Second (m/s)', factor: 1 },
      'kph': { name: 'Kilometer per Hour (km/h)', factor: 1 / 3.6 },
      'mph': { name: 'Mile per Hour (mph)', factor: 0.44704 },
      'kn': { name: 'Knot (kn)', factor: 1852 / 3600 },
      'fps': { name: 'Foot per Second (ft/s)', factor: 0.3048 }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
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
      showError('Please enter a valid numeric value.', inputA);
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
      showError('Please enter a valid numeric value.', inputB);
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

    if (headerEl) headerEl.textContent = `${UNIT_FACTORS[activeCategory].name} Conversion`;
    if (primaryEl) {
      primaryEl.textContent = `${valA} ${nameA} = ${valB} ${nameB}`;
    }

    lastResultText = `${valA} ${nameA} is equal to ${valB} ${nameB}.`;

    if (statsGrid) {
      const oneUnitEquiv = logic.convert(activeCategory, 1, uA, uB);
      const reverseEquiv = logic.convert(activeCategory, 1, uB, uA);
      statsGrid.innerHTML = `
        <div class="result-stat-card">
          <span class="stat-label">1 ${nameA}</span>
          <span class="stat-value">${oneUnitEquiv} ${nameB}</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">1 ${nameB}</span>
          <span class="stat-value">${reverseEquiv} ${nameA}</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">Category</span>
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
        else tempFormula = `Direct 1:1 match`;
        formulaBox.innerHTML = `<strong>Conversion Formula:</strong> <code>${tempFormula}</code>`;
      } else {
        const factorA = UNIT_FACTORS[activeCategory].units[uA].factor;
        const factorB = UNIT_FACTORS[activeCategory].units[uB].factor;
        const ratio = Math.round((factorA / factorB) * 1e8) / 1e8;
        formulaBox.innerHTML = `<strong>Conversion Formula:</strong> Multiply by factor <code>${ratio}</code>`;
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
      <tr style="border-bottom: 1px solid var(--border-subtle);">
        <td style="padding: 0.6rem 0.75rem; font-weight: 500;">${baseVal || 1} ${baseName}</td>
        <td style="padding: 0.6rem 0.75rem; text-align: right; font-weight: 700; color: var(--accent-primary);">${item.value}</td>
        <td style="padding: 0.6rem 0.75rem;">${item.unitName}</td>
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
        copyBtn.innerHTML = '<span>Copied!</span>';
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
