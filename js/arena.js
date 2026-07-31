import { loadJson } from './data-loader.js';
import { resolvePersonaName } from './persona-resolver.js';
import { clearActiveGame, getActiveGame, getSelectedPersona, getSelectedTopic, saveActiveGame, setLastResult, setSelectedPersona } from './storage.js';
import { saveCloudMatch } from './supabase-client.js';
import {
  STARTING_STARS,
  applyStarChange,
  getMaxStars,
  getRoundsPerTrial,
  getStartingStars,
  buildProfessorQuestion,
  calculateStarEnding,
  getPersonaAnswers,
  getSwapCost,
  nextHook,
  scoreToMeters,
  starLabel
} from './star-trial-engine.js';

const els = {
  personaRail: document.getElementById('personaRail'),
  activePersonaCard: document.getElementById('activePersonaCard'),
  swapChip: document.getElementById('swapChip'),
  categoryLabel: document.getElementById('categoryLabel'),
  topicTitle: document.getElementById('topicTitle'),
  topicHook: document.getElementById('topicHook'),
  starsDisplay: document.getElementById('starsDisplay'),
  starNumber: document.getElementById('starNumber'),
  roundCounter: document.getElementById('roundCounter'),
  challengeType: document.getElementById('challengeType'),
  professorQuestion: document.getElementById('professorQuestion'),
  roundHint: document.getElementById('roundHint'),
  answerList: document.getElementById('answerList'),
  patienceFill: document.getElementById('patienceFill'),
  forfeitBtn: document.getElementById('forfeitBtn'),
  roundIntroModal: document.getElementById('roundIntroModal'),
  closeIntroBtn: document.getElementById('closeIntroBtn'),
  startRoundBtn: document.getElementById('startRoundBtn'),
  introTitle: document.getElementById('introTitle'),
  introPrompt: document.getElementById('introPrompt'),
  introTip: document.getElementById('introTip'),
  resultModal: document.getElementById('resultModal'),
  resultEvent: document.getElementById('resultEvent'),
  resultTitle: document.getElementById('resultTitle'),
  resultResponse: document.getElementById('resultResponse'),
  resultLesson: document.getElementById('resultLesson'),
  nextRoundBtn: document.getElementById('nextRoundBtn')
};

const state = {
  personas: [],
  topic: null,
  trialData: null,
  persona: null,
  stars: STARTING_STARS,
  roundIndex: 0,
  swapCount: 0,
  history: [],
  badAnswers: [],
  locked: false
};

function showModal(modal) { modal.classList.remove('hidden'); }
function hideModal(modal) { modal.classList.add('hidden'); }
function maxStars() { return getMaxStars(state.trialData); }
const BEST_RUN_KEY = 'tlw.bestStarRun';
function getBestRun() {
  try { return Number(localStorage.getItem(BEST_RUN_KEY) || 0); } catch { return 0; }
}
function saveBestRun(stars) {
  const best = Math.max(getBestRun(), Number(stars) || 0);
  try { localStorage.setItem(BEST_RUN_KEY, String(best)); } catch {}
  return best;
}
function totalRounds() { return getRoundsPerTrial(state.topic, state.trialData); }

function renderStars() {
  const max = maxStars();
  const displayStars = Math.max(0, Math.min(max, state.stars));
  els.starsDisplay.textContent = `${'★'.repeat(displayStars)}${'☆'.repeat(max - displayStars)}`;
  const best = getBestRun();
  els.starNumber.textContent = state.stars >= max
    ? `${state.stars} ★ · victory line ${max}${best > state.stars ? ` · best ${best}` : ''}`
    : `${state.stars} / ${max}${best > state.stars ? ` · best ${best}` : ''}`;
  const patience = Math.max(10, Math.min(100, 20 + Math.round((Math.min(state.stars, max) / max) * 80)));
  els.patienceFill.style.width = `${patience}%`;
}

function currentRound() {
  return buildProfessorQuestion(state.topic, state.trialData, state.roundIndex);
}

function saveCurrentGame() {
  if (!state.topic || !state.trialData) return;
  saveActiveGame({
    mode: 'star-trial',
    topicId: state.topic.id,
    personaId: state.persona?.id || null,
    stars: state.stars,
    bestStars: getBestRun(),
    roundIndex: state.roundIndex,
    swapCount: state.swapCount,
    history: state.history,
    badAnswers: state.badAnswers
  });
}

function renderPersonaRail() {
  els.personaRail.innerHTML = '';
  state.personas.forEach((persona) => {
    const isActive = state.persona?.id === persona.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `rail-persona theme-${persona.theme} ${isActive ? 'active' : ''}`;
    button.innerHTML = `
      <img src="${persona.portrait}" alt="${resolvePersonaName(persona)} portrait" />
      <span><strong>${resolvePersonaName(persona)}</strong><small>${persona.weakness}</small></span>
      <em>${isActive ? 'ACTIVE' : 'PICK'}</em>
    `;
    button.addEventListener('click', () => choosePersona(persona));
    els.personaRail.appendChild(button);
  });
}

function renderActivePersona() {
  if (!state.persona) {
    els.activePersonaCard.innerHTML = '<div class="empty-persona">Pick a persona from the left before answering.</div>';
    return;
  }
  els.activePersonaCard.innerHTML = `
    <div class="fighter-label">YOUR PERSONA</div>
    <img src="${state.persona.portrait}" alt="${resolvePersonaName(state.persona)} portrait" />
    <h2>${resolvePersonaName(state.persona)}</h2>
    <p>${state.persona.tagline}</p>
    <div class="persona-mini-stats">
      ${Object.entries(state.persona.stats || {}).map(([key, value]) => `
        <span>${key}</span><div class="meter"><span style="width:${value}%"></span></div>
      `).join('')}
    </div>
  `;
}

function renderSwapChip() {
  const cost = state.persona && state.roundIndex > 0 ? getSwapCost(state.swapCount) : 0;
  els.swapChip.textContent = `Swap cost: ${cost ? `-${cost} star${cost === 1 ? '' : 's'}` : '0'}`;
}

function choosePersona(persona) {
  if (state.locked) return;
  const hadPersona = Boolean(state.persona);
  const isSwap = hadPersona && state.persona.id !== persona.id && state.roundIndex > 0;
  if (isSwap) {
    const cost = getSwapCost(state.swapCount);
    state.stars = applyStarChange(state.stars, -cost);
    state.swapCount += 1;
    state.history.push({
      round: state.roundIndex + 1,
      type: 'swap',
      from: resolvePersonaName(state.persona),
      to: resolvePersonaName(persona),
      cost: -cost
    });
  }
  state.persona = persona;
  setSelectedPersona(persona.id);
  renderPersonaRail();
  renderActivePersona();
  renderSwapChip();
  renderStars();
  renderRound();
  saveCurrentGame();
  if (state.stars <= 0) finishTrial();
}

function renderRound() {
  const round = currentRound();
  els.roundCounter.textContent = `Round ${state.roundIndex + 1} of ${totalRounds()}`;
  els.challengeType.textContent = round.title;
  els.professorQuestion.textContent = round.professor;
  els.roundHint.textContent = round.hint;
  els.introTitle.textContent = `Round ${state.roundIndex + 1}: ${round.title}`;
  els.introPrompt.textContent = round.prompt;
  els.introTip.textContent = round.hint;

  if (!state.persona) {
    els.answerList.innerHTML = '<div class="answer-card disabled-answer"><strong>Choose a persona first.</strong><p>Different personas give different answers. Pick the one that fits this question.</p></div>';
    return;
  }
  const answers = getPersonaAnswers(state.persona, round, state.trialData, state.topic);
  els.answerList.innerHTML = '';
  answers.forEach((answer, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'answer-card';
    card.innerHTML = `
      <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
      <strong>${answer.text}</strong>
      <small>${resolvePersonaName(state.persona)} answer path</small>
    `;
    card.addEventListener('click', () => chooseAnswer(answer));
    els.answerList.appendChild(card);
  });
}

function chooseAnswer(answer) {
  if (!state.persona || state.locked) return;
  state.locked = true;
  const before = state.stars;
  state.stars = applyStarChange(state.stars, answer.stars);
  saveBestRun(state.stars);
  const round = currentRound();
  const changeText = starLabel(state.stars - before);
  if (answer.stars < 0) {
    state.badAnswers.push({ topic: state.topic.title, persona: resolvePersonaName(state.persona), answer: answer.text, professor: answer.professor });
  }
  state.history.push({
    round: state.roundIndex + 1,
    roundTitle: round.title,
    roundType: round.type,
    personaId: state.persona.id,
    personaName: resolvePersonaName(state.persona),
    answer,
    starsBefore: before,
    starsAfter: state.stars
  });
  renderStars();
  saveCurrentGame();
  els.resultEvent.textContent = `${answer.event || 'STAR CHANGE'} · ${changeText}`;
  els.resultTitle.textContent = state.stars <= 0 ? 'Argument collapsed' : answer.stars >= 2 ? 'Professor L approves' : answer.stars < 0 ? 'Professor L pushes back' : 'Professor L responds';
  els.resultResponse.textContent = answer.professor;
  els.resultLesson.textContent = answer.lesson || 'Lesson: smart answers still need wisdom.';
  const lastRound = state.roundIndex >= totalRounds() - 1;
  els.nextRoundBtn.textContent = state.stars <= 0 || lastRound ? 'Go to Verdict' : 'Next Question';
  showModal(els.resultModal);
}

async function finishTrial() {
  const max = maxStars();
  const scores = scoreToMeters(state.stars, max);
  const personaName = state.persona ? resolvePersonaName(state.persona) : 'No persona';
  const bestStars = saveBestRun(state.stars);
  const ending = calculateStarEnding({
    stars: state.stars,
    maxStars: max,
    history: state.history,
    personaName,
    topicTitle: state.topic.title,
    swaps: state.swapCount,
    bestStars
  });
  const result = {
    mode: 'star-trial',
    personaId: state.persona?.id || null,
    personaName,
    topicId: state.topic.id,
    topicTitle: state.topic.title,
    stars: state.stars,
    bestStars,
    maxStars: max,
    swaps: state.swapCount,
    history: state.history,
    badAnswers: state.badAnswers,
    nextHook: nextHook({ stars: state.stars, maxStars: max, swaps: state.swapCount }),
    scores,
    ending
  };
  setLastResult(result);
  clearActiveGame();
  try { await saveCloudMatch(result); } catch (err) { console.warn('Cloud save failed', err.message); }
  location.href = 'verdict.html';
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const resumeRequested = params.get('resume') === '1';
  const activeGame = resumeRequested ? getActiveGame() : null;
  if (resumeRequested && !activeGame) {
    location.href = 'topics.html';
    return;
  }

  const topicId = activeGame?.topicId || getSelectedTopic();
  const personaId = activeGame?.personaId || getSelectedPersona();
  const [{ personas }, { topics }, trialData] = await Promise.all([
    loadJson('data/personas.json'),
    loadJson('data/topics.json'),
    loadJson('data/star-trials.json')
  ]);
  state.personas = personas;
  state.topic = topics.find((t) => t.id === topicId) || topics[0];
  state.trialData = trialData;
  state.stars = activeGame ? Number(activeGame.stars ?? STARTING_STARS) : getStartingStars(trialData);
  state.roundIndex = activeGame ? Number(activeGame.roundIndex ?? 0) : 0;
  state.swapCount = activeGame ? Number(activeGame.swapCount ?? 0) : 0;
  state.history = Array.isArray(activeGame?.history) ? activeGame.history : [];
  state.badAnswers = Array.isArray(activeGame?.badAnswers) ? activeGame.badAnswers : [];

  els.categoryLabel.textContent = `${state.topic.categoryLabel} · Star Trial`;
  els.topicTitle.textContent = state.topic.title;
  els.topicHook.textContent = state.topic.hook || state.topic.summary;

  renderStars();
  renderPersonaRail();
  renderActivePersona();
  renderSwapChip();
  renderRound();

  if (personaId) {
    const startingPersona = personas.find((p) => p.id === personaId);
    if (startingPersona) {
      state.persona = startingPersona;
      setSelectedPersona(startingPersona.id);
      renderPersonaRail();
      renderActivePersona();
      renderSwapChip();
      renderRound();
    }
  }

  saveCurrentGame();
  showModal(els.roundIntroModal);
}

els.closeIntroBtn.addEventListener('click', () => hideModal(els.roundIntroModal));
els.startRoundBtn.addEventListener('click', () => hideModal(els.roundIntroModal));
els.forfeitBtn.addEventListener('click', finishTrial);
els.nextRoundBtn.addEventListener('click', () => {
  hideModal(els.resultModal);
  if (state.stars <= 0 || state.roundIndex >= totalRounds() - 1) {
    finishTrial();
    return;
  }
  state.roundIndex += 1;
  state.locked = false;
  saveCurrentGame();
  renderSwapChip();
  renderRound();
  showModal(els.roundIntroModal);
});

init().catch((err) => {
  els.topicTitle.textContent = 'Could not start Star Trial';
  els.topicHook.textContent = err.message;
});
