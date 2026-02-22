import { optimizePrompt, countTokens } from './utils.js';

// ======== Prompt Optimizer ========
function attachOptimizer(inputBox) {
    if (inputBox.dataset.ecoAttached) return;
    inputBox.dataset.ecoAttached = true;

    inputBox.addEventListener('input', () => {
        const original = inputBox.value;
        const optimized = optimizePrompt(original);
        inputBox.value = optimized;

        const savedTokens = countTokens(original) - countTokens(optimized);
        chrome.storage.local.get(['tokensSaved'], (data) => {
            const newTotal = (data.tokensSaved || 0) + savedTokens;
            chrome.storage.local.set({ tokensSaved: newTotal });
        });
    });
}

// Attach immediately if textarea exists
document.querySelectorAll('textarea').forEach(attachOptimizer);

// Observe for dynamically added textareas
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'TEXTAREA') attachOptimizer(node);
            else if (node.querySelectorAll) {
                node.querySelectorAll('textarea').forEach(attachOptimizer);
            }
        });
    });
});
observer.observe(document.body, { childList: true, subtree: true });

// ======== Floating Dashboard ========
function injectDashboard() {
    if (document.getElementById('eco-dashboard')) return;

    const div = document.createElement('div');
    div.id = 'eco-dashboard';
    div.style = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 220px;
        padding: 10px;
        background: white;
        border: 2px solid green;
        border-radius: 8px;
        z-index: 9999;
        font-family: Arial;
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
    `;
    div.innerHTML = `
        <h4 style="margin:0 0 5px 0;">Prompt EcoSaver</h4>
        <p>Tokens Saved: <span id="tokens">0</span></p>
        <p>Energy: <span id="energy">0</span> kWh</p>
        <p>CO₂: <span id="co2">0</span> kg</p>
        <button id="reset-eco" style="margin-top:5px;padding:3px 6px;">Reset</button>
    `;
    document.body.appendChild(div);

    // Update numbers
    const kWhPer1000Tokens = 0.003;
    const co2PerKWh = 0.5;

    setInterval(() => {
        chrome.storage.local.get(['tokensSaved'], (data) => {
            const tokens = data.tokensSaved || 0;
            const energy = (tokens / 1000) * kWhPer1000Tokens;
            const co2 = energy * co2PerKWh;
            div.querySelector('#tokens').innerText = tokens;
            div.querySelector('#energy').innerText = energy.toFixed(4);
            div.querySelector('#co2').innerText = co2.toFixed(4);
        });
    }, 1000);

    // Reset button
    div.querySelector('#reset-eco').addEventListener('click', () => {
        chrome.storage.local.set({ tokensSaved: 0 });
    });
}

// Inject after a short delay to let page load
setTimeout(injectDashboard, 2000);