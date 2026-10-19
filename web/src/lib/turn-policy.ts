/**
 * 再导出 shared/turn-policy.mjs（单源）。勿在本文件写策略逻辑。
 * 与 server/turn-policy.mjs 保持同一真相源。
 */

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

export type EffectiveWriteMode = "ask" | "plan" | "agent";

export {
  shouldInjectProjectBootstrap,
  isPlanDocumentRequest,
  suggestPlanDocumentRelPath,
  isReadOnlyUserIntent,
  classifyTurnIntent,
  resolveTurnPolicy,
  effectiveWriteMode,
  cliPermissionModeFromWriteMode,
} from "../../../shared/turn-policy.mjs";
