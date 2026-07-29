import {
  clearActiveGame,
  clearCurrentSelection,
  getActiveGame,
  hasActiveGame
} from "./storage.js";

const newGameBtn = document.getElementById("newGameBtn");
const loadGameBtn = document.getElementById("loadGameBtn");
const saveStatus = document.getElementById("saveStatus");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const soundBtn = document.getElementById("soundBtn");

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Saved just now";
  if (mins === 1) return "Saved 1 minute ago";
  if (mins < 60) return `Saved ${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "Saved 1 hour ago";
  if (hrs < 24) return `Saved ${hrs} hours ago`;
  return "Saved earlier";
}

function updateLoadState() {
  const active = getActiveGame();
  if (!active) {
    loadGameBtn.disabled = true;
    loadGameBtn.classList.add("disabled");
    loadGameBtn.setAttribute("aria-disabled", "true");
    saveStatus.textContent = "No saved Star Trial found.";
    return;
  }

  loadGameBtn.disabled = false;
  loadGameBtn.classList.remove("disabled");
  loadGameBtn.removeAttribute("aria-disabled");
  const round = Number(active.roundIndex ?? 0) + 1;
  const stars = Number(active.stars ?? 5);
  saveStatus.textContent = `Load saved game — Round ${round}, ${stars}/10 stars. ${timeAgo(active.savedAt)}.`;
}

newGameBtn?.addEventListener("click", () => {
  if (hasActiveGame()) {
    const ok = window.confirm("Start a new game? This will replace your unfinished Star Trial in this browser.");
    if (!ok) return;
  }
  clearActiveGame();
  clearCurrentSelection();
  window.location.href = "topics.html";
});

loadGameBtn?.addEventListener("click", () => {
  if (!hasActiveGame()) {
    updateLoadState();
    return;
  }
  window.location.href = "arena.html?resume=1";
});

settingsBtn?.addEventListener("click", () => {
  if (!settingsPanel) return;
  settingsPanel.hidden = !settingsPanel.hidden;
});

soundBtn?.addEventListener("click", () => {
  const muted = soundBtn.dataset.muted === "true";
  soundBtn.dataset.muted = String(!muted);
  soundBtn.textContent = muted ? "▮▮" : "×";
  soundBtn.setAttribute("aria-label", muted ? "Sound on" : "Sound off");
});

updateLoadState();
