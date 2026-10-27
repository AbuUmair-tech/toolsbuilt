/**
 * GPA Calculator Core Logic
 * Standard 4.0 scale computations with plus/minus toggles,
 * semester GPA, and cumulative GPA tracking with prior academic history.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.GpaCalculatorLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GRADE_POINTS_PLUS_MINUS = {
    'A+': 4.0,
    'A': 4.0,
    'A-': 3.7,
    'B+': 3.3,
    'B': 3.0,
    'B-': 2.7,
    'C+': 2.3,
    'C': 2.0,
    'C-': 1.7,
    'D+': 1.3,
    'D': 1.0,
    'D-': 0.7,
    'F': 0.0
  };

  const GRADE_POINTS_STANDARD = {
    'A': 4.0,
    'B': 3.0,
    'C': 2.0,
    'D': 1.0,
    'F': 0.0
  };

  function roundSensible(num, maxDecimals = 3) {
    if (!isFinite(num)) return num;
    const factor = Math.pow(10, maxDecimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  }

  function getGradePoint(letter, usePlusMinus = true) {
    const cleanLetter = String(letter || '').trim().toUpperCase();
    if (usePlusMinus) {
      if (cleanLetter in GRADE_POINTS_PLUS_MINUS) {
        return GRADE_POINTS_PLUS_MINUS[cleanLetter];
      }
    } else {
      const baseLetter = cleanLetter.charAt(0);
      if (baseLetter in GRADE_POINTS_STANDARD) {
        return GRADE_POINTS_STANDARD[baseLetter];
      }
    }
    return null;
  }

  /**
   * Calculate GPA for a single list of courses:
   * courses: Array<{ name?: string, grade: string, credits: number }>
   */
  function calculateSemesterGpa(courses, usePlusMinus = true) {
    if (!Array.isArray(courses) || courses.length === 0) {
      return { totalCredits: 0, totalPoints: 0, gpa: 0, validCoursesCount: 0 };
    }

    let totalCredits = 0;
    let totalPoints = 0;
    let validCount = 0;

    for (const c of courses) {
      const credits = parseFloat(c.credits);
      const pt = getGradePoint(c.grade, usePlusMinus);

      if (isNaN(credits) || credits <= 0 || pt === null) {
        continue;
      }

      totalCredits += credits;
      totalPoints += (pt * credits);
      validCount++;
    }

    const gpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;

    return {
      totalCredits: roundSensible(totalCredits, 2),
      totalPoints: roundSensible(totalPoints, 3),
      gpa: roundSensible(gpa, 2),
      gpaFull: roundSensible(gpa, 3),
      validCoursesCount: validCount
    };
  }

  /**
   * Calculate Cumulative GPA across multiple semesters and optional prior history:
   * semesters: Array<{ name?: string, courses: Array<{ name, grade, credits }> }>
   * priorGpa: number (e.g. 3.65)
   * priorCredits: number (e.g. 45)
   */
  function calculateCumulativeGpa(semesters, priorGpa = 0, priorCredits = 0, usePlusMinus = true) {
    let grandCredits = 0;
    let grandPoints = 0;

    const pGpa = parseFloat(priorGpa);
    const pCred = parseFloat(priorCredits);

    if (!isNaN(pGpa) && !isNaN(pCred) && pCred > 0) {
      grandCredits += pCred;
      grandPoints += (pGpa * pCred);
    }

    const semesterResults = [];

    if (Array.isArray(semesters)) {
      for (let i = 0; i < semesters.length; i++) {
        const sem = semesters[i];
        const res = calculateSemesterGpa(sem.courses, usePlusMinus);
        semesterResults.push({
          name: sem.name || `Semester ${i + 1}`,
          ...res
        });
        grandCredits += res.totalCredits;
        grandPoints += res.totalPoints;
      }
    }

    const cumulativeGpa = grandCredits > 0 ? (grandPoints / grandCredits) : 0;

    return {
      priorGpa: !isNaN(pGpa) ? pGpa : 0,
      priorCredits: !isNaN(pCred) ? pCred : 0,
      cumulativeCredits: roundSensible(grandCredits, 2),
      cumulativePoints: roundSensible(grandPoints, 3),
      cumulativeGpa: roundSensible(cumulativeGpa, 2),
      cumulativeGpaFull: roundSensible(cumulativeGpa, 3),
      semesterResults
    };
  }

  return {
    GRADE_POINTS_PLUS_MINUS,
    GRADE_POINTS_STANDARD,
    roundSensible,
    getGradePoint,
    calculateSemesterGpa,
    calculateCumulativeGpa
  };
});
