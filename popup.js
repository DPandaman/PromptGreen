(function () {
  const ui = window.PromptGreen.ui;
  const storage = window.PromptGreen.storage;

  const els = {
    status: document.getElementById('status'),
    statusText: document.getElementById('statusText'),
    statusDot: document.getElementById('statusDot'),
    btnStartEnd: document.getElementById('btnStartEnd'),
    metricsPreview: document.getElementById('metricsPreview'),
    previewTokens: document.getElementById('previewTokens'),
    previewEnergy: document.getElementById('previewEnergy'),
    previewCo2: document.getElementById('previewCo2'),
    previewTime: document.getElementById('previewTime'),
    skeleton: document.getElementById('skeleton'),
    resumeBanner: document.getElementById('resumeBanner'),
    btnResume: document.getElementById('btnResume'),
    linkReport: document.getElementById('linkReport'),
    linkSettings: document.getElementById('linkSettings'),
  };

  function send(type, payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }

  function applyThemeFromSettings(settings) {
    const theme = ui.resolveTheme(settings.theme);
    ui.applyTheme(theme);
  }

  function renderRunning(session) {
    els.status.classList.add('running');
    els.statusText.textContent = 'Session Running';
    els.btnStartEnd.textContent = 'End Session';
    els.btnStartEnd.classList.add('end');
    els.btnStartEnd.setAttribute('aria-label', 'End session');
    els.metricsPreview.hidden = false;
    els.skeleton.hidden = true;
    updatePreview(session);
  }

  function renderIdle() {
    els.status.classList.remove('running');
    els.statusText.textContent = 'Idle';
    els.btnStartEnd.textContent = 'Start Session';
    els.btnStartEnd.classList.remove('end');
    els.btnStartEnd.setAttribute('aria-label', 'Start session');
    els.metricsPreview.hidden = true;
    els.skeleton.hidden = true;
  }

  function updatePreview(session) {
    if (!session) return;
    els.previewTokens.textContent = ui.formatInteger(session.tokensSaved || 0);
    els.previewEnergy.textContent = ui.formatKwh(session.energySavedKwh || 0);
    els.previewCo2.textContent = ui.formatCo2Grams(session.co2SavedGrams || 0);
    const duration = session.startTime ? Math.floor((Date.now() - session.startTime) / 1000) : 0;
    els.previewTime.textContent = ui.formatDuration(duration);
  }

  async function loadState() {
    els.skeleton.hidden = false;
    const state = await send('getState');
    els.skeleton.hidden = true;
    applyThemeFromSettings(state.settings);

    if (!state.onboardingDone) {
      window.location.href = 'onboarding.html';
      return;
    }

    if (state.currentSession && state.currentSession.running) {
      renderRunning(state.currentSession);
      window.setInterval(() => {
        send('getState').then((s) => {
          if (s.currentSession && s.currentSession.running) updatePreview(s.currentSession);
        });
      }, 2000);
    } else {
      renderIdle();
      const resumed = await send('resumeSession');
      if (resumed.resumed && resumed.session) {
        els.resumeBanner.hidden = false;
        els.btnResume.onclick = () => {
          send('startSession').then(() => {
            els.resumeBanner.hidden = true;
            loadState();
          });
        };
      } else {
        els.resumeBanner.hidden = true;
      }
    }
  }

  els.btnStartEnd.addEventListener('click', async () => {
    const state = await send('getState');
    if (state.currentSession && state.currentSession.running) {
      await send('endSession');
      renderIdle();
    } else {
      await send('startSession');
      loadState();
    }
  });

  els.linkReport.href = chrome.runtime.getURL('report.html');
  els.linkSettings.href = chrome.runtime.getURL('settings.html');

  loadState();
})();
