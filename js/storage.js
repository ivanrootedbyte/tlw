import { STORAGE_KEYS } from "./game-config.js";

const ACTIVE_GAME_KEY = "tlw.activeGame";

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

export function getActiveGame() {
  return read(ACTIVE_GAME_KEY, null);
}

export function clearActiveGame() {
  remove(ACTIVE_GAME_KEY);
}

export function hasActiveGame() {
  return Boolean(getActiveGame());
}

export function clearCurrentSelection() {
  setSelectedPersona(null);
  setSelectedTopic(null);
}
