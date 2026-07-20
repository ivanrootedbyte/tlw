import { isSafeMode } from "./storage.js";

export function resolvePersonaName(persona) {
  return isSafeMode() ? (persona.publicName || persona.safeName) : persona.displayName;
}
