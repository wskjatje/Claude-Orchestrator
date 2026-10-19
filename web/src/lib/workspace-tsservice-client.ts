import { getDesktop } from "@/lib/desktop-api";

export type TsDefinitionHit = {
  relPath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  name?: string | null;
};

export type TsHoverHit = {
  display: string;
  documentation?: string | null;
  kind?: string | null;
  fromLine: number;
  fromCol: number;
  toLine: number;
  toCol: number;
};

export type TsCompletionItem = {
  label: string;
  kind: string;
  detail?: string | null;
  insertText?: string;
  sortText?: string;
};

export type TsReferenceHit = {
  relPath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
};

export type TsRenameLocation = TsReferenceHit & {
  prefixText?: string | null;
  suffixText?: string | null;
};

function isTsLike(relPath: string) {
  return /\.(tsx?|jsx?|mjs|cjs)$/i.test(relPath);
}

/** Python / Go / Rust → 外部 LSP */
function isExternalLspLike(relPath: string) {
  return /\.(py|go|rs)$/i.test(relPath);
}

/** 1-based line/col from CodeMirror 偏移 */
export function offsetToLineCol(
  doc: { lineAt: (n: number) => { number: number; from: number } },
  pos: number,
) {
  const line = doc.lineAt(pos);
  return { line: line.number, column: pos - line.from + 1 };
}

type PosOpts = {
  relPath: string;
  line: number;
  column: number;
  content?: string;
};

async function callExternalLsp<T>(
  kind: "definition" | "hover" | "completions" | "references" | "rename",
  opts: PosOpts,
): Promise<T | null> {
  const api = getDesktop();
  if (!api) return null;
  try {
    if (kind === "definition") {
      const fn = api.workspaceExternalLspDefinition || api.workspacePythonDefinition;
      if (!fn) return null;
      const r = await fn(opts);
      return (r?.ok ? r : null) as T | null;
    }
    if (kind === "hover") {
      const fn = api.workspaceExternalLspHover || api.workspacePythonHover;
      if (!fn) return null;
      const r = await fn(opts);
      return (r?.ok ? r : null) as T | null;
    }
    if (kind === "completions") {
      const fn = api.workspaceExternalLspCompletions || api.workspacePythonCompletions;
      if (!fn) return null;
      const r = await fn(opts);
      return (r?.ok ? r : null) as T | null;
    }
    if (kind === "references") {
      const fn = api.workspaceExternalLspReferences || api.workspacePythonReferences;
      if (!fn) return null;
      const r = await fn(opts);
      return (r?.ok ? r : null) as T | null;
    }
    if (kind === "rename") {
      const fn = api.workspaceExternalLspRename || api.workspacePythonRename;
      if (!fn) return null;
      const r = await fn(opts);
      return (r?.ok ? r : null) as T | null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchTsDefinition(opts: PosOpts): Promise<TsDefinitionHit | null> {
  if (isExternalLspLike(opts.relPath)) {
    const r = await callExternalLsp<{ ok: boolean; definition?: TsDefinitionHit | null }>(
      "definition",
      opts,
    );
    return r?.definition ?? null;
  }
  if (!isTsLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceTsDefinition) return null;
  try {
    const r = await api.workspaceTsDefinition(opts);
    if (!r?.ok || !r.definition) return null;
    return r.definition;
  } catch {
    return null;
  }
}

export async function fetchTsTypeDefinition(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<TsDefinitionHit | null> {
  if (!isTsLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceTsTypeDefinition) return null;
  try {
    const r = await api.workspaceTsTypeDefinition(opts);
    if (!r?.ok || !r.definition) return null;
    return r.definition;
  } catch {
    return null;
  }
}

export async function fetchTsImplementation(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<TsDefinitionHit | null> {
  if (!isTsLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceTsImplementation) return null;
  try {
    const r = await api.workspaceTsImplementation(opts);
    if (!r?.ok || !r.definition) return null;
    return r.definition;
  } catch {
    return null;
  }
}

/** 全部实现位置（Peek）；无结果返回 []，不静默编造 */
export async function fetchTsImplementations(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<TsDefinitionHit[]> {
  if (!isTsLike(opts.relPath)) return [];
  const api = getDesktop();
  if (!api?.workspaceTsImplementation) return [];
  try {
    const r = await api.workspaceTsImplementation(opts);
    if (!r?.ok) return [];
    if (Array.isArray(r.definitions) && r.definitions.length) return r.definitions;
    if (r.definition) return [r.definition];
    return [];
  } catch {
    return [];
  }
}

export async function fetchTsHover(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<TsHoverHit | null> {
  if (isExternalLspLike(opts.relPath)) {
    const r = await callExternalLsp<{ ok: boolean; hover?: TsHoverHit | null }>("hover", opts);
    return r?.hover ?? null;
  }
  if (!isTsLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceTsHover) return null;
  try {
    const r = await api.workspaceTsHover(opts);
    if (!r?.ok || !r.hover) return null;
    return r.hover;
  } catch {
    return null;
  }
}

export async function fetchTsCompletions(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<{
  completions: TsCompletionItem[];
  fromLine: number;
  fromCol: number;
} | null> {
  if (isExternalLspLike(opts.relPath)) {
    const r = await callExternalLsp<{
      ok: boolean;
      completions?: TsCompletionItem[];
      fromLine?: number;
      fromCol?: number;
    }>("completions", opts);
    if (!r?.completions?.length) return null;
    return {
      completions: r.completions,
      fromLine: r.fromLine ?? opts.line,
      fromCol: r.fromCol ?? opts.column,
    };
  }
  if (!isTsLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceTsCompletions) return null;
  try {
    const r = await api.workspaceTsCompletions(opts);
    if (!r?.ok || !r.completions?.length) return null;
    return {
      completions: r.completions,
      fromLine: r.fromLine ?? opts.line,
      fromCol: r.fromCol ?? opts.column,
    };
  } catch {
    return null;
  }
}

export type TsCallHierarchyItem = {
  name: string;
  kind?: string;
  containerName?: string | null;
  relPath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  callCount?: number;
};

export async function fetchTsCallHierarchy(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<{
  item: TsCallHierarchyItem | null;
  incoming: TsCallHierarchyItem[];
  outgoing: TsCallHierarchyItem[];
  error?: string;
} | null> {
  if (isExternalLspLike(opts.relPath)) {
    const api = getDesktop();
    if (!api?.workspaceExternalLspCallHierarchy) {
      return {
        item: null,
        incoming: [],
        outgoing: [],
        error: "外部 LSP Call Hierarchy 未接线",
      };
    }
    try {
      const r = await api.workspaceExternalLspCallHierarchy(opts);
      if (!r?.ok) {
        return {
          item: null,
          incoming: [],
          outgoing: [],
          error: r?.error || "Call Hierarchy 失败（请确认已安装语言服务器）",
        };
      }
      return {
        item: r.item ?? null,
        incoming: Array.isArray(r.incoming) ? r.incoming : [],
        outgoing: Array.isArray(r.outgoing) ? r.outgoing : [],
      };
    } catch (e) {
      return {
        item: null,
        incoming: [],
        outgoing: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
  if (!isTsLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceTsCallHierarchy) return null;
  try {
    const r = await api.workspaceTsCallHierarchy(opts);
    if (!r?.ok) {
      return {
        item: null,
        incoming: [],
        outgoing: [],
        error: r?.error || "Call Hierarchy 失败",
      };
    }
    return {
      item: r.item ?? null,
      incoming: Array.isArray(r.incoming) ? r.incoming : [],
      outgoing: Array.isArray(r.outgoing) ? r.outgoing : [],
    };
  } catch (e) {
    return {
      item: null,
      incoming: [],
      outgoing: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Python/Go/Rust DocumentSymbol；无 LSP 返回 null（调用方回退当前文件正则） */
export async function fetchExternalLspDocumentSymbols(opts: {
  relPath: string;
  content?: string;
}): Promise<{ name: string; kind: string; line: number; column?: number; depth?: number }[] | null> {
  if (!isExternalLspLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceExternalLspDocumentSymbols) return null;
  try {
    const r = await api.workspaceExternalLspDocumentSymbols(opts);
    if (!r?.ok || !Array.isArray(r.symbols)) return null;
    return r.symbols;
  } catch {
    return null;
  }
}

export async function fetchTsReferences(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<TsReferenceHit[]> {
  if (isExternalLspLike(opts.relPath)) {
    const r = await callExternalLsp<{ ok: boolean; references?: TsReferenceHit[] }>(
      "references",
      opts,
    );
    return r?.references || [];
  }
  if (!isTsLike(opts.relPath)) return [];
  const api = getDesktop();
  if (!api?.workspaceTsReferences) return [];
  try {
    const r = await api.workspaceTsReferences(opts);
    if (!r?.ok || !Array.isArray(r.references)) return [];
    return r.references;
  } catch {
    return [];
  }
}

export async function fetchTsRename(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<{
  canRename: boolean;
  displayName: string | null;
  locations: TsReferenceHit[];
  error?: string | null;
} | null> {
  if (isExternalLspLike(opts.relPath)) {
    const r = await callExternalLsp<{
      ok: boolean;
      canRename?: boolean;
      displayName?: string | null;
      locations?: TsReferenceHit[];
      error?: string | null;
    }>("rename", opts);
    if (!r) return null;
    return {
      canRename: Boolean(r.canRename),
      displayName: r.displayName ?? null,
      locations: r.locations || [],
      error: r.error,
    };
  }
  if (!isTsLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceTsRename) return null;
  try {
    const r = await api.workspaceTsRename(opts);
    if (!r?.ok) return null;
    return {
      canRename: Boolean(r.canRename),
      displayName: r.displayName ?? null,
      locations: r.locations || [],
      error: r.error,
    };
  } catch {
    return null;
  }
}

export async function fetchTsSignatureHelp(opts: {
  relPath: string;
  line: number;
  column: number;
  content?: string;
}): Promise<{
  activeSignature: number;
  activeParameter: number;
  items: { label: string; documentation?: string | null }[];
} | null> {
  if (!isTsLike(opts.relPath)) return null;
  const api = getDesktop();
  if (!api?.workspaceTsSignatureHelp) return null;
  try {
    const r = await api.workspaceTsSignatureHelp(opts);
    if (!r?.ok || !r.signatureHelp) return null;
    return r.signatureHelp;
  } catch {
    return null;
  }
}
