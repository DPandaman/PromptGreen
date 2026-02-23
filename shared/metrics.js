/**
 * Pure functions for metrics computation. No side effects.
 * Used by service worker and report page.
 */
(function (global) {
  /**
   * @param {number} tokensSaved
   * @param {number} kwhPer1kTokens
   * @returns {number} energy in kWh
   */
  function energyKwhFromTokens(tokensSaved, kwhPer1kTokens) {
    return (tokensSaved / 1000) * kwhPer1kTokens;
  }

  /**
   * @param {number} energyKwh
   * @param {number} co2GramsPerKwh
   * @returns {number} CO2 in grams
   */
  function co2GramsFromEnergy(energyKwh, co2GramsPerKwh) {
    return energyKwh * co2GramsPerKwh;
  }

  /**
   * @param {number} tokensSaved
   * @param {number} kwhPer1kTokens
   * @param {number} co2GramsPerKwh
   * @returns {{ energyKwh: number, co2Grams: number }}
   */
  function computeFromTokens(tokensSaved, kwhPer1kTokens, co2GramsPerKwh) {
    const energyKwh = energyKwhFromTokens(tokensSaved, kwhPer1kTokens);
    const co2Grams = co2GramsFromEnergy(energyKwh, co2GramsPerKwh);
    return { energyKwh, co2Grams };
  }

  /**
   * @param {number} seconds
   * @param {number} [timeSavedPer1kTokens]
   * @returns {number} optional time-saved estimate in seconds
   */
  function timeSavedSeconds(tokensSaved, timeSavedPer1kTokens) {
    if (timeSavedPer1kTokens == null) return 0;
    return (tokensSaved / 1000) * timeSavedPer1kTokens;
  }

  const EXPORT = {
    energyKwhFromTokens,
    co2GramsFromEnergy,
    computeFromTokens,
    timeSavedSeconds,
  };

  if (typeof global.PromptGreen === 'undefined') global.PromptGreen = {};
  global.PromptGreen.metrics = EXPORT;
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this);
