import { getUiPrefsCache, patchUiPrefsCache, saveUiPrefsToProjectDb } from "@/lib/ui-prefs";

export function shouldSkipCheckpointConfirm(): boolean {
  return getUiPrefsCache().skipCheckpointConfirm === true;
}

export function setSkipCheckpointConfirm(skip: boolean): void {
  patchUiPrefsCache({ skipCheckpointConfirm: skip });
  void saveUiPrefsToProjectDb({ skipCheckpointConfirm: skip });
}
