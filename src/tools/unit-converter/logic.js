/**
 * Unit Converter Core Logic & Exact Conversion Factors
 * Based strictly on NIST Special Publication 811 and BIPM SI definitions.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.UnitConverterLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // EXACT Conversion Factors to Base SI Unit
  const UNIT_DEFINITIONS = {
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

  function roundSensible(num, maxDecimals = 6) {
    if (!isFinite(num)) return num;
    if (Math.abs(num) < 1e-12 && num !== 0) return 0;
    const factor = Math.pow(10, maxDecimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  }

  function cleanFloat(num) {
    if (isNaN(num)) return NaN;
    return parseFloat(num.toPrecision(12));
  }

  /**
   * Convert temperature between Celsius, Fahrenheit, and Kelvin
   */
  function convertTemperature(value, fromUnit, toUnit) {
    const val = parseFloat(value);
    if (isNaN(val)) throw new Error('Please enter a valid numeric temperature value.');

    const from = String(fromUnit).toLowerCase();
    const to = String(toUnit).toLowerCase();

    if (from === to) return val;

    // First convert to Celsius
    let celsius;
    if (from === 'c') {
      celsius = val;
    } else if (from === 'f') {
      celsius = (val - 32) * (5 / 9);
    } else if (from === 'k') {
      celsius = val - 273.15;
    } else {
      throw new Error(`Invalid source temperature unit: ${fromUnit}`);
    }

    // Convert from Celsius to target
    let result;
    if (to === 'c') {
      result = celsius;
    } else if (to === 'f') {
      result = (celsius * (9 / 5)) + 32;
    } else if (to === 'k') {
      result = celsius + 273.15;
    } else {
      throw new Error(`Invalid target temperature unit: ${toUnit}`);
    }

    return roundSensible(result, 4);
  }

  /**
   * Universal convert function across any category
   */
  function convert(category, value, fromUnit, toUnit) {
    const cat = String(category).toLowerCase();
    if (!UNIT_DEFINITIONS[cat]) {
      throw new Error(`Unsupported category: ${category}`);
    }

    const val = parseFloat(value);
    if (isNaN(val)) {
      throw new Error('Please enter a valid number to convert.');
    }

    if (cat === 'temperature') {
      return convertTemperature(val, fromUnit, toUnit);
    }

    const catUnits = UNIT_DEFINITIONS[cat].units;
    const unitA = catUnits[fromUnit];
    const unitB = catUnits[toUnit];

    if (!unitA) throw new Error(`Unknown source unit "${fromUnit}" in ${cat}`);
    if (!unitB) throw new Error(`Unknown target unit "${toUnit}" in ${cat}`);

    if (fromUnit === toUnit) return val;

    // Convert fromUnit -> base SI unit -> toUnit
    const baseVal = val * unitA.factor;
    const targetVal = baseVal / unitB.factor;

    return roundSensible(targetVal, 6);
  }

  /**
   * Generate reference conversion table for a chosen base unit
   */
  function getConversionTable(category, baseUnitKey, baseVal = 1) {
    const cat = String(category).toLowerCase();
    if (!UNIT_DEFINITIONS[cat]) return [];

    const catUnits = UNIT_DEFINITIONS[cat].units;
    const results = [];

    for (const key of Object.keys(catUnits)) {
      const converted = convert(cat, baseVal, baseUnitKey, key);
      results.push({
        unitKey: key,
        unitName: catUnits[key].name,
        value: converted
      });
    }

    return results;
  }

  return {
    UNIT_DEFINITIONS,
    roundSensible,
    convertTemperature,
    convert,
    getConversionTable
  };
});
