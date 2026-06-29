import { createSeedState } from "../data/seed";
import type { CRMState } from "../types";

const STORAGE_KEY = "estateflow-crm-state-v1";

export function loadState(): CRMState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    return JSON.parse(raw) as CRMState;
  } catch {
    const seed = createSeedState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveState(state: CRMState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
