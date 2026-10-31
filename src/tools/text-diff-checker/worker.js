/**
 * Text Diff Checker worker: runs the diff off the main thread so large texts
 * never freeze the page. Same-origin only; the texts never leave the browser.
 */
/* global TextDiffLogic */
importScripts('/tools/text-diff-checker/logic.js');

self.onmessage = (e) => {
  const { id, oldText, newText, options } = e.data || {};
  try {
    const result = TextDiffLogic.diffTexts(oldText, newText, options);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: (err && err.message) || 'The comparison failed.' });
  }
};
