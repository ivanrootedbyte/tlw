import { STORAGE_KEYS } from "./game-config.js";

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

export function isSafeMode() { return read(STORAGE_KEYS.safeMode, false); }
export function setSafeMode(v) { write(STORAGE_KEYS.safeMode, Boolean(v)); }

export function getSelectedPersona() { return read(STORAGE_KEYS.selectedPersona, null); }
export function setSelectedPersona(id) { write(STORAGE_KEYS.selectedPersona, id); }

export function getSelectedTopic() { return read(STORAGE_KEYS.selectedTopic, null); }
export function setSelectedTopic(id) { write(STORAGE_KEYS.selectedTopic, id); }

export function setLastResult(result) { write(STORAGE_KEYS.lastResult, result); pushHistory(result); }
export function getLastResult() { return read(STORAGE_KEYS.lastResult, null); }

export function getHistory() { return read(STORAGE_KEYS.history, []); }
export function clearHistory() { write(STORAGE_KEYS.history, []); }

function pushHistory(result) {
  const current = getHistory();
  current.unshift({ ...result, createdAt: new Date().toISOString() });
  write(STORAGE_KEYS.history, current.slice(0, 20));
}
