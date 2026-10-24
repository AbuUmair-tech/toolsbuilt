/**
 * Compound Interest Calculator Core Logic
 * Pure, DOM-free functions for multi-frequency compounding,
 * regular contribution simulations, and lightweight inline SVG chart generation.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CompoundInterestLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FREQ_MAP = {
    daily: { n: 365, label: 'Daily (365/yr)' },
    monthly: { n: 12, label: 'Monthly (12/yr)' },
    quarterly: { n: 4, label: 'Quarterly (4/yr)' },
    annual: { n: 1, label: 'Annually (1/yr)' }
  };

  /**
   * Half-up rounding to 2 decimal places
   */
  function roundCents(amount) {
    if (isNaN(amount) || !isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Format currency value
   */
  function formatCurrency(amount, symbol = '$') {
    const rounded = roundCents(amount);
    const formatted = rounded.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formatted}`;
  }

  /**
   * Calculate compound interest growth with optional regular contributions.
   *
   * @param {number|string} principal - Initial lump sum deposit
   * @param {number|string} annualRatePercent - Annual interest rate (e.g. 7 for 7%)
   * @param {number|string} tenureYears - Time horizon in years
   * @param {string} [frequency='monthly'] - 'daily', 'monthly', 'quarterly', or 'annual'
   * @param {Object} [options] - Additional parameters
   * @param {number|string} [options.contributionAmount=0] - Additional deposit per period
   * @param {string} [options.contributionTiming='beginning'] - 'beginning' or 'end' of month
   * @param {string} [options.currencySymbol='$'] - Currency symbol
   */
  function calculateCompoundInterest(principal, annualRatePercent, tenureYears, frequency = 'monthly', options = {}) {
    const P = parseFloat(principal);
    const R = parseFloat(annualRatePercent);
    const years = parseFloat(tenureYears);
    const freqKey = (frequency || 'monthly').toLowerCase();
    const freqInfo = FREQ_MAP[freqKey] || FREQ_MAP.monthly;
    const n = freqInfo.n;
    const pmt = options.contributionAmount ? parseFloat(options.contributionAmount) : 0;
    const timing = options.contributionTiming === 'end' ? 'end' : 'beginning';
    const symbol = options.currencySymbol || '$';

    if (isNaN(P) || P < 0) {
      throw new Error('Initial principal must be 0 or greater.');
    }
    if (isNaN(R) || R < 0) {
      throw new Error('Interest rate must be 0% or greater.');
    }
    if (isNaN(years) || years <= 0) {
      throw new Error('Investment horizon must be greater than zero.');
    }
    if (years > 60) {
      throw new Error('Investment horizon cannot exceed 60 years.');
    }
    if (isNaN(pmt) || pmt < 0) {
      throw new Error('Contribution amount must be 0 or greater.');
    }
    if (P === 0 && pmt === 0) {
      throw new Error('Please enter either an initial principal or a regular contribution amount.');
    }

    const r = R / 100;
    // APY = (1 + r/n)^n - 1
    const apy = n > 0 ? Math.pow(1 + r / n, n) - 1 : 0;
    const apyPercent = roundCents(apy * 100);

    // Effective monthly compounding rate matching chosen frequency
    const monthlyRate = Math.pow(1 + r / n, n / 12) - 1;

    let currentPrincipal = P;
    let currentBalance = P;
    const yearlyData = [];

    yearlyData.push({
      year: 0,
      annualDeposit: 0,
      totalPrincipal: roundCents(currentPrincipal),
      interestEarned: 0,
      balance: roundCents(currentBalance)
    });

    const totalYearsInt = Math.ceil(years);

    for (let y = 1; y <= totalYearsInt; y++) {
      let yearDeposit = 0;
      const startYearBal = currentBalance;

      for (let m = 1; m <= 12; m++) {
        if (timing === 'beginning' && pmt > 0) {
          currentBalance += pmt;
          currentPrincipal += pmt;
          yearDeposit += pmt;
        }
        currentBalance += currentBalance * monthlyRate;
        if (timing === 'end' && pmt > 0) {
          currentBalance += pmt;
          currentPrincipal += pmt;
          yearDeposit += pmt;
        }
      }

      const yearInterest = Math.max(0, currentBalance - startYearBal - yearDeposit);

      yearlyData.push({
        year: y,
        annualDeposit: roundCents(yearDeposit),
        totalPrincipal: roundCents(currentPrincipal),
        interestEarned: roundCents(yearInterest),
        balance: roundCents(currentBalance)
      });
    }

    const finalBalance = roundCents(currentBalance);
    const totalPrincipal = roundCents(currentPrincipal);
    const totalInterest = roundCents(Math.max(0, finalBalance - totalPrincipal));
    const totalContributions = roundCents(Math.max(0, totalPrincipal - P));

    return {
      initialPrincipal: P,
      annualRate: R,
      tenureYears: years,
      frequency: freqKey,
      frequencyLabel: freqInfo.label,
      apyPercent,
      contributionAmount: pmt,
      contributionTiming: timing,
      currencySymbol: symbol,
      totalContributions,
      totalPrincipal,
      totalInterest,
      finalBalance,
      yearlyData
    };
  }

  /**
   * Generates a lightweight, accessible SVG area/line growth chart.
   * Zero external charting library dependencies.
   */
  function generateSvgGrowthChart(yearlyData, currencySymbol = '$') {
    if (!Array.isArray(yearlyData) || yearlyData.length < 2) return '';

    const width = 640;
    const height = 300;
    const padLeft = 70;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 45;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const maxVal = Math.max(...yearlyData.map(d => d.balance));
    // Add 10% headroom to top
    const niceMax = maxVal > 0 ? maxVal * 1.1 : 100;
    const count = yearlyData.length - 1;

    function getX(idx) {
      return padLeft + (idx / count) * plotWidth;
    }

    function getY(val) {
      return padTop + plotHeight - (val / niceMax) * plotHeight;
    }

    // Coordinates for Balance and Principal
    const balancePoints = yearlyData.map((d, i) => ({ x: getX(i), y: getY(d.balance), d }));
    const principalPoints = yearlyData.map((d, i) => ({ x: getX(i), y: getY(d.totalPrincipal), d }));

    // SVG path string builders
    const balanceLinePath = balancePoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
    const principalLinePath = principalPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');

    const balanceAreaPath = `${balanceLinePath} L ${getX(count).toFixed(1)},${(padTop + plotHeight).toFixed(1)} L ${padLeft.toFixed(1)},${(padTop + plotHeight).toFixed(1)} Z`;
    const principalAreaPath = `${principalLinePath} L ${getX(count).toFixed(1)},${(padTop + plotHeight).toFixed(1)} L ${padLeft.toFixed(1)},${(padTop + plotHeight).toFixed(1)} Z`;

    // Horizontal grid lines (4 divisions)
    const gridLines = [];
    const yTicks = 4;
    for (let t = 0; t <= yTicks; t++) {
      const val = (niceMax / yTicks) * t;
      const yPos = getY(val);
      const label = val >= 1000000
        ? `${currencySymbol}${(val / 1000000).toFixed(1)}M`
        : val >= 1000
        ? `${currencySymbol}${(val / 1000).toFixed(0)}k`
        : `${currencySymbol}${val.toFixed(0)}`;

      gridLines.push(`
        <line x1="${padLeft}" y1="${yPos.toFixed(1)}" x2="${width - padRight}" y2="${yPos.toFixed(1)}" stroke="var(--border-subtle, #e5e7eb)" stroke-dasharray="3,3" stroke-width="1" />
        <text x="${padLeft - 10}" y="${(yPos + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--text-muted, #6b7280)">${label}</text>
      `);
    }

    // X-axis Year labels (show max 6-8 ticks)
    const xLabels = [];
    const step = Math.max(1, Math.ceil(count / 6));
    for (let i = 0; i <= count; i += step) {
      const p = balancePoints[i];
      xLabels.push(`
        <text x="${p.x.toFixed(1)}" y="${(padTop + plotHeight + 20).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--text-muted, #6b7280)">Yr ${yearlyData[i].year}</text>
      `);
    }
    // Always include final year if not already included
    if ((count % step) !== 0) {
      const p = balancePoints[count];
      xLabels.push(`
        <text x="${p.x.toFixed(1)}" y="${(padTop + plotHeight + 20).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--text-muted, #6b7280)">Yr ${yearlyData[count].year}</text>
      `);
    }

    // Circles for hover/tooltip
    const dataCircles = balancePoints.map(p => `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="var(--accent-primary, #10b981)" stroke="#ffffff" stroke-width="2">
        <title>Year ${p.d.year}: Balance ${currencySymbol}${p.d.balance.toLocaleString('en-US')}, Principal ${currencySymbol}${p.d.totalPrincipal.toLocaleString('en-US')}</title>
      </circle>
    `).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" class="compound-growth-svg" role="img" aria-label="Compound interest wealth projection growth chart" style="width: 100%; height: auto; display: block;">
        <desc>Growth progression comparing total invested principal versus compound interest balance over ${count} years.</desc>
        <g class="chart-grid">${gridLines.join('')}</g>
        <!-- Principal Area (Base) -->
        <path d="${principalAreaPath}" fill="rgba(99, 102, 241, 0.25)" />
        <path d="${principalLinePath}" fill="none" stroke="#6366f1" stroke-width="2" />
        <!-- Total Balance Area (Upper) -->
        <path d="${balanceAreaPath}" fill="rgba(16, 185, 129, 0.18)" />
        <path d="${balanceLinePath}" fill="none" stroke="var(--accent-primary, #10b981)" stroke-width="2.5" />
        <g class="chart-x-labels">${xLabels.join('')}</g>
        <g class="chart-data-points">${dataCircles}</g>
      </svg>
    `.trim();
  }

  return {
    FREQ_MAP,
    roundCents,
    formatCurrency,
    calculateCompoundInterest,
    generateSvgGrowthChart
  };
});
