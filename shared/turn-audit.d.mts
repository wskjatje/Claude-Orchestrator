/** @see turn-audit.mjs */
export function formatTurnAuditMessage(fields: {
  writeParsed?: number;
  writeApplied?: number;
  writeFailed?: number;
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}): string;
