/**
 * Python Formatter UI Controller
 * Shared code formatter UI (assets/js/code-formatter.js) driven by PythonFormatterLogic,
 * which loads the self-hosted Ruff WebAssembly engine on first use.
 */
document.addEventListener('DOMContentLoaded', () => {
  ToolsBuilt.codeFormatter.init({
    logic: window.PythonFormatterLogic,
    storageKey: 'toolsbuilt:python-formatter'
  });
});
