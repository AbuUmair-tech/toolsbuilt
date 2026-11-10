/**
 * ToolsBuilt Layout & Global Interactions
 * - Sticky header with scroll-reactive border
 * - Accessible mobile menu (focus trap, body scroll lock, Esc close)
 * - Command Palette Search (Ctrl/⌘+K, '/', combobox ARIA, custom scorer, recent tools)
 * - Header dropdowns (enhanced <details>) and the homepage search form, which opens the palette
 *   with the typed query (and ?q= from SearchAction)
 * - Multi-button Theme Toggle synchronization
 */

(function() {
  'use strict';

  // --- State & Globals ---
  let searchIndex = null;
  let isFetchingIndex = false;
  let lastFocusedElement = null;
  let activeIndex = -1;
  let searchResults = [];
  let modal = null;
  let backdrop = null;
  let input = null;
  let resultsList = null;
  let emptyState = null;
  let noResults = null;
  const RECENT_KEY = 'tb_recent_tools';
  // Tool pages in the page's language (/es/tools/...) on translated pages
  const toolUrl = slug => `${document.documentElement.dataset.localePrefix || ''}/tools/${slug}/`;

  // --- Initialize on DOMContentLoaded ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
  } else {
    initLayout();
  }

  function initLayout() {
    initMacKbdHint();
    initHeaderScroll();
    initThemeSync();
    initNavMenus();
    initMobileDrawer();
    initCommandPalette();
    initHomepageSearch();
    initDirectoryPage();
    recordRecentToolVisit();
  }

  // --- Platform Detection for Keyboard Hints ---
  function initMacKbdHint() {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
    if (isMac) {
      document.querySelectorAll('.search-kbd').forEach(el => {
        el.textContent = '⌘K';
      });
      const headerSearchBtn = document.getElementById('header-search-trigger');
      if (headerSearchBtn) {
        headerSearchBtn.setAttribute('aria-label', ToolsBuilt.t('layout.searchMac'));
      }
    }
  }

  // --- Header Scroll Effect ---
  function initHeaderScroll() {
    const header = document.getElementById('site-header');
    if (!header) return;

    let ticking = false;
    const updateHeader = () => {
      if (window.scrollY > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
    updateHeader();
  }

  // --- Theme Toggle Synchronization ---
  function initThemeSync() {
    const toggleButtons = [
      document.getElementById('theme-toggle'),
      document.getElementById('mobile-theme-toggle')
    ].filter(Boolean);

    if (!toggleButtons.length) return;

    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('theme', theme); } catch (e) {}
      const isDark = theme === 'dark';
      toggleButtons.forEach(btn => {
        btn.setAttribute('aria-label', isDark ? ToolsBuilt.t('layout.switchToLight') : ToolsBuilt.t('layout.switchToDark'));
      });
    };

    // Initialize toggle labels
    const currentTheme = document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(currentTheme);

    toggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const active = document.documentElement.getAttribute('data-theme');
        const next = active === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    });
  }

  // --- Desktop dropdowns (<details> elements; they work without this script) ---
  // Enhancements: one open at a time, close on Escape, outside click or when focus leaves.
  function initNavMenus() {
    const menus = Array.from(document.querySelectorAll('[data-nav-menu]'));
    if (!menus.length) return;

    menus.forEach(menu => {
      menu.addEventListener('toggle', () => {
        if (menu.open) menus.forEach(other => { if (other !== menu) other.open = false; });
      });
      menu.addEventListener('focusout', (e) => {
        if (menu.open && e.relatedTarget && !menu.contains(e.relatedTarget)) menu.open = false;
      });
    });

    document.addEventListener('click', (e) => {
      menus.forEach(menu => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      menus.forEach(menu => {
        if (menu.open) {
          menu.open = false;
          menu.querySelector('summary').focus();
        }
      });
    });
  }

  // --- Mobile Menu (under 900px) ---
  function initMobileDrawer() {
    const trigger = document.getElementById('mobile-menu-trigger');
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    const closeBtn = document.getElementById('mobile-drawer-close');
    if (!trigger || !drawer || !backdrop) return;

    const openDrawer = () => {
      lastFocusedElement = document.activeElement;
      trigger.setAttribute('aria-expanded', 'true');
      drawer.removeAttribute('hidden');
      backdrop.removeAttribute('hidden');
      drawer.classList.add('is-open');
      backdrop.classList.add('is-visible');
      document.body.classList.add('tb-drawer-open');
      setTimeout(() => {
        if (closeBtn) closeBtn.focus();
      }, 50);
    };

    const closeDrawer = () => {
      trigger.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-visible');
      document.body.classList.remove('tb-drawer-open');

      setTimeout(() => {
        drawer.setAttribute('hidden', '');
        backdrop.setAttribute('hidden', '');
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
          lastFocusedElement.focus();
        }
      }, 250);
    };

    trigger.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    // Escape key handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        e.preventDefault();
        closeDrawer();
      }
    });

    // Focus Trap inside mobile drawer
    drawer.addEventListener('keydown', (e) => {

      if (e.key === 'Tab') {
        const focusables = drawer.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // --- Search Index Loader (Lazy Fetch & Prefetch) ---
  function getSearchIndexUrl() {
    const trigger = document.getElementById('header-search-trigger') ||
                    document.getElementById('mobile-search-trigger');
    return (trigger && trigger.dataset.searchIndex) || '/assets/search-index.json';
  }

  function fetchSearchIndex() {
    if (searchIndex || isFetchingIndex) return Promise.resolve(searchIndex);
    isFetchingIndex = true;
    const url = getSearchIndexUrl();

    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Search index load failed');
        return res.json();
      })
      .then(data => {
        searchIndex = data;
        isFetchingIndex = false;
        return searchIndex;
      })
      .catch(err => {
        console.warn('Search index fetch error:', err);
        isFetchingIndex = false;
        return [];
      });
  }

  // --- Custom Search Scorer ---
  function calculateScore(tool, query) {
    const q = query.trim().toLowerCase();
    if (!q) return 0;

    const name = (tool.name || '').toLowerCase();
    const shortName = (tool.shortName || '').toLowerCase();
    const slug = (tool.slug || '').toLowerCase();
    const desc = (tool.description || '').toLowerCase();
    const cat = (tool.category || '').toLowerCase();
    const keywords = (tool.keywords || []).map(k => k.toLowerCase());

    let score = 0;

    // Exact name or slug match
    if (name === q || shortName === q || slug === q) {
      score += 1000;
    }
    // Prefix match on full name
    else if (name.startsWith(q) || shortName.startsWith(q)) {
      score += 500;
    }
    // Prefix match on any word in the tool name
    else if (name.split(/\s+/).some(w => w.startsWith(q))) {
      score += 350;
    }
    // Substring in name or slug
    else if (name.includes(q) || slug.includes(q)) {
      score += 180;
    }
    // Fuzzy subsequence match in name
    else if (isSubsequence(q, name)) {
      score += 60;
    }

    // Keyword matches
    for (const kw of keywords) {
      if (kw === q) {
        score += 220;
        break;
      } else if (kw.startsWith(q)) {
        score += 120;
        break;
      } else if (kw.split(/\s+/).some(w => w.startsWith(q))) {
        score += 80;
        break;
      } else if (kw.includes(q)) {
        score += 45;
        break;
      }
    }

    // Category match
    if (cat === q) {
      score += 90;
    } else if (cat.startsWith(q)) {
      score += 50;
    }

    // Description match
    if (desc.includes(q)) {
      score += 25;
    }

    // Typo tolerance: 1 edit distance for words > 4 chars if no strong match yet
    if (score < 50 && q.length > 4) {
      const allWords = name.split(/\s+/).concat(keywords);
      for (const w of allWords) {
        if (Math.abs(w.length - q.length) <= 1 && levenshtein(w, q) === 1) {
          score += 75;
          break;
        }
      }
    }

    // Small boost for popular tools as tie-breaker
    if (score > 0 && tool.popular) {
      score += 5;
    }

    return score;
  }

  function isSubsequence(sub, str) {
    let i = 0, j = 0;
    while (i < sub.length && j < str.length) {
      if (sub[i] === str[j]) i++;
      j++;
    }
    return i === sub.length;
  }

  function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  function highlightMatches(text, query) {
    if (!query) return escapeHtml(text);
    const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQ})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark class="palette-mark">$1</mark>');
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Recent Tools Visited Storage ---
  function recordRecentToolVisit() {
    // A country page (data-parent-tool) counts as a visit to its parent tool, the one that is listed
    const toolId = document.body ? (document.body.dataset.parentTool || document.body.dataset.toolId || document.body.getAttribute('data-tool-id')) : null;
    if (!toolId) return;

    try {
      let recents = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      recents = recents.filter(item => item.slug !== toolId);
      const toolName = (!document.body.dataset.parentTool && document.querySelector('h1')?.textContent.trim()) || toolId;
      recents.unshift({
        slug: toolId,
        name: toolName,
        category: ''
      });
      if (recents.length > 5) recents = recents.slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
    } catch (e) {}

    fetchSearchIndex().then(tools => {
      const tool = tools.find(t => t.slug === toolId);
      if (!tool) return;

      try {
        let recents = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        const idx = recents.findIndex(item => item.slug === tool.slug);
        if (idx !== -1) {
          recents[idx].name = tool.name;
          recents[idx].category = tool.category;
          localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
        }
      } catch (e) {}
    });
  }

  function getRecentTools() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function clearRecentTools() {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch (e) {}
    renderRecentTools();
  }

  function renderRecentTools() {
    const recentSec = document.getElementById('palette-recent-section');
    const recentList = document.getElementById('palette-recent-list');
    if (!recentSec || !recentList) return;

    const recents = getRecentTools();
    if (!recents.length) {
      recentSec.setAttribute('hidden', '');
      recentList.innerHTML = '';
      return;
    }

    recentSec.removeAttribute('hidden');
    recentList.innerHTML = recents.map((item, idx) => `
      <li>
        <a href="${toolUrl(item.slug)}" class="palette-item-link" data-slug="${item.slug}">
          <span class="palette-item-cat">${escapeHtml(item.category)}</span>
          <span class="palette-item-name">${escapeHtml(item.name)}</span>
        </a>
      </li>
    `).join('');
    // Recents saved by older versions hold the category slug: show the current display name
    fetchSearchIndex().then(tools => {
      recentList.querySelectorAll('.palette-item-link').forEach(a => {
        const t = (tools || []).find(x => x.slug === a.dataset.slug);
        if (t) a.querySelector('.palette-item-cat').textContent = t.category;
      });
    }).catch(() => {});
  }

  // --- Command Palette Dialog Modal ---
  function openPalette(initialQuery) {
    modal = modal || document.getElementById('search-modal');
    backdrop = backdrop || document.getElementById('search-modal-backdrop');
    input = input || document.getElementById('palette-input');
    resultsList = resultsList || document.getElementById('palette-results');
    emptyState = emptyState || document.getElementById('palette-empty-state');
    noResults = noResults || document.getElementById('palette-no-results');

    if (!modal || !backdrop || !input) return;

    lastFocusedElement = document.activeElement;
    modal.removeAttribute('hidden');
    backdrop.removeAttribute('hidden');
    modal.classList.add('is-open');
    backdrop.classList.add('is-visible');
    document.body.classList.add('tb-modal-open');

    renderRecentTools();

    input.value = typeof initialQuery === 'string' ? initialQuery : '';
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-activedescendant', '');
    activeIndex = -1;
    searchResults = [];
    showEmptyState();
    input.focus();
    if (input.value) handleSearchInput(input.value);

    fetchSearchIndex(); // Ensure index is ready
  }

  function closePalette() {
    if (!modal || !backdrop) return;
    modal.classList.remove('is-open');
    backdrop.classList.remove('is-visible');
    document.body.classList.remove('tb-modal-open');

    setTimeout(() => {
      modal.setAttribute('hidden', '');
      backdrop.setAttribute('hidden', '');
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    }, 200);
  }

  function showEmptyState() {
    if (resultsList) resultsList.innerHTML = '';
    if (noResults) noResults.setAttribute('hidden', '');
    if (emptyState) emptyState.removeAttribute('hidden');
  }

  function setActiveDescendant(index) {
    const options = resultsList.querySelectorAll('.palette-result-item');
    options.forEach(opt => {
      opt.classList.remove('is-selected');
      opt.setAttribute('aria-selected', 'false');
    });

    if (index >= 0 && index < options.length) {
      activeIndex = index;
      const activeOpt = options[index];
      activeOpt.classList.add('is-selected');
      activeOpt.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', activeOpt.id);
      activeOpt.scrollIntoView({ block: 'nearest' });
    } else {
      activeIndex = -1;
      input.setAttribute('aria-activedescendant', '');
    }
  }

  function handleSearchInput(query) {
    const q = query.trim();
    if (!q) {
      input.setAttribute('aria-expanded', 'false');
      showEmptyState();
      return;
    }

    fetchSearchIndex().then(tools => {
      const scored = [];
      for (const t of tools) {
        const s = calculateScore(t, q);
        if (s > 0) scored.push({ tool: t, score: s });
      }

      scored.sort((a, b) => b.score - a.score);
      searchResults = scored.map(item => item.tool);

      if (!searchResults.length) {
        input.setAttribute('aria-expanded', 'false');
        if (emptyState) emptyState.setAttribute('hidden', '');
        if (resultsList) resultsList.innerHTML = '';
        if (noResults) noResults.removeAttribute('hidden');
        activeIndex = -1;
        return;
      }

      if (emptyState) emptyState.setAttribute('hidden', '');
      if (noResults) noResults.setAttribute('hidden', '');
      input.setAttribute('aria-expanded', 'true');

      resultsList.innerHTML = searchResults.map((t, idx) => `
        <li role="option" id="result-opt-${idx}" class="palette-result-item" aria-selected="${idx === 0}">
          <a href="${toolUrl(t.slug)}" class="palette-result-link">
            <div class="palette-result-content">
              <div class="palette-result-title-row">
                <span class="palette-result-name">${highlightMatches(t.name, q)}</span>
                <span class="palette-result-cat">${escapeHtml(t.category)}</span>
              </div>
              <p class="palette-result-desc">${highlightMatches(t.description, q)}</p>
            </div>
            <span class="palette-result-enter" aria-hidden="true">&crarr;</span>
          </a>
        </li>
      `).join('');

      setActiveDescendant(0);
    });
  }

  function initCommandPalette() {
    modal = document.getElementById('search-modal');
    backdrop = document.getElementById('search-modal-backdrop');
    input = document.getElementById('palette-input');
    resultsList = document.getElementById('palette-results');
    emptyState = document.getElementById('palette-empty-state');
    noResults = document.getElementById('palette-no-results');

    const triggers = [
      document.getElementById('header-search-trigger'),
      document.getElementById('mobile-search-trigger')
    ].filter(Boolean);
    const closeBtn = document.getElementById('palette-close-btn');
    const clearRecentsBtn = document.getElementById('palette-clear-recents');

    // Prefetch on trigger hover or focus
    triggers.forEach(trigger => {
      trigger.addEventListener('mouseenter', fetchSearchIndex, { once: true });
      trigger.addEventListener('focus', fetchSearchIndex, { once: true });
      trigger.addEventListener('click', () => openPalette());
    });

    if (closeBtn) closeBtn.addEventListener('click', closePalette);
    if (backdrop) backdrop.addEventListener('click', closePalette);
    if (clearRecentsBtn) clearRecentsBtn.addEventListener('click', clearRecentTools);

    // Global keyboard triggers (Ctrl/⌘+K, '/')
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }

      if (e.key === '/' && !modal?.classList.contains('is-open')) {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        const isEditable = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' ||
                           (document.activeElement && document.activeElement.isContentEditable);
        if (!isEditable) {
          e.preventDefault();
          openPalette();
        }
      }
    });

    if (!input || !modal) return;

    // Search input change
    input.addEventListener('input', (e) => {
      handleSearchInput(e.target.value);
    });

    // Keyboard navigation inside palette
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
        return;
      }

      const optionsCount = searchResults.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (optionsCount > 0) {
          const next = activeIndex < optionsCount - 1 ? activeIndex + 1 : 0;
          setActiveDescendant(next);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (optionsCount > 0) {
          const prev = activeIndex > 0 ? activeIndex - 1 : optionsCount - 1;
          setActiveDescendant(prev);
        }
      } else if (e.key === 'Home') {
        if (optionsCount > 0) {
          e.preventDefault();
          setActiveDescendant(0);
        }
      } else if (e.key === 'End') {
        if (optionsCount > 0) {
          e.preventDefault();
          setActiveDescendant(optionsCount - 1);
        }
      } else if (e.key === 'Enter') {
        if (optionsCount > 0 && activeIndex >= 0 && activeIndex < optionsCount) {
          e.preventDefault();
          window.location.href = toolUrl(searchResults[activeIndex].slug);
        }
      } else if (e.key === 'Tab') {
        // Simple trap between input and close button
        const focusables = modal.querySelectorAll('input, button:not([disabled])');
        if (focusables.length < 2) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // --- Homepage search form: opens the command palette with what was typed ---
  function initHomepageSearch() {
    const form = document.getElementById('hero-search-form');
    const field = document.getElementById('hero-search-input');
    if (!form || !field) return;

    field.addEventListener('focus', fetchSearchIndex, { once: true });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      openPalette(field.value.trim());
    });

    // ?q= from the WebSite SearchAction or external links opens the palette pre-filled
    try {
      const initialQuery = new URLSearchParams(window.location.search).get('q');
      if (initialQuery) {
        field.value = initialQuery;
        openPalette(initialQuery);
      }
    } catch (e) {}
  }

  // --- All Tools Directory (/tools/) Interactive Filtering ---
  function initDirectoryPage() {
    const searchInput = document.getElementById('directory-search');
    const filterChips = document.querySelectorAll('.directory-filter-bar .tool-filter-chip');
    const categoryBlocks = document.querySelectorAll('.directory-category-block');
    const noResults = document.getElementById('directory-no-results');

    if (!searchInput && !filterChips.length && !categoryBlocks.length) return;

    let activeCategory = 'all';
    let searchQuery = '';

    function applyFilters() {
      const q = searchQuery.toLowerCase().trim();
      let totalVisible = 0;

      categoryBlocks.forEach(block => {
        const cat = block.getAttribute('data-category');
        const rows = block.querySelectorAll('.tool-card');
        let visibleInBlock = 0;

        const categoryMatches = (activeCategory === 'all' || activeCategory === cat);

        rows.forEach(row => {
          const item = row.parentElement;
          if (!categoryMatches) {
            item.style.display = 'none';
            return;
          }

          if (!q) {
            item.style.display = '';
            visibleInBlock++;
            totalVisible++;
            return;
          }

          const title = (row.querySelector('.tool-title')?.textContent || '').toLowerCase();
          const desc = (row.querySelector('.tool-desc')?.textContent || '').toLowerCase();
          const slug = (row.getAttribute('data-slug') || '').toLowerCase();

          if (title.includes(q) || desc.includes(q) || slug.includes(q)) {
            item.style.display = '';
            visibleInBlock++;
            totalVisible++;
          } else {
            item.style.display = 'none';
          }
        });

        if (visibleInBlock > 0) {
          block.style.display = '';
        } else {
          block.style.display = 'none';
        }
      });

      if (noResults) {
        if (totalVisible === 0) {
          noResults.removeAttribute('hidden');
        } else {
          noResults.setAttribute('hidden', '');
        }
      }
    }

    // Filter chip clicks
    filterChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = chip.getAttribute('data-category');
        activeCategory = cat || 'all';

        filterChips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');

        applyFilters();
      });
    });

    // Search input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        applyFilters();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          searchQuery = '';
          applyFilters();
        }
      });
    }
  }

})();
