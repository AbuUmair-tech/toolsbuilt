/**
 * Grade Calculator UI Controller
 * Manages weighted assignments table, live calculations, final exam targets, and clipboard copying.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.GradeCalculatorLogic;
  const tbody = document.getElementById('assignments-tbody');
  const addRowBtn = document.getElementById('add-assignment-btn');
  const targetGradeInput = document.getElementById('target-grade-val');
  const finalWeightInput = document.getElementById('final-weight-val');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const copyBtn = document.getElementById('copy-result-btn');

  let debounceTimer = null;
  let lastResultText = '';

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    document.querySelectorAll('#grade-calc-form input').forEach(inp => {
      inp.removeAttribute('aria-invalid');
    });
  }

  function showError(msg, targetInput) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    if (resultBox) resultBox.classList.remove('is-visible');
    if (targetInput) {
      targetInput.setAttribute('aria-invalid', 'true');
      targetInput.focus();
    }
  }

  function getAssignmentsFromDOM() {
    const rows = tbody.querySelectorAll('tr');
    const assignments = [];
    rows.forEach((row, idx) => {
      const nameInput = row.querySelector('.assign-name');
      const scoreInput = row.querySelector('.assign-score');
      const weightInput = row.querySelector('.assign-weight');

      const name = nameInput ? nameInput.value.trim() : `Item ${idx + 1}`;
      const score = scoreInput ? parseFloat(scoreInput.value) : NaN;
      const weight = weightInput ? parseFloat(weightInput.value) : NaN;

      if (!isNaN(score) && !isNaN(weight)) {
        assignments.push({ name, score, weight });
      }
    });
    return assignments;
  }

  function calculateAll() {
    clearError();
    const assignments = getAssignmentsFromDOM();

    if (assignments.length === 0) {
      if (resultBox) resultBox.classList.remove('is-visible');
      return;
    }

    try {
      const curRes = logic.calculateCurrentGrade(assignments);
      
      // Target grade calculations
      const targetGradeVal = parseFloat(targetGradeInput.value) || 90;
      let finalWeightVal = parseFloat(finalWeightInput.value);

      if (isNaN(finalWeightVal) || finalWeightVal <= 0) {
        // Auto default remaining weight
        const remaining = Math.max(0, 100 - curRes.totalWeight);
        finalWeightVal = remaining > 0 ? remaining : 20;
        finalWeightInput.value = finalWeightVal;
      }

      const finalRes = logic.calculateFinalExamNeeded(
        targetGradeVal,
        curRes.totalWeight,
        curRes.currentGrade,
        finalWeightVal
      );

      lastResultText = `Current Grade: ${curRes.currentGrade}% (${curRes.letterGrade}) across ${curRes.totalWeight}% completed course weight. Target Grade: ${targetGradeVal}%. Needed on Final (${finalWeightVal}% weight): ${finalRes.neededScore}%.`;

      renderResult(curRes, finalRes);
    } catch (err) {
      showError(err.message);
    }
  }

  function renderResult(curRes, finalRes) {
    if (!resultBox) return;
    resultBox.classList.add('is-visible');

    const primaryEl = document.getElementById('result-primary-text');
    const headerEl = document.getElementById('result-header-text');
    const statsGrid = document.getElementById('result-stats-grid');
    const formulaBox = document.getElementById('formula-explanation');

    if (headerEl) headerEl.textContent = 'Current Grade & Final Target';
    if (primaryEl) {
      primaryEl.textContent = `${curRes.currentGrade}% (${curRes.letterGrade})`;
    }

    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="result-stat-card">
          <span class="stat-label">Current Grade</span>
          <span class="stat-value">${curRes.currentGrade}% (${curRes.letterGrade})</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">Weight Completed</span>
          <span class="stat-value">${curRes.totalWeight}%</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">Target Overall Grade</span>
          <span class="stat-value">${finalRes.targetGrade}%</span>
        </div>
        <div class="result-stat-card" style="border-left: 3px solid var(--accent-primary);">
          <span class="stat-label">Score Needed on Final</span>
          <span class="stat-value" style="color: var(--accent-primary);">${finalRes.neededScore}%</span>
        </div>
      `;
    }

    if (formulaBox) {
      formulaBox.innerHTML = `
        <strong>Final Exam Guidance:</strong>
        <p style="margin: 0.35rem 0 0.5rem 0;">${finalRes.message}</p>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Formula: Required Final = [Target × (Completed W + Final W) - Current Points] ÷ Final W<br>
          Calculation: [${finalRes.targetGrade} × ${curRes.totalWeight + finalRes.finalWeight}% - ${curRes.totalPoints}] ÷ ${finalRes.finalWeight}% = <strong>${finalRes.neededScore}%</strong>
        </div>
      `;
      formulaBox.classList.remove('hidden');
    }

    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) {
      actionCopyBtn.setAttribute('data-copy-text', lastResultText);
    }
  }

  function createAssignmentRow(name = '', score = '', weight = '') {
    const tr = document.createElement('tr');
    const rowId = `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    tr.innerHTML = `
      <td>
        <input type="text" class="form-control assign-name" placeholder="e.g. Project 1" value="${name}" aria-label="Assignment Name">
      </td>
      <td>
        <input type="number" step="any" min="0" max="200" class="form-control assign-score" placeholder="90" value="${score}" required aria-label="Grade Percentage">
      </td>
      <td>
        <input type="number" step="any" min="0" max="100" class="form-control assign-weight" placeholder="20" value="${weight}" required aria-label="Weight Percentage">
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn btn-sm btn-ghost remove-row-btn" aria-label="Remove assignment row" title="Remove assignment row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </td>
    `;

    tr.querySelector('.remove-row-btn').addEventListener('click', () => {
      const allRows = tbody.querySelectorAll('tr');
      if (allRows.length > 1) {
        tr.remove();
        triggerDebounced();
      } else {
        showError('You must keep at least one assignment row.');
      }
    });

    return tr;
  }

  function triggerDebounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      calculateAll();
    }, 150);
  }

  // Add row button
  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      const newRow = createAssignmentRow('', '', '');
      tbody.appendChild(newRow);
      const nameInp = newRow.querySelector('.assign-name');
      if (nameInp) nameInp.focus();
      triggerDebounced();
    });
  }

  // Listen to input changes in table and targets
  const form = document.getElementById('grade-calc-form');
  if (form) {
    form.addEventListener('input', triggerDebounced);
    form.addEventListener('change', triggerDebounced);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearTimeout(debounceTimer);
      calculateAll();
    });
  }

  // Reset button
  const resetBtn = document.getElementById('reset-grade-form');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      tbody.innerHTML = '';
      tbody.appendChild(createAssignmentRow('Homework', 95, 20));
      tbody.appendChild(createAssignmentRow('Midterm Exam', 82, 25));
      tbody.appendChild(createAssignmentRow('Class Project', 90, 15));
      tbody.appendChild(createAssignmentRow('Quizzes', 88, 10));
      targetGradeInput.value = 90;
      finalWeightInput.value = 30;
      clearError();
      calculateAll();
    });
  }

  // Global action reset
  const globalResetBtn = document.getElementById('action-reset-btn');
  if (globalResetBtn) {
    globalResetBtn.addEventListener('click', () => {
      if (resetBtn) resetBtn.click();
    });
  }

  // Copy result button
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!lastResultText) return;
      try {
        await navigator.clipboard.writeText(lastResultText);
        const origText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span>Copied!</span>';
        setTimeout(() => { copyBtn.innerHTML = origText; }, 2000);
      } catch (e) {
        console.error('Copy failed:', e);
      }
    });
  }

  // Attach delete handlers for initial rows
  tbody.querySelectorAll('.remove-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      const allRows = tbody.querySelectorAll('tr');
      if (allRows.length > 1) {
        tr.remove();
        triggerDebounced();
      } else {
        showError('You must keep at least one assignment row.');
      }
    });
  });

  // Initial calculation
  calculateAll();
});
