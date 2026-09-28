import { loadJson } from './data-loader.js';
import {
  clearActiveGame,
  getActiveGame,
  getSelectedTopic,
  getCustomQuestion,
  getUserStance,
  getUserStanceDetail,
  saveActiveGame
} from './storage.js';

const ROUNDS = [
  { id: 1, name: 'OPENING POSITION', short: 'Opening', prompt: 'State what you believe and why.' },
  { id: 2, name: 'PRESSURE TEST', short: 'Pressure', prompt: 'Defend the assumption carrying your view.' },
  { id: 3, name: 'AUDIENCE CROSSFIRE', short: 'Crossfire', prompt: 'Answer the strongest objection in the room.' },
  { id: 4, name: 'THE HOT SEAT', short: 'Hot Seat', prompt: 'Face the hardest implication of your position.' },
  { id: 5, name: 'THE LAST WORD', short: 'Last Word', prompt: 'Say what you believe now—and what changed.' }
];

const els = {
  categoryLabel: document.getElementById('categoryLabel'),
  topicTitle: document.getElementById('topicTitle'),
  customQuestionDisplay: document.getElementById('customQuestionDisplay'),
  stanceDisplay: document.getElementById('stanceDisplay'),
  roundNumber: document.getElementById('roundNumber'),
  roundName: document.getElementById('roundName'),
  roundPrompt: document.getElementById('roundPrompt'),
  transcriptHeading: document.getElementById('transcriptHeading'),
  totalScore: document.getElementById('totalScore'),
  lastStars: document.getElementById('lastStars'),
  scoreReason: document.getElementById('scoreReason'),
  turnCounter: document.getElementById('turnCounter'),
  messageThread: document.getElementById('messageThread'),
  debateForm: document.getElementById('debateForm'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
  composerHint: document.getElementById('composerHint'),
  personaRail: document.getElementById('personaRail'),
  interruptionLayer: document.getElementById('interruptionLayer'),
  forfeitBtn: document.getElementById('forfeitBtn'),
  roundTransition: document.getElementById('roundTransition'),
  scorePop: document.getElementById('scorePop'),
  gameComplete: document.getElementById('gameComplete'),
  finalSummary: document.getElementById('finalSummary'),
  finalScore: document.getElementById('finalScore'),
  personaDrawer: document.getElementById('personaDrawer'),
  drawerScrim: document.getElementById('drawerScrim'),
  drawerClose: document.getElementById('drawerClose'),
  drawerPortrait: document.getElementById('drawerPortrait'),
  drawerName: document.getElementById('drawerName'),
  drawerIntro: document.getElementById('drawerIntro'),
  drawerType: document.getElementById('drawerType'),
  drawerBlindSpot: document.getElementById('drawerBlindSpot'),
  drawerHistory: document.getElementById('drawerHistory')
};

const ACCENTS = {
  rust: '#c97654', violet: '#9a7ae8', gold: '#d6ad55',
  silver: '#b5bec8', green: '#6ca67a', teal: '#5fa5a1'
};

const state = {
  topic: null,
  personas: [],
  messages: [],
  interruptions: [],
  scores: [],
  currentRound: 1,
  busy: false,
  interruptionCursor: 0,
  responseMode: 'unknown',
  complete: false,
  finalSummary: ''
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function formatMessageText(value = '') {
  let safe = escapeHtml(value);
  safe = safe.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  safe = safe.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  return safe.replace(/\n/g, '<br>');
}

function nowTime() {
  return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function currentRoundData() {
  return ROUNDS[Math.min(ROUNDS.length - 1, Math.max(0, state.currentRound - 1))];
}

function totalStars() {
  return state.scores.reduce((sum, item) => sum + Number(item.stars || 0), 0);
}

function updateTurnCounter() {
  const turns = state.messages.filter((message) => message.role === 'user').length;
  els.turnCounter.textContent = `Exchange ${Math.max(1, turns)}`;
}

function updateRoundUI(animate = false) {
  const round = currentRoundData();
  document.body.classList.remove('round-1', 'round-2', 'round-3', 'round-4', 'round-5');
  document.body.classList.add(`round-${round.id}`);
  els.roundNumber.textContent = `ROUND ${round.id} / 5`;
  els.roundName.textContent = round.name;
  els.roundPrompt.textContent = round.prompt;
  els.transcriptHeading.textContent = `Round ${round.id} · ${round.name.replace('THE ', '').replace('AUDIENCE ', '')}`;
  els.totalScore.textContent = `${totalStars()} ★`;
  document.querySelectorAll('[data-round-step]').forEach((node) => {
    const n = Number(node.dataset.roundStep);
    node.classList.toggle('active', n === round.id);
    node.classList.toggle('done', n < round.id || (state.complete && n === round.id));
  });
  if (animate) showRoundTransition(round);
}

function showRoundTransition(round) {
  if (!els.roundTransition) return;
  els.roundTransition.querySelector('span').textContent = `ROUND ${round.id} / 5`;
  els.roundTransition.querySelector('strong').textContent = round.name;
  els.roundTransition.classList.remove('show');
  void els.roundTransition.offsetWidth;
  els.roundTransition.classList.add('show');
  setTimeout(() => els.roundTransition.classList.remove('show'), 1450);
}

function scrollThread() {
  requestAnimationFrame(() => { els.messageThread.scrollTop = els.messageThread.scrollHeight; });
}

function messageMarkup(message) {
  const isUser = message.role === 'user';
  const avatar = isUser
    ? '<div class="message-avatar" aria-hidden="true">YOU</div>'
    : '<div class="message-avatar"><img src="assets/portraits/professor-l.png" alt="" /></div>';
  const body = `<div class="message-body"><div class="message-meta"><strong>${isUser ? 'You' : 'Professor L'}</strong><span>${escapeHtml(message.time || '')}</span></div><p>${formatMessageText(message.text)}</p></div>`;
  return `<article class="message ${isUser ? 'user' : 'professor'}">${isUser ? body + avatar : avatar + body}</article>`;
}

function renderMessages() {
  els.messageThread.innerHTML = state.messages.map(messageMarkup).join('');
  scrollThread();
  updateTurnCounter();
}

function appendMessage(role, text) {
  const value = String(text || '').trim();
  if (!value) return;
  const message = { role, text: value, time: nowTime(), createdAt: new Date().toISOString(), round: state.currentRound };
  state.messages.push(message);
  els.messageThread.insertAdjacentHTML('beforeend', messageMarkup(message));
  scrollThread();
  updateTurnCounter();
  saveDebate();
}

function showTyping() {
  const node = document.createElement('article');
  node.className = 'message professor typing';
  node.id = 'typingMessage';
  node.innerHTML = '<div class="message-avatar"><img src="assets/portraits/professor-l.png" alt="" /></div><div class="message-body"><div class="message-meta"><strong>Professor L</strong><span>live</span></div><p>Thinking that through…</p></div>';
  els.messageThread.appendChild(node);
  scrollThread();
}

function hideTyping() { document.getElementById('typingMessage')?.remove(); }

function fallbackProfessorResponse(input) {
  const text = String(input || '').trim();
  if (!text) return 'Put your reasoning on the table and we will test it.';
  return 'The live AI is unavailable, so I will not pretend to judge your reasoning. Your answer is saved; try again when the live connection returns.';
}

async function getProfessorResponse(userText, { scoreThisTurn = true, opening = false } = {}) {
  const history = state.messages.slice(-14).map(({ role, text, round }) => ({ role, text, round }));
  try {
    const response = await fetch('/api/debate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'game',
        topic: state.topic,
        userQuestion: getCustomQuestion(),
        userStance: getUserStance(),
        userStanceDetail: getUserStanceDetail(),
        customAnswer: userText,
        history,
        round: state.currentRound,
        roundName: currentRoundData().name,
        scoreThisTurn,
        opening,
        priorScores: state.scores
      })
    });
    if (!response.ok) throw new Error('Debate response failed');
    const data = await response.json();
    return {
      text: String(data?.professorResponse || '').trim() || fallbackProfessorResponse(userText),
      mode: data?.mode === 'gemini' ? 'gemini' : 'fallback',
      stars: Number.isFinite(Number(data?.score?.stars)) ? Math.max(1, Math.min(5, Math.round(Number(data.score.stars)))) : null,
      scoreReason: String(data?.score?.reason || '').trim(),
      finalSummary: String(data?.finalSummary || '').trim()
    };
  } catch {
    return { text: fallbackProfessorResponse(userText), mode: 'fallback', stars: null, scoreReason: '', finalSummary: '' };
  }
}

function showScore(stars, reason) {
  if (!stars) {
    els.lastStars.textContent = '—';
    els.scoreReason.textContent = 'AI scoring is unavailable while the live model is offline.';
    return;
  }
  els.lastStars.textContent = `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
  els.scoreReason.textContent = reason || 'Scored on directness, reasoning, evidence, fairness, and clarity.';
  els.totalScore.textContent = `${totalStars()} ★`;
  els.scorePop.innerHTML = `<strong>+${stars} ★</strong><span>${escapeHtml(reason || 'Reasoning scored')}</span>`;
  els.scorePop.classList.remove('show');
  void els.scorePop.offsetWidth;
  els.scorePop.classList.add('show');
  setTimeout(() => els.scorePop.classList.remove('show'), 2600);
}

function interruptionText(persona, beat) {
  const lines = {
    'frontier-founder': ['What would make that conviction survive contact with the real world?', 'What is the smallest consequence your view must own?'],
    'virtual-mayor': ['What happens when everyone follows that rule?', 'You have the individual case. What about the community around it?'],
    'index-chancellor': ['Which claim in that answer could actually be verified?', 'What evidence would genuinely make you revise that?'],
    'polished-minimalist': ['Does your principle still leave the other person meaningful agency?', 'Is that a principle—or simply the outcome you prefer?'],
    'alignment-gambler': ['How confident are you in the weakest part of that answer?', 'Name the failure case your position is most vulnerable to.'],
    'silicon-blacksmith': ['Does the rule still work at scale?', 'What is this principle ultimately for?']
  };
  const bank = lines[persona.id] || ['What is the strongest objection to that?', 'What consequence have you not accounted for?'];
  return bank[beat % bank.length];
}

function choosePersona() {
  if (!state.personas.length) return null;
  const persona = state.personas[state.interruptionCursor % state.personas.length];
  state.interruptionCursor = (state.interruptionCursor + 1) % state.personas.length;
  return persona;
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('leaving')) return;
  toast.classList.add('leaving');
  setTimeout(() => toast.remove(), 280);
}

function showInterruption(persona, text) {
  const record = { personaId: persona.id, text, createdAt: new Date().toISOString(), round: state.currentRound };
  state.interruptions.push(record);
  saveDebate();
  const card = document.querySelector(`[data-persona-id="${persona.id}"]`);
  card?.classList.add('interrupting');
  setTimeout(() => card?.classList.remove('interrupting'), 1500);
  const toast = document.createElement('div');
  toast.className = 'interruption-toast';
  toast.style.setProperty('--persona-accent', ACCENTS[persona.theme] || '#d9b36c');
  toast.innerHTML = `<img src="${persona.portrait}" alt="${escapeHtml(persona.displayName)}" /><div><strong>${escapeHtml(persona.displayName)} cuts in</strong><p>${escapeHtml(text)}</p></div><button class="toast-dismiss" type="button" aria-label="Dismiss interruption">×</button>`;
  toast.querySelector('.toast-dismiss').addEventListener('click', () => dismissToast(toast));
  toast.addEventListener('click', (event) => { if (!event.target.closest('.toast-dismiss')) openPersonaDrawer(persona.id); });
  els.interruptionLayer.appendChild(toast);
  while (els.interruptionLayer.children.length > 2) els.interruptionLayer.firstElementChild.remove();
  setTimeout(() => dismissToast(toast), 6500);
}

function maybeInterrupt() {
  if (![2, 3, 4].includes(state.currentRound)) return;
  const persona = choosePersona();
  if (!persona) return;
  setTimeout(() => showInterruption(persona, interruptionText(persona, state.messages.length + state.interruptions.length)), 700);
}

function renderAudience() {
  els.personaRail.innerHTML = state.personas.map((persona) => `<button class="audience-card theme-${escapeHtml(persona.theme)}" type="button" data-persona-id="${persona.id}" style="--persona-accent:${ACCENTS[persona.theme] || '#d9b36c'}"><img src="${persona.portrait}" alt="${escapeHtml(persona.displayName)} portrait" /><span><strong>${escapeHtml(persona.displayName)}</strong><small>${escapeHtml(persona.type)}</small></span></button>`).join('');
  els.personaRail.querySelectorAll('.audience-card').forEach((button) => button.addEventListener('click', () => openPersonaDrawer(button.dataset.personaId)));
}

function openPersonaDrawer(personaId) {
  const persona = state.personas.find((item) => item.id === personaId);
  if (!persona) return;
  els.drawerPortrait.src = persona.portrait;
  els.drawerPortrait.alt = `${persona.displayName} portrait`;
  els.drawerName.textContent = persona.displayName;
  els.drawerIntro.textContent = `${persona.intro} ${persona.tagline}`;
  els.drawerType.textContent = persona.type;
  els.drawerBlindSpot.textContent = persona.blindSpot || persona.weakness;
  const history = state.interruptions.filter((item) => item.personaId === persona.id).slice().reverse();
  els.drawerHistory.innerHTML = history.length
    ? history.map((item) => `<div class="history-entry"><strong>Round ${item.round}</strong><br>${escapeHtml(item.text)}</div>`).join('')
    : '<div class="empty-history">No interruptions yet.</div>';
  els.personaDrawer.classList.add('open');
  els.personaDrawer.setAttribute('aria-hidden', 'false');
  els.drawerClose.focus();
}

function closePersonaDrawer() {
  els.personaDrawer.classList.remove('open');
  els.personaDrawer.setAttribute('aria-hidden', 'true');
}

function saveDebate() {
  if (!state.topic) return;
  saveActiveGame({
    mode: 'conversation-debate-game',
    topicId: state.topic.id,
    messages: state.messages,
    interruptions: state.interruptions,
    interruptionCursor: state.interruptionCursor,
    scores: state.scores,
    currentRound: state.currentRound,
    complete: state.complete,
    finalSummary: state.finalSummary,
    userStance: getUserStance(),
    userStanceDetail: getUserStanceDetail()
  });
}

function setBusy(busy) {
  state.busy = busy;
  els.sendBtn.disabled = busy;
  els.userInput.disabled = busy;
  if (busy) els.composerHint.textContent = 'Professor L is weighing your argument…';
  else if (state.responseMode === 'fallback') els.composerHint.textContent = 'Live AI is offline. Scoring is paused.';
  else els.composerHint.textContent = 'Your reasoning will be scored after you speak.';
}

function finishGame(finalSummary = '') {
  state.complete = true;
  if (finalSummary) state.finalSummary = finalSummary;
  updateRoundUI();
  els.debateForm.hidden = true;
  els.gameComplete.hidden = false;
  els.finalSummary.textContent = state.finalSummary || finalSummary || 'The debate is complete. Your transcript preserves where your reasoning held, where it moved, and what remains unresolved.';
  els.finalScore.textContent = `${totalStars()} / 25 ★`;
  saveDebate();
  setTimeout(() => els.gameComplete.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
}

function advanceRound() {
  if (state.currentRound >= 5) return;
  state.currentRound += 1;
  updateRoundUI(true);
  saveDebate();
}

async function submitUserTurn(event) {
  event.preventDefault();
  if (state.busy || state.complete) return;
  const text = els.userInput.value.trim();
  if (!text) return;

  const scoredRound = state.currentRound;
  els.userInput.value = '';
  appendMessage('user', text);
  setBusy(true);
  showTyping();

  const reply = await getProfessorResponse(text, { scoreThisTurn: true });
  hideTyping();
  state.responseMode = reply.mode;
  appendMessage('professor', reply.text);

  if (reply.stars) {
    state.scores.push({ round: scoredRound, stars: reply.stars, reason: reply.scoreReason, createdAt: new Date().toISOString() });
    showScore(reply.stars, reply.scoreReason);
  } else {
    showScore(null, '');
  }

  maybeInterrupt();
  setBusy(false);

  if (scoredRound >= 5) {
    finishGame(reply.finalSummary);
  } else {
    advanceRound();
    els.userInput.placeholder = state.currentRound === 4 ? 'You are in the Hot Seat. Answer the hardest point directly…' : state.currentRound === 5 ? 'Give your last word…' : 'Answer Professor L…';
    els.userInput.focus();
  }
}

async function init() {
  const [topicData, personaData] = await Promise.all([loadJson('data/topics.json'), loadJson('data/personas.json')]);
  state.personas = personaData.personas || [];

  const active = getActiveGame();
  const params = new URLSearchParams(location.search);
  const wantsResume = params.get('resume') === '1';
  const selectedTopicId = wantsResume && active?.topicId ? active.topicId : getSelectedTopic();
  const selectedTopic = topicData.topics.find((topic) => topic.id === selectedTopicId);
  state.topic = selectedTopic || {
    id: 'open-conversation', title: 'Open conversation', categoryLabel: 'Your question',
    summary: 'A live five-round conversation built around the question you brought.', scenario: '', stakeholder: '', risk: ''
  };

  const customQuestion = getCustomQuestion();
  els.categoryLabel.textContent = state.topic.categoryLabel || 'Live question';
  els.topicTitle.textContent = state.topic.title || 'Open conversation';
  els.customQuestionDisplay.textContent = customQuestion || state.topic.title;

  const stanceMap = {
    'mostly-agree': 'Mostly agrees', 'mostly-disagree': 'Mostly disagrees', 'unsure': 'Genuinely unsure',
    'both-sides': 'Sees both sides', 'explain': 'Own view'
  };
  const stanceValue = wantsResume && active?.userStance ? active.userStance : getUserStance();
  const stanceDetailValue = wantsResume && active?.userStanceDetail ? active.userStanceDetail : getUserStanceDetail();
  els.stanceDisplay.textContent = stanceDetailValue ? `${stanceMap[stanceValue] || 'Open'} · ${stanceDetailValue}` : (stanceMap[stanceValue] || 'Open');

  renderAudience();

  if (wantsResume && active?.mode === 'conversation-debate-game') {
    state.messages = Array.isArray(active.messages) ? active.messages : [];
    state.interruptions = Array.isArray(active.interruptions) ? active.interruptions : [];
    state.scores = Array.isArray(active.scores) ? active.scores : [];
    state.interruptionCursor = Number(active.interruptionCursor || 0);
    state.currentRound = Math.max(1, Math.min(5, Number(active.currentRound || 1)));
    state.complete = Boolean(active.complete);
    state.finalSummary = String(active.finalSummary || '');
  }

  updateRoundUI();
  renderMessages();

  if (state.scores.length) {
    const latest = state.scores[state.scores.length - 1];
    showScore(latest.stars, latest.reason);
  }

  if (state.complete) {
    finishGame(state.finalSummary || 'This debate is already complete. Start a new debate to enter the studio again.');
    return;
  }

  if (!state.messages.length) {
    const question = customQuestion || state.topic.title;
    setBusy(true);
    showTyping();
    const openingReply = await getProfessorResponse(question, { scoreThisTurn: false, opening: true });
    hideTyping();
    state.responseMode = openingReply.mode;
    appendMessage('professor', openingReply.text);
    setBusy(false);
  }

  els.userInput.focus();
}

els.debateForm.addEventListener('submit', submitUserTurn);
els.userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    els.debateForm.requestSubmit();
  }
});
els.drawerClose.addEventListener('click', closePersonaDrawer);
els.drawerScrim.addEventListener('click', closePersonaDrawer);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePersonaDrawer(); });
els.forfeitBtn.addEventListener('click', () => {
  if (!window.confirm('End this debate? The current game will be cleared.')) return;
  clearActiveGame();
  window.location.href = 'index.html';
});

init().catch((error) => {
  els.messageThread.innerHTML = `<div class="message-body"><strong>Could not start the live stage.</strong><p>${escapeHtml(error.message)}</p></div>`;
  setBusy(true);
});
