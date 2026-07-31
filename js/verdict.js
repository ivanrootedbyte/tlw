import { clearActiveGame, getLastResult } from "./storage.js";
import { buildShareBlock } from "./dialogue-engine.js";

clearActiveGame();
const result = getLastResult();
const endingTitle = document.getElementById("endingTitle");
const endingSummary = document.getElementById("endingSummary");
const professorFinal = document.getElementById("professorFinal");
const shareBlock = document.getElementById("shareBlock");
const copyBtn = document.getElementById("copyShareBtn");
const copyStatus = document.getElementById("copyStatus");
const resultStars = document.getElementById("resultStars");
const nextHook = document.getElementById("nextHook");
const roundHistory = document.getElementById("roundHistory");

function setMeter(idPrefix, value) {
  document.getElementById(`${idPrefix}Score`).textContent = value;
  document.getElementById(`${idPrefix}Fill`).style.width = `${value}%`;
}

function starsLine(stars = 0, max = 20, best = 0) {
  const filled = Math.max(0, Math.min(max, stars));
  const bestText = best > stars ? ` · Best ${best}` : '';
  return `${"★".repeat(filled)}${"☆".repeat(max - filled)} ${stars}/${max} victory line${bestText}`;
}

function renderHistory(result) {
  if (!result?.history?.length) {
    roundHistory.innerHTML = `<div class="verdict-history-item"><strong>No round history.</strong><p class="small">Play a Star Trial first.</p></div>`;
    return;
  }
  roundHistory.innerHTML = result.history.map((item) => {
    if (item.type === 'swap') {
      return `<div class="verdict-history-item bad-answer-chip"><strong>Swap penalty ${item.cost} star(s)</strong><p class="small">${item.from} → ${item.to}</p></div>`;
    }
    const delta = (item.starsAfter ?? 0) - (item.starsBefore ?? 0);
    return `<div class="verdict-history-item">
      <strong>Round ${item.round}: ${item.roundTitle} · ${delta > 0 ? '+' : ''}${delta} star(s)</strong>
      <p>${item.answer?.text || 'No answer recorded.'}</p>
      <p class="small">Professor L: ${item.answer?.professor || ''}</p>
    </div>`;
  }).join('');
}

if (!result) {
  endingTitle.textContent = "No saved result";
  endingSummary.textContent = "Play a Star Trial first.";
  professorFinal.textContent = "I can only judge arguments that have actually arrived.";
  shareBlock.textContent = "No result available.";
  resultStars.textContent = starsLine(0);
  renderHistory(null);
} else {
  endingTitle.textContent = result.ending.title;
  endingSummary.textContent = `${result.personaName} on “${result.topicTitle}”. ${result.ending.summary}`;
  professorFinal.textContent = result.ending.professor;
  shareBlock.textContent = buildShareBlock(result);
  resultStars.textContent = result.mode === 'star-trial' ? starsLine(result.stars, result.maxStars || 20, result.bestStars || 0) : '';
  nextHook.textContent = result.nextHook ? `Next challenge: ${result.nextHook}` : 'Try the same question with a different persona.';
  setMeter("logic", result.scores.logic);
  setMeter("evidence", result.scores.evidence);
  setMeter("humanity", result.scores.humanity);
  setMeter("humility", result.scores.humility);
  renderHistory(result);
}

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareBlock.textContent);
    copyStatus.textContent = "Copied.";
  } catch {
    copyStatus.textContent = "Copy failed. You can still select the text manually.";
  }
});
