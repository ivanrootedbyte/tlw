import { loadJson } from './data-loader.js';
import { resolvePersonaName } from './persona-resolver.js';
import { getSelectedPersona, getSelectedTopic, setLastResult } from './storage.js';
import { applyEffects, calculateEnding, createInitialScores } from './game-engine.js';
import { getProfessorReaction, getBanner } from './dialogue-engine.js';
import { buildDeck, drawHand } from './deck.js';
import { saveCloudMatch } from './supabase-client.js';

const els = {
  sceneName: document.getElementById('sceneName'),
  arenaTitle: document.getElementById('arenaTitle'),
  arenaSubtitle: document.getElementById('arenaSubtitle'),
  playerPortrait: document.getElementById('playerPortrait'),
  playerName: document.getElementById('playerName'),
  playerTagline: document.getElementById('playerTagline'),
  roundNumber: document.getElementById('roundNumber'),
  professorChallenge: document.getElementById('professorChallenge'),
  roundTitle: document.getElementById('roundTitle'),
  roundPrompt: document.getElementById('roundPrompt'),
  customAnswer: document.getElementById('customAnswer'),
  submitPlayBtn: document.getElementById('submitPlayBtn'),
  eventBanner: document.getElementById('eventBanner'),
  professorResponse: document.getElementById('professorResponse'),
  handGrid: document.getElementById('handGrid'),
  forfeitBtn: document.getElementById('forfeitBtn'),
  logicScore: document.getElementById('logicScore'),
  evidenceScore: document.getElementById('evidenceScore'),
  humanityScore: document.getElementById('humanityScore'),
  humilityScore: document.getElementById('humilityScore'),
  logicFill: document.getElementById('logicFill'),
  evidenceFill: document.getElementById('evidenceFill'),
  humanityFill: document.getElementById('humanityFill'),
  humilityFill: document.getElementById('humilityFill'),
  openRoundBtn: document.getElementById('openRoundBtn'),
  roundModal: document.getElementById('roundModal'),
  closeRoundBtn: document.getElementById('closeRoundBtn'),
  startRoundBtn: document.getElementById('startRoundBtn'),
  modalRoundTitle: document.getElementById('modalRoundTitle'),
  modalRoundPrompt: document.getElementById('modalRoundPrompt'),
  modalRoundTwist: document.getElementById('modalRoundTwist'),
  resultModal: document.getElementById('resultModal'),
  resultBanner: document.getElementById('resultBanner'),
  resultTitle: document.getElementById('resultTitle'),
  resultText: document.getElementById('resultText'),
  nextRoundBtn: document.getElementById('nextRoundBtn')
};

const state = {
  persona: null,
  topic: null,
  cards: [],
  deck: [],
  scores: null,
  roundIndex: 0,
  selectedCard: null,
  customAnswers: [],
  waitingForNext: false
};

function showModal(modal) { modal.classList.remove('hidden'); }
function hideModal(modal) { modal.classList.add('hidden'); }

function renderScores() {
  ['logic', 'evidence', 'humanity', 'humility'].forEach((key) => {
    els[`${key}Score`].textContent = state.scores[key];
    els[`${key}Fill`].style.width = `${state.scores[key]}%`;
  });
}

function renderHand() {
  const hand = drawHand(state.deck, state.roundIndex);
  state.selectedCard = hand.find((card) => card.id === state.selectedCard?.id) || hand[0] || null;
  els.handGrid.innerHTML = '';
  hand.forEach((card) => {
    const article = document.createElement('article');
    article.className = `play-card arcade-card ${state.selectedCard?.id === card.id ? 'selected' : ''}`;
    article.innerHTML = `
      <div class="card-top"><span class="card-type">${card.category}</span><span class="card-cost">${Math.max(1, Math.abs(Object.values(card.effects).reduce((a,b)=>a+b,0)) % 4 + 1)}</span></div>
      <h3>${card.name}</h3>
      <p>${card.text}</p>
      <div class="effects">
        ${Object.entries(card.effects).map(([k, v]) => `<span class="effect-chip">${k === 'evidence' ? 'proof' : k} ${v > 0 ? '+' : ''}${v}</span>`).join('')}
      </div>
      <button class="btn ${state.selectedCard?.id === card.id ? 'primary' : 'secondary'}" type="button">${state.selectedCard?.id === card.id ? 'Selected' : 'Select'}</button>
    `;
    article.addEventListener('click', () => { state.selectedCard = card; renderHand(); });
    article.querySelector('button').addEventListener('click', (event) => { event.stopPropagation(); state.selectedCard = card; renderHand(); });
    els.handGrid.appendChild(article);
  });
}

function currentRound() {
  return state.topic.rounds[state.roundIndex];
}

function openRoundBriefing() {
  const round = currentRound();
  if (!round) return;
  els.modalRoundTitle.textContent = `Round ${state.roundIndex + 1}: ${round.title}`;
  els.modalRoundPrompt.textContent = round.prompt;
  els.modalRoundTwist.textContent = round.twist || round.challenge;
  showModal(els.roundModal);
}

function renderRound() {
  const round = currentRound();
  if (!round) {
    finishMatch();
    return;
  }
  state.waitingForNext = false;
  state.selectedCard = null;
  els.roundNumber.textContent = String(state.roundIndex + 1);
  els.roundTitle.textContent = round.title;
  els.roundPrompt.textContent = round.prompt;
  els.professorChallenge.textContent = round.challenge;
  els.eventBanner.classList.add('hidden');
  els.customAnswer.value = '';
  els.submitPlayBtn.disabled = false;
  els.professorResponse.textContent = 'Open the round briefing, then choose a card.';
  renderHand();
  openRoundBriefing();
}

async function fetchProfessorLine(round, customAnswer) {
  try {
    const response = await fetch('/api/debate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona: state.persona,
        topic: state.topic,
        round,
        card: state.selectedCard,
        customAnswer,
        scores: state.scores
      })
    });
    const json = await response.json();
    return json.professorResponse || getProfessorReaction(state.selectedCard, state.roundIndex, customAnswer);
  } catch {
    return getProfessorReaction(state.selectedCard, state.roundIndex, customAnswer);
  }
}

async function finishMatch() {
  const ending = calculateEnding(state.scores);
  const result = {
    personaId: state.persona.id,
    personaName: resolvePersonaName(state.persona),
    topicId: state.topic.id,
    topicTitle: state.topic.title,
    scores: state.scores,
    ending,
    customAnswers: state.customAnswers
  };
  setLastResult(result);
  try { await saveCloudMatch(result); } catch (err) { console.warn('Cloud save failed', err.message); }
  location.href = 'verdict.html';
}

async function playCard() {
  const round = currentRound();
  if (!state.selectedCard || !round || state.waitingForNext) return;
  state.waitingForNext = true;
  els.submitPlayBtn.disabled = true;
  const customAnswer = els.customAnswer.value.trim();
  state.customAnswers.push({ round: round.title, customAnswer, card: state.selectedCard.name });
  state.scores = applyEffects(state.scores, state.selectedCard.effects);
  renderScores();
  const banner = getBanner(state.selectedCard);
  if (banner) {
    els.eventBanner.textContent = banner;
    els.eventBanner.classList.remove('hidden');
  }
  els.professorResponse.textContent = 'Professor L is checking the bridge...';
  const line = await fetchProfessorLine(round, customAnswer);
  els.professorResponse.textContent = line;
  els.resultBanner.textContent = banner || 'ROUND PLAYED';
  els.resultTitle.textContent = `${state.selectedCard.name}`;
  els.resultText.textContent = line;
  els.nextRoundBtn.textContent = state.roundIndex >= 5 ? 'Go to Verdict' : 'Next Round';
  showModal(els.resultModal);
}

async function init() {
  const personaId = getSelectedPersona();
  const topicId = getSelectedTopic();
  const [{ personas }, { topics }, { cards }] = await Promise.all([
    loadJson('data/personas.json'),
    loadJson('data/topics.json'),
    loadJson('data/cards.json')
  ]);

  state.persona = personas.find((p) => p.id === personaId) || personas[0];
  state.topic = topics.find((t) => t.id === topicId) || topics[0];
  state.cards = cards;
  state.deck = buildDeck(state.persona, cards);
  state.scores = createInitialScores(state.persona);

  els.sceneName.textContent = state.topic.scene;
  els.arenaTitle.textContent = state.topic.title;
  els.arenaSubtitle.textContent = state.topic.hook;
  els.playerPortrait.src = state.persona.portrait;
  els.playerPortrait.alt = `${resolvePersonaName(state.persona)} portrait`;
  els.playerName.textContent = resolvePersonaName(state.persona);
  els.playerTagline.textContent = state.persona.tagline;
  renderScores();
  renderRound();
}

els.submitPlayBtn.addEventListener('click', playCard);
els.forfeitBtn.addEventListener('click', finishMatch);
els.openRoundBtn.addEventListener('click', openRoundBriefing);
els.closeRoundBtn.addEventListener('click', () => hideModal(els.roundModal));
els.startRoundBtn.addEventListener('click', () => hideModal(els.roundModal));
els.nextRoundBtn.addEventListener('click', () => {
  hideModal(els.resultModal);
  state.roundIndex += 1;
  renderRound();
});

init().catch((err) => { els.professorResponse.textContent = err.message; });
