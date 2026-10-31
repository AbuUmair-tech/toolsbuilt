/**
 * Java Formatter UI Controller
 * Shared code formatter UI (assets/js/code-formatter.js) driven by JavaFormatterLogic,
 * which loads the self-hosted Prettier, prettier-plugin-java and tree-sitter files on first use.
 */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.code-formatter');
  window.JavaFormatterLogic.configure({ grammarUrl: root && root.dataset.grammarUrl });
  ToolsBuilt.codeFormatter.init({
    logic: window.JavaFormatterLogic,
    storageKey: 'toolsbuilt:java-formatter'
  });
});
