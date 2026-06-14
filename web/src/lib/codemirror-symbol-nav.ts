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
