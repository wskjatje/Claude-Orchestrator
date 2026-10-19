/**
 * 运行时默认值单源（server / web / desktop 共用）。
 * UI 与 handlers 应优先读 settings；此处仅作 fallback。
 */

export const DEFAULT_OLLAMA_BASE = 'http://127.0.0.1:11434'

/** 未配置时的嵌入模型（code-index）；settings.codeIndexEmbedModel 优先 */
export const DEFAULT_EMBED_MODEL = 'nomic-embed-text'
