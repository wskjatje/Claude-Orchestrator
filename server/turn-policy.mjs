/**
 * 再导出 shared/turn-policy.mjs（单源）。勿在本文件写策略逻辑。
 */
export {
  shouldInjectProjectBootstrap,
  isPlanDocumentRequest,
  suggestPlanDocumentRelPath,
  isReadOnlyUserIntent,
  classifyTurnIntent,
  isExplicitToolInvocation,
  resolveTurnPolicy,
  effectiveWriteMode,
  cliPermissionModeFromWriteMode,
} from '../shared/turn-policy.mjs'
