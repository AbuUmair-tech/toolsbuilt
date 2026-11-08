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

  // Messages and unit names come from the tool's translation data
  const T = (typeof ToolsBuilt !== 'undefined' && ToolsBuilt.scope)
    ? ToolsBuilt.scope('unit-converter')
    : require('../../../scripts/i18n-client.js').scope('unit-converter');

  // EXACT Conversion Factors to Base SI Unit
  const UNIT_DEFINITIONS = {
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

  // Display names come from the tool's translation data: categories.<category>, units.<category>.<id>
  Object.keys(UNIT_DEFINITIONS).forEach(cat => {
    UNIT_DEFINITIONS[cat].name = T(`categories.${cat}`);
    Object.keys(UNIT_DEFINITIONS[cat].units).forEach(id => {
      UNIT_DEFINITIONS[cat].units[id].name = T(`units.${cat}.${id}`);
    });
  });

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
    if (isNaN(val)) throw new Error(T('errors.temperatureValue'));

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
      throw new Error(T('errors.invalidSourceTemp', { unit: fromUnit }));
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
      throw new Error(T('errors.invalidTargetTemp', { unit: toUnit }));
    }

    return roundSensible(result, 4);
  }

  /**
   * Universal convert function across any category
   */
  function convert(category, value, fromUnit, toUnit) {
    const cat = String(category).toLowerCase();
    if (!UNIT_DEFINITIONS[cat]) {
      throw new Error(T('errors.unsupportedCategory', { category }));
    }

    const val = parseFloat(value);
    if (isNaN(val)) {
      throw new Error(T('errors.numberToConvert'));
    }

    if (cat === 'temperature') {
      return convertTemperature(val, fromUnit, toUnit);
    }

    const catUnits = UNIT_DEFINITIONS[cat].units;
    const unitA = catUnits[fromUnit];
    const unitB = catUnits[toUnit];

    if (!unitA) throw new Error(T('errors.unknownSource', { unit: fromUnit, category: cat }));
    if (!unitB) throw new Error(T('errors.unknownTarget', { unit: toUnit, category: cat }));

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
