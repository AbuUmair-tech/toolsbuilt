/**
 * ToolsBuilt - Shared JavaScript Logic
 * Handles Theme Toggling, Mobile Navigation, Accordions, and Tool Card Search.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
  initAccordions();
  initToolSearch();
});

/**
 * Theme Management (System + Preference + localStorage)
 */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateToggleAria(themeToggleBtn, savedTheme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let targetTheme = 'light';

    if (!currentTheme) {
      targetTheme = systemDark ? 'light' : 'dark';
    } else {
      targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
    }

    document.documentElement.setAttribute('data-theme', targetTheme);
    localStorage.setItem('theme', targetTheme);
    updateToggleAria(themeToggleBtn, targetTheme);
  });
}

function updateToggleAria(button, theme) {
  const isDark = theme === 'dark';
  button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
}

/**
 * Mobile Navigation Drawer Toggle
 */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mainNav = document.getElementById('main-nav');
  if (!menuBtn || !mainNav) return;

  menuBtn.addEventListener('click', () => {
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', !isExpanded);
    mainNav.classList.toggle('is-active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !mainNav.contains(e.target) && mainNav.classList.contains('is-active')) {
      menuBtn.setAttribute('aria-expanded', 'false');
      mainNav.classList.remove('is-active');
    }
  });
}

/**
 * Accessible Accordion Component
 */
function initAccordions() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  if (!accordionHeaders.length) return;

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const isExpanded = header.getAttribute('aria-expanded') === 'true';
      const targetId = header.getAttribute('aria-controls');
      const content = document.getElementById(targetId);

      if (!content) return;

      // Toggle current accordion
      header.setAttribute('aria-expanded', !isExpanded);
      if (isExpanded) {
        content.setAttribute('hidden', '');
      } else {
        content.removeAttribute('hidden');
      }
    });
  });
}

/**
 * Real-time Hero Tool Search
 */
function initToolSearch() {
  const searchInput = document.getElementById('tool-search');
  if (!searchInput) return;

  const noResultsMsg = document.getElementById('no-results-msg');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.tool-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const title = card.querySelector('h2, h3')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('p')?.textContent.toLowerCase() || '';

      if (title.includes(query) || desc.includes(query)) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (noResultsMsg) {
      if (visibleCount === 0) {
        noResultsMsg.classList.remove('hidden');
      } else {
        noResultsMsg.classList.add('hidden');
      }
    }
  });
}
