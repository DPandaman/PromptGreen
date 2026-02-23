/**
 * PromptGreen – shared constants (worker + extension pages).
 * Use via importScripts in worker; load as script in popup/report/onboarding.
 */
(function (global) {
  const REGION_CO2_G_PER_KWH = {
    US: 385,
    EU: 275,
    IN: 708,
    custom: 400,
  };

  const DEFAULTS = {
    kwh_per_1k_tokens: 0.003,
    co2_grams_per_kwh: REGION_CO2_G_PER_KWH.US,
    time_saved_seconds_per_1k_tokens: 5,
    theme: 'auto',
    region: 'US',
  };

  const ACTION_TYPES = [
    'summarize',
    'rewrite',
    'compress',
    'filter',
    'dedupe',
    'template_apply',
    'prompt_optimize',
    'other',
  ];

  const STORAGE_KEYS = {
    SETTINGS: 'pg_settings',
    SESSIONS: 'pg_sessions',
    LIFETIME: 'pg_lifetime',
    CURRENT_SESSION: 'pg_current_session',
    ONBOARDING_DONE: 'pg_onboarding_done',
  };

  const VERSION = '1.0.0';

  const EXPORT = {
    REGION_CO2_G_PER_KWH,
    DEFAULTS,
    ACTION_TYPES,
    STORAGE_KEYS,
    VERSION,
  };

  if (typeof global.PromptGreen === 'undefined') global.PromptGreen = {};
  global.PromptGreen.constants = EXPORT;
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this);
