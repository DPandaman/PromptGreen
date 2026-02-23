/* global chrome */
importScripts('shared/constants.js', 'shared/metrics.js', 'shared/storage.js');

const storage = self.PromptGreen.storage;
const metrics = self.PromptGreen.metrics;
const KEYS = self.PromptGreen.constants.STORAGE_KEYS;

async function getSettings() {
  return storage.getSettings();
}

async function startSession() {
  const existing = await storage.getCurrentSession();
  if (existing && existing.running) return { ok: false, reason: 'already_running' };

  const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  const session = {
    id,
    startTime: Date.now(),
    endTime: null,
    durationSeconds: null,
    tokensSaved: 0,
    energySavedKwh: 0,
    co2SavedGrams: 0,
    actions: [],
    running: true,
  };
  await storage.setCurrentSession(session);
  return { ok: true, session };
}

async function endSession() {
  const session = await storage.getCurrentSession();
  if (!session || !session.running) return { ok: false, reason: 'no_session' };

  const endTime = Date.now();
  const durationSeconds = Math.floor((endTime - session.startTime) / 1000);
  const finalized = {
    ...session,
    endTime,
    durationSeconds,
    energySavedKwh: session.energySavedKwh || 0,
    co2SavedGrams: session.co2SavedGrams || 0,
    running: false,
  };
  await storage.appendSession(finalized);
  await storage.addToLifetime({
    tokensSaved: session.tokensSaved,
    energyKwh: finalized.energySavedKwh,
    co2Grams: finalized.co2SavedGrams,
    sessions: 1,
    durationSeconds,
  });
  await storage.setCurrentSession(null);
  return { ok: true, session: finalized };
}

async function recordAction(payload) {
  const session = await storage.getCurrentSession();
  if (!session || !session.running) return { ok: false };

  const settings = await getSettings();
  const { energyKwh, co2Grams } = metrics.computeFromTokens(
    payload.tokensSavedDelta,
    settings.kwh_per_1k_tokens,
    settings.co2_grams_per_kwh
  );

  const action = {
    timestamp: Date.now(),
    type: payload.type || 'other',
    tokensSavedDelta: payload.tokensSavedDelta || 0,
    meta: payload.meta || {},
  };
  session.actions.push(action);
  session.tokensSaved += action.tokensSavedDelta;
  session.energySavedKwh += energyKwh;
  session.co2SavedGrams += co2Grams;
  await storage.setCurrentSession(session);
  return { ok: true, session };
}

async function getState() {
  const [current, sessions, lifetime, settings, onboardingDone] = await Promise.all([
    storage.getCurrentSession(),
    storage.getSessions(),
    storage.getLifetime(),
    getSettings(),
    storage.isOnboardingDone(),
  ]);
  return {
    currentSession: current,
    sessions,
    lifetime,
    settings,
    onboardingDone: !!onboardingDone,
  };
}

function recoverStaleSession() {
  return storage.getCurrentSession().then((session) => {
    if (session && session.running) return session;
    return null;
  });
}

chrome.runtime.onInstalled.addListener(() => {
  recoverStaleSession().then((session) => {
    if (session) storage.setCurrentSession({ ...session, running: true });
  });
});

chrome.runtime.onStartup.addListener(() => {
  recoverStaleSession().then((session) => {
    if (session) storage.setCurrentSession({ ...session, running: true });
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handlers = {
    startSession: () => startSession().then(sendResponse),
    endSession: () => endSession().then(sendResponse),
    recordAction: () => recordAction(msg.payload || {}).then(sendResponse),
    getState: () => getState().then(sendResponse),
    resumeSession: () => recoverStaleSession().then((s) => sendResponse({ resumed: !!s, session: s })),
  };
  const fn = handlers[msg.type];
  if (fn) {
    fn();
    return true;
  }
  sendResponse({ ok: false, reason: 'unknown' });
  return false;
});
