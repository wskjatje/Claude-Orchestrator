import { CHINESE_TO_AGENT_STEM } from "@/lib/agent-artifact-paths";

/**
 * 识别并行执行意图：用户要求多个 Agent 同时执行同一任务。
 *
 * 触发条件：
 * 1. 斜杠命令 /parallel
 * 2. 自然语言包含"同时""一起""并行"等关键词 + 多个 Agent 名称
 */
export type ParallelIntent =
  | { matched: false }
  | {
      matched: true;
      targetAgents: string[];
      rawTask: string;
      needSynthesis: boolean;
    };

/** Agent stem 与中文名称的双向映射（从统一入口反向生成） */
const STEM_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(CHINESE_TO_AGENT_STEM).map(([zh, stem]) => [stem, zh]),
);

/** 中英文名 → stem 的查找表（从统一入口导入） */
const STEM_MAP: Record<string, string> = CHINESE_TO_AGENT_STEM;

/** 自然语言中常见 Agent 提及 */
const AGENT_PATTERNS = Object.keys(STEM_MAP);

export function parseParallelIntent(raw: string): ParallelIntent {
  const t = raw.trim();
  if (!t) return { matched: false };

  // 斜杠命令
  if (t.startsWith("/parallel")) {
    const rest = t.slice(9).trim();
    if (!rest) return { matched: true, targetAgents: [], rawTask: "", needSynthesis: true };
    const agents = extractAgentNames(rest);
    const task = rest
      .replace(
        /^(?:让|用|叫|请)?\s*[\u4e00-\u9fa5a-zA-Z,\s、]+?\s*(?=做|审查|实现|开发|编写|执行|跑|测试|部署)/,
        "",
      )
      .replace(/^(?:做|审查|实现|开发|编写|执行|跑|测试|部署)\s*/, "")
      .trim();
    return {
      matched: true,
      targetAgents: agents,
      rawTask: task || rest,
      needSynthesis: true,
    };
  }

  if (t.length > 2000) return { matched: false };

  // 自然语言："让 FE 和 BE 一起审查代码"
  // "用前端、后端、QA 同时跑"
  // "前端和后端一起做登录页"
  const parallelHints = /(?:同时|一起|并行|都(?:来|跑)|并发)/;
  if (!parallelHints.test(t)) return { matched: false };

  // 必须是"让 XXX 和 YYY 做|审查|开发 ZZZ" 或 "XXX、YYY 同时 做|审查 ZZZ"
  const actionRe = /(?:做|审查|实现|开发|编写|执行|跑|测试|部署|分析|设计)\s*(.+?)$/;
  const namedRe = new RegExp(
    "(" + AGENT_PATTERNS.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")",
    "i",
  );
  // 必须至少提到 2 个 Agent 名
  const matches = [...t.matchAll(new RegExp(namedRe.source, "gi"))];
  const found = [...new Set(matches.map((m) => m[0]))];
  if (found.length < 2) return { matched: false };

  const agents = extractAgentNames(t);
  if (agents.length < 2) return { matched: false };

  const actionMatch = t.match(actionRe);
  return {
    matched: true,
    targetAgents: agents,
    rawTask: actionMatch ? actionMatch[1] : t,
    needSynthesis: true,
  };
}

/** 从文本提取 Agent stem 列表 */
export function extractAgentNames(text: string): string[] {
  const found = new Set<string>();
  const norm = text.replace(/[,，、/]/g, " ");
  const words = norm.split(/\s+/);
  for (const w of words) {
    const lw = w.toLowerCase();
    if (STEM_MAP[lw]) {
      found.add(STEM_MAP[lw]);
      continue;
    }
    if (STEM_MAP[w]) {
      found.add(STEM_MAP[w]);
      continue;
    }
    // 检查英文 stem 直接匹配
    if (/^[a-z][a-z-]+$/.test(lw) && STEM_ALIASES[lw]) {
      found.add(lw);
    }
  }
  // 扫描全文中文本
  for (const [zh, stem] of Object.entries(STEM_MAP)) {
    if (!found.has(stem) && text.includes(zh)) {
      found.add(stem);
    }
  }
  // 检查拼音缩写：FE, BE, QA, PM 等，排除已在 STEM_MAP 中的中文名
  const abbrs: Record<string, string> = {
    fe: "frontend-engineer",
    be: "backend-engineer",
    qa: "qa-engineer",
    qe: "qa-engineer",
    pm: "project-manager",
    devops: "devops-engineer",
    ui: "design-ui-designer",
    ux: "design-ux-architect",
  };
  for (const [abbr, stem] of Object.entries(abbrs)) {
    if (!found.has(stem)) {
      const re = new RegExp("\\b" + abbr + "\\b", "i");
      if (re.test(text)) found.add(stem);
    }
  }
  return [...found];
}
