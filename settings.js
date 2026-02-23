(function () {
  const storage = window.PromptGreen.storage;
  const ui = window.PromptGreen.ui;
  const C = window.PromptGreen.constants;

  const themeSelect = document.getElementById('theme');
  const regionSelect = document.getElementById('region');
  const co2Input = document.getElementById('co2');
  const kwhInput = document.getElementById('kwh');
  const timeSavedInput = document.getElementById('timeSaved');
  const btnSave = document.getElementById('btnSave');
  const backLink = document.getElementById('back');

  backLink.href = chrome.runtime.getURL('popup.html');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', ui.resolveTheme(theme));
  }

  async function load() {
    const s = await storage.getSettings();
    themeSelect.value = s.theme;
    regionSelect.value = s.region;
    co2Input.value = s.co2_grams_per_kwh ?? '';
    kwhInput.value = s.kwh_per_1k_tokens ?? '';
    timeSavedInput.value = s.time_saved_seconds_per_1k_tokens ?? '';
    applyTheme(s.theme);
  }

  themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));

  regionSelect.addEventListener('change', () => {
    const val = regionSelect.value;
    if (val !== 'custom') co2Input.value = C.REGION_CO2_G_PER_KWH[val] ?? '';
  });

  btnSave.addEventListener('click', async () => {
    const co2 = co2Input.value.trim();
    const kwh = kwhInput.value.trim();
    const timeSaved = timeSavedInput.value.trim();
    await storage.setSettings({
      theme: themeSelect.value,
      region: regionSelect.value,
      co2_grams_per_kwh: co2 !== '' ? Number(co2) : undefined,
      kwh_per_1k_tokens: kwh !== '' ? Number(kwh) : undefined,
      time_saved_seconds_per_1k_tokens: timeSaved !== '' ? Number(timeSaved) : undefined,
    });
    applyTheme(themeSelect.value);
    window.close();
  });

  load();
})();
