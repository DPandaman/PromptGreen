# Changelog

All notable changes to PromptGreen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] – 2025-02-22

### Added

- Session-based tracking: Start / End Session with persistent state.
- Popup: status (Idle / Session Running), primary Start/End button, View Report, Settings, live session metrics (tokens, kWh, CO₂, duration).
- Report page: KPIs (tokens, energy, CO₂, sessions, time saved), This Session + All Time cards, session timeline, bar chart (tokens per session), Assumptions panel, Export (JSON + CSV), Reset with confirm modal.
- Onboarding: welcome, what we track, privacy, how to use, region + theme.
- Settings: theme (auto/light/dark), region, CO₂ g/kWh and kWh/1k tokens overrides, optional time-saved factor.
- Content script: prompt optimization on ChatGPT, Google, Bing; sends `recordAction` (type `prompt_optimize`) when a session is running.
- Shared layer: `shared/constants.js`, `metrics.js`, `storage.js`, `ui.js`, `types.js`.
- Service worker: startSession, endSession, recordAction, getState; persistence and recovery on restart.
- Docs: `docs/README.md` (install, architecture, file tree), `docs/ASSUMPTIONS.md` (metrics math).
- Tests: `tests/metrics.test.js` for metrics formulas.

### Security / privacy

- All data stored locally (chrome.storage.local). No external servers.
- Minimal permissions: `storage` only; content script limited to declared host matches.

### Scaffold (TODOs in code)

- Pro: cloud sync, team dashboards.
- Shareable report link, goals, notifications, streaks/badges.
- Integrations (Notion, Google Drive), model selection, regional CO₂ auto-detection.
