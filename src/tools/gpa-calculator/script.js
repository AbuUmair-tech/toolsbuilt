/**
 * GPA Calculator UI Controller
 * Manages multiple semesters, courses, credit weighting, plus/minus toggling, and cumulative GPA.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.GpaCalculatorLogic;
  const semestersContainer = document.getElementById('semesters-container');
  const addSemesterBtn = document.getElementById('add-semester-btn');
  const togglePlusMinus = document.getElementById('toggle-plus-minus');
  const priorGpaInput = document.getElementById('prior-gpa-val');
  const priorCreditsInput = document.getElementById('prior-credits-val');
  const resultBox = document.getElementById('result-box');
  const errorBox = document.getElementById('error-box');
  const copyBtn = document.getElementById('copy-result-btn');

  let debounceTimer = null;
  let lastResultText = '';
  let semesterCounter = 1;

  const PLUS_MINUS_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
  const STANDARD_GRADES = ['A', 'B', 'C', 'D', 'F'];

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    document.querySelectorAll('#gpa-form input').forEach(inp => {
      inp.removeAttribute('aria-invalid');
    });
  }

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function getGradeOptionsHtml(selectedGrade = 'A') {
    const usePlusMinus = togglePlusMinus ? togglePlusMinus.checked : true;
    const list = usePlusMinus ? PLUS_MINUS_GRADES : STANDARD_GRADES;
    let cleanSelected = selectedGrade;
    if (!usePlusMinus && cleanSelected.length > 1) {
      cleanSelected = cleanSelected.charAt(0);
    }

    return list.map(g => `
      <option value="${g}" ${g === cleanSelected ? 'selected' : ''}>${g} (${logic.getGradePoint(g, usePlusMinus).toFixed(1)} pts)</option>
    `).join('');
  }

  function updateAllGradeSelects() {
    const selects = semestersContainer.querySelectorAll('.course-grade');
    selects.forEach(sel => {
      const currentVal = sel.value;
      sel.innerHTML = getGradeOptionsHtml(currentVal);
    });
  }

  function createCourseRow(name = '', grade = 'A', credits = 3) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding: 0.5rem;">
        <input type="text" class="form-control course-name" placeholder="e.g. Calculus I" value="${name}" aria-label="Course Name">
      </td>
      <td style="padding: 0.5rem;">
        <select class="form-control course-grade" aria-label="Course Grade">
          ${getGradeOptionsHtml(grade)}
        </select>
      </td>
      <td style="padding: 0.5rem;">
        <input type="number" step="any" min="0.5" max="30" class="form-control course-credits" placeholder="3" value="${credits}" required aria-label="Course Credits">
      </td>
      <td style="padding: 0.5rem; text-align: center;">
        <button type="button" class="btn btn-sm btn-ghost remove-course-btn" aria-label="Remove Course" title="Remove Course">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </td>
    `;

    tr.querySelector('.remove-course-btn').addEventListener('click', () => {
      const tbody = tr.closest('tbody');
      if (tbody.querySelectorAll('tr').length > 1) {
        tr.remove();
        triggerDebounced();
      } else {
        showError('Each semester must have at least one course row.');
      }
    });

    return tr;
  }

  function createSemesterCard(title, initialCourses = []) {
    const semId = `semester-${semesterCounter++}`;
    const card = document.createElement('div');
    card.className = 'semester-card';
    card.id = semId;
    card.style.cssText = 'background: var(--surface-default); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <input type="text" class="form-control semester-title" value="${title}" aria-label="Semester Title" style="font-weight: 700; width: 180px; font-size: 1.05rem;">
          <span class="badge semester-gpa-badge" style="background: var(--surface-muted); padding: 0.25rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600;">Term GPA: --</span>
        </div>
        <button type="button" class="btn btn-sm btn-ghost remove-semester-btn" aria-label="Remove ${title}" title="Remove this semester">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Remove Term
        </button>
      </div>

      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse; min-width: 440px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); text-align: left;">
              <th scope="col" style="padding: 0.5rem; font-size: 0.85rem;">Course Title</th>
              <th scope="col" style="padding: 0.5rem; font-size: 0.85rem; width: 140px;">Grade</th>
              <th scope="col" style="padding: 0.5rem; font-size: 0.85rem; width: 100px;">Credits</th>
              <th scope="col" style="padding: 0.5rem; font-size: 0.85rem; width: 50px; text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody class="courses-tbody"></tbody>
        </table>
      </div>

      <button type="button" class="btn btn-sm btn-secondary add-course-btn" style="margin-top: 1rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Course
      </button>
    `;

    const tbody = card.querySelector('.courses-tbody');
    if (initialCourses && initialCourses.length > 0) {
      initialCourses.forEach(c => tbody.appendChild(createCourseRow(c.name, c.grade, c.credits)));
    } else {
      tbody.appendChild(createCourseRow('Course 1', 'A', 3));
      tbody.appendChild(createCourseRow('Course 2', 'B+', 3));
      tbody.appendChild(createCourseRow('Course 3', 'A-', 4));
    }

    card.querySelector('.add-course-btn').addEventListener('click', () => {
      tbody.appendChild(createCourseRow('', 'A', 3));
      triggerDebounced();
    });

    card.querySelector('.remove-semester-btn').addEventListener('click', () => {
      const allCards = semestersContainer.querySelectorAll('.semester-card');
      if (allCards.length > 1) {
        card.remove();
        triggerDebounced();
      } else {
        showError('You must maintain at least one semester.');
      }
    });

    return card;
  }

  function getSemestersDataFromDOM() {
    const cards = semestersContainer.querySelectorAll('.semester-card');
    const semesters = [];

    cards.forEach((card, idx) => {
      const titleInput = card.querySelector('.semester-title');
      const title = titleInput ? titleInput.value.trim() : `Semester ${idx + 1}`;
      const rows = card.querySelectorAll('.courses-tbody tr');
      const courses = [];

      rows.forEach(r => {
        const name = r.querySelector('.course-name').value.trim();
        const grade = r.querySelector('.course-grade').value;
        const credits = parseFloat(r.querySelector('.course-credits').value);
        if (!isNaN(credits)) {
          courses.push({ name, grade, credits });
        }
      });

      semesters.push({ name: title, courses, cardElement: card });
    });

    return semesters;
  }

  function calculateAll() {
    clearError();
    const usePlusMinus = togglePlusMinus ? togglePlusMinus.checked : true;
    const semesters = getSemestersDataFromDOM();

    const priorGpa = priorGpaInput ? parseFloat(priorGpaInput.value) : 0;
    const priorCredits = priorCreditsInput ? parseFloat(priorCreditsInput.value) : 0;

    const res = logic.calculateCumulativeGpa(semesters, priorGpa, priorCredits, usePlusMinus);

    // Update term GPA badges
    semesters.forEach((sem, idx) => {
      const termRes = res.semesterResults[idx];
      const badge = sem.cardElement.querySelector('.semester-gpa-badge');
      if (badge && termRes) {
        badge.textContent = `Term GPA: ${termRes.gpa.toFixed(2)} (${termRes.totalCredits} cr)`;
      }
    });

    lastResultText = `Cumulative GPA: ${res.cumulativeGpa.toFixed(2)} across ${res.cumulativeCredits} total credit hours (${res.cumulativePoints.toFixed(1)} grade points).`;

    renderResult(res);
  }

  function renderResult(res) {
    if (!resultBox) return;
    resultBox.classList.add('is-visible');

    const primaryEl = document.getElementById('result-primary-text');
    const headerEl = document.getElementById('result-header-text');
    const statsGrid = document.getElementById('result-stats-grid');
    const formulaBox = document.getElementById('formula-explanation');

    if (headerEl) headerEl.textContent = 'Cumulative GPA Result';
    if (primaryEl) {
      primaryEl.textContent = `${res.cumulativeGpa.toFixed(2)} / 4.00`;
    }

    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="result-stat-card">
          <span class="stat-label">Cumulative GPA</span>
          <span class="stat-value" style="color: var(--accent-primary); font-weight: 800;">${res.cumulativeGpa.toFixed(2)}</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">Total Credit Hours</span>
          <span class="stat-value">${res.cumulativeCredits} cr</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">Total Grade Points</span>
          <span class="stat-value">${res.cumulativePoints.toFixed(2)} pts</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">3-Decimal Exact GPA</span>
          <span class="stat-value">${res.cumulativeGpaFull.toFixed(3)}</span>
        </div>
      `;
    }

    if (formulaBox) {
      const termsList = res.semesterResults.map(t => `<li><strong>${t.name}:</strong> GPA ${t.gpa.toFixed(2)} (${t.totalCredits} credits, ${t.totalPoints.toFixed(1)} points)</li>`).join('');
      formulaBox.innerHTML = `
        <strong>Semester Breakdown &amp; Academic Details:</strong>
        <ul style="margin: 0.5rem 0 0.5rem 1.25rem; padding: 0;">
          ${res.priorCredits > 0 ? `<li><strong>Prior Academic History:</strong> GPA ${res.priorGpa.toFixed(2)} (${res.priorCredits} credits, ${(res.priorGpa * res.priorCredits).toFixed(1)} points)</li>` : ''}
          ${termsList}
        </ul>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Formula: Cumulative GPA = Total Grade Points (${res.cumulativePoints.toFixed(2)}) ÷ Total Credit Hours (${res.cumulativeCredits}) = <strong>${res.cumulativeGpa.toFixed(2)}</strong>.
        </div>
      `;
      formulaBox.classList.remove('hidden');
    }

    const actionCopyBtn = document.getElementById('action-copy-btn');
    if (actionCopyBtn) {
      actionCopyBtn.setAttribute('data-copy-text', lastResultText);
    }
  }

  function triggerDebounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      calculateAll();
    }, 150);
  }

  // Toggle Plus/Minus
  if (togglePlusMinus) {
    togglePlusMinus.addEventListener('change', () => {
      updateAllGradeSelects();
      triggerDebounced();
    });
  }

  // Add semester button
  if (addSemesterBtn) {
    addSemesterBtn.addEventListener('click', () => {
      const count = semestersContainer.querySelectorAll('.semester-card').length + 1;
      const card = createSemesterCard(`Semester ${count}`, [
        { name: 'Course 1', grade: 'A', credits: 3 },
        { name: 'Course 2', grade: 'A', credits: 3 },
        { name: 'Course 3', grade: 'B+', credits: 3 }
      ]);
      semestersContainer.appendChild(card);
      triggerDebounced();
    });
  }

  // Form input listeners
  const form = document.getElementById('gpa-form');
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
  const resetBtn = document.getElementById('reset-gpa-form');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      semestersContainer.innerHTML = '';
      if (priorGpaInput) priorGpaInput.value = '';
      if (priorCreditsInput) priorCreditsInput.value = '';
      if (togglePlusMinus) togglePlusMinus.checked = true;
      semesterCounter = 1;
      initDefaultSemesters();
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

  function initDefaultSemesters() {
    const sem1 = createSemesterCard('Semester 1', [
      { name: 'English Composition', grade: 'A', credits: 3 },
      { name: 'Calculus I', grade: 'B+', credits: 4 },
      { name: 'Introduction to Psychology', grade: 'A', credits: 3 },
      { name: 'Computer Science I', grade: 'A-', credits: 4 }
    ]);
    semestersContainer.appendChild(sem1);
  }

  // Initialize
  initDefaultSemesters();
  calculateAll();
});
