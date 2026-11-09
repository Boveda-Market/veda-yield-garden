export const TRIAL_ENTRY_KEY = "boveda-trial-entry";
export function allowTrialEntry() { try { sessionStorage.setItem(TRIAL_ENTRY_KEY, "1"); } catch { /* ignore */ } }
export function hasTrialEntry() { try { return sessionStorage.getItem(TRIAL_ENTRY_KEY) === "1"; } catch { return false; } }
