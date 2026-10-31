/**
 * Gold Calculator Core Logic
 * Pure, DOM-free gold price calculations by weight (tola, gram, masha, ratti) and karat.
 *
 * Units: 1 tola = 180 grains = 11.6638038 g (1 grain = 64.79891 mg), 1 tola = 12 masha,
 * 1 masha = 8 ratti. International units, each from a legal source:
 *   1 troy ounce = 31.1034768 g (NIST Handbook 44, Appendix C)
 *   1 tael troy  = 37.429 g (Hong Kong Weights and Measures Ordinance, Cap. 68, Sch. 1 Part V)
 *   1 kilogram   = 1000 g (SI) Purity = karat ÷ 24, relative to the karat the entered rate is for.
 * All values are computed from the exact per-gram rate and only rounded for display.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.GoldCalculatorLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GRAMS_PER_TOLA = 11.6638038;
  const MASHA_PER_TOLA = 12;
  const RATTI_PER_MASHA = 8;
  const GRAMS_PER_TROY_OUNCE = 31.1034768;
  const GRAMS_PER_TAEL_TROY = 37.429;

  // Grams in one of each unit
  const WEIGHT_UNITS = {
    tola: { label: 'Tola', grams: GRAMS_PER_TOLA },
    gram: { label: 'Gram', grams: 1 },
    masha: { label: 'Masha', grams: GRAMS_PER_TOLA / MASHA_PER_TOLA },
    ratti: { label: 'Ratti', grams: GRAMS_PER_TOLA / (MASHA_PER_TOLA * RATTI_PER_MASHA) },
    troyOunce: { label: 'Troy ounce', grams: GRAMS_PER_TROY_OUNCE },
    taelTroy: { label: 'Tael (Hong Kong, troy)', grams: GRAMS_PER_TAEL_TROY },
    kilogram: { label: 'Kilogram', grams: 1000 }
  };

  // Units a rate can be quoted in
  const RATE_UNITS = {
    tola: { label: 'per tola', grams: GRAMS_PER_TOLA },
    '10g': { label: 'per 10 grams', grams: 10 },
    gram: { label: 'per gram', grams: 1 },
    troyOunce: { label: 'per troy ounce', grams: GRAMS_PER_TROY_OUNCE },
    taelTroy: { label: 'per tael (Hong Kong, troy)', grams: GRAMS_PER_TAEL_TROY },
    kilogram: { label: 'per kilogram', grams: 1000 }
  };

  const KARATS = [24, 22, 21, 18];

  const CURRENCIES = {
    PKR: { symbol: 'Rs', label: 'PKR (Rs)' },
    INR: { symbol: '₹', label: 'INR (₹)' },
    AED: { symbol: 'AED', label: 'AED' },
    USD: { symbol: '$', label: 'USD ($)' }
  };

  function toNumber(value, name) {
    const n = typeof value === 'string' ? parseFloat(value.replace(/,/g, '').trim()) : Number(value);
    if (value === '' || value === null || value === undefined || !isFinite(n)) {
      throw new Error(`Please enter ${name}.`);
    }
    return n;
  }

  function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function purity(karat) {
    return karat / 24;
  }

  /** Convert a weight to grams */
  function toGrams(weight, unit) {
    if (!WEIGHT_UNITS[unit]) throw new Error('Choose a weight unit from the list.');
    return weight * WEIGHT_UNITS[unit].grams;
  }

  /** Express a weight in grams in every unit */
  function convertWeight(grams) {
    const out = {};
    Object.keys(WEIGHT_UNITS).forEach(u => { out[u] = grams / WEIGHT_UNITS[u].grams; });
    return out;
  }

  /**
   * options: {
   *   rate, rateUnit: 'tola'|'10g'|'gram', rateKarat: 24|22|21|18,
   *   weight, weightUnit: 'tola'|'gram'|'masha'|'ratti', karat: 24|22|21|18,
   *   makingType: 'none'|'percent'|'perGram', makingValue
   * }
   */
  function calculateGold(options) {
    const o = options || {};
    const rate = toNumber(o.rate, "today's gold rate");
    const weight = toNumber(o.weight, 'the weight');
    const rateUnit = o.rateUnit || 'tola';
    const weightUnit = o.weightUnit || 'tola';
    const rateKarat = Number(o.rateKarat || 24);
    const karat = Number(o.karat || 24);
    const makingType = o.makingType || 'none';

    if (rate <= 0) throw new Error('The gold rate must be more than 0.');
    if (weight <= 0) throw new Error('The weight must be more than 0.');
    if (!RATE_UNITS[rateUnit]) throw new Error('Choose the weight unit the rate is quoted for.');
    if (!KARATS.includes(rateKarat) || !KARATS.includes(karat)) throw new Error(`Choose a karat: ${KARATS.join('K, ')}K.`);

    // Price of one gram of pure (24K) gold implied by the entered rate
    const pureRatePerGram = (rate / RATE_UNITS[rateUnit].grams) / purity(rateKarat);
    const itemGrams = toGrams(weight, weightUnit);
    const pureGoldGrams = itemGrams * purity(karat);
    const goldValue = pureGoldGrams * pureRatePerGram;

    let makingCharges = 0;
    let makingValue = 0;
    if (makingType === 'percent' || makingType === 'perGram') {
      makingValue = o.makingValue === '' || o.makingValue === undefined || o.makingValue === null ? 0 : toNumber(o.makingValue, 'the making charges');
      if (makingValue < 0) throw new Error('Making charges cannot be negative.');
      makingCharges = makingType === 'percent' ? goldValue * (makingValue / 100) : itemGrams * makingValue;
    } else if (makingType !== 'none') {
      throw new Error('Choose how making charges are quoted.');
    }

    const karatRatePerGram = pureRatePerGram * purity(karat);
    return {
      itemGrams,
      pureGoldGrams,
      karat,
      purity: purity(karat),
      goldValue,
      makingType,
      makingValue,
      makingCharges,
      total: goldValue + makingCharges,
      rates: {
        perGram: karatRatePerGram,
        per10g: karatRatePerGram * 10,
        perTola: karatRatePerGram * GRAMS_PER_TOLA
      },
      weightIn: convertWeight(itemGrams)
    };
  }

  /** Money with thousands separators and 2 decimals, e.g. "Rs 733,333.33" */
  function formatMoney(amount, currency) {
    const c = CURRENCIES[currency] || CURRENCIES.PKR;
    const value = round2(Number(amount) || 0);
    const text = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${value < 0 ? '-' : ''}${c.symbol} ${text}`;
  }

  return {
    GRAMS_PER_TOLA,
    MASHA_PER_TOLA,
    RATTI_PER_MASHA,
    WEIGHT_UNITS,
    RATE_UNITS,
    KARATS,
    CURRENCIES,
    purity,
    toGrams,
    convertWeight,
    calculateGold,
    formatMoney,
    round2
  };
});
