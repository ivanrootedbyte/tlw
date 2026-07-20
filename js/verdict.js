import { getLastResult } from "./storage.js";
import { buildShareBlock } from "./dialogue-engine.js";

const result = getLastResult();
const endingTitle = document.getElementById("endingTitle");
const endingSummary = document.getElementById("endingSummary");
const professorFinal = document.getElementById("professorFinal");
const shareBlock = document.getElementById("shareBlock");
const copyBtn = document.getElementById("copyShareBtn");
const copyStatus = document.getElementById("copyStatus");

function setMeter(idPrefix, value) {
  document.getElementById(`${idPrefix}Score`).textContent = value;
  document.getElementById(`${idPrefix}Fill`).style.width = `${value}%`;
}

if (!result) {
  endingTitle.textContent = "No saved result";
  endingSummary.textContent = "Play a match first.";
  professorFinal.textContent = "I can only judge arguments that have actually arrived.";
  shareBlock.textContent = "No result available.";
} else {
  endingTitle.textContent = result.ending.title;
  endingSummary.textContent = `${result.personaName} on “${result.topicTitle}”. ${result.ending.summary}`;
  professorFinal.textContent = result.ending.professor;
  shareBlock.textContent = buildShareBlock(result);
  setMeter("logic", result.scores.logic);
  setMeter("evidence", result.scores.evidence);
  setMeter("humanity", result.scores.humanity);
  setMeter("humility", result.scores.humility);
}

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareBlock.textContent);
    copyStatus.textContent = "Copied.";
  } catch {
    copyStatus.textContent = "Copy failed. You can still select the text manually.";
  }
});
