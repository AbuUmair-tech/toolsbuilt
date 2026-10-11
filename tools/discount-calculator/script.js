/**
 * Discount Calculator Script
 * Calculates final price, total savings, stacked double discounts, sales tax,
 * and step-by-step mathematical breakdown.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('calculator-form');
  const priceInput = document.getElementById('original-price');
  const discountInput = document.getElementById('discount-percent');
  const stackedDiscountInput = document.getElementById('stacked-discount-percent');
  const taxInput = document.getElementById('tax-percent');
  const resetBtn = document.getElementById('reset-btn');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');

  // Pre-fill defaults (e.g. $100 original, 20% discount)
  priceInput.value = '100';
  discountInput.value = '20';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateDiscount();
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    priceInput.value = '100';
    discountInput.value = '20';
    resultBox.classList.remove('is-visible');
    errorBox.classList.add('hidden');
  });

  function calculateDiscount() {
    const origPrice = parseFloat(priceInput.value);
    const discPercent = parseFloat(discountInput.value);
    const stackedPercent = parseFloat(stackedDiscountInput.value) || 0;
    const taxPercent = parseFloat(taxInput.value) || 0;

    if (isNaN(origPrice) || isNaN(discPercent)) {
      showError('Please enter valid numeric values for price and discount percentage.');
      return;
    }

    if (origPrice < 0 || discPercent < 0 || stackedPercent < 0 || taxPercent < 0) {
      showError('Price, discount, and tax percentages cannot be negative numbers.');
      return;
    }

    errorBox.classList.add('hidden');

    // Step 1: Primary Discount
    const primarySavings = (origPrice * discPercent) / 100;
    const priceAfterPrimary = origPrice - primarySavings;

    // Step 2: Stacked Second Discount (applied to reduced price)
    const stackedSavings = (priceAfterPrimary * stackedPercent) / 100;
    const priceAfterDiscounts = priceAfterPrimary - stackedSavings;

    // Total Savings
    const totalSavings = primarySavings + stackedSavings;

    // Step 3: Sales Tax
    const taxAmount = (priceAfterDiscounts * taxPercent) / 100;
    const finalPrice = priceAfterDiscounts + taxAmount;

    // Formatting helper
    const fmt = (num) => '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // UI Updates
    document.getElementById('result-header-text').textContent = 'Discount Calculation Result';
    document.getElementById('result-primary-text').textContent = `Final Price: ${fmt(finalPrice)}`;

    document.getElementById('stat-final-price').textContent = fmt(finalPrice);
    document.getElementById('stat-total-saved').textContent = fmt(totalSavings);
    document.getElementById('stat-price-before-tax').textContent = fmt(priceAfterDiscounts);
    document.getElementById('stat-tax-amount').textContent = fmt(taxAmount);

    // Step-by-Step Breakdown HTML
    let stepsHtml = `<strong>Calculation Breakdown:</strong><br>`;
    stepsHtml += `1. Original Price: <code>${fmt(origPrice)}</code><br>`;
    stepsHtml += `2. Primary Discount (${discPercent}%): Saved <code>${fmt(primarySavings)}</code> → Subtotal: <code>${fmt(priceAfterPrimary)}</code><br>`;

    if (stackedPercent > 0) {
      stepsHtml += `3. Stacked 2nd Discount (${stackedPercent}%): Saved additional <code>${fmt(stackedSavings)}</code> → Price After Discounts: <code>${fmt(priceAfterDiscounts)}</code><br>`;
    }

    if (taxPercent > 0) {
      stepsHtml += `4. Sales Tax (${taxPercent}%): Added <code>${fmt(taxAmount)}</code><br>`;
      stepsHtml += `5. Total Final Price: <strong>${fmt(finalPrice)}</strong> (You saved a total of <strong>${fmt(totalSavings)}</strong>)`;
    } else {
      stepsHtml += `4. Total Final Price: <strong>${fmt(finalPrice)}</strong> (You saved a total of <strong>${fmt(totalSavings)}</strong>)`;
    }

    document.getElementById('formula-breakdown-box').innerHTML = stepsHtml;

    resultBox.classList.add('is-visible');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    resultBox.classList.remove('is-visible');
  }

  // Initial calculation
  calculateDiscount();
});
