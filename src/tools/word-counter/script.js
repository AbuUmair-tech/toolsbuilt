/**
 * Word & Character Counter UI Controller
 * Powered by WordCounterLogic pure engine.
 * Privacy-first: Does not persist user-entered text to localStorage or URLs.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.WordCounterLogic;
  const T = ToolsBuilt.scope('word-counter');
  const textInput = document.getElementById('text-input');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');
  const copyStatsBtn = document.getElementById('copy-stats-btn');

  const statWords = document.getElementById('stat-words');
  const statCharsWithSpace = document.getElementById('stat-chars-space');
  const statCharsNoSpace = document.getElementById('stat-chars-nospace');
  const statSentences = document.getElementById('stat-sentences');
  const statParagraphs = document.getElementById('stat-paragraphs');
  const statReadingTime = document.getElementById('stat-reading-time');
  const statSpeakingTime = document.getElementById('stat-speaking-time');
  const topWordsList = document.getElementById('top-words-list');

  let debounceTimer = null;
  let currentStats = null;

  function updateCounts() {
    const text = textInput.value;
    const res = logic.analyzeText(text);
    currentStats = res;

    const numFmt = new Intl.NumberFormat(ToolsBuilt.pageLocale('en-US'));
    statWords.textContent = numFmt.format(res.words);
    statCharsWithSpace.textContent = numFmt.format(res.characters);
    statCharsNoSpace.textContent = numFmt.format(res.charactersNoSpaces);
    statSentences.textContent = numFmt.format(res.sentences);
    statParagraphs.textContent = numFmt.format(res.paragraphs);
    statReadingTime.textContent = res.readingTime;
    statSpeakingTime.textContent = res.speakingTime;

    if (topWordsList) {
      if (res.topWords.length === 0) {
        topWordsList.innerHTML = `<li class="text-muted text-secondary text-sm">${T('topWords.empty')}</li>`;
      } else {
        topWordsList.innerHTML = res.topWords.map(item => `
          <li class="flex justify-between py-1 border-b text-sm">
            <span class="font-medium">${item.word}</span>
            <span class="text-secondary">${numFmt.format(item.count)} (${item.percentage}%)</span>
          </li>
        `).join('');
      }
    }
  }

  function debouncedUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateCounts, 100);
  }

  textInput.addEventListener('input', debouncedUpdate);

  clearBtn.addEventListener('click', () => {
    textInput.value = '';
    updateCounts();
    textInput.focus();
  });

  copyBtn.addEventListener('click', () => {
    if (!textInput.value) return;
    if (window.ToolsBuilt && window.ToolsBuilt.copy) {
      window.ToolsBuilt.copy(textInput.value, T('copy.text'));
    }
  });

  if (copyStatsBtn) {
    copyStatsBtn.addEventListener('click', () => {
      if (!currentStats) return;
      const s = currentStats;
      const summary = T('copy.summary', s);
      if (window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(summary, T('copy.stats'));
      }
    });
  }

  // Initial calculation
  updateCounts();
});
