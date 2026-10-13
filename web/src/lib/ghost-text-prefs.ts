import {
  getUiPrefsCache,
  getUiPrefsEpoch,
  patchUiPrefsCache,
  saveUiPrefsToProjectDb,
  subscribeUiPrefs,
  type UiPrefs,
} from "@/lib/ui-prefs";

export function isGhostTextEnabled(): boolean {
  return getUiPrefsCache().ghostTextEnabled !== false;
}

export function setGhostTextEnabled(enabled: boolean) {
  patchUiPrefsCache({ ghostTextEnabled: enabled });
  void saveUiPrefsToProjectDb({ ghostTextEnabled: enabled });
}

export function getCompletionMode(): UiPrefs["completionMode"] {
  return getUiPrefsCache().completionMode;
}

export function setCompletionMode(mode: UiPrefs["completionMode"]) {
  patchUiPrefsCache({ completionMode: mode });
  void saveUiPrefsToProjectDb({ completionMode: mode });
}

export { getUiPrefsEpoch, subscribeUiPrefs };
