(function () {
  const ui = window.PromptGreen.ui;
  const metrics = window.PromptGreen.metrics;
  const storage = window.PromptGreen.storage;

  function send(type) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type }, resolve);
    });
  }

  const els = {
    kpiTokens: document.getElementById('kpiTokens'),
    kpiEnergy: document.getElementById('kpiEnergy'),
    kpiCo2: document.getElementById('kpiCo2'),
    kpiSessions: document.getElementById('kpiSessions'),
    kpiTime: document.getElementById('kpiTime'),
    thisSessionEmpty: document.getElementById('thisSessionEmpty'),
    thisSessionStats: document.getElementById('thisSessionStats'),
    lifetimeTokens: document.getElementById('lifetimeTokens'),
    lifetimeEnergy: document.getElementById('lifetimeEnergy'),
    lifetimeCo2: document.getElementById('lifetimeCo2'),
    lifetimeSessions: document.getElementById('lifetimeSessions'),
    lifetimeDuration: document.getElementById('lifetimeDuration'),
    timeline: document.getElementById('timeline'),
    timelineEmpty: document.getElementById('timelineEmpty'),
    chart: document.getElementById('chart'),
    assumpKwh: document.getElementById('assumpKwh'),
    assumpCo2: document.getElementById('assumpCo2'),
    btnExport: document.getElementById('btnExport'),
    btnReset: document.getElementById('btnReset'),
    confirmModal: document.getElementById('confirmModal'),
    modalCancel: document.getElementById('modalCancel'),
    modalConfirm: document.getElementById('modalConfirm'),
  };

  async function loadState() {
    const state = await send('getState');
    const lifetime = state.lifetime || {};
    const settings = state.settings || {};
    const current = state.currentSession;
    const sessions = state.sessions || [];

    ui.applyTheme(ui.resolveTheme(settings.theme));

    els.kpiTokens.textContent = ui.formatInteger(lifetime.totalTokensSaved || 0);
    els.kpiEnergy.textContent = ui.formatKwh(lifetime.totalEnergyKwh || 0);
    els.kpiCo2.textContent = ui.formatCo2Grams(lifetime.totalCo2Grams || 0);
    els.kpiSessions.textContent = ui.formatInteger(lifetime.totalSessions || 0);
    const timeSaved = metrics.timeSavedSeconds(
      lifetime.totalTokensSaved || 0,
      settings.time_saved_seconds_per_1k_tokens
    );
    els.kpiTime.textContent = timeSaved ? ui.formatDuration(timeSaved) : '—';

    if (current && current.running) {
      els.thisSessionEmpty.hidden = true;
      els.thisSessionStats.hidden = false;
      els.thisSessionStats.innerHTML = `
        <div class="stat-row"><span>Tokens</span><strong>${ui.formatInteger(current.tokensSaved || 0)}</strong></div>
        <div class="stat-row"><span>Energy (kWh)</span><strong>${ui.formatKwh(current.energySavedKwh || 0)}</strong></div>
        <div class="stat-row"><span>CO₂ (g)</span><strong>${ui.formatCo2Grams(current.co2SavedGrams || 0)}</strong></div>
        <div class="stat-row"><span>Duration</span><strong>${ui.formatDuration(Math.floor((Date.now() - current.startTime) / 1000))}</strong></div>
      `;
    } else {
      els.thisSessionEmpty.hidden = false;
      els.thisSessionStats.hidden = true;
    }

    els.lifetimeTokens.textContent = ui.formatInteger(lifetime.totalTokensSaved || 0);
    els.lifetimeEnergy.textContent = ui.formatKwh(lifetime.totalEnergyKwh || 0);
    els.lifetimeCo2.textContent = ui.formatCo2Grams(lifetime.totalCo2Grams || 0);
    els.lifetimeSessions.textContent = ui.formatInteger(lifetime.totalSessions || 0);
    els.lifetimeDuration.textContent = ui.formatDuration(lifetime.totalDurationSeconds || 0);

    if (sessions.length === 0) {
      els.timeline.innerHTML = '';
      els.timelineEmpty.hidden = false;
    } else {
      els.timelineEmpty.hidden = true;
      els.timeline.innerHTML = sessions.slice(0, 20).map((s) => {
        const topActions = (s.actions || []).slice(0, 3).map((a) => a.type).join(', ') || '—';
        return `
          <div class="session-card">
            <div class="date">${ui.formatDate(s.startTime)}</div>
            <div class="duration">${ui.formatDuration(s.durationSeconds)} · ${ui.formatInteger(s.tokensSaved || 0)} tokens</div>
            <div class="tokens">${topActions}</div>
          </div>
        `;
      }).join('');
    }

    drawChart(sessions.slice(0, 14));
    els.assumpKwh.textContent = settings.kwh_per_1k_tokens ?? '0.003';
    els.assumpCo2.textContent = settings.co2_grams_per_kwh ?? '385';
  }

  function drawChart(sessions) {
    const canvas = els.chart;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-elevated').trim() || '#fff';
    ctx.fillRect(0, 0, w, h);

    if (sessions.length === 0) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#888';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No session data yet', w / 2, h / 2);
      return;
    }

    const maxTokens = Math.max(1, ...sessions.map((s) => s.tokensSaved || 0));
    const barW = Math.max(4, (chartW / sessions.length) * 0.7);
    const gap = chartW / sessions.length - barW;

    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0d6b2d';
    ctx.fillStyle = primary;

    sessions.forEach((s, i) => {
      const x = padding.left + i * (chartW / sessions.length) + gap / 2;
      const barH = ((s.tokensSaved || 0) / maxTokens) * chartH;
      const y = padding.top + chartH - barH;
      ctx.fillRect(x, y, barW, barH);
    });

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#666';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Sessions (newest → oldest)', w / 2, h - 8);
  }

  function exportReport(format) {
    send('getState').then(async (state) => {
      const lifetime = state.lifetime || {};
      const sessions = state.sessions || [];
      const settings = state.settings || {};
      const payload = {
        exportedAt: new Date().toISOString(),
        version: window.PromptGreen.constants.VERSION,
        assumptions: {
          kwh_per_1k_tokens: settings.kwh_per_1k_tokens,
          co2_grams_per_kwh: settings.co2_grams_per_kwh,
        },
        lifetime,
        sessions,
      };
      const blob = format === 'json'
        ? new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        : new Blob([csvFromPayload(payload)], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptgreen-report-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function csvFromPayload(payload) {
    const rows = [
      ['Metric', 'Value'],
      ['Total tokens saved', payload.lifetime.totalTokensSaved ?? 0],
      ['Total energy (kWh)', payload.lifetime.totalEnergyKwh ?? 0],
      ['Total CO2 (g)', payload.lifetime.totalCo2Grams ?? 0],
      ['Total sessions', payload.lifetime.totalSessions ?? 0],
      ['Total duration (s)', payload.lifetime.totalDurationSeconds ?? 0],
      [],
      ['Session ID', 'Start', 'End', 'Duration (s)', 'Tokens', 'Energy (kWh)', 'CO2 (g)'],
    ];
    (payload.sessions || []).forEach((s) => {
      rows.push([
        s.id,
        new Date(s.startTime).toISOString(),
        s.endTime ? new Date(s.endTime).toISOString() : '',
        s.durationSeconds ?? '',
        s.tokensSaved ?? 0,
        s.energySavedKwh ?? 0,
        s.co2SavedGrams ?? 0,
      ]);
    });
    return rows.map((r) => r.join(',')).join('\n');
  }

  els.btnExport.addEventListener('click', () => {
    exportReport('json');
    exportReport('csv');
  });

  els.btnReset.addEventListener('click', () => {
    els.confirmModal.hidden = false;
    els.confirmModal.querySelector('h3').focus();
  });

  els.modalCancel.addEventListener('click', () => { els.confirmModal.hidden = true; });
  els.modalConfirm.addEventListener('click', async () => {
    await storage.clearAllData();
    els.confirmModal.hidden = true;
    loadState();
  });

  els.confirmModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') els.confirmModal.hidden = true;
  });

  loadState();
})();
