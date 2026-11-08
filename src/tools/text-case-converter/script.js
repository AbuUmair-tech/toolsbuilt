/**
 * Text Case Converter UI Controller
 * Powered by CaseConverterLogic pure engine.
 * Supports 12 case styles, undo history, live statistics, and clipboard copying.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.CaseConverterLogic;
  const T = ToolsBuilt.scope('text-case-converter');
  const textInput = document.getElementById('text-input');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');
  const undoBtn = document.getElementById('undo-btn');
  const caseButtons = document.querySelectorAll('.case-btn');
  const charStats = document.getElementById('char-stats');

  // History stack for undo
  const history = [];

  function updateStats() {
    if (!charStats) return;
    const text = textInput.value;
    const stats = logic.getStats(text);
    const numFmt = new Intl.NumberFormat(ToolsBuilt.pageLocale('en-US'));
    charStats.textContent = T('stats', {
      characters: numFmt.format(stats.characters),
      noSpaces: numFmt.format(stats.charactersNoSpaces),
      words: numFmt.format(stats.words),
      lines: numFmt.format(stats.lines)
    });
  }

  function pushHistory(val) {
    if (history.length === 0 || history[history.length - 1] !== val) {
      history.push(val);
      if (history.length > 20) history.shift();
      if (undoBtn) undoBtn.disabled = false;
    }
  }

  caseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-case');
      const current = textInput.value;
      if (!current) return;

      pushHistory(current);
      const converted = logic.convertCase(current, mode);
      textInput.value = converted;
      updateStats();

      if (window.ToolsBuilt && window.ToolsBuilt.toast) {
        window.ToolsBuilt.toast(T('toast.converted', { style: btn.textContent.trim() }));
      }
    });
  });

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (history.length > 0) {
        const prev = history.pop();
        textInput.value = prev;
        updateStats();
        if (history.length === 0) undoBtn.disabled = true;
        if (window.ToolsBuilt && window.ToolsBuilt.toast) {
          window.ToolsBuilt.toast(T('toast.restored'));
        }
      }
    });
  }

  clearBtn.addEventListener('click', () => {
    if (textInput.value) {
      pushHistory(textInput.value);
    }
    textInput.value = '';
    updateStats();
    textInput.focus();
  });

  copyBtn.addEventListener('click', () => {
    if (!textInput.value) return;
    if (window.ToolsBuilt && window.ToolsBuilt.copy) {
      window.ToolsBuilt.copy(textInput.value, T('toast.copied'));
    }
  });

  textInput.addEventListener('input', () => {
    updateStats();
  });

  // Initial stats
  updateStats();
});
