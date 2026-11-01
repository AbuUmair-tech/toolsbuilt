/**
 * GPA Calculator UI Controller
 * Manages multiple semesters, courses, credit weighting, plus/minus toggling, and cumulative GPA.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logic = window.GpaCalculatorLogic;
  const T = ToolsBuilt.scope('gpa-calculator');
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
      <option value="${g}" ${g === cleanSelected ? 'selected' : ''}>${T('gradeOption', { grade: g, points: logic.getGradePoint(g, usePlusMinus).toFixed(1) })}</option>
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
      <td class="p-2">
        <input type="text" class="form-control course-name" placeholder="${T('course.placeholder')}" value="${name}" aria-label="${T('course.nameLabel')}">
      </td>
      <td class="p-2">
        <select class="form-control course-grade" aria-label="${T('course.gradeLabel')}">
          ${getGradeOptionsHtml(grade)}
        </select>
      </td>
      <td class="p-2">
        <input type="number" step="any" min="0.5" max="30" class="form-control course-credits" placeholder="3" value="${credits}" required aria-label="${T('course.creditsLabel')}">
      </td>
      <td class="p-2 text-center">
        <button type="button" class="btn btn-sm btn-ghost remove-course-btn" aria-label="${T('course.remove')}" title="${T('course.remove')}">
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
        showError(T('errors.keepOneCourse'));
      }
    });

    return tr;
  }

  function createSemesterCard(title, initialCourses = []) {
    const semId = `semester-${semesterCounter++}`;
    const card = document.createElement('div');
    card.className = 'semester-card';
    card.id = semId;
    card.classList.add('panel-card', 'mb-6');

    card.innerHTML = `
      <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <input type="text" class="form-control semester-title w-col-xl font-bold text-md" value="${title}" aria-label="${T('semester.titleLabel')}">
          <span class="badge semester-gpa-badge bg-muted py-1 px-2 rounded-md text-sm font-semibold">${T('semester.badgeEmpty')}</span>
        </div>
        <button type="button" class="btn btn-sm btn-ghost remove-semester-btn" aria-label="${T('semester.removeLabel', { title })}" title="${T('semester.removeTitle')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          ${T('semester.remove')}
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="table table-min">
          <thead>
            <tr class="text-left">
              <th scope="col" class="p-2 text-sm">${T('semester.thCourse')}</th>
              <th scope="col" class="p-2 text-sm w-col-lg">${T('semester.thGrade')}</th>
              <th scope="col" class="p-2 text-sm w-col-md">${T('semester.thCredits')}</th>
              <th scope="col" class="p-2 text-sm w-col-sm text-center">${T('semester.thAction')}</th>
            </tr>
          </thead>
          <tbody class="courses-tbody"></tbody>
        </table>
      </div>

      <button type="button" class="btn btn-sm btn-secondary add-course-btn mt-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        ${T('semester.addCourse')}
      </button>
    `;

    const tbody = card.querySelector('.courses-tbody');
    if (initialCourses && initialCourses.length > 0) {
      initialCourses.forEach(c => tbody.appendChild(createCourseRow(c.name, c.grade, c.credits)));
    } else {
      tbody.appendChild(createCourseRow(T('courseName', { n: 1 }), 'A', 3));
      tbody.appendChild(createCourseRow(T('courseName', { n: 2 }), 'B+', 3));
      tbody.appendChild(createCourseRow(T('courseName', { n: 3 }), 'A-', 4));
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
        showError(T('errors.keepOneSemester'));
      }
    });

    return card;
  }

  function getSemestersDataFromDOM() {
    const cards = semestersContainer.querySelectorAll('.semester-card');
    const semesters = [];

    cards.forEach((card, idx) => {
      const titleInput = card.querySelector('.semester-title');
      const title = titleInput ? titleInput.value.trim() : T('semesterName', { n: idx + 1 });
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
        badge.textContent = T('semester.badge', { gpa: termRes.gpa.toFixed(2), credits: termRes.totalCredits });
      }
    });

    lastResultText = T('copy.text', { gpa: res.cumulativeGpa.toFixed(2), credits: res.cumulativeCredits, points: res.cumulativePoints.toFixed(1) });

    renderResult(res);
  }

  function renderResult(res) {
    if (!resultBox) return;
    resultBox.classList.add('is-visible');

    const primaryEl = document.getElementById('result-primary-text');
    const headerEl = document.getElementById('result-header-text');
    const statsGrid = document.getElementById('result-stats-grid');
    const formulaBox = document.getElementById('formula-explanation');

    if (headerEl) headerEl.textContent = T('result.header');
    if (primaryEl) {
      primaryEl.textContent = T('result.primary', { gpa: res.cumulativeGpa.toFixed(2) });
    }

    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="result-stat-card">
          <span class="stat-label">${T('stats.cumulativeGpa')}</span>
          <span class="stat-value text-accent font-extrabold">${res.cumulativeGpa.toFixed(2)}</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">${T('stats.totalCredits')}</span>
          <span class="stat-value">${T('stats.creditsValue', { credits: res.cumulativeCredits })}</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">${T('stats.totalPoints')}</span>
          <span class="stat-value">${T('stats.pointsValue', { points: res.cumulativePoints.toFixed(2) })}</span>
        </div>
        <div class="result-stat-card">
          <span class="stat-label">${T('stats.exactGpa')}</span>
          <span class="stat-value">${res.cumulativeGpaFull.toFixed(3)}</span>
        </div>
      `;
    }

    if (formulaBox) {
      const termsList = res.semesterResults.map(t => T('breakdown.term', { name: t.name, gpa: t.gpa.toFixed(2), credits: t.totalCredits, points: t.totalPoints.toFixed(1) })).join('');
      formulaBox.innerHTML = `
        ${T('breakdown.heading')}
        <ul class="mt-2 mb-2 ml-4 p-0">
          ${res.priorCredits > 0 ? T('breakdown.prior', { gpa: res.priorGpa.toFixed(2), credits: res.priorCredits, points: (res.priorGpa * res.priorCredits).toFixed(1) }) : ''}
          ${termsList}
        </ul>
        <div class="text-sm text-secondary">
          ${T('breakdown.formula', { points: res.cumulativePoints.toFixed(2), credits: res.cumulativeCredits, gpa: res.cumulativeGpa.toFixed(2) })}
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
      const card = createSemesterCard(T('semesterName', { n: count }), [
        { name: T('courseName', { n: 1 }), grade: 'A', credits: 3 },
        { name: T('courseName', { n: 2 }), grade: 'A', credits: 3 },
        { name: T('courseName', { n: 3 }), grade: 'B+', credits: 3 }
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
        copyBtn.innerHTML = T('copy.copied');
        setTimeout(() => { copyBtn.innerHTML = origText; }, 2000);
      } catch (e) {
        console.error('Copy failed:', e);
      }
    });
  }

  function initDefaultSemesters() {
    const sem1 = createSemesterCard(T('semesterName', { n: 1 }), [
      { name: T('defaults.english'), grade: 'A', credits: 3 },
      { name: T('defaults.calculus'), grade: 'B+', credits: 4 },
      { name: T('defaults.psychology'), grade: 'A', credits: 3 },
      { name: T('defaults.computerScience'), grade: 'A-', credits: 4 }
    ]);
    semestersContainer.appendChild(sem1);
  }

  // Initialize
  initDefaultSemesters();
  calculateAll();
});
