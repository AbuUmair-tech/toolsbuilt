/**
 * Coin Flip & Dice Roller UI Controller
 * Powered by CoinDiceLogic (crypto.getRandomValues + rejection sampling).
 * Coin and dice modes, a short animation (skipped for reduced motion) and a
 * history of the last 20 results kept on this page.
 */
document.addEventListener('DOMContentLoaded', () => {
  const logic = window.CoinDiceLogic;
  const T = ToolsBuilt.scope('coin-flip-dice-roller');
  const form = document.getElementById('calculator-form');
  const tabBtns = Array.from(document.querySelectorAll('.mode-tab-btn'));
  const modeInput = document.getElementById('mode');
  const coinInput = document.getElementById('coin-count');
  const diceInput = document.getElementById('dice-count');
  const sidesSelect = document.getElementById('dice-sides');
  const modeFields = Array.from(document.querySelectorAll('[data-mode-field]'));
  const goBtn = document.getElementById('go-btn');
  const clearBtn = document.getElementById('clear-history-btn');
  const errorBox = document.getElementById('error-box');
  const resultBox = document.getElementById('result-box');
  const headerText = document.getElementById('result-header-text');
  const primaryText = document.getElementById('result-primary-text');
  const pieces = document.getElementById('cd-pieces');
  const noteText = document.getElementById('cd-note');
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');

  const FIELDS = { coins: coinInput, dice: diceInput, sides: sidesSelect };
  let mode = 'coin';
  let history = [];
  let animTimer = null;

  function switchMode(next, focusTab) {
    mode = next === 'dice' ? 'dice' : 'coin';
    modeInput.value = mode;
    tabBtns.forEach(btn => {
      const current = btn.dataset.mode === mode;
      btn.classList.toggle('active', current);
      btn.setAttribute('aria-selected', current ? 'true' : 'false');
      btn.tabIndex = current ? 0 : -1;
      if (current) form.setAttribute('aria-labelledby', btn.id);
      if (current && focusTab) btn.focus();
    });
    modeFields.forEach(el => { el.hidden = el.dataset.modeField !== mode; });
    goBtn.textContent = mode === 'dice' ? T('buttons.roll') : T('buttons.flip');
    clearError();
  }

  tabBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabBtns[(i + 1) % tabBtns.length];
      switchMode(next.dataset.mode, true);
    });
  });

  function clearError() {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
    Object.values(FIELDS).forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
  }

  function showError(message, field) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-errormessage', 'error-box');
    }
  }

  function animate() {
    pieces.classList.remove('is-animating');
    // Restart the CSS animation on the new pieces
    void pieces.offsetWidth;
    pieces.classList.add('is-animating');
    clearTimeout(animTimer);
    animTimer = setTimeout(() => pieces.classList.remove('is-animating'), 500);
  }

  function renderHistory() {
    historyList.replaceChildren(...history.map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
    historyEmpty.hidden = history.length > 0;
  }

  function flip() {
    const res = logic.flipCoins(coinInput.value);
    if (res.error) return showError(res.error, coinInput);
    headerText.textContent = res.count === 1 ? T('coin.headerOne') : T('coin.headerMany', { count: res.count });
    primaryText.textContent = res.count === 1
      ? (res.heads ? T('coin.heads') : T('coin.tails'))
      : T('coin.counts', { heads: res.heads, tails: res.tails });
    pieces.classList.toggle('is-few', res.count <= 3);
    pieces.replaceChildren(...res.results.map(side => {
      const li = document.createElement('li');
      li.className = `cd-coin${side === 'H' ? ' is-heads' : ''}`;
      li.textContent = side === 'H' ? T('coin.headsLetter') : T('coin.tailsLetter');
      li.setAttribute('aria-label', side === 'H' ? T('coin.heads') : T('coin.tails'));
      return li;
    }));
    noteText.textContent = res.count > 1
      ? T('coin.note', { headsPct: (res.heads / res.count * 100).toFixed(0), tailsPct: (res.tails / res.count * 100).toFixed(0) })
      : '';
    history = logic.pushHistory(history, res.count === 1
      ? T('coin.historyOne', { side: res.heads ? T('coin.heads') : T('coin.tails') })
      : T('coin.historyMany', { count: res.count, heads: res.heads, tails: res.tails }));
    return res.count === 1 ? primaryText.textContent : T('coin.summaryMany', { heads: res.heads, tails: res.tails });
  }

  function roll() {
    const res = logic.rollDice(diceInput.value, sidesSelect.value);
    if (res.error) return showError(res.error, FIELDS[res.field]);
    headerText.textContent = T('dice.header', { notation: res.notation });
    primaryText.textContent = res.count === 1 ? String(res.sum) : T('dice.total', { sum: res.sum });
    pieces.classList.toggle('is-few', res.count <= 3);
    pieces.replaceChildren(...res.rolls.map(n => {
      const li = document.createElement('li');
      li.className = 'cd-die';
      li.setAttribute('aria-label', `d${res.sides}: ${n}`);
      const type = document.createElement('span');
      type.className = 'cd-die-type';
      type.setAttribute('aria-hidden', 'true');
      type.textContent = `d${res.sides}`;
      li.append(document.createTextNode(String(n)), type);
      return li;
    }));
    noteText.textContent = res.count > 1
      ? T('dice.noteMany', { rolls: res.rolls.join(' + '), sum: res.sum, min: res.minSum, max: res.maxSum })
      : T('dice.noteOne', { sides: res.sides });
    history = logic.pushHistory(history, `${res.notation}: ${res.count > 1 ? `${res.rolls.join(' + ')} = ${res.sum}` : res.sum}`);
    return `${res.notation}: ${res.count > 1 ? `${res.rolls.join(' + ')} = ${res.sum}` : res.sum}`;
  }

  function go() {
    clearError();
    let summary;
    try {
      summary = mode === 'dice' ? roll() : flip();
    } catch (err) {
      return showError(err.message || T('errors.noCrypto'));
    }
    if (!summary) return;
    animate();
    renderHistory();
    const barCopy = document.getElementById('action-copy-btn');
    if (barCopy) barCopy.dataset.copyText = summary;
    resultBox.classList.add('is-visible');
    ToolsBuilt.resultLink.update();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    go();
    const bad = form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
  });

  clearBtn.addEventListener('click', () => {
    history = [];
    renderHistory();
  });

  ToolsBuilt.resultLink.restore();
  switchMode(modeInput.value);
  go();
});
