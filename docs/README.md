# PromptGreen – Developer docs

## Install & dev workflow

1. **Load unpacked**
   - Open `chrome://extensions`, enable "Developer mode", click "Load unpacked", select the `PromptGreen` folder.

2. **Reload after changes**
   - Edit code → click the reload icon on the extension card. For content script changes, reload the target tab (e.g. ChatGPT) as well.

3. **Debug**
   - Popup: right‑click extension icon → "Inspect popup".
   - Report / onboarding / settings: open the page, then DevTools (F12).
   - Service worker: Extensions page → "Service worker" link under PromptGreen.
   - Content script: DevTools on the tab where it runs (e.g. chatgpt.com).

## Architecture (high level)

```
┌─────────────────────────────────────────────────────────────────┐
│  Extension pages (popup, report, onboarding, settings)           │
│  - Load shared/constants.js, metrics.js, storage.js, ui.js       │
│  - chrome.runtime.sendMessage({ type: 'startSession' | ... })     │
└────────────────────────────┬────────────────────────────────────┘
                             │ sendMessage
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  service_worker.js (background)                                  │
│  - importScripts(shared/constants, metrics, storage)              │
│  - Handles: startSession, endSession, recordAction, getState      │
│  - Persists current session + sessions list + lifetime in storage │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
  chrome.storage.local   content.js (LLM sites)
  - pg_settings          - Optimizes prompts, sends recordAction
  - pg_sessions            when tokens saved (if session running)
  - pg_current_session
  - pg_lifetime
  - pg_onboarding_done
```

## File tree

```
PromptGreen/
├── manifest.json
├── service_worker.js
├── popup.html, popup.js, popup.css
├── report.html, report.js, report.css
├── onboarding.html, onboarding.js, onboarding.css
├── settings.html, settings.js, settings.css
├── content.js              # Prompt optimizer on chatgpt.com etc.
├── shared/
│   ├── constants.js        # Defaults, region CO₂, storage keys
│   ├── types.js            # JSDoc only
│   ├── metrics.js          # Pure: energyKwhFromTokens, co2GramsFromEnergy
│   ├── storage.js          # Typed chrome.storage wrapper
│   └── ui.js               # Format numbers, theme (pages only)
├── docs/
│   ├── README.md           # This file
│   └── ASSUMPTIONS.md      # Metrics math and defaults
├── tests/
│   └── metrics.test.js
├── CHANGELOG.md
└── .eslintrc.cjs           # Optional
```

## State flow

- **Start Session**: creates a session with `running: true`, stores in `pg_current_session`.
- **recordAction** (from content or future sources): appends an action to current session, updates `tokensSaved`, `energySavedKwh`, `co2SavedGrams` using settings factors; persists session.
- **End Session**: finalizes session (endTime, duration), appends to `pg_sessions`, adds to `pg_lifetime`, clears `pg_current_session`.
- **Recovery**: on install/startup, service worker does not clear `pg_current_session`; if it exists with `running: true`, the session is still considered active so the popup shows "Session Running".

## Permissions

- `storage`: required for chrome.storage.local (settings, sessions, lifetime, onboarding).
- No host permissions; content script runs only on declared matches (chatgpt.com, google.com, bing.com).

## Manual test steps

1. **Load extension** – chrome://extensions → Developer mode → Load unpacked → select PromptGreen. Confirm no errors.
2. **First run (onboarding)** – Click the extension icon. See onboarding welcome; set region and theme, click "Get started". Popup should show "Idle" and "Start Session".
3. **Start / End session** – Start Session → status "Session Running", button "End Session", metrics preview visible. End Session → back to Idle.
4. **Report** – View Report → KPIs, This Session, All Time, Session Timeline. Export Report downloads JSON and CSV. Reset Data → confirm modal → data cleared.
5. **Settings** – Change theme (e.g. Dark) and factors; save. Report Assumptions panel and totals should reflect new values.
6. **Content script** – Start session, open ChatGPT, type a prompt with "please" / "thank you", wait 3s or Enter. Prompt optimizes; popup and report show tokens saved.
7. **Persistence** – Start session, close browser, reopen, open popup. Session should still show as running (or resume). End session; it appears in Report timeline.
8. **No console spam** – Popup, report, and service worker consoles: no unhandled rejections or repeated errors.

## Future / scaffold (TODOs in code)

- Pro: cloud sync, team dashboards.
- Shareable report link.
- Goals (weekly token savings target).
- Notifications (“You saved 20k tokens this week”).
- Streaks and badges.
- Integrations (Notion, Google Drive export).
- Optional model selection and better estimation profiles.
- Regional CO₂ auto-detection.
