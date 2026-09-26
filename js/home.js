import { loadJson } from './data-loader.js';
import {
  clearActiveGame,
  clearCurrentSelection,
  getActiveGame,
  hasActiveGame
} from './storage.js';

const newGameBtn = document.getElementById('newGameBtn');
const loadGameBtn = document.getElementById('loadGameBtn');
const saveStatus = document.getElementById('saveStatus');
const audiencePreview = document.getElementById('audiencePreview');

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'saved just now';
  if (mins === 1) return 'saved 1 minute ago';
  if (mins < 60) return `saved ${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return 'saved 1 hour ago';
  if (hrs < 24) return `saved ${hrs} hours ago`;
  return 'saved earlier';
}

function updateLoadState() {
  const active = getActiveGame();
  if (!active) {
    loadGameBtn.disabled = true;
    saveStatus.textContent = 'No unfinished debate in this browser.';
    return;
  }

  loadGameBtn.disabled = false;
  const turns = Array.isArray(active.messages)
    ? active.messages.filter((message) => message.role === 'user').length
    : Number(active.roundIndex || 0);
  saveStatus.textContent = `Resume your unfinished debate · ${Math.max(1, turns)} turn${turns === 1 ? '' : 's'} · ${timeAgo(active.savedAt)}.`;
}

async function renderAudiencePreview() {
  if (!audiencePreview) return;
  try {
    const data = await loadJson('data/personas.json');
    audiencePreview.innerHTML = data.personas.map((persona) => `
      <div class="preview-persona" title="${persona.displayName}">
        <img src="${persona.portrait}" alt="${persona.displayName}" />
      </div>
    `).join('');
  } catch {
    audiencePreview.hidden = true;
  }
}

newGameBtn?.addEventListener('click', () => {
  if (hasActiveGame()) {
    const ok = window.confirm('Start a new debate? This will replace the unfinished debate saved in this browser.');
    if (!ok) return;
  }
  clearActiveGame();
  clearCurrentSelection();
  window.location.href = 'topics.html';
});

loadGameBtn?.addEventListener('click', () => {
  if (!hasActiveGame()) return updateLoadState();
  window.location.href = 'arena.html?resume=1';
});

updateLoadState();
renderAudiencePreview();
