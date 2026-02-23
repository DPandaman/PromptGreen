/**
 * Typed wrapper for chrome.storage.local. Safe in service worker and extension pages.
 */
(function (global) {
  const C = global.PromptGreen && global.PromptGreen.constants;
  if (!C) throw new Error('Load shared/constants.js first');

  const KEYS = C.STORAGE_KEYS;
  const DEFAULTS = C.DEFAULTS;
  const REGION_CO2 = C.REGION_CO2_G_PER_KWH;

  function get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (data) => resolve(data[key]));
    });
  }

  function set(items) {
    return new Promise((resolve) => {
      chrome.storage.local.set(items, resolve);
    });
  }

  async function getSettings() {
    const raw = await get(KEYS.SETTINGS);
    const region = raw?.region ?? DEFAULTS.region;
    return {
      theme: raw?.theme ?? DEFAULTS.theme,
      region,
      co2_grams_per_kwh: raw?.co2_grams_per_kwh ?? REGION_CO2[region] ?? DEFAULTS.co2_grams_per_kwh,
      kwh_per_1k_tokens: raw?.kwh_per_1k_tokens ?? DEFAULTS.kwh_per_1k_tokens,
      time_saved_seconds_per_1k_tokens: raw?.time_saved_seconds_per_1k_tokens ?? DEFAULTS.time_saved_seconds_per_1k_tokens,
    };
  }

  async function setSettings(partial) {
    const raw = (await get(KEYS.SETTINGS)) || {};
    for (const k of Object.keys(partial)) {
      if (partial[k] === undefined || partial[k] === '') delete raw[k];
      else raw[k] = partial[k];
    }
    await set({ [KEYS.SETTINGS]: raw });
    return getSettings();
  }

  async function getSessions() {
    const list = await get(KEYS.SESSIONS);
    return Array.isArray(list) ? list : [];
  }

  async function appendSession(session) {
    const list = await getSessions();
    list.unshift(session);
    await set({ [KEYS.SESSIONS]: list });
  }

  async function getCurrentSession() {
    return get(KEYS.CURRENT_SESSION);
  }

  async function setCurrentSession(session) {
    await set({ [KEYS.CURRENT_SESSION]: session || null });
  }

  async function getLifetime() {
    const raw = await get(KEYS.LIFETIME);
    return {
      totalTokensSaved: raw?.totalTokensSaved ?? 0,
      totalEnergyKwh: raw?.totalEnergyKwh ?? 0,
      totalCo2Grams: raw?.totalCo2Grams ?? 0,
      totalSessions: raw?.totalSessions ?? 0,
      totalDurationSeconds: raw?.totalDurationSeconds ?? 0,
    };
  }

  async function addToLifetime(delta) {
    const cur = await getLifetime();
    const next = {
      totalTokensSaved: cur.totalTokensSaved + (delta.tokensSaved || 0),
      totalEnergyKwh: cur.totalEnergyKwh + (delta.energyKwh || 0),
      totalCo2Grams: cur.totalCo2Grams + (delta.co2Grams || 0),
      totalSessions: cur.totalSessions + (delta.sessions || 0),
      totalDurationSeconds: cur.totalDurationSeconds + (delta.durationSeconds || 0),
    };
    await set({ [KEYS.LIFETIME]: next });
    return next;
  }

  async function isOnboardingDone() {
    const done = await get(KEYS.ONBOARDING_DONE);
    return !!done;
  }

  async function setOnboardingDone() {
    await set({ [KEYS.ONBOARDING_DONE]: true });
  }

  async function clearAllData() {
    await set({
      [KEYS.SESSIONS]: [],
      [KEYS.CURRENT_SESSION]: null,
      [KEYS.LIFETIME]: {
        totalTokensSaved: 0,
        totalEnergyKwh: 0,
        totalCo2Grams: 0,
        totalSessions: 0,
        totalDurationSeconds: 0,
      },
    });
  }

  const EXPORT = {
    get,
    set,
    getSettings,
    setSettings,
    getSessions,
    appendSession,
    getCurrentSession,
    setCurrentSession,
    getLifetime,
    addToLifetime,
    isOnboardingDone,
    setOnboardingDone,
    clearAllData,
  };

  if (typeof global.PromptGreen === 'undefined') global.PromptGreen = {};
  global.PromptGreen.storage = EXPORT;
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this);
