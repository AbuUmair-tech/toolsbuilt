/**
 * Text Diff Checker worker: runs the diff off the main thread so large texts
 * never freeze the page. Same-origin only; the texts never leave the browser.
 */
/* global TextDiffLogic */
// The built logic.js starts with the English strings (window.I18N_DEFAULTS); workers have no window
self.window = self;
importScripts('/tools/text-diff-checker/logic.js');

self.onmessage = (e) => {
  const { id, oldText, newText, options } = e.data || {};
  try {
    const result = TextDiffLogic.diffTexts(oldText, newText, options);
    self.postMessage({ id, result });
  } catch (err) {
    // The page shows its own translated message when there is none
    self.postMessage({ id, error: true, message: (err && err.message) || '' });
  }
};
