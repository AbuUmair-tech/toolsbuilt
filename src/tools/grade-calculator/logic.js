/**
 * Grade Calculator Core Logic
 * Pure, DOM-free functions for weighted assignment grades and target final exam calculations.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.GradeCalculatorLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function roundSensible(num, maxDecimals = 4) {
    if (!isFinite(num)) return num;
    const factor = Math.pow(10, maxDecimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  }

  function getLetterGrade(percentage) {
    const p = parseFloat(percentage);
    if (isNaN(p)) return 'N/A';
    if (p >= 97) return 'A+';
    if (p >= 93) return 'A';
    if (p >= 90) return 'A-';
    if (p >= 87) return 'B+';
    if (p >= 83) return 'B';
    if (p >= 80) return 'B-';
    if (p >= 77) return 'C+';
    if (p >= 73) return 'C';
    if (p >= 70) return 'C-';
    if (p >= 67) return 'D+';
    if (p >= 63) return 'D';
    if (p >= 60) return 'D-';
    return 'F';
  }

  /**
   * Calculate current weighted grade from an array of assignments:
   * assignments: Array<{ name?: string, score: number, weight: number }>
   */
  function calculateCurrentGrade(assignments) {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new Error('Please provide at least one assignment.');
    }

    let totalWeight = 0;
    let weightedPointsSum = 0;
    const validRows = [];

    for (let i = 0; i < assignments.length; i++) {
      const item = assignments[i];
      const score = parseFloat(item.score);
      const weight = parseFloat(item.weight);

      if (isNaN(score) || isNaN(weight)) {
        continue;
      }

      if (weight < 0) {
        throw new Error('Assignment weight cannot be negative.');
      }

      totalWeight += weight;
      weightedPointsSum += (score * (weight / 100));
      validRows.push({
        name: item.name || `Assignment ${i + 1}`,
        score,
        weight,
        contribution: roundSensible(score * (weight / 100), 4)
      });
    }

    if (validRows.length === 0) {
      throw new Error('No valid numeric grades entered.');
    }

    if (totalWeight === 0) {
      throw new Error('Total completed weight cannot be 0%.');
    }

    // Current weighted percentage is points divided by fraction of completed weight
    const currentPercentage = (weightedPointsSum / (totalWeight / 100));
    const roundedPercentage = roundSensible(currentPercentage, 2);

    return {
      totalWeight: roundSensible(totalWeight, 2),
      totalPoints: roundSensible(weightedPointsSum, 2),
      currentGrade: roundedPercentage,
      letterGrade: getLetterGrade(roundedPercentage),
      validRows
    };
  }

  /**
   * Calculate score needed on final exam to achieve target overall grade.
   * targetGrade: e.g. 90
   * completedWeight: e.g. 70
   * currentGrade: e.g. 85 (or computed from assignments)
   * finalWeight: e.g. 30
   */
  function calculateFinalExamNeeded(targetGrade, completedWeight, currentGrade, finalWeight) {
    const target = parseFloat(targetGrade);
    const compW = parseFloat(completedWeight);
    const curG = parseFloat(currentGrade);
    const finW = parseFloat(finalWeight);

    if (isNaN(target) || isNaN(compW) || isNaN(curG) || isNaN(finW)) {
      throw new Error('Please enter valid numbers for target, current grade, and weights.');
    }

    if (finW <= 0) {
      throw new Error('Final exam weight must be greater than 0%.');
    }

    const currentContribution = curG * (compW / 100);
    const totalCourseWeight = compW + finW;
    const targetPoints = target * (totalCourseWeight / 100);
    const neededPoints = targetPoints - currentContribution;
    const neededFinalScore = (neededPoints / (finW / 100));
    const roundedNeeded = roundSensible(neededFinalScore, 2);

    let status = 'achievable';
    let message = `You need a score of ${roundedNeeded}% on the final exam to secure a ${target}% in this course.`;

    if (roundedNeeded <= 0) {
      status = 'already-achieved';
      message = `You have already secured a ${target}% course grade even with a 0% on the final exam!`;
    } else if (roundedNeeded > 100) {
      status = 'extra-credit';
      message = `You need a ${roundedNeeded}% on the final exam. This target requires extra credit beyond 100%.`;
    }

    return {
      targetGrade: target,
      completedWeight: compW,
      currentGrade: curG,
      finalWeight: finW,
      neededScore: roundedNeeded,
      status,
      message,
      formula: `((${target} × ${totalCourseWeight} ÷ 100) - (${curG} × ${compW} ÷ 100)) ÷ (${finW} ÷ 100)`
    };
  }

  return {
    roundSensible,
    getLetterGrade,
    calculateCurrentGrade,
    calculateFinalExamNeeded
  };
});
