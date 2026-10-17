/**
 * Random Name Picker Wheel UI Controller
 * Powered by RandomPickerLogic pure engine.
 * Cryptographically unbiased selection using window.crypto.getRandomValues.
 * PRIVACY GUARD: Never saves names list to localStorage or URL params.
 */
document.addEventListener('DOMContentLoaded', function () {
  const logic = window.RandomPickerLogic;
  const namesInput = document.getElementById('namesInput');
  const spinBtn = document.getElementById('spinBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const dedupeBtn = document.getElementById('dedupeBtn');
  const clearBtn = document.getElementById('clearBtn');
  const canvas = document.getElementById('wheelCanvas');
  const removeWinnerCheckbox = document.getElementById('removeWinner');
  const winnerModal = document.getElementById('winnerModal');
  const winnerNameEl = document.getElementById('winnerName');
  const removeWinnerBtn = document.getElementById('removeWinnerBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const copyWinnerBtn = document.getElementById('copyWinnerBtn');
  const nameCountEl = document.getElementById('nameCount');

  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let names = [];
  let currentAngle = 0; // In radians
  let isSpinning = false;
  let currentWinner = '';

  const colors = [
    '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#84cc16'
  ];

  const SETTINGS_KEY = 'toolsbuilt:random-name-picker-settings';

  function initSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (typeof data.removeWinner === 'boolean' && removeWinnerCheckbox) {
          removeWinnerCheckbox.checked = data.removeWinner;
        }
      }
    } catch (e) {}
  }

  function saveSettings() {
    try {
      if (removeWinnerCheckbox) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
          removeWinner: removeWinnerCheckbox.checked
        }));
      }
    } catch (e) {}
  }

  function parseNames() {
    const text = namesInput.value;
    names = logic.parseNames(text, { dedupe: false });
    
    if (nameCountEl) {
      const numFmt = new Intl.NumberFormat('en-US');
      nameCountEl.textContent = `${numFmt.format(names.length)} ${names.length === 1 ? 'entry' : 'entries'}`;
    }
    drawWheel();
  }

  function drawWheel() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    if (names.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f3f4f6';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#e5e7eb';
      ctx.stroke();

      ctx.fillStyle = '#9ca3af';
      ctx.font = '600 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Enter names to build wheel', centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / names.length;

    for (let i = 0; i < names.length; i++) {
      const startAngle = currentAngle + (i * sliceAngle);
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      
      let displayName = names[i];
      if (displayName.length > 18) {
        displayName = displayName.substring(0, 16) + '...';
      }
      ctx.fillText(displayName, radius - 20, 5);
      ctx.restore();
    }

    // Center peg / circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#4f46e5';
    ctx.stroke();

    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', centerX, centerY);

    // Pointer at top (12 o'clock)
    ctx.beginPath();
    ctx.moveTo(centerX - 14, 8);
    ctx.lineTo(centerX + 14, 8);
    ctx.lineTo(centerX, 28);
    ctx.closePath();
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function spin() {
    if (isSpinning || names.length === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const picked = logic.pickWinner(names);
    if (!picked) return;
    const winningIndex = picked.index;
    currentWinner = picked.winner;

    if (prefersReducedMotion) {
      const sliceAngle = (2 * Math.PI) / names.length;
      currentAngle = (1.5 * Math.PI) - (winningIndex * sliceAngle) - (sliceAngle / 2);
      drawWheel();
      announceWinner();
      return;
    }

    isSpinning = true;
    spinBtn.disabled = true;

    const sliceAngle = (2 * Math.PI) / names.length;
    const fullSpins = 5 + logic.getRandomIndex(5);
    const targetSliceCenter = (winningIndex * sliceAngle) + (sliceAngle / 2);
    const finalAngle = (1.5 * Math.PI) - targetSliceCenter + (fullSpins * 2 * Math.PI);

    const duration = 3800;
    const startTimestamp = performance.now();
    const startAngle = currentAngle % (2 * Math.PI);

    function animate(now) {
      const elapsed = now - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      currentAngle = startAngle + (finalAngle - startAngle) * easeOut;

      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isSpinning = false;
        spinBtn.disabled = false;
        announceWinner();
      }
    }

    requestAnimationFrame(animate);
  }

  function announceWinner() {
    winnerNameEl.textContent = currentWinner;
    winnerModal.classList.remove('hidden');
    winnerModal.setAttribute('aria-hidden', 'false');

    if (window.ToolsBuilt && window.ToolsBuilt.toast) {
      window.ToolsBuilt.toast(`Winner: ${currentWinner}!`);
    }

    if (removeWinnerCheckbox && removeWinnerCheckbox.checked) {
      removeCurrentWinner();
    }
  }

  function removeCurrentWinner() {
    if (!currentWinner) return;
    const idx = names.indexOf(currentWinner);
    if (idx !== -1) {
      names.splice(idx, 1);
      namesInput.value = names.join('\n');
      parseNames();
    }
  }

  function shuffleNames() {
    if (names.length <= 1) return;
    names = logic.shuffle(names);
    namesInput.value = names.join('\n');
    parseNames();
  }

  function deduplicateNames() {
    const deduped = logic.parseNames(namesInput.value, { dedupe: true });
    namesInput.value = deduped.join('\n');
    parseNames();
    if (window.ToolsBuilt && window.ToolsBuilt.toast) {
      window.ToolsBuilt.toast('Removed duplicate names');
    }
  }

  namesInput.addEventListener('input', parseNames);
  spinBtn.addEventListener('click', spin);
  shuffleBtn.addEventListener('click', shuffleNames);
  if (dedupeBtn) dedupeBtn.addEventListener('click', deduplicateNames);
  clearBtn.addEventListener('click', function () {
    namesInput.value = '';
    parseNames();
    namesInput.focus();
  });

  if (removeWinnerCheckbox) {
    removeWinnerCheckbox.addEventListener('change', saveSettings);
  }

  removeWinnerBtn.addEventListener('click', function () {
    removeCurrentWinner();
    winnerModal.classList.add('hidden');
    winnerModal.setAttribute('aria-hidden', 'true');
  });

  closeModalBtn.addEventListener('click', function () {
    winnerModal.classList.add('hidden');
    winnerModal.setAttribute('aria-hidden', 'true');
  });

  if (copyWinnerBtn) {
    copyWinnerBtn.addEventListener('click', function () {
      if (currentWinner && window.ToolsBuilt && window.ToolsBuilt.copy) {
        window.ToolsBuilt.copy(currentWinner, 'Winner name copied to clipboard');
      }
    });
  }

  // Populate initial default names if empty
  if (!namesInput.value.trim()) {
    namesInput.value = "Emma\nLiam\nOlivia\nNoah\nAva\nEthan\nSophia\nMason";
  }

  initSettings();
  parseNames();
});
