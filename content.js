// Inlined local helpers (avoid ES module import in content script)
function countTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

function optimizePrompt(text) {
    if (!text) return text;
    let optimized = text;
    optimized = optimized.replace(/\s+/g, ' ').trim();
    const fillers = ["please", "kindly", "actually", "just", "literally", "thanks", "thank you"];
    fillers.forEach(f => {
        optimized = optimized.replace(new RegExp(`\\b${f}\\b`, 'gi'), '');
    });
    const openings = ["Could you please", "Could you", "Can you please", "Can you", "Would you please", "Would you mind", "Would you"];
    openings.forEach(p => {
        optimized = optimized.replace(new RegExp(p, 'gi'), '');
    });
    optimized = optimized.replace(/\b(\w+)(?:\s+\1)+\b/gi, '$1');
    optimized = optimized.replace(/\s+([,.!?;:])/g, '$1');
    optimized = optimized.replace(/\s+/g, ' ').trim();
    if (!optimized) return text;
    return optimized;
}

// Lightweight real-time handler: only remove the word "please" after a short delay.
function removePleaseAfterDelay(inputEl, isContentEditable) {
    // clear any existing timer
    const existing = inputEl.dataset.pleaseTimer;
    if (existing) {
        clearTimeout(Number(existing));
        inputEl.dataset.pleaseTimer = '';
    }

    // schedule removal in 3s; perform surgical removal for contenteditable fields
    const t = setTimeout(() => {
        const current = isContentEditable ? inputEl.innerText : inputEl.value;
        if (!/\bplease\b/i.test(current)) { inputEl.dataset.pleaseTimer = ''; return; }

        if (isContentEditable) {
            try {
                const sel = window.getSelection();
                let caretOffset = 0;
                if (sel && sel.rangeCount) {
                    const range = sel.getRangeAt(0).cloneRange();
                    const pre = range.cloneRange();
                    pre.selectNodeContents(inputEl);
                    pre.setEnd(range.endContainer, range.endOffset);
                    caretOffset = pre.toString().length;
                }

                // try to remove the nearest 'please' before the caret using text-node ranges
                const beforeText = inputEl.innerText.slice(0, caretOffset);
                const m = /\bplease\b/i.exec(beforeText);
                let removed = false;
                if (m) {
                    const startIndex = m.index;
                    const endIndex = startIndex + m[0].length;
                    const startPos = findNodeForOffset(inputEl, startIndex);
                    const endPos = findNodeForOffset(inputEl, endIndex);
                    if (startPos && endPos && startPos.node && endPos.node) {
                        const r = document.createRange();
                        r.setStart(startPos.node, startPos.offset);
                        r.setEnd(endPos.node, endPos.offset);
                        r.deleteContents();
                        removed = true;
                    }
                }

                if (!removed) {
                    const cleaned = inputEl.innerText.replace(/\bplease\b/gi, '').replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
                    if (cleaned !== inputEl.innerText) inputEl.innerText = cleaned;
                }
            } catch (err) {
                const cleaned = inputEl.innerText.replace(/\bplease\b/gi, '').replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
                if (cleaned !== inputEl.innerText) inputEl.innerText = cleaned;
            }
        } else {
            const start = inputEl.selectionStart;
            const end = inputEl.selectionEnd;
            const cleaned = current.replace(/\bplease\b/gi, '').replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
            if (cleaned !== current) {
                inputEl.value = cleaned;
                const delta = current.length - cleaned.length;
                const ns = Math.max(0, start - delta);
                const ne = Math.max(0, end - delta);
                inputEl.setSelectionRange(ns, ne);
            }
        }

        inputEl.dataset.pleaseTimer = '';
    }, 3000);

    inputEl.dataset.pleaseTimer = String(t);
}

function setCaretPosition(el, chars) {
    if (chars < 0) chars = 0;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    const range = document.createRange();
    let nodeStack = [el], node, found = false, charCount = 0;
    while (nodeStack.length && !found) {
        node = nodeStack.shift();
        if (node.nodeType === 3) {
            const nextCount = charCount + node.textContent.length;
            if (chars <= nextCount) {
                range.setStart(node, Math.max(0, chars - charCount));
                range.collapse(true);
                found = true;
                break;
            }
            charCount = nextCount;
        } else {
            for (let i = 0; i < node.childNodes.length; i++) nodeStack.unshift(node.childNodes[i]);
        }
    }
    if (!found) {
        range.selectNodeContents(el);
        range.collapse(false);
    }
    selection.addRange(range);
}

function findNodeForOffset(container, offset) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    let count = 0;
    while (node) {
        const next = count + node.textContent.length;
        if (offset <= next) {
            return { node, offset: offset - count };
        }
        count = next;
        node = walker.nextNode();
    }
    return { node: container, offset: 0 };
}

// ======== Prompt Optimizer ========
function attachOptimizer(inputEl) {
    if (!inputEl || inputEl.dataset.ecoAttached) return;
    inputEl.dataset.ecoAttached = '1';

    const isContentEditable = !!inputEl.isContentEditable || inputEl.tagName === 'DIV' && inputEl.getAttribute('role') === 'textbox';

    const handleSubmitKey = (e) => {
        // run on Enter (without Shift/Ctrl/Meta) using capture so it runs before site handlers
        if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return;

        const original = isContentEditable ? inputEl.innerText : inputEl.value;
        const optimized = optimizePrompt(original);

        // only update the field if we shortened or changed it meaningfully
        if (optimized && optimized !== original) {
            if (isContentEditable) inputEl.innerText = optimized;
            else inputEl.value = optimized;

            const last = inputEl.dataset.lastProcessed || '';
            if (optimized !== last) {
                const savedTokens = Math.max(0, countTokens(original) - countTokens(optimized));
                if (savedTokens > 0) {
                    chrome.storage.local.get(['tokensSaved'], (data) => {
                        const newTotal = (data.tokensSaved || 0) + savedTokens;
                        chrome.storage.local.set({ tokensSaved: newTotal });
                    });
                }
                inputEl.dataset.lastProcessed = optimized;
            }
        }
        // allow the event to continue so the site will submit the prompt as usual
    };

    // minimal, low-cost input handler: if the field contains "please", schedule removal after 3s
    const handleInput = (e) => {
        if (inputEl.dataset._composing) return; // ignore during IME composition
        const txt = isContentEditable ? inputEl.innerText : inputEl.value;
        if (/\bplease\b/i.test(txt)) {
            removePleaseAfterDelay(inputEl, isContentEditable);
        } else {
            // if user removed the word before timer fired, clear timer
            const existing = inputEl.dataset.pleaseTimer;
            if (existing) { clearTimeout(Number(existing)); inputEl.dataset.pleaseTimer = ''; }
        }
    };

    inputEl.addEventListener('compositionstart', () => { inputEl.dataset._composing = '1'; }, true);
    inputEl.addEventListener('compositionend', () => { inputEl.dataset._composing = ''; handleInput(); }, true);
    inputEl.addEventListener('input', handleInput, false);
    // use capture so we run before page scripts
    inputEl.addEventListener('keydown', handleSubmitKey, true);
}

// Attach immediately if textarea exists
// Attach to existing textareas and common contenteditable chat inputs
document.querySelectorAll('textarea').forEach(attachOptimizer);
document.querySelectorAll('[contenteditable="true"]').forEach(attachOptimizer);
document.querySelectorAll('[role="textbox"]').forEach(attachOptimizer);

// Observe for dynamically added textareas
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (!node || node.nodeType !== 1) return;

            if (node.tagName === 'TEXTAREA') attachOptimizer(node);
            if (node.querySelectorAll) {
                node.querySelectorAll('textarea').forEach(attachOptimizer);
                node.querySelectorAll('[contenteditable="true"]').forEach(attachOptimizer);
                node.querySelectorAll('[role="textbox"]').forEach(attachOptimizer);
            }
            // also check if the node itself is contenteditable
            if (node.isContentEditable) attachOptimizer(node);
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
                width: 240px;
                padding: 10px;
                background: #ffffff;
                color: #08350f;
                border: 2px solid #0b6b2b;
                border-radius: 8px;
                z-index: 999999999;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        `;
        div.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <h4 style="margin:0;font-size:14px;">Prompt EcoSaver</h4>
                    <button id="eco-close" title="Close" style="background:transparent;border:none;color:#0b6b2b;font-weight:bold;cursor:pointer;">✕</button>
                </div>
                <div style="text-align:left;font-size:13px;">
                    <p style="margin:4px 0;">Tokens Saved: <strong id="tokens">0</strong></p>
                    <p style="margin:4px 0;">Energy: <strong id="energy">0</strong> kWh</p>
                    <p style="margin:4px 0;">CO₂: <strong id="co2">0</strong> kg</p>
                </div>
                <div style="text-align:right;margin-top:8px;">
                    <button id="reset-eco" style="padding:6px 8px;background:#0b6b2b;color:white;border:none;border-radius:4px;cursor:pointer;">Reset</button>
                </div>
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
    // Close button
    const closeBtn = div.querySelector('#eco-close');
    if (closeBtn) closeBtn.addEventListener('click', () => div.remove());
}

// Inject after a short delay to let page load
setTimeout(injectDashboard, 2000);