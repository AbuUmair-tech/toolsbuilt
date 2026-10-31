/**
 * Password Strength Checker worker: loads the self-hosted zxcvbn-ts builds and
 * scores passwords off the main thread (a check can take up to about a second).
 * Same-origin only. Passwords exist only in memory for the length of a check:
 * they are never logged, stored or sent anywhere.
 */
/* global PasswordStrengthLogic */
let checker = null;

self.onmessage = (e) => {
  const msg = e.data || {};
  if (msg.type === 'init') {
    try {
      const scripts = (msg.scripts || []).filter(src => typeof src === 'string' && /^\/assets\/vendor\/zxcvbn-ts-[\w.-]+\/zxcvbn-ts\.js$/.test(src));
      if (scripts.length !== 3) throw new Error('The password checker files are missing.');
      importScripts(...scripts, '/tools/password-strength-checker/logic.js');
      checker = PasswordStrengthLogic.createChecker(self.zxcvbnts);
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'failed', error: (err && err.message) || 'The password checker could not load.' });
    }
    return;
  }
  if (msg.type === 'check') {
    if (!checker) return;
    try {
      self.postMessage({ type: 'result', id: msg.id, result: checker.check(msg.password) });
    } catch (err) {
      self.postMessage({ type: 'result', id: msg.id, error: 'This password could not be checked.' });
    }
  }
};
