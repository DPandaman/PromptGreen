/**
 * UI helpers: formatting, theme. For extension pages only (not service worker).
 */
(function (global) {
  function formatInteger(n) {
    return Number(n).toLocaleString();
  }

  function formatKwh(n) {
    return Number(n).toFixed(3);
  }

  function formatCo2Grams(n) {
    return Number(n).toFixed(1);
  }

  function formatDuration(seconds) {
    if (seconds == null || seconds < 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return `${m}m ${s}s`;
  }

  function formatDate(ms) {
    return new Date(ms).toLocaleDateString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  /**
   * Resolve effective theme: 'light' | 'dark'
   * @param {'auto'|'light'|'dark'} preference
   * @returns {'light'|'dark'}
   */
  function resolveTheme(preference) {
    if (preference === 'light') return 'light';
    if (preference === 'dark') return 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  const EXPORT = {
    formatInteger,
    formatKwh,
    formatCo2Grams,
    formatDuration,
    formatDate,
    resolveTheme,
    applyTheme,
  };

  if (typeof global.PromptGreen === 'undefined') global.PromptGreen = {};
  global.PromptGreen.ui = EXPORT;
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this);
