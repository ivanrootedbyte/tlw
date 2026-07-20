import { clearHistory, getHistory } from './storage.js';
import { attachAuthUi } from './auth-ui.js';
import { fetchCloudMatches, hasSupabaseConfig } from './supabase-client.js';

const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function renderLocal(history) {
  if (!history.length) {
    return `<div class="history-item"><strong>No local matches yet.</strong><p class="small">Play a debate and it will appear here.</p></div>`;
  }

  return history.map((item) => `
    <article class="history-item">
      <div class="badge">${new Date(item.createdAt).toLocaleString()}</div>
      <strong>${item.personaName} · ${item.topicTitle}</strong>
      <p>${item.ending.title} — ${item.ending.summary}</p>
      <p class="small">Logic ${item.scores.logic} · Evidence ${item.scores.evidence} · Humanity ${item.scores.humanity} · Humility ${item.scores.humility}</p>
    </article>
  `).join('');
}

function renderCloud(matches) {
  if (!matches.length) return '';
  const items = matches.map((item) => `
    <article class="history-item">
      <div class="badge">Cloud · ${new Date(item.created_at).toLocaleString()}</div>
      <strong>${item.persona_id} · ${item.topic_id}</strong>
      <p>${item.ending} — ${item.summary || 'Saved to cloud.'}</p>
      <p class="small">Logic ${item.logic_score} · Evidence ${item.evidence_score} · Humanity ${item.humanity_score} · Humility ${item.humility_score}</p>
    </article>
  `).join('');
  return `<div class="history-item"><strong>Cloud matches</strong><p class="small">Recent synced history from Supabase.</p></div>${items}`;
}

async function render() {
  const history = getHistory();
  let html = renderLocal(history);
  if (hasSupabaseConfig()) {
    try {
      const cloud = await fetchCloudMatches();
      if (cloud.length) html = `${renderCloud(cloud)}${html}`;
    } catch (err) {
      html = `<div class="history-item"><strong>Cloud sync unavailable.</strong><p class="small">${err.message}</p></div>${html}`;
    }
  }
  historyList.innerHTML = html;
}

clearHistoryBtn.addEventListener('click', () => {
  clearHistory();
  render();
});

attachAuthUi();
render();
