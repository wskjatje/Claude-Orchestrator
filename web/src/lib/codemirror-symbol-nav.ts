import type { Text } from "@codemirror/state";
import { stringLiteralAtPos, wordAtPos } from "@/lib/codemirror-word";
import {
  buildImportPathCandidates,
  findFilePathStringAt,
  findImportModuleForSymbol,
  resolveFilePathString,
  resolveImportTarget,
} from "@/lib/codemirror-import-resolve";

export type SymbolKind =
  | "variable"
  | "function"
  | "class"
  | "type"
  | "interface"
  | "enum"
  | "parameter"
  | "import"
  | "property"
  | "unknown";

export type SourceLocation = {
  from: number;
  to: number;
  line: number;
  preview: string;
};

export type SymbolInfo = {
  word: string;
  from: number;
  to: number;
  kind: SymbolKind;
  definition: SourceLocation | null;
};

export type CrossFileDefinition = {
  relPath: string;
  word: string;
  line?: number;
  preview?: string;
  from?: number;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linePreview(line: string): string {
  return line.trim().slice(0, 120);
}

function posToLine(text: string, from: number): number {
  return text.slice(0, from).split("\n").length;
}

function lineDeclPatterns(word: string): RegExp[] {
  const w = escapeRegExp(word);
  return [
    new RegExp(`\\b(?:export\\s+)?(?:async\\s+)?function\\s+\\*?\\s*${w}\\b`),
    new RegExp(`\\b(?:export\\s+)?class\\s+${w}\\b`),
    new RegExp(`\\b(?:export\\s+)?interface\\s+${w}\\b`),
    new RegExp(`\\b(?:export\\s+)?type\\s+${w}\\b`),
    new RegExp(`\\b(?:export\\s+)?enum\\s+${w}\\b`),
    new RegExp(`\\b(?:export\\s+)?(?:const|let|var)\\s+${w}\\b`),
    new RegExp(`\\b(?:export\\s+)?(?:const|let|var)\\s+${w}\\s*=`),
    new RegExp(`\\bimport\\s+(?:type\\s+)?${w}\\s+from\\b`),
    new RegExp(`\\bimport\\s+\\*\\s+as\\s+${w}\\s+from\\b`),
    new RegExp(`\\bimport\\s+(?:type\\s+)?\\{[^}]*\\b${w}\\b[^}]*\\}\\s+from\\b`),
    new RegExp(`\\b${w}\\s*(?::|\\()`),
  ];
}

function inferKind(line: string, word: string): SymbolKind {
  const slice = line.slice(0, Math.max(0, line.indexOf(word)));
  if (/\bfunction\s+\*?\s*$/.test(slice)) return "function";
  if (/\bclass\s+$/.test(slice)) return "class";
  if (/\binterface\s+$/.test(slice)) return "interface";
  if (/\btype\s+$/.test(slice)) return "type";
  if (/\benum\s+$/.test(slice)) return "enum";
  if (/\bimport\b/.test(slice)) return "import";
  if (/[\(,]\s*$/.test(slice)) return "parameter";
  if (/\b(?:const|let|var)\s+$/.test(slice)) return "variable";
  return "unknown";
}

/** 从光标前向上逐行查找声明，避免全文件正则扫描 */
export function findDeclarationInText(
  text: string,
  word: string,
  beforePos = text.length,
): SourceLocation | null {
  const patterns = lineDeclPatterns(word);
  let lineEnd = beforePos;
  let guard = 0;

  while (lineEnd > 0 && guard++ < 50_000) {
    const lineStart = text.lastIndexOf("\n", lineEnd - 1) + 1;
    const line = text.slice(lineStart, lineEnd);

    for (const re of patterns) {
      const m = re.exec(line);
      if (!m) continue;
      const wordIdx = m[0].indexOf(word);
      if (wordIdx < 0) continue;
      const from = lineStart + m.index + wordIdx;
      return {
        from,
        to: from + word.length,
        line: posToLine(text, from),
        preview: linePreview(line),
      };
    }

    if (lineStart === 0) break;
    lineEnd = lineStart;
  }

  return null;
}

function referencePattern(word: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_$])${escapeRegExp(word)}(?![\\p{L}\\p{N}_$])`, "gu");
}

/** 仅在「查找所有引用」时调用，不做悬停/菜单预扫描 */
export function findReferencesInText(text: string, word: string): SourceLocation[] {
  const re = referencePattern(word);
  const out: SourceLocation[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const from = m.index;
    const lineStart = text.lastIndexOf("\n", from - 1) + 1;
    const lineEnd = text.indexOf("\n", from);
    out.push({
      from,
      to: from + word.length,
      line: posToLine(text, from),
      preview: linePreview(text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd)),
    });
  }
  return out;
}

export function analyzeSymbolAt(doc: Text, pos: number): SymbolInfo | null {
  const hit = wordAtPos(doc, pos);
  if (!hit) return null;
  const text = doc.toString();
  const lineStart = text.lastIndexOf("\n", hit.from - 1) + 1;
  const lineEnd = text.indexOf("\n", hit.from);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  const definition = findDeclarationInText(text, hit.word, hit.from + 1);
  return {
    word: hit.word,
    from: hit.from,
    to: hit.to,
    kind: inferKind(line, hit.word),
    definition,
  };
}

export function findDefinitionInDocument(doc: Text, pos: number): SourceLocation | null {
  const hit = wordAtPos(doc, pos);
  if (!hit) return null;
  const text = doc.toString();
  const local = findDeclarationInText(text, hit.word, hit.from + 1);
  if (local) return local;
  const atDecl = findDeclarationInText(text, hit.word, text.length);
  if (atDecl && Math.abs(atDecl.from - hit.from) <= 2) return atDecl;
  return null;
}

export async function findDefinitionLocation(
  doc: Text,
  pos: number,
  relPath: string,
  readFile?: (relPath: string) => Promise<string | null>,
): Promise<{ local: SourceLocation | null; cross: CrossFileDefinition | null }> {
  const local = findDefinitionInDocument(doc, pos);
  if (local) return { local, cross: null };

  const text = doc.toString();

  const strLit = stringLiteralAtPos(doc, pos);
  if (strLit) {
    const pathStr = findFilePathStringAt(text, strLit.from, strLit.to);
    if (pathStr) {
      const paths = resolveFilePathString(pathStr, relPath);
      if (readFile) {
        for (const p of paths) {
          const remote = await readFile(p);
          if (remote !== null) {
            return { local: null, cross: { relPath: p, word: "", from: 0 } };
          }
        }
      } else if (paths[0]) {
        return { local: null, cross: { relPath: paths[0], word: "", from: 0 } };
      }
    }
  }

  const hit = wordAtPos(doc, pos);
  if (!hit) return { local: null, cross: null };

  const spec = findImportModuleForSymbol(text, hit.word);
  if (!spec) return { local: null, cross: null };

  const resolved = await resolveImportTarget(spec, relPath, readFile);
  if (!resolved) return { local: null, cross: null };

  const remoteDecl = resolved.text ? findDeclarationInText(resolved.text, hit.word) : null;

  return {
    local: null,
    cross: {
      relPath: resolved.relPath,
      word: hit.word,
      line: remoteDecl?.line,
      preview: remoteDecl?.preview,
      from: remoteDecl?.from,
    },
  };
}

export function kindLabel(kind: SymbolKind): string {
  switch (kind) {
    case "function":
      return "function";
    case "class":
      return "class";
    case "interface":
      return "interface";
    case "type":
      return "type";
    case "enum":
      return "enum";
    case "variable":
      return "const";
    case "parameter":
      return "parameter";
    case "import":
      return "import";
    case "property":
      return "property";
    default:
      return "symbol";
  }
}

export type OutlineSymbol = {
  name: string;
  kind: SymbolKind;
  line: number;
  preview: string;
  /** DocumentSymbol 层级（0=顶层）；正则大纲无此字段 */
  depth?: number;
};

/** 当前文件大纲：扫描顶层/导出声明（Outline 常用条目） */
const OUTLINE_LINE_RE =
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s+\*?\s*|class\s+|interface\s+|type\s+|enum\s+|const\s+|let\s+|var\s+)([A-Za-z_$][\w$]*)/;

const OUTLINE_METHOD_RE =
  /^\s+(?:(?:public|private|protected|static|async|readonly|get|set)\s+)*([A-Za-z_$][\w$]*)\s*\(/;

export function listFileOutline(text: string, maxItems = 400): OutlineSymbol[] {
  if (!text) return [];
  const lines = text.split("\n");
  const out: OutlineSymbol[] = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length && out.length < maxItems; i++) {
    let line = lines[i] ?? "";
    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end < 0) continue;
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    const blockStart = line.indexOf("/*");
    if (blockStart >= 0) {
      const blockEnd = line.indexOf("*/", blockStart + 2);
      if (blockEnd < 0) {
        inBlockComment = true;
        line = line.slice(0, blockStart);
      } else {
        line = `${line.slice(0, blockStart)}${line.slice(blockEnd + 2)}`;
      }
    }
    const trimmed = line.replace(/\/\/.*$/, "").trimEnd();
    if (!trimmed.trim()) continue;

    let m = OUTLINE_LINE_RE.exec(trimmed.trim());
    let name = m?.[1];
    let kind: SymbolKind = "unknown";
    if (m) {
      const head = trimmed.trim();
      if (/\bfunction\b/.test(head)) kind = "function";
      else if (/\bclass\b/.test(head)) kind = "class";
      else if (/\binterface\b/.test(head)) kind = "interface";
      else if (/\btype\b/.test(head)) kind = "type";
      else if (/\benum\b/.test(head)) kind = "enum";
      else kind = "variable";
    } else {
      // 类体内方法：缩进且非控制流关键字
      if (/^\s{2,}/.test(line) && !/^\s*(if|for|while|switch|catch|else|return)\b/.test(trimmed)) {
        m = OUTLINE_METHOD_RE.exec(line);
        name = m?.[1];
        if (
          name &&
          !/^(if|for|while|switch|catch|else|return|function|class|const|let|var)$/.test(name)
        ) {
          kind = "property";
        } else {
          name = undefined;
        }
      }
    }
    if (!name) continue;
    out.push({
      name,
      kind,
      line: i + 1,
      preview: linePreview(trimmed),
    });
  }
  return out;
}
