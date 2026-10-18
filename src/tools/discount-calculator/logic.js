/**
 * Discount Calculator Core Logic
 * Pure, DOM-free functions for retail discount and sales tax calculation.
 * Implements banker-safe half-up cent rounding (2 decimal places).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.DiscountLogic = root.DiscountCalculatorLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Banker-safe rounding to 2 decimal places (cents)
   */
  function roundCents(amount) {
    if (isNaN(amount) || !isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Calculates final discounted price, stacked coupons, and sales tax.
   * Supports both positional args: (orig, d1, d2, tax)
   * and options object: (orig, d1, { stackedDiscountPercent, taxPercent, currencySymbol })
   */
  function calculateDiscount(originalPrice, discount1Percent, discount2OrOptions = 0, taxPercentParam = 0) {
    const orig = parseFloat(originalPrice);
    const d1 = parseFloat(discount1Percent);

    let d2 = 0;
    let tax = 0;
    let currencySymbol = '$';

    if (discount2OrOptions && typeof discount2OrOptions === 'object') {
      d2 = discount2OrOptions.stackedDiscountPercent ? parseFloat(discount2OrOptions.stackedDiscountPercent) : 0;
      tax = discount2OrOptions.taxPercent ? parseFloat(discount2OrOptions.taxPercent) : 0;
      if (discount2OrOptions.currencySymbol) currencySymbol = discount2OrOptions.currencySymbol;
    } else {
      d2 = discount2OrOptions ? parseFloat(discount2OrOptions) : 0;
      tax = taxPercentParam ? parseFloat(taxPercentParam) : 0;
    }

    if (isNaN(orig) || orig < 0) {
      throw new Error('Please enter a valid original price (must be 0 or greater).');
    }
    if (isNaN(d1) || d1 < 0) {
      throw new Error('Please enter a valid primary discount percentage (0-100%).');
    }
    if (d1 > 100) {
      throw new Error('Primary discount percentage cannot exceed 100%.');
    }
    if (isNaN(d2) || d2 < 0) {
      throw new Error('Stacked secondary discount must be 0 or greater.');
    }
    if (d2 > 100) {
      throw new Error('Stacked secondary discount cannot exceed 100%.');
    }
    if (isNaN(tax) || tax < 0) {
      throw new Error('Tax percentage must be 0 or greater.');
    }

    // Step 1: Apply primary discount
    const savings1 = roundCents((orig * d1) / 100);
    const priceAfterD1 = roundCents(orig - savings1);

    // Step 2: Apply secondary stacked discount on the reduced price
    const savings2 = roundCents((priceAfterD1 * d2) / 100);
    const priceAfterD2 = roundCents(priceAfterD1 - savings2);

    // Step 3: Apply sales tax on the final discounted price
    const taxAmount = roundCents((priceAfterD2 * tax) / 100);
    const finalPrice = roundCents(priceAfterD2 + taxAmount);

    const totalSavings = roundCents(savings1 + savings2);
    const totalSavingsPercent = orig > 0 ? roundCents((totalSavings / orig) * 100) : 0;

    const breakdown = [
      { step: 'Original Price', amount: orig },
      { step: `Primary Discount (${d1}%)`, amount: -savings1, balance: priceAfterD1 }
    ];

    if (d2 > 0) {
      breakdown.push({ step: `Stacked Coupon (${d2}%)`, amount: -savings2, balance: priceAfterD2 });
    }

    if (tax > 0) {
      breakdown.push({ step: `Sales Tax (${tax}%)`, amount: taxAmount, balance: finalPrice });
    }

    return {
      originalPrice: orig,
      primaryDiscount: d1,
      primarySavings: savings1,
      subtotalAfterPrimary: priceAfterD1,
      stackedDiscount: d2,
      stackedSavings: savings2,
      priceAfterDiscounts: priceAfterD2,
      totalSavings,
      effectiveDiscountPercent: totalSavingsPercent,
      totalSavingsPercent,
      taxPercent: tax,
      taxAmount,
      finalPrice,
      currencySymbol,
      breakdown
    };
  }

  return {
    roundCents,
    calculateDiscount
  };
});
