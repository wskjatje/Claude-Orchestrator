/**
 * 第三轮 Agent MD 精简脚本
 *
 * 目标：移除教学型/教科书式内容，保留关键行为约束。
 *
 * 原则：
 * - 模型已具备领域知识，不需要在 agent 定义中重写
 * - Agent 文件只应定义：做什么、不做什么、输出格式
 * - 保留：Critical Rules / 约束 / Non-Negotiable / Verdicts / Output Format / Baseline 等行为约束
 * - 移除：Identity / Communication Style / Success Metrics / Learning / Pattern Recognition 等废话
 * - 精简：职责/Core Mission → 2 行摘要；Workflow → 4 行
 */

const fs = require("fs");
const path = require("path");

const AGENTS_DIR = path.join(__dirname, "..", "docs", "agents");

// ========== 分类配置 ==========

/** 完全保留的 H2 区段（行为约束 / 输出格式 / 决策框架） */
const KEEP_FULL_SECTIONS = [
  "critical rules",
  "critical rules you must follow",
  "non-negotiable rules",
  "约束",
  "verdicts",
  "required output format",
  "reliability baseline",
  "logging baseline",
  "testing baseline",
  "integration governance",
  "re-audit triggers",
  "launch command",
  "compliance review tools",
];

/** 完全移除的 H2 区段（废话/教学/模型已具备的知识） */
const REMOVE_SECTIONS = [
  "identity",
  "identity & memory",
  "your identity & memory",
  "personality",
  "personality highlights",
  "communication style",
  "your communication style",
  "success metrics",
  "your success metrics",
  "learning",
  "accumulation",
  "learning & accumulation",
  "pattern recognition",
  "advanced capabilities",
  "memory",
  "primary domains",
  "your technical deliverables",
  "your core mission", // 如果已包含在主职责中则移除（部分文件有冗余的core mission）
];

// ========== 工具函数 ==========

/** 检查 H2 标题是否匹配某类配置 */
function h2Matches(text, matchers) {
  const lower = text.replace(/^##\s*:?[^:]*:\s*/, "## ").toLowerCase(); // 去掉 emoji 前缀
  return matchers.some((m) => lower.includes(m));
}

/** 从 section 内容中提取非 ### 的非空行（最多 n 行） */
function takeLines(sectionBody, n) {
  return sectionBody
    .split("\n")
    .filter((l) => !l.trim().startsWith("###") && l.trim() !== "")
    .slice(0, n)
    .join("\n");
}

// ========== 核心处理 ==========

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");

  // 1. 提取 frontmatter（如果有）
  let i = 0;
  let frontmatter = "";
  if (lines[0] && lines[0].trim() === "---") {
    frontmatter += "---\n";
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") {
      frontmatter += lines[i] + "\n";
      i++;
    }
    if (i < lines.length) {
      frontmatter += "---";
      i++;
    }
  }

  // 跳过前导空行
  while (i < lines.length && lines[i].trim() === "") i++;

  // 2. 提取 H1 标题（如果有）
  let title = "";
  if (i < lines.length && lines[i].startsWith("# ")) {
    title = lines[i];
    i++;
  }

  // 3. 剩余内容按 H2 分段
  const remaining = lines.slice(i).join("\n");
  // 用正则按 H2 分割（保留分隔标记）
  const sections = remaining.split(/\n(?=## )/);

  const resultParts = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const firstLine = trimmed.split("\n")[0];
    const h2Text = firstLine.replace(/^##\s*:?[^:]*:\s*/, "## ").toLowerCase();

    // 完全保留（行为约束）
    if (h2Matches(h2Text, KEEP_FULL_SECTIONS)) {
      resultParts.push(trimmed);
      continue;
    }

    // 完全移除（废话/教学）
    if (h2Matches(h2Text, REMOVE_SECTIONS)) {
      continue;
    }

    // ## 职责 / ## Core Mission → 保留标题 + 2 行摘要
    if (
      h2Text.includes("职责") ||
      h2Text.includes("core mission") ||
      h2Text.includes("dart") ||
      h2Text.includes("mission")
    ) {
      const sectionLines = trimmed.split("\n");
      const header = sectionLines[0];
      const bodyContent = takeLines(
        sectionLines.slice(1).join("\n"),
        2
      );
      resultParts.push(header + (bodyContent ? "\n" + bodyContent : ""));
      continue;
    }

    // ## Workflow → 保留标题 + 4 行
    if (h2Text.includes("workflow")) {
      const sectionLines = trimmed.split("\n");
      const header = sectionLines[0];
      const bodyContent = takeLines(
        sectionLines.slice(1).join("\n"),
        4
      );
      resultParts.push(header + (bodyContent ? "\n" + bodyContent : ""));
      continue;
    }

    // 其他 H2 区段：只保留标题
    resultParts.push(trimmed.split("\n")[0]);
  }

  // 4. 组装结果
  let result = frontmatter;
  if (title) result += "\n" + title;
  if (resultParts.length > 0) result += "\n\n" + resultParts.join("\n\n");

  // 清理多余空行
  result = result.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

  fs.writeFileSync(filePath, result);
}

// ========== 主逻辑 ==========

const files = fs
  .readdirSync(AGENTS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

let totalBefore = 0;
let totalAfter = 0;
let processedCount = 0;
let skippedCount = 0;

for (const file of files) {
  const filePath = path.join(AGENTS_DIR, file);
  const beforeLines = fs.readFileSync(filePath, "utf-8").split("\n").length;
  totalBefore += beforeLines;

  if (beforeLines > 40) {
    processFile(filePath);
    processedCount++;
  } else {
    skippedCount++;
  }

  const afterLines = fs.readFileSync(filePath, "utf-8").split("\n").length;
  totalAfter += afterLines;
}

console.log("======= Agent MD 第三轮精简报告 =======");
console.log(`处理文件: ${processedCount} 个 (>40 行)`);
console.log(`跳过文件: ${skippedCount} 个 (≤40 行)`);
console.log(`精简前总行数: ${totalBefore}`);
console.log(`精简后总行数: ${totalAfter}`);
console.log(`减少行数: ${totalBefore - totalAfter}`);
console.log(`减少比例: ${((totalBefore - totalAfter) / totalBefore * 100).toFixed(1)}%`);
