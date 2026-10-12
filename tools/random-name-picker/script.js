document.addEventListener('DOMContentLoaded', function () {
    const namesInput = document.getElementById('namesInput');
    const spinBtn = document.getElementById('spinBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const clearBtn = document.getElementById('clearBtn');
    const canvas = document.getElementById('wheelCanvas');
    const removeWinnerCheckbox = document.getElementById('removeWinner');
    const winnerModal = document.getElementById('winnerModal');
    const winnerNameEl = document.getElementById('winnerName');
    const removeWinnerBtn = document.getElementById('removeWinnerBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
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

    function parseNames() {
        const text = namesInput.value;
        names = text.split('\n')
            .map(n => n.trim())
            .filter(n => n.length > 0);
        
        if (nameCountEl) {
            nameCountEl.textContent = `${names.length} entry${names.length !== 1 ? 'ies' : ''}`;
        }
        drawWheel();
    }

    function getSecureRandomInt(max) {
        if (max <= 1) return 0;
        // Rejection sampling against 2^32 boundary to eliminate modulo bias
        const maxValid = Math.floor(0x100000000 / max) * max;
        const array = new Uint32Array(1);
        while (true) {
            window.crypto.getRandomValues(array);
            if (array[0] < maxValid) {
                return array[0] % max;
            }
        }
    }

    function drawWheel() {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 15;

        ctx.clearRect(0, 0, width, height);

        if (names.length === 0) {
            // Draw empty placeholder wheel
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

            // Slice background
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
            
            // Truncate name if long
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

        // Pointer at the top (12 o'clock = 3*PI/2)
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
        
        // Determine winning index securely using crypto
        const winningIndex = getSecureRandomInt(names.length);
        currentWinner = names[winningIndex];

        if (prefersReducedMotion) {
            // Instantly snap pointer to winner
            const sliceAngle = (2 * Math.PI) / names.length;
            // Pointer is at top (12 o'clock, angle = 3*PI/2)
            // slice center = currentAngle + winningIndex * sliceAngle + sliceAngle/2 = 3*PI/2
            currentAngle = (1.5 * Math.PI) - (winningIndex * sliceAngle) - (sliceAngle / 2);
            drawWheel();
            announceWinner();
            return;
        }

        isSpinning = true;
        spinBtn.disabled = true;

        const sliceAngle = (2 * Math.PI) / names.length;
        // Number of full rotations
        const fullSpins = 5 + getSecureRandomInt(5); 
        // Target angle so pointer (at 1.5 * PI) lands on winning slice
        const targetSliceCenter = (winningIndex * sliceAngle) + (sliceAngle / 2);
        const finalAngle = (1.5 * Math.PI) - targetSliceCenter + (fullSpins * 2 * Math.PI);

        const duration = 4000; // 4 seconds
        const startTimestamp = performance.now();
        const startAngle = currentAngle % (2 * Math.PI);

        function animate(now) {
            const elapsed = now - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);
            
            // Cubic ease-out curve
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

        if (removeWinnerCheckbox.checked) {
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
        // Fisher-Yates shuffle with crypto RNG
        for (let i = names.length - 1; i > 0; i--) {
            const j = getSecureRandomInt(i + 1);
            [names[i], names[j]] = [names[j], names[i]];
        }
        namesInput.value = names.join('\n');
        parseNames();
    }

    namesInput.addEventListener('input', parseNames);
    spinBtn.addEventListener('click', spin);
    shuffleBtn.addEventListener('click', shuffleNames);
    clearBtn.addEventListener('click', function () {
        namesInput.value = '';
        parseNames();
    });

    removeWinnerBtn.addEventListener('click', function () {
        removeCurrentWinner();
        winnerModal.classList.add('hidden');
        winnerModal.setAttribute('aria-hidden', 'true');
    });

    closeModalBtn.addEventListener('click', function () {
        winnerModal.classList.add('hidden');
        winnerModal.setAttribute('aria-hidden', 'true');
    });

    // Populate initial default names if empty
    if (!namesInput.value.trim()) {
        namesInput.value = "Emma\nLiam\nOlivia\nNoah\nAva\nEthan\nSophia\nMason";
    }

    parseNames();
});
