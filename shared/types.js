/**
 * JSDoc type definitions for PromptGreen (no runtime dependency).
 * @typedef {'auto'|'light'|'dark'} ThemeMode
 * @typedef {'US'|'EU'|'IN'|'custom'} Region
 *
 * @typedef {Object} UserSettings
 * @property {ThemeMode} theme
 * @property {Region} region
 * @property {number} co2_grams_per_kwh
 * @property {number} kwh_per_1k_tokens
 * @property {number} [time_saved_seconds_per_1k_tokens]
 *
 * @typedef {Object} ActionEvent
 * @property {number} timestamp
 * @property {string} type
 * @property {number} tokensSavedDelta
 * @property {Object.<string, string>} [meta]
 *
 * @typedef {Object} Session
 * @property {string} id
 * @property {number} startTime
 * @property {number} [endTime]
 * @property {number} [durationSeconds]
 * @property {number} tokensSaved
 * @property {number} energySavedKwh
 * @property {number} co2SavedGrams
 * @property {ActionEvent[]} actions
 * @property {boolean} [running]
 *
 * @typedef {Object} LifetimeTotals
 * @property {number} totalTokensSaved
 * @property {number} totalEnergyKwh
 * @property {number} totalCo2Grams
 * @property {number} totalSessions
 * @property {number} totalDurationSeconds
 */
