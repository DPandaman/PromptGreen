const kWhPer1000Tokens = 0.003; // example estimate
const co2PerKWh = 0.5;          // kg CO2 per kWh

function updatePopup() {
    chrome.storage.local.get(['tokensSaved'], (data) => {
        const tokens = data.tokensSaved || 0;
        const energy = (tokens / 1000) * kWhPer1000Tokens;
        const co2 = energy * co2PerKWh;

        document.getElementById('tokens').innerText = tokens;
        document.getElementById('energy').innerText = energy.toFixed(4);
        document.getElementById('co2').innerText = co2.toFixed(4);
    });
}

// Reset button
document.getElementById('reset').addEventListener('click', () => {
    chrome.storage.local.set({ tokensSaved: 0 }, updatePopup);
});

// Update on load
updatePopup();