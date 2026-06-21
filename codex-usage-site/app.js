const state = {
  threads: [],
  warnings: [],
  pollMs: 5000,
  pollTimer: undefined
};

const els = {
  statusDot: document.querySelector('#status-dot'),
  statusText: document.querySelector('#status-text'),
  refreshButton: document.querySelector('#refresh-button'),
  totalTokens: document.querySelector('#total-tokens'),
  threadCount: document.querySelector('#thread-count'),
  todayCount: document.querySelector('#today-count'),
  latestUpdate: document.querySelector('#latest-update'),
  threadsBody: document.querySelector('#threads-body'),
  eventsList: document.querySelector('#events-list'),
  warnings: document.querySelector('#warnings'),
  threadFilter: document.querySelector('#thread-filter')
};

els.refreshButton.addEventListener('click', () => refresh());
els.threadFilter.addEventListener('input', () => renderThreads());

start();

async function start() {
  try {
    const config = await getJson('/codex-usage/config');
    state.pollMs = Math.max(1000, Number(config.data?.pollSeconds ?? 5) * 1000);
  } catch {
    state.pollMs = 5000;
  }
  await refresh();
  state.pollTimer = setInterval(refresh, state.pollMs);
}

async function refresh() {
  setStatus('loading', '正在刷新');
  state.warnings = [];
  try {
    const [summary, threads, events] = await Promise.all([
      getJson('/codex-usage/summary'),
      getJson('/codex-usage/threads'),
      getJson('/codex-usage/recent-events?limit=24')
    ]);

    renderSummary(summary.data);
    state.threads = threads.data ?? [];
    state.warnings.push(...(summary.warnings ?? []), ...(threads.warnings ?? []), ...(events.warnings ?? []));
    renderThreads();
    renderEvents(events.data ?? []);
    renderWarnings();
    setStatus('ok', `已刷新 ${formatClock(new Date())}`);
  } catch (error) {
    setStatus('error', error.message);
    renderWarnings([error.message]);
  }
}

async function getJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = await response.json();
  if (!payload.ok) {
    const detail = payload.error?.detail ? `：${payload.error.detail}` : '';
    throw new Error(`${payload.error?.message ?? '数据源不可读'}${detail}`);
  }
  return payload;
}

function renderSummary(summary) {
  els.totalTokens.textContent = formatNumber(summary.totalTokens);
  els.threadCount.textContent = `${formatNumber(summary.threadCount)} / 活跃 ${formatNumber(summary.activeThreadCount)}`;
  els.todayCount.textContent = formatNumber(summary.todayUpdatedThreadCount);
  els.latestUpdate.textContent = summary.latestUpdatedAtIso ? formatTime(summary.latestUpdatedAtIso) : '--';
}

function renderThreads() {
  const keyword = els.threadFilter.value.trim().toLowerCase();
  const threads = keyword
    ? state.threads.filter((thread) =>
        [thread.title, thread.id, thread.cwd].some((value) => String(value ?? '').toLowerCase().includes(keyword))
      )
    : state.threads;

  if (threads.length === 0) {
    els.threadsBody.innerHTML = '<tr><td colspan="5" class="empty">没有匹配的对话</td></tr>';
    return;
  }

  els.threadsBody.innerHTML = threads
    .map(
      (thread) => `
        <tr>
          <td>
            <div class="thread-title">${escapeHtml(thread.title || '未命名对话')}</div>
            <div class="mono">${escapeHtml(thread.id)}</div>
          </td>
          <td class="metric">${formatNumber(thread.tokensUsed)}</td>
          <td>${formatTime(thread.updatedAtIso)}</td>
          <td><span class="pill ${thread.archived ? 'archived' : ''}">${thread.archived ? '已归档' : '活跃'}</span></td>
          <td class="mono">${escapeHtml(thread.cwd || '--')}</td>
        </tr>
      `
    )
    .join('');
}

function renderEvents(events) {
  if (events.length === 0) {
    els.eventsList.innerHTML = '<div class="empty">暂无可解析的响应明细</div>';
    return;
  }

  els.eventsList.innerHTML = events
    .map(
      (event) => `
        <article class="event">
          <div>
            <b>${escapeHtml(event.model || 'unknown model')}</b>
            <span>${formatTime(event.tsIso)} · ${escapeHtml(event.threadId || 'unknown thread')}</span>
          </div>
          ${eventMetric('Input', event.inputTokens)}
          ${eventMetric('Cached', event.cachedTokens)}
          ${eventMetric('Output', event.outputTokens)}
          ${eventMetric('Reasoning', event.reasoningTokens)}
          ${eventMetric('Total', event.totalTokens)}
        </article>
      `
    )
    .join('');
}

function eventMetric(label, value) {
  return `<div><span>${label}</span><b class="metric">${formatNumber(value)}</b></div>`;
}

function renderWarnings(extra = []) {
  const warnings = [...state.warnings, ...extra].filter(Boolean);
  if (warnings.length === 0) {
    els.warnings.hidden = true;
    els.warnings.textContent = '';
    return;
  }
  els.warnings.hidden = false;
  els.warnings.innerHTML = warnings.slice(0, 8).map((warning) => `<div>${escapeHtml(warning)}</div>`).join('');
}

function setStatus(status, text) {
  els.statusDot.className = `status-dot ${status === 'ok' ? 'ok' : status === 'error' ? 'error' : ''}`;
  els.statusText.textContent = text;
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(value ?? 0);
}

function formatTime(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(value));
}

function formatClock(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
