// Inlined local helpers (avoid ES module import in content script)
function countTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Phrases to remove: polite padding that doesn't change the task for the model (order matters).
const FILLER_WORDS = [
  "please",
  "kindly",
  "actually",
  "just",
  "literally",
  "thanks",
  "thank you",
  "really",
  "basically",
  "simply",
];
const OPENING_PHRASES = [
  "Could you please",
  "Could you",
  "Can you please",
  "Can you",
  "Would you please",
  "Would you mind",
  "Would you",
  "I was wondering if you could",
  "I was wondering if",
  "I would like you to",
  "It would be great if you could",
  "It would be great if",
  "If you could",
  "When you have time",
  "When you get a chance",
  "If you don't mind",
  "If possible",
  "When possible",
  "At your convenience",
];

function textCouldBeOptimized(text) {
  if (!text || text.length < 10) return false;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 10) return false;
  const lower = t.toLowerCase();
  if (
    FILLER_WORDS.some((f) =>
      new RegExp("\\b" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(
        lower,
      ),
    )
  )
    return true;
  if (OPENING_PHRASES.some((p) => lower.startsWith(p.toLowerCase())))
    return true;
  if (/\b(\w+)\s+\1\b/i.test(t)) return true; // repeated word
  return false;
}

function optimizePrompt(text) {
  if (!text) return text;
  let optimized = text;
  optimized = optimized.replace(/\s+/g, " ").trim();
  // Remove polite openings only at the start so we don't break phrases like "what would you do"
  OPENING_PHRASES.forEach((p) => {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    optimized = optimized.replace(
      new RegExp("^\\s*" + escaped + "\\s*", "gi"),
      "",
    );
  });
  FILLER_WORDS.forEach((f) => {
    optimized = optimized.replace(
      new RegExp(
        "\\b" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "gi",
      ),
      "",
    );
  });
  optimized = optimized.replace(/\b(\w+)(?:\s+\1)+\b/gi, "$1");
  optimized = optimized.replace(/\s+([,.!?;:])/g, "$1");
  optimized = optimized.replace(/\s+/g, " ").trim();
  if (!optimized) return text;
  return optimized;
}

// After 3s of no typing, run full prompt optimization. DOM updates are deferred to avoid freezing.
function optimizeAfterDelay(inputEl, isContentEditable) {
  const existing = inputEl.dataset.optimizeTimer;
  if (existing) {
    clearTimeout(Number(existing));
    inputEl.dataset.optimizeTimer = "";
  }

  const t = setTimeout(() => {
    // Element may have been replaced by the page (e.g. React re-render); use it only if still in DOM.
    if (!inputEl.isConnected) {
      inputEl.dataset.optimizeTimer = "";
      return;
    }
    const current = isContentEditable ? (inputEl.innerText || "").trim() : (inputEl.value || "").trim();
    if (!current || !textCouldBeOptimized(current)) {
      inputEl.dataset.optimizeTimer = "";
      return;
    }

    const optimized = optimizePrompt(current);
    if (!optimized || optimized === current) {
      inputEl.dataset.optimizeTimer = "";
      return;
    }

    const savedTokens = Math.max(
      0,
      countTokens(current) - countTokens(optimized),
    );

    // Defer DOM/storage to next tick; ensure we still have a live element when we run.
    const targetEl = inputEl;
    setTimeout(() => {
      if (!targetEl.isConnected) return;
      if (savedTokens > 0) {
        chrome.runtime.sendMessage(
          {
            type: "recordAction",
            payload: {
              type: "prompt_optimize",
              tokensSavedDelta: savedTokens,
              meta: { source: "auto_optimize" },
            },
          },
          () => {}
        );
      }

      targetEl.dataset._ecoUpdating = "1";
      if (isContentEditable) {
        try {
          targetEl.focus();
          targetEl.innerText = optimized;
          targetEl.dataset.lastProcessed = optimized;
          setCaretPosition(targetEl, optimized.length);
          targetEl.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (err) {
          targetEl.innerText = optimized;
          targetEl.dataset.lastProcessed = optimized;
        }
      } else {
        const start = targetEl.selectionStart;
        const end = targetEl.selectionEnd;
        targetEl.value = optimized;
        targetEl.dataset.lastProcessed = optimized;
        const len = optimized.length;
        targetEl.setSelectionRange(Math.min(start, len), Math.min(end, len));
        targetEl.dispatchEvent(new Event("input", { bubbles: true }));
      }
      targetEl.dataset.optimizeTimer = "";
      setTimeout(() => {
        targetEl.dataset._ecoUpdating = "";
      }, 0);
    }, 0);
  }, 3000);

  inputEl.dataset.optimizeTimer = String(t);
}

function setCaretPosition(el, chars) {
  if (chars < 0) chars = 0;
  const selection = window.getSelection();
  if (!selection) return;
  try {
    selection.removeAllRanges();
    const range = document.createRange();
    let nodeStack = [el],
      node,
      found = false,
      charCount = 0;
    while (nodeStack.length && !found) {
      node = nodeStack.shift();
      if (node.nodeType === 3) {
        const len = (node.textContent || "").length;
        const nextCount = charCount + len;
        if (chars <= nextCount) {
          range.setStart(node, Math.min(Math.max(0, chars - charCount), len));
          range.collapse(true);
          found = true;
          break;
        }
        charCount = nextCount;
      } else if (node.childNodes && node.childNodes.length) {
        for (let i = node.childNodes.length - 1; i >= 0; i--)
          nodeStack.unshift(node.childNodes[i]);
      }
    }
    if (!found) {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    selection.addRange(range);
  } catch (_) {
    // Ignore selection errors (e.g. detached node or restricted focus).
  }
}

function findNodeForOffset(container, offset) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );
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
  inputEl.dataset.ecoAttached = "1";

  const isContentEditable =
    !!inputEl.isContentEditable ||
    (inputEl.tagName === "DIV" && inputEl.getAttribute("role") === "textbox");

  const handleSubmitKey = (e) => {
    // run on Enter (without Shift/Ctrl/Meta) using capture so it runs before site handlers
    if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;

    const original = isContentEditable ? inputEl.innerText : inputEl.value;
    const optimized = optimizePrompt(original);

    // only update the field if we shortened or changed it meaningfully
    if (optimized && optimized !== original) {
      if (isContentEditable) inputEl.innerText = optimized;
      else inputEl.value = optimized;

      const last = inputEl.dataset.lastProcessed || "";
      if (optimized !== last) {
        const savedTokens = Math.max(
          0,
          countTokens(original) - countTokens(optimized),
        );
        if (savedTokens > 0) {
          chrome.runtime.sendMessage(
            {
              type: "recordAction",
              payload: {
                type: "prompt_optimize",
                tokensSavedDelta: savedTokens,
                meta: { source: "submit" },
              },
            },
            () => {}
          );
        }
        inputEl.dataset.lastProcessed = optimized;
      }
    }
    // allow the event to continue so the site will submit the prompt as usual
  };

  // Debounce so we don't read innerText + run regex on every keystroke (causes freeze).
  let inputDebounceTimer = 0;
  const handleInput = () => {
    if (inputEl.dataset._composing) return;
    if (inputEl.dataset._ecoUpdating) return;
    if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
      inputDebounceTimer = 0;
      if (!inputEl.isConnected) return;
      const txt = isContentEditable ? inputEl.innerText : inputEl.value;
      if (textCouldBeOptimized(txt)) {
        // Only schedule once so the 3s timer reliably fires after user stops (don't keep resetting).
        if (!inputEl.dataset.optimizeTimer)
          optimizeAfterDelay(inputEl, isContentEditable);
      } else {
        const existing = inputEl.dataset.optimizeTimer;
        if (existing) {
          clearTimeout(Number(existing));
          inputEl.dataset.optimizeTimer = "";
        }
      }
    }, 120);
  };

  inputEl.addEventListener(
    "compositionstart",
    () => {
      inputEl.dataset._composing = "1";
    },
    true,
  );
  inputEl.addEventListener(
    "compositionend",
    () => {
      inputEl.dataset._composing = "";
      handleInput();
    },
    true,
  );
  inputEl.addEventListener("input", handleInput, false);
  // use capture so we run before page scripts
  inputEl.addEventListener("keydown", handleSubmitKey, true);
}

// Attach immediately if textarea exists
// Attach to existing textareas and common contenteditable chat inputs
document.querySelectorAll("textarea").forEach(attachOptimizer);
document.querySelectorAll('[contenteditable="true"]').forEach(attachOptimizer);
document.querySelectorAll('[role="textbox"]').forEach(attachOptimizer);

// Observe for dynamically added inputs; debounce so we don't run on every mutation (freeze fix).
let observerTimer = 0;
function runAttachOptimizers() {
  observerTimer = 0;
  document.querySelectorAll("textarea").forEach(attachOptimizer);
  document.querySelectorAll('[contenteditable="true"]').forEach(attachOptimizer);
  document.querySelectorAll('[role="textbox"]').forEach(attachOptimizer);
}
const observer = new MutationObserver(() => {
  if (observerTimer) clearTimeout(observerTimer);
  observerTimer = setTimeout(runAttachOptimizers, 300);
});
observer.observe(document.body, { childList: true, subtree: true });
