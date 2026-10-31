/**
 * Tip Calculator Core Logic
 * Pure, DOM-free tip and bill-splitting maths. Money is handled in whole cents
 * so totals and per-person shares never drift by a fraction of a cent.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.TipCalculatorLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const PRESETS = [10, 15, 18, 20, 25];

  const toCents = (value) => Math.round((Number(value) + Number.EPSILON) * 100);
  const fromCents = (cents) => cents / 100;

  function isBlank(value) {
    return value === undefined || value === null || String(value).trim() === '';
  }

  /**
   * @param {Object} input
   * @param {number|string} input.bill        - the bill as printed (including tax, if any)
   * @param {number|string} input.tipPercent  - tip percentage, e.g. 18
   * @param {number|string} input.people      - number of people splitting (default 1)
   * @param {boolean} input.tipOnPreTax       - tip only on the amount before tax
   * @param {number|string} input.taxPercent  - tax included in the bill, used when tipOnPreTax is on
   * @param {boolean} input.roundUp           - round each person's share up to a whole currency unit
   */
  function calculateTip(input = {}) {
    if (isBlank(input.bill)) return { error: 'Enter the bill amount.', field: 'bill' };
    const bill = Number(input.bill);
    if (!Number.isFinite(bill) || bill <= 0) return { error: 'The bill must be a number greater than 0.', field: 'bill' };

    if (isBlank(input.tipPercent)) return { error: 'Enter a tip percentage or choose a preset.', field: 'tip' };
    const tipPercent = Number(input.tipPercent);
    if (!Number.isFinite(tipPercent) || tipPercent < 0) return { error: 'The tip must be 0% or more.', field: 'tip' };
    if (tipPercent > 100) return { error: 'The tip cannot be more than 100% of the bill.', field: 'tip' };

    const people = isBlank(input.people) ? 1 : Number(input.people);
    if (!Number.isInteger(people) || people < 1) return { error: 'The number of people must be a whole number of 1 or more.', field: 'people' };
    if (people > 1000) return { error: 'Split between 1,000 people or fewer.', field: 'people' };

    let taxPercent = 0;
    if (input.tipOnPreTax) {
      taxPercent = isBlank(input.taxPercent) ? 0 : Number(input.taxPercent);
      if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
        return { error: 'The tax rate must be between 0% and 100%.', field: 'tax' };
      }
    }

    const billCents = toCents(bill);
    // The bill already includes tax: back the tax out to find the amount the tip is based on
    const baseCents = input.tipOnPreTax && taxPercent > 0 ? Math.round(billCents / (1 + taxPercent / 100)) : billCents;
    const taxCents = billCents - baseCents;
    const tipCents = Math.round(baseCents * tipPercent / 100);
    const totalCents = billCents + tipCents;

    // Exact share, then the cents left over when the total does not divide evenly
    const shareCents = Math.floor(totalCents / people);
    const remainderCents = totalCents - shareCents * people;
    let perPersonCents = Math.round(totalCents / people);

    const result = {
      bill: fromCents(billCents),
      tipBase: fromCents(baseCents),
      tax: fromCents(taxCents),
      tipPercent,
      tip: fromCents(tipCents),
      total: fromCents(totalCents),
      people,
      perPerson: fromCents(perPersonCents),
      tipPerPerson: fromCents(Math.round(tipCents / people)),
      // When shares are uneven, this many people pay one extra cent
      unevenSplit: remainderCents !== 0,
      extraCentPayers: remainderCents,
      lowShare: fromCents(shareCents),
      highShare: fromCents(shareCents + (remainderCents ? 1 : 0)),
      roundedUp: false
    };

    if (input.roundUp) {
      perPersonCents = Math.ceil(totalCents / people / 100) * 100;
      const collectedCents = perPersonCents * people;
      const roundedTipCents = collectedCents - billCents;
      Object.assign(result, {
        roundedUp: true,
        perPerson: fromCents(perPersonCents),
        total: fromCents(collectedCents),
        tip: fromCents(roundedTipCents),
        tipPerPerson: fromCents(Math.round(roundedTipCents / people)),
        roundingExtra: fromCents(collectedCents - totalCents),
        effectiveTipPercent: baseCents ? Math.round(roundedTipCents / baseCents * 10000) / 100 : 0,
        unevenSplit: false,
        extraCentPayers: 0,
        lowShare: fromCents(perPersonCents),
        highShare: fromCents(perPersonCents)
      });
    }
    return result;
  }

  return { PRESETS, calculateTip };
});
