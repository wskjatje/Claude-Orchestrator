import { useMemo } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-yaml";
import { languageFromPath } from "@/lib/code-language";

type Props = {
  content: string;
  relPath?: string;
  language?: string;
};

function resolveGrammar(lang: string): Prism.Grammar {
  const grammars = Prism.languages as Record<string, Prism.Grammar | undefined>;
  return grammars[lang] ?? grammars.javascript ?? Prism.languages.plain;
}

export function WorkbenchCodeView({ content, relPath, language }: Props) {
  const lang = language ?? (relPath ? languageFromPath(relPath) : "plain");
  const lines = useMemo(() => content.split("\n"), [content]);

  const highlighted = useMemo(() => {
    try {
      return Prism.highlight(content, resolveGrammar(lang), lang);
    } catch {
      return Prism.util.encode(content) as string;
    }
  }, [content, lang]);

  return (
    <div className="workbench-code-panel">
      <div className="workbench-code-gutter" aria-hidden>
        {lines.map((_, i) => (
          <div key={i} className="workbench-code-gutter-line">
            {i + 1}
          </div>
        ))}
      </div>
      <pre className="workbench-code-block">
        <code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
