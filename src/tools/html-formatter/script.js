/**
 * HTML Formatter UI Controller
 * Shared code formatter UI (assets/js/code-formatter.js) driven by HtmlFormatterLogic,
 * which loads the self-hosted Prettier HTML, CSS and JavaScript printers on first use.
 */
document.addEventListener('DOMContentLoaded', () => {
  ToolsBuilt.codeFormatter.init({
    logic: window.HtmlFormatterLogic,
    storageKey: 'toolsbuilt:html-formatter'
  });
});
