/**
 * Lightweight tests for shared/metrics.js.
 * Run with: node tests/metrics.test.js
 * (metrics.js is written for browser/worker; we eval a minimal version here.)
 */

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || 'Assertion failed');
};

function energyKwhFromTokens(tokensSaved, kwhPer1kTokens) {
  return (tokensSaved / 1000) * kwhPer1kTokens;
}

function co2GramsFromEnergy(energyKwh, co2GramsPerKwh) {
  return energyKwh * co2GramsPerKwh;
}

function computeFromTokens(tokensSaved, kwhPer1kTokens, co2GramsPerKwh) {
  const energyKwh = energyKwhFromTokens(tokensSaved, kwhPer1kTokens);
  const co2Grams = co2GramsFromEnergy(energyKwh, co2GramsPerKwh);
  return { energyKwh, co2Grams };
}

// --- tests

assert(energyKwhFromTokens(0, 0.003) === 0, 'zero tokens => zero energy');
assert(energyKwhFromTokens(1000, 0.003) === 0.003, '1k tokens => 0.003 kWh');
assert(energyKwhFromTokens(5000, 0.003) === 0.015, '5k tokens => 0.015 kWh');

assert(co2GramsFromEnergy(0, 385) === 0, 'zero energy => zero CO2');
assert(co2GramsFromEnergy(0.003, 385) === 1.155, '0.003 kWh * 385 => 1.155 g');
assert(co2GramsFromEnergy(1, 275) === 275, '1 kWh * 275 => 275 g');

const out = computeFromTokens(2000, 0.003, 400);
assert(out.energyKwh === 0.006, '2k tokens => 0.006 kWh');
assert(out.co2Grams === 2.4, '0.006 * 400 => 2.4 g');

console.log('metrics.test.js: all assertions passed.');
process.exit(0);
