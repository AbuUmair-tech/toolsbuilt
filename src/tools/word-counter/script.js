/**
 * Word & Character Counter Script
 * Live counter for words, characters (with/without spaces), sentences, paragraphs,
 * reading/speaking time, top 5 most used words (excluding stop words), copy & clear.
 */

document.addEventListener('DOMContentLoaded', () => {
  const textInput = document.getElementById('text-input');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');
  const copyFeedback = document.getElementById('copy-feedback');

  // Stats elements
  const statWords = document.getElementById('stat-words');
  const statCharsWithSpace = document.getElementById('stat-chars-space');
  const statCharsNoSpace = document.getElementById('stat-chars-nospace');
  const statSentences = document.getElementById('stat-sentences');
  const statParagraphs = document.getElementById('stat-paragraphs');
  const statReadingTime = document.getElementById('stat-reading-time');
  const statSpeakingTime = document.getElementById('stat-speaking-time');
  const topWordsList = document.getElementById('top-words-list');

  // English Stop Words List
  const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
    'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
    'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
    'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
    'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
    'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
    'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
    'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
    'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
    'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
    'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
    'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  textInput.addEventListener('input', updateCounts);

  clearBtn.addEventListener('click', () => {
    textInput.value = '';
    updateCounts();
    textInput.focus();
  });

  copyBtn.addEventListener('click', async () => {
    if (!textInput.value) return;
    try {
      await navigator.clipboard.writeText(textInput.value);
      copyFeedback.classList.remove('hidden');
      setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
    } catch (err) {
      // Fallback selection
      textInput.select();
      document.execCommand('copy');
      copyFeedback.classList.remove('hidden');
      setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
    }
  });

  function updateCounts() {
    const text = textInput.value;

    // Characters
    const charCountWithSpace = text.length;
    const charCountNoSpace = text.replace(/\s/g, '').length;

    // Words
    const trimmed = text.trim();
    const wordsArray = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    const wordCount = wordsArray.length;

    // Sentences (split on . ! ?)
    const sentencesArray = trimmed ? text.split(/[.!?]+/).filter(s => s.trim().length > 0) : [];
    const sentenceCount = sentencesArray.length;

    // Paragraphs (split on double newlines or lines containing non-whitespace)
    const paragraphsArray = trimmed ? text.split(/\n+/).filter(p => p.trim().length > 0) : [];
    const paragraphCount = paragraphsArray.length;

    // Reading & Speaking Time
    // Reading average: 200 wpm, Speaking average: 130 wpm
    const readingMinutes = wordCount / 200;
    const speakingMinutes = wordCount / 130;

    statWords.textContent = wordCount.toLocaleString();
    statCharsWithSpace.textContent = charCountWithSpace.toLocaleString();
    statCharsNoSpace.textContent = charCountNoSpace.toLocaleString();
    statSentences.textContent = sentenceCount.toLocaleString();
    statParagraphs.textContent = paragraphCount.toLocaleString();
    statReadingTime.textContent = formatDuration(readingMinutes);
    statSpeakingTime.textContent = formatDuration(speakingMinutes);

    // Compute Top 5 Words (excluding stop words)
    updateTopWords(wordsArray);
  }

  function formatDuration(minutes) {
    if (minutes === 0) return '0 sec';
    const totalSeconds = Math.round(minutes * 60);
    if (totalSeconds < 60) {
      return `${totalSeconds} sec`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  }

  function updateTopWords(words) {
    if (!words.length) {
      topWordsList.innerHTML = '<li style="color: var(--text-subtle); font-size: 0.9rem;">Type or paste text to see keyword density.</li>';
      return;
    }

    const freqMap = {};
    words.forEach(w => {
      const clean = w.toLowerCase().replace(/[^a-z0-9']/g, '');
      if (clean.length > 1 && !STOP_WORDS.has(clean)) {
        freqMap[clean] = (freqMap[clean] || 0) + 1;
      }
    });

    const sorted = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (!sorted.length) {
      topWordsList.innerHTML = '<li style="color: var(--text-subtle); font-size: 0.9rem;">No significant keywords detected.</li>';
      return;
    }

    topWordsList.innerHTML = sorted.map(([word, count]) => `
      <li style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.925rem;">
        <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(word)}</span>
        <span style="color: var(--primary); font-weight: 700;">${count} occurrence${count === 1 ? '' : 's'}</span>
      </li>
    `).join('');
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Run initial update
  updateCounts();
});
