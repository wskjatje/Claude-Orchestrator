import type { Extension } from "@codemirror/state";
import type { Language } from "@codemirror/language";
import { StreamLanguage } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { yaml } from "@codemirror/lang-yaml";
import { python } from "@codemirror/lang-python";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { standardSQL } from "@codemirror/legacy-modes/mode/sql";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { autocompletion } from "@codemirror/autocomplete";
import { languageFromPath, inferLanguageFromContent } from "@/lib/code-language";

function markdownFenceLanguage(info: string): Language | null {
  const name = info.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  switch (name) {
    case "javascript":
    case "js":
      return javascript().language;
    case "typescript":
    case "ts":
      return javascript({ typescript: true }).language;
    case "tsx":
      return javascript({ typescript: true, jsx: true }).language;
    case "jsx":
      return javascript({ jsx: true }).language;
    case "json":
      return json().language;
    case "python":
    case "py":
      return python().language;
    case "bash":
    case "sh":
    case "shell":
      return StreamLanguage.define(shell).language;
    case "yaml":
    case "yml":
      return yaml().language;
    case "html":
      return html().language;
    case "css":
      return css().language;
    case "sql":
      return StreamLanguage.define(standardSQL).language;
    case "toml":
      return StreamLanguage.define(toml).language;
    default:
      return null;
  }
}

function languageExtension(lang: string, relPath: string): Extension[] {
  switch (lang) {
    case "javascript":
      return [javascript()];
    case "typescript":
      return [javascript({ typescript: true, jsx: relPath.endsWith("x") })];
    case "json":
      return [json()];
    case "markdown":
      return [markdown({ codeLanguages: markdownFenceLanguage })];
    case "css":
      return [css()];
    case "markup":
      return [html()];
    case "yaml":
      return [yaml()];
    case "python":
      return [python()];
    case "bash":
      return [StreamLanguage.define(shell)];
    case "sql":
      return [StreamLanguage.define(standardSQL)];
    case "toml":
      return [StreamLanguage.define(toml)];
    default:
      return [];
  }
}

export function codemirrorExtensionsForPath(
  relPath: string,
  _readOnly?: boolean,
  contentSample?: string,
): Extension[] {
  const lang =
    languageFromPath(relPath) === "plain" && contentSample
      ? inferLanguageFromContent(contentSample, relPath)
      : languageFromPath(relPath);

  return [autocompletion(), ...languageExtension(lang, relPath)];
}
