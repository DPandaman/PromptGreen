(function () {
  const storage = window.PromptGreen.storage;
  const ui = window.PromptGreen.ui;

  const regionSelect = document.getElementById('region');
  const themeSelect = document.getElementById('theme');
  const btnStart = document.getElementById('btnStart');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  themeSelect.addEventListener('change', () => {
    applyTheme(ui.resolveTheme(themeSelect.value));
  });

  applyTheme(ui.resolveTheme(themeSelect.value));

  btnStart.addEventListener('click', async () => {
    const region = regionSelect.value;
    const theme = themeSelect.value;
    await storage.setSettings({ region, theme });
    await storage.setOnboardingDone();
    window.location.href = chrome.runtime.getURL('popup.html');
  });
})();
