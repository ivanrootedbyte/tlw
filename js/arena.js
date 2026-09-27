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

const els = {
  categoryLabel: document.getElementById('categoryLabel'),
  topicTitle: document.getElementById('topicTitle'),
  topicHook: document.getElementById('topicHook'),
  customQuestionDisplay: document.getElementById('customQuestionDisplay'),
  turnCounter: document.getElementById('turnCounter'),
  messageThread: document.getElementById('messageThread'),
  debateForm: document.getElementById('debateForm'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
  composerHint: document.getElementById('composerHint'),
  personaRail: document.getElementById('personaRail'),
  interruptionLayer: document.getElementById('interruptionLayer'),
  forfeitBtn: document.getElementById('forfeitBtn'),
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
  busy: false,
  interruptionCursor: 0,
  responseMode: 'unknown'
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

function turnNumber() {
  return Math.max(1, state.messages.filter((message) => message.role === 'user').length);
}

function updateTurnCounter() {
  els.turnCounter.textContent = `Exchange ${turnNumber()}`;
}

function scrollThread() {
  requestAnimationFrame(() => {
    els.messageThread.scrollTop = els.messageThread.scrollHeight;
  });
}

function messageMarkup(message) {
  const isUser = message.role === 'user';
  const avatar = isUser
    ? '<div class="message-avatar" aria-hidden="true">YOU</div>'
    : '<div class="message-avatar"><img src="assets/portraits/professor-l.png" alt="" /></div>';
  const body = `
    <div class="message-body">
      <div class="message-meta"><strong>${isUser ? 'You' : 'Professor L'}</strong><span>${escapeHtml(message.time || '')}</span></div>
      <p>${formatMessageText(message.text)}</p>
    </div>`;
  return `<article class="message ${isUser ? 'user' : 'professor'}">${isUser ? body + avatar : avatar + body}</article>`;
}

function renderMessages() {
  els.messageThread.innerHTML = state.messages.map(messageMarkup).join('');
  scrollThread();
  updateTurnCounter();
}

function appendMessage(role, text) {
  const message = { role, text: String(text).trim(), time: nowTime(), createdAt: new Date().toISOString() };
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
  node.innerHTML = `
    <div class="message-avatar"><img src="assets/portraits/professor-l.png" alt="" /></div>
    <div class="message-body"><div class="message-meta"><strong>Professor L</strong><span>considering</span></div><p>Thinking that through…</p></div>`;
  els.messageThread.appendChild(node);
  scrollThread();
}

function hideTyping() {
  document.getElementById('typingMessage')?.remove();
}

function initialProfessorPrompt(topic, question) {
  const q = String(question || "").trim();
  if (q) return `You asked: “${q}” Let us begin there. I will take the question seriously, separate what we know from what we assume, and test the answer against truth, human consequences, and the Christian worldview. What part of this question creates the most uncertainty for you?`;
  const scenario = topic.scenario ? `Consider this case: ${topic.scenario}. ` : '';
  return `${topic.title}. ${scenario}What part of this question creates the most uncertainty for you?`;
}

function fallbackProfessorResponse(input) {
  const normalized = input.trim();
  const openings = [
    'That is a position. Now give me the principle underneath it.',
    'I can follow the claim. I am less certain about the bridge from your premise to your conclusion.',
    'Good — you have made the disagreement visible. Now test your rule against the person who bears the cost.',
    'Let us sharpen that. Which part of your answer is evidence, and which part is judgment?',
    'Suppose the strongest critic of your view were sitting here. What would they say you have overlooked?'
  ];
  const index = state.messages.filter((message) => message.role === 'user').length % openings.length;
  const direct = normalized.length > 220 ? 'Your answer has several claims in it; choose the one you most need to defend.' : openings[index];
  return `${direct} I am not asking you to abandon your conclusion — only to make it survive scrutiny.`;
}

async function getProfessorResponse(userText) {
  const history = state.messages.slice(-8).map(({ role, text }) => ({ role, text }));
  try {
    const response = await fetch('/api/debate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'conversation',
        topic: state.topic,
        userQuestion: getCustomQuestion(),
        userStance: getUserStance(),
        userStanceDetail: getUserStanceDetail(),
        customAnswer: userText,
        history
      })
    });
    if (!response.ok) throw new Error('Debate response failed');
    const data = await response.json();
    const text = data?.professorResponse?.trim() || fallbackProfessorResponse(userText);
    return { text, mode: data?.mode === 'gemini' ? 'gemini' : 'fallback' };
  } catch {
    return { text: fallbackProfessorResponse(userText), mode: 'fallback' };
  }
}

function interruptionText(persona, beat) {
  const topic = state.topic || {};
  const stakeholder = topic.stakeholder || 'the person who has to live with the rule';
  const risk = topic.risk || 'the unintended consequence';
  const lines = {
    'frontier-founder': [
      `We can debate forever, but what would you actually test first? Give me the smallest real-world experiment.`,
      `Fine, but delay has a cost too. What happens if caution becomes an excuse to never act?`
    ],
    'virtual-mayor': [
      `You are treating this like an individual choice. What happens once everyone around you starts copying it?`,
      `I want the social layer. Does this make people more connected, or merely more engaged?`
    ],
    'index-chancellor': [
      `Citation request: which part of that claim could we actually verify?`,
      `Before we moralize the result, what evidence would change your mind?`
    ],
    'polished-minimalist': [
      `Your rule sounds clean. Does it still leave people a meaningful choice?`,
      `Could you design the good default without turning it into quiet coercion?`
    ],
    'alignment-gambler': [
      `How certain are you, really? Put a confidence level on the part you are least sure about.`,
      `That sounds plausible. Plausible is not the same as safe — what failure are you pricing in?`
    ],
    'silicon-blacksmith': [
      `Scale test: does your principle still work when this affects a million people instead of ten?`,
      `More capability is easy to imagine. Tell me what the capability is actually for.`
    ]
  };
  const bank = lines[persona.id] || [
    `What does your answer mean for ${stakeholder}?`,
    `Have you accounted for ${risk}?`
  ];
  return bank[beat % bank.length]
    .replace('{stakeholder}', stakeholder)
    .replace('{risk}', risk);
}

function shouldInterrupt(afterRole) {
  const userTurns = state.messages.filter((message) => message.role === 'user').length;
  if (!userTurns) return false;
  if (afterRole === 'user') return userTurns === 1 || userTurns % 3 === 0;
  return userTurns % 2 === 0;
}

function choosePersona(afterRole) {
  if (!state.personas.length) return null;
  const offset = afterRole === 'professor' ? 2 : 0;
  const persona = state.personas[(state.interruptionCursor + offset) % state.personas.length];
  state.interruptionCursor = (state.interruptionCursor + 1) % state.personas.length;
  return persona;
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('leaving')) return;
  toast.classList.add('leaving');
  setTimeout(() => toast.remove(), 280);
}

function showInterruption(persona, text) {
  const record = {
    personaId: persona.id,
    text,
    createdAt: new Date().toISOString(),
    turn: state.messages.filter((message) => message.role === 'user').length
  };
  state.interruptions.push(record);
  saveDebate();

  const card = document.querySelector(`[data-persona-id="${persona.id}"]`);
  card?.classList.add('interrupting');
  setTimeout(() => card?.classList.remove('interrupting'), 1500);

  const toast = document.createElement('div');
  toast.className = 'interruption-toast';
  toast.style.setProperty('--persona-accent', ACCENTS[persona.theme] || '#d9b36c');
  toast.innerHTML = `
    <img src="${persona.portrait}" alt="${escapeHtml(persona.displayName)}" />
    <div><strong>${escapeHtml(persona.displayName)} interrupts</strong><p>${escapeHtml(text)}</p></div>
    <button class="toast-dismiss" type="button" aria-label="Dismiss interruption">×</button>`;
  toast.querySelector('.toast-dismiss').addEventListener('click', () => dismissToast(toast));
  toast.addEventListener('click', (event) => {
    if (!event.target.closest('.toast-dismiss')) openPersonaDrawer(persona.id);
  });
  els.interruptionLayer.appendChild(toast);
  while (els.interruptionLayer.children.length > 2) els.interruptionLayer.firstElementChild.remove();
  setTimeout(() => dismissToast(toast), 6200);
}

function maybeInterrupt(afterRole) {
  if (!shouldInterrupt(afterRole)) return;
  const persona = choosePersona(afterRole);
  if (!persona) return;
  const beat = state.messages.length + state.interruptions.length;
  const text = interruptionText(persona, beat);
  setTimeout(() => showInterruption(persona, text), afterRole === 'user' ? 500 : 850);
}

function renderAudience() {
  els.personaRail.innerHTML = state.personas.map((persona) => `
    <button class="audience-card theme-${escapeHtml(persona.theme)}" type="button" data-persona-id="${persona.id}" style="--persona-accent:${ACCENTS[persona.theme] || '#d9b36c'}">
      <img src="${persona.portrait}" alt="${escapeHtml(persona.displayName)} portrait" />
      <span><strong>${escapeHtml(persona.displayName)}</strong><small>${escapeHtml(persona.type)}</small></span>
    </button>`).join('');
  els.personaRail.querySelectorAll('.audience-card').forEach((button) => {
    button.addEventListener('click', () => openPersonaDrawer(button.dataset.personaId));
  });
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
    ? history.map((item) => `<div class="history-entry"><strong>Turn ${item.turn}</strong><br>${escapeHtml(item.text)}</div>`).join('')
    : '<div class="empty-history">No interruptions yet. They are still listening.</div>';
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
    mode: 'conversation-debate',
    topicId: state.topic.id,
    messages: state.messages,
    interruptions: state.interruptions,
    interruptionCursor: state.interruptionCursor,
    userStance: getUserStance(),
    userStanceDetail: getUserStanceDetail()
  });
}

function setBusy(busy) {
  state.busy = busy;
  els.sendBtn.disabled = busy;
  els.userInput.disabled = busy;
  if (busy) {
    els.composerHint.textContent = 'Professor L is thinking that through…';
    return;
  }
  if (state.responseMode === 'gemini') {
    els.composerHint.textContent = 'Live AI · Keep the conversation going — question it, challenge it, or take it deeper.';
  } else if (state.responseMode === 'fallback') {
    els.composerHint.textContent = 'Local fallback response · Live AI is currently unavailable.';
  } else {
    els.composerHint.textContent = 'No need to perform. Say what you actually think.';
  }
}

async function submitUserTurn(event) {
  event.preventDefault();
  if (state.busy) return;
  const text = els.userInput.value.trim();
  if (!text) return;

  els.userInput.value = '';
  appendMessage('user', text);
  maybeInterrupt('user');
  setBusy(true);
  showTyping();

  const reply = await getProfessorResponse(text);
  hideTyping();
  state.responseMode = reply.mode;
  appendMessage('professor', reply.text);
  setBusy(false);
  maybeInterrupt('professor');
  els.userInput.focus();
}

async function init() {
  const [topicData, personaData] = await Promise.all([
    loadJson('data/topics.json'),
    loadJson('data/personas.json')
  ]);
  state.personas = personaData.personas || [];

  const active = getActiveGame();
  const params = new URLSearchParams(location.search);
  const wantsResume = params.get('resume') === '1';
  const selectedTopicId = wantsResume && active?.topicId ? active.topicId : getSelectedTopic();
  const selectedTopic = topicData.topics.find((topic) => topic.id === selectedTopicId);
  state.topic = selectedTopic || {
    id: 'open-conversation',
    title: 'Open conversation',
    categoryLabel: 'Your question',
    summary: 'Professor L will begin from the question you brought rather than forcing it into a preset debate topic.',
    scenario: '',
    stakeholder: '',
    risk: ''
  };

  const customQuestion = getCustomQuestion();
  els.categoryLabel.textContent = state.topic.categoryLabel || 'Conversation topic';
  els.topicTitle.textContent = state.topic.title;
  els.customQuestionDisplay.textContent = customQuestion || 'No opening question was saved. You can continue from the selected topic.';
  els.topicHook.textContent = state.topic.summary || state.topic.hook || state.topic.title;
  const stanceMap = {
    'mostly-agree': 'Mostly agrees',
    'mostly-disagree': 'Mostly disagrees',
    'unsure': 'Genuinely unsure',
    'both-sides': 'Sees both sides',
    'explain': 'Explained in own words'
  };
  const stanceValue = wantsResume && active?.userStance ? active.userStance : getUserStance();
  const stanceDetailValue = wantsResume && active?.userStanceDetail ? active.userStanceDetail : getUserStanceDetail();
  const stanceText = stanceMap[stanceValue] || 'Not specified';
  const stanceEl = document.getElementById('stanceDisplay');
  if (stanceEl) stanceEl.textContent = stanceDetailValue ? `${stanceText} — ${stanceDetailValue}` : stanceText;
  renderAudience();

  if (wantsResume && active?.mode === 'conversation-debate' && active.topicId === state.topic.id) {
    state.messages = Array.isArray(active.messages) ? active.messages : [];
    state.interruptions = Array.isArray(active.interruptions) ? active.interruptions : [];
    state.interruptionCursor = Number(active.interruptionCursor || 0);
  }

  if (!state.messages.length) {
    if (customQuestion) {
      state.messages = [{ role: 'user', text: customQuestion, time: nowTime(), createdAt: new Date().toISOString() }];
      saveDebate();
      renderMessages();
      setBusy(true);
      showTyping();
      const reply = await getProfessorResponse(customQuestion);
      hideTyping();
      state.responseMode = reply.mode;
      appendMessage('professor', reply.text);
      setBusy(false);
      maybeInterrupt('professor');
    } else {
      state.messages = [{ role: 'professor', text: initialProfessorPrompt(state.topic, customQuestion), time: nowTime(), createdAt: new Date().toISOString() }];
      saveDebate();
      renderMessages();
    }
  } else {
    renderMessages();
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
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePersonaDrawer();
});
els.forfeitBtn.addEventListener('click', () => {
  if (!window.confirm('End this conversation? Your current transcript will be cleared.')) return;
  clearActiveGame();
  window.location.href = 'index.html';
});

init().catch((error) => {
  els.messageThread.innerHTML = `<div class="message-body"><strong>Could not start debate.</strong><p>${escapeHtml(error.message)}</p></div>`;
  setBusy(true);
});
