/**
 * ToolsBuilt - Shared JavaScript Logic
 * Handles Icon Injection and In-Page Tool/FAQ Accordions.
 * Layout, Header, Search, and Mobile Drawer are handled in layout.js.
 */

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initAccordions();
});

/**
 * Icon Injection from window.ICONS registry
 */
function initIcons() {
  if (!window.ICONS) return;
  document.querySelectorAll('[data-icon]').forEach(el => {
    const iconName = el.getAttribute('data-icon');
    if (iconName && window.ICONS[iconName] && !el.innerHTML.trim()) {
      el.innerHTML = window.ICONS[iconName];
    }
  });
}

/**
 * Accessible In-Page Accordion Component (e.g., FAQ sections)
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

      header.setAttribute('aria-expanded', !isExpanded);
      if (isExpanded) {
        content.setAttribute('hidden', '');
      } else {
        content.removeAttribute('hidden');
      }
    });
  });
}
