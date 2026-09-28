import { loadJson } from './data-loader.js';
import {
  clearActiveGame,
  clearCurrentSelection,
  getActiveGame,
  hasActiveGame,
  setCustomQuestion,
  setUserStance,
  setUserStanceDetail
} from './storage.js';

const openingChatForm = document.getElementById('openingChatForm');
const openingQuestion = document.getElementById('openingQuestion');
const loadGameBtn = document.getElementById('loadGameBtn');
const saveStatus = document.getElementById('saveStatus');
const audiencePreview = document.getElementById('audiencePreview');
const stanceDetailWrap = document.getElementById('stanceDetailWrap');
const stanceDetail = document.getElementById('stanceDetail');

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
    saveStatus.textContent = 'No unfinished conversation in this browser.';
    return;
  }
  loadGameBtn.disabled = false;
  const turns = Array.isArray(active.messages)
    ? active.messages.filter((message) => message.role === 'user').length
    : 0;
  saveStatus.textContent = `Resume your unfinished conversation · ${Math.max(1, turns)} turn${turns === 1 ? '' : 's'} · ${timeAgo(active.savedAt)}.`;
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

function selectedStance() {
  return openingChatForm?.querySelector('input[name="stance"]:checked')?.value || '';
}

openingChatForm?.addEventListener('change', (event) => {
  if (event.target?.name !== 'stance') return;
  const explain = event.target.value === 'explain';
  stanceDetailWrap.hidden = !explain;
  if (explain) stanceDetail.focus();
});

openingChatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = openingQuestion?.value.trim() || '';
  const stance = selectedStance() || 'unsure';

  if (!question) {
    saveStatus.textContent = 'Type a question first.';
    openingQuestion?.focus();
    return;
  }

  saveStatus.textContent = 'Opening the studio…';

  if (hasActiveGame()) {
    const ok = window.confirm('Start a new conversation? This will replace the unfinished conversation saved in this browser.');
    if (!ok) return;
  }

  clearActiveGame();
  clearCurrentSelection();
  setCustomQuestion(question);
  setUserStance(stance);
  setUserStanceDetail(stance === 'explain' ? stanceDetail.value.trim() : '');
  window.location.assign('arena.html?open=1');
});

document.querySelectorAll('[data-example]').forEach((button) => {
  button.addEventListener('click', () => {
    openingQuestion.value = button.dataset.example || '';
    openingQuestion.focus();
  });
});

loadGameBtn?.addEventListener('click', () => {
  if (!hasActiveGame()) return updateLoadState();
  window.location.href = 'arena.html?resume=1';
});

updateLoadState();
renderAudiencePreview();
