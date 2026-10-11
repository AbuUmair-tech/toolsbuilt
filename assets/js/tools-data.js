/**
 * Shared Registry of ToolsBuilt Tools
 * Maps tools to categories, URLs, descriptions, SVG icon names, and related tool IDs.
 */

window.TOOLS_DATA = [
  {
    id: 'days-until-date-calculator',
    name: 'Days Until Date Calculator',
    url: '/tools/days-until-date-calculator/',
    icon: 'calendar-clock',
    description: 'Calculate exact total days, weeks, and months remaining until any future event, birthday, or holiday.',
    category: 'Date & Time',
    categoryId: 'date-time',
    popular: true,
    related: ['date-difference-calculator', 'add-days-to-date-calculator', 'age-calculator']
  },
  {
    id: 'date-difference-calculator',
    name: 'Date Difference Calculator',
    url: '/tools/date-difference-calculator/',
    icon: 'calendar-range',
    description: 'Calculate total days, working business days (Mon-Fri), and time spans between any two calendar dates.',
    category: 'Date & Time',
    categoryId: 'date-time',
    popular: true,
    related: ['days-until-date-calculator', 'add-days-to-date-calculator', 'age-calculator']
  },
  {
    id: 'add-days-to-date-calculator',
    name: 'Add or Subtract Days Calculator',
    url: '/tools/add-days-to-date-calculator/',
    icon: 'calendar-plus',
    description: 'Add or subtract days, weeks, months, or years from a date, with an optional business days only mode.',
    category: 'Date & Time',
    categoryId: 'date-time',
    popular: true,
    related: ['date-difference-calculator', 'days-until-date-calculator', 'age-calculator']
  },
  {
    id: 'age-calculator',
    name: 'Age Calculator',
    url: '/tools/age-calculator/',
    icon: 'cake',
    description: 'Calculate exact age in years, months, days, weeks, total hours, and countdown to your next birthday.',
    category: 'Date & Time',
    categoryId: 'date-time',
    popular: true,
    related: ['days-until-date-calculator', 'date-difference-calculator', 'discount-calculator']
  },
  {
    id: 'percentage-change-calculator',
    name: 'Percentage Change Calculator',
    url: '/tools/percentage-change-calculator/',
    icon: 'percent',
    description: 'Calculate percentage increase/decrease, percentage differences, and percent of numbers with step-by-step formulas.',
    category: 'Math',
    categoryId: 'math',
    popular: true,
    related: ['discount-calculator', 'word-counter', 'date-difference-calculator']
  },
  {
    id: 'discount-calculator',
    name: 'Discount Calculator',
    url: '/tools/discount-calculator/',
    icon: 'tag',
    description: 'Calculate final sale prices, total savings, stacked double discounts, and final price including sales tax.',
    category: 'Math',
    categoryId: 'math',
    popular: true,
    related: ['percentage-change-calculator', 'age-calculator', 'password-generator']
  },
  {
    id: 'word-counter',
    name: 'Word & Character Counter',
    url: '/tools/word-counter/',
    icon: 'text-cursor',
    description: 'Count words, characters (with and without spaces), sentences, paragraphs, and reading time live as you type.',
    category: 'Text',
    categoryId: 'text',
    popular: true,
    related: ['text-case-converter', 'password-generator', 'percentage-change-calculator']
  },
  {
    id: 'text-case-converter',
    name: 'Text Case Converter',
    url: '/tools/text-case-converter/',
    icon: 'case-sensitive',
    description: 'Instantly convert text between UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case, and kebab-case.',
    category: 'Text',
    categoryId: 'text',
    popular: true,
    related: ['word-counter', 'password-generator', 'date-difference-calculator']
  },
  {
    id: 'password-generator',
    name: 'Strong Password Generator',
    url: '/tools/password-generator/',
    icon: 'key',
    description: 'Generate secure, customizable passwords locally using cryptographically secure random numbers (crypto.getRandomValues).',
    category: 'Security',
    categoryId: 'security',
    popular: true,
    related: ['word-counter', 'text-case-converter', 'discount-calculator']
  },
  {
    id: 'random-name-picker',
    name: 'Random Name Picker Wheel',
    url: '/tools/random-name-picker/',
    icon: 'wheel',
    description: 'Spin an interactive wheel to randomly pick a winner from a list of names using cryptographically fair randomness.',
    category: 'Fun & Random',
    categoryId: 'fun',
    popular: true,
    related: ['password-generator', 'word-counter', 'days-until-date-calculator']
  }
];

/**
 * Helper to render Related Tools section dynamically into container `#related-tools-grid`
 */
function renderRelatedTools(currentToolId) {
  const container = document.getElementById('related-tools-grid');
  if (!container || !window.TOOLS_DATA) return;

  const currentTool = window.TOOLS_DATA.find(t => t.id === currentToolId);
  let relatedTools = [];

  if (currentTool && currentTool.related) {
    relatedTools = currentTool.related
      .map(id => window.TOOLS_DATA.find(t => t.id === id))
      .filter(Boolean);
  }

  if (relatedTools.length < 3) {
    const others = window.TOOLS_DATA.filter(t => t.id !== currentToolId && !relatedTools.includes(t));
    relatedTools = relatedTools.concat(others).slice(0, 3);
  }

  const arrowRightSvg = window.ICONS && window.ICONS['arrow-right'] ? window.ICONS['arrow-right'] : '';

  container.innerHTML = relatedTools.map(tool => {
    const iconSvg = window.getIconSvg ? window.getIconSvg(tool.icon) : '';
    return `
      <a href="${tool.url}" class="tool-card">
        <div class="tool-icon-tile" data-cat="${tool.categoryId}">
          ${iconSvg}
        </div>
        <h3>${tool.name}</h3>
        <p>${tool.description}</p>
        <div class="tool-card-action">
          <span>Use Tool</span>
          ${arrowRightSvg}
        </div>
      </a>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const currentToolId = document.body.getAttribute('data-tool-id');
  if (currentToolId) {
    renderRelatedTools(currentToolId);
  }
});
