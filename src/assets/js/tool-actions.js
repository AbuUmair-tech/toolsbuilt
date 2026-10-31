/**
 * ToolsBuilt - Shared Tool Result Actions Bar
 * Progressive enhancement for all tool pages:
 * - Copy result (uses clipboard API + toast)
 * - Share (Web Share API or page link copy)
 * - Print (window.print with print styling)
 * - Reset
 * - Responsive scroll-into-view on mobile calculations
 */

(function() {
  'use strict';

  function initToolActions() {
    const actionsBar = document.getElementById('result-actions-bar');
    if (!actionsBar) return;

    const copyBtn = document.getElementById('action-copy-btn');
    const shareBtn = document.getElementById('action-share-btn');
    const printBtn = document.getElementById('action-print-btn');
    const resetBtn = document.getElementById('action-reset-btn');
    const copyLinkBtn = document.getElementById('action-copy-link-btn');

    // Drop bar buttons the tool already provides itself (one Copy, one Reset per tool).
    // Copy buttons inside the result header are hidden by CSS in favour of the bar's Copy.
    const workspace = actionsBar.closest('.tool-workspace') || document;
    const ownButtons = Array.from(workspace.querySelectorAll('button[id]')).filter(b => !actionsBar.contains(b));
    const hasOwnCopy = ownButtons.some(b => /copy/i.test(b.id) && !b.matches('.result-box #copy-result-btn, .result-box #copyResultBtn'));
    const hasOwnReset = ownButtons.some(b => /reset|clear/i.test(b.id));
    if (copyBtn && hasOwnCopy) copyBtn.remove();
    if (resetBtn && hasOwnReset) resetBtn.remove();

    // Shareable result links: "Copy link to this result" replaces the generic Share
    const resultLink = window.ToolsBuilt && window.ToolsBuilt.resultLink;
    if (copyLinkBtn && resultLink && resultLink.isEnabled()) {
      copyLinkBtn.removeAttribute('hidden');
      if (shareBtn) shareBtn.remove();
    } else if (copyLinkBtn) {
      copyLinkBtn.remove();
    }

    // Find the result container on this page
    const resultBox = document.querySelector('[data-result-source], #result-box, #resultBox, .result-box, #password-display, #winner-card, .counter-grid');
    if (!resultBox) return;

    // Move result actions bar immediately after result box inside calculator card
    if (actionsBar && resultBox.nextElementSibling !== actionsBar) {
      resultBox.insertAdjacentElement('afterend', actionsBar);
    }

    let wasResultVisible = false;
    // Only auto-scroll to a result the visitor asked for, not the default one shown on load
    let userInteracted = false;
    ['input', 'change', 'submit'].forEach(type => {
      document.addEventListener(type, (e) => {
        if (e.target && e.target.closest && e.target.closest('.tool-workspace')) userInteracted = true;
      }, true);
    });

    // Toast notification utility
    function showToast(message) {
      let toast = document.getElementById('tb-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'tb-toast';
        toast.className = 'tb-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('is-visible');
      setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 2500);
    }

    // Extract human-readable text from the result
    function getResultText() {
      // 0. A full summary the tool script provides (data-copy-text on the bar's Copy button)
      if (copyBtn && copyBtn.dataset.copyText) return copyBtn.dataset.copyText;

      // 1. Check custom data-result-source element
      const customSource = document.querySelector('[data-result-source]');
      if (customSource) {
        if (customSource.value !== undefined) return customSource.value.trim();
        return customSource.textContent.trim();
      }

      // 2. Primary result heading or text
      const primary = document.querySelector('#result-primary-text, .result-primary, .result-header');
      if (primary && primary.textContent.trim() && !primary.textContent.includes('--')) {
        return primary.textContent.trim();
      }

      // 3. Password display input
      const passwordInput = document.getElementById('password-display');
      if (passwordInput && passwordInput.value) {
        return passwordInput.value;
      }

      // 4. Winner display
      const winner = document.getElementById('winner-name') || document.getElementById('winner-display');
      if (winner && winner.textContent.trim()) {
        return winner.textContent.trim();
      }

      // 5. Fallback to whole result box text
      if (resultBox.value !== undefined) return resultBox.value;
      return resultBox.innerText ? resultBox.innerText.trim() : resultBox.textContent.trim();
    }

    // Check if result has meaningful non-placeholder content
    function isResultActive() {
      // Input elements
      if (resultBox.tagName === 'INPUT' || resultBox.tagName === 'TEXTAREA') {
        return !!resultBox.value && resultBox.value.trim().length > 0;
      }
      // Visibility classes / styles
      const style = window.getComputedStyle(resultBox);
      if (style.display === 'none' || resultBox.classList.contains('hidden') || resultBox.hasAttribute('hidden')) {
        return false;
      }
      // Check for placeholder text like "--"
      const primary = resultBox.querySelector('#result-primary-text, .result-primary');
      if (primary && primary.textContent.includes('--')) {
        return false;
      }
      return resultBox.textContent.trim().length > 0;
    }

    // Check visibility and update actions bar state
    function updateActionsState() {
      const active = isResultActive();
      if (active) {
        actionsBar.removeAttribute('hidden');
        actionsBar.classList.add('is-active');

        // On small screens, if newly visible and below the fold, scroll into view
        if (!wasResultVisible && userInteracted && window.innerWidth <= 768) {
          const rect = resultBox.getBoundingClientRect();
          if (rect.top > window.innerHeight - 100 || rect.bottom > window.innerHeight) {
            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            resultBox.scrollIntoView({
              behavior: prefersReduced ? 'auto' : 'smooth',
              block: 'nearest'
            });
          }
        }
        wasResultVisible = true;
      } else {
        actionsBar.setAttribute('hidden', '');
        actionsBar.classList.remove('is-active');
        wasResultVisible = false;
      }
    }

    // Wire Copy Result
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const text = getResultText();
        if (!text) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            showToast('Result copied to clipboard!');
          }).catch(() => {
            showToast('Result copied!');
          });
        } else {
          showToast('Result copied!');
        }
      });
    }

    // Wire Copy link to this result (the URL already carries the inputs)
    if (copyLinkBtn && copyLinkBtn.isConnected) {
      copyLinkBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const link = window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(() => showToast('Link to this result copied!')).catch(() => showToast(link));
        } else {
          showToast(link);
        }
      });
    }

    // Wire Share
    if (shareBtn && shareBtn.isConnected) {
      shareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const resultText = getResultText();
        const shareData = {
          title: document.title,
          text: resultText ? `Calculated on ToolsBuilt: ${resultText}` : document.title,
          url: window.location.href
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          navigator.share(shareData).catch(() => {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Tool link copied to clipboard!');
          });
        } else {
          showToast('Tool link ready to share');
        }
      });
    }

    // Wire Print
    if (printBtn) {
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    }

    // Wire Reset
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // If the tool form has an existing reset button, click it
        const toolResetBtn = document.querySelector('form #reset-btn, form button[type="reset"]');
        if (toolResetBtn) {
          toolResetBtn.click();
        } else {
          // Manual input clearing
          const form = document.querySelector('.tool-container form');
          if (form) form.reset();
        }
        setTimeout(updateActionsState, 50);
      });
    }

    // Observe resultBox for text/attribute changes
    const observer = new MutationObserver(() => {
      updateActionsState();
    });

    observer.observe(resultBox, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });

    // Also listen to form submissions / changes
    const form = document.querySelector('.tool-container form, form');
    if (form) {
      form.addEventListener('submit', () => setTimeout(updateActionsState, 100));
      form.addEventListener('input', () => setTimeout(updateActionsState, 100));
      form.addEventListener('change', () => setTimeout(updateActionsState, 100));
    }

    // Initial check
    updateActionsState();

    // Desktop TOC Scroll Spy
    initTocScrollSpy();
  }

  function initTocScrollSpy() {
    const tocLinks = document.querySelectorAll('.tool-toc-aside .toc-list a');
    if (!tocLinks.length) return;

    const targets = [];
    tocLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const el = document.getElementById(href.slice(1));
        if (el) targets.push({ link, el });
      }
    });

    if (!targets.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            targets.forEach(t => {
              if (t.el === entry.target) {
                t.link.classList.add('is-active');
              } else {
                t.link.classList.remove('is-active');
              }
            });
          }
        });
      }, {
        rootMargin: '-80px 0px -50% 0px',
        threshold: 0.1
      });

      targets.forEach(t => observer.observe(t.el));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToolActions);
  } else {
    initToolActions();
  }
})();
