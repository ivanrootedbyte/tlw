import { STORAGE_KEYS } from "./game-config.js";

const ACTIVE_GAME_KEY = "tlw.activeGame";
const CUSTOM_QUESTION_KEY = "tlw.customQuestion";
const USER_STANCE_KEY = "tlw.userStance";
const USER_STANCE_DETAIL_KEY = "tlw.userStanceDetail";

function read(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function remove(key) {
  localStorage.removeItem(key);
}

export function isSafeMode() { return read(STORAGE_KEYS.safeMode, false); }
export function setSafeMode(v) { write(STORAGE_KEYS.safeMode, Boolean(v)); }

export function getSelectedPersona() { return read(STORAGE_KEYS.selectedPersona, null); }
export function setSelectedPersona(id) {
  if (id === null || id === undefined) remove(STORAGE_KEYS.selectedPersona);
  else write(STORAGE_KEYS.selectedPersona, id);
}

export function getSelectedTopic() { return read(STORAGE_KEYS.selectedTopic, null); }
export function setSelectedTopic(id) {
  if (id === null || id === undefined) remove(STORAGE_KEYS.selectedTopic);
  else write(STORAGE_KEYS.selectedTopic, id);
}

export function getCustomQuestion() { return read(CUSTOM_QUESTION_KEY, ""); }
export function setCustomQuestion(question) {
  const value = String(question || "").trim();
  if (!value) remove(CUSTOM_QUESTION_KEY);
  else write(CUSTOM_QUESTION_KEY, value);
}

export function getUserStance() { return read(USER_STANCE_KEY, "unsure"); }
export function setUserStance(value) {
  const normalized = String(value || "unsure").trim();
  write(USER_STANCE_KEY, normalized || "unsure");
}

export function getUserStanceDetail() { return read(USER_STANCE_DETAIL_KEY, ""); }
export function setUserStanceDetail(value) {
  const normalized = String(value || "").trim();
  if (!normalized) remove(USER_STANCE_DETAIL_KEY);
  else write(USER_STANCE_DETAIL_KEY, normalized);
}

export function setLastResult(result) { write(STORAGE_KEYS.lastResult, result); pushHistory(result); }
export function getLastResult() { return read(STORAGE_KEYS.lastResult, null); }

export function getHistory() { return read(STORAGE_KEYS.history, []); }
export function clearHistory() { write(STORAGE_KEYS.history, []); }

function pushHistory(result) {
  const current = getHistory();
  current.unshift({ ...result, createdAt: new Date().toISOString() });
  write(STORAGE_KEYS.history, current.slice(0, 20));
}

export function saveActiveGame(state) {
  if (!state) return;
  write(ACTIVE_GAME_KEY, {
    ...state,
    mode: state.mode || "star-trial",
    savedAt: new Date().toISOString()
  });
}

export function getActiveGame() { return read(ACTIVE_GAME_KEY, null); }
export function clearActiveGame() { remove(ACTIVE_GAME_KEY); }
export function hasActiveGame() { return Boolean(getActiveGame()); }

export function clearCurrentSelection() {
  setSelectedPersona(null);
  setSelectedTopic(null);
}
