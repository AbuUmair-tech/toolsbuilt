/**
 * Text Case Converter Script
 * Converts text into UPPERCASE, lowercase, Title Case, Sentence case,
 * camelCase, snake_case, kebab-case, and aLtErNaTiNg case with copy & clear actions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const textInput = document.getElementById('text-input');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');
  const copyFeedback = document.getElementById('copy-feedback');
  const caseButtons = document.querySelectorAll('.case-btn');

  caseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-case');
      if (!textInput.value) return;

      textInput.value = convertCase(textInput.value, mode);
    });
  });

  clearBtn.addEventListener('click', () => {
    textInput.value = '';
    textInput.focus();
  });

  copyBtn.addEventListener('click', async () => {
    if (!textInput.value) return;
    try {
      await navigator.clipboard.writeText(textInput.value);
      copyFeedback.classList.remove('hidden');
      setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
    } catch (err) {
      textInput.select();
      document.execCommand('copy');
      copyFeedback.classList.remove('hidden');
      setTimeout(() => copyFeedback.classList.add('hidden'), 2000);
    }
  });

  function convertCase(text, mode) {
    switch (mode) {
      case 'upper':
        return text.toUpperCase();

      case 'lower':
        return text.toLowerCase();

      case 'title':
        return text.toLowerCase().replace(/(?:^|\s|-|_|\/)\S/g, (m) => m.toUpperCase());

      case 'sentence':
        return text.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());

      case 'camel':
        return text
          .trim()
          .replace(/[^a-zA-Z0-9\s-_]/g, '')
          .replace(/[-_]/g, ' ')
          .toLowerCase()
          .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
          .replace(/\s+/g, '');

      case 'snake':
        return text
          .trim()
          .replace(/[^a-zA-Z0-9\s-_]/g, '')
          .replace(/[-]/g, ' ')
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .join('_');

      case 'kebab':
        return text
          .trim()
          .replace(/[^a-zA-Z0-9\s-_]/g, '')
          .replace(/[_]/g, ' ')
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .join('-');

      case 'alternating':
        return text
          .split('')
          .map((char, index) => index % 2 === 0 ? char.toLowerCase() : char.toUpperCase())
          .join('');

      default:
        return text;
    }
  }
});
