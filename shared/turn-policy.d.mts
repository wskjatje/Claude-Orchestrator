/** @see turn-policy.mjs */
export type InteractionMode = "ask" | "plan" | "agent";
export type TurnIntent = "readonly" | "write" | "chat";
export type TurnPolicy = {
  interactionMode: InteractionMode;
  intent: TurnIntent;
  allowWrites: boolean;
  allowTools: boolean;
  forceDirectChat: boolean;
  autoApplyWrites: boolean;
  contextLevel: "none" | "slim-product" | "agent-full";
  systemConstraint: string;
};
export function shouldInjectProjectBootstrap(displayLine: string): boolean;
export function isPlanDocumentRequest(displayLine: string): boolean;
export function suggestPlanDocumentRelPath(displayLine: string): string;
export function isReadOnlyUserIntent(displayLine: string): boolean;
export function classifyTurnIntent(displayLine: string): TurnIntent;
export function isExplicitToolInvocation(displayLine: string): boolean;
export function resolveTurnPolicy(input: {
  displayLine: string;
  interactionMode: InteractionMode;
  isGeneralTurn?: boolean;
  isNamedAgent?: boolean;
}): TurnPolicy;
export function effectiveWriteMode(
  policy:
    | {
        allowWrites?: boolean;
        autoApplyWrites?: boolean;
        interactionMode?: string;
      }
    | null
    | undefined,
): "ask" | "plan" | "agent";
export function cliPermissionModeFromWriteMode(
  writeMode: "ask" | "plan" | "agent",
): "acceptEdits" | "plan";
