export function isSummarizeSlashCommand(line: string): boolean;
export function estimateMessagesChars(messages: unknown[]): number;
export function estimateMessagesTokens(messages: unknown[]): number;
export function buildStructuredCompactSummary(messages: unknown[]): {
  summary: string;
  keptFrom: number;
  archiveHint?: string;
} | null;
export function shouldAutoCompact(
  chars: number,
  opts?: { thresholdChars?: number; thresholdTokens?: number },
): boolean;
export function compactDialogueBody(
  dialogue: unknown[],
  opts?: {
    keepRecent?: number;
    force?: boolean;
    archivePath?: string;
    charCapRecent?: number;
  },
): {
  ok: boolean;
  messages: { role: string; content: string }[];
  summary: string;
  beforeChars: number;
  afterChars: number;
  dropped: unknown[];
} | null;