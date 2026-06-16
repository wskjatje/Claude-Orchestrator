import { M as useRouter, r as reactExports, U as jsxRuntimeExports, P as getDefaultExportFromCjs } from "./worker-entry-Co3Cn06u.js";
import { au as defaultArtifactPathForAgent, av as normalizeAgentStem$1, aw as agentRequiresManualConfirmWrite, ax as agentAutoWritesToProject, t as toast, u as useDesktopReady, ay as WORKSPACE_TREE_OFFLINE, g as getDesktop, az as PROJECT_PREVIEW_UNSUPPORTED, aA as PROJECT_PREVIEW_API_MISSING, aB as PROJECT_PREVIEW_STOP_UNSUPPORTED, e as cn, b as useHasDesktop, aC as WORKBENCH_SIDEPANEL_OFFLINE, aD as getUiPrefsCache, aE as patchUiPrefsCache, z as saveUiPrefsToProjectDb, B as BRIDGE_OFFLINE_TOAST, aF as useTheme, aG as TERMINAL_OFFLINE, aH as appendOutputRaw, aI as subscribeOutputLog, aJ as getOutputSnapshot, aK as clearOutput, aL as OUTPUT_CHANNELS, aM as scheduleSaveUiPrefs, aN as appendOutput, a5 as MSG_API_NOT_READY, ad as CHAIN_TEMPLATES, ac as syncOfficialGenericChains, aO as relatedArtifactPathsForAgent, a3 as useCallbackRef, Z as Primitive, $ as composeEventHandlers, a1 as createContextScope, aP as onBridgeEvent, a0 as Presence, Y as useControllableState, a2 as useComposedRefs, aQ as useSize, aR as composeRefs, _ as useId, aS as Portal$2, aT as createContext2, aU as DismissableLayer, K as useNavigate, aV as Route, aa as useOrchestrationExecution, aW as useChatSessionRevision, aX as BROWSER_MODE_CHAT_MESSAGE, E as MSG_BRIDGE_OFFLINE, aY as EMPTY_CHAT_SEARCH, aZ as COMPOSER_PLACEHOLDER, a_ as reactDomExports, a$ as buildAgentRoutedInstruction, L as LOCAL_ONLY_HINT } from "./router-CCRumuR1.js";
import { c as createLucideIcon, F as FolderTree, g as PanelLeftClose, S as Search, d as FileText, C as Clock, A as AppShell, M as MessageCircle } from "./app-shell-DfKeMRG5.js";
import { n as isBinaryFileResult, o as normalizeFileContentForEditor, s as requestWorkbenchLint, t as setPendingLineGoto, f as fileIconFor, a as fileIconClass, v as editorLanguageLabel, w as isMarkdownPath, C as CodemirrorWorkbench, G as Globe, B as BinaryFileViewer, i as isHiddenExplorerName, j as EXPLORER_TREE_BASE_PADDING_PX, k as EXPLORER_TREE_INDENT_PX, E as ExplorerTreeIcon, x as explorerGitStatusClass, y as explorerGitLabelClass, z as gitStatusTone, D as DropdownMenu, e as DropdownMenuTrigger, g as DropdownMenuContent, h as DropdownMenuItem, A as DropdownMenuSeparator, F as useWorkbenchProblems, H as DropdownMenuSub, J as DropdownMenuSubTrigger, K as DropdownMenuSubContent, L as on, p as ResizablePanelGroup, q as ResizablePanel, r as ResizableHandle, M as ln, W as WorkbenchProblemsProvider, N as Root3, O as Anchor2, P as createMenuScope, Q as Portal$1, S as Content2$2, T as Item2$1, U as Separator, V as Group, X as Label, Y as CheckboxItem, Z as RadioGroup, _ as RadioItem, $ as ItemIndicator, a0 as Arrow2, a1 as SubTrigger, a2 as SubContent, a3 as buttonVariants, d as Button } from "./format-file-content-BGbZZh23.js";
import { o as openExternalUrl } from "./open-external-3Ph8Chta.js";
import { C as ChevronRight } from "./chevron-right-rhsxL97Q.js";
import { S as Save } from "./save-s2gnsGqd.js";
import { C as Check } from "./check-CBqelC41.js";
import { R as RefreshCw } from "./refresh-cw-QdXDuK01.js";
import { X } from "./x-CgW_RKjX.js";
import { P as Plus } from "./plus-CUtIIuQz.js";
import { E as ExternalLink } from "./external-link-BWfpy5Z8.js";
import { C as ChevronDown } from "./chevron-down-oOVv_n18.js";
import { G as GitBranch } from "./git-branch-ZxeBwIad.js";
import { T as Trash2 } from "./trash-2-BpzVwa3Q.js";
import { C as ChevronUp } from "./chevron-up-CBy91qLS.js";
import { a as CircleAlert, C as CircleCheck } from "./circle-check-jaO9U0RF.js";
import { T as TriangleAlert } from "./triangle-alert-YhT9MF73.js";
import { i as isAutoModelSelection, A as AUTO_MODEL_ID, l as loadChatModelPools, a as resolveModelForExecution, n as normalizeChatModelSelection, c as chatSettingsPreservePayload, p as parseAgentModelFromFrontmatter } from "./model-catalog-BUhoFevp.js";
import { i as isAutoAgentBasename, a as agentStemFromBasename, W as Wrench, b as buildClaudeCodePrompt } from "./claude-prompt-DPcApFU5.js";
import { a as agentDisplayNameForStem } from "./use-claude-agent-list-BLoLp5zy.js";
import { r as resolveAgentDisplayName, a as agentMatchesDisplayQuery } from "./agent-display-name-DbLOtgcU.js";
import { F as FileCodeCorner } from "./file-code-corner-DqPHoMlQ.js";
import { P as Pencil } from "./pencil-hgqqcg0M.js";
import { C as Circle } from "./circle-gfZSUK0O.js";
import { f as filterHistoryItems, g as groupHistoryByDate, a as groupHistoryByWorkspace, s as shortenWorkspaceLabel, w as workspaceSessionKey, p as pruneDuplicateEmptySessions, b as backfillSessionWorkspaceFromActiveMap, c as pickActiveSessionId, d as chatSessionsCacheMatchesWorkspace, r as resolveWorkspaceChatSessions, e as sortSessionsByLatest, h as filterSessionsForWorkspaceTabs, t as toChatHistoryListItem, i as sessionMatchesWorkspaceTab, j as stampSessionWorkspaceIfMissing } from "./chat-history-groups-_t-rOT_Z.js";
import { P as Popover, c as PopoverTrigger, b as PopoverContent } from "./popover-Bdhu7TZA.js";
import { M as MessageSquare } from "./message-square-X8cIMXPJ.js";
import { h as hideOthers, R as ReactRemoveScroll, u as useFocusGuards, F as FocusScope } from "./Combination-C5HQNJJD.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function useRouterState(opts) {
  const contextRouter = useRouter({ warn: opts?.router === void 0 });
  const router = opts?.router || contextRouter;
  {
    const state2 = router.stores.__store.get();
    return opts?.select ? opts.select(state2) : state2;
  }
}
const __iconNode$o = [
  ["path", { d: "M12 5v14", key: "s699le" }],
  ["path", { d: "m19 12-7 7-7-7", key: "1idqje" }]
];
const ArrowDown = createLucideIcon("arrow-down", __iconNode$o);
const __iconNode$n = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode$n);
const __iconNode$m = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
];
const ArrowRight = createLucideIcon("arrow-right", __iconNode$m);
const __iconNode$l = [
  ["path", { d: "m5 12 7-7 7 7", key: "hav0vg" }],
  ["path", { d: "M12 19V5", key: "x0mq9r" }]
];
const ArrowUp = createLucideIcon("arrow-up", __iconNode$l);
const __iconNode$k = [
  ["path", { d: "m7 20 5-5 5 5", key: "13a0gw" }],
  ["path", { d: "m7 4 5 5 5-5", key: "1kwcof" }]
];
const ChevronsDownUp = createLucideIcon("chevrons-down-up", __iconNode$k);
const __iconNode$j = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["rect", { x: "9", y: "9", width: "6", height: "6", rx: "1", key: "1ssd4o" }]
];
const CircleStop = createLucideIcon("circle-stop", __iconNode$j);
const __iconNode$i = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
];
const Copy = createLucideIcon("copy", __iconNode$i);
const __iconNode$h = [
  ["path", { d: "M20 20v-7a4 4 0 0 0-4-4H4", key: "1nkjon" }],
  ["path", { d: "M9 14 4 9l5-5", key: "102s5s" }]
];
const CornerUpLeft = createLucideIcon("corner-up-left", __iconNode$h);
const __iconNode$g = [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
];
const Ellipsis = createLucideIcon("ellipsis", __iconNode$g);
const __iconNode$f = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M10 12.5 8 15l2 2.5", key: "1tg20x" }],
  ["path", { d: "m14 12.5 2 2.5-2 2.5", key: "yinavb" }]
];
const FileCode = createLucideIcon("file-code", __iconNode$f);
const __iconNode$e = [
  [
    "path",
    {
      d: "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",
      key: "sc7q7i"
    }
  ]
];
const Funnel = createLucideIcon("funnel", __iconNode$e);
const __iconNode$d = [
  ["circle", { cx: "18", cy: "18", r: "3", key: "1xkwt0" }],
  ["circle", { cx: "6", cy: "6", r: "3", key: "1lh9wr" }],
  ["path", { d: "M13 6h3a2 2 0 0 1 2 2v7", key: "1yeb86" }],
  ["path", { d: "M11 18H8a2 2 0 0 1-2-2V9", key: "19pyzm" }]
];
const GitCompare = createLucideIcon("git-compare", __iconNode$d);
const __iconNode$c = [
  ["rect", { width: "7", height: "7", x: "3", y: "3", rx: "1", key: "1g98yp" }],
  ["rect", { width: "7", height: "7", x: "3", y: "14", rx: "1", key: "1bb6yr" }],
  ["path", { d: "M14 4h7", key: "3xa0d5" }],
  ["path", { d: "M14 9h7", key: "1icrd9" }],
  ["path", { d: "M14 15h7", key: "1mj8o2" }],
  ["path", { d: "M14 20h7", key: "11slyb" }]
];
const LayoutList = createLucideIcon("layout-list", __iconNode$c);
const __iconNode$b = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]];
const LoaderCircle = createLucideIcon("loader-circle", __iconNode$b);
const __iconNode$a = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
];
const Lock = createLucideIcon("lock", __iconNode$a);
const __iconNode$9 = [
  [
    "path",
    {
      d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",
      key: "1sd12s"
    }
  ],
  ["path", { d: "M8 12h8", key: "1wcyev" }],
  ["path", { d: "M12 8v8", key: "napkw2" }]
];
const MessageCirclePlus = createLucideIcon("message-circle-plus", __iconNode$9);
const __iconNode$8 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }],
  ["path", { d: "m14 9 3 3-3 3", key: "8010ee" }]
];
const PanelLeftOpen = createLucideIcon("panel-left-open", __iconNode$8);
const __iconNode$7 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M15 3v18", key: "14nvp0" }],
  ["path", { d: "m8 9 3 3-3 3", key: "12hl5m" }]
];
const PanelRightClose = createLucideIcon("panel-right-close", __iconNode$7);
const __iconNode$6 = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M15 3v18", key: "14nvp0" }],
  ["path", { d: "m10 15-3-3 3-3", key: "1pgupc" }]
];
const PanelRightOpen = createLucideIcon("panel-right-open", __iconNode$6);
const __iconNode$5 = [
  [
    "path",
    {
      d: "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551",
      key: "1miecu"
    }
  ]
];
const Paperclip = createLucideIcon("paperclip", __iconNode$5);
const __iconNode$4 = [
  ["path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", key: "1p45f6" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }]
];
const RotateCw = createLucideIcon("rotate-cw", __iconNode$4);
const __iconNode$3 = [
  ["path", { d: "M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3", key: "lubmu8" }],
  ["path", { d: "M16 5h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3", key: "1ag34g" }],
  ["line", { x1: "12", x2: "12", y1: "4", y2: "20", key: "1tx1rr" }]
];
const SquareSplitHorizontal = createLucideIcon("square-split-horizontal", __iconNode$3);
const __iconNode$2 = [
  ["path", { d: "m7 11 2-2-2-2", key: "1lz0vl" }],
  ["path", { d: "M11 13h4", key: "1p7l4v" }],
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }]
];
const SquareTerminal = createLucideIcon("square-terminal", __iconNode$2);
const __iconNode$1 = [
  ["path", { d: "M12 19h8", key: "baeox8" }],
  ["path", { d: "m4 17 6-6-6-6", key: "1yngyt" }]
];
const Terminal = createLucideIcon("terminal", __iconNode$1);
const __iconNode = [
  ["path", { d: "m16 16-3 3 3 3", key: "117b85" }],
  ["path", { d: "M3 12h14.5a1 1 0 0 1 0 7H13", key: "18xa6z" }],
  ["path", { d: "M3 19h6", key: "1ygdsz" }],
  ["path", { d: "M3 5h18", key: "1u36vt" }]
];
const TextWrap = createLucideIcon("text-wrap", __iconNode);
function inferAgentStemFromText(text2) {
  const t = text2.trim();
  if (!t) return "product-manager";
  if (/(画|绘制|设计稿|mockup|原型|视觉稿|ui\s*稿|界面设计|登录页|注册页|忘记密码)/i.test(t)) {
    if (/(信息架构|交互流程|ux\s*结构|线框)/i.test(t)) return "design-ux-architect";
    if (/(视觉|配色|组件库|像素|美观)/i.test(t)) return "design-ui-designer";
    return "frontend-engineer";
  }
  if (/(前端|ui|ux|页面|界面|组件|react|vue|样式|html|css|tailwind)/i.test(t)) {
    return "frontend-engineer";
  }
  if (/(后端|api|接口|数据库|sql|模型|服务|引擎|算法|推理)/i.test(t)) {
    return "backend-engineer";
  }
  if (/(测试|qa|验收|回归|用例)/i.test(t)) {
    return "qa-engineer";
  }
  if (/(评审|审查|review|代码质量|安全审计)/i.test(t)) {
    return "code-reviewer";
  }
  if (/(部署|发布|devops|ci|cd|运维|监控|容器|docker|k8s)/i.test(t)) {
    return "devops-engineer";
  }
  if (/(架构|边界|选型|数据流|模块划分)/i.test(t)) {
    return "software-architect";
  }
  if (/(产品|prd|需求|验收口径|优先级|范围)/i.test(t)) {
    return "product-manager";
  }
  if (/(项目|里程碑|排期|wbs|风险|依赖|拆解)/i.test(t)) {
    return "project-manager";
  }
  if (/(写作|文案|文章|博客)/i.test(t)) {
    return "product-manager";
  }
  return "product-manager";
}
function wbsOrder(taskId) {
  const t = String(taskId ?? "").trim();
  const m = t.match(/^WBS-(\d{1,4})$/i);
  if (!m) return null;
  return Number(m[1]);
}
function maybeSortWbsSteps(steps) {
  if (!steps.length) return steps;
  const orders = steps.map((s) => wbsOrder(s.taskId));
  if (orders.some((n) => n == null)) return steps;
  const uniq2 = new Set(orders);
  if (uniq2.size !== steps.length) return steps;
  return [...steps].sort((a, b) => (wbsOrder(a.taskId) ?? 0) - (wbsOrder(b.taskId) ?? 0));
}
function inferAgentName(text2) {
  return inferAgentStemFromText(text2);
}
function validateSteps(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return "steps 须为非空数组";
  }
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (!s || typeof s !== "object") {
      return `第 ${i + 1} 步格式无效`;
    }
    const o = s;
    const agentName = String(o.agentName ?? "").trim();
    const instruction = String(o.instruction ?? "").trim();
    if (!agentName || !instruction) {
      return `第 ${i + 1} 步缺少 agentName 或 instruction`;
    }
  }
  return null;
}
function normalizeState(obj) {
  const stepsRaw = obj.steps;
  const steps = stepsRaw.map((s) => {
    const st = s;
    const taskId = st.taskId != null ? String(st.taskId).trim() : "";
    return {
      agentName: String(st.agentName ?? "").trim(),
      ...taskId ? { taskId } : {},
      instruction: String(st.instruction ?? "").trim()
    };
  });
  return {
    status: typeof obj.status === "string" ? obj.status : "idle",
    currentIndex: 0,
    steps
  };
}
function tryParseOne(candidate) {
  const t = candidate.trim();
  if (!t.startsWith("{")) return null;
  try {
    const obj = JSON.parse(t);
    if (validateSteps(obj.steps)) return null;
    return normalizeState(obj);
  } catch {
    return null;
  }
}
function parseMarkdownBacklog(text2) {
  const lines = text2.split(/\r?\n/);
  const steps = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const taskMatch = line.match(/^\s*(?:[-*]|\d+\.)?\s*\*\*?\s*任务\s*\[([^\]]+)\]\s*[：:]\s*(.+?)\s*\*{0,2}\s*$/i) || line.match(/^\s*(?:[-*]|\d+\.)?\s*任务\s*\[([^\]]+)\]\s*[：:]\s*(.+)\s*$/i) || line.match(/^\s*(?:[-*]|\d+\.)?\s*\[([A-Za-z]{2,}-\d+)\]\s*(.+)\s*$/);
    if (!taskMatch) {
      i += 1;
      continue;
    }
    const taskId = String(taskMatch[1] ?? "").trim();
    const title = String(taskMatch[2] ?? "").trim();
    const details = [];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      const nextTrim = next.trim();
      if (!nextTrim) {
        i += 1;
        continue;
      }
      if (/^\s*(?:[-*]|\d+\.)?\s*\*{0,2}\s*任务\s*\[([^\]]+)\]/i.test(nextTrim) || /^\s*(?:[-*]|\d+\.)?\s*\[([A-Za-z]{2,}-\d+)\]/.test(nextTrim)) {
        break;
      }
      if (/^#{2,6}\s+/.test(nextTrim)) {
        i += 1;
        continue;
      }
      details.push(nextTrim.replace(/^\s*[-*]\s*/, ""));
      i += 1;
    }
    const desc = details.length ? `
${details.join("\n")}` : "";
    const instruction = `请执行任务 ${taskId || "未编号"}：${title}${desc}`.trim();
    const agentName = inferAgentName(`${title}
${details.join("\n")}`);
    steps.push({
      ...taskId ? { taskId } : {},
      agentName,
      instruction
    });
  }
  if (!steps.length) return null;
  return { status: "idle", currentIndex: 0, steps: maybeSortWbsSteps(steps) };
}
function findHeaderColumnIndex(headerNorm, patterns) {
  for (const re2 of patterns) {
    const i = headerNorm.findIndex((h) => re2.test(h));
    if (i >= 0) return i;
  }
  return -1;
}
function splitMdRow(line) {
  const t = line.trim();
  if (!t.includes("|")) return [];
  const raw = t.replace(/^\|/, "").replace(/\|$/, "");
  return raw.split("|").map((s) => s.trim());
}
const CHINESE_AGENT_STEM = {
  项目经理: "project-manager",
  产品经理: "product-manager",
  软件架构师: "software-architect",
  架构师: "software-architect",
  前端工程师: "frontend-engineer",
  前端: "frontend-engineer",
  后端工程师: "backend-engineer",
  后端: "backend-engineer",
  测试工程师: "qa-engineer",
  测试: "qa-engineer",
  代码评审: "code-reviewer",
  评审: "code-reviewer",
  运维工程师: "devops-engineer",
  运维: "devops-engineer"
};
function normalizeAgentStem(raw) {
  const rawTrim = String(raw ?? "").replace(/[`*]/g, "").trim();
  if (!rawTrim) return "";
  const zh = CHINESE_AGENT_STEM[rawTrim];
  if (zh) return zh;
  const t = rawTrim.toLowerCase();
  if (t === "project-manager" || t === "project manager") return "project-manager";
  if (t === "product-manager" || t === "product manager") return "product-manager";
  if (t === "software-architect" || t === "software architect") return "software-architect";
  if (t === "frontend-engineer" || t === "frontend engineer") return "frontend-engineer";
  if (t === "backend-engineer" || t === "backend engineer") return "backend-engineer";
  if (t === "qa-engineer" || t === "qa engineer") return "qa-engineer";
  if (t === "code-reviewer" || t === "code reviewer") return "code-reviewer";
  if (t === "devops-engineer" || t === "devops engineer") return "devops-engineer";
  if (/^\d+$/.test(t)) return "";
  if (/^[a-z][a-z0-9-]*$/.test(t)) return t;
  return "";
}
function parseWbsMarkdownTable(text2) {
  const lines = text2.split(/\r?\n/);
  const tableRows = lines.filter((l) => l.includes("|"));
  if (tableRows.length < 3) return null;
  let header = null;
  let headerIdx = -1;
  for (let i = 0; i < tableRows.length; i++) {
    const cols = splitMdRow(tableRows[i]);
    if (!cols.length) continue;
    const join2 = cols.join(" ").toLowerCase();
    if (/工作摘要|任务编号|task\s*summary|执行\s*agent|执行人|角色|交付标准|agent/.test(
      join2
    )) {
      header = cols;
      headerIdx = i;
      break;
    }
  }
  if (!header || headerIdx < 0) return null;
  const colKey = (s) => s.toLowerCase().replace(/\s+/g, "");
  const headerNorm = header.map(colKey);
  const idCol = findHeaderColumnIndex(headerNorm, [/任务编号/, /编号/, /taskid/, /^id$/]);
  const summaryCol = findHeaderColumnIndex(headerNorm, [
    /工作摘要与执行说明/,
    /工作摘要/,
    /执行说明/,
    /tasksummary/,
    /摘要/,
    /summary/,
    /任务说明/,
    /工作包/
  ]);
  const agentCol = findHeaderColumnIndex(headerNorm, [
    /执行agent/,
    /执行人/,
    /负责人/,
    /角色/,
    /^agent$/,
    /指派/
  ]);
  const depCol = findHeaderColumnIndex(headerNorm, [/依赖任务/, /依赖/, /前置/, /depend/]);
  const dodCol = findHeaderColumnIndex(headerNorm, [
    /交付标准/,
    /dod/,
    /验收/,
    /完成定义/
  ]);
  const steps = [];
  for (let i = headerIdx + 1; i < tableRows.length; i++) {
    const cols = splitMdRow(tableRows[i]);
    if (!cols.length) continue;
    if (cols.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) continue;
    const lineJoin = cols.join(" ").trim();
    if (!lineJoin) continue;
    const taskId = idCol >= 0 && cols[idCol] != null && String(cols[idCol]).trim() !== "" ? String(cols[idCol]).replace(/[`*]/g, "").trim() : `WBS-${steps.length + 1}`;
    const summary = String(summaryCol >= 0 ? cols[summaryCol] ?? "" : cols[0] ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/[`*]/g, "").trim();
    if (!summary) continue;
    const agentRaw = agentCol >= 0 ? cols[agentCol] ?? "" : "";
    const agent = normalizeAgentStem(agentRaw) || inferAgentName(`${summary}
${agentRaw}`);
    const dep = depCol >= 0 ? String(cols[depCol] ?? "").replace(/[`*]/g, "").trim() : "";
    const dod = dodCol >= 0 ? String(cols[dodCol] ?? "").replace(/[`*]/g, "").trim() : "";
    const details = [dep ? `依赖：${dep}` : "", dod ? `DoD：${dod}` : ""].filter(Boolean).join("\n");
    const instruction = `请执行任务 ${taskId}：${summary}${details ? `
${details}` : ""}`;
    steps.push({ taskId, agentName: agent, instruction });
  }
  if (!steps.length) return null;
  return { status: "idle", currentIndex: 0, steps: maybeSortWbsSteps(steps) };
}
function parseWbsLooseRows(text2) {
  const lines = text2.split(/\r?\n/);
  const steps = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const idm = line.match(/\b(WBS[-_ ]?\d{1,3})\b/i);
    if (!idm) continue;
    const taskId = idm[1].toUpperCase().replace(/[_ ]+/g, "-");
    if (seen.has(taskId)) continue;
    seen.add(taskId);
    const cols = splitMdRow(line);
    const summaryCandidate = cols.length >= 2 ? (cols[1] || cols[0] || "").replace(/[`*]/g, "").replace(/<br\s*\/?>/gi, " ").trim() : line.replace(/[`*]/g, "");
    const summary = summaryCandidate.replace(/\bWBS[-_ ]?\d{1,3}\b/gi, "").replace(/[|]/g, " ").replace(/\s{2,}/g, " ").trim();
    if (!summary) continue;
    const agentText = cols.join(" ");
    const agent = normalizeAgentStem(agentText) || inferAgentName(`${summary}
${agentText}`);
    const instruction = `请执行任务 ${taskId}：${summary}`;
    steps.push({ taskId, agentName: agent, instruction });
  }
  if (!steps.length) return null;
  return { status: "idle", currentIndex: 0, steps: maybeSortWbsSteps(steps) };
}
function parseAgentDelegationMarkdown(text2) {
  let body = text2?.trim() ?? "";
  if (!body) return null;
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let fm;
  while ((fm = fenceRe.exec(body)) !== null) {
    try {
      const obj = JSON.parse(fm[1].trim());
      if (typeof obj.content === "string" && obj.content.trim()) {
        body = obj.content.trim();
        break;
      }
      if (Array.isArray(obj)) {
        const block = obj.find(
          (x) => x && typeof x === "object" && typeof x.content === "string"
        );
        if (block?.content?.trim()) {
          body = block.content.trim();
          break;
        }
      }
    } catch {
    }
  }
  const lines = body.split(/\r?\n/);
  const steps = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const agentMatch = line.match(/\/agent\s+([a-z0-9][a-z0-9-]*)/i);
    if (!agentMatch) continue;
    const rawStem = agentMatch[1].trim();
    const agentName = normalizeAgentStem(rawStem) || rawStem.toLowerCase();
    if (!agentName) continue;
    const titleFromBold = line.match(/(?:^\d+\.\s*)?\*\*([^*]+)\*\*/);
    const titleFromColon = line.match(
      /(?:^\d+\.\s*)?(?:\*\*)?([^*:：]+?)(?:\*\*)?\s*[：:]\s*/
    );
    const title = (titleFromBold?.[1] || titleFromColon?.[1] || "").replace(/^\d+\.\s*/, "").trim();
    const taskId = `WBS-${steps.length + 1}`;
    const detail = line.replace(/^\d+\.\s*/, "").replace(/\*\*/g, "").trim();
    const instruction = title ? `请执行任务 ${taskId}：${title}${detail && detail !== title ? `
${detail}` : ""}` : `请执行任务 ${taskId}：${detail}`;
    steps.push({ taskId, agentName, instruction });
  }
  if (!steps.length) return null;
  return { status: "idle", currentIndex: 0, steps: maybeSortWbsSteps(steps) };
}
function parseActiveChainFromBubbleText(raw) {
  const text2 = raw?.trim() ?? "";
  if (!text2) {
    return { ok: false, error: "气泡内容为空" };
  }
  const candidates = [];
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m;
  while ((m = fenceRe.exec(text2)) !== null) {
    candidates.push(m[1].trim());
  }
  if (text2.startsWith("{")) {
    candidates.unshift(text2);
  }
  const stepsIdx = text2.indexOf('"steps"');
  if (stepsIdx >= 0) {
    const start = text2.lastIndexOf("{", stepsIdx);
    if (start >= 0) {
      candidates.push(text2.slice(start));
    }
  }
  const seen = /* @__PURE__ */ new Set();
  for (const c of candidates) {
    if (!c || seen.has(c)) continue;
    seen.add(c);
    const parsed = tryParseOne(c);
    if (parsed) {
      return { ok: true, state: parsed, source: "json" };
    }
  }
  const mdParsed = parseMarkdownBacklog(text2);
  if (mdParsed) {
    return { ok: true, state: mdParsed, source: "markdown" };
  }
  const wbsParsed = parseWbsMarkdownTable(text2);
  if (wbsParsed) {
    return { ok: true, state: wbsParsed, source: "markdown" };
  }
  const wbsLoose = parseWbsLooseRows(text2);
  if (wbsLoose) {
    return { ok: true, state: wbsLoose, source: "markdown" };
  }
  const delegationParsed = parseAgentDelegationMarkdown(text2);
  if (delegationParsed) {
    return { ok: true, state: delegationParsed, source: "markdown" };
  }
  return {
    ok: false,
    error: "未能解析出有效 JSON：须包含 steps 数组，且每步含 agentName、instruction。亦未识别出任务清单（如“任务 [ENG-01]: …”）。可将完整对象放在 ```json 代码块中。"
  };
}
const ONE_LINE_PATH = /\b((?:docs|app|data|scripts|frontend)\/[a-zA-Z0-9_.\/-]+\.(?:md|txt))\b/;
function inferSuggestedWritePathFromBubbleText(text2) {
  const safe = text2.replace(/\n*【一键写入】[\s\S]*$/u, "").trim();
  const lines = safe.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const L = lines[i];
    const pathMatch = L.match(ONE_LINE_PATH);
    if (!pathMatch) continue;
    const cta = /(?:需要|是否|请|建议|可以|能否|要不要|将.*生成|保存为|写入|路径|Markdown|文件|例如|如[：:为]?|e\.g\.)/i.test(L) || /`docs\//.test(L);
    if (cta) return pathMatch[1].replace(/\\/g, "/");
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    const L = lines[i];
    if (/(?:例如|如[：:为]|\(e\.g\.)/.test(L)) {
      const m = L.match(ONE_LINE_PATH);
      if (m) return m[1].replace(/\\/g, "/");
    }
  }
  return null;
}
function inferCanonicalMdPathByContent(text2) {
  const t = text2.toLowerCase();
  if (/(qa engineer|测试工程师|qa\s*&\s*audit|质量审计)/i.test(text2)) return "docs/qa-report.md";
  if (/(sprint backlog|冲刺优先级|rice|moscow|用户故事列表)/i.test(text2)) return "docs/sprint-backlog.md";
  if (/(wbs|任务分解|工作包|task\s*summary)/i.test(text2)) return "docs/wbs.md";
  if (/(进度报|status report|当前状态|预计完成时间|项目状态)/i.test(text2)) return "docs/project-status.md";
  if (/(会议纪要|meeting notes|行动项)/i.test(text2)) return "docs/meeting-notes.md";
  if (/(风险登记|risk log|mitigation)/i.test(text2)) return "docs/risk-log.md";
  if (/(里程碑|milestone)/i.test(text2)) return "docs/milestone-plan.md";
  if (/(测试方案|测试报告|qa|验收|test plan|test report)/i.test(text2)) return "docs/qa-report.md";
  if (/(架构|architecture|边界|数据流|接口契约)/i.test(text2)) return "docs/architecture-note.md";
  if (/(ui spec|视觉规范|界面设计|组件库)/i.test(text2)) return "docs/ui-spec.md";
  if (/(ux|信息架构|交互流程)/i.test(text2)) return "docs/ux-architecture.md";
  if (/(api|接口说明|openapi|swagger)/i.test(text2)) return "docs/api-summary.md";
  if (/(代码评审|review|审查)/i.test(text2)) return "docs/code-review-report.md";
  if (/(发布|部署|devops|ci\/cd)/i.test(text2)) return "docs/release-plan.md";
  if (/(prd|需求文档|验收口径|用户故事)/i.test(text2)) return "docs/prd.md";
  if (/(市场调研|趋势研究|竞品)/i.test(text2)) return "docs/market-research.md";
  if (t.includes("markdown")) return "docs/note.md";
  return null;
}
function isConfirmWriteOnlyMessage(text2) {
  const t = text2.trim();
  if (!t || t.length > 48) return false;
  return /^(?:确认\s*写入|同意\s*写入|确认\s*落盘|同意\s*落盘|一键\s*落盘|写入\s*工作区|\/confirm-write)\s*[!！。.]*$/iu.test(
    t
  );
}
function isBulkWriteProjectMessage(text2) {
  const t = text2.trim();
  if (!t) return false;
  if (isConfirmWriteOnlyMessage(t)) return false;
  return /(?:将|把).*(?:以上|上文|前面|任务链|所有|全部).*(?:代码|文件|产物)?.*(?:写入|落盘|保存)/i.test(t) || /(?:批量|全部).*(?:写入|落盘|保存)/i.test(t) || /\/bulk-write(?:-project)?\b/i.test(t);
}
function extractClaimedWritePathFromText(text2) {
  const patterns = [
    /已写入\s+[`'"]?((?:docs|[\w.-]+)\/[\w./-]+\.(?:md|txt|json|yaml|yml))[`'"]?/i,
    /已(?:经)?(?:保存|落盘)(?:到|至)?\s+[`'"]?((?:docs|[\w.-]+)\/[\w./-]+\.(?:md|txt))[`'"]?/i,
    /(?:写入|保存)(?:到|至)\s+[`'"]?((?:docs|[\w.-]+)\/[\w./-]+\.(?:md|txt))[`'"]?\s*(?:成功|完成|完毕)/i
  ];
  for (const re2 of patterns) {
    const m = text2.match(re2);
    const p = m?.[1]?.replace(/\\/g, "/");
    if (p && !p.includes("..")) return p;
  }
  return null;
}
function buildConfirmWriteItems(assistantRaw, defaultRelativePath, agentStem) {
  const stemPath = agentStem ? defaultArtifactPathForAgent(normalizeAgentStem$1(agentStem)) : null;
  const fallback = stemPath || defaultRelativePath.trim().replace(/^[/\\]+/, "").replace(/\\/g, "/") || "docs/prd.md";
  const parsed = parseWorkspaceWriteItemsFromBubble(assistantRaw);
  if (parsed.length > 0) return parsed;
  let body = assistantRaw.trim();
  body = body.replace(/\n*【工作区已写入】[\s\S]*$/u, "").trim();
  body = stripWorkspaceWriteFencesForHistory(body);
  if (!body) return [];
  const suggested = inferSuggestedWritePathFromBubbleText(assistantRaw);
  const canonical = inferCanonicalMdPathByContent(body);
  const parsedChain = parseActiveChainFromBubbleText(body);
  const wbsChainPath = parsedChain.ok && (parsedChain.state.steps?.length ?? 0) > 0 ? "docs/wbs.md" : null;
  const pathForPlain = suggested && !suggested.includes("..") ? suggested : wbsChainPath && !wbsChainPath.includes("..") ? wbsChainPath : canonical && !canonical.includes("..") ? canonical : fallback;
  return [{ path: pathForPlain, content: body }];
}
function looksLikeActiveChainJson(obj) {
  if (!obj || typeof obj !== "object") return false;
  const steps = obj.steps;
  if (!Array.isArray(steps) || steps.length === 0) return false;
  const first = steps[0];
  if (!first || typeof first !== "object") return false;
  return "agentName" in first || "instruction" in first;
}
function normalizeWorkspaceWriteItem(item) {
  if (!item || typeof item !== "object") return null;
  const o = item;
  const rel = typeof o.path === "string" ? o.path : typeof o.file === "string" ? o.file : "";
  const p = rel.trim();
  if (!p) return null;
  const content2 = o.content != null ? String(o.content) : "";
  return { path: p.replace(/\\/g, "/"), content: content2 };
}
function parseWorkspaceWriteItemsFromBubble(text2) {
  if (!text2 || typeof text2 !== "string") return [];
  const map2 = /* @__PURE__ */ new Map();
  function absorbParsed(parsed) {
    if (looksLikeActiveChainJson(parsed)) return;
    if (Array.isArray(parsed)) {
      for (const el of parsed) {
        const n = normalizeWorkspaceWriteItem(el);
        if (n) map2.set(n.path, n.content);
      }
      return;
    }
    const one2 = normalizeWorkspaceWriteItem(parsed);
    if (one2) map2.set(one2.path, one2.content);
  }
  for (const item of parseWorkspaceWriteFences(text2)) {
    const n = normalizeWorkspaceWriteItem(item);
    if (n) map2.set(n.path, n.content);
  }
  const fenceRe = /```(?:json)\s*([\s\S]*?)```/gi;
  let m;
  while ((m = fenceRe.exec(text2)) !== null) {
    const chunk = m[1].trim();
    if (!chunk) continue;
    try {
      absorbParsed(JSON.parse(chunk));
    } catch {
    }
  }
  const t = text2.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      absorbParsed(JSON.parse(t));
    } catch {
    }
  }
  return Array.from(map2.entries()).map(([path2, content2]) => ({ path: path2, content: content2 }));
}
function findTopLevelJsonEnd(s, start) {
  let i = start;
  while (i < s.length && /\s/.test(s[i])) i++;
  const c0 = s[i];
  if (c0 !== "{" && c0 !== "[") return -1;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') {
        inStr = false;
        continue;
      }
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}
const WORKSPACE_WRITE_FENCE_OPEN = /(?:```|''')\s*`?\s*workspace-write\s*`?\s*\n?/gi;
function findWorkspaceWriteBlocks(text2) {
  const blocks = [];
  const openRe = new RegExp(WORKSPACE_WRITE_FENCE_OPEN.source, "gi");
  let searchFrom = 0;
  let m;
  while (true) {
    openRe.lastIndex = searchFrom;
    m = openRe.exec(text2);
    if (!m) break;
    const outerStart = m.index;
    const bodyStart = m.index + m[0].length;
    const relJson = text2.slice(bodyStart).search(/[{\[]/);
    if (relJson === -1) {
      searchFrom = m.index + 1;
      continue;
    }
    const absJsonStart = bodyStart + relJson;
    const jsonEnd = findTopLevelJsonEnd(text2, absJsonStart);
    if (jsonEnd === -1) {
      searchFrom = m.index + 1;
      continue;
    }
    let outerEnd = jsonEnd;
    while (outerEnd < text2.length && /\s/.test(text2[outerEnd])) outerEnd++;
    const tail = text2.slice(outerEnd);
    const closeFence = tail.match(/^(?:```|''')/);
    if (closeFence) outerEnd += closeFence[0].length;
    const json = text2.slice(absJsonStart, jsonEnd).trim();
    blocks.push({ outerStart, outerEnd, json });
    searchFrom = outerEnd;
  }
  return blocks;
}
function parseWorkspaceWriteFences(text2) {
  if (!text2 || typeof text2 !== "string") return [];
  const blocks = findWorkspaceWriteBlocks(text2);
  const out = [];
  for (const { json: chunk } of blocks) {
    try {
      const parsed = JSON.parse(chunk);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") out.push(item);
        }
      } else if (parsed && typeof parsed === "object") {
        out.push(parsed);
      }
    } catch {
    }
  }
  return out;
}
function stripWorkspaceWriteFencesForHistory(text2) {
  const blocks = findWorkspaceWriteBlocks(text2);
  if (!blocks.length) return text2;
  let out = text2;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const { outerStart, outerEnd } = blocks[i];
    out = out.slice(0, outerStart) + out.slice(outerEnd);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
async function ingestAssistantWorkspaceWrites(desktop, assistantText, onToast) {
  const fenceBlocks = findWorkspaceWriteBlocks(assistantText);
  const items = parseWorkspaceWriteFences(assistantText);
  if (fenceBlocks.length > 0 && items.length === 0) {
    onToast?.(
      "识别到 workspace-write 围栏，但内部 JSON 解析失败（常见于正文含未转义的引号、或非合法 JSON）。PRD 若在 content 里含 Markdown 代码块，仍须是**合法 JSON 字符串**（换行用 \\n）。可缩短正文或拆成多个文件再写。"
    );
  }
  if (!items.length) return { n: 0, paths: [] };
  try {
    const res = await desktop.workspaceApplyWriteFence(items);
    if (res?.written?.length) {
      return { n: res.written.length, paths: res.written };
    }
    if (res && res.ok === false && res.error) {
      onToast?.(`未能写入工作区：${res.error}`);
    } else if (res?.errors?.length) {
      onToast?.(`部分路径未写入：${res.errors.slice(0, 2).join("; ")}`);
    }
  } catch (e) {
    onToast?.(`工作区写入异常：${String(e)}`);
  }
  return { n: 0, paths: [] };
}
function collapseWorkspaceWriteForHistory(fullText, writtenPaths) {
  if (!writtenPaths.length) return fullText;
  let stripped = fullText.replace(/\n*【工作区已写入】[\s\S]*$/u, "").trim();
  stripped = stripped.replace(/\n*【未落盘】[\s\S]*$/u, "").trim();
  stripped = stripWorkspaceWriteFencesForHistory(stripped);
  const list2 = writtenPaths.map((p) => `- \`${p}\``).join("\n");
  const summary = `【工作区已写入】共 ${writtenPaths.length} 个文件：
${list2}`;
  if (stripped.length > 0) {
    return `${stripped}

${summary}`;
  }
  return summary;
}
function looksLikeFakeWorkspaceWriteClaim(text2) {
  const t = String(text2 || "");
  if (!t.trim()) return false;
  if (findWorkspaceWriteBlocks(t).length > 0) return false;
  if (/【工作区已写入】/.test(t)) return true;
  if (/###\s*产物写盘/i.test(t)) return true;
  if (/工作区已写入\s*共\s*\d+\s*个文件/i.test(t)) return true;
  if (/已写入\s+[`'"]?(?:docs\/|\w)/i.test(t)) return true;
  return false;
}
async function tryFallbackWriteFromClaimOrAgent(desktop, assistantText, onToast, meta) {
  const stem = meta?.agentStem?.trim() || "";
  if (stem && agentRequiresManualConfirmWrite(stem)) return null;
  const claimed = extractClaimedWritePathFromText(assistantText);
  let items = [];
  if (claimed) {
    let body = stripWorkspaceWriteFencesForHistory(assistantText).replace(/\n*【工作区已写入】[\s\S]*$/u, "").replace(/[^\n]*已写入[^\n]*\n?/gi, "").trim();
    if (body.length > 40) items = [{ path: claimed, content: body }];
  }
  if (!items.length && stem) {
    items = buildConfirmWriteItems(
      assistantText,
      meta?.defaultConfirmWritePath,
      stem
    );
  }
  if (!items.length || typeof desktop.workspaceApplyWriteFence !== "function") return null;
  try {
    const res = await desktop.workspaceApplyWriteFence(items);
    if (res?.written?.length) {
      onToast?.(
        claimed ? `已按助手说明写入：${res.written.join("，")}` : `已写入 Agent 产物：${res.written.join("，")}`
      );
      return res.written;
    }
    if (res?.error) onToast?.(`未能写入工作区：${res.error}`);
  } catch (e) {
    onToast?.(`工作区写入异常：${String(e)}`);
  }
  return null;
}
async function ingestWorkspaceWritesAndCollapseDisplay(desktop, assistantText, onToast, meta) {
  const stem = meta?.agentStem?.trim() || "";
  const manualOnly = stem ? agentRequiresManualConfirmWrite(stem) : false;
  const autoWrite = !manualOnly && (meta?.autoWriteProject ?? (stem ? agentAutoWritesToProject(stem) : false));
  if (!manualOnly) {
    const ing = await ingestAssistantWorkspaceWrites(desktop, assistantText, onToast);
    if (ing.n > 0 && ing.paths.length > 0) {
      return collapseWorkspaceWriteForHistory(assistantText, ing.paths);
    }
  }
  if (autoWrite && typeof desktop.workspaceIngestFromAssistantText === "function" && stem) {
    try {
      const wr = await desktop.workspaceIngestFromAssistantText({
        text: assistantText,
        agentName: stem,
        ensureAgentArtifact: false,
        ensureChainArtifact: false,
        autoWriteProject: true,
        manualConfirmOnly: false
      });
      if (wr?.written?.length) {
        onToast?.(`已自动写入项目：${wr.written.join("，")}`);
        return collapseWorkspaceWriteForHistory(assistantText, wr.written);
      }
      if (wr && wr.ok === false && wr.error) {
        onToast?.(`落盘：${wr.error}`);
      }
    } catch (e) {
      onToast?.(`落盘异常：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (autoWrite) {
    const fallbackWritten = await tryFallbackWriteFromClaimOrAgent(
      desktop,
      assistantText,
      onToast,
      meta
    );
    if (fallbackWritten?.length) {
      return collapseWorkspaceWriteForHistory(assistantText, fallbackWritten);
    }
  }
  if (looksLikeFakeWorkspaceWriteClaim(assistantText)) {
    onToast?.(
      manualOnly ? "产品经理/项目经理的产出需手动落盘：请点击输入栏旁「确认写入」，或发送「确认写入」。" : "检测到回复中含「已写入」等表述，但本轮未成功落盘。请检查 ```workspace-write``` JSON 是否合法。"
    );
  }
  return assistantText;
}
async function ingestChainStepWorkspaceWrites(desktop, assistantText, meta, onToast) {
  const ing = await ingestAssistantWorkspaceWrites(desktop, assistantText, onToast);
  let written = ing.paths;
  if (ing.n > 0 && written.length > 0) {
    return {
      displayText: collapseWorkspaceWriteForHistory(assistantText, written),
      writtenPaths: written
    };
  }
  const manualOnly = agentRequiresManualConfirmWrite(meta.agentName);
  const autoWrite = agentAutoWritesToProject(meta.agentName);
  if (typeof desktop.workspaceIngestFromAssistantText === "function") {
    try {
      const wr = await desktop.workspaceIngestFromAssistantText({
        text: assistantText,
        agentName: meta.agentName,
        taskId: meta.taskId ?? "",
        ensureChainArtifact: true,
        autoWriteProject: autoWrite,
        manualConfirmOnly: manualOnly
      });
      if (wr?.written?.length) {
        written = wr.written;
        onToast?.(
          manualOnly ? `已写入步骤摘要（产品/项目类须确认写入正式文档）：${written.join("，")}` : `已自动写入项目：${written.join("，")}`
        );
        const displayText = wr.displayText && typeof wr.displayText === "string" ? wr.displayText : collapseWorkspaceWriteForHistory(assistantText, written);
        return { displayText, writtenPaths: written };
      }
      if (wr && wr.ok === false && wr.error) {
        onToast?.(`步骤落盘：${wr.error}`);
      }
    } catch (e) {
      onToast?.(`步骤落盘异常：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (looksLikeFakeWorkspaceWriteClaim(assistantText)) {
    onToast?.(
      "检测到回复中含「工作区已写入」表述，但本轮未成功落盘。任务链已尝试写入 docs/chain-steps/；若仍失败请检查是否已选择工作区。"
    );
  }
  return { displayText: assistantText, writtenPaths: written };
}
function stripLargeAssistantArtifacts(text2, maxInnerLen = 2e3) {
  if (!text2 || typeof text2 !== "string") return text2;
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  const removals = [];
  let m;
  while ((m = fenceRe.exec(text2)) !== null) {
    const inner = m[1].trim();
    if (inner.length < maxInnerLen) continue;
    if (/workspace-write|workspace_write|"tool_calls"|"arguments"\s*:\s*\{|"name"\s*:\s*"workspace/i.test(
      inner
    )) {
      removals.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  let out = text2;
  for (let i = removals.length - 1; i >= 0; i--) {
    const { start, end } = removals[i];
    out = out.slice(0, start) + "\n（已省略大段工具/JSON 原文，请以工作区文件与下方要点为准。）\n" + out.slice(end);
  }
  const collapsed = out.replace(/\n{3,}/g, "\n\n").trim();
  const meaningful = collapsed.replace(/[\s\-·=`]/gu, "").replace(/（已省略[^）]*）/g, "");
  if (meaningful.length < 12 && text2.trim().length > meaningful.length + 30) {
    return text2.trim();
  }
  return collapsed;
}
const MISSING_WORKSPACE_WRITE_TOAST = "本轮助手回复未出现 workspace-write 写盘块：内容多半仍只在聊天里。若无需模型再输出 JSON，可直接点输入栏旁「确认写入」→ 将上一条助手内容写入设置里的默认路径；或让模型输出 ```workspace-write``` JSON；亦可手动保存为 docs/prd.md 等。";
function hasWorkspaceWriteFence(text2) {
  return /(?:```|''')\s*`?\s*workspace-write\s*`?/i.test(String(text2 || ""));
}
function replySoundsLikeClaimedDiskWrite(r) {
  const t = String(r || "").trim();
  if (t.length < 160) return false;
  if (hasWorkspaceWriteFence(t)) return false;
  return /(?:任务状态|已完成|执行完毕|完全执行|基线|BASELINE|已建立(?!链)|已落盘|已写入\s+[`'"]?(?:docs\/|\w+))/i.test(
    t
  ) || /(?:可供.*[Aa]gent|互操作|已生成文件|磁盘上|涉及文件路径|已创建文件|创建以下文件|将写入以下路径|实现完成|编码完成|已添加文件|新增文件|模块实现完成)/i.test(
    t
  );
}
function maybeToastMissingWorkspaceWrite(replyRaw) {
  try {
    const r = replyRaw.trim();
    if (r.length < 160) return;
    if (!replySoundsLikeClaimedDiskWrite(r)) return;
    toast.warning(MISSING_WORKSPACE_WRITE_TOAST, { duration: 1e4 });
  } catch (e) {
    console.error("maybeToastMissingWorkspaceWrite", e);
  }
}
function isFileTab(tab2) {
  return tab2.kind === "file";
}
function isBrowserTab(tab2) {
  return tab2.kind === "browser";
}
function fileNameFromRel(relPath) {
  return relPath.split("/").pop() || relPath;
}
function normalizeBrowserUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return "about:blank";
  if (/^(https?:|blob:|data:|about:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
function normalizeExplorerGitPath(raw) {
  let p = raw.trim().replace(/\\/g, "/");
  if (p.startsWith('"') && p.endsWith('"')) {
    p = p.slice(1, -1).replace(/\\"/g, '"');
  }
  if (p.startsWith("./")) p = p.slice(2);
  p = p.replace(/\/+$/, "");
  return p;
}
function porcelainLetter(x, y) {
  if (x === "?" && y === "?") return "U";
  if (x === "A" || y === "A") return "A";
  if (x === "D" || y === "D") return "D";
  if (x === "R" || y === "R") return "R";
  if (x === "C" || y === "C") return "C";
  if (x === "M" || y === "M") return "M";
  if (x === "U" || y === "U") return "U";
  return "M";
}
function parseGitStatusShortBranch(statusLine) {
  const entries2 = [];
  for (const line of statusLine.split("\n")) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("##")) continue;
    if (trimmed.startsWith("?? ")) {
      entries2.push({ path: normalizeExplorerGitPath(trimmed.slice(3)), letter: "U" });
      continue;
    }
    if (trimmed.length < 4) continue;
    const x = trimmed[0];
    const y = trimmed[1];
    const path2 = normalizeExplorerGitPath(trimmed.slice(3));
    if (!path2) continue;
    entries2.push({ path: path2, letter: porcelainLetter(x, y) });
  }
  return entries2;
}
function buildExplorerGitDecor(entries2) {
  const statusByPath = /* @__PURE__ */ new Map();
  const hasDecoration = /* @__PURE__ */ new Set();
  for (const raw of entries2) {
    const path2 = normalizeExplorerGitPath(raw.path);
    const letter = raw.letter;
    if (!path2) continue;
    statusByPath.set(path2, letter);
    const parts = path2.split("/").filter(Boolean);
    for (let i = 1; i <= parts.length; i++) {
      hasDecoration.add(parts.slice(0, i).join("/"));
    }
  }
  return { statusByPath, hasDecoration };
}
function shortenHomeInPath$1(abs) {
  const m = abs.match(/^(\/Users\/[^/]+)(\/.*)?$/);
  if (m) return `~${m[2] ?? ""}` || "~";
  const w = abs.match(/^(\/home\/[^/]+)(\/.*)?$/);
  if (w) return `~${w[2] ?? ""}` || "~";
  return abs;
}
function makeTabId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function revokeBlobUrl(tab2) {
  if (isBrowserTab(tab2) && tab2.blobUrl?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(tab2.blobUrl);
    } catch {
    }
  }
}
const WorkbenchWorkspaceContext = reactExports.createContext(null);
function WorkbenchWorkspaceProvider({ children }) {
  const desktopReady = useDesktopReady();
  const [rootLabel, setRootLabel] = reactExports.useState("（未选择工作区）");
  const [tree, setTree] = reactExports.useState([]);
  const [gitStatusByPath, setGitStatusByPath] = reactExports.useState(() => /* @__PURE__ */ new Map());
  const [gitHasDecoration, setGitHasDecoration] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const [filesErr, setFilesErr] = reactExports.useState(null);
  const [loadingFiles, setLoadingFiles] = reactExports.useState(false);
  const [editorTabs, setEditorTabs] = reactExports.useState([]);
  const [activeEditorTabId, setActiveEditorTabId] = reactExports.useState(null);
  const [shellText, setShellText] = reactExports.useState("");
  const [shellErr, setShellErr] = reactExports.useState(null);
  const [loadingShell, setLoadingShell] = reactExports.useState(false);
  const [diffText, setDiffText] = reactExports.useState("");
  const [diffErr, setDiffErr] = reactExports.useState(null);
  const [statusLine, setStatusLine] = reactExports.useState("");
  const [loadingDiff, setLoadingDiff] = reactExports.useState(false);
  const activeEditorTab = reactExports.useMemo(
    () => editorTabs.find((t) => t.id === activeEditorTabId) ?? null,
    [editorTabs, activeEditorTabId]
  );
  const selectedRelPath = reactExports.useMemo(
    () => activeEditorTab && isFileTab(activeEditorTab) ? activeEditorTab.relPath : null,
    [activeEditorTab]
  );
  const refreshFiles = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.listWorkspacePanelTree) {
      setFilesErr(WORKSPACE_TREE_OFFLINE);
      setTree([]);
      return;
    }
    setLoadingFiles(true);
    setFilesErr(null);
    try {
      const r = await api.listWorkspacePanelTree();
      if (!r.ok) {
        setRootLabel(r.root ? shortenHomeInPath$1(r.root) : "（未选择工作区）");
        setTree([]);
        setGitStatusByPath(/* @__PURE__ */ new Map());
        setGitHasDecoration(/* @__PURE__ */ new Set());
        setFilesErr(r.error || "无法列出文件");
        return;
      }
      const root2 = r.root?.trim() || "";
      setRootLabel(root2 ? shortenHomeInPath$1(root2) : "（未选择工作区）");
      setTree(Array.isArray(r.tree) ? r.tree : []);
      let gitEntries = Array.isArray(r.gitStatus) ? r.gitStatus : Array.isArray(r.gitChanged) ? r.gitChanged.map((p) => ({ path: p, letter: "M" })) : [];
      if (!gitEntries.length && api.workspaceGetGitDiff) {
        try {
          const diff = await api.workspaceGetGitDiff();
          if (diff.ok && diff.statusLine) {
            gitEntries = parseGitStatusShortBranch(diff.statusLine);
          }
        } catch {
        }
      }
      const decor = buildExplorerGitDecor(gitEntries);
      setGitStatusByPath(decor.statusByPath);
      setGitHasDecoration(decor.hasDecoration);
      if (!root2) setFilesErr("请先在「工作目录」中选择工作区。");
    } catch (e) {
      setFilesErr(e instanceof Error ? e.message : String(e));
      setTree([]);
      setGitStatusByPath(/* @__PURE__ */ new Map());
      setGitHasDecoration(/* @__PURE__ */ new Set());
    } finally {
      setLoadingFiles(false);
    }
  }, []);
  const refreshShell = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceGetShellSnapshot) {
      setShellErr("当前环境不支持 Git 快照。");
      setShellText("");
      return;
    }
    setLoadingShell(true);
    setShellErr(null);
    try {
      const r = await api.workspaceGetShellSnapshot();
      if (!r.ok) {
        setShellText("");
        setShellErr(r.error || "读取失败");
        return;
      }
      setShellText((r.text || "").trim() || "（无输出）");
    } catch (e) {
      setShellErr(e instanceof Error ? e.message : String(e));
      setShellText("");
    } finally {
      setLoadingShell(false);
    }
  }, []);
  const refreshDiff = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceGetGitDiff) {
      setDiffErr("当前环境不支持改动预览。");
      setDiffText("");
      return;
    }
    setLoadingDiff(true);
    setDiffErr(null);
    try {
      const r = await api.workspaceGetGitDiff();
      if (!r.ok) {
        setDiffText("");
        setDiffErr(r.error || "读取失败");
        setStatusLine("");
        return;
      }
      setStatusLine((r.statusLine || "").trim());
      setDiffText((r.diff || "").trim() || "（无未提交改动）");
    } catch (e) {
      setDiffErr(e instanceof Error ? e.message : String(e));
      setDiffText("");
    } finally {
      setLoadingDiff(false);
    }
  }, []);
  const loadFileTabContent = reactExports.useCallback(async (tabId, relPath) => {
    const api = getDesktop();
    if (!api?.readWorkspaceTextFile) return;
    try {
      const r = await api.readWorkspaceTextFile(relPath);
      setEditorTabs(
        (prev) => prev.map((t) => {
          if (t.id !== tabId || !isFileTab(t)) return t;
          if (!r.ok) {
            return { ...t, loading: false, error: r.error || "读取失败", content: "" };
          }
          const binary = isBinaryFileResult(relPath, r.text, r.binary);
          if (binary) {
            return {
              ...t,
              loading: false,
              error: null,
              content: "",
              savedContent: "",
              dirty: false,
              saving: false,
              truncated: Boolean(r.truncated),
              binary: true,
              size: r.size,
              binaryBase64: r.base64 ?? null,
              previewBytes: r.previewBytes
            };
          }
          const text2 = normalizeFileContentForEditor(relPath, r.text ?? "");
          return {
            ...t,
            loading: false,
            error: null,
            content: text2,
            savedContent: text2,
            dirty: false,
            saving: false,
            truncated: Boolean(r.truncated),
            binary: false,
            size: r.size,
            binaryBase64: null,
            previewBytes: void 0
          };
        })
      );
      if (!r.ok || isBinaryFileResult(relPath, r.text, r.binary)) return;
      try {
        requestWorkbenchLint([relPath], "open");
      } catch {
      }
    } catch (e) {
      setEditorTabs(
        (prev) => prev.map((t) => {
          if (t.id !== tabId || !isFileTab(t)) return t;
          return {
            ...t,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
            content: ""
          };
        })
      );
    }
  }, []);
  const openFile = reactExports.useCallback(
    async (relPath, opts) => {
      if (opts?.line != null) {
        setPendingLineGoto(relPath, opts.line, opts.column ?? 1);
      }
      const api = getDesktop();
      if (!api?.readWorkspaceTextFile) return;
      const existing = editorTabs.find((t) => isFileTab(t) && t.relPath === relPath);
      if (existing) {
        setActiveEditorTabId(existing.id);
        if (!existing.dirty) {
          void loadFileTabContent(existing.id, relPath);
        }
        return;
      }
      const tabId = makeTabId("file");
      const label = fileNameFromRel(relPath);
      const newTab = {
        id: tabId,
        kind: "file",
        relPath,
        label,
        content: "",
        savedContent: "",
        dirty: false,
        saving: false,
        loading: true,
        error: null,
        truncated: false,
        binary: false
      };
      setEditorTabs((prev) => [...prev, newTab]);
      setActiveEditorTabId(tabId);
      await loadFileTabContent(tabId, relPath);
    },
    [editorTabs, loadFileTabContent]
  );
  const openBrowserTab = reactExports.useCallback(
    (url, opts) => {
      const resolved = opts?.blobUrl ?? (url ? normalizeBrowserUrl(url) : "about:blank");
      const label = opts?.label || (resolved === "about:blank" ? "浏览器" : (() => {
        try {
          return new URL(resolved).host || "浏览器";
        } catch {
          return "浏览器";
        }
      })());
      const tabId = makeTabId("browser");
      const newTab = {
        id: tabId,
        kind: "browser",
        url: resolved,
        label,
        blobUrl: opts?.blobUrl ?? null
      };
      setEditorTabs((prev) => [...prev, newTab]);
      setActiveEditorTabId(tabId);
    },
    []
  );
  const navigateBrowserTab = reactExports.useCallback((tabId, url) => {
    const resolved = normalizeBrowserUrl(url);
    setEditorTabs(
      (prev) => prev.map((t) => {
        if (t.id !== tabId || !isBrowserTab(t)) return t;
        if (t.blobUrl?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(t.blobUrl);
          } catch {
          }
        }
        let label = "浏览器";
        try {
          label = new URL(resolved).host || "浏览器";
        } catch {
        }
        return { ...t, url: resolved, label, blobUrl: null };
      })
    );
  }, []);
  const setActiveEditorTab = reactExports.useCallback((tabId) => {
    setActiveEditorTabId(tabId);
  }, []);
  const closeEditorTab = reactExports.useCallback(
    (tabId) => {
      const closing = editorTabs.find((t) => t.id === tabId);
      if (closing) revokeBlobUrl(closing);
      setEditorTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (activeEditorTabId === tabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          const fallback = next[idx] ?? next[idx - 1] ?? null;
          setActiveEditorTabId(fallback?.id ?? null);
        }
        return next;
      });
    },
    [editorTabs, activeEditorTabId]
  );
  const closePreview = reactExports.useCallback(() => {
    if (activeEditorTabId) closeEditorTab(activeEditorTabId);
  }, [activeEditorTabId, closeEditorTab]);
  const updateFileTabContent = reactExports.useCallback((tabId, content2) => {
    setEditorTabs(
      (prev) => prev.map((t) => {
        if (t.id !== tabId || !isFileTab(t)) return t;
        return { ...t, content: content2, dirty: content2 !== t.savedContent };
      })
    );
  }, []);
  const saveFileTab = reactExports.useCallback(async (tabId) => {
    const tab2 = editorTabs.find((t) => t.id === tabId && isFileTab(t));
    if (!tab2 || !isFileTab(tab2)) return;
    const api = getDesktop();
    if (!api?.workspaceApplyWriteFence) {
      toast.error("无法保存文件");
      return;
    }
    setEditorTabs(
      (prev) => prev.map((t) => t.id === tabId && isFileTab(t) ? { ...t, saving: true } : t)
    );
    try {
      const result = await api.workspaceApplyWriteFence([{ path: tab2.relPath, content: tab2.content }]);
      if (result.ok && result.written?.length) {
        setEditorTabs(
          (prev) => prev.map((t) => {
            if (t.id !== tabId || !isFileTab(t)) return t;
            return { ...t, savedContent: t.content, dirty: false, saving: false };
          })
        );
        toast.success("文件已保存");
        try {
          requestWorkbenchLint([tab2.relPath]);
        } catch {
        }
        void refreshFiles();
      } else {
        toast.error(result.error || "保存失败");
        setEditorTabs(
          (prev) => prev.map((t) => t.id === tabId && isFileTab(t) ? { ...t, saving: false } : t)
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
      setEditorTabs(
        (prev) => prev.map((t) => t.id === tabId && isFileTab(t) ? { ...t, saving: false } : t)
      );
    }
  }, [editorTabs, refreshFiles]);
  reactExports.useEffect(() => {
    if (!desktopReady) return;
    void refreshFiles();
  }, [desktopReady, refreshFiles]);
  reactExports.useEffect(() => {
    const api = getDesktop();
    if (!api?.onWorkspaceChanged) return;
    const off = api.onWorkspaceChanged(() => {
      void refreshFiles();
    });
    return () => {
      try {
        off?.();
      } catch {
      }
    };
  }, [refreshFiles]);
  const value = reactExports.useMemo(
    () => ({
      rootLabel,
      tree,
      gitStatusByPath,
      gitHasDecoration,
      filesErr,
      loadingFiles,
      selectedRelPath,
      editorTabs,
      activeEditorTabId,
      activeEditorTab,
      shellText,
      shellErr,
      loadingShell,
      diffText,
      diffErr,
      statusLine,
      loadingDiff,
      openFile,
      openBrowserTab,
      navigateBrowserTab,
      setActiveEditorTab,
      closeEditorTab,
      closePreview,
      updateFileTabContent,
      saveFileTab,
      refreshFiles,
      refreshShell,
      refreshDiff
    }),
    [
      rootLabel,
      tree,
      gitStatusByPath,
      gitHasDecoration,
      filesErr,
      loadingFiles,
      selectedRelPath,
      editorTabs,
      activeEditorTabId,
      activeEditorTab,
      shellText,
      shellErr,
      loadingShell,
      diffText,
      diffErr,
      statusLine,
      loadingDiff,
      openFile,
      openBrowserTab,
      navigateBrowserTab,
      setActiveEditorTab,
      closeEditorTab,
      closePreview,
      updateFileTabContent,
      saveFileTab,
      refreshFiles,
      refreshShell,
      refreshDiff
    ]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchWorkspaceContext.Provider, { value, children });
}
function useWorkbenchWorkspace() {
  const ctx = reactExports.useContext(WorkbenchWorkspaceContext);
  if (!ctx) throw new Error("useWorkbenchWorkspace must be used within WorkbenchWorkspaceProvider");
  return ctx;
}
const WorkbenchComposerBridgeContext = reactExports.createContext(null);
function WorkbenchComposerBridgeProvider({ children }) {
  const handlersRef = reactExports.useRef(null);
  const registerComposerHandlers = reactExports.useCallback((handlers2) => {
    handlersRef.current = handlers2;
    return () => {
      if (handlersRef.current === handlers2) handlersRef.current = null;
    };
  }, []);
  const addTerminalSelectionToChat = reactExports.useCallback((payload) => {
    const trimmed = payload.text.trim();
    if (!trimmed) return;
    handlersRef.current?.openChatPanel?.();
    handlersRef.current?.insertTerminalSelection({ ...payload, text: trimmed });
  }, []);
  const value = reactExports.useMemo(
    () => ({ registerComposerHandlers, addTerminalSelectionToChat }),
    [registerComposerHandlers, addTerminalSelectionToChat]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchComposerBridgeContext.Provider, { value, children });
}
function useWorkbenchComposerBridge() {
  const ctx = reactExports.useContext(WorkbenchComposerBridgeContext);
  if (!ctx) {
    throw new Error(
      "useWorkbenchComposerBridge must be used within WorkbenchComposerBridgeProvider"
    );
  }
  return ctx;
}
function useWorkbenchComposerBridgeOptional() {
  return reactExports.useContext(WorkbenchComposerBridgeContext);
}
const WorkbenchTerminalBridgeContext = reactExports.createContext(null);
function WorkbenchTerminalBridgeProvider({ children }) {
  const handlersRef = reactExports.useRef(null);
  const registerTerminalHandlers = reactExports.useCallback((handlers2) => {
    handlersRef.current = handlers2;
    return () => {
      if (handlersRef.current === handlers2) handlersRef.current = null;
    };
  }, []);
  const runInActiveTerminal = reactExports.useCallback((command) => {
    const cmd = command.trim();
    if (!cmd) return false;
    return handlersRef.current?.runInActive(cmd) ?? false;
  }, []);
  const ensureTerminalSession = reactExports.useCallback(() => {
    handlersRef.current?.ensureSession();
  }, []);
  const isTerminalReady = reactExports.useCallback(() => handlersRef.current?.isActiveReady() ?? false, []);
  const focusTerminalTab = reactExports.useCallback(() => {
    handlersRef.current?.focusTerminalTab?.();
  }, []);
  const value = reactExports.useMemo(
    () => ({
      registerTerminalHandlers,
      runInActiveTerminal,
      ensureTerminalSession,
      isTerminalReady,
      focusTerminalTab
    }),
    [registerTerminalHandlers, runInActiveTerminal, ensureTerminalSession, isTerminalReady, focusTerminalTab]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchTerminalBridgeContext.Provider, { value, children });
}
let state = { count: 0, undoAll: null, review: null };
const listeners$2 = /* @__PURE__ */ new Set();
function emit$2() {
  listeners$2.forEach((fn) => fn());
}
function subscribeComposerFileBar(fn) {
  listeners$2.add(fn);
  return () => listeners$2.delete(fn);
}
function getComposerFileBarState() {
  return state;
}
function setComposerFileBarState(next) {
  state = next;
  emit$2();
}
function WorkbenchComposerFileSync() {
  const ws = useWorkbenchWorkspace();
  const count = reactExports.useMemo(
    () => ws.editorTabs.filter((t) => isFileTab(t) && t.dirty).length,
    [ws.editorTabs]
  );
  reactExports.useEffect(() => {
    setComposerFileBarState({
      count,
      undoAll: () => {
        for (const tab2 of ws.editorTabs) {
          if (isFileTab(tab2) && tab2.dirty) {
            ws.updateFileTabContent(tab2.id, tab2.savedContent);
          }
        }
      },
      review: () => {
        const first = ws.editorTabs.find((t) => isFileTab(t) && t.dirty);
        if (first && isFileTab(first)) void ws.openFile(first.relPath);
      }
    });
    return () => setComposerFileBarState({ count: 0, undoAll: null, review: null });
  }, [count, ws]);
  return null;
}
function isProjectPreviewMessage(text2) {
  const t = text2.trim();
  if (!t || t.length > 160) return false;
  if (/^(?:\/preview|\/run(?:-project)?)\b/i.test(t)) return true;
  return /(?:预览|查看|看看|打开|怎么|如何).*(?:页面|效果|界面|login|登录|注册|项目|py|python|后端|api|接口)/i.test(t) || /(?:py|python|\.py|后端|api).*(?:预览|效果|运行|查看)/i.test(t) || /(?:运行|启动|run|start|preview).*(?:项目|应用|dev|开发服务器|本地服务|后端|api)/i.test(t) || /刚刚生成.*(?:预览|效果|运行)/i.test(t) || /^(?:预览|运行)\s*\S+/i.test(t);
}
function isPythonPreviewQuestion(text2) {
  const t = text2.trim();
  return /(?:py|python|\.py|后端|api|接口|flask|auth)/i.test(t) && /(?:预览|效果|运行|查看|怎么|如何)/i.test(t);
}
function extractPreviewHint(text2) {
  const t = text2.trim();
  const patterns = [
    /(?:预览|查看|打开|运行)\s*(?:一下\s*)?(.+?)(?:页面|界面|效果|项目)?\s*$/i,
    /(?:preview|run)\s+(.+)$/i,
    /\/preview\s+(.+)$/i
  ];
  for (const re2 of patterns) {
    const m = t.match(re2);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  if (/登录|login/i.test(t)) return "login";
  if (/注册|register/i.test(t)) return "register";
  if (/首页|index|home/i.test(t)) return "index";
  return "";
}
function formatPreviewAssistantReply(res) {
  const parts = [];
  if (res.guide?.trim()) parts.push(res.guide.trim());
  if (!res.ok || !res.url) {
    parts.push(
      `【项目预览】未能启动。
- 原因：${res.error || "未知错误"}
- 静态页：确保存在 \`src/login.html\`；Node 项目需 \`package.json\` 的 \`dev\` 脚本。
- Python 后端：需 \`pip install flask\`，Orchestrator 会生成 \`src/backend/preview_app.py\`。`
    );
    return parts.join("\n\n");
  }
  parts.push(
    "【项目预览】已启动。",
    `- 方式：${res.label || res.kind || "preview"}`,
    `- 地址：[${res.url}](${res.url})`
  );
  if (res.entryRel) parts.push(`- 入口：\`${res.entryRel}\``);
  if (res.command) parts.push(`- 命令：\`${res.command}\``);
  if (res.kind === "python") {
    parts.push(
      "",
      "可用 curl 冒烟测试，例如：",
      "```bash",
      "curl -s http://127.0.0.1:5000/health",
      `curl -s -X POST http://127.0.0.1:5000/api/auth/login_by_phone -H "Content-Type: application/json" -d '{"phone_number":"13800000000","verification_code":"123456"}'`,
      "```"
    );
  }
  parts.push("", "发送「停止预览」可关闭本地静态服务；Python/Node dev 进程需自行在终端结束。");
  return parts.join("\n");
}
async function performProjectPreview(api, userLine, opts) {
  if (!api.workspaceStartPreview) {
    return {
      ok: false,
      displayText: `【项目预览】${PROJECT_PREVIEW_UNSUPPORTED}`,
      error: "RPC 不可用"
    };
  }
  const hint = extractPreviewHint(userLine);
  const preferPython = opts?.preferPython ?? isPythonPreviewQuestion(userLine);
  const preferStatic = opts?.preferStatic ?? (!preferPython && /页面|html|登录|register|静态|界面|效果/i.test(userLine));
  const res = await api.workspaceStartPreview({
    hint,
    preferStatic,
    preferPython,
    entryRel: opts?.entryRel
  });
  let displayText = formatPreviewAssistantReply(res);
  if (res.ok && res.url) {
    if (res.kind === "python") {
      await openExternalUrl(`${res.url.replace(/\/$/, "")}/health`);
    } else {
      await openExternalUrl(res.url);
    }
  } else if (res.error && /未知 RPC|workspace:startPreview/i.test(res.error)) {
    return {
      ok: false,
      displayText: `【项目预览】${PROJECT_PREVIEW_API_MISSING}`,
      url: null,
      error: res.error
    };
  }
  return {
    ok: Boolean(res.ok && res.url),
    displayText,
    url: res.url,
    error: res.error
  };
}
function isStopPreviewMessage(text2) {
  const t = text2.trim();
  return /^(?:停止预览|关闭预览|\/preview-stop)\s*[!！。.]*$/iu.test(t);
}
async function performStopPreview(api) {
  if (!api.workspaceStopPreview) {
    return `【项目预览】${PROJECT_PREVIEW_STOP_UNSUPPORTED}`;
  }
  await api.workspaceStopPreview();
  return "【项目预览】已停止本地静态预览服务。";
}
function WorkbenchEditorToolbar({
  relPath,
  dirty,
  saving,
  readOnly,
  onSave,
  viewMode,
  onViewModeChange,
  extraActions
}) {
  const isMd = isMarkdownPath(relPath);
  const fileName = relPath.split("/").pop() || relPath;
  const ext = fileName.includes(".") ? fileName.split(".").pop() : void 0;
  const Icon = fileIconFor(ext, fileName);
  const segments = relPath.split("/").filter(Boolean);
  const dirs = segments.slice(0, -1);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-2 border-b border-border/50 bg-surface-elevated/60 px-2 py-1 sm:px-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "nav",
      {
        className: "flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-[11px]",
        "aria-label": "文件路径",
        children: [
          dirs.map((seg, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
            i > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3 shrink-0 text-muted-foreground/45" }) : null,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-muted-foreground", title: seg, children: seg })
          ] }, `${i}-${seg}`)),
          dirs.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-3 w-3 shrink-0 text-muted-foreground/45" }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: cn("h-3.5 w-3.5 shrink-0", fileIconClass(ext, fileName)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate font-medium text-foreground", title: relPath, children: fileName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1.5 hidden shrink-0 rounded border border-border/70 bg-background/50 px-1.5 py-px text-[10px] text-muted-foreground sm:inline", children: editorLanguageLabel(relPath) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
      extraActions,
      isMd && viewMode && onViewModeChange ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex rounded-md border border-border bg-background p-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ViewToggle,
          {
            active: viewMode === "preview",
            onClick: () => onViewModeChange("preview"),
            label: "Preview"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ViewToggle,
          {
            active: viewMode === "source",
            onClick: () => onViewModeChange("source"),
            label: "Markdown"
          }
        )
      ] }) : null,
      dirty ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-medium text-primary", children: "未保存" }) : null,
      !readOnly && onSave ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onSave,
          disabled: !dirty || saving,
          className: cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition",
            dirty ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15" : "border-border text-muted-foreground opacity-50"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: cn("h-3 w-3", saving && "animate-pulse") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: saving ? "保存中…" : "保存" })
          ]
        }
      ) : null
    ] })
  ] });
}
function ViewToggle({
  active,
  onClick,
  label
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick,
      className: cn(
        "rounded px-2 py-0.5 text-[10.5px] font-medium transition",
        active ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      ),
      children: label
    }
  );
}
function ok$1() {
}
function unreachable() {
}
function stringify$1(values, options) {
  const settings = {};
  const input = values[values.length - 1] === "" ? [...values, ""] : values;
  return input.join(
    (settings.padRight ? " " : "") + "," + (settings.padLeft === false ? "" : " ")
  ).trim();
}
const nameRe = /^[$_\p{ID_Start}][$_\u{200C}\u{200D}\p{ID_Continue}]*$/u;
const nameReJsx = /^[$_\p{ID_Start}][-$_\u{200C}\u{200D}\p{ID_Continue}]*$/u;
const emptyOptions$3 = {};
function name(name2, options) {
  const settings = emptyOptions$3;
  const re2 = settings.jsx ? nameReJsx : nameRe;
  return re2.test(name2);
}
const re = /[ \t\n\f\r]/g;
function whitespace(thing) {
  return typeof thing === "object" ? thing.type === "text" ? empty$1(thing.value) : false : empty$1(thing);
}
function empty$1(value) {
  return value.replace(re, "") === "";
}
class Schema {
  /**
   * @param {SchemaType['property']} property
   *   Property.
   * @param {SchemaType['normal']} normal
   *   Normal.
   * @param {Space | undefined} [space]
   *   Space.
   * @returns
   *   Schema.
   */
  constructor(property, normal, space2) {
    this.normal = normal;
    this.property = property;
    if (space2) {
      this.space = space2;
    }
  }
}
Schema.prototype.normal = {};
Schema.prototype.property = {};
Schema.prototype.space = void 0;
function merge(definitions, space2) {
  const property = {};
  const normal = {};
  for (const definition2 of definitions) {
    Object.assign(property, definition2.property);
    Object.assign(normal, definition2.normal);
  }
  return new Schema(property, normal, space2);
}
function normalize$1(value) {
  return value.toLowerCase();
}
class Info {
  /**
   * @param {string} property
   *   Property.
   * @param {string} attribute
   *   Attribute.
   * @returns
   *   Info.
   */
  constructor(property, attribute) {
    this.attribute = attribute;
    this.property = property;
  }
}
Info.prototype.attribute = "";
Info.prototype.booleanish = false;
Info.prototype.boolean = false;
Info.prototype.commaOrSpaceSeparated = false;
Info.prototype.commaSeparated = false;
Info.prototype.defined = false;
Info.prototype.mustUseProperty = false;
Info.prototype.number = false;
Info.prototype.overloadedBoolean = false;
Info.prototype.property = "";
Info.prototype.spaceSeparated = false;
Info.prototype.space = void 0;
let powers = 0;
const boolean = increment();
const booleanish = increment();
const overloadedBoolean = increment();
const number = increment();
const spaceSeparated = increment();
const commaSeparated = increment();
const commaOrSpaceSeparated = increment();
function increment() {
  return 2 ** ++powers;
}
const types = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  boolean,
  booleanish,
  commaOrSpaceSeparated,
  commaSeparated,
  number,
  overloadedBoolean,
  spaceSeparated
}, Symbol.toStringTag, { value: "Module" }));
const checks = (
  /** @type {ReadonlyArray<keyof typeof types>} */
  Object.keys(types)
);
class DefinedInfo extends Info {
  /**
   * @constructor
   * @param {string} property
   *   Property.
   * @param {string} attribute
   *   Attribute.
   * @param {number | null | undefined} [mask]
   *   Mask.
   * @param {Space | undefined} [space]
   *   Space.
   * @returns
   *   Info.
   */
  constructor(property, attribute, mask, space2) {
    let index2 = -1;
    super(property, attribute);
    mark(this, "space", space2);
    if (typeof mask === "number") {
      while (++index2 < checks.length) {
        const check = checks[index2];
        mark(this, checks[index2], (mask & types[check]) === types[check]);
      }
    }
  }
}
DefinedInfo.prototype.defined = true;
function mark(values, key, value) {
  if (value) {
    values[key] = value;
  }
}
function create(definition2) {
  const properties = {};
  const normals = {};
  for (const [property, value] of Object.entries(definition2.properties)) {
    const info = new DefinedInfo(
      property,
      definition2.transform(definition2.attributes || {}, property),
      value,
      definition2.space
    );
    if (definition2.mustUseProperty && definition2.mustUseProperty.includes(property)) {
      info.mustUseProperty = true;
    }
    properties[property] = info;
    normals[normalize$1(property)] = property;
    normals[normalize$1(info.attribute)] = property;
  }
  return new Schema(properties, normals, definition2.space);
}
const aria = create({
  properties: {
    ariaActiveDescendant: null,
    ariaAtomic: booleanish,
    ariaAutoComplete: null,
    ariaBusy: booleanish,
    ariaChecked: booleanish,
    ariaColCount: number,
    ariaColIndex: number,
    ariaColSpan: number,
    ariaControls: spaceSeparated,
    ariaCurrent: null,
    ariaDescribedBy: spaceSeparated,
    ariaDetails: null,
    ariaDisabled: booleanish,
    ariaDropEffect: spaceSeparated,
    ariaErrorMessage: null,
    ariaExpanded: booleanish,
    ariaFlowTo: spaceSeparated,
    ariaGrabbed: booleanish,
    ariaHasPopup: null,
    ariaHidden: booleanish,
    ariaInvalid: null,
    ariaKeyShortcuts: null,
    ariaLabel: null,
    ariaLabelledBy: spaceSeparated,
    ariaLevel: number,
    ariaLive: null,
    ariaModal: booleanish,
    ariaMultiLine: booleanish,
    ariaMultiSelectable: booleanish,
    ariaOrientation: null,
    ariaOwns: spaceSeparated,
    ariaPlaceholder: null,
    ariaPosInSet: number,
    ariaPressed: booleanish,
    ariaReadOnly: booleanish,
    ariaRelevant: null,
    ariaRequired: booleanish,
    ariaRoleDescription: spaceSeparated,
    ariaRowCount: number,
    ariaRowIndex: number,
    ariaRowSpan: number,
    ariaSelected: booleanish,
    ariaSetSize: number,
    ariaSort: null,
    ariaValueMax: number,
    ariaValueMin: number,
    ariaValueNow: number,
    ariaValueText: null,
    role: null
  },
  transform(_, property) {
    return property === "role" ? property : "aria-" + property.slice(4).toLowerCase();
  }
});
function caseSensitiveTransform(attributes, attribute) {
  return attribute in attributes ? attributes[attribute] : attribute;
}
function caseInsensitiveTransform(attributes, property) {
  return caseSensitiveTransform(attributes, property.toLowerCase());
}
const html$3 = create({
  attributes: {
    acceptcharset: "accept-charset",
    classname: "class",
    htmlfor: "for",
    httpequiv: "http-equiv"
  },
  mustUseProperty: ["checked", "multiple", "muted", "selected"],
  properties: {
    // Standard Properties.
    abbr: null,
    accept: commaSeparated,
    acceptCharset: spaceSeparated,
    accessKey: spaceSeparated,
    action: null,
    allow: null,
    allowFullScreen: boolean,
    allowPaymentRequest: boolean,
    allowUserMedia: boolean,
    alpha: boolean,
    alt: null,
    as: null,
    async: boolean,
    autoCapitalize: null,
    autoComplete: spaceSeparated,
    autoFocus: boolean,
    autoPlay: boolean,
    blocking: spaceSeparated,
    capture: null,
    charSet: null,
    checked: boolean,
    cite: null,
    className: spaceSeparated,
    closedBy: null,
    colorSpace: null,
    cols: number,
    colSpan: number,
    command: null,
    commandFor: null,
    content: null,
    contentEditable: booleanish,
    controls: boolean,
    controlsList: spaceSeparated,
    coords: number | commaSeparated,
    crossOrigin: null,
    data: null,
    dateTime: null,
    decoding: null,
    default: boolean,
    defer: boolean,
    dir: null,
    dirName: null,
    disabled: boolean,
    download: overloadedBoolean,
    draggable: booleanish,
    encType: null,
    enterKeyHint: null,
    fetchPriority: null,
    form: null,
    formAction: null,
    formEncType: null,
    formMethod: null,
    formNoValidate: boolean,
    formTarget: null,
    headers: spaceSeparated,
    height: number,
    hidden: overloadedBoolean,
    high: number,
    href: null,
    hrefLang: null,
    htmlFor: spaceSeparated,
    httpEquiv: spaceSeparated,
    id: null,
    imageSizes: null,
    imageSrcSet: null,
    inert: boolean,
    inputMode: null,
    integrity: null,
    is: null,
    isMap: boolean,
    itemId: null,
    itemProp: spaceSeparated,
    itemRef: spaceSeparated,
    itemScope: boolean,
    itemType: spaceSeparated,
    kind: null,
    label: null,
    lang: null,
    language: null,
    list: null,
    loading: null,
    loop: boolean,
    low: number,
    manifest: null,
    max: null,
    maxLength: number,
    media: null,
    method: null,
    min: null,
    minLength: number,
    multiple: boolean,
    muted: boolean,
    name: null,
    nonce: null,
    noModule: boolean,
    noValidate: boolean,
    onAbort: null,
    onAfterPrint: null,
    onAuxClick: null,
    onBeforeMatch: null,
    onBeforePrint: null,
    onBeforeToggle: null,
    onBeforeUnload: null,
    onBlur: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onContextLost: null,
    onContextMenu: null,
    onContextRestored: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFormData: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLanguageChange: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadEnd: null,
    onLoadStart: null,
    onMessage: null,
    onMessageError: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRejectionHandled: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onScrollEnd: null,
    onSecurityPolicyViolation: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onSlotChange: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnhandledRejection: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onWheel: null,
    open: boolean,
    optimum: number,
    pattern: null,
    ping: spaceSeparated,
    placeholder: null,
    playsInline: boolean,
    popover: null,
    popoverTarget: null,
    popoverTargetAction: null,
    poster: null,
    preload: null,
    readOnly: boolean,
    referrerPolicy: null,
    rel: spaceSeparated,
    required: boolean,
    reversed: boolean,
    rows: number,
    rowSpan: number,
    sandbox: spaceSeparated,
    scope: null,
    scoped: boolean,
    seamless: boolean,
    selected: boolean,
    shadowRootClonable: boolean,
    shadowRootCustomElementRegistry: boolean,
    shadowRootDelegatesFocus: boolean,
    shadowRootMode: null,
    shadowRootSerializable: boolean,
    shape: null,
    size: number,
    sizes: null,
    slot: null,
    span: number,
    spellCheck: booleanish,
    src: null,
    srcDoc: null,
    srcLang: null,
    srcSet: null,
    start: number,
    step: null,
    style: null,
    tabIndex: number,
    target: null,
    title: null,
    translate: null,
    type: null,
    typeMustMatch: boolean,
    useMap: null,
    value: booleanish,
    width: number,
    wrap: null,
    writingSuggestions: null,
    // Legacy.
    // See: https://html.spec.whatwg.org/#other-elements,-attributes-and-apis
    align: null,
    // Several. Use CSS `text-align` instead,
    aLink: null,
    // `<body>`. Use CSS `a:active {color}` instead
    archive: spaceSeparated,
    // `<object>`. List of URIs to archives
    axis: null,
    // `<td>` and `<th>`. Use `scope` on `<th>`
    background: null,
    // `<body>`. Use CSS `background-image` instead
    bgColor: null,
    // `<body>` and table elements. Use CSS `background-color` instead
    border: number,
    // `<table>`. Use CSS `border-width` instead,
    borderColor: null,
    // `<table>`. Use CSS `border-color` instead,
    bottomMargin: number,
    // `<body>`
    cellPadding: null,
    // `<table>`
    cellSpacing: null,
    // `<table>`
    char: null,
    // Several table elements. When `align=char`, sets the character to align on
    charOff: null,
    // Several table elements. When `char`, offsets the alignment
    classId: null,
    // `<object>`
    clear: null,
    // `<br>`. Use CSS `clear` instead
    code: null,
    // `<object>`
    codeBase: null,
    // `<object>`
    codeType: null,
    // `<object>`
    color: null,
    // `<font>` and `<hr>`. Use CSS instead
    compact: boolean,
    // Lists. Use CSS to reduce space between items instead
    declare: boolean,
    // `<object>`
    event: null,
    // `<script>`
    face: null,
    // `<font>`. Use CSS instead
    frame: null,
    // `<table>`
    frameBorder: null,
    // `<iframe>`. Use CSS `border` instead
    hSpace: number,
    // `<img>` and `<object>`
    leftMargin: number,
    // `<body>`
    link: null,
    // `<body>`. Use CSS `a:link {color: *}` instead
    longDesc: null,
    // `<frame>`, `<iframe>`, and `<img>`. Use an `<a>`
    lowSrc: null,
    // `<img>`. Use a `<picture>`
    marginHeight: number,
    // `<body>`
    marginWidth: number,
    // `<body>`
    noResize: boolean,
    // `<frame>`
    noHref: boolean,
    // `<area>`. Use no href instead of an explicit `nohref`
    noShade: boolean,
    // `<hr>`. Use background-color and height instead of borders
    noWrap: boolean,
    // `<td>` and `<th>`
    object: null,
    // `<applet>`
    profile: null,
    // `<head>`
    prompt: null,
    // `<isindex>`
    rev: null,
    // `<link>`
    rightMargin: number,
    // `<body>`
    rules: null,
    // `<table>`
    scheme: null,
    // `<meta>`
    scrolling: booleanish,
    // `<frame>`. Use overflow in the child context
    standby: null,
    // `<object>`
    summary: null,
    // `<table>`
    text: null,
    // `<body>`. Use CSS `color` instead
    topMargin: number,
    // `<body>`
    valueType: null,
    // `<param>`
    version: null,
    // `<html>`. Use a doctype.
    vAlign: null,
    // Several. Use CSS `vertical-align` instead
    vLink: null,
    // `<body>`. Use CSS `a:visited {color}` instead
    vSpace: number,
    // `<img>` and `<object>`
    // Non-standard Properties.
    allowTransparency: null,
    autoCorrect: null,
    autoSave: null,
    credentialless: boolean,
    disablePictureInPicture: boolean,
    disableRemotePlayback: boolean,
    exportParts: commaSeparated,
    part: spaceSeparated,
    prefix: null,
    property: null,
    results: number,
    security: null,
    unselectable: null
  },
  space: "html",
  transform: caseInsensitiveTransform
});
const svg$1 = create({
  attributes: {
    accentHeight: "accent-height",
    alignmentBaseline: "alignment-baseline",
    arabicForm: "arabic-form",
    baselineShift: "baseline-shift",
    capHeight: "cap-height",
    className: "class",
    clipPath: "clip-path",
    clipRule: "clip-rule",
    colorInterpolation: "color-interpolation",
    colorInterpolationFilters: "color-interpolation-filters",
    colorProfile: "color-profile",
    colorRendering: "color-rendering",
    crossOrigin: "crossorigin",
    dataType: "datatype",
    dominantBaseline: "dominant-baseline",
    enableBackground: "enable-background",
    fillOpacity: "fill-opacity",
    fillRule: "fill-rule",
    floodColor: "flood-color",
    floodOpacity: "flood-opacity",
    fontFamily: "font-family",
    fontSize: "font-size",
    fontSizeAdjust: "font-size-adjust",
    fontStretch: "font-stretch",
    fontStyle: "font-style",
    fontVariant: "font-variant",
    fontWeight: "font-weight",
    glyphName: "glyph-name",
    glyphOrientationHorizontal: "glyph-orientation-horizontal",
    glyphOrientationVertical: "glyph-orientation-vertical",
    hrefLang: "hreflang",
    horizAdvX: "horiz-adv-x",
    horizOriginX: "horiz-origin-x",
    horizOriginY: "horiz-origin-y",
    imageRendering: "image-rendering",
    letterSpacing: "letter-spacing",
    lightingColor: "lighting-color",
    markerEnd: "marker-end",
    markerMid: "marker-mid",
    markerStart: "marker-start",
    maskType: "mask-type",
    navDown: "nav-down",
    navDownLeft: "nav-down-left",
    navDownRight: "nav-down-right",
    navLeft: "nav-left",
    navNext: "nav-next",
    navPrev: "nav-prev",
    navRight: "nav-right",
    navUp: "nav-up",
    navUpLeft: "nav-up-left",
    navUpRight: "nav-up-right",
    onAbort: "onabort",
    onActivate: "onactivate",
    onAfterPrint: "onafterprint",
    onBeforePrint: "onbeforeprint",
    onBegin: "onbegin",
    onCancel: "oncancel",
    onCanPlay: "oncanplay",
    onCanPlayThrough: "oncanplaythrough",
    onChange: "onchange",
    onClick: "onclick",
    onClose: "onclose",
    onCopy: "oncopy",
    onCueChange: "oncuechange",
    onCut: "oncut",
    onDblClick: "ondblclick",
    onDrag: "ondrag",
    onDragEnd: "ondragend",
    onDragEnter: "ondragenter",
    onDragExit: "ondragexit",
    onDragLeave: "ondragleave",
    onDragOver: "ondragover",
    onDragStart: "ondragstart",
    onDrop: "ondrop",
    onDurationChange: "ondurationchange",
    onEmptied: "onemptied",
    onEnd: "onend",
    onEnded: "onended",
    onError: "onerror",
    onFocus: "onfocus",
    onFocusIn: "onfocusin",
    onFocusOut: "onfocusout",
    onHashChange: "onhashchange",
    onInput: "oninput",
    onInvalid: "oninvalid",
    onKeyDown: "onkeydown",
    onKeyPress: "onkeypress",
    onKeyUp: "onkeyup",
    onLoad: "onload",
    onLoadedData: "onloadeddata",
    onLoadedMetadata: "onloadedmetadata",
    onLoadStart: "onloadstart",
    onMessage: "onmessage",
    onMouseDown: "onmousedown",
    onMouseEnter: "onmouseenter",
    onMouseLeave: "onmouseleave",
    onMouseMove: "onmousemove",
    onMouseOut: "onmouseout",
    onMouseOver: "onmouseover",
    onMouseUp: "onmouseup",
    onMouseWheel: "onmousewheel",
    onOffline: "onoffline",
    onOnline: "ononline",
    onPageHide: "onpagehide",
    onPageShow: "onpageshow",
    onPaste: "onpaste",
    onPause: "onpause",
    onPlay: "onplay",
    onPlaying: "onplaying",
    onPopState: "onpopstate",
    onProgress: "onprogress",
    onRateChange: "onratechange",
    onRepeat: "onrepeat",
    onReset: "onreset",
    onResize: "onresize",
    onScroll: "onscroll",
    onSeeked: "onseeked",
    onSeeking: "onseeking",
    onSelect: "onselect",
    onShow: "onshow",
    onStalled: "onstalled",
    onStorage: "onstorage",
    onSubmit: "onsubmit",
    onSuspend: "onsuspend",
    onTimeUpdate: "ontimeupdate",
    onToggle: "ontoggle",
    onUnload: "onunload",
    onVolumeChange: "onvolumechange",
    onWaiting: "onwaiting",
    onZoom: "onzoom",
    overlinePosition: "overline-position",
    overlineThickness: "overline-thickness",
    paintOrder: "paint-order",
    panose1: "panose-1",
    pointerEvents: "pointer-events",
    referrerPolicy: "referrerpolicy",
    renderingIntent: "rendering-intent",
    shapeRendering: "shape-rendering",
    stopColor: "stop-color",
    stopOpacity: "stop-opacity",
    strikethroughPosition: "strikethrough-position",
    strikethroughThickness: "strikethrough-thickness",
    strokeDashArray: "stroke-dasharray",
    strokeDashOffset: "stroke-dashoffset",
    strokeLineCap: "stroke-linecap",
    strokeLineJoin: "stroke-linejoin",
    strokeMiterLimit: "stroke-miterlimit",
    strokeOpacity: "stroke-opacity",
    strokeWidth: "stroke-width",
    tabIndex: "tabindex",
    textAnchor: "text-anchor",
    textDecoration: "text-decoration",
    textRendering: "text-rendering",
    transformOrigin: "transform-origin",
    typeOf: "typeof",
    underlinePosition: "underline-position",
    underlineThickness: "underline-thickness",
    unicodeBidi: "unicode-bidi",
    unicodeRange: "unicode-range",
    unitsPerEm: "units-per-em",
    vAlphabetic: "v-alphabetic",
    vHanging: "v-hanging",
    vIdeographic: "v-ideographic",
    vMathematical: "v-mathematical",
    vectorEffect: "vector-effect",
    vertAdvY: "vert-adv-y",
    vertOriginX: "vert-origin-x",
    vertOriginY: "vert-origin-y",
    wordSpacing: "word-spacing",
    writingMode: "writing-mode",
    xHeight: "x-height",
    // These were camelcased in Tiny. Now lowercased in SVG 2
    playbackOrder: "playbackorder",
    timelineBegin: "timelinebegin"
  },
  properties: {
    about: commaOrSpaceSeparated,
    accentHeight: number,
    accumulate: null,
    additive: null,
    alignmentBaseline: null,
    alphabetic: number,
    amplitude: number,
    arabicForm: null,
    ascent: number,
    attributeName: null,
    attributeType: null,
    azimuth: number,
    bandwidth: null,
    baselineShift: null,
    baseFrequency: null,
    baseProfile: null,
    bbox: null,
    begin: null,
    bias: number,
    by: null,
    calcMode: null,
    capHeight: number,
    className: spaceSeparated,
    clip: null,
    clipPath: null,
    clipPathUnits: null,
    clipRule: null,
    color: null,
    colorInterpolation: null,
    colorInterpolationFilters: null,
    colorProfile: null,
    colorRendering: null,
    content: null,
    contentScriptType: null,
    contentStyleType: null,
    crossOrigin: null,
    cursor: null,
    cx: null,
    cy: null,
    d: null,
    dataType: null,
    defaultAction: null,
    descent: number,
    diffuseConstant: number,
    direction: null,
    display: null,
    dur: null,
    divisor: number,
    dominantBaseline: null,
    download: boolean,
    dx: null,
    dy: null,
    edgeMode: null,
    editable: null,
    elevation: number,
    enableBackground: null,
    end: null,
    event: null,
    exponent: number,
    externalResourcesRequired: null,
    fill: null,
    fillOpacity: number,
    fillRule: null,
    filter: null,
    filterRes: null,
    filterUnits: null,
    floodColor: null,
    floodOpacity: null,
    focusable: null,
    focusHighlight: null,
    fontFamily: null,
    fontSize: null,
    fontSizeAdjust: null,
    fontStretch: null,
    fontStyle: null,
    fontVariant: null,
    fontWeight: null,
    format: null,
    fr: null,
    from: null,
    fx: null,
    fy: null,
    g1: commaSeparated,
    g2: commaSeparated,
    glyphName: commaSeparated,
    glyphOrientationHorizontal: null,
    glyphOrientationVertical: null,
    glyphRef: null,
    gradientTransform: null,
    gradientUnits: null,
    handler: null,
    hanging: number,
    hatchContentUnits: null,
    hatchUnits: null,
    height: null,
    href: null,
    hrefLang: null,
    horizAdvX: number,
    horizOriginX: number,
    horizOriginY: number,
    id: null,
    ideographic: number,
    imageRendering: null,
    initialVisibility: null,
    in: null,
    in2: null,
    intercept: number,
    k: number,
    k1: number,
    k2: number,
    k3: number,
    k4: number,
    kernelMatrix: commaOrSpaceSeparated,
    kernelUnitLength: null,
    keyPoints: null,
    // SEMI_COLON_SEPARATED
    keySplines: null,
    // SEMI_COLON_SEPARATED
    keyTimes: null,
    // SEMI_COLON_SEPARATED
    kerning: null,
    lang: null,
    lengthAdjust: null,
    letterSpacing: null,
    lightingColor: null,
    limitingConeAngle: number,
    local: null,
    markerEnd: null,
    markerMid: null,
    markerStart: null,
    markerHeight: null,
    markerUnits: null,
    markerWidth: null,
    mask: null,
    maskContentUnits: null,
    maskType: null,
    maskUnits: null,
    mathematical: null,
    max: null,
    media: null,
    mediaCharacterEncoding: null,
    mediaContentEncodings: null,
    mediaSize: number,
    mediaTime: null,
    method: null,
    min: null,
    mode: null,
    name: null,
    navDown: null,
    navDownLeft: null,
    navDownRight: null,
    navLeft: null,
    navNext: null,
    navPrev: null,
    navRight: null,
    navUp: null,
    navUpLeft: null,
    navUpRight: null,
    numOctaves: null,
    observer: null,
    offset: null,
    onAbort: null,
    onActivate: null,
    onAfterPrint: null,
    onBeforePrint: null,
    onBegin: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnd: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFocusIn: null,
    onFocusOut: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadStart: null,
    onMessage: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onMouseWheel: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRepeat: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onShow: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onZoom: null,
    opacity: null,
    operator: null,
    order: null,
    orient: null,
    orientation: null,
    origin: null,
    overflow: null,
    overlay: null,
    overlinePosition: number,
    overlineThickness: number,
    paintOrder: null,
    panose1: null,
    path: null,
    pathLength: number,
    patternContentUnits: null,
    patternTransform: null,
    patternUnits: null,
    phase: null,
    ping: spaceSeparated,
    pitch: null,
    playbackOrder: null,
    pointerEvents: null,
    points: null,
    pointsAtX: number,
    pointsAtY: number,
    pointsAtZ: number,
    preserveAlpha: null,
    preserveAspectRatio: null,
    primitiveUnits: null,
    propagate: null,
    property: commaOrSpaceSeparated,
    r: null,
    radius: null,
    referrerPolicy: null,
    refX: null,
    refY: null,
    rel: commaOrSpaceSeparated,
    rev: commaOrSpaceSeparated,
    renderingIntent: null,
    repeatCount: null,
    repeatDur: null,
    requiredExtensions: commaOrSpaceSeparated,
    requiredFeatures: commaOrSpaceSeparated,
    requiredFonts: commaOrSpaceSeparated,
    requiredFormats: commaOrSpaceSeparated,
    resource: null,
    restart: null,
    result: null,
    rotate: null,
    rx: null,
    ry: null,
    scale: null,
    seed: null,
    shapeRendering: null,
    side: null,
    slope: null,
    snapshotTime: null,
    specularConstant: number,
    specularExponent: number,
    spreadMethod: null,
    spacing: null,
    startOffset: null,
    stdDeviation: null,
    stemh: null,
    stemv: null,
    stitchTiles: null,
    stopColor: null,
    stopOpacity: null,
    strikethroughPosition: number,
    strikethroughThickness: number,
    string: null,
    stroke: null,
    strokeDashArray: commaOrSpaceSeparated,
    strokeDashOffset: null,
    strokeLineCap: null,
    strokeLineJoin: null,
    strokeMiterLimit: number,
    strokeOpacity: number,
    strokeWidth: null,
    style: null,
    surfaceScale: number,
    syncBehavior: null,
    syncBehaviorDefault: null,
    syncMaster: null,
    syncTolerance: null,
    syncToleranceDefault: null,
    systemLanguage: commaOrSpaceSeparated,
    tabIndex: number,
    tableValues: null,
    target: null,
    targetX: number,
    targetY: number,
    textAnchor: null,
    textDecoration: null,
    textRendering: null,
    textLength: null,
    timelineBegin: null,
    title: null,
    transformBehavior: null,
    type: null,
    typeOf: commaOrSpaceSeparated,
    to: null,
    transform: null,
    transformOrigin: null,
    u1: null,
    u2: null,
    underlinePosition: number,
    underlineThickness: number,
    unicode: null,
    unicodeBidi: null,
    unicodeRange: null,
    unitsPerEm: number,
    values: null,
    vAlphabetic: number,
    vMathematical: number,
    vectorEffect: null,
    vHanging: number,
    vIdeographic: number,
    version: null,
    vertAdvY: number,
    vertOriginX: number,
    vertOriginY: number,
    viewBox: null,
    viewTarget: null,
    visibility: null,
    width: null,
    widths: null,
    wordSpacing: null,
    writingMode: null,
    x: null,
    x1: null,
    x2: null,
    xChannelSelector: null,
    xHeight: number,
    y: null,
    y1: null,
    y2: null,
    yChannelSelector: null,
    z: null,
    zoomAndPan: null
  },
  space: "svg",
  transform: caseSensitiveTransform
});
const xlink = create({
  properties: {
    xLinkActuate: null,
    xLinkArcRole: null,
    xLinkHref: null,
    xLinkRole: null,
    xLinkShow: null,
    xLinkTitle: null,
    xLinkType: null
  },
  space: "xlink",
  transform(_, property) {
    return "xlink:" + property.slice(5).toLowerCase();
  }
});
const xmlns = create({
  attributes: { xmlnsxlink: "xmlns:xlink" },
  properties: { xmlnsXLink: null, xmlns: null },
  space: "xmlns",
  transform: caseInsensitiveTransform
});
const xml = create({
  properties: { xmlBase: null, xmlLang: null, xmlSpace: null },
  space: "xml",
  transform(_, property) {
    return "xml:" + property.slice(3).toLowerCase();
  }
});
const hastToReact = {
  classId: "classID",
  dataType: "datatype",
  itemId: "itemID",
  strokeDashArray: "strokeDasharray",
  strokeDashOffset: "strokeDashoffset",
  strokeLineCap: "strokeLinecap",
  strokeLineJoin: "strokeLinejoin",
  strokeMiterLimit: "strokeMiterlimit",
  typeOf: "typeof",
  xLinkActuate: "xlinkActuate",
  xLinkArcRole: "xlinkArcrole",
  xLinkHref: "xlinkHref",
  xLinkRole: "xlinkRole",
  xLinkShow: "xlinkShow",
  xLinkTitle: "xlinkTitle",
  xLinkType: "xlinkType",
  xmlnsXLink: "xmlnsXlink"
};
const cap$1 = /[A-Z]/g;
const dash = /-[a-z]/g;
const valid = /^data[-\w.:]+$/i;
function find(schema, value) {
  const normal = normalize$1(value);
  let property = value;
  let Type = Info;
  if (normal in schema.normal) {
    return schema.property[schema.normal[normal]];
  }
  if (normal.length > 4 && normal.slice(0, 4) === "data" && valid.test(value)) {
    if (value.charAt(4) === "-") {
      const rest = value.slice(5).replace(dash, camelcase);
      property = "data" + rest.charAt(0).toUpperCase() + rest.slice(1);
    } else {
      const rest = value.slice(4);
      if (!dash.test(rest)) {
        let dashes = rest.replace(cap$1, kebab);
        if (dashes.charAt(0) !== "-") {
          dashes = "-" + dashes;
        }
        value = "data" + dashes;
      }
    }
    Type = DefinedInfo;
  }
  return new Type(property, value);
}
function kebab($0) {
  return "-" + $0.toLowerCase();
}
function camelcase($0) {
  return $0.charAt(1).toUpperCase();
}
const html$2 = merge([aria, html$3, xlink, xmlns, xml], "html");
const svg = merge([aria, svg$1, xlink, xmlns, xml], "svg");
function stringify(values) {
  return values.join(" ").trim();
}
var cjs$2 = {};
var cjs$1;
var hasRequiredCjs$2;
function requireCjs$2() {
  if (hasRequiredCjs$2) return cjs$1;
  hasRequiredCjs$2 = 1;
  var COMMENT_REGEX = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
  var NEWLINE_REGEX = /\n/g;
  var WHITESPACE_REGEX = /^\s*/;
  var PROPERTY_REGEX = /^(\*?[-#/*\\\w]+(\[[0-9a-z_-]+\])?)\s*/;
  var COLON_REGEX = /^:\s*/;
  var VALUE_REGEX = /^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};])+)/;
  var SEMICOLON_REGEX = /^[;\s]*/;
  var TRIM_REGEX = /^\s+|\s+$/g;
  var NEWLINE = "\n";
  var FORWARD_SLASH = "/";
  var ASTERISK = "*";
  var EMPTY_STRING = "";
  var TYPE_COMMENT = "comment";
  var TYPE_DECLARATION = "declaration";
  function index2(style, options) {
    if (typeof style !== "string") {
      throw new TypeError("First argument must be a string");
    }
    if (!style) return [];
    options = options || {};
    var lineno = 1;
    var column = 1;
    function updatePosition(str) {
      var lines = str.match(NEWLINE_REGEX);
      if (lines) lineno += lines.length;
      var i = str.lastIndexOf(NEWLINE);
      column = ~i ? str.length - i : column + str.length;
    }
    function position2() {
      var start = { line: lineno, column };
      return function(node2) {
        node2.position = new Position(start);
        whitespace2();
        return node2;
      };
    }
    function Position(start) {
      this.start = start;
      this.end = { line: lineno, column };
      this.source = options.source;
    }
    Position.prototype.content = style;
    function error(msg) {
      var err = new Error(
        options.source + ":" + lineno + ":" + column + ": " + msg
      );
      err.reason = msg;
      err.filename = options.source;
      err.line = lineno;
      err.column = column;
      err.source = style;
      if (options.silent) ;
      else {
        throw err;
      }
    }
    function match(re2) {
      var m = re2.exec(style);
      if (!m) return;
      var str = m[0];
      updatePosition(str);
      style = style.slice(str.length);
      return m;
    }
    function whitespace2() {
      match(WHITESPACE_REGEX);
    }
    function comments(rules) {
      var c;
      rules = rules || [];
      while (c = comment()) {
        if (c !== false) {
          rules.push(c);
        }
      }
      return rules;
    }
    function comment() {
      var pos = position2();
      if (FORWARD_SLASH != style.charAt(0) || ASTERISK != style.charAt(1)) return;
      var i = 2;
      while (EMPTY_STRING != style.charAt(i) && (ASTERISK != style.charAt(i) || FORWARD_SLASH != style.charAt(i + 1))) {
        ++i;
      }
      i += 2;
      if (EMPTY_STRING === style.charAt(i - 1)) {
        return error("End of comment missing");
      }
      var str = style.slice(2, i - 2);
      column += 2;
      updatePosition(str);
      style = style.slice(i);
      column += 2;
      return pos({
        type: TYPE_COMMENT,
        comment: str
      });
    }
    function declaration() {
      var pos = position2();
      var prop = match(PROPERTY_REGEX);
      if (!prop) return;
      comment();
      if (!match(COLON_REGEX)) return error("property missing ':'");
      var val = match(VALUE_REGEX);
      var ret = pos({
        type: TYPE_DECLARATION,
        property: trim(prop[0].replace(COMMENT_REGEX, EMPTY_STRING)),
        value: val ? trim(val[0].replace(COMMENT_REGEX, EMPTY_STRING)) : EMPTY_STRING
      });
      match(SEMICOLON_REGEX);
      return ret;
    }
    function declarations() {
      var decls = [];
      comments(decls);
      var decl;
      while (decl = declaration()) {
        if (decl !== false) {
          decls.push(decl);
          comments(decls);
        }
      }
      return decls;
    }
    whitespace2();
    return declarations();
  }
  function trim(str) {
    return str ? str.replace(TRIM_REGEX, EMPTY_STRING) : EMPTY_STRING;
  }
  cjs$1 = index2;
  return cjs$1;
}
var hasRequiredCjs$1;
function requireCjs$1() {
  if (hasRequiredCjs$1) return cjs$2;
  hasRequiredCjs$1 = 1;
  var __importDefault = cjs$2 && cjs$2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(cjs$2, "__esModule", { value: true });
  cjs$2.default = StyleToObject;
  const inline_style_parser_1 = __importDefault(requireCjs$2());
  function StyleToObject(style, iterator) {
    let styleObject = null;
    if (!style || typeof style !== "string") {
      return styleObject;
    }
    const declarations = (0, inline_style_parser_1.default)(style);
    const hasIterator = typeof iterator === "function";
    declarations.forEach((declaration) => {
      if (declaration.type !== "declaration") {
        return;
      }
      const { property, value } = declaration;
      if (hasIterator) {
        iterator(property, value, declaration);
      } else if (value) {
        styleObject = styleObject || {};
        styleObject[property] = value;
      }
    });
    return styleObject;
  }
  return cjs$2;
}
var utilities = {};
var hasRequiredUtilities;
function requireUtilities() {
  if (hasRequiredUtilities) return utilities;
  hasRequiredUtilities = 1;
  Object.defineProperty(utilities, "__esModule", { value: true });
  utilities.camelCase = void 0;
  var CUSTOM_PROPERTY_REGEX = /^--[a-zA-Z0-9_-]+$/;
  var HYPHEN_REGEX = /-([a-z])/g;
  var NO_HYPHEN_REGEX = /^[^-]+$/;
  var VENDOR_PREFIX_REGEX = /^-(webkit|moz|ms|o|khtml)-/;
  var MS_VENDOR_PREFIX_REGEX = /^-(ms)-/;
  var skipCamelCase = function(property) {
    return !property || NO_HYPHEN_REGEX.test(property) || CUSTOM_PROPERTY_REGEX.test(property);
  };
  var capitalize = function(match, character) {
    return character.toUpperCase();
  };
  var trimHyphen = function(match, prefix) {
    return "".concat(prefix, "-");
  };
  var camelCase = function(property, options) {
    if (options === void 0) {
      options = {};
    }
    if (skipCamelCase(property)) {
      return property;
    }
    property = property.toLowerCase();
    if (options.reactCompat) {
      property = property.replace(MS_VENDOR_PREFIX_REGEX, trimHyphen);
    } else {
      property = property.replace(VENDOR_PREFIX_REGEX, trimHyphen);
    }
    return property.replace(HYPHEN_REGEX, capitalize);
  };
  utilities.camelCase = camelCase;
  return utilities;
}
var cjs;
var hasRequiredCjs;
function requireCjs() {
  if (hasRequiredCjs) return cjs;
  hasRequiredCjs = 1;
  var __importDefault = cjs && cjs.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  var style_to_object_1 = __importDefault(requireCjs$1());
  var utilities_1 = requireUtilities();
  function StyleToJS(style, options) {
    var output = {};
    if (!style || typeof style !== "string") {
      return output;
    }
    (0, style_to_object_1.default)(style, function(property, value) {
      if (property && value) {
        output[(0, utilities_1.camelCase)(property, options)] = value;
      }
    });
    return output;
  }
  StyleToJS.default = StyleToJS;
  cjs = StyleToJS;
  return cjs;
}
var cjsExports = requireCjs();
const styleToJs = /* @__PURE__ */ getDefaultExportFromCjs(cjsExports);
const pointEnd = point$2("end");
const pointStart = point$2("start");
function point$2(type) {
  return point2;
  function point2(node2) {
    const point3 = node2 && node2.position && node2.position[type] || {};
    if (typeof point3.line === "number" && point3.line > 0 && typeof point3.column === "number" && point3.column > 0) {
      return {
        line: point3.line,
        column: point3.column,
        offset: typeof point3.offset === "number" && point3.offset > -1 ? point3.offset : void 0
      };
    }
  }
}
function position$1(node2) {
  const start = pointStart(node2);
  const end = pointEnd(node2);
  if (start && end) {
    return { start, end };
  }
}
function stringifyPosition(value) {
  if (!value || typeof value !== "object") {
    return "";
  }
  if ("position" in value || "type" in value) {
    return position(value.position);
  }
  if ("start" in value || "end" in value) {
    return position(value);
  }
  if ("line" in value || "column" in value) {
    return point$1(value);
  }
  return "";
}
function point$1(point2) {
  return index(point2 && point2.line) + ":" + index(point2 && point2.column);
}
function position(pos) {
  return point$1(pos && pos.start) + "-" + point$1(pos && pos.end);
}
function index(value) {
  return value && typeof value === "number" ? value : 1;
}
class VFileMessage extends Error {
  /**
   * Create a message for `reason`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {Options | null | undefined} [options]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | Options | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns
   *   Instance of `VFileMessage`.
   */
  // eslint-disable-next-line complexity
  constructor(causeOrReason, optionsOrParentOrPlace, origin) {
    super();
    if (typeof optionsOrParentOrPlace === "string") {
      origin = optionsOrParentOrPlace;
      optionsOrParentOrPlace = void 0;
    }
    let reason = "";
    let options = {};
    let legacyCause = false;
    if (optionsOrParentOrPlace) {
      if ("line" in optionsOrParentOrPlace && "column" in optionsOrParentOrPlace) {
        options = { place: optionsOrParentOrPlace };
      } else if ("start" in optionsOrParentOrPlace && "end" in optionsOrParentOrPlace) {
        options = { place: optionsOrParentOrPlace };
      } else if ("type" in optionsOrParentOrPlace) {
        options = {
          ancestors: [optionsOrParentOrPlace],
          place: optionsOrParentOrPlace.position
        };
      } else {
        options = { ...optionsOrParentOrPlace };
      }
    }
    if (typeof causeOrReason === "string") {
      reason = causeOrReason;
    } else if (!options.cause && causeOrReason) {
      legacyCause = true;
      reason = causeOrReason.message;
      options.cause = causeOrReason;
    }
    if (!options.ruleId && !options.source && typeof origin === "string") {
      const index2 = origin.indexOf(":");
      if (index2 === -1) {
        options.ruleId = origin;
      } else {
        options.source = origin.slice(0, index2);
        options.ruleId = origin.slice(index2 + 1);
      }
    }
    if (!options.place && options.ancestors && options.ancestors) {
      const parent = options.ancestors[options.ancestors.length - 1];
      if (parent) {
        options.place = parent.position;
      }
    }
    const start = options.place && "start" in options.place ? options.place.start : options.place;
    this.ancestors = options.ancestors || void 0;
    this.cause = options.cause || void 0;
    this.column = start ? start.column : void 0;
    this.fatal = void 0;
    this.file = "";
    this.message = reason;
    this.line = start ? start.line : void 0;
    this.name = stringifyPosition(options.place) || "1:1";
    this.place = options.place || void 0;
    this.reason = this.message;
    this.ruleId = options.ruleId || void 0;
    this.source = options.source || void 0;
    this.stack = legacyCause && options.cause && typeof options.cause.stack === "string" ? options.cause.stack : "";
    this.actual = void 0;
    this.expected = void 0;
    this.note = void 0;
    this.url = void 0;
  }
}
VFileMessage.prototype.file = "";
VFileMessage.prototype.name = "";
VFileMessage.prototype.reason = "";
VFileMessage.prototype.message = "";
VFileMessage.prototype.stack = "";
VFileMessage.prototype.column = void 0;
VFileMessage.prototype.line = void 0;
VFileMessage.prototype.ancestors = void 0;
VFileMessage.prototype.cause = void 0;
VFileMessage.prototype.fatal = void 0;
VFileMessage.prototype.place = void 0;
VFileMessage.prototype.ruleId = void 0;
VFileMessage.prototype.source = void 0;
const own$4 = {}.hasOwnProperty;
const emptyMap = /* @__PURE__ */ new Map();
const cap = /[A-Z]/g;
const tableElements = /* @__PURE__ */ new Set(["table", "tbody", "thead", "tfoot", "tr"]);
const tableCellElement = /* @__PURE__ */ new Set(["td", "th"]);
const docs = "https://github.com/syntax-tree/hast-util-to-jsx-runtime";
function toJsxRuntime(tree, options) {
  if (!options || options.Fragment === void 0) {
    throw new TypeError("Expected `Fragment` in options");
  }
  const filePath = options.filePath || void 0;
  let create2;
  if (options.development) {
    if (typeof options.jsxDEV !== "function") {
      throw new TypeError(
        "Expected `jsxDEV` in options when `development: true`"
      );
    }
    create2 = developmentCreate(filePath, options.jsxDEV);
  } else {
    if (typeof options.jsx !== "function") {
      throw new TypeError("Expected `jsx` in production options");
    }
    if (typeof options.jsxs !== "function") {
      throw new TypeError("Expected `jsxs` in production options");
    }
    create2 = productionCreate(filePath, options.jsx, options.jsxs);
  }
  const state2 = {
    Fragment: options.Fragment,
    ancestors: [],
    components: options.components || {},
    create: create2,
    elementAttributeNameCase: options.elementAttributeNameCase || "react",
    evaluater: options.createEvaluater ? options.createEvaluater() : void 0,
    filePath,
    ignoreInvalidStyle: options.ignoreInvalidStyle || false,
    passKeys: options.passKeys !== false,
    passNode: options.passNode || false,
    schema: options.space === "svg" ? svg : html$2,
    stylePropertyNameCase: options.stylePropertyNameCase || "dom",
    tableCellAlignToStyle: options.tableCellAlignToStyle !== false
  };
  const result = one$1(state2, tree, void 0);
  if (result && typeof result !== "string") {
    return result;
  }
  return state2.create(
    tree,
    state2.Fragment,
    { children: result || void 0 },
    void 0
  );
}
function one$1(state2, node2, key) {
  if (node2.type === "element") {
    return element(state2, node2, key);
  }
  if (node2.type === "mdxFlowExpression" || node2.type === "mdxTextExpression") {
    return mdxExpression(state2, node2);
  }
  if (node2.type === "mdxJsxFlowElement" || node2.type === "mdxJsxTextElement") {
    return mdxJsxElement(state2, node2, key);
  }
  if (node2.type === "mdxjsEsm") {
    return mdxEsm(state2, node2);
  }
  if (node2.type === "root") {
    return root$2(state2, node2, key);
  }
  if (node2.type === "text") {
    return text$5(state2, node2);
  }
}
function element(state2, node2, key) {
  const parentSchema = state2.schema;
  let schema = parentSchema;
  if (node2.tagName.toLowerCase() === "svg" && parentSchema.space === "html") {
    schema = svg;
    state2.schema = schema;
  }
  state2.ancestors.push(node2);
  const type = findComponentFromName(state2, node2.tagName, false);
  const props = createElementProps(state2, node2);
  let children = createChildren(state2, node2);
  if (tableElements.has(node2.tagName)) {
    children = children.filter(function(child) {
      return typeof child === "string" ? !whitespace(child) : true;
    });
  }
  addNode(state2, props, type, node2);
  addChildren(props, children);
  state2.ancestors.pop();
  state2.schema = parentSchema;
  return state2.create(node2, type, props, key);
}
function mdxExpression(state2, node2) {
  if (node2.data && node2.data.estree && state2.evaluater) {
    const program = node2.data.estree;
    const expression = program.body[0];
    ok$1(expression.type === "ExpressionStatement");
    return (
      /** @type {Child | undefined} */
      state2.evaluater.evaluateExpression(expression.expression)
    );
  }
  crashEstree(state2, node2.position);
}
function mdxEsm(state2, node2) {
  if (node2.data && node2.data.estree && state2.evaluater) {
    return (
      /** @type {Child | undefined} */
      state2.evaluater.evaluateProgram(node2.data.estree)
    );
  }
  crashEstree(state2, node2.position);
}
function mdxJsxElement(state2, node2, key) {
  const parentSchema = state2.schema;
  let schema = parentSchema;
  if (node2.name === "svg" && parentSchema.space === "html") {
    schema = svg;
    state2.schema = schema;
  }
  state2.ancestors.push(node2);
  const type = node2.name === null ? state2.Fragment : findComponentFromName(state2, node2.name, true);
  const props = createJsxElementProps(state2, node2);
  const children = createChildren(state2, node2);
  addNode(state2, props, type, node2);
  addChildren(props, children);
  state2.ancestors.pop();
  state2.schema = parentSchema;
  return state2.create(node2, type, props, key);
}
function root$2(state2, node2, key) {
  const props = {};
  addChildren(props, createChildren(state2, node2));
  return state2.create(node2, state2.Fragment, props, key);
}
function text$5(_, node2) {
  return node2.value;
}
function addNode(state2, props, type, node2) {
  if (typeof type !== "string" && type !== state2.Fragment && state2.passNode) {
    props.node = node2;
  }
}
function addChildren(props, children) {
  if (children.length > 0) {
    const value = children.length > 1 ? children : children[0];
    if (value) {
      props.children = value;
    }
  }
}
function productionCreate(_, jsx, jsxs) {
  return create2;
  function create2(_2, type, props, key) {
    const isStaticChildren = Array.isArray(props.children);
    const fn = isStaticChildren ? jsxs : jsx;
    return key ? fn(type, props, key) : fn(type, props);
  }
}
function developmentCreate(filePath, jsxDEV) {
  return create2;
  function create2(node2, type, props, key) {
    const isStaticChildren = Array.isArray(props.children);
    const point2 = pointStart(node2);
    return jsxDEV(
      type,
      props,
      key,
      isStaticChildren,
      {
        columnNumber: point2 ? point2.column - 1 : void 0,
        fileName: filePath,
        lineNumber: point2 ? point2.line : void 0
      },
      void 0
    );
  }
}
function createElementProps(state2, node2) {
  const props = {};
  let alignValue;
  let prop;
  for (prop in node2.properties) {
    if (prop !== "children" && own$4.call(node2.properties, prop)) {
      const result = createProperty(state2, prop, node2.properties[prop]);
      if (result) {
        const [key, value] = result;
        if (state2.tableCellAlignToStyle && key === "align" && typeof value === "string" && tableCellElement.has(node2.tagName)) {
          alignValue = value;
        } else {
          props[key] = value;
        }
      }
    }
  }
  if (alignValue) {
    const style = (
      /** @type {Style} */
      props.style || (props.style = {})
    );
    style[state2.stylePropertyNameCase === "css" ? "text-align" : "textAlign"] = alignValue;
  }
  return props;
}
function createJsxElementProps(state2, node2) {
  const props = {};
  for (const attribute of node2.attributes) {
    if (attribute.type === "mdxJsxExpressionAttribute") {
      if (attribute.data && attribute.data.estree && state2.evaluater) {
        const program = attribute.data.estree;
        const expression = program.body[0];
        ok$1(expression.type === "ExpressionStatement");
        const objectExpression = expression.expression;
        ok$1(objectExpression.type === "ObjectExpression");
        const property = objectExpression.properties[0];
        ok$1(property.type === "SpreadElement");
        Object.assign(
          props,
          state2.evaluater.evaluateExpression(property.argument)
        );
      } else {
        crashEstree(state2, node2.position);
      }
    } else {
      const name2 = attribute.name;
      let value;
      if (attribute.value && typeof attribute.value === "object") {
        if (attribute.value.data && attribute.value.data.estree && state2.evaluater) {
          const program = attribute.value.data.estree;
          const expression = program.body[0];
          ok$1(expression.type === "ExpressionStatement");
          value = state2.evaluater.evaluateExpression(expression.expression);
        } else {
          crashEstree(state2, node2.position);
        }
      } else {
        value = attribute.value === null ? true : attribute.value;
      }
      props[name2] = /** @type {Props[keyof Props]} */
      value;
    }
  }
  return props;
}
function createChildren(state2, node2) {
  const children = [];
  let index2 = -1;
  const countsByName = state2.passKeys ? /* @__PURE__ */ new Map() : emptyMap;
  while (++index2 < node2.children.length) {
    const child = node2.children[index2];
    let key;
    if (state2.passKeys) {
      const name2 = child.type === "element" ? child.tagName : child.type === "mdxJsxFlowElement" || child.type === "mdxJsxTextElement" ? child.name : void 0;
      if (name2) {
        const count = countsByName.get(name2) || 0;
        key = name2 + "-" + count;
        countsByName.set(name2, count + 1);
      }
    }
    const result = one$1(state2, child, key);
    if (result !== void 0) children.push(result);
  }
  return children;
}
function createProperty(state2, prop, value) {
  const info = find(state2.schema, prop);
  if (value === null || value === void 0 || typeof value === "number" && Number.isNaN(value)) {
    return;
  }
  if (Array.isArray(value)) {
    value = info.commaSeparated ? stringify$1(value) : stringify(value);
  }
  if (info.property === "style") {
    let styleObject = typeof value === "object" ? value : parseStyle(state2, String(value));
    if (state2.stylePropertyNameCase === "css") {
      styleObject = transformStylesToCssCasing(styleObject);
    }
    return ["style", styleObject];
  }
  return [
    state2.elementAttributeNameCase === "react" && info.space ? hastToReact[info.property] || info.property : info.attribute,
    value
  ];
}
function parseStyle(state2, value) {
  try {
    return styleToJs(value, { reactCompat: true });
  } catch (error) {
    if (state2.ignoreInvalidStyle) {
      return {};
    }
    const cause = (
      /** @type {Error} */
      error
    );
    const message = new VFileMessage("Cannot parse `style` attribute", {
      ancestors: state2.ancestors,
      cause,
      ruleId: "style",
      source: "hast-util-to-jsx-runtime"
    });
    message.file = state2.filePath || void 0;
    message.url = docs + "#cannot-parse-style-attribute";
    throw message;
  }
}
function findComponentFromName(state2, name$1, allowExpression) {
  let result;
  if (!allowExpression) {
    result = { type: "Literal", value: name$1 };
  } else if (name$1.includes(".")) {
    const identifiers = name$1.split(".");
    let index2 = -1;
    let node2;
    while (++index2 < identifiers.length) {
      const prop = name(identifiers[index2]) ? { type: "Identifier", name: identifiers[index2] } : { type: "Literal", value: identifiers[index2] };
      node2 = node2 ? {
        type: "MemberExpression",
        object: node2,
        property: prop,
        computed: Boolean(index2 && prop.type === "Literal"),
        optional: false
      } : prop;
    }
    result = node2;
  } else {
    result = name(name$1) && !/^[a-z]/.test(name$1) ? { type: "Identifier", name: name$1 } : { type: "Literal", value: name$1 };
  }
  if (result.type === "Literal") {
    const name2 = (
      /** @type {string | number} */
      result.value
    );
    return own$4.call(state2.components, name2) ? state2.components[name2] : name2;
  }
  if (state2.evaluater) {
    return state2.evaluater.evaluateExpression(result);
  }
  crashEstree(state2);
}
function crashEstree(state2, place) {
  const message = new VFileMessage(
    "Cannot handle MDX estrees without `createEvaluater`",
    {
      ancestors: state2.ancestors,
      place,
      ruleId: "mdx-estree",
      source: "hast-util-to-jsx-runtime"
    }
  );
  message.file = state2.filePath || void 0;
  message.url = docs + "#cannot-handle-mdx-estrees-without-createevaluater";
  throw message;
}
function transformStylesToCssCasing(domCasing) {
  const cssCasing = {};
  let from;
  for (from in domCasing) {
    if (own$4.call(domCasing, from)) {
      cssCasing[transformStyleToCssCasing(from)] = domCasing[from];
    }
  }
  return cssCasing;
}
function transformStyleToCssCasing(from) {
  let to = from.replace(cap, toDash);
  if (to.slice(0, 3) === "ms-") to = "-" + to;
  return to;
}
function toDash($0) {
  return "-" + $0.toLowerCase();
}
const urlAttributes = {
  action: ["form"],
  cite: ["blockquote", "del", "ins", "q"],
  data: ["object"],
  formAction: ["button", "input"],
  href: ["a", "area", "base", "link"],
  icon: ["menuitem"],
  itemId: null,
  manifest: ["html"],
  ping: ["a", "area"],
  poster: ["video"],
  src: [
    "audio",
    "embed",
    "iframe",
    "img",
    "input",
    "script",
    "source",
    "track",
    "video"
  ]
};
const emptyOptions$2 = {};
function toString$1(value, options) {
  const settings = emptyOptions$2;
  const includeImageAlt = typeof settings.includeImageAlt === "boolean" ? settings.includeImageAlt : true;
  const includeHtml = typeof settings.includeHtml === "boolean" ? settings.includeHtml : true;
  return one(value, includeImageAlt, includeHtml);
}
function one(value, includeImageAlt, includeHtml) {
  if (node(value)) {
    if ("value" in value) {
      return value.type === "html" && !includeHtml ? "" : value.value;
    }
    if (includeImageAlt && "alt" in value && value.alt) {
      return value.alt;
    }
    if ("children" in value) {
      return all(value.children, includeImageAlt, includeHtml);
    }
  }
  if (Array.isArray(value)) {
    return all(value, includeImageAlt, includeHtml);
  }
  return "";
}
function all(values, includeImageAlt, includeHtml) {
  const result = [];
  let index2 = -1;
  while (++index2 < values.length) {
    result[index2] = one(values[index2], includeImageAlt, includeHtml);
  }
  return result.join("");
}
function node(value) {
  return Boolean(value && typeof value === "object");
}
const characterEntities = {
  AElig: "Æ",
  AMP: "&",
  Aacute: "Á",
  Abreve: "Ă",
  Acirc: "Â",
  Acy: "А",
  Afr: "𝔄",
  Agrave: "À",
  Alpha: "Α",
  Amacr: "Ā",
  And: "⩓",
  Aogon: "Ą",
  Aopf: "𝔸",
  ApplyFunction: "⁡",
  Aring: "Å",
  Ascr: "𝒜",
  Assign: "≔",
  Atilde: "Ã",
  Auml: "Ä",
  Backslash: "∖",
  Barv: "⫧",
  Barwed: "⌆",
  Bcy: "Б",
  Because: "∵",
  Bernoullis: "ℬ",
  Beta: "Β",
  Bfr: "𝔅",
  Bopf: "𝔹",
  Breve: "˘",
  Bscr: "ℬ",
  Bumpeq: "≎",
  CHcy: "Ч",
  COPY: "©",
  Cacute: "Ć",
  Cap: "⋒",
  CapitalDifferentialD: "ⅅ",
  Cayleys: "ℭ",
  Ccaron: "Č",
  Ccedil: "Ç",
  Ccirc: "Ĉ",
  Cconint: "∰",
  Cdot: "Ċ",
  Cedilla: "¸",
  CenterDot: "·",
  Cfr: "ℭ",
  Chi: "Χ",
  CircleDot: "⊙",
  CircleMinus: "⊖",
  CirclePlus: "⊕",
  CircleTimes: "⊗",
  ClockwiseContourIntegral: "∲",
  CloseCurlyDoubleQuote: "”",
  CloseCurlyQuote: "’",
  Colon: "∷",
  Colone: "⩴",
  Congruent: "≡",
  Conint: "∯",
  ContourIntegral: "∮",
  Copf: "ℂ",
  Coproduct: "∐",
  CounterClockwiseContourIntegral: "∳",
  Cross: "⨯",
  Cscr: "𝒞",
  Cup: "⋓",
  CupCap: "≍",
  DD: "ⅅ",
  DDotrahd: "⤑",
  DJcy: "Ђ",
  DScy: "Ѕ",
  DZcy: "Џ",
  Dagger: "‡",
  Darr: "↡",
  Dashv: "⫤",
  Dcaron: "Ď",
  Dcy: "Д",
  Del: "∇",
  Delta: "Δ",
  Dfr: "𝔇",
  DiacriticalAcute: "´",
  DiacriticalDot: "˙",
  DiacriticalDoubleAcute: "˝",
  DiacriticalGrave: "`",
  DiacriticalTilde: "˜",
  Diamond: "⋄",
  DifferentialD: "ⅆ",
  Dopf: "𝔻",
  Dot: "¨",
  DotDot: "⃜",
  DotEqual: "≐",
  DoubleContourIntegral: "∯",
  DoubleDot: "¨",
  DoubleDownArrow: "⇓",
  DoubleLeftArrow: "⇐",
  DoubleLeftRightArrow: "⇔",
  DoubleLeftTee: "⫤",
  DoubleLongLeftArrow: "⟸",
  DoubleLongLeftRightArrow: "⟺",
  DoubleLongRightArrow: "⟹",
  DoubleRightArrow: "⇒",
  DoubleRightTee: "⊨",
  DoubleUpArrow: "⇑",
  DoubleUpDownArrow: "⇕",
  DoubleVerticalBar: "∥",
  DownArrow: "↓",
  DownArrowBar: "⤓",
  DownArrowUpArrow: "⇵",
  DownBreve: "̑",
  DownLeftRightVector: "⥐",
  DownLeftTeeVector: "⥞",
  DownLeftVector: "↽",
  DownLeftVectorBar: "⥖",
  DownRightTeeVector: "⥟",
  DownRightVector: "⇁",
  DownRightVectorBar: "⥗",
  DownTee: "⊤",
  DownTeeArrow: "↧",
  Downarrow: "⇓",
  Dscr: "𝒟",
  Dstrok: "Đ",
  ENG: "Ŋ",
  ETH: "Ð",
  Eacute: "É",
  Ecaron: "Ě",
  Ecirc: "Ê",
  Ecy: "Э",
  Edot: "Ė",
  Efr: "𝔈",
  Egrave: "È",
  Element: "∈",
  Emacr: "Ē",
  EmptySmallSquare: "◻",
  EmptyVerySmallSquare: "▫",
  Eogon: "Ę",
  Eopf: "𝔼",
  Epsilon: "Ε",
  Equal: "⩵",
  EqualTilde: "≂",
  Equilibrium: "⇌",
  Escr: "ℰ",
  Esim: "⩳",
  Eta: "Η",
  Euml: "Ë",
  Exists: "∃",
  ExponentialE: "ⅇ",
  Fcy: "Ф",
  Ffr: "𝔉",
  FilledSmallSquare: "◼",
  FilledVerySmallSquare: "▪",
  Fopf: "𝔽",
  ForAll: "∀",
  Fouriertrf: "ℱ",
  Fscr: "ℱ",
  GJcy: "Ѓ",
  GT: ">",
  Gamma: "Γ",
  Gammad: "Ϝ",
  Gbreve: "Ğ",
  Gcedil: "Ģ",
  Gcirc: "Ĝ",
  Gcy: "Г",
  Gdot: "Ġ",
  Gfr: "𝔊",
  Gg: "⋙",
  Gopf: "𝔾",
  GreaterEqual: "≥",
  GreaterEqualLess: "⋛",
  GreaterFullEqual: "≧",
  GreaterGreater: "⪢",
  GreaterLess: "≷",
  GreaterSlantEqual: "⩾",
  GreaterTilde: "≳",
  Gscr: "𝒢",
  Gt: "≫",
  HARDcy: "Ъ",
  Hacek: "ˇ",
  Hat: "^",
  Hcirc: "Ĥ",
  Hfr: "ℌ",
  HilbertSpace: "ℋ",
  Hopf: "ℍ",
  HorizontalLine: "─",
  Hscr: "ℋ",
  Hstrok: "Ħ",
  HumpDownHump: "≎",
  HumpEqual: "≏",
  IEcy: "Е",
  IJlig: "Ĳ",
  IOcy: "Ё",
  Iacute: "Í",
  Icirc: "Î",
  Icy: "И",
  Idot: "İ",
  Ifr: "ℑ",
  Igrave: "Ì",
  Im: "ℑ",
  Imacr: "Ī",
  ImaginaryI: "ⅈ",
  Implies: "⇒",
  Int: "∬",
  Integral: "∫",
  Intersection: "⋂",
  InvisibleComma: "⁣",
  InvisibleTimes: "⁢",
  Iogon: "Į",
  Iopf: "𝕀",
  Iota: "Ι",
  Iscr: "ℐ",
  Itilde: "Ĩ",
  Iukcy: "І",
  Iuml: "Ï",
  Jcirc: "Ĵ",
  Jcy: "Й",
  Jfr: "𝔍",
  Jopf: "𝕁",
  Jscr: "𝒥",
  Jsercy: "Ј",
  Jukcy: "Є",
  KHcy: "Х",
  KJcy: "Ќ",
  Kappa: "Κ",
  Kcedil: "Ķ",
  Kcy: "К",
  Kfr: "𝔎",
  Kopf: "𝕂",
  Kscr: "𝒦",
  LJcy: "Љ",
  LT: "<",
  Lacute: "Ĺ",
  Lambda: "Λ",
  Lang: "⟪",
  Laplacetrf: "ℒ",
  Larr: "↞",
  Lcaron: "Ľ",
  Lcedil: "Ļ",
  Lcy: "Л",
  LeftAngleBracket: "⟨",
  LeftArrow: "←",
  LeftArrowBar: "⇤",
  LeftArrowRightArrow: "⇆",
  LeftCeiling: "⌈",
  LeftDoubleBracket: "⟦",
  LeftDownTeeVector: "⥡",
  LeftDownVector: "⇃",
  LeftDownVectorBar: "⥙",
  LeftFloor: "⌊",
  LeftRightArrow: "↔",
  LeftRightVector: "⥎",
  LeftTee: "⊣",
  LeftTeeArrow: "↤",
  LeftTeeVector: "⥚",
  LeftTriangle: "⊲",
  LeftTriangleBar: "⧏",
  LeftTriangleEqual: "⊴",
  LeftUpDownVector: "⥑",
  LeftUpTeeVector: "⥠",
  LeftUpVector: "↿",
  LeftUpVectorBar: "⥘",
  LeftVector: "↼",
  LeftVectorBar: "⥒",
  Leftarrow: "⇐",
  Leftrightarrow: "⇔",
  LessEqualGreater: "⋚",
  LessFullEqual: "≦",
  LessGreater: "≶",
  LessLess: "⪡",
  LessSlantEqual: "⩽",
  LessTilde: "≲",
  Lfr: "𝔏",
  Ll: "⋘",
  Lleftarrow: "⇚",
  Lmidot: "Ŀ",
  LongLeftArrow: "⟵",
  LongLeftRightArrow: "⟷",
  LongRightArrow: "⟶",
  Longleftarrow: "⟸",
  Longleftrightarrow: "⟺",
  Longrightarrow: "⟹",
  Lopf: "𝕃",
  LowerLeftArrow: "↙",
  LowerRightArrow: "↘",
  Lscr: "ℒ",
  Lsh: "↰",
  Lstrok: "Ł",
  Lt: "≪",
  Map: "⤅",
  Mcy: "М",
  MediumSpace: " ",
  Mellintrf: "ℳ",
  Mfr: "𝔐",
  MinusPlus: "∓",
  Mopf: "𝕄",
  Mscr: "ℳ",
  Mu: "Μ",
  NJcy: "Њ",
  Nacute: "Ń",
  Ncaron: "Ň",
  Ncedil: "Ņ",
  Ncy: "Н",
  NegativeMediumSpace: "​",
  NegativeThickSpace: "​",
  NegativeThinSpace: "​",
  NegativeVeryThinSpace: "​",
  NestedGreaterGreater: "≫",
  NestedLessLess: "≪",
  NewLine: "\n",
  Nfr: "𝔑",
  NoBreak: "⁠",
  NonBreakingSpace: " ",
  Nopf: "ℕ",
  Not: "⫬",
  NotCongruent: "≢",
  NotCupCap: "≭",
  NotDoubleVerticalBar: "∦",
  NotElement: "∉",
  NotEqual: "≠",
  NotEqualTilde: "≂̸",
  NotExists: "∄",
  NotGreater: "≯",
  NotGreaterEqual: "≱",
  NotGreaterFullEqual: "≧̸",
  NotGreaterGreater: "≫̸",
  NotGreaterLess: "≹",
  NotGreaterSlantEqual: "⩾̸",
  NotGreaterTilde: "≵",
  NotHumpDownHump: "≎̸",
  NotHumpEqual: "≏̸",
  NotLeftTriangle: "⋪",
  NotLeftTriangleBar: "⧏̸",
  NotLeftTriangleEqual: "⋬",
  NotLess: "≮",
  NotLessEqual: "≰",
  NotLessGreater: "≸",
  NotLessLess: "≪̸",
  NotLessSlantEqual: "⩽̸",
  NotLessTilde: "≴",
  NotNestedGreaterGreater: "⪢̸",
  NotNestedLessLess: "⪡̸",
  NotPrecedes: "⊀",
  NotPrecedesEqual: "⪯̸",
  NotPrecedesSlantEqual: "⋠",
  NotReverseElement: "∌",
  NotRightTriangle: "⋫",
  NotRightTriangleBar: "⧐̸",
  NotRightTriangleEqual: "⋭",
  NotSquareSubset: "⊏̸",
  NotSquareSubsetEqual: "⋢",
  NotSquareSuperset: "⊐̸",
  NotSquareSupersetEqual: "⋣",
  NotSubset: "⊂⃒",
  NotSubsetEqual: "⊈",
  NotSucceeds: "⊁",
  NotSucceedsEqual: "⪰̸",
  NotSucceedsSlantEqual: "⋡",
  NotSucceedsTilde: "≿̸",
  NotSuperset: "⊃⃒",
  NotSupersetEqual: "⊉",
  NotTilde: "≁",
  NotTildeEqual: "≄",
  NotTildeFullEqual: "≇",
  NotTildeTilde: "≉",
  NotVerticalBar: "∤",
  Nscr: "𝒩",
  Ntilde: "Ñ",
  Nu: "Ν",
  OElig: "Œ",
  Oacute: "Ó",
  Ocirc: "Ô",
  Ocy: "О",
  Odblac: "Ő",
  Ofr: "𝔒",
  Ograve: "Ò",
  Omacr: "Ō",
  Omega: "Ω",
  Omicron: "Ο",
  Oopf: "𝕆",
  OpenCurlyDoubleQuote: "“",
  OpenCurlyQuote: "‘",
  Or: "⩔",
  Oscr: "𝒪",
  Oslash: "Ø",
  Otilde: "Õ",
  Otimes: "⨷",
  Ouml: "Ö",
  OverBar: "‾",
  OverBrace: "⏞",
  OverBracket: "⎴",
  OverParenthesis: "⏜",
  PartialD: "∂",
  Pcy: "П",
  Pfr: "𝔓",
  Phi: "Φ",
  Pi: "Π",
  PlusMinus: "±",
  Poincareplane: "ℌ",
  Popf: "ℙ",
  Pr: "⪻",
  Precedes: "≺",
  PrecedesEqual: "⪯",
  PrecedesSlantEqual: "≼",
  PrecedesTilde: "≾",
  Prime: "″",
  Product: "∏",
  Proportion: "∷",
  Proportional: "∝",
  Pscr: "𝒫",
  Psi: "Ψ",
  QUOT: '"',
  Qfr: "𝔔",
  Qopf: "ℚ",
  Qscr: "𝒬",
  RBarr: "⤐",
  REG: "®",
  Racute: "Ŕ",
  Rang: "⟫",
  Rarr: "↠",
  Rarrtl: "⤖",
  Rcaron: "Ř",
  Rcedil: "Ŗ",
  Rcy: "Р",
  Re: "ℜ",
  ReverseElement: "∋",
  ReverseEquilibrium: "⇋",
  ReverseUpEquilibrium: "⥯",
  Rfr: "ℜ",
  Rho: "Ρ",
  RightAngleBracket: "⟩",
  RightArrow: "→",
  RightArrowBar: "⇥",
  RightArrowLeftArrow: "⇄",
  RightCeiling: "⌉",
  RightDoubleBracket: "⟧",
  RightDownTeeVector: "⥝",
  RightDownVector: "⇂",
  RightDownVectorBar: "⥕",
  RightFloor: "⌋",
  RightTee: "⊢",
  RightTeeArrow: "↦",
  RightTeeVector: "⥛",
  RightTriangle: "⊳",
  RightTriangleBar: "⧐",
  RightTriangleEqual: "⊵",
  RightUpDownVector: "⥏",
  RightUpTeeVector: "⥜",
  RightUpVector: "↾",
  RightUpVectorBar: "⥔",
  RightVector: "⇀",
  RightVectorBar: "⥓",
  Rightarrow: "⇒",
  Ropf: "ℝ",
  RoundImplies: "⥰",
  Rrightarrow: "⇛",
  Rscr: "ℛ",
  Rsh: "↱",
  RuleDelayed: "⧴",
  SHCHcy: "Щ",
  SHcy: "Ш",
  SOFTcy: "Ь",
  Sacute: "Ś",
  Sc: "⪼",
  Scaron: "Š",
  Scedil: "Ş",
  Scirc: "Ŝ",
  Scy: "С",
  Sfr: "𝔖",
  ShortDownArrow: "↓",
  ShortLeftArrow: "←",
  ShortRightArrow: "→",
  ShortUpArrow: "↑",
  Sigma: "Σ",
  SmallCircle: "∘",
  Sopf: "𝕊",
  Sqrt: "√",
  Square: "□",
  SquareIntersection: "⊓",
  SquareSubset: "⊏",
  SquareSubsetEqual: "⊑",
  SquareSuperset: "⊐",
  SquareSupersetEqual: "⊒",
  SquareUnion: "⊔",
  Sscr: "𝒮",
  Star: "⋆",
  Sub: "⋐",
  Subset: "⋐",
  SubsetEqual: "⊆",
  Succeeds: "≻",
  SucceedsEqual: "⪰",
  SucceedsSlantEqual: "≽",
  SucceedsTilde: "≿",
  SuchThat: "∋",
  Sum: "∑",
  Sup: "⋑",
  Superset: "⊃",
  SupersetEqual: "⊇",
  Supset: "⋑",
  THORN: "Þ",
  TRADE: "™",
  TSHcy: "Ћ",
  TScy: "Ц",
  Tab: "	",
  Tau: "Τ",
  Tcaron: "Ť",
  Tcedil: "Ţ",
  Tcy: "Т",
  Tfr: "𝔗",
  Therefore: "∴",
  Theta: "Θ",
  ThickSpace: "  ",
  ThinSpace: " ",
  Tilde: "∼",
  TildeEqual: "≃",
  TildeFullEqual: "≅",
  TildeTilde: "≈",
  Topf: "𝕋",
  TripleDot: "⃛",
  Tscr: "𝒯",
  Tstrok: "Ŧ",
  Uacute: "Ú",
  Uarr: "↟",
  Uarrocir: "⥉",
  Ubrcy: "Ў",
  Ubreve: "Ŭ",
  Ucirc: "Û",
  Ucy: "У",
  Udblac: "Ű",
  Ufr: "𝔘",
  Ugrave: "Ù",
  Umacr: "Ū",
  UnderBar: "_",
  UnderBrace: "⏟",
  UnderBracket: "⎵",
  UnderParenthesis: "⏝",
  Union: "⋃",
  UnionPlus: "⊎",
  Uogon: "Ų",
  Uopf: "𝕌",
  UpArrow: "↑",
  UpArrowBar: "⤒",
  UpArrowDownArrow: "⇅",
  UpDownArrow: "↕",
  UpEquilibrium: "⥮",
  UpTee: "⊥",
  UpTeeArrow: "↥",
  Uparrow: "⇑",
  Updownarrow: "⇕",
  UpperLeftArrow: "↖",
  UpperRightArrow: "↗",
  Upsi: "ϒ",
  Upsilon: "Υ",
  Uring: "Ů",
  Uscr: "𝒰",
  Utilde: "Ũ",
  Uuml: "Ü",
  VDash: "⊫",
  Vbar: "⫫",
  Vcy: "В",
  Vdash: "⊩",
  Vdashl: "⫦",
  Vee: "⋁",
  Verbar: "‖",
  Vert: "‖",
  VerticalBar: "∣",
  VerticalLine: "|",
  VerticalSeparator: "❘",
  VerticalTilde: "≀",
  VeryThinSpace: " ",
  Vfr: "𝔙",
  Vopf: "𝕍",
  Vscr: "𝒱",
  Vvdash: "⊪",
  Wcirc: "Ŵ",
  Wedge: "⋀",
  Wfr: "𝔚",
  Wopf: "𝕎",
  Wscr: "𝒲",
  Xfr: "𝔛",
  Xi: "Ξ",
  Xopf: "𝕏",
  Xscr: "𝒳",
  YAcy: "Я",
  YIcy: "Ї",
  YUcy: "Ю",
  Yacute: "Ý",
  Ycirc: "Ŷ",
  Ycy: "Ы",
  Yfr: "𝔜",
  Yopf: "𝕐",
  Yscr: "𝒴",
  Yuml: "Ÿ",
  ZHcy: "Ж",
  Zacute: "Ź",
  Zcaron: "Ž",
  Zcy: "З",
  Zdot: "Ż",
  ZeroWidthSpace: "​",
  Zeta: "Ζ",
  Zfr: "ℨ",
  Zopf: "ℤ",
  Zscr: "𝒵",
  aacute: "á",
  abreve: "ă",
  ac: "∾",
  acE: "∾̳",
  acd: "∿",
  acirc: "â",
  acute: "´",
  acy: "а",
  aelig: "æ",
  af: "⁡",
  afr: "𝔞",
  agrave: "à",
  alefsym: "ℵ",
  aleph: "ℵ",
  alpha: "α",
  amacr: "ā",
  amalg: "⨿",
  amp: "&",
  and: "∧",
  andand: "⩕",
  andd: "⩜",
  andslope: "⩘",
  andv: "⩚",
  ang: "∠",
  ange: "⦤",
  angle: "∠",
  angmsd: "∡",
  angmsdaa: "⦨",
  angmsdab: "⦩",
  angmsdac: "⦪",
  angmsdad: "⦫",
  angmsdae: "⦬",
  angmsdaf: "⦭",
  angmsdag: "⦮",
  angmsdah: "⦯",
  angrt: "∟",
  angrtvb: "⊾",
  angrtvbd: "⦝",
  angsph: "∢",
  angst: "Å",
  angzarr: "⍼",
  aogon: "ą",
  aopf: "𝕒",
  ap: "≈",
  apE: "⩰",
  apacir: "⩯",
  ape: "≊",
  apid: "≋",
  apos: "'",
  approx: "≈",
  approxeq: "≊",
  aring: "å",
  ascr: "𝒶",
  ast: "*",
  asymp: "≈",
  asympeq: "≍",
  atilde: "ã",
  auml: "ä",
  awconint: "∳",
  awint: "⨑",
  bNot: "⫭",
  backcong: "≌",
  backepsilon: "϶",
  backprime: "‵",
  backsim: "∽",
  backsimeq: "⋍",
  barvee: "⊽",
  barwed: "⌅",
  barwedge: "⌅",
  bbrk: "⎵",
  bbrktbrk: "⎶",
  bcong: "≌",
  bcy: "б",
  bdquo: "„",
  becaus: "∵",
  because: "∵",
  bemptyv: "⦰",
  bepsi: "϶",
  bernou: "ℬ",
  beta: "β",
  beth: "ℶ",
  between: "≬",
  bfr: "𝔟",
  bigcap: "⋂",
  bigcirc: "◯",
  bigcup: "⋃",
  bigodot: "⨀",
  bigoplus: "⨁",
  bigotimes: "⨂",
  bigsqcup: "⨆",
  bigstar: "★",
  bigtriangledown: "▽",
  bigtriangleup: "△",
  biguplus: "⨄",
  bigvee: "⋁",
  bigwedge: "⋀",
  bkarow: "⤍",
  blacklozenge: "⧫",
  blacksquare: "▪",
  blacktriangle: "▴",
  blacktriangledown: "▾",
  blacktriangleleft: "◂",
  blacktriangleright: "▸",
  blank: "␣",
  blk12: "▒",
  blk14: "░",
  blk34: "▓",
  block: "█",
  bne: "=⃥",
  bnequiv: "≡⃥",
  bnot: "⌐",
  bopf: "𝕓",
  bot: "⊥",
  bottom: "⊥",
  bowtie: "⋈",
  boxDL: "╗",
  boxDR: "╔",
  boxDl: "╖",
  boxDr: "╓",
  boxH: "═",
  boxHD: "╦",
  boxHU: "╩",
  boxHd: "╤",
  boxHu: "╧",
  boxUL: "╝",
  boxUR: "╚",
  boxUl: "╜",
  boxUr: "╙",
  boxV: "║",
  boxVH: "╬",
  boxVL: "╣",
  boxVR: "╠",
  boxVh: "╫",
  boxVl: "╢",
  boxVr: "╟",
  boxbox: "⧉",
  boxdL: "╕",
  boxdR: "╒",
  boxdl: "┐",
  boxdr: "┌",
  boxh: "─",
  boxhD: "╥",
  boxhU: "╨",
  boxhd: "┬",
  boxhu: "┴",
  boxminus: "⊟",
  boxplus: "⊞",
  boxtimes: "⊠",
  boxuL: "╛",
  boxuR: "╘",
  boxul: "┘",
  boxur: "└",
  boxv: "│",
  boxvH: "╪",
  boxvL: "╡",
  boxvR: "╞",
  boxvh: "┼",
  boxvl: "┤",
  boxvr: "├",
  bprime: "‵",
  breve: "˘",
  brvbar: "¦",
  bscr: "𝒷",
  bsemi: "⁏",
  bsim: "∽",
  bsime: "⋍",
  bsol: "\\",
  bsolb: "⧅",
  bsolhsub: "⟈",
  bull: "•",
  bullet: "•",
  bump: "≎",
  bumpE: "⪮",
  bumpe: "≏",
  bumpeq: "≏",
  cacute: "ć",
  cap: "∩",
  capand: "⩄",
  capbrcup: "⩉",
  capcap: "⩋",
  capcup: "⩇",
  capdot: "⩀",
  caps: "∩︀",
  caret: "⁁",
  caron: "ˇ",
  ccaps: "⩍",
  ccaron: "č",
  ccedil: "ç",
  ccirc: "ĉ",
  ccups: "⩌",
  ccupssm: "⩐",
  cdot: "ċ",
  cedil: "¸",
  cemptyv: "⦲",
  cent: "¢",
  centerdot: "·",
  cfr: "𝔠",
  chcy: "ч",
  check: "✓",
  checkmark: "✓",
  chi: "χ",
  cir: "○",
  cirE: "⧃",
  circ: "ˆ",
  circeq: "≗",
  circlearrowleft: "↺",
  circlearrowright: "↻",
  circledR: "®",
  circledS: "Ⓢ",
  circledast: "⊛",
  circledcirc: "⊚",
  circleddash: "⊝",
  cire: "≗",
  cirfnint: "⨐",
  cirmid: "⫯",
  cirscir: "⧂",
  clubs: "♣",
  clubsuit: "♣",
  colon: ":",
  colone: "≔",
  coloneq: "≔",
  comma: ",",
  commat: "@",
  comp: "∁",
  compfn: "∘",
  complement: "∁",
  complexes: "ℂ",
  cong: "≅",
  congdot: "⩭",
  conint: "∮",
  copf: "𝕔",
  coprod: "∐",
  copy: "©",
  copysr: "℗",
  crarr: "↵",
  cross: "✗",
  cscr: "𝒸",
  csub: "⫏",
  csube: "⫑",
  csup: "⫐",
  csupe: "⫒",
  ctdot: "⋯",
  cudarrl: "⤸",
  cudarrr: "⤵",
  cuepr: "⋞",
  cuesc: "⋟",
  cularr: "↶",
  cularrp: "⤽",
  cup: "∪",
  cupbrcap: "⩈",
  cupcap: "⩆",
  cupcup: "⩊",
  cupdot: "⊍",
  cupor: "⩅",
  cups: "∪︀",
  curarr: "↷",
  curarrm: "⤼",
  curlyeqprec: "⋞",
  curlyeqsucc: "⋟",
  curlyvee: "⋎",
  curlywedge: "⋏",
  curren: "¤",
  curvearrowleft: "↶",
  curvearrowright: "↷",
  cuvee: "⋎",
  cuwed: "⋏",
  cwconint: "∲",
  cwint: "∱",
  cylcty: "⌭",
  dArr: "⇓",
  dHar: "⥥",
  dagger: "†",
  daleth: "ℸ",
  darr: "↓",
  dash: "‐",
  dashv: "⊣",
  dbkarow: "⤏",
  dblac: "˝",
  dcaron: "ď",
  dcy: "д",
  dd: "ⅆ",
  ddagger: "‡",
  ddarr: "⇊",
  ddotseq: "⩷",
  deg: "°",
  delta: "δ",
  demptyv: "⦱",
  dfisht: "⥿",
  dfr: "𝔡",
  dharl: "⇃",
  dharr: "⇂",
  diam: "⋄",
  diamond: "⋄",
  diamondsuit: "♦",
  diams: "♦",
  die: "¨",
  digamma: "ϝ",
  disin: "⋲",
  div: "÷",
  divide: "÷",
  divideontimes: "⋇",
  divonx: "⋇",
  djcy: "ђ",
  dlcorn: "⌞",
  dlcrop: "⌍",
  dollar: "$",
  dopf: "𝕕",
  dot: "˙",
  doteq: "≐",
  doteqdot: "≑",
  dotminus: "∸",
  dotplus: "∔",
  dotsquare: "⊡",
  doublebarwedge: "⌆",
  downarrow: "↓",
  downdownarrows: "⇊",
  downharpoonleft: "⇃",
  downharpoonright: "⇂",
  drbkarow: "⤐",
  drcorn: "⌟",
  drcrop: "⌌",
  dscr: "𝒹",
  dscy: "ѕ",
  dsol: "⧶",
  dstrok: "đ",
  dtdot: "⋱",
  dtri: "▿",
  dtrif: "▾",
  duarr: "⇵",
  duhar: "⥯",
  dwangle: "⦦",
  dzcy: "џ",
  dzigrarr: "⟿",
  eDDot: "⩷",
  eDot: "≑",
  eacute: "é",
  easter: "⩮",
  ecaron: "ě",
  ecir: "≖",
  ecirc: "ê",
  ecolon: "≕",
  ecy: "э",
  edot: "ė",
  ee: "ⅇ",
  efDot: "≒",
  efr: "𝔢",
  eg: "⪚",
  egrave: "è",
  egs: "⪖",
  egsdot: "⪘",
  el: "⪙",
  elinters: "⏧",
  ell: "ℓ",
  els: "⪕",
  elsdot: "⪗",
  emacr: "ē",
  empty: "∅",
  emptyset: "∅",
  emptyv: "∅",
  emsp13: " ",
  emsp14: " ",
  emsp: " ",
  eng: "ŋ",
  ensp: " ",
  eogon: "ę",
  eopf: "𝕖",
  epar: "⋕",
  eparsl: "⧣",
  eplus: "⩱",
  epsi: "ε",
  epsilon: "ε",
  epsiv: "ϵ",
  eqcirc: "≖",
  eqcolon: "≕",
  eqsim: "≂",
  eqslantgtr: "⪖",
  eqslantless: "⪕",
  equals: "=",
  equest: "≟",
  equiv: "≡",
  equivDD: "⩸",
  eqvparsl: "⧥",
  erDot: "≓",
  erarr: "⥱",
  escr: "ℯ",
  esdot: "≐",
  esim: "≂",
  eta: "η",
  eth: "ð",
  euml: "ë",
  euro: "€",
  excl: "!",
  exist: "∃",
  expectation: "ℰ",
  exponentiale: "ⅇ",
  fallingdotseq: "≒",
  fcy: "ф",
  female: "♀",
  ffilig: "ﬃ",
  fflig: "ﬀ",
  ffllig: "ﬄ",
  ffr: "𝔣",
  filig: "ﬁ",
  fjlig: "fj",
  flat: "♭",
  fllig: "ﬂ",
  fltns: "▱",
  fnof: "ƒ",
  fopf: "𝕗",
  forall: "∀",
  fork: "⋔",
  forkv: "⫙",
  fpartint: "⨍",
  frac12: "½",
  frac13: "⅓",
  frac14: "¼",
  frac15: "⅕",
  frac16: "⅙",
  frac18: "⅛",
  frac23: "⅔",
  frac25: "⅖",
  frac34: "¾",
  frac35: "⅗",
  frac38: "⅜",
  frac45: "⅘",
  frac56: "⅚",
  frac58: "⅝",
  frac78: "⅞",
  frasl: "⁄",
  frown: "⌢",
  fscr: "𝒻",
  gE: "≧",
  gEl: "⪌",
  gacute: "ǵ",
  gamma: "γ",
  gammad: "ϝ",
  gap: "⪆",
  gbreve: "ğ",
  gcirc: "ĝ",
  gcy: "г",
  gdot: "ġ",
  ge: "≥",
  gel: "⋛",
  geq: "≥",
  geqq: "≧",
  geqslant: "⩾",
  ges: "⩾",
  gescc: "⪩",
  gesdot: "⪀",
  gesdoto: "⪂",
  gesdotol: "⪄",
  gesl: "⋛︀",
  gesles: "⪔",
  gfr: "𝔤",
  gg: "≫",
  ggg: "⋙",
  gimel: "ℷ",
  gjcy: "ѓ",
  gl: "≷",
  glE: "⪒",
  gla: "⪥",
  glj: "⪤",
  gnE: "≩",
  gnap: "⪊",
  gnapprox: "⪊",
  gne: "⪈",
  gneq: "⪈",
  gneqq: "≩",
  gnsim: "⋧",
  gopf: "𝕘",
  grave: "`",
  gscr: "ℊ",
  gsim: "≳",
  gsime: "⪎",
  gsiml: "⪐",
  gt: ">",
  gtcc: "⪧",
  gtcir: "⩺",
  gtdot: "⋗",
  gtlPar: "⦕",
  gtquest: "⩼",
  gtrapprox: "⪆",
  gtrarr: "⥸",
  gtrdot: "⋗",
  gtreqless: "⋛",
  gtreqqless: "⪌",
  gtrless: "≷",
  gtrsim: "≳",
  gvertneqq: "≩︀",
  gvnE: "≩︀",
  hArr: "⇔",
  hairsp: " ",
  half: "½",
  hamilt: "ℋ",
  hardcy: "ъ",
  harr: "↔",
  harrcir: "⥈",
  harrw: "↭",
  hbar: "ℏ",
  hcirc: "ĥ",
  hearts: "♥",
  heartsuit: "♥",
  hellip: "…",
  hercon: "⊹",
  hfr: "𝔥",
  hksearow: "⤥",
  hkswarow: "⤦",
  hoarr: "⇿",
  homtht: "∻",
  hookleftarrow: "↩",
  hookrightarrow: "↪",
  hopf: "𝕙",
  horbar: "―",
  hscr: "𝒽",
  hslash: "ℏ",
  hstrok: "ħ",
  hybull: "⁃",
  hyphen: "‐",
  iacute: "í",
  ic: "⁣",
  icirc: "î",
  icy: "и",
  iecy: "е",
  iexcl: "¡",
  iff: "⇔",
  ifr: "𝔦",
  igrave: "ì",
  ii: "ⅈ",
  iiiint: "⨌",
  iiint: "∭",
  iinfin: "⧜",
  iiota: "℩",
  ijlig: "ĳ",
  imacr: "ī",
  image: "ℑ",
  imagline: "ℐ",
  imagpart: "ℑ",
  imath: "ı",
  imof: "⊷",
  imped: "Ƶ",
  in: "∈",
  incare: "℅",
  infin: "∞",
  infintie: "⧝",
  inodot: "ı",
  int: "∫",
  intcal: "⊺",
  integers: "ℤ",
  intercal: "⊺",
  intlarhk: "⨗",
  intprod: "⨼",
  iocy: "ё",
  iogon: "į",
  iopf: "𝕚",
  iota: "ι",
  iprod: "⨼",
  iquest: "¿",
  iscr: "𝒾",
  isin: "∈",
  isinE: "⋹",
  isindot: "⋵",
  isins: "⋴",
  isinsv: "⋳",
  isinv: "∈",
  it: "⁢",
  itilde: "ĩ",
  iukcy: "і",
  iuml: "ï",
  jcirc: "ĵ",
  jcy: "й",
  jfr: "𝔧",
  jmath: "ȷ",
  jopf: "𝕛",
  jscr: "𝒿",
  jsercy: "ј",
  jukcy: "є",
  kappa: "κ",
  kappav: "ϰ",
  kcedil: "ķ",
  kcy: "к",
  kfr: "𝔨",
  kgreen: "ĸ",
  khcy: "х",
  kjcy: "ќ",
  kopf: "𝕜",
  kscr: "𝓀",
  lAarr: "⇚",
  lArr: "⇐",
  lAtail: "⤛",
  lBarr: "⤎",
  lE: "≦",
  lEg: "⪋",
  lHar: "⥢",
  lacute: "ĺ",
  laemptyv: "⦴",
  lagran: "ℒ",
  lambda: "λ",
  lang: "⟨",
  langd: "⦑",
  langle: "⟨",
  lap: "⪅",
  laquo: "«",
  larr: "←",
  larrb: "⇤",
  larrbfs: "⤟",
  larrfs: "⤝",
  larrhk: "↩",
  larrlp: "↫",
  larrpl: "⤹",
  larrsim: "⥳",
  larrtl: "↢",
  lat: "⪫",
  latail: "⤙",
  late: "⪭",
  lates: "⪭︀",
  lbarr: "⤌",
  lbbrk: "❲",
  lbrace: "{",
  lbrack: "[",
  lbrke: "⦋",
  lbrksld: "⦏",
  lbrkslu: "⦍",
  lcaron: "ľ",
  lcedil: "ļ",
  lceil: "⌈",
  lcub: "{",
  lcy: "л",
  ldca: "⤶",
  ldquo: "“",
  ldquor: "„",
  ldrdhar: "⥧",
  ldrushar: "⥋",
  ldsh: "↲",
  le: "≤",
  leftarrow: "←",
  leftarrowtail: "↢",
  leftharpoondown: "↽",
  leftharpoonup: "↼",
  leftleftarrows: "⇇",
  leftrightarrow: "↔",
  leftrightarrows: "⇆",
  leftrightharpoons: "⇋",
  leftrightsquigarrow: "↭",
  leftthreetimes: "⋋",
  leg: "⋚",
  leq: "≤",
  leqq: "≦",
  leqslant: "⩽",
  les: "⩽",
  lescc: "⪨",
  lesdot: "⩿",
  lesdoto: "⪁",
  lesdotor: "⪃",
  lesg: "⋚︀",
  lesges: "⪓",
  lessapprox: "⪅",
  lessdot: "⋖",
  lesseqgtr: "⋚",
  lesseqqgtr: "⪋",
  lessgtr: "≶",
  lesssim: "≲",
  lfisht: "⥼",
  lfloor: "⌊",
  lfr: "𝔩",
  lg: "≶",
  lgE: "⪑",
  lhard: "↽",
  lharu: "↼",
  lharul: "⥪",
  lhblk: "▄",
  ljcy: "љ",
  ll: "≪",
  llarr: "⇇",
  llcorner: "⌞",
  llhard: "⥫",
  lltri: "◺",
  lmidot: "ŀ",
  lmoust: "⎰",
  lmoustache: "⎰",
  lnE: "≨",
  lnap: "⪉",
  lnapprox: "⪉",
  lne: "⪇",
  lneq: "⪇",
  lneqq: "≨",
  lnsim: "⋦",
  loang: "⟬",
  loarr: "⇽",
  lobrk: "⟦",
  longleftarrow: "⟵",
  longleftrightarrow: "⟷",
  longmapsto: "⟼",
  longrightarrow: "⟶",
  looparrowleft: "↫",
  looparrowright: "↬",
  lopar: "⦅",
  lopf: "𝕝",
  loplus: "⨭",
  lotimes: "⨴",
  lowast: "∗",
  lowbar: "_",
  loz: "◊",
  lozenge: "◊",
  lozf: "⧫",
  lpar: "(",
  lparlt: "⦓",
  lrarr: "⇆",
  lrcorner: "⌟",
  lrhar: "⇋",
  lrhard: "⥭",
  lrm: "‎",
  lrtri: "⊿",
  lsaquo: "‹",
  lscr: "𝓁",
  lsh: "↰",
  lsim: "≲",
  lsime: "⪍",
  lsimg: "⪏",
  lsqb: "[",
  lsquo: "‘",
  lsquor: "‚",
  lstrok: "ł",
  lt: "<",
  ltcc: "⪦",
  ltcir: "⩹",
  ltdot: "⋖",
  lthree: "⋋",
  ltimes: "⋉",
  ltlarr: "⥶",
  ltquest: "⩻",
  ltrPar: "⦖",
  ltri: "◃",
  ltrie: "⊴",
  ltrif: "◂",
  lurdshar: "⥊",
  luruhar: "⥦",
  lvertneqq: "≨︀",
  lvnE: "≨︀",
  mDDot: "∺",
  macr: "¯",
  male: "♂",
  malt: "✠",
  maltese: "✠",
  map: "↦",
  mapsto: "↦",
  mapstodown: "↧",
  mapstoleft: "↤",
  mapstoup: "↥",
  marker: "▮",
  mcomma: "⨩",
  mcy: "м",
  mdash: "—",
  measuredangle: "∡",
  mfr: "𝔪",
  mho: "℧",
  micro: "µ",
  mid: "∣",
  midast: "*",
  midcir: "⫰",
  middot: "·",
  minus: "−",
  minusb: "⊟",
  minusd: "∸",
  minusdu: "⨪",
  mlcp: "⫛",
  mldr: "…",
  mnplus: "∓",
  models: "⊧",
  mopf: "𝕞",
  mp: "∓",
  mscr: "𝓂",
  mstpos: "∾",
  mu: "μ",
  multimap: "⊸",
  mumap: "⊸",
  nGg: "⋙̸",
  nGt: "≫⃒",
  nGtv: "≫̸",
  nLeftarrow: "⇍",
  nLeftrightarrow: "⇎",
  nLl: "⋘̸",
  nLt: "≪⃒",
  nLtv: "≪̸",
  nRightarrow: "⇏",
  nVDash: "⊯",
  nVdash: "⊮",
  nabla: "∇",
  nacute: "ń",
  nang: "∠⃒",
  nap: "≉",
  napE: "⩰̸",
  napid: "≋̸",
  napos: "ŉ",
  napprox: "≉",
  natur: "♮",
  natural: "♮",
  naturals: "ℕ",
  nbsp: " ",
  nbump: "≎̸",
  nbumpe: "≏̸",
  ncap: "⩃",
  ncaron: "ň",
  ncedil: "ņ",
  ncong: "≇",
  ncongdot: "⩭̸",
  ncup: "⩂",
  ncy: "н",
  ndash: "–",
  ne: "≠",
  neArr: "⇗",
  nearhk: "⤤",
  nearr: "↗",
  nearrow: "↗",
  nedot: "≐̸",
  nequiv: "≢",
  nesear: "⤨",
  nesim: "≂̸",
  nexist: "∄",
  nexists: "∄",
  nfr: "𝔫",
  ngE: "≧̸",
  nge: "≱",
  ngeq: "≱",
  ngeqq: "≧̸",
  ngeqslant: "⩾̸",
  nges: "⩾̸",
  ngsim: "≵",
  ngt: "≯",
  ngtr: "≯",
  nhArr: "⇎",
  nharr: "↮",
  nhpar: "⫲",
  ni: "∋",
  nis: "⋼",
  nisd: "⋺",
  niv: "∋",
  njcy: "њ",
  nlArr: "⇍",
  nlE: "≦̸",
  nlarr: "↚",
  nldr: "‥",
  nle: "≰",
  nleftarrow: "↚",
  nleftrightarrow: "↮",
  nleq: "≰",
  nleqq: "≦̸",
  nleqslant: "⩽̸",
  nles: "⩽̸",
  nless: "≮",
  nlsim: "≴",
  nlt: "≮",
  nltri: "⋪",
  nltrie: "⋬",
  nmid: "∤",
  nopf: "𝕟",
  not: "¬",
  notin: "∉",
  notinE: "⋹̸",
  notindot: "⋵̸",
  notinva: "∉",
  notinvb: "⋷",
  notinvc: "⋶",
  notni: "∌",
  notniva: "∌",
  notnivb: "⋾",
  notnivc: "⋽",
  npar: "∦",
  nparallel: "∦",
  nparsl: "⫽⃥",
  npart: "∂̸",
  npolint: "⨔",
  npr: "⊀",
  nprcue: "⋠",
  npre: "⪯̸",
  nprec: "⊀",
  npreceq: "⪯̸",
  nrArr: "⇏",
  nrarr: "↛",
  nrarrc: "⤳̸",
  nrarrw: "↝̸",
  nrightarrow: "↛",
  nrtri: "⋫",
  nrtrie: "⋭",
  nsc: "⊁",
  nsccue: "⋡",
  nsce: "⪰̸",
  nscr: "𝓃",
  nshortmid: "∤",
  nshortparallel: "∦",
  nsim: "≁",
  nsime: "≄",
  nsimeq: "≄",
  nsmid: "∤",
  nspar: "∦",
  nsqsube: "⋢",
  nsqsupe: "⋣",
  nsub: "⊄",
  nsubE: "⫅̸",
  nsube: "⊈",
  nsubset: "⊂⃒",
  nsubseteq: "⊈",
  nsubseteqq: "⫅̸",
  nsucc: "⊁",
  nsucceq: "⪰̸",
  nsup: "⊅",
  nsupE: "⫆̸",
  nsupe: "⊉",
  nsupset: "⊃⃒",
  nsupseteq: "⊉",
  nsupseteqq: "⫆̸",
  ntgl: "≹",
  ntilde: "ñ",
  ntlg: "≸",
  ntriangleleft: "⋪",
  ntrianglelefteq: "⋬",
  ntriangleright: "⋫",
  ntrianglerighteq: "⋭",
  nu: "ν",
  num: "#",
  numero: "№",
  numsp: " ",
  nvDash: "⊭",
  nvHarr: "⤄",
  nvap: "≍⃒",
  nvdash: "⊬",
  nvge: "≥⃒",
  nvgt: ">⃒",
  nvinfin: "⧞",
  nvlArr: "⤂",
  nvle: "≤⃒",
  nvlt: "<⃒",
  nvltrie: "⊴⃒",
  nvrArr: "⤃",
  nvrtrie: "⊵⃒",
  nvsim: "∼⃒",
  nwArr: "⇖",
  nwarhk: "⤣",
  nwarr: "↖",
  nwarrow: "↖",
  nwnear: "⤧",
  oS: "Ⓢ",
  oacute: "ó",
  oast: "⊛",
  ocir: "⊚",
  ocirc: "ô",
  ocy: "о",
  odash: "⊝",
  odblac: "ő",
  odiv: "⨸",
  odot: "⊙",
  odsold: "⦼",
  oelig: "œ",
  ofcir: "⦿",
  ofr: "𝔬",
  ogon: "˛",
  ograve: "ò",
  ogt: "⧁",
  ohbar: "⦵",
  ohm: "Ω",
  oint: "∮",
  olarr: "↺",
  olcir: "⦾",
  olcross: "⦻",
  oline: "‾",
  olt: "⧀",
  omacr: "ō",
  omega: "ω",
  omicron: "ο",
  omid: "⦶",
  ominus: "⊖",
  oopf: "𝕠",
  opar: "⦷",
  operp: "⦹",
  oplus: "⊕",
  or: "∨",
  orarr: "↻",
  ord: "⩝",
  order: "ℴ",
  orderof: "ℴ",
  ordf: "ª",
  ordm: "º",
  origof: "⊶",
  oror: "⩖",
  orslope: "⩗",
  orv: "⩛",
  oscr: "ℴ",
  oslash: "ø",
  osol: "⊘",
  otilde: "õ",
  otimes: "⊗",
  otimesas: "⨶",
  ouml: "ö",
  ovbar: "⌽",
  par: "∥",
  para: "¶",
  parallel: "∥",
  parsim: "⫳",
  parsl: "⫽",
  part: "∂",
  pcy: "п",
  percnt: "%",
  period: ".",
  permil: "‰",
  perp: "⊥",
  pertenk: "‱",
  pfr: "𝔭",
  phi: "φ",
  phiv: "ϕ",
  phmmat: "ℳ",
  phone: "☎",
  pi: "π",
  pitchfork: "⋔",
  piv: "ϖ",
  planck: "ℏ",
  planckh: "ℎ",
  plankv: "ℏ",
  plus: "+",
  plusacir: "⨣",
  plusb: "⊞",
  pluscir: "⨢",
  plusdo: "∔",
  plusdu: "⨥",
  pluse: "⩲",
  plusmn: "±",
  plussim: "⨦",
  plustwo: "⨧",
  pm: "±",
  pointint: "⨕",
  popf: "𝕡",
  pound: "£",
  pr: "≺",
  prE: "⪳",
  prap: "⪷",
  prcue: "≼",
  pre: "⪯",
  prec: "≺",
  precapprox: "⪷",
  preccurlyeq: "≼",
  preceq: "⪯",
  precnapprox: "⪹",
  precneqq: "⪵",
  precnsim: "⋨",
  precsim: "≾",
  prime: "′",
  primes: "ℙ",
  prnE: "⪵",
  prnap: "⪹",
  prnsim: "⋨",
  prod: "∏",
  profalar: "⌮",
  profline: "⌒",
  profsurf: "⌓",
  prop: "∝",
  propto: "∝",
  prsim: "≾",
  prurel: "⊰",
  pscr: "𝓅",
  psi: "ψ",
  puncsp: " ",
  qfr: "𝔮",
  qint: "⨌",
  qopf: "𝕢",
  qprime: "⁗",
  qscr: "𝓆",
  quaternions: "ℍ",
  quatint: "⨖",
  quest: "?",
  questeq: "≟",
  quot: '"',
  rAarr: "⇛",
  rArr: "⇒",
  rAtail: "⤜",
  rBarr: "⤏",
  rHar: "⥤",
  race: "∽̱",
  racute: "ŕ",
  radic: "√",
  raemptyv: "⦳",
  rang: "⟩",
  rangd: "⦒",
  range: "⦥",
  rangle: "⟩",
  raquo: "»",
  rarr: "→",
  rarrap: "⥵",
  rarrb: "⇥",
  rarrbfs: "⤠",
  rarrc: "⤳",
  rarrfs: "⤞",
  rarrhk: "↪",
  rarrlp: "↬",
  rarrpl: "⥅",
  rarrsim: "⥴",
  rarrtl: "↣",
  rarrw: "↝",
  ratail: "⤚",
  ratio: "∶",
  rationals: "ℚ",
  rbarr: "⤍",
  rbbrk: "❳",
  rbrace: "}",
  rbrack: "]",
  rbrke: "⦌",
  rbrksld: "⦎",
  rbrkslu: "⦐",
  rcaron: "ř",
  rcedil: "ŗ",
  rceil: "⌉",
  rcub: "}",
  rcy: "р",
  rdca: "⤷",
  rdldhar: "⥩",
  rdquo: "”",
  rdquor: "”",
  rdsh: "↳",
  real: "ℜ",
  realine: "ℛ",
  realpart: "ℜ",
  reals: "ℝ",
  rect: "▭",
  reg: "®",
  rfisht: "⥽",
  rfloor: "⌋",
  rfr: "𝔯",
  rhard: "⇁",
  rharu: "⇀",
  rharul: "⥬",
  rho: "ρ",
  rhov: "ϱ",
  rightarrow: "→",
  rightarrowtail: "↣",
  rightharpoondown: "⇁",
  rightharpoonup: "⇀",
  rightleftarrows: "⇄",
  rightleftharpoons: "⇌",
  rightrightarrows: "⇉",
  rightsquigarrow: "↝",
  rightthreetimes: "⋌",
  ring: "˚",
  risingdotseq: "≓",
  rlarr: "⇄",
  rlhar: "⇌",
  rlm: "‏",
  rmoust: "⎱",
  rmoustache: "⎱",
  rnmid: "⫮",
  roang: "⟭",
  roarr: "⇾",
  robrk: "⟧",
  ropar: "⦆",
  ropf: "𝕣",
  roplus: "⨮",
  rotimes: "⨵",
  rpar: ")",
  rpargt: "⦔",
  rppolint: "⨒",
  rrarr: "⇉",
  rsaquo: "›",
  rscr: "𝓇",
  rsh: "↱",
  rsqb: "]",
  rsquo: "’",
  rsquor: "’",
  rthree: "⋌",
  rtimes: "⋊",
  rtri: "▹",
  rtrie: "⊵",
  rtrif: "▸",
  rtriltri: "⧎",
  ruluhar: "⥨",
  rx: "℞",
  sacute: "ś",
  sbquo: "‚",
  sc: "≻",
  scE: "⪴",
  scap: "⪸",
  scaron: "š",
  sccue: "≽",
  sce: "⪰",
  scedil: "ş",
  scirc: "ŝ",
  scnE: "⪶",
  scnap: "⪺",
  scnsim: "⋩",
  scpolint: "⨓",
  scsim: "≿",
  scy: "с",
  sdot: "⋅",
  sdotb: "⊡",
  sdote: "⩦",
  seArr: "⇘",
  searhk: "⤥",
  searr: "↘",
  searrow: "↘",
  sect: "§",
  semi: ";",
  seswar: "⤩",
  setminus: "∖",
  setmn: "∖",
  sext: "✶",
  sfr: "𝔰",
  sfrown: "⌢",
  sharp: "♯",
  shchcy: "щ",
  shcy: "ш",
  shortmid: "∣",
  shortparallel: "∥",
  shy: "­",
  sigma: "σ",
  sigmaf: "ς",
  sigmav: "ς",
  sim: "∼",
  simdot: "⩪",
  sime: "≃",
  simeq: "≃",
  simg: "⪞",
  simgE: "⪠",
  siml: "⪝",
  simlE: "⪟",
  simne: "≆",
  simplus: "⨤",
  simrarr: "⥲",
  slarr: "←",
  smallsetminus: "∖",
  smashp: "⨳",
  smeparsl: "⧤",
  smid: "∣",
  smile: "⌣",
  smt: "⪪",
  smte: "⪬",
  smtes: "⪬︀",
  softcy: "ь",
  sol: "/",
  solb: "⧄",
  solbar: "⌿",
  sopf: "𝕤",
  spades: "♠",
  spadesuit: "♠",
  spar: "∥",
  sqcap: "⊓",
  sqcaps: "⊓︀",
  sqcup: "⊔",
  sqcups: "⊔︀",
  sqsub: "⊏",
  sqsube: "⊑",
  sqsubset: "⊏",
  sqsubseteq: "⊑",
  sqsup: "⊐",
  sqsupe: "⊒",
  sqsupset: "⊐",
  sqsupseteq: "⊒",
  squ: "□",
  square: "□",
  squarf: "▪",
  squf: "▪",
  srarr: "→",
  sscr: "𝓈",
  ssetmn: "∖",
  ssmile: "⌣",
  sstarf: "⋆",
  star: "☆",
  starf: "★",
  straightepsilon: "ϵ",
  straightphi: "ϕ",
  strns: "¯",
  sub: "⊂",
  subE: "⫅",
  subdot: "⪽",
  sube: "⊆",
  subedot: "⫃",
  submult: "⫁",
  subnE: "⫋",
  subne: "⊊",
  subplus: "⪿",
  subrarr: "⥹",
  subset: "⊂",
  subseteq: "⊆",
  subseteqq: "⫅",
  subsetneq: "⊊",
  subsetneqq: "⫋",
  subsim: "⫇",
  subsub: "⫕",
  subsup: "⫓",
  succ: "≻",
  succapprox: "⪸",
  succcurlyeq: "≽",
  succeq: "⪰",
  succnapprox: "⪺",
  succneqq: "⪶",
  succnsim: "⋩",
  succsim: "≿",
  sum: "∑",
  sung: "♪",
  sup1: "¹",
  sup2: "²",
  sup3: "³",
  sup: "⊃",
  supE: "⫆",
  supdot: "⪾",
  supdsub: "⫘",
  supe: "⊇",
  supedot: "⫄",
  suphsol: "⟉",
  suphsub: "⫗",
  suplarr: "⥻",
  supmult: "⫂",
  supnE: "⫌",
  supne: "⊋",
  supplus: "⫀",
  supset: "⊃",
  supseteq: "⊇",
  supseteqq: "⫆",
  supsetneq: "⊋",
  supsetneqq: "⫌",
  supsim: "⫈",
  supsub: "⫔",
  supsup: "⫖",
  swArr: "⇙",
  swarhk: "⤦",
  swarr: "↙",
  swarrow: "↙",
  swnwar: "⤪",
  szlig: "ß",
  target: "⌖",
  tau: "τ",
  tbrk: "⎴",
  tcaron: "ť",
  tcedil: "ţ",
  tcy: "т",
  tdot: "⃛",
  telrec: "⌕",
  tfr: "𝔱",
  there4: "∴",
  therefore: "∴",
  theta: "θ",
  thetasym: "ϑ",
  thetav: "ϑ",
  thickapprox: "≈",
  thicksim: "∼",
  thinsp: " ",
  thkap: "≈",
  thksim: "∼",
  thorn: "þ",
  tilde: "˜",
  times: "×",
  timesb: "⊠",
  timesbar: "⨱",
  timesd: "⨰",
  tint: "∭",
  toea: "⤨",
  top: "⊤",
  topbot: "⌶",
  topcir: "⫱",
  topf: "𝕥",
  topfork: "⫚",
  tosa: "⤩",
  tprime: "‴",
  trade: "™",
  triangle: "▵",
  triangledown: "▿",
  triangleleft: "◃",
  trianglelefteq: "⊴",
  triangleq: "≜",
  triangleright: "▹",
  trianglerighteq: "⊵",
  tridot: "◬",
  trie: "≜",
  triminus: "⨺",
  triplus: "⨹",
  trisb: "⧍",
  tritime: "⨻",
  trpezium: "⏢",
  tscr: "𝓉",
  tscy: "ц",
  tshcy: "ћ",
  tstrok: "ŧ",
  twixt: "≬",
  twoheadleftarrow: "↞",
  twoheadrightarrow: "↠",
  uArr: "⇑",
  uHar: "⥣",
  uacute: "ú",
  uarr: "↑",
  ubrcy: "ў",
  ubreve: "ŭ",
  ucirc: "û",
  ucy: "у",
  udarr: "⇅",
  udblac: "ű",
  udhar: "⥮",
  ufisht: "⥾",
  ufr: "𝔲",
  ugrave: "ù",
  uharl: "↿",
  uharr: "↾",
  uhblk: "▀",
  ulcorn: "⌜",
  ulcorner: "⌜",
  ulcrop: "⌏",
  ultri: "◸",
  umacr: "ū",
  uml: "¨",
  uogon: "ų",
  uopf: "𝕦",
  uparrow: "↑",
  updownarrow: "↕",
  upharpoonleft: "↿",
  upharpoonright: "↾",
  uplus: "⊎",
  upsi: "υ",
  upsih: "ϒ",
  upsilon: "υ",
  upuparrows: "⇈",
  urcorn: "⌝",
  urcorner: "⌝",
  urcrop: "⌎",
  uring: "ů",
  urtri: "◹",
  uscr: "𝓊",
  utdot: "⋰",
  utilde: "ũ",
  utri: "▵",
  utrif: "▴",
  uuarr: "⇈",
  uuml: "ü",
  uwangle: "⦧",
  vArr: "⇕",
  vBar: "⫨",
  vBarv: "⫩",
  vDash: "⊨",
  vangrt: "⦜",
  varepsilon: "ϵ",
  varkappa: "ϰ",
  varnothing: "∅",
  varphi: "ϕ",
  varpi: "ϖ",
  varpropto: "∝",
  varr: "↕",
  varrho: "ϱ",
  varsigma: "ς",
  varsubsetneq: "⊊︀",
  varsubsetneqq: "⫋︀",
  varsupsetneq: "⊋︀",
  varsupsetneqq: "⫌︀",
  vartheta: "ϑ",
  vartriangleleft: "⊲",
  vartriangleright: "⊳",
  vcy: "в",
  vdash: "⊢",
  vee: "∨",
  veebar: "⊻",
  veeeq: "≚",
  vellip: "⋮",
  verbar: "|",
  vert: "|",
  vfr: "𝔳",
  vltri: "⊲",
  vnsub: "⊂⃒",
  vnsup: "⊃⃒",
  vopf: "𝕧",
  vprop: "∝",
  vrtri: "⊳",
  vscr: "𝓋",
  vsubnE: "⫋︀",
  vsubne: "⊊︀",
  vsupnE: "⫌︀",
  vsupne: "⊋︀",
  vzigzag: "⦚",
  wcirc: "ŵ",
  wedbar: "⩟",
  wedge: "∧",
  wedgeq: "≙",
  weierp: "℘",
  wfr: "𝔴",
  wopf: "𝕨",
  wp: "℘",
  wr: "≀",
  wreath: "≀",
  wscr: "𝓌",
  xcap: "⋂",
  xcirc: "◯",
  xcup: "⋃",
  xdtri: "▽",
  xfr: "𝔵",
  xhArr: "⟺",
  xharr: "⟷",
  xi: "ξ",
  xlArr: "⟸",
  xlarr: "⟵",
  xmap: "⟼",
  xnis: "⋻",
  xodot: "⨀",
  xopf: "𝕩",
  xoplus: "⨁",
  xotime: "⨂",
  xrArr: "⟹",
  xrarr: "⟶",
  xscr: "𝓍",
  xsqcup: "⨆",
  xuplus: "⨄",
  xutri: "△",
  xvee: "⋁",
  xwedge: "⋀",
  yacute: "ý",
  yacy: "я",
  ycirc: "ŷ",
  ycy: "ы",
  yen: "¥",
  yfr: "𝔶",
  yicy: "ї",
  yopf: "𝕪",
  yscr: "𝓎",
  yucy: "ю",
  yuml: "ÿ",
  zacute: "ź",
  zcaron: "ž",
  zcy: "з",
  zdot: "ż",
  zeetrf: "ℨ",
  zeta: "ζ",
  zfr: "𝔷",
  zhcy: "ж",
  zigrarr: "⇝",
  zopf: "𝕫",
  zscr: "𝓏",
  zwj: "‍",
  zwnj: "‌"
};
const own$3 = {}.hasOwnProperty;
function decodeNamedCharacterReference(value) {
  return own$3.call(characterEntities, value) ? characterEntities[value] : false;
}
function splice(list2, start, remove, items) {
  const end = list2.length;
  let chunkStart = 0;
  let parameters;
  if (start < 0) {
    start = -start > end ? 0 : end + start;
  } else {
    start = start > end ? end : start;
  }
  remove = remove > 0 ? remove : 0;
  if (items.length < 1e4) {
    parameters = Array.from(items);
    parameters.unshift(start, remove);
    list2.splice(...parameters);
  } else {
    if (remove) list2.splice(start, remove);
    while (chunkStart < items.length) {
      parameters = items.slice(chunkStart, chunkStart + 1e4);
      parameters.unshift(start, 0);
      list2.splice(...parameters);
      chunkStart += 1e4;
      start += 1e4;
    }
  }
}
function push(list2, items) {
  if (list2.length > 0) {
    splice(list2, list2.length, 0, items);
    return list2;
  }
  return items;
}
const hasOwnProperty = {}.hasOwnProperty;
function combineExtensions(extensions) {
  const all2 = {};
  let index2 = -1;
  while (++index2 < extensions.length) {
    syntaxExtension(all2, extensions[index2]);
  }
  return all2;
}
function syntaxExtension(all2, extension2) {
  let hook;
  for (hook in extension2) {
    const maybe = hasOwnProperty.call(all2, hook) ? all2[hook] : void 0;
    const left = maybe || (all2[hook] = {});
    const right = extension2[hook];
    let code2;
    if (right) {
      for (code2 in right) {
        if (!hasOwnProperty.call(left, code2)) left[code2] = [];
        const value = right[code2];
        constructs(
          // @ts-expect-error Looks like a list.
          left[code2],
          Array.isArray(value) ? value : value ? [value] : []
        );
      }
    }
  }
}
function constructs(existing, list2) {
  let index2 = -1;
  const before = [];
  while (++index2 < list2.length) {
    (list2[index2].add === "after" ? existing : before).push(list2[index2]);
  }
  splice(existing, 0, 0, before);
}
function decodeNumericCharacterReference(value, base) {
  const code2 = Number.parseInt(value, base);
  if (
    // C0 except for HT, LF, FF, CR, space.
    code2 < 9 || code2 === 11 || code2 > 13 && code2 < 32 || // Control character (DEL) of C0, and C1 controls.
    code2 > 126 && code2 < 160 || // Lone high surrogates and low surrogates.
    code2 > 55295 && code2 < 57344 || // Noncharacters.
    code2 > 64975 && code2 < 65008 || /* eslint-disable no-bitwise */
    (code2 & 65535) === 65535 || (code2 & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    code2 > 1114111
  ) {
    return "�";
  }
  return String.fromCodePoint(code2);
}
function normalizeIdentifier(value) {
  return value.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
const asciiAlpha = regexCheck(/[A-Za-z]/);
const asciiAlphanumeric = regexCheck(/[\dA-Za-z]/);
const asciiAtext = regexCheck(/[#-'*+\--9=?A-Z^-~]/);
function asciiControl(code2) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    code2 !== null && (code2 < 32 || code2 === 127)
  );
}
const asciiDigit = regexCheck(/\d/);
const asciiHexDigit = regexCheck(/[\dA-Fa-f]/);
const asciiPunctuation = regexCheck(/[!-/:-@[-`{-~]/);
function markdownLineEnding(code2) {
  return code2 !== null && code2 < -2;
}
function markdownLineEndingOrSpace(code2) {
  return code2 !== null && (code2 < 0 || code2 === 32);
}
function markdownSpace(code2) {
  return code2 === -2 || code2 === -1 || code2 === 32;
}
const unicodePunctuation = regexCheck(/\p{P}|\p{S}/u);
const unicodeWhitespace = regexCheck(/\s/);
function regexCheck(regex) {
  return check;
  function check(code2) {
    return code2 !== null && code2 > -1 && regex.test(String.fromCharCode(code2));
  }
}
function normalizeUri(value) {
  const result = [];
  let index2 = -1;
  let start = 0;
  let skip = 0;
  while (++index2 < value.length) {
    const code2 = value.charCodeAt(index2);
    let replace2 = "";
    if (code2 === 37 && asciiAlphanumeric(value.charCodeAt(index2 + 1)) && asciiAlphanumeric(value.charCodeAt(index2 + 2))) {
      skip = 2;
    } else if (code2 < 128) {
      if (!/[!#$&-;=?-Z_a-z~]/.test(String.fromCharCode(code2))) {
        replace2 = String.fromCharCode(code2);
      }
    } else if (code2 > 55295 && code2 < 57344) {
      const next = value.charCodeAt(index2 + 1);
      if (code2 < 56320 && next > 56319 && next < 57344) {
        replace2 = String.fromCharCode(code2, next);
        skip = 1;
      } else {
        replace2 = "�";
      }
    } else {
      replace2 = String.fromCharCode(code2);
    }
    if (replace2) {
      result.push(value.slice(start, index2), encodeURIComponent(replace2));
      start = index2 + skip + 1;
      replace2 = "";
    }
    if (skip) {
      index2 += skip;
      skip = 0;
    }
  }
  return result.join("") + value.slice(start);
}
function factorySpace(effects, ok2, type, max) {
  const limit = max ? max - 1 : Number.POSITIVE_INFINITY;
  let size = 0;
  return start;
  function start(code2) {
    if (markdownSpace(code2)) {
      effects.enter(type);
      return prefix(code2);
    }
    return ok2(code2);
  }
  function prefix(code2) {
    if (markdownSpace(code2) && size++ < limit) {
      effects.consume(code2);
      return prefix;
    }
    effects.exit(type);
    return ok2(code2);
  }
}
const content$1 = {
  tokenize: initializeContent
};
function initializeContent(effects) {
  const contentStart = effects.attempt(this.parser.constructs.contentInitial, afterContentStartConstruct, paragraphInitial);
  let previous2;
  return contentStart;
  function afterContentStartConstruct(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, contentStart, "linePrefix");
  }
  function paragraphInitial(code2) {
    effects.enter("paragraph");
    return lineStart(code2);
  }
  function lineStart(code2) {
    const token = effects.enter("chunkText", {
      contentType: "text",
      previous: previous2
    });
    if (previous2) {
      previous2.next = token;
    }
    previous2 = token;
    return data(code2);
  }
  function data(code2) {
    if (code2 === null) {
      effects.exit("chunkText");
      effects.exit("paragraph");
      effects.consume(code2);
      return;
    }
    if (markdownLineEnding(code2)) {
      effects.consume(code2);
      effects.exit("chunkText");
      return lineStart;
    }
    effects.consume(code2);
    return data;
  }
}
const document$2 = {
  tokenize: initializeDocument
};
const containerConstruct = {
  tokenize: tokenizeContainer
};
function initializeDocument(effects) {
  const self2 = this;
  const stack = [];
  let continued = 0;
  let childFlow;
  let childToken;
  let lineStartOffset;
  return start;
  function start(code2) {
    if (continued < stack.length) {
      const item = stack[continued];
      self2.containerState = item[1];
      return effects.attempt(item[0].continuation, documentContinue, checkNewContainers)(code2);
    }
    return checkNewContainers(code2);
  }
  function documentContinue(code2) {
    continued++;
    if (self2.containerState._closeFlow) {
      self2.containerState._closeFlow = void 0;
      if (childFlow) {
        closeFlow();
      }
      const indexBeforeExits = self2.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let point2;
      while (indexBeforeFlow--) {
        if (self2.events[indexBeforeFlow][0] === "exit" && self2.events[indexBeforeFlow][1].type === "chunkFlow") {
          point2 = self2.events[indexBeforeFlow][1].end;
          break;
        }
      }
      exitContainers(continued);
      let index2 = indexBeforeExits;
      while (index2 < self2.events.length) {
        self2.events[index2][1].end = {
          ...point2
        };
        index2++;
      }
      splice(self2.events, indexBeforeFlow + 1, 0, self2.events.slice(indexBeforeExits));
      self2.events.length = index2;
      return checkNewContainers(code2);
    }
    return start(code2);
  }
  function checkNewContainers(code2) {
    if (continued === stack.length) {
      if (!childFlow) {
        return documentContinued(code2);
      }
      if (childFlow.currentConstruct && childFlow.currentConstruct.concrete) {
        return flowStart(code2);
      }
      self2.interrupt = Boolean(childFlow.currentConstruct && !childFlow._gfmTableDynamicInterruptHack);
    }
    self2.containerState = {};
    return effects.check(containerConstruct, thereIsANewContainer, thereIsNoNewContainer)(code2);
  }
  function thereIsANewContainer(code2) {
    if (childFlow) closeFlow();
    exitContainers(continued);
    return documentContinued(code2);
  }
  function thereIsNoNewContainer(code2) {
    self2.parser.lazy[self2.now().line] = continued !== stack.length;
    lineStartOffset = self2.now().offset;
    return flowStart(code2);
  }
  function documentContinued(code2) {
    self2.containerState = {};
    return effects.attempt(containerConstruct, containerContinue, flowStart)(code2);
  }
  function containerContinue(code2) {
    continued++;
    stack.push([self2.currentConstruct, self2.containerState]);
    return documentContinued(code2);
  }
  function flowStart(code2) {
    if (code2 === null) {
      if (childFlow) closeFlow();
      exitContainers(0);
      effects.consume(code2);
      return;
    }
    childFlow = childFlow || self2.parser.flow(self2.now());
    effects.enter("chunkFlow", {
      _tokenizer: childFlow,
      contentType: "flow",
      previous: childToken
    });
    return flowContinue(code2);
  }
  function flowContinue(code2) {
    if (code2 === null) {
      writeToChild(effects.exit("chunkFlow"), true);
      exitContainers(0);
      effects.consume(code2);
      return;
    }
    if (markdownLineEnding(code2)) {
      effects.consume(code2);
      writeToChild(effects.exit("chunkFlow"));
      continued = 0;
      self2.interrupt = void 0;
      return start;
    }
    effects.consume(code2);
    return flowContinue;
  }
  function writeToChild(token, endOfFile) {
    const stream = self2.sliceStream(token);
    if (endOfFile) stream.push(null);
    token.previous = childToken;
    if (childToken) childToken.next = token;
    childToken = token;
    childFlow.defineSkip(token.start);
    childFlow.write(stream);
    if (self2.parser.lazy[token.start.line]) {
      let index2 = childFlow.events.length;
      while (index2--) {
        if (
          // The token starts before the line ending…
          childFlow.events[index2][1].start.offset < lineStartOffset && // …and either is not ended yet…
          (!childFlow.events[index2][1].end || // …or ends after it.
          childFlow.events[index2][1].end.offset > lineStartOffset)
        ) {
          return;
        }
      }
      const indexBeforeExits = self2.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let seen;
      let point2;
      while (indexBeforeFlow--) {
        if (self2.events[indexBeforeFlow][0] === "exit" && self2.events[indexBeforeFlow][1].type === "chunkFlow") {
          if (seen) {
            point2 = self2.events[indexBeforeFlow][1].end;
            break;
          }
          seen = true;
        }
      }
      exitContainers(continued);
      index2 = indexBeforeExits;
      while (index2 < self2.events.length) {
        self2.events[index2][1].end = {
          ...point2
        };
        index2++;
      }
      splice(self2.events, indexBeforeFlow + 1, 0, self2.events.slice(indexBeforeExits));
      self2.events.length = index2;
    }
  }
  function exitContainers(size) {
    let index2 = stack.length;
    while (index2-- > size) {
      const entry = stack[index2];
      self2.containerState = entry[1];
      entry[0].exit.call(self2, effects);
    }
    stack.length = size;
  }
  function closeFlow() {
    childFlow.write([null]);
    childToken = void 0;
    childFlow = void 0;
    self2.containerState._closeFlow = void 0;
  }
}
function tokenizeContainer(effects, ok2, nok) {
  return factorySpace(effects, effects.attempt(this.parser.constructs.document, ok2, nok), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
function classifyCharacter(code2) {
  if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
    return 1;
  }
  if (unicodePunctuation(code2)) {
    return 2;
  }
}
function resolveAll(constructs2, events, context) {
  const called = [];
  let index2 = -1;
  while (++index2 < constructs2.length) {
    const resolve = constructs2[index2].resolveAll;
    if (resolve && !called.includes(resolve)) {
      events = resolve(events, context);
      called.push(resolve);
    }
  }
  return events;
}
const attention = {
  name: "attention",
  resolveAll: resolveAllAttention,
  tokenize: tokenizeAttention
};
function resolveAllAttention(events, context) {
  let index2 = -1;
  let open;
  let group;
  let text2;
  let openingSequence;
  let closingSequence;
  let use;
  let nextEvents;
  let offset;
  while (++index2 < events.length) {
    if (events[index2][0] === "enter" && events[index2][1].type === "attentionSequence" && events[index2][1]._close) {
      open = index2;
      while (open--) {
        if (events[open][0] === "exit" && events[open][1].type === "attentionSequence" && events[open][1]._open && // If the markers are the same:
        context.sliceSerialize(events[open][1]).charCodeAt(0) === context.sliceSerialize(events[index2][1]).charCodeAt(0)) {
          if ((events[open][1]._close || events[index2][1]._open) && (events[index2][1].end.offset - events[index2][1].start.offset) % 3 && !((events[open][1].end.offset - events[open][1].start.offset + events[index2][1].end.offset - events[index2][1].start.offset) % 3)) {
            continue;
          }
          use = events[open][1].end.offset - events[open][1].start.offset > 1 && events[index2][1].end.offset - events[index2][1].start.offset > 1 ? 2 : 1;
          const start = {
            ...events[open][1].end
          };
          const end = {
            ...events[index2][1].start
          };
          movePoint(start, -use);
          movePoint(end, use);
          openingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start,
            end: {
              ...events[open][1].end
            }
          };
          closingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...events[index2][1].start
            },
            end
          };
          text2 = {
            type: use > 1 ? "strongText" : "emphasisText",
            start: {
              ...events[open][1].end
            },
            end: {
              ...events[index2][1].start
            }
          };
          group = {
            type: use > 1 ? "strong" : "emphasis",
            start: {
              ...openingSequence.start
            },
            end: {
              ...closingSequence.end
            }
          };
          events[open][1].end = {
            ...openingSequence.start
          };
          events[index2][1].start = {
            ...closingSequence.end
          };
          nextEvents = [];
          if (events[open][1].end.offset - events[open][1].start.offset) {
            nextEvents = push(nextEvents, [["enter", events[open][1], context], ["exit", events[open][1], context]]);
          }
          nextEvents = push(nextEvents, [["enter", group, context], ["enter", openingSequence, context], ["exit", openingSequence, context], ["enter", text2, context]]);
          nextEvents = push(nextEvents, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + 1, index2), context));
          nextEvents = push(nextEvents, [["exit", text2, context], ["enter", closingSequence, context], ["exit", closingSequence, context], ["exit", group, context]]);
          if (events[index2][1].end.offset - events[index2][1].start.offset) {
            offset = 2;
            nextEvents = push(nextEvents, [["enter", events[index2][1], context], ["exit", events[index2][1], context]]);
          } else {
            offset = 0;
          }
          splice(events, open - 1, index2 - open + 3, nextEvents);
          index2 = open + nextEvents.length - offset - 2;
          break;
        }
      }
    }
  }
  index2 = -1;
  while (++index2 < events.length) {
    if (events[index2][1].type === "attentionSequence") {
      events[index2][1].type = "data";
    }
  }
  return events;
}
function tokenizeAttention(effects, ok2) {
  const attentionMarkers2 = this.parser.constructs.attentionMarkers.null;
  const previous2 = this.previous;
  const before = classifyCharacter(previous2);
  let marker;
  return start;
  function start(code2) {
    marker = code2;
    effects.enter("attentionSequence");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      return inside;
    }
    const token = effects.exit("attentionSequence");
    const after = classifyCharacter(code2);
    const open = !after || after === 2 && before || attentionMarkers2.includes(code2);
    const close = !before || before === 2 && after || attentionMarkers2.includes(previous2);
    token._open = Boolean(marker === 42 ? open : open && (before || !close));
    token._close = Boolean(marker === 42 ? close : close && (after || !open));
    return ok2(code2);
  }
}
function movePoint(point2, offset) {
  point2.column += offset;
  point2.offset += offset;
  point2._bufferIndex += offset;
}
const autolink = {
  name: "autolink",
  tokenize: tokenizeAutolink
};
function tokenizeAutolink(effects, ok2, nok) {
  let size = 0;
  return start;
  function start(code2) {
    effects.enter("autolink");
    effects.enter("autolinkMarker");
    effects.consume(code2);
    effects.exit("autolinkMarker");
    effects.enter("autolinkProtocol");
    return open;
  }
  function open(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return schemeOrEmailAtext;
    }
    if (code2 === 64) {
      return nok(code2);
    }
    return emailAtext(code2);
  }
  function schemeOrEmailAtext(code2) {
    if (code2 === 43 || code2 === 45 || code2 === 46 || asciiAlphanumeric(code2)) {
      size = 1;
      return schemeInsideOrEmailAtext(code2);
    }
    return emailAtext(code2);
  }
  function schemeInsideOrEmailAtext(code2) {
    if (code2 === 58) {
      effects.consume(code2);
      size = 0;
      return urlInside;
    }
    if ((code2 === 43 || code2 === 45 || code2 === 46 || asciiAlphanumeric(code2)) && size++ < 32) {
      effects.consume(code2);
      return schemeInsideOrEmailAtext;
    }
    size = 0;
    return emailAtext(code2);
  }
  function urlInside(code2) {
    if (code2 === 62) {
      effects.exit("autolinkProtocol");
      effects.enter("autolinkMarker");
      effects.consume(code2);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok2;
    }
    if (code2 === null || code2 === 32 || code2 === 60 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return urlInside;
  }
  function emailAtext(code2) {
    if (code2 === 64) {
      effects.consume(code2);
      return emailAtSignOrDot;
    }
    if (asciiAtext(code2)) {
      effects.consume(code2);
      return emailAtext;
    }
    return nok(code2);
  }
  function emailAtSignOrDot(code2) {
    return asciiAlphanumeric(code2) ? emailLabel(code2) : nok(code2);
  }
  function emailLabel(code2) {
    if (code2 === 46) {
      effects.consume(code2);
      size = 0;
      return emailAtSignOrDot;
    }
    if (code2 === 62) {
      effects.exit("autolinkProtocol").type = "autolinkEmail";
      effects.enter("autolinkMarker");
      effects.consume(code2);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok2;
    }
    return emailValue(code2);
  }
  function emailValue(code2) {
    if ((code2 === 45 || asciiAlphanumeric(code2)) && size++ < 63) {
      const next = code2 === 45 ? emailValue : emailLabel;
      effects.consume(code2);
      return next;
    }
    return nok(code2);
  }
}
const blankLine = {
  partial: true,
  tokenize: tokenizeBlankLine
};
function tokenizeBlankLine(effects, ok2, nok) {
  return start;
  function start(code2) {
    return markdownSpace(code2) ? factorySpace(effects, after, "linePrefix")(code2) : after(code2);
  }
  function after(code2) {
    return code2 === null || markdownLineEnding(code2) ? ok2(code2) : nok(code2);
  }
}
const blockQuote = {
  continuation: {
    tokenize: tokenizeBlockQuoteContinuation
  },
  exit: exit$1,
  name: "blockQuote",
  tokenize: tokenizeBlockQuoteStart
};
function tokenizeBlockQuoteStart(effects, ok2, nok) {
  const self2 = this;
  return start;
  function start(code2) {
    if (code2 === 62) {
      const state2 = self2.containerState;
      if (!state2.open) {
        effects.enter("blockQuote", {
          _container: true
        });
        state2.open = true;
      }
      effects.enter("blockQuotePrefix");
      effects.enter("blockQuoteMarker");
      effects.consume(code2);
      effects.exit("blockQuoteMarker");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    if (markdownSpace(code2)) {
      effects.enter("blockQuotePrefixWhitespace");
      effects.consume(code2);
      effects.exit("blockQuotePrefixWhitespace");
      effects.exit("blockQuotePrefix");
      return ok2;
    }
    effects.exit("blockQuotePrefix");
    return ok2(code2);
  }
}
function tokenizeBlockQuoteContinuation(effects, ok2, nok) {
  const self2 = this;
  return contStart;
  function contStart(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, contBefore, "linePrefix", self2.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
    }
    return contBefore(code2);
  }
  function contBefore(code2) {
    return effects.attempt(blockQuote, ok2, nok)(code2);
  }
}
function exit$1(effects) {
  effects.exit("blockQuote");
}
const characterEscape = {
  name: "characterEscape",
  tokenize: tokenizeCharacterEscape
};
function tokenizeCharacterEscape(effects, ok2, nok) {
  return start;
  function start(code2) {
    effects.enter("characterEscape");
    effects.enter("escapeMarker");
    effects.consume(code2);
    effects.exit("escapeMarker");
    return inside;
  }
  function inside(code2) {
    if (asciiPunctuation(code2)) {
      effects.enter("characterEscapeValue");
      effects.consume(code2);
      effects.exit("characterEscapeValue");
      effects.exit("characterEscape");
      return ok2;
    }
    return nok(code2);
  }
}
const characterReference = {
  name: "characterReference",
  tokenize: tokenizeCharacterReference
};
function tokenizeCharacterReference(effects, ok2, nok) {
  const self2 = this;
  let size = 0;
  let max;
  let test;
  return start;
  function start(code2) {
    effects.enter("characterReference");
    effects.enter("characterReferenceMarker");
    effects.consume(code2);
    effects.exit("characterReferenceMarker");
    return open;
  }
  function open(code2) {
    if (code2 === 35) {
      effects.enter("characterReferenceMarkerNumeric");
      effects.consume(code2);
      effects.exit("characterReferenceMarkerNumeric");
      return numeric;
    }
    effects.enter("characterReferenceValue");
    max = 31;
    test = asciiAlphanumeric;
    return value(code2);
  }
  function numeric(code2) {
    if (code2 === 88 || code2 === 120) {
      effects.enter("characterReferenceMarkerHexadecimal");
      effects.consume(code2);
      effects.exit("characterReferenceMarkerHexadecimal");
      effects.enter("characterReferenceValue");
      max = 6;
      test = asciiHexDigit;
      return value;
    }
    effects.enter("characterReferenceValue");
    max = 7;
    test = asciiDigit;
    return value(code2);
  }
  function value(code2) {
    if (code2 === 59 && size) {
      const token = effects.exit("characterReferenceValue");
      if (test === asciiAlphanumeric && !decodeNamedCharacterReference(self2.sliceSerialize(token))) {
        return nok(code2);
      }
      effects.enter("characterReferenceMarker");
      effects.consume(code2);
      effects.exit("characterReferenceMarker");
      effects.exit("characterReference");
      return ok2;
    }
    if (test(code2) && size++ < max) {
      effects.consume(code2);
      return value;
    }
    return nok(code2);
  }
}
const nonLazyContinuation = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation
};
const codeFenced = {
  concrete: true,
  name: "codeFenced",
  tokenize: tokenizeCodeFenced
};
function tokenizeCodeFenced(effects, ok2, nok) {
  const self2 = this;
  const closeStart = {
    partial: true,
    tokenize: tokenizeCloseStart
  };
  let initialPrefix = 0;
  let sizeOpen = 0;
  let marker;
  return start;
  function start(code2) {
    return beforeSequenceOpen(code2);
  }
  function beforeSequenceOpen(code2) {
    const tail = self2.events[self2.events.length - 1];
    initialPrefix = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
    marker = code2;
    effects.enter("codeFenced");
    effects.enter("codeFencedFence");
    effects.enter("codeFencedFenceSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === marker) {
      sizeOpen++;
      effects.consume(code2);
      return sequenceOpen;
    }
    if (sizeOpen < 3) {
      return nok(code2);
    }
    effects.exit("codeFencedFenceSequence");
    return markdownSpace(code2) ? factorySpace(effects, infoBefore, "whitespace")(code2) : infoBefore(code2);
  }
  function infoBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFencedFence");
      return self2.interrupt ? ok2(code2) : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code2);
    }
    effects.enter("codeFencedFenceInfo");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return info(code2);
  }
  function info(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return infoBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return factorySpace(effects, metaBefore, "whitespace")(code2);
    }
    if (code2 === 96 && code2 === marker) {
      return nok(code2);
    }
    effects.consume(code2);
    return info;
  }
  function metaBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return infoBefore(code2);
    }
    effects.enter("codeFencedFenceMeta");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return meta(code2);
  }
  function meta(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceMeta");
      return infoBefore(code2);
    }
    if (code2 === 96 && code2 === marker) {
      return nok(code2);
    }
    effects.consume(code2);
    return meta;
  }
  function atNonLazyBreak(code2) {
    return effects.attempt(closeStart, after, contentBefore)(code2);
  }
  function contentBefore(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return contentStart;
  }
  function contentStart(code2) {
    return initialPrefix > 0 && markdownSpace(code2) ? factorySpace(effects, beforeContentChunk, "linePrefix", initialPrefix + 1)(code2) : beforeContentChunk(code2);
  }
  function beforeContentChunk(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return effects.check(nonLazyContinuation, atNonLazyBreak, after)(code2);
    }
    effects.enter("codeFlowValue");
    return contentChunk(code2);
  }
  function contentChunk(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFlowValue");
      return beforeContentChunk(code2);
    }
    effects.consume(code2);
    return contentChunk;
  }
  function after(code2) {
    effects.exit("codeFenced");
    return ok2(code2);
  }
  function tokenizeCloseStart(effects2, ok3, nok2) {
    let size = 0;
    return startBefore;
    function startBefore(code2) {
      effects2.enter("lineEnding");
      effects2.consume(code2);
      effects2.exit("lineEnding");
      return start2;
    }
    function start2(code2) {
      effects2.enter("codeFencedFence");
      return markdownSpace(code2) ? factorySpace(effects2, beforeSequenceClose, "linePrefix", self2.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2) : beforeSequenceClose(code2);
    }
    function beforeSequenceClose(code2) {
      if (code2 === marker) {
        effects2.enter("codeFencedFenceSequence");
        return sequenceClose(code2);
      }
      return nok2(code2);
    }
    function sequenceClose(code2) {
      if (code2 === marker) {
        size++;
        effects2.consume(code2);
        return sequenceClose;
      }
      if (size >= sizeOpen) {
        effects2.exit("codeFencedFenceSequence");
        return markdownSpace(code2) ? factorySpace(effects2, sequenceCloseAfter, "whitespace")(code2) : sequenceCloseAfter(code2);
      }
      return nok2(code2);
    }
    function sequenceCloseAfter(code2) {
      if (code2 === null || markdownLineEnding(code2)) {
        effects2.exit("codeFencedFence");
        return ok3(code2);
      }
      return nok2(code2);
    }
  }
}
function tokenizeNonLazyContinuation(effects, ok2, nok) {
  const self2 = this;
  return start;
  function start(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return lineStart;
  }
  function lineStart(code2) {
    return self2.parser.lazy[self2.now().line] ? nok(code2) : ok2(code2);
  }
}
const codeIndented = {
  name: "codeIndented",
  tokenize: tokenizeCodeIndented
};
const furtherStart = {
  partial: true,
  tokenize: tokenizeFurtherStart
};
function tokenizeCodeIndented(effects, ok2, nok) {
  const self2 = this;
  return start;
  function start(code2) {
    effects.enter("codeIndented");
    return factorySpace(effects, afterPrefix, "linePrefix", 4 + 1)(code2);
  }
  function afterPrefix(code2) {
    const tail = self2.events[self2.events.length - 1];
    return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? atBreak(code2) : nok(code2);
  }
  function atBreak(code2) {
    if (code2 === null) {
      return after(code2);
    }
    if (markdownLineEnding(code2)) {
      return effects.attempt(furtherStart, atBreak, after)(code2);
    }
    effects.enter("codeFlowValue");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFlowValue");
      return atBreak(code2);
    }
    effects.consume(code2);
    return inside;
  }
  function after(code2) {
    effects.exit("codeIndented");
    return ok2(code2);
  }
}
function tokenizeFurtherStart(effects, ok2, nok) {
  const self2 = this;
  return furtherStart2;
  function furtherStart2(code2) {
    if (self2.parser.lazy[self2.now().line]) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return furtherStart2;
    }
    return factorySpace(effects, afterPrefix, "linePrefix", 4 + 1)(code2);
  }
  function afterPrefix(code2) {
    const tail = self2.events[self2.events.length - 1];
    return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? ok2(code2) : markdownLineEnding(code2) ? furtherStart2(code2) : nok(code2);
  }
}
const codeText = {
  name: "codeText",
  previous: previous$1,
  resolve: resolveCodeText,
  tokenize: tokenizeCodeText
};
function resolveCodeText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index2;
  let enter;
  if ((events[headEnterIndex][1].type === "lineEnding" || events[headEnterIndex][1].type === "space") && (events[tailExitIndex][1].type === "lineEnding" || events[tailExitIndex][1].type === "space")) {
    index2 = headEnterIndex;
    while (++index2 < tailExitIndex) {
      if (events[index2][1].type === "codeTextData") {
        events[headEnterIndex][1].type = "codeTextPadding";
        events[tailExitIndex][1].type = "codeTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }
  index2 = headEnterIndex - 1;
  tailExitIndex++;
  while (++index2 <= tailExitIndex) {
    if (enter === void 0) {
      if (index2 !== tailExitIndex && events[index2][1].type !== "lineEnding") {
        enter = index2;
      }
    } else if (index2 === tailExitIndex || events[index2][1].type === "lineEnding") {
      events[enter][1].type = "codeTextData";
      if (index2 !== enter + 2) {
        events[enter][1].end = events[index2 - 1][1].end;
        events.splice(enter + 2, index2 - enter - 2);
        tailExitIndex -= index2 - enter - 2;
        index2 = enter + 2;
      }
      enter = void 0;
    }
  }
  return events;
}
function previous$1(code2) {
  return code2 !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function tokenizeCodeText(effects, ok2, nok) {
  let sizeOpen = 0;
  let size;
  let token;
  return start;
  function start(code2) {
    effects.enter("codeText");
    effects.enter("codeTextSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === 96) {
      effects.consume(code2);
      sizeOpen++;
      return sequenceOpen;
    }
    effects.exit("codeTextSequence");
    return between(code2);
  }
  function between(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 32) {
      effects.enter("space");
      effects.consume(code2);
      effects.exit("space");
      return between;
    }
    if (code2 === 96) {
      token = effects.enter("codeTextSequence");
      size = 0;
      return sequenceClose(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return between;
    }
    effects.enter("codeTextData");
    return data(code2);
  }
  function data(code2) {
    if (code2 === null || code2 === 32 || code2 === 96 || markdownLineEnding(code2)) {
      effects.exit("codeTextData");
      return between(code2);
    }
    effects.consume(code2);
    return data;
  }
  function sequenceClose(code2) {
    if (code2 === 96) {
      effects.consume(code2);
      size++;
      return sequenceClose;
    }
    if (size === sizeOpen) {
      effects.exit("codeTextSequence");
      effects.exit("codeText");
      return ok2(code2);
    }
    token.type = "codeTextData";
    return data(code2);
  }
}
class SpliceBuffer {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(initial) {
    this.left = initial ? [...initial] : [];
    this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(index2) {
    if (index2 < 0 || index2 >= this.left.length + this.right.length) {
      throw new RangeError("Cannot access index `" + index2 + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    }
    if (index2 < this.left.length) return this.left[index2];
    return this.right[this.right.length - index2 + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    this.setCursor(0);
    return this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(start, end) {
    const stop = end === null || end === void 0 ? Number.POSITIVE_INFINITY : end;
    if (stop < this.left.length) {
      return this.left.slice(start, stop);
    }
    if (start > this.left.length) {
      return this.right.slice(this.right.length - stop + this.left.length, this.right.length - start + this.left.length).reverse();
    }
    return this.left.slice(start).concat(this.right.slice(this.right.length - stop + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(start, deleteCount, items) {
    const count = deleteCount || 0;
    this.setCursor(Math.trunc(start));
    const removed = this.right.splice(this.right.length - count, Number.POSITIVE_INFINITY);
    if (items) chunkedPush(this.left, items);
    return removed.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    this.setCursor(Number.POSITIVE_INFINITY);
    return this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(item) {
    this.setCursor(Number.POSITIVE_INFINITY);
    this.left.push(item);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(items) {
    this.setCursor(Number.POSITIVE_INFINITY);
    chunkedPush(this.left, items);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(item) {
    this.setCursor(0);
    this.right.push(item);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(items) {
    this.setCursor(0);
    chunkedPush(this.right, items.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(n) {
    if (n === this.left.length || n > this.left.length && this.right.length === 0 || n < 0 && this.left.length === 0) return;
    if (n < this.left.length) {
      const removed = this.left.splice(n, Number.POSITIVE_INFINITY);
      chunkedPush(this.right, removed.reverse());
    } else {
      const removed = this.right.splice(this.left.length + this.right.length - n, Number.POSITIVE_INFINITY);
      chunkedPush(this.left, removed.reverse());
    }
  }
}
function chunkedPush(list2, right) {
  let chunkStart = 0;
  if (right.length < 1e4) {
    list2.push(...right);
  } else {
    while (chunkStart < right.length) {
      list2.push(...right.slice(chunkStart, chunkStart + 1e4));
      chunkStart += 1e4;
    }
  }
}
function subtokenize(eventsArray) {
  const jumps = {};
  let index2 = -1;
  let event;
  let lineIndex;
  let otherIndex;
  let otherEvent;
  let parameters;
  let subevents;
  let more;
  const events = new SpliceBuffer(eventsArray);
  while (++index2 < events.length) {
    while (index2 in jumps) {
      index2 = jumps[index2];
    }
    event = events.get(index2);
    if (index2 && event[1].type === "chunkFlow" && events.get(index2 - 1)[1].type === "listItemPrefix") {
      subevents = event[1]._tokenizer.events;
      otherIndex = 0;
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "lineEndingBlank") {
        otherIndex += 2;
      }
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "content") {
        while (++otherIndex < subevents.length) {
          if (subevents[otherIndex][1].type === "content") {
            break;
          }
          if (subevents[otherIndex][1].type === "chunkText") {
            subevents[otherIndex][1]._isInFirstContentOfListItem = true;
            otherIndex++;
          }
        }
      }
    }
    if (event[0] === "enter") {
      if (event[1].contentType) {
        Object.assign(jumps, subcontent(events, index2));
        index2 = jumps[index2];
        more = true;
      }
    } else if (event[1]._container) {
      otherIndex = index2;
      lineIndex = void 0;
      while (otherIndex--) {
        otherEvent = events.get(otherIndex);
        if (otherEvent[1].type === "lineEnding" || otherEvent[1].type === "lineEndingBlank") {
          if (otherEvent[0] === "enter") {
            if (lineIndex) {
              events.get(lineIndex)[1].type = "lineEndingBlank";
            }
            otherEvent[1].type = "lineEnding";
            lineIndex = otherIndex;
          }
        } else if (otherEvent[1].type === "linePrefix" || otherEvent[1].type === "listItemIndent") ;
        else {
          break;
        }
      }
      if (lineIndex) {
        event[1].end = {
          ...events.get(lineIndex)[1].start
        };
        parameters = events.slice(lineIndex, index2);
        parameters.unshift(event);
        events.splice(lineIndex, index2 - lineIndex + 1, parameters);
      }
    }
  }
  splice(eventsArray, 0, Number.POSITIVE_INFINITY, events.slice(0));
  return !more;
}
function subcontent(events, eventIndex) {
  const token = events.get(eventIndex)[1];
  const context = events.get(eventIndex)[2];
  let startPosition = eventIndex - 1;
  const startPositions = [];
  let tokenizer = token._tokenizer;
  if (!tokenizer) {
    tokenizer = context.parser[token.contentType](token.start);
    if (token._contentTypeTextTrailing) {
      tokenizer._contentTypeTextTrailing = true;
    }
  }
  const childEvents = tokenizer.events;
  const jumps = [];
  const gaps = {};
  let stream;
  let previous2;
  let index2 = -1;
  let current = token;
  let adjust = 0;
  let start = 0;
  const breaks = [start];
  while (current) {
    while (events.get(++startPosition)[1] !== current) {
    }
    startPositions.push(startPosition);
    if (!current._tokenizer) {
      stream = context.sliceStream(current);
      if (!current.next) {
        stream.push(null);
      }
      if (previous2) {
        tokenizer.defineSkip(current.start);
      }
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = true;
      }
      tokenizer.write(stream);
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = void 0;
      }
    }
    previous2 = current;
    current = current.next;
  }
  current = token;
  while (++index2 < childEvents.length) {
    if (
      // Find a void token that includes a break.
      childEvents[index2][0] === "exit" && childEvents[index2 - 1][0] === "enter" && childEvents[index2][1].type === childEvents[index2 - 1][1].type && childEvents[index2][1].start.line !== childEvents[index2][1].end.line
    ) {
      start = index2 + 1;
      breaks.push(start);
      current._tokenizer = void 0;
      current.previous = void 0;
      current = current.next;
    }
  }
  tokenizer.events = [];
  if (current) {
    current._tokenizer = void 0;
    current.previous = void 0;
  } else {
    breaks.pop();
  }
  index2 = breaks.length;
  while (index2--) {
    const slice = childEvents.slice(breaks[index2], breaks[index2 + 1]);
    const start2 = startPositions.pop();
    jumps.push([start2, start2 + slice.length - 1]);
    events.splice(start2, 2, slice);
  }
  jumps.reverse();
  index2 = -1;
  while (++index2 < jumps.length) {
    gaps[adjust + jumps[index2][0]] = adjust + jumps[index2][1];
    adjust += jumps[index2][1] - jumps[index2][0] - 1;
  }
  return gaps;
}
const content = {
  resolve: resolveContent,
  tokenize: tokenizeContent
};
const continuationConstruct = {
  partial: true,
  tokenize: tokenizeContinuation
};
function resolveContent(events) {
  subtokenize(events);
  return events;
}
function tokenizeContent(effects, ok2) {
  let previous2;
  return chunkStart;
  function chunkStart(code2) {
    effects.enter("content");
    previous2 = effects.enter("chunkContent", {
      contentType: "content"
    });
    return chunkInside(code2);
  }
  function chunkInside(code2) {
    if (code2 === null) {
      return contentEnd(code2);
    }
    if (markdownLineEnding(code2)) {
      return effects.check(continuationConstruct, contentContinue, contentEnd)(code2);
    }
    effects.consume(code2);
    return chunkInside;
  }
  function contentEnd(code2) {
    effects.exit("chunkContent");
    effects.exit("content");
    return ok2(code2);
  }
  function contentContinue(code2) {
    effects.consume(code2);
    effects.exit("chunkContent");
    previous2.next = effects.enter("chunkContent", {
      contentType: "content",
      previous: previous2
    });
    previous2 = previous2.next;
    return chunkInside;
  }
}
function tokenizeContinuation(effects, ok2, nok) {
  const self2 = this;
  return startLookahead;
  function startLookahead(code2) {
    effects.exit("chunkContent");
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, prefixed, "linePrefix");
  }
  function prefixed(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return nok(code2);
    }
    const tail = self2.events[self2.events.length - 1];
    if (!self2.parser.constructs.disable.null.includes("codeIndented") && tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4) {
      return ok2(code2);
    }
    return effects.interrupt(self2.parser.constructs.flow, nok, ok2)(code2);
  }
}
function factoryDestination(effects, ok2, nok, type, literalType, literalMarkerType, rawType, stringType, max) {
  const limit = max || Number.POSITIVE_INFINITY;
  let balance = 0;
  return start;
  function start(code2) {
    if (code2 === 60) {
      effects.enter(type);
      effects.enter(literalType);
      effects.enter(literalMarkerType);
      effects.consume(code2);
      effects.exit(literalMarkerType);
      return enclosedBefore;
    }
    if (code2 === null || code2 === 32 || code2 === 41 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.enter(type);
    effects.enter(rawType);
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return raw(code2);
  }
  function enclosedBefore(code2) {
    if (code2 === 62) {
      effects.enter(literalMarkerType);
      effects.consume(code2);
      effects.exit(literalMarkerType);
      effects.exit(literalType);
      effects.exit(type);
      return ok2;
    }
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return enclosed(code2);
  }
  function enclosed(code2) {
    if (code2 === 62) {
      effects.exit("chunkString");
      effects.exit(stringType);
      return enclosedBefore(code2);
    }
    if (code2 === null || code2 === 60 || markdownLineEnding(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? enclosedEscape : enclosed;
  }
  function enclosedEscape(code2) {
    if (code2 === 60 || code2 === 62 || code2 === 92) {
      effects.consume(code2);
      return enclosed;
    }
    return enclosed(code2);
  }
  function raw(code2) {
    if (!balance && (code2 === null || code2 === 41 || markdownLineEndingOrSpace(code2))) {
      effects.exit("chunkString");
      effects.exit(stringType);
      effects.exit(rawType);
      effects.exit(type);
      return ok2(code2);
    }
    if (balance < limit && code2 === 40) {
      effects.consume(code2);
      balance++;
      return raw;
    }
    if (code2 === 41) {
      effects.consume(code2);
      balance--;
      return raw;
    }
    if (code2 === null || code2 === 32 || code2 === 40 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? rawEscape : raw;
  }
  function rawEscape(code2) {
    if (code2 === 40 || code2 === 41 || code2 === 92) {
      effects.consume(code2);
      return raw;
    }
    return raw(code2);
  }
}
function factoryLabel(effects, ok2, nok, type, markerType, stringType) {
  const self2 = this;
  let size = 0;
  let seen;
  return start;
  function start(code2) {
    effects.enter(type);
    effects.enter(markerType);
    effects.consume(code2);
    effects.exit(markerType);
    effects.enter(stringType);
    return atBreak;
  }
  function atBreak(code2) {
    if (size > 999 || code2 === null || code2 === 91 || code2 === 93 && !seen || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    code2 === 94 && !size && "_hiddenFootnoteSupport" in self2.parser.constructs) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit(stringType);
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      effects.exit(type);
      return ok2;
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return atBreak;
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return labelInside(code2);
  }
  function labelInside(code2) {
    if (code2 === null || code2 === 91 || code2 === 93 || markdownLineEnding(code2) || size++ > 999) {
      effects.exit("chunkString");
      return atBreak(code2);
    }
    effects.consume(code2);
    if (!seen) seen = !markdownSpace(code2);
    return code2 === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return labelInside;
    }
    return labelInside(code2);
  }
}
function factoryTitle(effects, ok2, nok, type, markerType, stringType) {
  let marker;
  return start;
  function start(code2) {
    if (code2 === 34 || code2 === 39 || code2 === 40) {
      effects.enter(type);
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      marker = code2 === 40 ? 41 : code2;
      return begin;
    }
    return nok(code2);
  }
  function begin(code2) {
    if (code2 === marker) {
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      effects.exit(type);
      return ok2;
    }
    effects.enter(stringType);
    return atBreak(code2);
  }
  function atBreak(code2) {
    if (code2 === marker) {
      effects.exit(stringType);
      return begin(marker);
    }
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return factorySpace(effects, atBreak, "linePrefix");
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker || code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      return atBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? escape : inside;
  }
  function escape(code2) {
    if (code2 === marker || code2 === 92) {
      effects.consume(code2);
      return inside;
    }
    return inside(code2);
  }
}
function factoryWhitespace(effects, ok2) {
  let seen;
  return start;
  function start(code2) {
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      seen = true;
      return start;
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, start, seen ? "linePrefix" : "lineSuffix")(code2);
    }
    return ok2(code2);
  }
}
const definition$1 = {
  name: "definition",
  tokenize: tokenizeDefinition
};
const titleBefore = {
  partial: true,
  tokenize: tokenizeTitleBefore
};
function tokenizeDefinition(effects, ok2, nok) {
  const self2 = this;
  let identifier;
  return start;
  function start(code2) {
    effects.enter("definition");
    return before(code2);
  }
  function before(code2) {
    return factoryLabel.call(
      self2,
      effects,
      labelAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(code2);
  }
  function labelAfter(code2) {
    identifier = normalizeIdentifier(self2.sliceSerialize(self2.events[self2.events.length - 1][1]).slice(1, -1));
    if (code2 === 58) {
      effects.enter("definitionMarker");
      effects.consume(code2);
      effects.exit("definitionMarker");
      return markerAfter;
    }
    return nok(code2);
  }
  function markerAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, destinationBefore)(code2) : destinationBefore(code2);
  }
  function destinationBefore(code2) {
    return factoryDestination(
      effects,
      destinationAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(code2);
  }
  function destinationAfter(code2) {
    return effects.attempt(titleBefore, after, after)(code2);
  }
  function after(code2) {
    return markdownSpace(code2) ? factorySpace(effects, afterWhitespace, "whitespace")(code2) : afterWhitespace(code2);
  }
  function afterWhitespace(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("definition");
      self2.parser.defined.push(identifier);
      return ok2(code2);
    }
    return nok(code2);
  }
}
function tokenizeTitleBefore(effects, ok2, nok) {
  return titleBefore2;
  function titleBefore2(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, beforeMarker)(code2) : nok(code2);
  }
  function beforeMarker(code2) {
    return factoryTitle(effects, titleAfter, nok, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(code2);
  }
  function titleAfter(code2) {
    return markdownSpace(code2) ? factorySpace(effects, titleAfterOptionalWhitespace, "whitespace")(code2) : titleAfterOptionalWhitespace(code2);
  }
  function titleAfterOptionalWhitespace(code2) {
    return code2 === null || markdownLineEnding(code2) ? ok2(code2) : nok(code2);
  }
}
const hardBreakEscape = {
  name: "hardBreakEscape",
  tokenize: tokenizeHardBreakEscape
};
function tokenizeHardBreakEscape(effects, ok2, nok) {
  return start;
  function start(code2) {
    effects.enter("hardBreakEscape");
    effects.consume(code2);
    return after;
  }
  function after(code2) {
    if (markdownLineEnding(code2)) {
      effects.exit("hardBreakEscape");
      return ok2(code2);
    }
    return nok(code2);
  }
}
const headingAtx = {
  name: "headingAtx",
  resolve: resolveHeadingAtx,
  tokenize: tokenizeHeadingAtx
};
function resolveHeadingAtx(events, context) {
  let contentEnd = events.length - 2;
  let contentStart = 3;
  let content2;
  let text2;
  if (events[contentStart][1].type === "whitespace") {
    contentStart += 2;
  }
  if (contentEnd - 2 > contentStart && events[contentEnd][1].type === "whitespace") {
    contentEnd -= 2;
  }
  if (events[contentEnd][1].type === "atxHeadingSequence" && (contentStart === contentEnd - 1 || contentEnd - 4 > contentStart && events[contentEnd - 2][1].type === "whitespace")) {
    contentEnd -= contentStart + 1 === contentEnd ? 2 : 4;
  }
  if (contentEnd > contentStart) {
    content2 = {
      type: "atxHeadingText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end
    };
    text2 = {
      type: "chunkText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end,
      contentType: "text"
    };
    splice(events, contentStart, contentEnd - contentStart + 1, [["enter", content2, context], ["enter", text2, context], ["exit", text2, context], ["exit", content2, context]]);
  }
  return events;
}
function tokenizeHeadingAtx(effects, ok2, nok) {
  let size = 0;
  return start;
  function start(code2) {
    effects.enter("atxHeading");
    return before(code2);
  }
  function before(code2) {
    effects.enter("atxHeadingSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === 35 && size++ < 6) {
      effects.consume(code2);
      return sequenceOpen;
    }
    if (code2 === null || markdownLineEndingOrSpace(code2)) {
      effects.exit("atxHeadingSequence");
      return atBreak(code2);
    }
    return nok(code2);
  }
  function atBreak(code2) {
    if (code2 === 35) {
      effects.enter("atxHeadingSequence");
      return sequenceFurther(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("atxHeading");
      return ok2(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, atBreak, "whitespace")(code2);
    }
    effects.enter("atxHeadingText");
    return data(code2);
  }
  function sequenceFurther(code2) {
    if (code2 === 35) {
      effects.consume(code2);
      return sequenceFurther;
    }
    effects.exit("atxHeadingSequence");
    return atBreak(code2);
  }
  function data(code2) {
    if (code2 === null || code2 === 35 || markdownLineEndingOrSpace(code2)) {
      effects.exit("atxHeadingText");
      return atBreak(code2);
    }
    effects.consume(code2);
    return data;
  }
}
const htmlBlockNames = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
];
const htmlRawNames = ["pre", "script", "style", "textarea"];
const htmlFlow = {
  concrete: true,
  name: "htmlFlow",
  resolveTo: resolveToHtmlFlow,
  tokenize: tokenizeHtmlFlow
};
const blankLineBefore = {
  partial: true,
  tokenize: tokenizeBlankLineBefore
};
const nonLazyContinuationStart = {
  partial: true,
  tokenize: tokenizeNonLazyContinuationStart
};
function resolveToHtmlFlow(events) {
  let index2 = events.length;
  while (index2--) {
    if (events[index2][0] === "enter" && events[index2][1].type === "htmlFlow") {
      break;
    }
  }
  if (index2 > 1 && events[index2 - 2][1].type === "linePrefix") {
    events[index2][1].start = events[index2 - 2][1].start;
    events[index2 + 1][1].start = events[index2 - 2][1].start;
    events.splice(index2 - 2, 2);
  }
  return events;
}
function tokenizeHtmlFlow(effects, ok2, nok) {
  const self2 = this;
  let marker;
  let closingTag;
  let buffer;
  let index2;
  let markerB;
  return start;
  function start(code2) {
    return before(code2);
  }
  function before(code2) {
    effects.enter("htmlFlow");
    effects.enter("htmlFlowData");
    effects.consume(code2);
    return open;
  }
  function open(code2) {
    if (code2 === 33) {
      effects.consume(code2);
      return declarationOpen;
    }
    if (code2 === 47) {
      effects.consume(code2);
      closingTag = true;
      return tagCloseStart;
    }
    if (code2 === 63) {
      effects.consume(code2);
      marker = 3;
      return self2.interrupt ? ok2 : continuationDeclarationInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      buffer = String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function declarationOpen(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      marker = 2;
      return commentOpenInside;
    }
    if (code2 === 91) {
      effects.consume(code2);
      marker = 5;
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      marker = 4;
      return self2.interrupt ? ok2 : continuationDeclarationInside;
    }
    return nok(code2);
  }
  function commentOpenInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return self2.interrupt ? ok2 : continuationDeclarationInside;
    }
    return nok(code2);
  }
  function cdataOpenInside(code2) {
    const value = "CDATA[";
    if (code2 === value.charCodeAt(index2++)) {
      effects.consume(code2);
      if (index2 === value.length) {
        return self2.interrupt ? ok2 : continuation;
      }
      return cdataOpenInside;
    }
    return nok(code2);
  }
  function tagCloseStart(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      buffer = String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function tagName(code2) {
    if (code2 === null || code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      const slash = code2 === 47;
      const name2 = buffer.toLowerCase();
      if (!slash && !closingTag && htmlRawNames.includes(name2)) {
        marker = 1;
        return self2.interrupt ? ok2(code2) : continuation(code2);
      }
      if (htmlBlockNames.includes(buffer.toLowerCase())) {
        marker = 6;
        if (slash) {
          effects.consume(code2);
          return basicSelfClosing;
        }
        return self2.interrupt ? ok2(code2) : continuation(code2);
      }
      marker = 7;
      return self2.interrupt && !self2.parser.lazy[self2.now().line] ? nok(code2) : closingTag ? completeClosingTagAfter(code2) : completeAttributeNameBefore(code2);
    }
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      buffer += String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function basicSelfClosing(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return self2.interrupt ? ok2 : continuation;
    }
    return nok(code2);
  }
  function completeClosingTagAfter(code2) {
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeClosingTagAfter;
    }
    return completeEnd(code2);
  }
  function completeAttributeNameBefore(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      return completeEnd;
    }
    if (code2 === 58 || code2 === 95 || asciiAlpha(code2)) {
      effects.consume(code2);
      return completeAttributeName;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeNameBefore;
    }
    return completeEnd(code2);
  }
  function completeAttributeName(code2) {
    if (code2 === 45 || code2 === 46 || code2 === 58 || code2 === 95 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return completeAttributeName;
    }
    return completeAttributeNameAfter(code2);
  }
  function completeAttributeNameAfter(code2) {
    if (code2 === 61) {
      effects.consume(code2);
      return completeAttributeValueBefore;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeNameAfter;
    }
    return completeAttributeNameBefore(code2);
  }
  function completeAttributeValueBefore(code2) {
    if (code2 === null || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 34 || code2 === 39) {
      effects.consume(code2);
      markerB = code2;
      return completeAttributeValueQuoted;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeValueBefore;
    }
    return completeAttributeValueUnquoted(code2);
  }
  function completeAttributeValueQuoted(code2) {
    if (code2 === markerB) {
      effects.consume(code2);
      markerB = null;
      return completeAttributeValueQuotedAfter;
    }
    if (code2 === null || markdownLineEnding(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return completeAttributeValueQuoted;
  }
  function completeAttributeValueUnquoted(code2) {
    if (code2 === null || code2 === 34 || code2 === 39 || code2 === 47 || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96 || markdownLineEndingOrSpace(code2)) {
      return completeAttributeNameAfter(code2);
    }
    effects.consume(code2);
    return completeAttributeValueUnquoted;
  }
  function completeAttributeValueQuotedAfter(code2) {
    if (code2 === 47 || code2 === 62 || markdownSpace(code2)) {
      return completeAttributeNameBefore(code2);
    }
    return nok(code2);
  }
  function completeEnd(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return completeAfter;
    }
    return nok(code2);
  }
  function completeAfter(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return continuation(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAfter;
    }
    return nok(code2);
  }
  function continuation(code2) {
    if (code2 === 45 && marker === 2) {
      effects.consume(code2);
      return continuationCommentInside;
    }
    if (code2 === 60 && marker === 1) {
      effects.consume(code2);
      return continuationRawTagOpen;
    }
    if (code2 === 62 && marker === 4) {
      effects.consume(code2);
      return continuationClose;
    }
    if (code2 === 63 && marker === 3) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    if (code2 === 93 && marker === 5) {
      effects.consume(code2);
      return continuationCdataInside;
    }
    if (markdownLineEnding(code2) && (marker === 6 || marker === 7)) {
      effects.exit("htmlFlowData");
      return effects.check(blankLineBefore, continuationAfter, continuationStart)(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("htmlFlowData");
      return continuationStart(code2);
    }
    effects.consume(code2);
    return continuation;
  }
  function continuationStart(code2) {
    return effects.check(nonLazyContinuationStart, continuationStartNonLazy, continuationAfter)(code2);
  }
  function continuationStartNonLazy(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return continuationBefore;
  }
  function continuationBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return continuationStart(code2);
    }
    effects.enter("htmlFlowData");
    return continuation(code2);
  }
  function continuationCommentInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationRawTagOpen(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      buffer = "";
      return continuationRawEndTag;
    }
    return continuation(code2);
  }
  function continuationRawEndTag(code2) {
    if (code2 === 62) {
      const name2 = buffer.toLowerCase();
      if (htmlRawNames.includes(name2)) {
        effects.consume(code2);
        return continuationClose;
      }
      return continuation(code2);
    }
    if (asciiAlpha(code2) && buffer.length < 8) {
      effects.consume(code2);
      buffer += String.fromCharCode(code2);
      return continuationRawEndTag;
    }
    return continuation(code2);
  }
  function continuationCdataInside(code2) {
    if (code2 === 93) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationDeclarationInside(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return continuationClose;
    }
    if (code2 === 45 && marker === 2) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationClose(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("htmlFlowData");
      return continuationAfter(code2);
    }
    effects.consume(code2);
    return continuationClose;
  }
  function continuationAfter(code2) {
    effects.exit("htmlFlow");
    return ok2(code2);
  }
}
function tokenizeNonLazyContinuationStart(effects, ok2, nok) {
  const self2 = this;
  return start;
  function start(code2) {
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    return self2.parser.lazy[self2.now().line] ? nok(code2) : ok2(code2);
  }
}
function tokenizeBlankLineBefore(effects, ok2, nok) {
  return start;
  function start(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return effects.attempt(blankLine, ok2, nok);
  }
}
const htmlText = {
  name: "htmlText",
  tokenize: tokenizeHtmlText
};
function tokenizeHtmlText(effects, ok2, nok) {
  const self2 = this;
  let marker;
  let index2;
  let returnState;
  return start;
  function start(code2) {
    effects.enter("htmlText");
    effects.enter("htmlTextData");
    effects.consume(code2);
    return open;
  }
  function open(code2) {
    if (code2 === 33) {
      effects.consume(code2);
      return declarationOpen;
    }
    if (code2 === 47) {
      effects.consume(code2);
      return tagCloseStart;
    }
    if (code2 === 63) {
      effects.consume(code2);
      return instruction;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return tagOpen;
    }
    return nok(code2);
  }
  function declarationOpen(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentOpenInside;
    }
    if (code2 === 91) {
      effects.consume(code2);
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return declaration;
    }
    return nok(code2);
  }
  function commentOpenInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentEnd;
    }
    return nok(code2);
  }
  function comment(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 45) {
      effects.consume(code2);
      return commentClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = comment;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return comment;
  }
  function commentClose(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentEnd;
    }
    return comment(code2);
  }
  function commentEnd(code2) {
    return code2 === 62 ? end(code2) : code2 === 45 ? commentClose(code2) : comment(code2);
  }
  function cdataOpenInside(code2) {
    const value = "CDATA[";
    if (code2 === value.charCodeAt(index2++)) {
      effects.consume(code2);
      return index2 === value.length ? cdata : cdataOpenInside;
    }
    return nok(code2);
  }
  function cdata(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.consume(code2);
      return cdataClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = cdata;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return cdata;
  }
  function cdataClose(code2) {
    if (code2 === 93) {
      effects.consume(code2);
      return cdataEnd;
    }
    return cdata(code2);
  }
  function cdataEnd(code2) {
    if (code2 === 62) {
      return end(code2);
    }
    if (code2 === 93) {
      effects.consume(code2);
      return cdataEnd;
    }
    return cdata(code2);
  }
  function declaration(code2) {
    if (code2 === null || code2 === 62) {
      return end(code2);
    }
    if (markdownLineEnding(code2)) {
      returnState = declaration;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return declaration;
  }
  function instruction(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 63) {
      effects.consume(code2);
      return instructionClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = instruction;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return instruction;
  }
  function instructionClose(code2) {
    return code2 === 62 ? end(code2) : instruction(code2);
  }
  function tagCloseStart(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return tagClose;
    }
    return nok(code2);
  }
  function tagClose(code2) {
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagClose;
    }
    return tagCloseBetween(code2);
  }
  function tagCloseBetween(code2) {
    if (markdownLineEnding(code2)) {
      returnState = tagCloseBetween;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagCloseBetween;
    }
    return end(code2);
  }
  function tagOpen(code2) {
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagOpen;
    }
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    return nok(code2);
  }
  function tagOpenBetween(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      return end;
    }
    if (code2 === 58 || code2 === 95 || asciiAlpha(code2)) {
      effects.consume(code2);
      return tagOpenAttributeName;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenBetween;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenBetween;
    }
    return end(code2);
  }
  function tagOpenAttributeName(code2) {
    if (code2 === 45 || code2 === 46 || code2 === 58 || code2 === 95 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagOpenAttributeName;
    }
    return tagOpenAttributeNameAfter(code2);
  }
  function tagOpenAttributeNameAfter(code2) {
    if (code2 === 61) {
      effects.consume(code2);
      return tagOpenAttributeValueBefore;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeNameAfter;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenAttributeNameAfter;
    }
    return tagOpenBetween(code2);
  }
  function tagOpenAttributeValueBefore(code2) {
    if (code2 === null || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 34 || code2 === 39) {
      effects.consume(code2);
      marker = code2;
      return tagOpenAttributeValueQuoted;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeValueBefore;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenAttributeValueBefore;
    }
    effects.consume(code2);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuoted(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      marker = void 0;
      return tagOpenAttributeValueQuotedAfter;
    }
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeValueQuoted;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return tagOpenAttributeValueQuoted;
  }
  function tagOpenAttributeValueUnquoted(code2) {
    if (code2 === null || code2 === 34 || code2 === 39 || code2 === 60 || code2 === 61 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    effects.consume(code2);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuotedAfter(code2) {
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    return nok(code2);
  }
  function end(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      effects.exit("htmlTextData");
      effects.exit("htmlText");
      return ok2;
    }
    return nok(code2);
  }
  function lineEndingBefore(code2) {
    effects.exit("htmlTextData");
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return lineEndingAfter;
  }
  function lineEndingAfter(code2) {
    return markdownSpace(code2) ? factorySpace(effects, lineEndingAfterPrefix, "linePrefix", self2.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2) : lineEndingAfterPrefix(code2);
  }
  function lineEndingAfterPrefix(code2) {
    effects.enter("htmlTextData");
    return returnState(code2);
  }
}
const labelEnd = {
  name: "labelEnd",
  resolveAll: resolveAllLabelEnd,
  resolveTo: resolveToLabelEnd,
  tokenize: tokenizeLabelEnd
};
const resourceConstruct = {
  tokenize: tokenizeResource
};
const referenceFullConstruct = {
  tokenize: tokenizeReferenceFull
};
const referenceCollapsedConstruct = {
  tokenize: tokenizeReferenceCollapsed
};
function resolveAllLabelEnd(events) {
  let index2 = -1;
  const newEvents = [];
  while (++index2 < events.length) {
    const token = events[index2][1];
    newEvents.push(events[index2]);
    if (token.type === "labelImage" || token.type === "labelLink" || token.type === "labelEnd") {
      const offset = token.type === "labelImage" ? 4 : 2;
      token.type = "data";
      index2 += offset;
    }
  }
  if (events.length !== newEvents.length) {
    splice(events, 0, events.length, newEvents);
  }
  return events;
}
function resolveToLabelEnd(events, context) {
  let index2 = events.length;
  let offset = 0;
  let token;
  let open;
  let close;
  let media;
  while (index2--) {
    token = events[index2][1];
    if (open) {
      if (token.type === "link" || token.type === "labelLink" && token._inactive) {
        break;
      }
      if (events[index2][0] === "enter" && token.type === "labelLink") {
        token._inactive = true;
      }
    } else if (close) {
      if (events[index2][0] === "enter" && (token.type === "labelImage" || token.type === "labelLink") && !token._balanced) {
        open = index2;
        if (token.type !== "labelLink") {
          offset = 2;
          break;
        }
      }
    } else if (token.type === "labelEnd") {
      close = index2;
    }
  }
  const group = {
    type: events[open][1].type === "labelLink" ? "link" : "image",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  const label = {
    type: "label",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[close][1].end
    }
  };
  const text2 = {
    type: "labelText",
    start: {
      ...events[open + offset + 2][1].end
    },
    end: {
      ...events[close - 2][1].start
    }
  };
  media = [["enter", group, context], ["enter", label, context]];
  media = push(media, events.slice(open + 1, open + offset + 3));
  media = push(media, [["enter", text2, context]]);
  media = push(media, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + offset + 4, close - 3), context));
  media = push(media, [["exit", text2, context], events[close - 2], events[close - 1], ["exit", label, context]]);
  media = push(media, events.slice(close + 1));
  media = push(media, [["exit", group, context]]);
  splice(events, open, events.length, media);
  return events;
}
function tokenizeLabelEnd(effects, ok2, nok) {
  const self2 = this;
  let index2 = self2.events.length;
  let labelStart;
  let defined;
  while (index2--) {
    if ((self2.events[index2][1].type === "labelImage" || self2.events[index2][1].type === "labelLink") && !self2.events[index2][1]._balanced) {
      labelStart = self2.events[index2][1];
      break;
    }
  }
  return start;
  function start(code2) {
    if (!labelStart) {
      return nok(code2);
    }
    if (labelStart._inactive) {
      return labelEndNok(code2);
    }
    defined = self2.parser.defined.includes(normalizeIdentifier(self2.sliceSerialize({
      start: labelStart.end,
      end: self2.now()
    })));
    effects.enter("labelEnd");
    effects.enter("labelMarker");
    effects.consume(code2);
    effects.exit("labelMarker");
    effects.exit("labelEnd");
    return after;
  }
  function after(code2) {
    if (code2 === 40) {
      return effects.attempt(resourceConstruct, labelEndOk, defined ? labelEndOk : labelEndNok)(code2);
    }
    if (code2 === 91) {
      return effects.attempt(referenceFullConstruct, labelEndOk, defined ? referenceNotFull : labelEndNok)(code2);
    }
    return defined ? labelEndOk(code2) : labelEndNok(code2);
  }
  function referenceNotFull(code2) {
    return effects.attempt(referenceCollapsedConstruct, labelEndOk, labelEndNok)(code2);
  }
  function labelEndOk(code2) {
    return ok2(code2);
  }
  function labelEndNok(code2) {
    labelStart._balanced = true;
    return nok(code2);
  }
}
function tokenizeResource(effects, ok2, nok) {
  return resourceStart;
  function resourceStart(code2) {
    effects.enter("resource");
    effects.enter("resourceMarker");
    effects.consume(code2);
    effects.exit("resourceMarker");
    return resourceBefore;
  }
  function resourceBefore(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceOpen)(code2) : resourceOpen(code2);
  }
  function resourceOpen(code2) {
    if (code2 === 41) {
      return resourceEnd(code2);
    }
    return factoryDestination(effects, resourceDestinationAfter, resourceDestinationMissing, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(code2);
  }
  function resourceDestinationAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceBetween)(code2) : resourceEnd(code2);
  }
  function resourceDestinationMissing(code2) {
    return nok(code2);
  }
  function resourceBetween(code2) {
    if (code2 === 34 || code2 === 39 || code2 === 40) {
      return factoryTitle(effects, resourceTitleAfter, nok, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(code2);
    }
    return resourceEnd(code2);
  }
  function resourceTitleAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceEnd)(code2) : resourceEnd(code2);
  }
  function resourceEnd(code2) {
    if (code2 === 41) {
      effects.enter("resourceMarker");
      effects.consume(code2);
      effects.exit("resourceMarker");
      effects.exit("resource");
      return ok2;
    }
    return nok(code2);
  }
}
function tokenizeReferenceFull(effects, ok2, nok) {
  const self2 = this;
  return referenceFull;
  function referenceFull(code2) {
    return factoryLabel.call(self2, effects, referenceFullAfter, referenceFullMissing, "reference", "referenceMarker", "referenceString")(code2);
  }
  function referenceFullAfter(code2) {
    return self2.parser.defined.includes(normalizeIdentifier(self2.sliceSerialize(self2.events[self2.events.length - 1][1]).slice(1, -1))) ? ok2(code2) : nok(code2);
  }
  function referenceFullMissing(code2) {
    return nok(code2);
  }
}
function tokenizeReferenceCollapsed(effects, ok2, nok) {
  return referenceCollapsedStart;
  function referenceCollapsedStart(code2) {
    effects.enter("reference");
    effects.enter("referenceMarker");
    effects.consume(code2);
    effects.exit("referenceMarker");
    return referenceCollapsedOpen;
  }
  function referenceCollapsedOpen(code2) {
    if (code2 === 93) {
      effects.enter("referenceMarker");
      effects.consume(code2);
      effects.exit("referenceMarker");
      effects.exit("reference");
      return ok2;
    }
    return nok(code2);
  }
}
const labelStartImage = {
  name: "labelStartImage",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartImage
};
function tokenizeLabelStartImage(effects, ok2, nok) {
  const self2 = this;
  return start;
  function start(code2) {
    effects.enter("labelImage");
    effects.enter("labelImageMarker");
    effects.consume(code2);
    effects.exit("labelImageMarker");
    return open;
  }
  function open(code2) {
    if (code2 === 91) {
      effects.enter("labelMarker");
      effects.consume(code2);
      effects.exit("labelMarker");
      effects.exit("labelImage");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    return code2 === 94 && "_hiddenFootnoteSupport" in self2.parser.constructs ? nok(code2) : ok2(code2);
  }
}
const labelStartLink = {
  name: "labelStartLink",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartLink
};
function tokenizeLabelStartLink(effects, ok2, nok) {
  const self2 = this;
  return start;
  function start(code2) {
    effects.enter("labelLink");
    effects.enter("labelMarker");
    effects.consume(code2);
    effects.exit("labelMarker");
    effects.exit("labelLink");
    return after;
  }
  function after(code2) {
    return code2 === 94 && "_hiddenFootnoteSupport" in self2.parser.constructs ? nok(code2) : ok2(code2);
  }
}
const lineEnding = {
  name: "lineEnding",
  tokenize: tokenizeLineEnding
};
function tokenizeLineEnding(effects, ok2) {
  return start;
  function start(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, ok2, "linePrefix");
  }
}
const thematicBreak$2 = {
  name: "thematicBreak",
  tokenize: tokenizeThematicBreak
};
function tokenizeThematicBreak(effects, ok2, nok) {
  let size = 0;
  let marker;
  return start;
  function start(code2) {
    effects.enter("thematicBreak");
    return before(code2);
  }
  function before(code2) {
    marker = code2;
    return atBreak(code2);
  }
  function atBreak(code2) {
    if (code2 === marker) {
      effects.enter("thematicBreakSequence");
      return sequence(code2);
    }
    if (size >= 3 && (code2 === null || markdownLineEnding(code2))) {
      effects.exit("thematicBreak");
      return ok2(code2);
    }
    return nok(code2);
  }
  function sequence(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      size++;
      return sequence;
    }
    effects.exit("thematicBreakSequence");
    return markdownSpace(code2) ? factorySpace(effects, atBreak, "whitespace")(code2) : atBreak(code2);
  }
}
const list$2 = {
  continuation: {
    tokenize: tokenizeListContinuation
  },
  exit: tokenizeListEnd,
  name: "list",
  tokenize: tokenizeListStart
};
const listItemPrefixWhitespaceConstruct = {
  partial: true,
  tokenize: tokenizeListItemPrefixWhitespace
};
const indentConstruct = {
  partial: true,
  tokenize: tokenizeIndent$1
};
function tokenizeListStart(effects, ok2, nok) {
  const self2 = this;
  const tail = self2.events[self2.events.length - 1];
  let initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let size = 0;
  return start;
  function start(code2) {
    const kind = self2.containerState.type || (code2 === 42 || code2 === 43 || code2 === 45 ? "listUnordered" : "listOrdered");
    if (kind === "listUnordered" ? !self2.containerState.marker || code2 === self2.containerState.marker : asciiDigit(code2)) {
      if (!self2.containerState.type) {
        self2.containerState.type = kind;
        effects.enter(kind, {
          _container: true
        });
      }
      if (kind === "listUnordered") {
        effects.enter("listItemPrefix");
        return code2 === 42 || code2 === 45 ? effects.check(thematicBreak$2, nok, atMarker)(code2) : atMarker(code2);
      }
      if (!self2.interrupt || code2 === 49) {
        effects.enter("listItemPrefix");
        effects.enter("listItemValue");
        return inside(code2);
      }
    }
    return nok(code2);
  }
  function inside(code2) {
    if (asciiDigit(code2) && ++size < 10) {
      effects.consume(code2);
      return inside;
    }
    if ((!self2.interrupt || size < 2) && (self2.containerState.marker ? code2 === self2.containerState.marker : code2 === 41 || code2 === 46)) {
      effects.exit("listItemValue");
      return atMarker(code2);
    }
    return nok(code2);
  }
  function atMarker(code2) {
    effects.enter("listItemMarker");
    effects.consume(code2);
    effects.exit("listItemMarker");
    self2.containerState.marker = self2.containerState.marker || code2;
    return effects.check(
      blankLine,
      // Can’t be empty when interrupting.
      self2.interrupt ? nok : onBlank,
      effects.attempt(listItemPrefixWhitespaceConstruct, endOfPrefix, otherPrefix)
    );
  }
  function onBlank(code2) {
    self2.containerState.initialBlankLine = true;
    initialSize++;
    return endOfPrefix(code2);
  }
  function otherPrefix(code2) {
    if (markdownSpace(code2)) {
      effects.enter("listItemPrefixWhitespace");
      effects.consume(code2);
      effects.exit("listItemPrefixWhitespace");
      return endOfPrefix;
    }
    return nok(code2);
  }
  function endOfPrefix(code2) {
    self2.containerState.size = initialSize + self2.sliceSerialize(effects.exit("listItemPrefix"), true).length;
    return ok2(code2);
  }
}
function tokenizeListContinuation(effects, ok2, nok) {
  const self2 = this;
  self2.containerState._closeFlow = void 0;
  return effects.check(blankLine, onBlank, notBlank);
  function onBlank(code2) {
    self2.containerState.furtherBlankLines = self2.containerState.furtherBlankLines || self2.containerState.initialBlankLine;
    return factorySpace(effects, ok2, "listItemIndent", self2.containerState.size + 1)(code2);
  }
  function notBlank(code2) {
    if (self2.containerState.furtherBlankLines || !markdownSpace(code2)) {
      self2.containerState.furtherBlankLines = void 0;
      self2.containerState.initialBlankLine = void 0;
      return notInCurrentItem(code2);
    }
    self2.containerState.furtherBlankLines = void 0;
    self2.containerState.initialBlankLine = void 0;
    return effects.attempt(indentConstruct, ok2, notInCurrentItem)(code2);
  }
  function notInCurrentItem(code2) {
    self2.containerState._closeFlow = true;
    self2.interrupt = void 0;
    return factorySpace(effects, effects.attempt(list$2, ok2, nok), "linePrefix", self2.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
  }
}
function tokenizeIndent$1(effects, ok2, nok) {
  const self2 = this;
  return factorySpace(effects, afterPrefix, "listItemIndent", self2.containerState.size + 1);
  function afterPrefix(code2) {
    const tail = self2.events[self2.events.length - 1];
    return tail && tail[1].type === "listItemIndent" && tail[2].sliceSerialize(tail[1], true).length === self2.containerState.size ? ok2(code2) : nok(code2);
  }
}
function tokenizeListEnd(effects) {
  effects.exit(this.containerState.type);
}
function tokenizeListItemPrefixWhitespace(effects, ok2, nok) {
  const self2 = this;
  return factorySpace(effects, afterPrefix, "listItemPrefixWhitespace", self2.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4 + 1);
  function afterPrefix(code2) {
    const tail = self2.events[self2.events.length - 1];
    return !markdownSpace(code2) && tail && tail[1].type === "listItemPrefixWhitespace" ? ok2(code2) : nok(code2);
  }
}
const setextUnderline = {
  name: "setextUnderline",
  resolveTo: resolveToSetextUnderline,
  tokenize: tokenizeSetextUnderline
};
function resolveToSetextUnderline(events, context) {
  let index2 = events.length;
  let content2;
  let text2;
  let definition2;
  while (index2--) {
    if (events[index2][0] === "enter") {
      if (events[index2][1].type === "content") {
        content2 = index2;
        break;
      }
      if (events[index2][1].type === "paragraph") {
        text2 = index2;
      }
    } else {
      if (events[index2][1].type === "content") {
        events.splice(index2, 1);
      }
      if (!definition2 && events[index2][1].type === "definition") {
        definition2 = index2;
      }
    }
  }
  const heading2 = {
    type: "setextHeading",
    start: {
      ...events[content2][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  events[text2][1].type = "setextHeadingText";
  if (definition2) {
    events.splice(text2, 0, ["enter", heading2, context]);
    events.splice(definition2 + 1, 0, ["exit", events[content2][1], context]);
    events[content2][1].end = {
      ...events[definition2][1].end
    };
  } else {
    events[content2][1] = heading2;
  }
  events.push(["exit", heading2, context]);
  return events;
}
function tokenizeSetextUnderline(effects, ok2, nok) {
  const self2 = this;
  let marker;
  return start;
  function start(code2) {
    let index2 = self2.events.length;
    let paragraph2;
    while (index2--) {
      if (self2.events[index2][1].type !== "lineEnding" && self2.events[index2][1].type !== "linePrefix" && self2.events[index2][1].type !== "content") {
        paragraph2 = self2.events[index2][1].type === "paragraph";
        break;
      }
    }
    if (!self2.parser.lazy[self2.now().line] && (self2.interrupt || paragraph2)) {
      effects.enter("setextHeadingLine");
      marker = code2;
      return before(code2);
    }
    return nok(code2);
  }
  function before(code2) {
    effects.enter("setextHeadingLineSequence");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      return inside;
    }
    effects.exit("setextHeadingLineSequence");
    return markdownSpace(code2) ? factorySpace(effects, after, "lineSuffix")(code2) : after(code2);
  }
  function after(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("setextHeadingLine");
      return ok2(code2);
    }
    return nok(code2);
  }
}
const flow$1 = {
  tokenize: initializeFlow
};
function initializeFlow(effects) {
  const self2 = this;
  const initial = effects.attempt(
    // Try to parse a blank line.
    blankLine,
    atBlankEnding,
    // Try to parse initial flow (essentially, only code).
    effects.attempt(this.parser.constructs.flowInitial, afterConstruct, factorySpace(effects, effects.attempt(this.parser.constructs.flow, afterConstruct, effects.attempt(content, afterConstruct)), "linePrefix"))
  );
  return initial;
  function atBlankEnding(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEndingBlank");
    effects.consume(code2);
    effects.exit("lineEndingBlank");
    self2.currentConstruct = void 0;
    return initial;
  }
  function afterConstruct(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    self2.currentConstruct = void 0;
    return initial;
  }
}
const resolver = {
  resolveAll: createResolver()
};
const string$1 = initializeFactory("string");
const text$4 = initializeFactory("text");
function initializeFactory(field) {
  return {
    resolveAll: createResolver(field === "text" ? resolveAllLineSuffixes : void 0),
    tokenize: initializeText
  };
  function initializeText(effects) {
    const self2 = this;
    const constructs2 = this.parser.constructs[field];
    const text2 = effects.attempt(constructs2, start, notText);
    return start;
    function start(code2) {
      return atBreak(code2) ? text2(code2) : notText(code2);
    }
    function notText(code2) {
      if (code2 === null) {
        effects.consume(code2);
        return;
      }
      effects.enter("data");
      effects.consume(code2);
      return data;
    }
    function data(code2) {
      if (atBreak(code2)) {
        effects.exit("data");
        return text2(code2);
      }
      effects.consume(code2);
      return data;
    }
    function atBreak(code2) {
      if (code2 === null) {
        return true;
      }
      const list2 = constructs2[code2];
      let index2 = -1;
      if (list2) {
        while (++index2 < list2.length) {
          const item = list2[index2];
          if (!item.previous || item.previous.call(self2, self2.previous)) {
            return true;
          }
        }
      }
      return false;
    }
  }
}
function createResolver(extraResolver) {
  return resolveAllText;
  function resolveAllText(events, context) {
    let index2 = -1;
    let enter;
    while (++index2 <= events.length) {
      if (enter === void 0) {
        if (events[index2] && events[index2][1].type === "data") {
          enter = index2;
          index2++;
        }
      } else if (!events[index2] || events[index2][1].type !== "data") {
        if (index2 !== enter + 2) {
          events[enter][1].end = events[index2 - 1][1].end;
          events.splice(enter + 2, index2 - enter - 2);
          index2 = enter + 2;
        }
        enter = void 0;
      }
    }
    return extraResolver ? extraResolver(events, context) : events;
  }
}
function resolveAllLineSuffixes(events, context) {
  let eventIndex = 0;
  while (++eventIndex <= events.length) {
    if ((eventIndex === events.length || events[eventIndex][1].type === "lineEnding") && events[eventIndex - 1][1].type === "data") {
      const data = events[eventIndex - 1][1];
      const chunks = context.sliceStream(data);
      let index2 = chunks.length;
      let bufferIndex = -1;
      let size = 0;
      let tabs;
      while (index2--) {
        const chunk = chunks[index2];
        if (typeof chunk === "string") {
          bufferIndex = chunk.length;
          while (chunk.charCodeAt(bufferIndex - 1) === 32) {
            size++;
            bufferIndex--;
          }
          if (bufferIndex) break;
          bufferIndex = -1;
        } else if (chunk === -2) {
          tabs = true;
          size++;
        } else if (chunk === -1) ;
        else {
          index2++;
          break;
        }
      }
      if (context._contentTypeTextTrailing && eventIndex === events.length) {
        size = 0;
      }
      if (size) {
        const token = {
          type: eventIndex === events.length || tabs || size < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: index2 ? bufferIndex : data.start._bufferIndex + bufferIndex,
            _index: data.start._index + index2,
            line: data.end.line,
            column: data.end.column - size,
            offset: data.end.offset - size
          },
          end: {
            ...data.end
          }
        };
        data.end = {
          ...token.start
        };
        if (data.start.offset === data.end.offset) {
          Object.assign(data, token);
        } else {
          events.splice(eventIndex, 0, ["enter", token, context], ["exit", token, context]);
          eventIndex += 2;
        }
      }
      eventIndex++;
    }
  }
  return events;
}
const document$1 = {
  [42]: list$2,
  [43]: list$2,
  [45]: list$2,
  [48]: list$2,
  [49]: list$2,
  [50]: list$2,
  [51]: list$2,
  [52]: list$2,
  [53]: list$2,
  [54]: list$2,
  [55]: list$2,
  [56]: list$2,
  [57]: list$2,
  [62]: blockQuote
};
const contentInitial = {
  [91]: definition$1
};
const flowInitial = {
  [-2]: codeIndented,
  [-1]: codeIndented,
  [32]: codeIndented
};
const flow = {
  [35]: headingAtx,
  [42]: thematicBreak$2,
  [45]: [setextUnderline, thematicBreak$2],
  [60]: htmlFlow,
  [61]: setextUnderline,
  [95]: thematicBreak$2,
  [96]: codeFenced,
  [126]: codeFenced
};
const string = {
  [38]: characterReference,
  [92]: characterEscape
};
const text$3 = {
  [-5]: lineEnding,
  [-4]: lineEnding,
  [-3]: lineEnding,
  [33]: labelStartImage,
  [38]: characterReference,
  [42]: attention,
  [60]: [autolink, htmlText],
  [91]: labelStartLink,
  [92]: [hardBreakEscape, characterEscape],
  [93]: labelEnd,
  [95]: attention,
  [96]: codeText
};
const insideSpan = {
  null: [attention, resolver]
};
const attentionMarkers = {
  null: [42, 95]
};
const disable = {
  null: []
};
const defaultConstructs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  attentionMarkers,
  contentInitial,
  disable,
  document: document$1,
  flow,
  flowInitial,
  insideSpan,
  string,
  text: text$3
}, Symbol.toStringTag, { value: "Module" }));
function createTokenizer(parser, initialize, from) {
  let point2 = {
    _bufferIndex: -1,
    _index: 0,
    line: from && from.line || 1,
    column: from && from.column || 1,
    offset: from && from.offset || 0
  };
  const columnStart = {};
  const resolveAllConstructs = [];
  let chunks = [];
  let stack = [];
  const effects = {
    attempt: constructFactory(onsuccessfulconstruct),
    check: constructFactory(onsuccessfulcheck),
    consume,
    enter,
    exit: exit2,
    interrupt: constructFactory(onsuccessfulcheck, {
      interrupt: true
    })
  };
  const context = {
    code: null,
    containerState: {},
    defineSkip,
    events: [],
    now,
    parser,
    previous: null,
    sliceSerialize,
    sliceStream,
    write
  };
  let state2 = initialize.tokenize.call(context, effects);
  if (initialize.resolveAll) {
    resolveAllConstructs.push(initialize);
  }
  return context;
  function write(slice) {
    chunks = push(chunks, slice);
    main();
    if (chunks[chunks.length - 1] !== null) {
      return [];
    }
    addResult(initialize, 0);
    context.events = resolveAll(resolveAllConstructs, context.events, context);
    return context.events;
  }
  function sliceSerialize(token, expandTabs) {
    return serializeChunks(sliceStream(token), expandTabs);
  }
  function sliceStream(token) {
    return sliceChunks(chunks, token);
  }
  function now() {
    const {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    } = point2;
    return {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    };
  }
  function defineSkip(value) {
    columnStart[value.line] = value.column;
    accountForPotentialSkip();
  }
  function main() {
    let chunkIndex;
    while (point2._index < chunks.length) {
      const chunk = chunks[point2._index];
      if (typeof chunk === "string") {
        chunkIndex = point2._index;
        if (point2._bufferIndex < 0) {
          point2._bufferIndex = 0;
        }
        while (point2._index === chunkIndex && point2._bufferIndex < chunk.length) {
          go(chunk.charCodeAt(point2._bufferIndex));
        }
      } else {
        go(chunk);
      }
    }
  }
  function go(code2) {
    state2 = state2(code2);
  }
  function consume(code2) {
    if (markdownLineEnding(code2)) {
      point2.line++;
      point2.column = 1;
      point2.offset += code2 === -3 ? 2 : 1;
      accountForPotentialSkip();
    } else if (code2 !== -1) {
      point2.column++;
      point2.offset++;
    }
    if (point2._bufferIndex < 0) {
      point2._index++;
    } else {
      point2._bufferIndex++;
      if (point2._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
      // strings.
      /** @type {string} */
      chunks[point2._index].length) {
        point2._bufferIndex = -1;
        point2._index++;
      }
    }
    context.previous = code2;
  }
  function enter(type, fields) {
    const token = fields || {};
    token.type = type;
    token.start = now();
    context.events.push(["enter", token, context]);
    stack.push(token);
    return token;
  }
  function exit2(type) {
    const token = stack.pop();
    token.end = now();
    context.events.push(["exit", token, context]);
    return token;
  }
  function onsuccessfulconstruct(construct, info) {
    addResult(construct, info.from);
  }
  function onsuccessfulcheck(_, info) {
    info.restore();
  }
  function constructFactory(onreturn, fields) {
    return hook;
    function hook(constructs2, returnState, bogusState) {
      let listOfConstructs;
      let constructIndex;
      let currentConstruct;
      let info;
      return Array.isArray(constructs2) ? (
        /* c8 ignore next 1 */
        handleListOfConstructs(constructs2)
      ) : "tokenize" in constructs2 ? (
        // Looks like a construct.
        handleListOfConstructs([
          /** @type {Construct} */
          constructs2
        ])
      ) : handleMapOfConstructs(constructs2);
      function handleMapOfConstructs(map2) {
        return start;
        function start(code2) {
          const left = code2 !== null && map2[code2];
          const all2 = code2 !== null && map2.null;
          const list2 = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(left) ? left : left ? [left] : [],
            ...Array.isArray(all2) ? all2 : all2 ? [all2] : []
          ];
          return handleListOfConstructs(list2)(code2);
        }
      }
      function handleListOfConstructs(list2) {
        listOfConstructs = list2;
        constructIndex = 0;
        if (list2.length === 0) {
          return bogusState;
        }
        return handleConstruct(list2[constructIndex]);
      }
      function handleConstruct(construct) {
        return start;
        function start(code2) {
          info = store();
          currentConstruct = construct;
          if (!construct.partial) {
            context.currentConstruct = construct;
          }
          if (construct.name && context.parser.constructs.disable.null.includes(construct.name)) {
            return nok();
          }
          return construct.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            fields ? Object.assign(Object.create(context), fields) : context,
            effects,
            ok2,
            nok
          )(code2);
        }
      }
      function ok2(code2) {
        onreturn(currentConstruct, info);
        return returnState;
      }
      function nok(code2) {
        info.restore();
        if (++constructIndex < listOfConstructs.length) {
          return handleConstruct(listOfConstructs[constructIndex]);
        }
        return bogusState;
      }
    }
  }
  function addResult(construct, from2) {
    if (construct.resolveAll && !resolveAllConstructs.includes(construct)) {
      resolveAllConstructs.push(construct);
    }
    if (construct.resolve) {
      splice(context.events, from2, context.events.length - from2, construct.resolve(context.events.slice(from2), context));
    }
    if (construct.resolveTo) {
      context.events = construct.resolveTo(context.events, context);
    }
  }
  function store() {
    const startPoint = now();
    const startPrevious = context.previous;
    const startCurrentConstruct = context.currentConstruct;
    const startEventsIndex = context.events.length;
    const startStack = Array.from(stack);
    return {
      from: startEventsIndex,
      restore
    };
    function restore() {
      point2 = startPoint;
      context.previous = startPrevious;
      context.currentConstruct = startCurrentConstruct;
      context.events.length = startEventsIndex;
      stack = startStack;
      accountForPotentialSkip();
    }
  }
  function accountForPotentialSkip() {
    if (point2.line in columnStart && point2.column < 2) {
      point2.column = columnStart[point2.line];
      point2.offset += columnStart[point2.line] - 1;
    }
  }
}
function sliceChunks(chunks, token) {
  const startIndex = token.start._index;
  const startBufferIndex = token.start._bufferIndex;
  const endIndex = token.end._index;
  const endBufferIndex = token.end._bufferIndex;
  let view;
  if (startIndex === endIndex) {
    view = [chunks[startIndex].slice(startBufferIndex, endBufferIndex)];
  } else {
    view = chunks.slice(startIndex, endIndex);
    if (startBufferIndex > -1) {
      const head = view[0];
      if (typeof head === "string") {
        view[0] = head.slice(startBufferIndex);
      } else {
        view.shift();
      }
    }
    if (endBufferIndex > 0) {
      view.push(chunks[endIndex].slice(0, endBufferIndex));
    }
  }
  return view;
}
function serializeChunks(chunks, expandTabs) {
  let index2 = -1;
  const result = [];
  let atTab;
  while (++index2 < chunks.length) {
    const chunk = chunks[index2];
    let value;
    if (typeof chunk === "string") {
      value = chunk;
    } else switch (chunk) {
      case -5: {
        value = "\r";
        break;
      }
      case -4: {
        value = "\n";
        break;
      }
      case -3: {
        value = "\r\n";
        break;
      }
      case -2: {
        value = expandTabs ? " " : "	";
        break;
      }
      case -1: {
        if (!expandTabs && atTab) continue;
        value = " ";
        break;
      }
      default: {
        value = String.fromCharCode(chunk);
      }
    }
    atTab = chunk === -2;
    result.push(value);
  }
  return result.join("");
}
function parse(options) {
  const settings = options || {};
  const constructs2 = (
    /** @type {FullNormalizedExtension} */
    combineExtensions([defaultConstructs, ...settings.extensions || []])
  );
  const parser = {
    constructs: constructs2,
    content: create2(content$1),
    defined: [],
    document: create2(document$2),
    flow: create2(flow$1),
    lazy: {},
    string: create2(string$1),
    text: create2(text$4)
  };
  return parser;
  function create2(initial) {
    return creator;
    function creator(from) {
      return createTokenizer(parser, initial, from);
    }
  }
}
function postprocess(events) {
  while (!subtokenize(events)) {
  }
  return events;
}
const search = /[\0\t\n\r]/g;
function preprocess() {
  let column = 1;
  let buffer = "";
  let start = true;
  let atCarriageReturn;
  return preprocessor;
  function preprocessor(value, encoding, end) {
    const chunks = [];
    let match;
    let next;
    let startPosition;
    let endPosition;
    let code2;
    value = buffer + (typeof value === "string" ? value.toString() : new TextDecoder(encoding || void 0).decode(value));
    startPosition = 0;
    buffer = "";
    if (start) {
      if (value.charCodeAt(0) === 65279) {
        startPosition++;
      }
      start = void 0;
    }
    while (startPosition < value.length) {
      search.lastIndex = startPosition;
      match = search.exec(value);
      endPosition = match && match.index !== void 0 ? match.index : value.length;
      code2 = value.charCodeAt(endPosition);
      if (!match) {
        buffer = value.slice(startPosition);
        break;
      }
      if (code2 === 10 && startPosition === endPosition && atCarriageReturn) {
        chunks.push(-3);
        atCarriageReturn = void 0;
      } else {
        if (atCarriageReturn) {
          chunks.push(-5);
          atCarriageReturn = void 0;
        }
        if (startPosition < endPosition) {
          chunks.push(value.slice(startPosition, endPosition));
          column += endPosition - startPosition;
        }
        switch (code2) {
          case 0: {
            chunks.push(65533);
            column++;
            break;
          }
          case 9: {
            next = Math.ceil(column / 4) * 4;
            chunks.push(-2);
            while (column++ < next) chunks.push(-1);
            break;
          }
          case 10: {
            chunks.push(-4);
            column = 1;
            break;
          }
          default: {
            atCarriageReturn = true;
            column = 1;
          }
        }
      }
      startPosition = endPosition + 1;
    }
    if (end) {
      if (atCarriageReturn) chunks.push(-5);
      if (buffer) chunks.push(buffer);
      chunks.push(null);
    }
    return chunks;
  }
}
const characterEscapeOrReference = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function decodeString(value) {
  return value.replace(characterEscapeOrReference, decode);
}
function decode($0, $1, $2) {
  if ($1) {
    return $1;
  }
  const head = $2.charCodeAt(0);
  if (head === 35) {
    const head2 = $2.charCodeAt(1);
    const hex = head2 === 120 || head2 === 88;
    return decodeNumericCharacterReference($2.slice(hex ? 2 : 1), hex ? 16 : 10);
  }
  return decodeNamedCharacterReference($2) || $0;
}
const own$2 = {}.hasOwnProperty;
function fromMarkdown(value, encoding, options) {
  if (encoding && typeof encoding === "object") {
    options = encoding;
    encoding = void 0;
  }
  return compiler(options)(postprocess(parse(options).document().write(preprocess()(value, encoding, true))));
}
function compiler(options) {
  const config = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: opener(link2),
      autolinkProtocol: onenterdata,
      autolinkEmail: onenterdata,
      atxHeading: opener(heading2),
      blockQuote: opener(blockQuote2),
      characterEscape: onenterdata,
      characterReference: onenterdata,
      codeFenced: opener(codeFlow),
      codeFencedFenceInfo: buffer,
      codeFencedFenceMeta: buffer,
      codeIndented: opener(codeFlow, buffer),
      codeText: opener(codeText2, buffer),
      codeTextData: onenterdata,
      data: onenterdata,
      codeFlowValue: onenterdata,
      definition: opener(definition2),
      definitionDestinationString: buffer,
      definitionLabelString: buffer,
      definitionTitleString: buffer,
      emphasis: opener(emphasis2),
      hardBreakEscape: opener(hardBreak2),
      hardBreakTrailing: opener(hardBreak2),
      htmlFlow: opener(html2, buffer),
      htmlFlowData: onenterdata,
      htmlText: opener(html2, buffer),
      htmlTextData: onenterdata,
      image: opener(image2),
      label: buffer,
      link: opener(link2),
      listItem: opener(listItem2),
      listItemValue: onenterlistitemvalue,
      listOrdered: opener(list2, onenterlistordered),
      listUnordered: opener(list2),
      paragraph: opener(paragraph2),
      reference: onenterreference,
      referenceString: buffer,
      resourceDestinationString: buffer,
      resourceTitleString: buffer,
      setextHeading: opener(heading2),
      strong: opener(strong2),
      thematicBreak: opener(thematicBreak2)
    },
    exit: {
      atxHeading: closer(),
      atxHeadingSequence: onexitatxheadingsequence,
      autolink: closer(),
      autolinkEmail: onexitautolinkemail,
      autolinkProtocol: onexitautolinkprotocol,
      blockQuote: closer(),
      characterEscapeValue: onexitdata,
      characterReferenceMarkerHexadecimal: onexitcharacterreferencemarker,
      characterReferenceMarkerNumeric: onexitcharacterreferencemarker,
      characterReferenceValue: onexitcharacterreferencevalue,
      characterReference: onexitcharacterreference,
      codeFenced: closer(onexitcodefenced),
      codeFencedFence: onexitcodefencedfence,
      codeFencedFenceInfo: onexitcodefencedfenceinfo,
      codeFencedFenceMeta: onexitcodefencedfencemeta,
      codeFlowValue: onexitdata,
      codeIndented: closer(onexitcodeindented),
      codeText: closer(onexitcodetext),
      codeTextData: onexitdata,
      data: onexitdata,
      definition: closer(),
      definitionDestinationString: onexitdefinitiondestinationstring,
      definitionLabelString: onexitdefinitionlabelstring,
      definitionTitleString: onexitdefinitiontitlestring,
      emphasis: closer(),
      hardBreakEscape: closer(onexithardbreak),
      hardBreakTrailing: closer(onexithardbreak),
      htmlFlow: closer(onexithtmlflow),
      htmlFlowData: onexitdata,
      htmlText: closer(onexithtmltext),
      htmlTextData: onexitdata,
      image: closer(onexitimage),
      label: onexitlabel,
      labelText: onexitlabeltext,
      lineEnding: onexitlineending,
      link: closer(onexitlink),
      listItem: closer(),
      listOrdered: closer(),
      listUnordered: closer(),
      paragraph: closer(),
      referenceString: onexitreferencestring,
      resourceDestinationString: onexitresourcedestinationstring,
      resourceTitleString: onexitresourcetitlestring,
      resource: onexitresource,
      setextHeading: closer(onexitsetextheading),
      setextHeadingLineSequence: onexitsetextheadinglinesequence,
      setextHeadingText: onexitsetextheadingtext,
      strong: closer(),
      thematicBreak: closer()
    }
  };
  configure(config, (options || {}).mdastExtensions || []);
  const data = {};
  return compile;
  function compile(events) {
    let tree = {
      type: "root",
      children: []
    };
    const context = {
      stack: [tree],
      tokenStack: [],
      config,
      enter,
      exit: exit2,
      buffer,
      resume,
      data
    };
    const listStack = [];
    let index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][1].type === "listOrdered" || events[index2][1].type === "listUnordered") {
        if (events[index2][0] === "enter") {
          listStack.push(index2);
        } else {
          const tail = listStack.pop();
          index2 = prepareList(events, tail, index2);
        }
      }
    }
    index2 = -1;
    while (++index2 < events.length) {
      const handler = config[events[index2][0]];
      if (own$2.call(handler, events[index2][1].type)) {
        handler[events[index2][1].type].call(Object.assign({
          sliceSerialize: events[index2][2].sliceSerialize
        }, context), events[index2][1]);
      }
    }
    if (context.tokenStack.length > 0) {
      const tail = context.tokenStack[context.tokenStack.length - 1];
      const handler = tail[1] || defaultOnError;
      handler.call(context, void 0, tail[0]);
    }
    tree.position = {
      start: point(events.length > 0 ? events[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: point(events.length > 0 ? events[events.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    };
    index2 = -1;
    while (++index2 < config.transforms.length) {
      tree = config.transforms[index2](tree) || tree;
    }
    return tree;
  }
  function prepareList(events, start, length) {
    let index2 = start - 1;
    let containerBalance = -1;
    let listSpread = false;
    let listItem3;
    let lineIndex;
    let firstBlankLineIndex;
    let atMarker;
    while (++index2 <= length) {
      const event = events[index2];
      switch (event[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          if (event[0] === "enter") {
            containerBalance++;
          } else {
            containerBalance--;
          }
          atMarker = void 0;
          break;
        }
        case "lineEndingBlank": {
          if (event[0] === "enter") {
            if (listItem3 && !atMarker && !containerBalance && !firstBlankLineIndex) {
              firstBlankLineIndex = index2;
            }
            atMarker = void 0;
          }
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace": {
          break;
        }
        default: {
          atMarker = void 0;
        }
      }
      if (!containerBalance && event[0] === "enter" && event[1].type === "listItemPrefix" || containerBalance === -1 && event[0] === "exit" && (event[1].type === "listUnordered" || event[1].type === "listOrdered")) {
        if (listItem3) {
          let tailIndex = index2;
          lineIndex = void 0;
          while (tailIndex--) {
            const tailEvent = events[tailIndex];
            if (tailEvent[1].type === "lineEnding" || tailEvent[1].type === "lineEndingBlank") {
              if (tailEvent[0] === "exit") continue;
              if (lineIndex) {
                events[lineIndex][1].type = "lineEndingBlank";
                listSpread = true;
              }
              tailEvent[1].type = "lineEnding";
              lineIndex = tailIndex;
            } else if (tailEvent[1].type === "linePrefix" || tailEvent[1].type === "blockQuotePrefix" || tailEvent[1].type === "blockQuotePrefixWhitespace" || tailEvent[1].type === "blockQuoteMarker" || tailEvent[1].type === "listItemIndent") ;
            else {
              break;
            }
          }
          if (firstBlankLineIndex && (!lineIndex || firstBlankLineIndex < lineIndex)) {
            listItem3._spread = true;
          }
          listItem3.end = Object.assign({}, lineIndex ? events[lineIndex][1].start : event[1].end);
          events.splice(lineIndex || index2, 0, ["exit", listItem3, event[2]]);
          index2++;
          length++;
        }
        if (event[1].type === "listItemPrefix") {
          const item = {
            type: "listItem",
            _spread: false,
            start: Object.assign({}, event[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          listItem3 = item;
          events.splice(index2, 0, ["enter", item, event[2]]);
          index2++;
          length++;
          firstBlankLineIndex = void 0;
          atMarker = true;
        }
      }
    }
    events[start][1]._spread = listSpread;
    return length;
  }
  function opener(create2, and) {
    return open;
    function open(token) {
      enter.call(this, create2(token), token);
      if (and) and.call(this, token);
    }
  }
  function buffer() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function enter(node2, token, errorHandler) {
    const parent = this.stack[this.stack.length - 1];
    const siblings = parent.children;
    siblings.push(node2);
    this.stack.push(node2);
    this.tokenStack.push([token, errorHandler || void 0]);
    node2.position = {
      start: point(token.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function closer(and) {
    return close;
    function close(token) {
      if (and) and.call(this, token);
      exit2.call(this, token);
    }
  }
  function exit2(token, onExitError) {
    const node2 = this.stack.pop();
    const open = this.tokenStack.pop();
    if (!open) {
      throw new Error("Cannot close `" + token.type + "` (" + stringifyPosition({
        start: token.start,
        end: token.end
      }) + "): it’s not open");
    } else if (open[0].type !== token.type) {
      if (onExitError) {
        onExitError.call(this, token, open[0]);
      } else {
        const handler = open[1] || defaultOnError;
        handler.call(this, token, open[0]);
      }
    }
    node2.position.end = point(token.end);
  }
  function resume() {
    return toString$1(this.stack.pop());
  }
  function onenterlistordered() {
    this.data.expectingFirstListItemValue = true;
  }
  function onenterlistitemvalue(token) {
    if (this.data.expectingFirstListItemValue) {
      const ancestor = this.stack[this.stack.length - 2];
      ancestor.start = Number.parseInt(this.sliceSerialize(token), 10);
      this.data.expectingFirstListItemValue = void 0;
    }
  }
  function onexitcodefencedfenceinfo() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.lang = data2;
  }
  function onexitcodefencedfencemeta() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.meta = data2;
  }
  function onexitcodefencedfence() {
    if (this.data.flowCodeInside) return;
    this.buffer();
    this.data.flowCodeInside = true;
  }
  function onexitcodefenced() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, "");
    this.data.flowCodeInside = void 0;
  }
  function onexitcodeindented() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/(\r?\n|\r)$/g, "");
  }
  function onexitdefinitionlabelstring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
  }
  function onexitdefinitiontitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitdefinitiondestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitatxheadingsequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    if (!node2.depth) {
      const depth = this.sliceSerialize(token).length;
      node2.depth = depth;
    }
  }
  function onexitsetextheadingtext() {
    this.data.setextHeadingSlurpLineEnding = true;
  }
  function onexitsetextheadinglinesequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    node2.depth = this.sliceSerialize(token).codePointAt(0) === 61 ? 1 : 2;
  }
  function onexitsetextheading() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function onenterdata(token) {
    const node2 = this.stack[this.stack.length - 1];
    const siblings = node2.children;
    let tail = siblings[siblings.length - 1];
    if (!tail || tail.type !== "text") {
      tail = text2();
      tail.position = {
        start: point(token.start),
        // @ts-expect-error: we’ll add `end` later.
        end: void 0
      };
      siblings.push(tail);
    }
    this.stack.push(tail);
  }
  function onexitdata(token) {
    const tail = this.stack.pop();
    tail.value += this.sliceSerialize(token);
    tail.position.end = point(token.end);
  }
  function onexitlineending(token) {
    const context = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const tail = context.children[context.children.length - 1];
      tail.position.end = point(token.end);
      this.data.atHardBreak = void 0;
      return;
    }
    if (!this.data.setextHeadingSlurpLineEnding && config.canContainEols.includes(context.type)) {
      onenterdata.call(this, token);
      onexitdata.call(this, token);
    }
  }
  function onexithardbreak() {
    this.data.atHardBreak = true;
  }
  function onexithtmlflow() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexithtmltext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitcodetext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitlink() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitimage() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitlabeltext(token) {
    const string2 = this.sliceSerialize(token);
    const ancestor = this.stack[this.stack.length - 2];
    ancestor.label = decodeString(string2);
    ancestor.identifier = normalizeIdentifier(string2).toLowerCase();
  }
  function onexitlabel() {
    const fragment = this.stack[this.stack.length - 1];
    const value = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    this.data.inReference = true;
    if (node2.type === "link") {
      const children = fragment.children;
      node2.children = children;
    } else {
      node2.alt = value;
    }
  }
  function onexitresourcedestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitresourcetitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitresource() {
    this.data.inReference = void 0;
  }
  function onenterreference() {
    this.data.referenceType = "collapsed";
  }
  function onexitreferencestring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
    this.data.referenceType = "full";
  }
  function onexitcharacterreferencemarker(token) {
    this.data.characterReferenceType = token.type;
  }
  function onexitcharacterreferencevalue(token) {
    const data2 = this.sliceSerialize(token);
    const type = this.data.characterReferenceType;
    let value;
    if (type) {
      value = decodeNumericCharacterReference(data2, type === "characterReferenceMarkerNumeric" ? 10 : 16);
      this.data.characterReferenceType = void 0;
    } else {
      const result = decodeNamedCharacterReference(data2);
      value = result;
    }
    const tail = this.stack[this.stack.length - 1];
    tail.value += value;
  }
  function onexitcharacterreference(token) {
    const tail = this.stack.pop();
    tail.position.end = point(token.end);
  }
  function onexitautolinkprotocol(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = this.sliceSerialize(token);
  }
  function onexitautolinkemail(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = "mailto:" + this.sliceSerialize(token);
  }
  function blockQuote2() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function codeFlow() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function codeText2() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function definition2() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function emphasis2() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function heading2() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function hardBreak2() {
    return {
      type: "break"
    };
  }
  function html2() {
    return {
      type: "html",
      value: ""
    };
  }
  function image2() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function link2() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function list2(token) {
    return {
      type: "list",
      ordered: token.type === "listOrdered",
      start: null,
      spread: token._spread,
      children: []
    };
  }
  function listItem2(token) {
    return {
      type: "listItem",
      spread: token._spread,
      checked: null,
      children: []
    };
  }
  function paragraph2() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function strong2() {
    return {
      type: "strong",
      children: []
    };
  }
  function text2() {
    return {
      type: "text",
      value: ""
    };
  }
  function thematicBreak2() {
    return {
      type: "thematicBreak"
    };
  }
}
function point(d) {
  return {
    line: d.line,
    column: d.column,
    offset: d.offset
  };
}
function configure(combined, extensions) {
  let index2 = -1;
  while (++index2 < extensions.length) {
    const value = extensions[index2];
    if (Array.isArray(value)) {
      configure(combined, value);
    } else {
      extension(combined, value);
    }
  }
}
function extension(combined, extension2) {
  let key;
  for (key in extension2) {
    if (own$2.call(extension2, key)) {
      switch (key) {
        case "canContainEols": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "transforms": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "enter":
        case "exit": {
          const right = extension2[key];
          if (right) {
            Object.assign(combined[key], right);
          }
          break;
        }
      }
    }
  }
}
function defaultOnError(left, right) {
  if (left) {
    throw new Error("Cannot close `" + left.type + "` (" + stringifyPosition({
      start: left.start,
      end: left.end
    }) + "): a different token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is open");
  } else {
    throw new Error("Cannot close document, a token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is still open");
  }
}
function remarkParse(options) {
  const self2 = this;
  self2.parser = parser;
  function parser(doc) {
    return fromMarkdown(doc, {
      ...self2.data("settings"),
      ...options,
      // Note: these options are not in the readme.
      // The goal is for them to be set by plugins on `data` instead of being
      // passed by users.
      extensions: self2.data("micromarkExtensions") || [],
      mdastExtensions: self2.data("fromMarkdownExtensions") || []
    });
  }
}
function blockquote$1(state2, node2) {
  const result = {
    type: "element",
    tagName: "blockquote",
    properties: {},
    children: state2.wrap(state2.all(node2), true)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function hardBreak$1(state2, node2) {
  const result = { type: "element", tagName: "br", properties: {}, children: [] };
  state2.patch(node2, result);
  return [state2.applyData(node2, result), { type: "text", value: "\n" }];
}
function code$2(state2, node2) {
  const value = node2.value ? node2.value + "\n" : "";
  const properties = {};
  const language = node2.lang ? node2.lang.split(/\s+/) : [];
  if (language.length > 0) {
    properties.className = ["language-" + language[0]];
  }
  let result = {
    type: "element",
    tagName: "code",
    properties,
    children: [{ type: "text", value }]
  };
  if (node2.meta) {
    result.data = { meta: node2.meta };
  }
  state2.patch(node2, result);
  result = state2.applyData(node2, result);
  result = { type: "element", tagName: "pre", properties: {}, children: [result] };
  state2.patch(node2, result);
  return result;
}
function strikethrough(state2, node2) {
  const result = {
    type: "element",
    tagName: "del",
    properties: {},
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function emphasis$1(state2, node2) {
  const result = {
    type: "element",
    tagName: "em",
    properties: {},
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function footnoteReference$1(state2, node2) {
  const clobberPrefix = typeof state2.options.clobberPrefix === "string" ? state2.options.clobberPrefix : "user-content-";
  const id = String(node2.identifier).toUpperCase();
  const safeId = normalizeUri(id.toLowerCase());
  const index2 = state2.footnoteOrder.indexOf(id);
  let counter;
  let reuseCounter = state2.footnoteCounts.get(id);
  if (reuseCounter === void 0) {
    reuseCounter = 0;
    state2.footnoteOrder.push(id);
    counter = state2.footnoteOrder.length;
  } else {
    counter = index2 + 1;
  }
  reuseCounter += 1;
  state2.footnoteCounts.set(id, reuseCounter);
  const link2 = {
    type: "element",
    tagName: "a",
    properties: {
      href: "#" + clobberPrefix + "fn-" + safeId,
      id: clobberPrefix + "fnref-" + safeId + (reuseCounter > 1 ? "-" + reuseCounter : ""),
      dataFootnoteRef: true,
      ariaDescribedBy: ["footnote-label"]
    },
    children: [{ type: "text", value: String(counter) }]
  };
  state2.patch(node2, link2);
  const sup = {
    type: "element",
    tagName: "sup",
    properties: {},
    children: [link2]
  };
  state2.patch(node2, sup);
  return state2.applyData(node2, sup);
}
function heading$1(state2, node2) {
  const result = {
    type: "element",
    tagName: "h" + node2.depth,
    properties: {},
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function html$1(state2, node2) {
  if (state2.options.allowDangerousHtml) {
    const result = { type: "raw", value: node2.value };
    state2.patch(node2, result);
    return state2.applyData(node2, result);
  }
  return void 0;
}
function revert(state2, node2) {
  const subtype = node2.referenceType;
  let suffix = "]";
  if (subtype === "collapsed") {
    suffix += "[]";
  } else if (subtype === "full") {
    suffix += "[" + (node2.label || node2.identifier) + "]";
  }
  if (node2.type === "imageReference") {
    return [{ type: "text", value: "![" + node2.alt + suffix }];
  }
  const contents = state2.all(node2);
  const head = contents[0];
  if (head && head.type === "text") {
    head.value = "[" + head.value;
  } else {
    contents.unshift({ type: "text", value: "[" });
  }
  const tail = contents[contents.length - 1];
  if (tail && tail.type === "text") {
    tail.value += suffix;
  } else {
    contents.push({ type: "text", value: suffix });
  }
  return contents;
}
function imageReference$1(state2, node2) {
  const id = String(node2.identifier).toUpperCase();
  const definition2 = state2.definitionById.get(id);
  if (!definition2) {
    return revert(state2, node2);
  }
  const properties = { src: normalizeUri(definition2.url || ""), alt: node2.alt };
  if (definition2.title !== null && definition2.title !== void 0) {
    properties.title = definition2.title;
  }
  const result = { type: "element", tagName: "img", properties, children: [] };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function image$1(state2, node2) {
  const properties = { src: normalizeUri(node2.url) };
  if (node2.alt !== null && node2.alt !== void 0) {
    properties.alt = node2.alt;
  }
  if (node2.title !== null && node2.title !== void 0) {
    properties.title = node2.title;
  }
  const result = { type: "element", tagName: "img", properties, children: [] };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function inlineCode$1(state2, node2) {
  const text2 = { type: "text", value: node2.value.replace(/\r?\n|\r/g, " ") };
  state2.patch(node2, text2);
  const result = {
    type: "element",
    tagName: "code",
    properties: {},
    children: [text2]
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function linkReference$1(state2, node2) {
  const id = String(node2.identifier).toUpperCase();
  const definition2 = state2.definitionById.get(id);
  if (!definition2) {
    return revert(state2, node2);
  }
  const properties = { href: normalizeUri(definition2.url || "") };
  if (definition2.title !== null && definition2.title !== void 0) {
    properties.title = definition2.title;
  }
  const result = {
    type: "element",
    tagName: "a",
    properties,
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function link$1(state2, node2) {
  const properties = { href: normalizeUri(node2.url) };
  if (node2.title !== null && node2.title !== void 0) {
    properties.title = node2.title;
  }
  const result = {
    type: "element",
    tagName: "a",
    properties,
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function listItem$1(state2, node2, parent) {
  const results = state2.all(node2);
  const loose = parent ? listLoose(parent) : listItemLoose(node2);
  const properties = {};
  const children = [];
  if (typeof node2.checked === "boolean") {
    const head = results[0];
    let paragraph2;
    if (head && head.type === "element" && head.tagName === "p") {
      paragraph2 = head;
    } else {
      paragraph2 = { type: "element", tagName: "p", properties: {}, children: [] };
      results.unshift(paragraph2);
    }
    if (paragraph2.children.length > 0) {
      paragraph2.children.unshift({ type: "text", value: " " });
    }
    paragraph2.children.unshift({
      type: "element",
      tagName: "input",
      properties: { type: "checkbox", checked: node2.checked, disabled: true },
      children: []
    });
    properties.className = ["task-list-item"];
  }
  let index2 = -1;
  while (++index2 < results.length) {
    const child = results[index2];
    if (loose || index2 !== 0 || child.type !== "element" || child.tagName !== "p") {
      children.push({ type: "text", value: "\n" });
    }
    if (child.type === "element" && child.tagName === "p" && !loose) {
      children.push(...child.children);
    } else {
      children.push(child);
    }
  }
  const tail = results[results.length - 1];
  if (tail && (loose || tail.type !== "element" || tail.tagName !== "p")) {
    children.push({ type: "text", value: "\n" });
  }
  const result = { type: "element", tagName: "li", properties, children };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function listLoose(node2) {
  let loose = false;
  if (node2.type === "list") {
    loose = node2.spread || false;
    const children = node2.children;
    let index2 = -1;
    while (!loose && ++index2 < children.length) {
      loose = listItemLoose(children[index2]);
    }
  }
  return loose;
}
function listItemLoose(node2) {
  const spread = node2.spread;
  return spread === null || spread === void 0 ? node2.children.length > 1 : spread;
}
function list$1(state2, node2) {
  const properties = {};
  const results = state2.all(node2);
  let index2 = -1;
  if (typeof node2.start === "number" && node2.start !== 1) {
    properties.start = node2.start;
  }
  while (++index2 < results.length) {
    const child = results[index2];
    if (child.type === "element" && child.tagName === "li" && child.properties && Array.isArray(child.properties.className) && child.properties.className.includes("task-list-item")) {
      properties.className = ["contains-task-list"];
      break;
    }
  }
  const result = {
    type: "element",
    tagName: node2.ordered ? "ol" : "ul",
    properties,
    children: state2.wrap(results, true)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function paragraph$1(state2, node2) {
  const result = {
    type: "element",
    tagName: "p",
    properties: {},
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function root$1(state2, node2) {
  const result = { type: "root", children: state2.wrap(state2.all(node2)) };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function strong$1(state2, node2) {
  const result = {
    type: "element",
    tagName: "strong",
    properties: {},
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function table(state2, node2) {
  const rows = state2.all(node2);
  const firstRow = rows.shift();
  const tableContent = [];
  if (firstRow) {
    const head = {
      type: "element",
      tagName: "thead",
      properties: {},
      children: state2.wrap([firstRow], true)
    };
    state2.patch(node2.children[0], head);
    tableContent.push(head);
  }
  if (rows.length > 0) {
    const body = {
      type: "element",
      tagName: "tbody",
      properties: {},
      children: state2.wrap(rows, true)
    };
    const start = pointStart(node2.children[1]);
    const end = pointEnd(node2.children[node2.children.length - 1]);
    if (start && end) body.position = { start, end };
    tableContent.push(body);
  }
  const result = {
    type: "element",
    tagName: "table",
    properties: {},
    children: state2.wrap(tableContent, true)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function tableRow(state2, node2, parent) {
  const siblings = parent ? parent.children : void 0;
  const rowIndex = siblings ? siblings.indexOf(node2) : 1;
  const tagName = rowIndex === 0 ? "th" : "td";
  const align = parent && parent.type === "table" ? parent.align : void 0;
  const length = align ? align.length : node2.children.length;
  let cellIndex = -1;
  const cells = [];
  while (++cellIndex < length) {
    const cell = node2.children[cellIndex];
    const properties = {};
    const alignValue = align ? align[cellIndex] : void 0;
    if (alignValue) {
      properties.align = alignValue;
    }
    let result2 = { type: "element", tagName, properties, children: [] };
    if (cell) {
      result2.children = state2.all(cell);
      state2.patch(cell, result2);
      result2 = state2.applyData(cell, result2);
    }
    cells.push(result2);
  }
  const result = {
    type: "element",
    tagName: "tr",
    properties: {},
    children: state2.wrap(cells, true)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function tableCell(state2, node2) {
  const result = {
    type: "element",
    tagName: "td",
    // Assume body cell.
    properties: {},
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
const tab = 9;
const space = 32;
function trimLines(value) {
  const source = String(value);
  const search2 = /\r?\n|\r/g;
  let match = search2.exec(source);
  let last = 0;
  const lines = [];
  while (match) {
    lines.push(
      trimLine(source.slice(last, match.index), last > 0, true),
      match[0]
    );
    last = match.index + match[0].length;
    match = search2.exec(source);
  }
  lines.push(trimLine(source.slice(last), last > 0, false));
  return lines.join("");
}
function trimLine(value, start, end) {
  let startIndex = 0;
  let endIndex = value.length;
  if (start) {
    let code2 = value.codePointAt(startIndex);
    while (code2 === tab || code2 === space) {
      startIndex++;
      code2 = value.codePointAt(startIndex);
    }
  }
  if (end) {
    let code2 = value.codePointAt(endIndex - 1);
    while (code2 === tab || code2 === space) {
      endIndex--;
      code2 = value.codePointAt(endIndex - 1);
    }
  }
  return endIndex > startIndex ? value.slice(startIndex, endIndex) : "";
}
function text$2(state2, node2) {
  const result = { type: "text", value: trimLines(String(node2.value)) };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function thematicBreak$1(state2, node2) {
  const result = {
    type: "element",
    tagName: "hr",
    properties: {},
    children: []
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
const handlers$1 = {
  blockquote: blockquote$1,
  break: hardBreak$1,
  code: code$2,
  delete: strikethrough,
  emphasis: emphasis$1,
  footnoteReference: footnoteReference$1,
  heading: heading$1,
  html: html$1,
  imageReference: imageReference$1,
  image: image$1,
  inlineCode: inlineCode$1,
  linkReference: linkReference$1,
  link: link$1,
  listItem: listItem$1,
  list: list$1,
  paragraph: paragraph$1,
  // @ts-expect-error: root is different, but hard to type.
  root: root$1,
  strong: strong$1,
  table,
  tableCell,
  tableRow,
  text: text$2,
  thematicBreak: thematicBreak$1,
  toml: ignore,
  yaml: ignore,
  definition: ignore,
  footnoteDefinition: ignore
};
function ignore() {
  return void 0;
}
const VOID = -1;
const PRIMITIVE = 0;
const ARRAY = 1;
const OBJECT = 2;
const DATE = 3;
const REGEXP = 4;
const MAP = 5;
const SET = 6;
const ERROR = 7;
const BIGINT = 8;
const env = typeof self === "object" ? self : globalThis;
const guard = (name2, init) => {
  switch (name2) {
    case "Function":
    case "SharedWorker":
    case "Worker":
    case "eval":
    case "setInterval":
    case "setTimeout":
      throw new TypeError("unable to deserialize " + name2);
  }
  return new env[name2](init);
};
const deserializer = ($, _) => {
  const as = (out, index2) => {
    $.set(index2, out);
    return out;
  };
  const unpair = (index2) => {
    if ($.has(index2))
      return $.get(index2);
    const [type, value] = _[index2];
    switch (type) {
      case PRIMITIVE:
      case VOID:
        return as(value, index2);
      case ARRAY: {
        const arr = as([], index2);
        for (const index3 of value)
          arr.push(unpair(index3));
        return arr;
      }
      case OBJECT: {
        const object = as({}, index2);
        for (const [key, index3] of value)
          object[unpair(key)] = unpair(index3);
        return object;
      }
      case DATE:
        return as(new Date(value), index2);
      case REGEXP: {
        const { source, flags } = value;
        return as(new RegExp(source, flags), index2);
      }
      case MAP: {
        const map2 = as(/* @__PURE__ */ new Map(), index2);
        for (const [key, index3] of value)
          map2.set(unpair(key), unpair(index3));
        return map2;
      }
      case SET: {
        const set = as(/* @__PURE__ */ new Set(), index2);
        for (const index3 of value)
          set.add(unpair(index3));
        return set;
      }
      case ERROR: {
        const { name: name2, message } = value;
        return as(guard(name2, message), index2);
      }
      case BIGINT:
        return as(BigInt(value), index2);
      case "BigInt":
        return as(Object(BigInt(value)), index2);
      case "ArrayBuffer":
        return as(new Uint8Array(value).buffer, value);
      case "DataView": {
        const { buffer } = new Uint8Array(value);
        return as(new DataView(buffer), value);
      }
    }
    return as(guard(type, value), index2);
  };
  return unpair;
};
const deserialize = (serialized) => deserializer(/* @__PURE__ */ new Map(), serialized)(0);
const EMPTY = "";
const { toString } = {};
const { keys } = Object;
const typeOf = (value) => {
  const type = typeof value;
  if (type !== "object" || !value)
    return [PRIMITIVE, type];
  const asString = toString.call(value).slice(8, -1);
  switch (asString) {
    case "Array":
      return [ARRAY, EMPTY];
    case "Object":
      return [OBJECT, EMPTY];
    case "Date":
      return [DATE, EMPTY];
    case "RegExp":
      return [REGEXP, EMPTY];
    case "Map":
      return [MAP, EMPTY];
    case "Set":
      return [SET, EMPTY];
    case "DataView":
      return [ARRAY, asString];
  }
  if (asString.includes("Array"))
    return [ARRAY, asString];
  if (asString.includes("Error"))
    return [ERROR, asString];
  return [OBJECT, asString];
};
const shouldSkip = ([TYPE, type]) => TYPE === PRIMITIVE && (type === "function" || type === "symbol");
const serializer = (strict, json, $, _) => {
  const as = (out, value) => {
    const index2 = _.push(out) - 1;
    $.set(value, index2);
    return index2;
  };
  const pair = (value) => {
    if ($.has(value))
      return $.get(value);
    let [TYPE, type] = typeOf(value);
    switch (TYPE) {
      case PRIMITIVE: {
        let entry = value;
        switch (type) {
          case "bigint":
            TYPE = BIGINT;
            entry = value.toString();
            break;
          case "function":
          case "symbol":
            if (strict)
              throw new TypeError("unable to serialize " + type);
            entry = null;
            break;
          case "undefined":
            return as([VOID], value);
        }
        return as([TYPE, entry], value);
      }
      case ARRAY: {
        if (type) {
          let spread = value;
          if (type === "DataView") {
            spread = new Uint8Array(value.buffer);
          } else if (type === "ArrayBuffer") {
            spread = new Uint8Array(value);
          }
          return as([type, [...spread]], value);
        }
        const arr = [];
        const index2 = as([TYPE, arr], value);
        for (const entry of value)
          arr.push(pair(entry));
        return index2;
      }
      case OBJECT: {
        if (type) {
          switch (type) {
            case "BigInt":
              return as([type, value.toString()], value);
            case "Boolean":
            case "Number":
            case "String":
              return as([type, value.valueOf()], value);
          }
        }
        if (json && "toJSON" in value)
          return pair(value.toJSON());
        const entries2 = [];
        const index2 = as([TYPE, entries2], value);
        for (const key of keys(value)) {
          if (strict || !shouldSkip(typeOf(value[key])))
            entries2.push([pair(key), pair(value[key])]);
        }
        return index2;
      }
      case DATE:
        return as([TYPE, value.toISOString()], value);
      case REGEXP: {
        const { source, flags } = value;
        return as([TYPE, { source, flags }], value);
      }
      case MAP: {
        const entries2 = [];
        const index2 = as([TYPE, entries2], value);
        for (const [key, entry] of value) {
          if (strict || !(shouldSkip(typeOf(key)) || shouldSkip(typeOf(entry))))
            entries2.push([pair(key), pair(entry)]);
        }
        return index2;
      }
      case SET: {
        const entries2 = [];
        const index2 = as([TYPE, entries2], value);
        for (const entry of value) {
          if (strict || !shouldSkip(typeOf(entry)))
            entries2.push(pair(entry));
        }
        return index2;
      }
    }
    const { message } = value;
    return as([TYPE, { name: type, message }], value);
  };
  return pair;
};
const serialize$1 = (value, { json, lossy } = {}) => {
  const _ = [];
  return serializer(!(json || lossy), !!json, /* @__PURE__ */ new Map(), _)(value), _;
};
const structuredClone$1 = typeof structuredClone === "function" ? (
  /* c8 ignore start */
  (any, options) => options && ("json" in options || "lossy" in options) ? deserialize(serialize$1(any, options)) : structuredClone(any)
) : (any, options) => deserialize(serialize$1(any, options));
function defaultFootnoteBackContent(_, rereferenceIndex) {
  const result = [{ type: "text", value: "↩" }];
  if (rereferenceIndex > 1) {
    result.push({
      type: "element",
      tagName: "sup",
      properties: {},
      children: [{ type: "text", value: String(rereferenceIndex) }]
    });
  }
  return result;
}
function defaultFootnoteBackLabel(referenceIndex, rereferenceIndex) {
  return "Back to reference " + (referenceIndex + 1) + (rereferenceIndex > 1 ? "-" + rereferenceIndex : "");
}
function footer(state2) {
  const clobberPrefix = typeof state2.options.clobberPrefix === "string" ? state2.options.clobberPrefix : "user-content-";
  const footnoteBackContent = state2.options.footnoteBackContent || defaultFootnoteBackContent;
  const footnoteBackLabel = state2.options.footnoteBackLabel || defaultFootnoteBackLabel;
  const footnoteLabel = state2.options.footnoteLabel || "Footnotes";
  const footnoteLabelTagName = state2.options.footnoteLabelTagName || "h2";
  const footnoteLabelProperties = state2.options.footnoteLabelProperties || {
    className: ["sr-only"]
  };
  const listItems = [];
  let referenceIndex = -1;
  while (++referenceIndex < state2.footnoteOrder.length) {
    const definition2 = state2.footnoteById.get(
      state2.footnoteOrder[referenceIndex]
    );
    if (!definition2) {
      continue;
    }
    const content2 = state2.all(definition2);
    const id = String(definition2.identifier).toUpperCase();
    const safeId = normalizeUri(id.toLowerCase());
    let rereferenceIndex = 0;
    const backReferences = [];
    const counts = state2.footnoteCounts.get(id);
    while (counts !== void 0 && ++rereferenceIndex <= counts) {
      if (backReferences.length > 0) {
        backReferences.push({ type: "text", value: " " });
      }
      let children = typeof footnoteBackContent === "string" ? footnoteBackContent : footnoteBackContent(referenceIndex, rereferenceIndex);
      if (typeof children === "string") {
        children = { type: "text", value: children };
      }
      backReferences.push({
        type: "element",
        tagName: "a",
        properties: {
          href: "#" + clobberPrefix + "fnref-" + safeId + (rereferenceIndex > 1 ? "-" + rereferenceIndex : ""),
          dataFootnoteBackref: "",
          ariaLabel: typeof footnoteBackLabel === "string" ? footnoteBackLabel : footnoteBackLabel(referenceIndex, rereferenceIndex),
          className: ["data-footnote-backref"]
        },
        children: Array.isArray(children) ? children : [children]
      });
    }
    const tail = content2[content2.length - 1];
    if (tail && tail.type === "element" && tail.tagName === "p") {
      const tailTail = tail.children[tail.children.length - 1];
      if (tailTail && tailTail.type === "text") {
        tailTail.value += " ";
      } else {
        tail.children.push({ type: "text", value: " " });
      }
      tail.children.push(...backReferences);
    } else {
      content2.push(...backReferences);
    }
    const listItem2 = {
      type: "element",
      tagName: "li",
      properties: { id: clobberPrefix + "fn-" + safeId },
      children: state2.wrap(content2, true)
    };
    state2.patch(definition2, listItem2);
    listItems.push(listItem2);
  }
  if (listItems.length === 0) {
    return;
  }
  return {
    type: "element",
    tagName: "section",
    properties: { dataFootnotes: true, className: ["footnotes"] },
    children: [
      {
        type: "element",
        tagName: footnoteLabelTagName,
        properties: {
          ...structuredClone$1(footnoteLabelProperties),
          id: "footnote-label"
        },
        children: [{ type: "text", value: footnoteLabel }]
      },
      { type: "text", value: "\n" },
      {
        type: "element",
        tagName: "ol",
        properties: {},
        children: state2.wrap(listItems, true)
      },
      { type: "text", value: "\n" }
    ]
  };
}
const convert = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  (function(test) {
    if (test === null || test === void 0) {
      return ok;
    }
    if (typeof test === "function") {
      return castFactory(test);
    }
    if (typeof test === "object") {
      return Array.isArray(test) ? anyFactory(test) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        propertiesFactory(
          /** @type {Props} */
          test
        )
      );
    }
    if (typeof test === "string") {
      return typeFactory(test);
    }
    throw new Error("Expected function, string, or object as test");
  })
);
function anyFactory(tests) {
  const checks2 = [];
  let index2 = -1;
  while (++index2 < tests.length) {
    checks2[index2] = convert(tests[index2]);
  }
  return castFactory(any);
  function any(...parameters) {
    let index3 = -1;
    while (++index3 < checks2.length) {
      if (checks2[index3].apply(this, parameters)) return true;
    }
    return false;
  }
}
function propertiesFactory(check) {
  const checkAsRecord = (
    /** @type {Record<string, unknown>} */
    check
  );
  return castFactory(all2);
  function all2(node2) {
    const nodeAsRecord = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      node2
    );
    let key;
    for (key in check) {
      if (nodeAsRecord[key] !== checkAsRecord[key]) return false;
    }
    return true;
  }
}
function typeFactory(check) {
  return castFactory(type);
  function type(node2) {
    return node2 && node2.type === check;
  }
}
function castFactory(testFunction) {
  return check;
  function check(value, index2, parent) {
    return Boolean(
      looksLikeANode(value) && testFunction.call(
        this,
        value,
        typeof index2 === "number" ? index2 : void 0,
        parent || void 0
      )
    );
  }
}
function ok() {
  return true;
}
function looksLikeANode(value) {
  return value !== null && typeof value === "object" && "type" in value;
}
function color(d) {
  return d;
}
const empty = [];
const CONTINUE = true;
const EXIT = false;
const SKIP = "skip";
function visitParents(tree, test, visitor, reverse) {
  let check;
  if (typeof test === "function" && typeof visitor !== "function") {
    reverse = visitor;
    visitor = test;
  } else {
    check = test;
  }
  const is = convert(check);
  const step = reverse ? -1 : 1;
  factory(tree, void 0, [])();
  function factory(node2, index2, parents) {
    const value = (
      /** @type {Record<string, unknown>} */
      node2 && typeof node2 === "object" ? node2 : {}
    );
    if (typeof value.type === "string") {
      const name2 = (
        // `hast`
        typeof value.tagName === "string" ? value.tagName : (
          // `xast`
          typeof value.name === "string" ? value.name : void 0
        )
      );
      Object.defineProperty(visit2, "name", {
        value: "node (" + color(node2.type + (name2 ? "<" + name2 + ">" : "")) + ")"
      });
    }
    return visit2;
    function visit2() {
      let result = empty;
      let subresult;
      let offset;
      let grandparents;
      if (!test || is(node2, index2, parents[parents.length - 1] || void 0)) {
        result = toResult(visitor(node2, parents));
        if (result[0] === EXIT) {
          return result;
        }
      }
      if ("children" in node2 && node2.children) {
        const nodeAsParent = (
          /** @type {UnistParent} */
          node2
        );
        if (nodeAsParent.children && result[0] !== SKIP) {
          offset = (reverse ? nodeAsParent.children.length : -1) + step;
          grandparents = parents.concat(nodeAsParent);
          while (offset > -1 && offset < nodeAsParent.children.length) {
            const child = nodeAsParent.children[offset];
            subresult = factory(child, offset, grandparents)();
            if (subresult[0] === EXIT) {
              return subresult;
            }
            offset = typeof subresult[1] === "number" ? subresult[1] : offset + step;
          }
        }
      }
      return result;
    }
  }
}
function toResult(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "number") {
    return [CONTINUE, value];
  }
  return value === null || value === void 0 ? empty : [value];
}
function visit(tree, testOrVisitor, visitorOrReverse, maybeReverse) {
  let reverse;
  let test;
  let visitor;
  if (typeof testOrVisitor === "function" && typeof visitorOrReverse !== "function") {
    test = void 0;
    visitor = testOrVisitor;
    reverse = visitorOrReverse;
  } else {
    test = testOrVisitor;
    visitor = visitorOrReverse;
    reverse = maybeReverse;
  }
  visitParents(tree, test, overload, reverse);
  function overload(node2, parents) {
    const parent = parents[parents.length - 1];
    const index2 = parent ? parent.children.indexOf(node2) : void 0;
    return visitor(node2, index2, parent);
  }
}
const own$1 = {}.hasOwnProperty;
const emptyOptions$1 = {};
function createState(tree, options) {
  const settings = options || emptyOptions$1;
  const definitionById = /* @__PURE__ */ new Map();
  const footnoteById = /* @__PURE__ */ new Map();
  const footnoteCounts = /* @__PURE__ */ new Map();
  const handlers2 = { ...handlers$1, ...settings.handlers };
  const state2 = {
    all: all2,
    applyData,
    definitionById,
    footnoteById,
    footnoteCounts,
    footnoteOrder: [],
    handlers: handlers2,
    one: one2,
    options: settings,
    patch,
    wrap: wrap$1
  };
  visit(tree, function(node2) {
    if (node2.type === "definition" || node2.type === "footnoteDefinition") {
      const map2 = node2.type === "definition" ? definitionById : footnoteById;
      const id = String(node2.identifier).toUpperCase();
      if (!map2.has(id)) {
        map2.set(id, node2);
      }
    }
  });
  return state2;
  function one2(node2, parent) {
    const type = node2.type;
    const handle2 = state2.handlers[type];
    if (own$1.call(state2.handlers, type) && handle2) {
      return handle2(state2, node2, parent);
    }
    if (state2.options.passThrough && state2.options.passThrough.includes(type)) {
      if ("children" in node2) {
        const { children, ...shallow } = node2;
        const result = structuredClone$1(shallow);
        result.children = state2.all(node2);
        return result;
      }
      return structuredClone$1(node2);
    }
    const unknown = state2.options.unknownHandler || defaultUnknownHandler;
    return unknown(state2, node2, parent);
  }
  function all2(parent) {
    const values = [];
    if ("children" in parent) {
      const nodes = parent.children;
      let index2 = -1;
      while (++index2 < nodes.length) {
        const result = state2.one(nodes[index2], parent);
        if (result) {
          if (index2 && nodes[index2 - 1].type === "break") {
            if (!Array.isArray(result) && result.type === "text") {
              result.value = trimMarkdownSpaceStart(result.value);
            }
            if (!Array.isArray(result) && result.type === "element") {
              const head = result.children[0];
              if (head && head.type === "text") {
                head.value = trimMarkdownSpaceStart(head.value);
              }
            }
          }
          if (Array.isArray(result)) {
            values.push(...result);
          } else {
            values.push(result);
          }
        }
      }
    }
    return values;
  }
}
function patch(from, to) {
  if (from.position) to.position = position$1(from);
}
function applyData(from, to) {
  let result = to;
  if (from && from.data) {
    const hName = from.data.hName;
    const hChildren = from.data.hChildren;
    const hProperties = from.data.hProperties;
    if (typeof hName === "string") {
      if (result.type === "element") {
        result.tagName = hName;
      } else {
        const children = "children" in result ? result.children : [result];
        result = { type: "element", tagName: hName, properties: {}, children };
      }
    }
    if (result.type === "element" && hProperties) {
      Object.assign(result.properties, structuredClone$1(hProperties));
    }
    if ("children" in result && result.children && hChildren !== null && hChildren !== void 0) {
      result.children = hChildren;
    }
  }
  return result;
}
function defaultUnknownHandler(state2, node2) {
  const data = node2.data || {};
  const result = "value" in node2 && !(own$1.call(data, "hProperties") || own$1.call(data, "hChildren")) ? { type: "text", value: node2.value } : {
    type: "element",
    tagName: "div",
    properties: {},
    children: state2.all(node2)
  };
  state2.patch(node2, result);
  return state2.applyData(node2, result);
}
function wrap$1(nodes, loose) {
  const result = [];
  let index2 = -1;
  if (loose) {
    result.push({ type: "text", value: "\n" });
  }
  while (++index2 < nodes.length) {
    if (index2) result.push({ type: "text", value: "\n" });
    result.push(nodes[index2]);
  }
  if (loose && nodes.length > 0) {
    result.push({ type: "text", value: "\n" });
  }
  return result;
}
function trimMarkdownSpaceStart(value) {
  let index2 = 0;
  let code2 = value.charCodeAt(index2);
  while (code2 === 9 || code2 === 32) {
    index2++;
    code2 = value.charCodeAt(index2);
  }
  return value.slice(index2);
}
function toHast(tree, options) {
  const state2 = createState(tree, options);
  const node2 = state2.one(tree, void 0);
  const foot = footer(state2);
  const result = Array.isArray(node2) ? { type: "root", children: node2 } : node2 || { type: "root", children: [] };
  if (foot) {
    result.children.push({ type: "text", value: "\n" }, foot);
  }
  return result;
}
function remarkRehype(destination, options) {
  if (destination && "run" in destination) {
    return async function(tree, file) {
      const hastTree = (
        /** @type {HastRoot} */
        toHast(tree, { file, ...options })
      );
      await destination.run(hastTree, file);
    };
  }
  return function(tree, file) {
    return (
      /** @type {HastRoot} */
      toHast(tree, { file, ...destination || options })
    );
  };
}
function bail(error) {
  if (error) {
    throw error;
  }
}
var extend$1;
var hasRequiredExtend;
function requireExtend() {
  if (hasRequiredExtend) return extend$1;
  hasRequiredExtend = 1;
  var hasOwn = Object.prototype.hasOwnProperty;
  var toStr = Object.prototype.toString;
  var defineProperty = Object.defineProperty;
  var gOPD = Object.getOwnPropertyDescriptor;
  var isArray = function isArray2(arr) {
    if (typeof Array.isArray === "function") {
      return Array.isArray(arr);
    }
    return toStr.call(arr) === "[object Array]";
  };
  var isPlainObject2 = function isPlainObject3(obj) {
    if (!obj || toStr.call(obj) !== "[object Object]") {
      return false;
    }
    var hasOwnConstructor = hasOwn.call(obj, "constructor");
    var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, "isPrototypeOf");
    if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
      return false;
    }
    var key;
    for (key in obj) {
    }
    return typeof key === "undefined" || hasOwn.call(obj, key);
  };
  var setProperty = function setProperty2(target, options) {
    if (defineProperty && options.name === "__proto__") {
      defineProperty(target, options.name, {
        enumerable: true,
        configurable: true,
        value: options.newValue,
        writable: true
      });
    } else {
      target[options.name] = options.newValue;
    }
  };
  var getProperty = function getProperty2(obj, name2) {
    if (name2 === "__proto__") {
      if (!hasOwn.call(obj, name2)) {
        return void 0;
      } else if (gOPD) {
        return gOPD(obj, name2).value;
      }
    }
    return obj[name2];
  };
  extend$1 = function extend2() {
    var options, name2, src, copy, copyIsArray, clone;
    var target = arguments[0];
    var i = 1;
    var length = arguments.length;
    var deep = false;
    if (typeof target === "boolean") {
      deep = target;
      target = arguments[1] || {};
      i = 2;
    }
    if (target == null || typeof target !== "object" && typeof target !== "function") {
      target = {};
    }
    for (; i < length; ++i) {
      options = arguments[i];
      if (options != null) {
        for (name2 in options) {
          src = getProperty(target, name2);
          copy = getProperty(options, name2);
          if (target !== copy) {
            if (deep && copy && (isPlainObject2(copy) || (copyIsArray = isArray(copy)))) {
              if (copyIsArray) {
                copyIsArray = false;
                clone = src && isArray(src) ? src : [];
              } else {
                clone = src && isPlainObject2(src) ? src : {};
              }
              setProperty(target, { name: name2, newValue: extend2(deep, clone, copy) });
            } else if (typeof copy !== "undefined") {
              setProperty(target, { name: name2, newValue: copy });
            }
          }
        }
      }
    }
    return target;
  };
  return extend$1;
}
var extendExports = requireExtend();
const extend = /* @__PURE__ */ getDefaultExportFromCjs(extendExports);
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
}
function trough() {
  const fns = [];
  const pipeline = { run, use };
  return pipeline;
  function run(...values) {
    let middlewareIndex = -1;
    const callback = values.pop();
    if (typeof callback !== "function") {
      throw new TypeError("Expected function as last argument, not " + callback);
    }
    next(null, ...values);
    function next(error, ...output) {
      const fn = fns[++middlewareIndex];
      let index2 = -1;
      if (error) {
        callback(error);
        return;
      }
      while (++index2 < values.length) {
        if (output[index2] === null || output[index2] === void 0) {
          output[index2] = values[index2];
        }
      }
      values = output;
      if (fn) {
        wrap(fn, next)(...output);
      } else {
        callback(null, ...output);
      }
    }
  }
  function use(middelware) {
    if (typeof middelware !== "function") {
      throw new TypeError(
        "Expected `middelware` to be a function, not " + middelware
      );
    }
    fns.push(middelware);
    return pipeline;
  }
}
function wrap(middleware, callback) {
  let called;
  return wrapped;
  function wrapped(...parameters) {
    const fnExpectsCallback = middleware.length > parameters.length;
    let result;
    if (fnExpectsCallback) {
      parameters.push(done);
    }
    try {
      result = middleware.apply(this, parameters);
    } catch (error) {
      const exception = (
        /** @type {Error} */
        error
      );
      if (fnExpectsCallback && called) {
        throw exception;
      }
      return done(exception);
    }
    if (!fnExpectsCallback) {
      if (result && result.then && typeof result.then === "function") {
        result.then(then, done);
      } else if (result instanceof Error) {
        done(result);
      } else {
        then(result);
      }
    }
  }
  function done(error, ...output) {
    if (!called) {
      called = true;
      callback(error, ...output);
    }
  }
  function then(value) {
    done(null, value);
  }
}
const minpath = { basename, dirname, extname, join, sep: "/" };
function basename(path2, extname2) {
  if (extname2 !== void 0 && typeof extname2 !== "string") {
    throw new TypeError('"ext" argument must be a string');
  }
  assertPath$1(path2);
  let start = 0;
  let end = -1;
  let index2 = path2.length;
  let seenNonSlash;
  if (extname2 === void 0 || extname2.length === 0 || extname2.length > path2.length) {
    while (index2--) {
      if (path2.codePointAt(index2) === 47) {
        if (seenNonSlash) {
          start = index2 + 1;
          break;
        }
      } else if (end < 0) {
        seenNonSlash = true;
        end = index2 + 1;
      }
    }
    return end < 0 ? "" : path2.slice(start, end);
  }
  if (extname2 === path2) {
    return "";
  }
  let firstNonSlashEnd = -1;
  let extnameIndex = extname2.length - 1;
  while (index2--) {
    if (path2.codePointAt(index2) === 47) {
      if (seenNonSlash) {
        start = index2 + 1;
        break;
      }
    } else {
      if (firstNonSlashEnd < 0) {
        seenNonSlash = true;
        firstNonSlashEnd = index2 + 1;
      }
      if (extnameIndex > -1) {
        if (path2.codePointAt(index2) === extname2.codePointAt(extnameIndex--)) {
          if (extnameIndex < 0) {
            end = index2;
          }
        } else {
          extnameIndex = -1;
          end = firstNonSlashEnd;
        }
      }
    }
  }
  if (start === end) {
    end = firstNonSlashEnd;
  } else if (end < 0) {
    end = path2.length;
  }
  return path2.slice(start, end);
}
function dirname(path2) {
  assertPath$1(path2);
  if (path2.length === 0) {
    return ".";
  }
  let end = -1;
  let index2 = path2.length;
  let unmatchedSlash;
  while (--index2) {
    if (path2.codePointAt(index2) === 47) {
      if (unmatchedSlash) {
        end = index2;
        break;
      }
    } else if (!unmatchedSlash) {
      unmatchedSlash = true;
    }
  }
  return end < 0 ? path2.codePointAt(0) === 47 ? "/" : "." : end === 1 && path2.codePointAt(0) === 47 ? "//" : path2.slice(0, end);
}
function extname(path2) {
  assertPath$1(path2);
  let index2 = path2.length;
  let end = -1;
  let startPart = 0;
  let startDot = -1;
  let preDotState = 0;
  let unmatchedSlash;
  while (index2--) {
    const code2 = path2.codePointAt(index2);
    if (code2 === 47) {
      if (unmatchedSlash) {
        startPart = index2 + 1;
        break;
      }
      continue;
    }
    if (end < 0) {
      unmatchedSlash = true;
      end = index2 + 1;
    }
    if (code2 === 46) {
      if (startDot < 0) {
        startDot = index2;
      } else if (preDotState !== 1) {
        preDotState = 1;
      }
    } else if (startDot > -1) {
      preDotState = -1;
    }
  }
  if (startDot < 0 || end < 0 || // We saw a non-dot character immediately before the dot.
  preDotState === 0 || // The (right-most) trimmed path component is exactly `..`.
  preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return "";
  }
  return path2.slice(startDot, end);
}
function join(...segments) {
  let index2 = -1;
  let joined;
  while (++index2 < segments.length) {
    assertPath$1(segments[index2]);
    if (segments[index2]) {
      joined = joined === void 0 ? segments[index2] : joined + "/" + segments[index2];
    }
  }
  return joined === void 0 ? "." : normalize(joined);
}
function normalize(path2) {
  assertPath$1(path2);
  const absolute = path2.codePointAt(0) === 47;
  let value = normalizeString(path2, !absolute);
  if (value.length === 0 && !absolute) {
    value = ".";
  }
  if (value.length > 0 && path2.codePointAt(path2.length - 1) === 47) {
    value += "/";
  }
  return absolute ? "/" + value : value;
}
function normalizeString(path2, allowAboveRoot) {
  let result = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let index2 = -1;
  let code2;
  let lastSlashIndex;
  while (++index2 <= path2.length) {
    if (index2 < path2.length) {
      code2 = path2.codePointAt(index2);
    } else if (code2 === 47) {
      break;
    } else {
      code2 = 47;
    }
    if (code2 === 47) {
      if (lastSlash === index2 - 1 || dots === 1) ;
      else if (lastSlash !== index2 - 1 && dots === 2) {
        if (result.length < 2 || lastSegmentLength !== 2 || result.codePointAt(result.length - 1) !== 46 || result.codePointAt(result.length - 2) !== 46) {
          if (result.length > 2) {
            lastSlashIndex = result.lastIndexOf("/");
            if (lastSlashIndex !== result.length - 1) {
              if (lastSlashIndex < 0) {
                result = "";
                lastSegmentLength = 0;
              } else {
                result = result.slice(0, lastSlashIndex);
                lastSegmentLength = result.length - 1 - result.lastIndexOf("/");
              }
              lastSlash = index2;
              dots = 0;
              continue;
            }
          } else if (result.length > 0) {
            result = "";
            lastSegmentLength = 0;
            lastSlash = index2;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          result = result.length > 0 ? result + "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (result.length > 0) {
          result += "/" + path2.slice(lastSlash + 1, index2);
        } else {
          result = path2.slice(lastSlash + 1, index2);
        }
        lastSegmentLength = index2 - lastSlash - 1;
      }
      lastSlash = index2;
      dots = 0;
    } else if (code2 === 46 && dots > -1) {
      dots++;
    } else {
      dots = -1;
    }
  }
  return result;
}
function assertPath$1(path2) {
  if (typeof path2 !== "string") {
    throw new TypeError(
      "Path must be a string. Received " + JSON.stringify(path2)
    );
  }
}
const minproc = { cwd };
function cwd() {
  return "/";
}
function isUrl(fileUrlOrPath) {
  return Boolean(
    fileUrlOrPath !== null && typeof fileUrlOrPath === "object" && "href" in fileUrlOrPath && fileUrlOrPath.href && "protocol" in fileUrlOrPath && fileUrlOrPath.protocol && // @ts-expect-error: indexing is fine.
    fileUrlOrPath.auth === void 0
  );
}
function urlToPath(path2) {
  if (typeof path2 === "string") {
    path2 = new URL(path2);
  } else if (!isUrl(path2)) {
    const error = new TypeError(
      'The "path" argument must be of type string or an instance of URL. Received `' + path2 + "`"
    );
    error.code = "ERR_INVALID_ARG_TYPE";
    throw error;
  }
  if (path2.protocol !== "file:") {
    const error = new TypeError("The URL must be of scheme file");
    error.code = "ERR_INVALID_URL_SCHEME";
    throw error;
  }
  return getPathFromURLPosix(path2);
}
function getPathFromURLPosix(url) {
  if (url.hostname !== "") {
    const error = new TypeError(
      'File URL host must be "localhost" or empty on darwin'
    );
    error.code = "ERR_INVALID_FILE_URL_HOST";
    throw error;
  }
  const pathname = url.pathname;
  let index2 = -1;
  while (++index2 < pathname.length) {
    if (pathname.codePointAt(index2) === 37 && pathname.codePointAt(index2 + 1) === 50) {
      const third = pathname.codePointAt(index2 + 2);
      if (third === 70 || third === 102) {
        const error = new TypeError(
          "File URL path must not include encoded / characters"
        );
        error.code = "ERR_INVALID_FILE_URL_PATH";
        throw error;
      }
    }
  }
  return decodeURIComponent(pathname);
}
const order = (
  /** @type {const} */
  [
    "history",
    "path",
    "basename",
    "stem",
    "extname",
    "dirname"
  ]
);
class VFile {
  /**
   * Create a new virtual file.
   *
   * `options` is treated as:
   *
   * *   `string` or `Uint8Array` — `{value: options}`
   * *   `URL` — `{path: options}`
   * *   `VFile` — shallow copies its data over to the new file
   * *   `object` — all fields are shallow copied over to the new file
   *
   * Path related fields are set in the following order (least specific to
   * most specific): `history`, `path`, `basename`, `stem`, `extname`,
   * `dirname`.
   *
   * You cannot set `dirname` or `extname` without setting either `history`,
   * `path`, `basename`, or `stem` too.
   *
   * @param {Compatible | null | undefined} [value]
   *   File value.
   * @returns
   *   New instance.
   */
  constructor(value) {
    let options;
    if (!value) {
      options = {};
    } else if (isUrl(value)) {
      options = { path: value };
    } else if (typeof value === "string" || isUint8Array$1(value)) {
      options = { value };
    } else {
      options = value;
    }
    this.cwd = "cwd" in options ? "" : minproc.cwd();
    this.data = {};
    this.history = [];
    this.messages = [];
    this.value;
    this.map;
    this.result;
    this.stored;
    let index2 = -1;
    while (++index2 < order.length) {
      const field2 = order[index2];
      if (field2 in options && options[field2] !== void 0 && options[field2] !== null) {
        this[field2] = field2 === "history" ? [...options[field2]] : options[field2];
      }
    }
    let field;
    for (field in options) {
      if (!order.includes(field)) {
        this[field] = options[field];
      }
    }
  }
  /**
   * Get the basename (including extname) (example: `'index.min.js'`).
   *
   * @returns {string | undefined}
   *   Basename.
   */
  get basename() {
    return typeof this.path === "string" ? minpath.basename(this.path) : void 0;
  }
  /**
   * Set basename (including extname) (`'index.min.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   *
   * @param {string} basename
   *   Basename.
   * @returns {undefined}
   *   Nothing.
   */
  set basename(basename2) {
    assertNonEmpty(basename2, "basename");
    assertPart(basename2, "basename");
    this.path = minpath.join(this.dirname || "", basename2);
  }
  /**
   * Get the parent path (example: `'~'`).
   *
   * @returns {string | undefined}
   *   Dirname.
   */
  get dirname() {
    return typeof this.path === "string" ? minpath.dirname(this.path) : void 0;
  }
  /**
   * Set the parent path (example: `'~'`).
   *
   * Cannot be set if there’s no `path` yet.
   *
   * @param {string | undefined} dirname
   *   Dirname.
   * @returns {undefined}
   *   Nothing.
   */
  set dirname(dirname2) {
    assertPath(this.basename, "dirname");
    this.path = minpath.join(dirname2 || "", this.basename);
  }
  /**
   * Get the extname (including dot) (example: `'.js'`).
   *
   * @returns {string | undefined}
   *   Extname.
   */
  get extname() {
    return typeof this.path === "string" ? minpath.extname(this.path) : void 0;
  }
  /**
   * Set the extname (including dot) (example: `'.js'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be set if there’s no `path` yet.
   *
   * @param {string | undefined} extname
   *   Extname.
   * @returns {undefined}
   *   Nothing.
   */
  set extname(extname2) {
    assertPart(extname2, "extname");
    assertPath(this.dirname, "extname");
    if (extname2) {
      if (extname2.codePointAt(0) !== 46) {
        throw new Error("`extname` must start with `.`");
      }
      if (extname2.includes(".", 1)) {
        throw new Error("`extname` cannot contain multiple dots");
      }
    }
    this.path = minpath.join(this.dirname, this.stem + (extname2 || ""));
  }
  /**
   * Get the full path (example: `'~/index.min.js'`).
   *
   * @returns {string}
   *   Path.
   */
  get path() {
    return this.history[this.history.length - 1];
  }
  /**
   * Set the full path (example: `'~/index.min.js'`).
   *
   * Cannot be nullified.
   * You can set a file URL (a `URL` object with a `file:` protocol) which will
   * be turned into a path with `url.fileURLToPath`.
   *
   * @param {URL | string} path
   *   Path.
   * @returns {undefined}
   *   Nothing.
   */
  set path(path2) {
    if (isUrl(path2)) {
      path2 = urlToPath(path2);
    }
    assertNonEmpty(path2, "path");
    if (this.path !== path2) {
      this.history.push(path2);
    }
  }
  /**
   * Get the stem (basename w/o extname) (example: `'index.min'`).
   *
   * @returns {string | undefined}
   *   Stem.
   */
  get stem() {
    return typeof this.path === "string" ? minpath.basename(this.path, this.extname) : void 0;
  }
  /**
   * Set the stem (basename w/o extname) (example: `'index.min'`).
   *
   * Cannot contain path separators (`'/'` on unix, macOS, and browsers, `'\'`
   * on windows).
   * Cannot be nullified (use `file.path = file.dirname` instead).
   *
   * @param {string} stem
   *   Stem.
   * @returns {undefined}
   *   Nothing.
   */
  set stem(stem) {
    assertNonEmpty(stem, "stem");
    assertPart(stem, "stem");
    this.path = minpath.join(this.dirname || "", stem + (this.extname || ""));
  }
  // Normal prototypal methods.
  /**
   * Create a fatal message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `true` (error; file not usable)
   * and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {never}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {never}
   *   Never.
   * @throws {VFileMessage}
   *   Message.
   */
  fail(causeOrReason, optionsOrParentOrPlace, origin) {
    const message = this.message(causeOrReason, optionsOrParentOrPlace, origin);
    message.fatal = true;
    throw message;
  }
  /**
   * Create an info message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `undefined` (info; change
   * likely not needed) and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  info(causeOrReason, optionsOrParentOrPlace, origin) {
    const message = this.message(causeOrReason, optionsOrParentOrPlace, origin);
    message.fatal = void 0;
    return message;
  }
  /**
   * Create a message for `reason` associated with the file.
   *
   * The `fatal` field of the message is set to `false` (warning; change may be
   * needed) and the `file` field is set to the current file path.
   * The message is added to the `messages` field on `file`.
   *
   * > 🪦 **Note**: also has obsolete signatures.
   *
   * @overload
   * @param {string} reason
   * @param {MessageOptions | null | undefined} [options]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {string} reason
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Node | NodeLike | null | undefined} parent
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {Point | Position | null | undefined} place
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @overload
   * @param {Error | VFileMessage} cause
   * @param {string | null | undefined} [origin]
   * @returns {VFileMessage}
   *
   * @param {Error | VFileMessage | string} causeOrReason
   *   Reason for message, should use markdown.
   * @param {Node | NodeLike | MessageOptions | Point | Position | string | null | undefined} [optionsOrParentOrPlace]
   *   Configuration (optional).
   * @param {string | null | undefined} [origin]
   *   Place in code where the message originates (example:
   *   `'my-package:my-rule'` or `'my-rule'`).
   * @returns {VFileMessage}
   *   Message.
   */
  message(causeOrReason, optionsOrParentOrPlace, origin) {
    const message = new VFileMessage(
      // @ts-expect-error: the overloads are fine.
      causeOrReason,
      optionsOrParentOrPlace,
      origin
    );
    if (this.path) {
      message.name = this.path + ":" + message.name;
      message.file = this.path;
    }
    message.fatal = false;
    this.messages.push(message);
    return message;
  }
  /**
   * Serialize the file.
   *
   * > **Note**: which encodings are supported depends on the engine.
   * > For info on Node.js, see:
   * > <https://nodejs.org/api/util.html#whatwg-supported-encodings>.
   *
   * @param {string | null | undefined} [encoding='utf8']
   *   Character encoding to understand `value` as when it’s a `Uint8Array`
   *   (default: `'utf-8'`).
   * @returns {string}
   *   Serialized file.
   */
  toString(encoding) {
    if (this.value === void 0) {
      return "";
    }
    if (typeof this.value === "string") {
      return this.value;
    }
    const decoder = new TextDecoder(encoding || void 0);
    return decoder.decode(this.value);
  }
}
function assertPart(part, name2) {
  if (part && part.includes(minpath.sep)) {
    throw new Error(
      "`" + name2 + "` cannot be a path: did not expect `" + minpath.sep + "`"
    );
  }
}
function assertNonEmpty(part, name2) {
  if (!part) {
    throw new Error("`" + name2 + "` cannot be empty");
  }
}
function assertPath(path2, name2) {
  if (!path2) {
    throw new Error("Setting `" + name2 + "` requires `path` to be set too");
  }
}
function isUint8Array$1(value) {
  return Boolean(
    value && typeof value === "object" && "byteLength" in value && "byteOffset" in value
  );
}
const CallableInstance = (
  /**
   * @type {new <Parameters extends Array<unknown>, Result>(property: string | symbol) => (...parameters: Parameters) => Result}
   */
  /** @type {unknown} */
  /**
   * @this {Function}
   * @param {string | symbol} property
   * @returns {(...parameters: Array<unknown>) => unknown}
   */
  (function(property) {
    const self2 = this;
    const constr = self2.constructor;
    const proto = (
      /** @type {Record<string | symbol, Function>} */
      // Prototypes do exist.
      // type-coverage:ignore-next-line
      constr.prototype
    );
    const value = proto[property];
    const apply = function() {
      return value.apply(apply, arguments);
    };
    Object.setPrototypeOf(apply, proto);
    return apply;
  })
);
const own = {}.hasOwnProperty;
class Processor extends CallableInstance {
  /**
   * Create a processor.
   */
  constructor() {
    super("copy");
    this.Compiler = void 0;
    this.Parser = void 0;
    this.attachers = [];
    this.compiler = void 0;
    this.freezeIndex = -1;
    this.frozen = void 0;
    this.namespace = {};
    this.parser = void 0;
    this.transformers = trough();
  }
  /**
   * Copy a processor.
   *
   * @deprecated
   *   This is a private internal method and should not be used.
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   New *unfrozen* processor ({@linkcode Processor}) that is
   *   configured to work the same as its ancestor.
   *   When the descendant processor is configured in the future it does not
   *   affect the ancestral processor.
   */
  copy() {
    const destination = (
      /** @type {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>} */
      new Processor()
    );
    let index2 = -1;
    while (++index2 < this.attachers.length) {
      const attacher = this.attachers[index2];
      destination.use(...attacher);
    }
    destination.data(extend(true, {}, this.namespace));
    return destination;
  }
  /**
   * Configure the processor with info available to all plugins.
   * Information is stored in an object.
   *
   * Typically, options can be given to a specific plugin, but sometimes it
   * makes sense to have information shared with several plugins.
   * For example, a list of HTML elements that are self-closing, which is
   * needed during all phases.
   *
   * > **Note**: setting information cannot occur on *frozen* processors.
   * > Call the processor first to create a new unfrozen processor.
   *
   * > **Note**: to register custom data in TypeScript, augment the
   * > {@linkcode Data} interface.
   *
   * @example
   *   This example show how to get and set info:
   *
   *   ```js
   *   import {unified} from 'unified'
   *
   *   const processor = unified().data('alpha', 'bravo')
   *
   *   processor.data('alpha') // => 'bravo'
   *
   *   processor.data() // => {alpha: 'bravo'}
   *
   *   processor.data({charlie: 'delta'})
   *
   *   processor.data() // => {charlie: 'delta'}
   *   ```
   *
   * @template {keyof Data} Key
   *
   * @overload
   * @returns {Data}
   *
   * @overload
   * @param {Data} dataset
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {Key} key
   * @returns {Data[Key]}
   *
   * @overload
   * @param {Key} key
   * @param {Data[Key]} value
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @param {Data | Key} [key]
   *   Key to get or set, or entire dataset to set, or nothing to get the
   *   entire dataset (optional).
   * @param {Data[Key]} [value]
   *   Value to set (optional).
   * @returns {unknown}
   *   The current processor when setting, the value at `key` when getting, or
   *   the entire dataset when getting without key.
   */
  data(key, value) {
    if (typeof key === "string") {
      if (arguments.length === 2) {
        assertUnfrozen("data", this.frozen);
        this.namespace[key] = value;
        return this;
      }
      return own.call(this.namespace, key) && this.namespace[key] || void 0;
    }
    if (key) {
      assertUnfrozen("data", this.frozen);
      this.namespace = key;
      return this;
    }
    return this.namespace;
  }
  /**
   * Freeze a processor.
   *
   * Frozen processors are meant to be extended and not to be configured
   * directly.
   *
   * When a processor is frozen it cannot be unfrozen.
   * New processors working the same way can be created by calling the
   * processor.
   *
   * It’s possible to freeze processors explicitly by calling `.freeze()`.
   * Processors freeze automatically when `.parse()`, `.run()`, `.runSync()`,
   * `.stringify()`, `.process()`, or `.processSync()` are called.
   *
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   The current processor.
   */
  freeze() {
    if (this.frozen) {
      return this;
    }
    const self2 = (
      /** @type {Processor} */
      /** @type {unknown} */
      this
    );
    while (++this.freezeIndex < this.attachers.length) {
      const [attacher, ...options] = this.attachers[this.freezeIndex];
      if (options[0] === false) {
        continue;
      }
      if (options[0] === true) {
        options[0] = void 0;
      }
      const transformer = attacher.call(self2, ...options);
      if (typeof transformer === "function") {
        this.transformers.use(transformer);
      }
    }
    this.frozen = true;
    this.freezeIndex = Number.POSITIVE_INFINITY;
    return this;
  }
  /**
   * Parse text to a syntax tree.
   *
   * > **Note**: `parse` freezes the processor if not already *frozen*.
   *
   * > **Note**: `parse` performs the parse phase, not the run phase or other
   * > phases.
   *
   * @param {Compatible | undefined} [file]
   *   file to parse (optional); typically `string` or `VFile`; any value
   *   accepted as `x` in `new VFile(x)`.
   * @returns {ParseTree extends undefined ? Node : ParseTree}
   *   Syntax tree representing `file`.
   */
  parse(file) {
    this.freeze();
    const realFile = vfile(file);
    const parser = this.parser || this.Parser;
    assertParser("parse", parser);
    return parser(String(realFile), realFile);
  }
  /**
   * Process the given file as configured on the processor.
   *
   * > **Note**: `process` freezes the processor if not already *frozen*.
   *
   * > **Note**: `process` performs the parse, run, and stringify phases.
   *
   * @overload
   * @param {Compatible | undefined} file
   * @param {ProcessCallback<VFileWithOutput<CompileResult>>} done
   * @returns {undefined}
   *
   * @overload
   * @param {Compatible | undefined} [file]
   * @returns {Promise<VFileWithOutput<CompileResult>>}
   *
   * @param {Compatible | undefined} [file]
   *   File (optional); typically `string` or `VFile`]; any value accepted as
   *   `x` in `new VFile(x)`.
   * @param {ProcessCallback<VFileWithOutput<CompileResult>> | undefined} [done]
   *   Callback (optional).
   * @returns {Promise<VFile> | undefined}
   *   Nothing if `done` is given.
   *   Otherwise a promise, rejected with a fatal error or resolved with the
   *   processed file.
   *
   *   The parsed, transformed, and compiled value is available at
   *   `file.value` (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most
   *   > compilers return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  process(file, done) {
    const self2 = this;
    this.freeze();
    assertParser("process", this.parser || this.Parser);
    assertCompiler("process", this.compiler || this.Compiler);
    return done ? executor(void 0, done) : new Promise(executor);
    function executor(resolve, reject) {
      const realFile = vfile(file);
      const parseTree = (
        /** @type {HeadTree extends undefined ? Node : HeadTree} */
        /** @type {unknown} */
        self2.parse(realFile)
      );
      self2.run(parseTree, realFile, function(error, tree, file2) {
        if (error || !tree || !file2) {
          return realDone(error);
        }
        const compileTree = (
          /** @type {CompileTree extends undefined ? Node : CompileTree} */
          /** @type {unknown} */
          tree
        );
        const compileResult = self2.stringify(compileTree, file2);
        if (looksLikeAValue(compileResult)) {
          file2.value = compileResult;
        } else {
          file2.result = compileResult;
        }
        realDone(
          error,
          /** @type {VFileWithOutput<CompileResult>} */
          file2
        );
      });
      function realDone(error, file2) {
        if (error || !file2) {
          reject(error);
        } else if (resolve) {
          resolve(file2);
        } else {
          done(void 0, file2);
        }
      }
    }
  }
  /**
   * Process the given file as configured on the processor.
   *
   * An error is thrown if asynchronous transforms are configured.
   *
   * > **Note**: `processSync` freezes the processor if not already *frozen*.
   *
   * > **Note**: `processSync` performs the parse, run, and stringify phases.
   *
   * @param {Compatible | undefined} [file]
   *   File (optional); typically `string` or `VFile`; any value accepted as
   *   `x` in `new VFile(x)`.
   * @returns {VFileWithOutput<CompileResult>}
   *   The processed file.
   *
   *   The parsed, transformed, and compiled value is available at
   *   `file.value` (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most
   *   > compilers return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  processSync(file) {
    let complete = false;
    let result;
    this.freeze();
    assertParser("processSync", this.parser || this.Parser);
    assertCompiler("processSync", this.compiler || this.Compiler);
    this.process(file, realDone);
    assertDone("processSync", "process", complete);
    return result;
    function realDone(error, file2) {
      complete = true;
      bail(error);
      result = file2;
    }
  }
  /**
   * Run *transformers* on a syntax tree.
   *
   * > **Note**: `run` freezes the processor if not already *frozen*.
   *
   * > **Note**: `run` performs the run phase, not other phases.
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
   * @returns {undefined}
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {Compatible | undefined} file
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
   * @returns {undefined}
   *
   * @overload
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   * @param {Compatible | undefined} [file]
   * @returns {Promise<TailTree extends undefined ? Node : TailTree>}
   *
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   *   Tree to transform and inspect.
   * @param {(
   *   RunCallback<TailTree extends undefined ? Node : TailTree> |
   *   Compatible
   * )} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @param {RunCallback<TailTree extends undefined ? Node : TailTree>} [done]
   *   Callback (optional).
   * @returns {Promise<TailTree extends undefined ? Node : TailTree> | undefined}
   *   Nothing if `done` is given.
   *   Otherwise, a promise rejected with a fatal error or resolved with the
   *   transformed tree.
   */
  run(tree, file, done) {
    assertNode(tree);
    this.freeze();
    const transformers = this.transformers;
    if (!done && typeof file === "function") {
      done = file;
      file = void 0;
    }
    return done ? executor(void 0, done) : new Promise(executor);
    function executor(resolve, reject) {
      const realFile = vfile(file);
      transformers.run(tree, realFile, realDone);
      function realDone(error, outputTree, file2) {
        const resultingTree = (
          /** @type {TailTree extends undefined ? Node : TailTree} */
          outputTree || tree
        );
        if (error) {
          reject(error);
        } else if (resolve) {
          resolve(resultingTree);
        } else {
          done(void 0, resultingTree, file2);
        }
      }
    }
  }
  /**
   * Run *transformers* on a syntax tree.
   *
   * An error is thrown if asynchronous transforms are configured.
   *
   * > **Note**: `runSync` freezes the processor if not already *frozen*.
   *
   * > **Note**: `runSync` performs the run phase, not other phases.
   *
   * @param {HeadTree extends undefined ? Node : HeadTree} tree
   *   Tree to transform and inspect.
   * @param {Compatible | undefined} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @returns {TailTree extends undefined ? Node : TailTree}
   *   Transformed tree.
   */
  runSync(tree, file) {
    let complete = false;
    let result;
    this.run(tree, file, realDone);
    assertDone("runSync", "run", complete);
    return result;
    function realDone(error, tree2) {
      bail(error);
      result = tree2;
      complete = true;
    }
  }
  /**
   * Compile a syntax tree.
   *
   * > **Note**: `stringify` freezes the processor if not already *frozen*.
   *
   * > **Note**: `stringify` performs the stringify phase, not the run phase
   * > or other phases.
   *
   * @param {CompileTree extends undefined ? Node : CompileTree} tree
   *   Tree to compile.
   * @param {Compatible | undefined} [file]
   *   File associated with `node` (optional); any value accepted as `x` in
   *   `new VFile(x)`.
   * @returns {CompileResult extends undefined ? Value : CompileResult}
   *   Textual representation of the tree (see note).
   *
   *   > **Note**: unified typically compiles by serializing: most compilers
   *   > return `string` (or `Uint8Array`).
   *   > Some compilers, such as the one configured with
   *   > [`rehype-react`][rehype-react], return other values (in this case, a
   *   > React tree).
   *   > If you’re using a compiler that doesn’t serialize, expect different
   *   > result values.
   *   >
   *   > To register custom results in TypeScript, add them to
   *   > {@linkcode CompileResultMap}.
   *
   *   [rehype-react]: https://github.com/rehypejs/rehype-react
   */
  stringify(tree, file) {
    this.freeze();
    const realFile = vfile(file);
    const compiler2 = this.compiler || this.Compiler;
    assertCompiler("stringify", compiler2);
    assertNode(tree);
    return compiler2(tree, realFile);
  }
  /**
   * Configure the processor to use a plugin, a list of usable values, or a
   * preset.
   *
   * If the processor is already using a plugin, the previous plugin
   * configuration is changed based on the options that are passed in.
   * In other words, the plugin is not added a second time.
   *
   * > **Note**: `use` cannot be called on *frozen* processors.
   * > Call the processor first to create a new unfrozen processor.
   *
   * @example
   *   There are many ways to pass plugins to `.use()`.
   *   This example gives an overview:
   *
   *   ```js
   *   import {unified} from 'unified'
   *
   *   unified()
   *     // Plugin with options:
   *     .use(pluginA, {x: true, y: true})
   *     // Passing the same plugin again merges configuration (to `{x: true, y: false, z: true}`):
   *     .use(pluginA, {y: false, z: true})
   *     // Plugins:
   *     .use([pluginB, pluginC])
   *     // Two plugins, the second with options:
   *     .use([pluginD, [pluginE, {}]])
   *     // Preset with plugins and settings:
   *     .use({plugins: [pluginF, [pluginG, {}]], settings: {position: false}})
   *     // Settings only:
   *     .use({settings: {position: false}})
   *   ```
   *
   * @template {Array<unknown>} [Parameters=[]]
   * @template {Node | string | undefined} [Input=undefined]
   * @template [Output=Input]
   *
   * @overload
   * @param {Preset | null | undefined} [preset]
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {PluggableList} list
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *
   * @overload
   * @param {Plugin<Parameters, Input, Output>} plugin
   * @param {...(Parameters | [boolean])} parameters
   * @returns {UsePlugin<ParseTree, HeadTree, TailTree, CompileTree, CompileResult, Input, Output>}
   *
   * @param {PluggableList | Plugin | Preset | null | undefined} value
   *   Usable value.
   * @param {...unknown} parameters
   *   Parameters, when a plugin is given as a usable value.
   * @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
   *   Current processor.
   */
  use(value, ...parameters) {
    const attachers = this.attachers;
    const namespace = this.namespace;
    assertUnfrozen("use", this.frozen);
    if (value === null || value === void 0) ;
    else if (typeof value === "function") {
      addPlugin(value, parameters);
    } else if (typeof value === "object") {
      if (Array.isArray(value)) {
        addList(value);
      } else {
        addPreset(value);
      }
    } else {
      throw new TypeError("Expected usable value, not `" + value + "`");
    }
    return this;
    function add(value2) {
      if (typeof value2 === "function") {
        addPlugin(value2, []);
      } else if (typeof value2 === "object") {
        if (Array.isArray(value2)) {
          const [plugin, ...parameters2] = (
            /** @type {PluginTuple<Array<unknown>>} */
            value2
          );
          addPlugin(plugin, parameters2);
        } else {
          addPreset(value2);
        }
      } else {
        throw new TypeError("Expected usable value, not `" + value2 + "`");
      }
    }
    function addPreset(result) {
      if (!("plugins" in result) && !("settings" in result)) {
        throw new Error(
          "Expected usable value but received an empty preset, which is probably a mistake: presets typically come with `plugins` and sometimes with `settings`, but this has neither"
        );
      }
      addList(result.plugins);
      if (result.settings) {
        namespace.settings = extend(true, namespace.settings, result.settings);
      }
    }
    function addList(plugins) {
      let index2 = -1;
      if (plugins === null || plugins === void 0) ;
      else if (Array.isArray(plugins)) {
        while (++index2 < plugins.length) {
          const thing = plugins[index2];
          add(thing);
        }
      } else {
        throw new TypeError("Expected a list of plugins, not `" + plugins + "`");
      }
    }
    function addPlugin(plugin, parameters2) {
      let index2 = -1;
      let entryIndex = -1;
      while (++index2 < attachers.length) {
        if (attachers[index2][0] === plugin) {
          entryIndex = index2;
          break;
        }
      }
      if (entryIndex === -1) {
        attachers.push([plugin, ...parameters2]);
      } else if (parameters2.length > 0) {
        let [primary, ...rest] = parameters2;
        const currentPrimary = attachers[entryIndex][1];
        if (isPlainObject(currentPrimary) && isPlainObject(primary)) {
          primary = extend(true, currentPrimary, primary);
        }
        attachers[entryIndex] = [plugin, primary, ...rest];
      }
    }
  }
}
const unified = new Processor().freeze();
function assertParser(name2, value) {
  if (typeof value !== "function") {
    throw new TypeError("Cannot `" + name2 + "` without `parser`");
  }
}
function assertCompiler(name2, value) {
  if (typeof value !== "function") {
    throw new TypeError("Cannot `" + name2 + "` without `compiler`");
  }
}
function assertUnfrozen(name2, frozen) {
  if (frozen) {
    throw new Error(
      "Cannot call `" + name2 + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`."
    );
  }
}
function assertNode(node2) {
  if (!isPlainObject(node2) || typeof node2.type !== "string") {
    throw new TypeError("Expected node, got `" + node2 + "`");
  }
}
function assertDone(name2, asyncName, complete) {
  if (!complete) {
    throw new Error(
      "`" + name2 + "` finished async. Use `" + asyncName + "` instead"
    );
  }
}
function vfile(value) {
  return looksLikeAVFile(value) ? value : new VFile(value);
}
function looksLikeAVFile(value) {
  return Boolean(
    value && typeof value === "object" && "message" in value && "messages" in value
  );
}
function looksLikeAValue(value) {
  return typeof value === "string" || isUint8Array(value);
}
function isUint8Array(value) {
  return Boolean(
    value && typeof value === "object" && "byteLength" in value && "byteOffset" in value
  );
}
const changelog = "https://github.com/remarkjs/react-markdown/blob/main/changelog.md";
const emptyPlugins = [];
const emptyRemarkRehypeOptions = { allowDangerousHtml: true };
const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;
const deprecations = [
  { from: "astPlugins", id: "remove-buggy-html-in-markdown-parser" },
  { from: "allowDangerousHtml", id: "remove-buggy-html-in-markdown-parser" },
  {
    from: "allowNode",
    id: "replace-allownode-allowedtypes-and-disallowedtypes",
    to: "allowElement"
  },
  {
    from: "allowedTypes",
    id: "replace-allownode-allowedtypes-and-disallowedtypes",
    to: "allowedElements"
  },
  { from: "className", id: "remove-classname" },
  {
    from: "disallowedTypes",
    id: "replace-allownode-allowedtypes-and-disallowedtypes",
    to: "disallowedElements"
  },
  { from: "escapeHtml", id: "remove-buggy-html-in-markdown-parser" },
  { from: "includeElementIndex", id: "#remove-includeelementindex" },
  {
    from: "includeNodeIndex",
    id: "change-includenodeindex-to-includeelementindex"
  },
  { from: "linkTarget", id: "remove-linktarget" },
  { from: "plugins", id: "change-plugins-to-remarkplugins", to: "remarkPlugins" },
  { from: "rawSourcePos", id: "#remove-rawsourcepos" },
  { from: "renderers", id: "change-renderers-to-components", to: "components" },
  { from: "source", id: "change-source-to-children", to: "children" },
  { from: "sourcePos", id: "#remove-sourcepos" },
  { from: "transformImageUri", id: "#add-urltransform", to: "urlTransform" },
  { from: "transformLinkUri", id: "#add-urltransform", to: "urlTransform" }
];
function Markdown(options) {
  const processor = createProcessor(options);
  const file = createFile(options);
  return post(processor.runSync(processor.parse(file), file), options);
}
function createProcessor(options) {
  const rehypePlugins = options.rehypePlugins || emptyPlugins;
  const remarkPlugins = options.remarkPlugins || emptyPlugins;
  const remarkRehypeOptions = options.remarkRehypeOptions ? { ...options.remarkRehypeOptions, ...emptyRemarkRehypeOptions } : emptyRemarkRehypeOptions;
  const processor = unified().use(remarkParse).use(remarkPlugins).use(remarkRehype, remarkRehypeOptions).use(rehypePlugins);
  return processor;
}
function createFile(options) {
  const children = options.children || "";
  const file = new VFile();
  if (typeof children === "string") {
    file.value = children;
  }
  return file;
}
function post(tree, options) {
  const allowedElements = options.allowedElements;
  const allowElement = options.allowElement;
  const components = options.components;
  const disallowedElements = options.disallowedElements;
  const skipHtml = options.skipHtml;
  const unwrapDisallowed = options.unwrapDisallowed;
  const urlTransform = options.urlTransform || defaultUrlTransform;
  for (const deprecation of deprecations) {
    if (Object.hasOwn(options, deprecation.from)) {
      unreachable(
        "Unexpected `" + deprecation.from + "` prop, " + (deprecation.to ? "use `" + deprecation.to + "` instead" : "remove it") + " (see <" + changelog + "#" + deprecation.id + "> for more info)"
      );
    }
  }
  visit(tree, transform);
  return toJsxRuntime(tree, {
    Fragment: jsxRuntimeExports.Fragment,
    components,
    ignoreInvalidStyle: true,
    jsx: jsxRuntimeExports.jsx,
    jsxs: jsxRuntimeExports.jsxs,
    passKeys: true,
    passNode: true
  });
  function transform(node2, index2, parent) {
    if (node2.type === "raw" && parent && typeof index2 === "number") {
      if (skipHtml) {
        parent.children.splice(index2, 1);
      } else {
        parent.children[index2] = { type: "text", value: node2.value };
      }
      return index2;
    }
    if (node2.type === "element") {
      let key;
      for (key in urlAttributes) {
        if (Object.hasOwn(urlAttributes, key) && Object.hasOwn(node2.properties, key)) {
          const value = node2.properties[key];
          const test = urlAttributes[key];
          if (test === null || test.includes(node2.tagName)) {
            node2.properties[key] = urlTransform(String(value || ""), key, node2);
          }
        }
      }
    }
    if (node2.type === "element") {
      let remove = allowedElements ? !allowedElements.includes(node2.tagName) : disallowedElements ? disallowedElements.includes(node2.tagName) : false;
      if (!remove && allowElement && typeof index2 === "number") {
        remove = !allowElement(node2, index2, parent);
      }
      if (remove && parent && typeof index2 === "number") {
        if (unwrapDisallowed && node2.children) {
          parent.children.splice(index2, 1, ...node2.children);
        } else {
          parent.children.splice(index2, 1);
        }
        return index2;
      }
    }
  }
}
function defaultUrlTransform(value) {
  const colon = value.indexOf(":");
  const questionMark = value.indexOf("?");
  const numberSign = value.indexOf("#");
  const slash = value.indexOf("/");
  if (
    // If there is no protocol, it’s relative.
    colon === -1 || // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
    slash !== -1 && colon > slash || questionMark !== -1 && colon > questionMark || numberSign !== -1 && colon > numberSign || // It is a protocol, it should be allowed.
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value;
  }
  return "";
}
function ccount(value, character) {
  const source = String(value);
  if (typeof character !== "string") {
    throw new TypeError("Expected character");
  }
  let count = 0;
  let index2 = source.indexOf(character);
  while (index2 !== -1) {
    count++;
    index2 = source.indexOf(character, index2 + character.length);
  }
  return count;
}
function escapeStringRegexp(string2) {
  if (typeof string2 !== "string") {
    throw new TypeError("Expected a string");
  }
  return string2.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
function findAndReplace(tree, list2, options) {
  const settings = options || {};
  const ignored = convert(settings.ignore || []);
  const pairs = toPairs(list2);
  let pairIndex = -1;
  while (++pairIndex < pairs.length) {
    visitParents(tree, "text", visitor);
  }
  function visitor(node2, parents) {
    let index2 = -1;
    let grandparent;
    while (++index2 < parents.length) {
      const parent = parents[index2];
      const siblings = grandparent ? grandparent.children : void 0;
      if (ignored(
        parent,
        siblings ? siblings.indexOf(parent) : void 0,
        grandparent
      )) {
        return;
      }
      grandparent = parent;
    }
    if (grandparent) {
      return handler(node2, parents);
    }
  }
  function handler(node2, parents) {
    const parent = parents[parents.length - 1];
    const find2 = pairs[pairIndex][0];
    const replace2 = pairs[pairIndex][1];
    let start = 0;
    const siblings = parent.children;
    const index2 = siblings.indexOf(node2);
    let change = false;
    let nodes = [];
    find2.lastIndex = 0;
    let match = find2.exec(node2.value);
    while (match) {
      const position2 = match.index;
      const matchObject = {
        index: match.index,
        input: match.input,
        stack: [...parents, node2]
      };
      let value = replace2(...match, matchObject);
      if (typeof value === "string") {
        value = value.length > 0 ? { type: "text", value } : void 0;
      }
      if (value === false) {
        find2.lastIndex = position2 + 1;
      } else {
        if (start !== position2) {
          nodes.push({
            type: "text",
            value: node2.value.slice(start, position2)
          });
        }
        if (Array.isArray(value)) {
          nodes.push(...value);
        } else if (value) {
          nodes.push(value);
        }
        start = position2 + match[0].length;
        change = true;
      }
      if (!find2.global) {
        break;
      }
      match = find2.exec(node2.value);
    }
    if (change) {
      if (start < node2.value.length) {
        nodes.push({ type: "text", value: node2.value.slice(start) });
      }
      parent.children.splice(index2, 1, ...nodes);
    } else {
      nodes = [node2];
    }
    return index2 + nodes.length;
  }
}
function toPairs(tupleOrList) {
  const result = [];
  if (!Array.isArray(tupleOrList)) {
    throw new TypeError("Expected find and replace tuple or list of tuples");
  }
  const list2 = !tupleOrList[0] || Array.isArray(tupleOrList[0]) ? tupleOrList : [tupleOrList];
  let index2 = -1;
  while (++index2 < list2.length) {
    const tuple = list2[index2];
    result.push([toExpression(tuple[0]), toFunction(tuple[1])]);
  }
  return result;
}
function toExpression(find2) {
  return typeof find2 === "string" ? new RegExp(escapeStringRegexp(find2), "g") : find2;
}
function toFunction(replace2) {
  return typeof replace2 === "function" ? replace2 : function() {
    return replace2;
  };
}
const inConstruct = "phrasing";
const notInConstruct = ["autolink", "link", "image", "label"];
function gfmAutolinkLiteralFromMarkdown() {
  return {
    transforms: [transformGfmAutolinkLiterals],
    enter: {
      literalAutolink: enterLiteralAutolink,
      literalAutolinkEmail: enterLiteralAutolinkValue,
      literalAutolinkHttp: enterLiteralAutolinkValue,
      literalAutolinkWww: enterLiteralAutolinkValue
    },
    exit: {
      literalAutolink: exitLiteralAutolink,
      literalAutolinkEmail: exitLiteralAutolinkEmail,
      literalAutolinkHttp: exitLiteralAutolinkHttp,
      literalAutolinkWww: exitLiteralAutolinkWww
    }
  };
}
function gfmAutolinkLiteralToMarkdown() {
  return {
    unsafe: [
      {
        character: "@",
        before: "[+\\-.\\w]",
        after: "[\\-.\\w]",
        inConstruct,
        notInConstruct
      },
      {
        character: ".",
        before: "[Ww]",
        after: "[\\-.\\w]",
        inConstruct,
        notInConstruct
      },
      {
        character: ":",
        before: "[ps]",
        after: "\\/",
        inConstruct,
        notInConstruct
      }
    ]
  };
}
function enterLiteralAutolink(token) {
  this.enter({ type: "link", title: null, url: "", children: [] }, token);
}
function enterLiteralAutolinkValue(token) {
  this.config.enter.autolinkProtocol.call(this, token);
}
function exitLiteralAutolinkHttp(token) {
  this.config.exit.autolinkProtocol.call(this, token);
}
function exitLiteralAutolinkWww(token) {
  this.config.exit.data.call(this, token);
  const node2 = this.stack[this.stack.length - 1];
  ok$1(node2.type === "link");
  node2.url = "http://" + this.sliceSerialize(token);
}
function exitLiteralAutolinkEmail(token) {
  this.config.exit.autolinkEmail.call(this, token);
}
function exitLiteralAutolink(token) {
  this.exit(token);
}
function transformGfmAutolinkLiterals(tree) {
  findAndReplace(
    tree,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, findUrl],
      [/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu, findEmail]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function findUrl(_, protocol, domain2, path2, match) {
  let prefix = "";
  if (!previous(match)) {
    return false;
  }
  if (/^w/i.test(protocol)) {
    domain2 = protocol + domain2;
    protocol = "";
    prefix = "http://";
  }
  if (!isCorrectDomain(domain2)) {
    return false;
  }
  const parts = splitUrl(domain2 + path2);
  if (!parts[0]) return false;
  const result = {
    type: "link",
    title: null,
    url: prefix + protocol + parts[0],
    children: [{ type: "text", value: protocol + parts[0] }]
  };
  if (parts[1]) {
    return [result, { type: "text", value: parts[1] }];
  }
  return result;
}
function findEmail(_, atext, label, match) {
  if (
    // Not an expected previous character.
    !previous(match, true) || // Label ends in not allowed character.
    /[-\d_]$/.test(label)
  ) {
    return false;
  }
  return {
    type: "link",
    title: null,
    url: "mailto:" + atext + "@" + label,
    children: [{ type: "text", value: atext + "@" + label }]
  };
}
function isCorrectDomain(domain2) {
  const parts = domain2.split(".");
  if (parts.length < 2 || parts[parts.length - 1] && (/_/.test(parts[parts.length - 1]) || !/[a-zA-Z\d]/.test(parts[parts.length - 1])) || parts[parts.length - 2] && (/_/.test(parts[parts.length - 2]) || !/[a-zA-Z\d]/.test(parts[parts.length - 2]))) {
    return false;
  }
  return true;
}
function splitUrl(url) {
  const trailExec = /[!"&'),.:;<>?\]}]+$/.exec(url);
  if (!trailExec) {
    return [url, void 0];
  }
  url = url.slice(0, trailExec.index);
  let trail2 = trailExec[0];
  let closingParenIndex = trail2.indexOf(")");
  const openingParens = ccount(url, "(");
  let closingParens = ccount(url, ")");
  while (closingParenIndex !== -1 && openingParens > closingParens) {
    url += trail2.slice(0, closingParenIndex + 1);
    trail2 = trail2.slice(closingParenIndex + 1);
    closingParenIndex = trail2.indexOf(")");
    closingParens++;
  }
  return [url, trail2];
}
function previous(match, email) {
  const code2 = match.input.charCodeAt(match.index - 1);
  return (match.index === 0 || unicodeWhitespace(code2) || unicodePunctuation(code2)) && // If it’s an email, the previous character should not be a slash.
  (!email || code2 !== 47);
}
footnoteReference.peek = footnoteReferencePeek;
function enterFootnoteCallString() {
  this.buffer();
}
function enterFootnoteCall(token) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, token);
}
function enterFootnoteDefinitionLabelString() {
  this.buffer();
}
function enterFootnoteDefinition(token) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    token
  );
}
function exitFootnoteCallString(token) {
  const label = this.resume();
  const node2 = this.stack[this.stack.length - 1];
  ok$1(node2.type === "footnoteReference");
  node2.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
  node2.label = label;
}
function exitFootnoteCall(token) {
  this.exit(token);
}
function exitFootnoteDefinitionLabelString(token) {
  const label = this.resume();
  const node2 = this.stack[this.stack.length - 1];
  ok$1(node2.type === "footnoteDefinition");
  node2.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
  node2.label = label;
}
function exitFootnoteDefinition(token) {
  this.exit(token);
}
function footnoteReferencePeek() {
  return "[";
}
function footnoteReference(node2, _, state2, info) {
  const tracker = state2.createTracker(info);
  let value = tracker.move("[^");
  const exit2 = state2.enter("footnoteReference");
  const subexit = state2.enter("reference");
  value += tracker.move(
    state2.safe(state2.associationId(node2), { after: "]", before: value })
  );
  subexit();
  exit2();
  value += tracker.move("]");
  return value;
}
function gfmFootnoteFromMarkdown() {
  return {
    enter: {
      gfmFootnoteCallString: enterFootnoteCallString,
      gfmFootnoteCall: enterFootnoteCall,
      gfmFootnoteDefinitionLabelString: enterFootnoteDefinitionLabelString,
      gfmFootnoteDefinition: enterFootnoteDefinition
    },
    exit: {
      gfmFootnoteCallString: exitFootnoteCallString,
      gfmFootnoteCall: exitFootnoteCall,
      gfmFootnoteDefinitionLabelString: exitFootnoteDefinitionLabelString,
      gfmFootnoteDefinition: exitFootnoteDefinition
    }
  };
}
function gfmFootnoteToMarkdown(options) {
  let firstLineBlank = false;
  if (options && options.firstLineBlank) {
    firstLineBlank = true;
  }
  return {
    handlers: { footnoteDefinition, footnoteReference },
    // This is on by default already.
    unsafe: [{ character: "[", inConstruct: ["label", "phrasing", "reference"] }]
  };
  function footnoteDefinition(node2, _, state2, info) {
    const tracker = state2.createTracker(info);
    let value = tracker.move("[^");
    const exit2 = state2.enter("footnoteDefinition");
    const subexit = state2.enter("label");
    value += tracker.move(
      state2.safe(state2.associationId(node2), { before: value, after: "]" })
    );
    subexit();
    value += tracker.move("]:");
    if (node2.children && node2.children.length > 0) {
      tracker.shift(4);
      value += tracker.move(
        (firstLineBlank ? "\n" : " ") + state2.indentLines(
          state2.containerFlow(node2, tracker.current()),
          firstLineBlank ? mapAll : mapExceptFirst
        )
      );
    }
    exit2();
    return value;
  }
}
function mapExceptFirst(line, index2, blank) {
  return index2 === 0 ? line : mapAll(line, index2, blank);
}
function mapAll(line, index2, blank) {
  return (blank ? "" : "    ") + line;
}
const constructsWithoutStrikethrough = [
  "autolink",
  "destinationLiteral",
  "destinationRaw",
  "reference",
  "titleQuote",
  "titleApostrophe"
];
handleDelete.peek = peekDelete;
function gfmStrikethroughFromMarkdown() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: enterStrikethrough },
    exit: { strikethrough: exitStrikethrough }
  };
}
function gfmStrikethroughToMarkdown() {
  return {
    unsafe: [
      {
        character: "~",
        inConstruct: "phrasing",
        notInConstruct: constructsWithoutStrikethrough
      }
    ],
    handlers: { delete: handleDelete }
  };
}
function enterStrikethrough(token) {
  this.enter({ type: "delete", children: [] }, token);
}
function exitStrikethrough(token) {
  this.exit(token);
}
function handleDelete(node2, _, state2, info) {
  const tracker = state2.createTracker(info);
  const exit2 = state2.enter("strikethrough");
  let value = tracker.move("~~");
  value += state2.containerPhrasing(node2, {
    ...tracker.current(),
    before: value,
    after: "~"
  });
  value += tracker.move("~~");
  exit2();
  return value;
}
function peekDelete() {
  return "~";
}
function defaultStringLength(value) {
  return value.length;
}
function markdownTable(table2, options) {
  const settings = options || {};
  const align = (settings.align || []).concat();
  const stringLength = settings.stringLength || defaultStringLength;
  const alignments = [];
  const cellMatrix = [];
  const sizeMatrix = [];
  const longestCellByColumn = [];
  let mostCellsPerRow = 0;
  let rowIndex = -1;
  while (++rowIndex < table2.length) {
    const row2 = [];
    const sizes2 = [];
    let columnIndex2 = -1;
    if (table2[rowIndex].length > mostCellsPerRow) {
      mostCellsPerRow = table2[rowIndex].length;
    }
    while (++columnIndex2 < table2[rowIndex].length) {
      const cell = serialize(table2[rowIndex][columnIndex2]);
      if (settings.alignDelimiters !== false) {
        const size = stringLength(cell);
        sizes2[columnIndex2] = size;
        if (longestCellByColumn[columnIndex2] === void 0 || size > longestCellByColumn[columnIndex2]) {
          longestCellByColumn[columnIndex2] = size;
        }
      }
      row2.push(cell);
    }
    cellMatrix[rowIndex] = row2;
    sizeMatrix[rowIndex] = sizes2;
  }
  let columnIndex = -1;
  if (typeof align === "object" && "length" in align) {
    while (++columnIndex < mostCellsPerRow) {
      alignments[columnIndex] = toAlignment(align[columnIndex]);
    }
  } else {
    const code2 = toAlignment(align);
    while (++columnIndex < mostCellsPerRow) {
      alignments[columnIndex] = code2;
    }
  }
  columnIndex = -1;
  const row = [];
  const sizes = [];
  while (++columnIndex < mostCellsPerRow) {
    const code2 = alignments[columnIndex];
    let before = "";
    let after = "";
    if (code2 === 99) {
      before = ":";
      after = ":";
    } else if (code2 === 108) {
      before = ":";
    } else if (code2 === 114) {
      after = ":";
    }
    let size = settings.alignDelimiters === false ? 1 : Math.max(
      1,
      longestCellByColumn[columnIndex] - before.length - after.length
    );
    const cell = before + "-".repeat(size) + after;
    if (settings.alignDelimiters !== false) {
      size = before.length + size + after.length;
      if (size > longestCellByColumn[columnIndex]) {
        longestCellByColumn[columnIndex] = size;
      }
      sizes[columnIndex] = size;
    }
    row[columnIndex] = cell;
  }
  cellMatrix.splice(1, 0, row);
  sizeMatrix.splice(1, 0, sizes);
  rowIndex = -1;
  const lines = [];
  while (++rowIndex < cellMatrix.length) {
    const row2 = cellMatrix[rowIndex];
    const sizes2 = sizeMatrix[rowIndex];
    columnIndex = -1;
    const line = [];
    while (++columnIndex < mostCellsPerRow) {
      const cell = row2[columnIndex] || "";
      let before = "";
      let after = "";
      if (settings.alignDelimiters !== false) {
        const size = longestCellByColumn[columnIndex] - (sizes2[columnIndex] || 0);
        const code2 = alignments[columnIndex];
        if (code2 === 114) {
          before = " ".repeat(size);
        } else if (code2 === 99) {
          if (size % 2) {
            before = " ".repeat(size / 2 + 0.5);
            after = " ".repeat(size / 2 - 0.5);
          } else {
            before = " ".repeat(size / 2);
            after = before;
          }
        } else {
          after = " ".repeat(size);
        }
      }
      if (settings.delimiterStart !== false && !columnIndex) {
        line.push("|");
      }
      if (settings.padding !== false && // Don’t add the opening space if we’re not aligning and the cell is
      // empty: there will be a closing space.
      !(settings.alignDelimiters === false && cell === "") && (settings.delimiterStart !== false || columnIndex)) {
        line.push(" ");
      }
      if (settings.alignDelimiters !== false) {
        line.push(before);
      }
      line.push(cell);
      if (settings.alignDelimiters !== false) {
        line.push(after);
      }
      if (settings.padding !== false) {
        line.push(" ");
      }
      if (settings.delimiterEnd !== false || columnIndex !== mostCellsPerRow - 1) {
        line.push("|");
      }
    }
    lines.push(
      settings.delimiterEnd === false ? line.join("").replace(/ +$/, "") : line.join("")
    );
  }
  return lines.join("\n");
}
function serialize(value) {
  return value === null || value === void 0 ? "" : String(value);
}
function toAlignment(value) {
  const code2 = typeof value === "string" ? value.codePointAt(0) : 0;
  return code2 === 67 || code2 === 99 ? 99 : code2 === 76 || code2 === 108 ? 108 : code2 === 82 || code2 === 114 ? 114 : 0;
}
function blockquote(node2, _, state2, info) {
  const exit2 = state2.enter("blockquote");
  const tracker = state2.createTracker(info);
  tracker.move("> ");
  tracker.shift(2);
  const value = state2.indentLines(
    state2.containerFlow(node2, tracker.current()),
    map$1
  );
  exit2();
  return value;
}
function map$1(line, _, blank) {
  return ">" + (blank ? "" : " ") + line;
}
function patternInScope(stack, pattern) {
  return listInScope(stack, pattern.inConstruct, true) && !listInScope(stack, pattern.notInConstruct, false);
}
function listInScope(stack, list2, none) {
  if (typeof list2 === "string") {
    list2 = [list2];
  }
  if (!list2 || list2.length === 0) {
    return none;
  }
  let index2 = -1;
  while (++index2 < list2.length) {
    if (stack.includes(list2[index2])) {
      return true;
    }
  }
  return false;
}
function hardBreak(_, _1, state2, info) {
  let index2 = -1;
  while (++index2 < state2.unsafe.length) {
    if (state2.unsafe[index2].character === "\n" && patternInScope(state2.stack, state2.unsafe[index2])) {
      return /[ \t]/.test(info.before) ? "" : " ";
    }
  }
  return "\\\n";
}
function longestStreak(value, substring) {
  const source = String(value);
  let index2 = source.indexOf(substring);
  let expected = index2;
  let count = 0;
  let max = 0;
  if (typeof substring !== "string") {
    throw new TypeError("Expected substring");
  }
  while (index2 !== -1) {
    if (index2 === expected) {
      if (++count > max) {
        max = count;
      }
    } else {
      count = 1;
    }
    expected = index2 + substring.length;
    index2 = source.indexOf(substring, expected);
  }
  return max;
}
function formatCodeAsIndented(node2, state2) {
  return Boolean(
    state2.options.fences === false && node2.value && // If there’s no info…
    !node2.lang && // And there’s a non-whitespace character…
    /[^ \r\n]/.test(node2.value) && // And the value doesn’t start or end in a blank…
    !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(node2.value)
  );
}
function checkFence(state2) {
  const marker = state2.options.fence || "`";
  if (marker !== "`" && marker !== "~") {
    throw new Error(
      "Cannot serialize code with `" + marker + "` for `options.fence`, expected `` ` `` or `~`"
    );
  }
  return marker;
}
function code$1(node2, _, state2, info) {
  const marker = checkFence(state2);
  const raw = node2.value || "";
  const suffix = marker === "`" ? "GraveAccent" : "Tilde";
  if (formatCodeAsIndented(node2, state2)) {
    const exit3 = state2.enter("codeIndented");
    const value2 = state2.indentLines(raw, map);
    exit3();
    return value2;
  }
  const tracker = state2.createTracker(info);
  const sequence = marker.repeat(Math.max(longestStreak(raw, marker) + 1, 3));
  const exit2 = state2.enter("codeFenced");
  let value = tracker.move(sequence);
  if (node2.lang) {
    const subexit = state2.enter(`codeFencedLang${suffix}`);
    value += tracker.move(
      state2.safe(node2.lang, {
        before: value,
        after: " ",
        encode: ["`"],
        ...tracker.current()
      })
    );
    subexit();
  }
  if (node2.lang && node2.meta) {
    const subexit = state2.enter(`codeFencedMeta${suffix}`);
    value += tracker.move(" ");
    value += tracker.move(
      state2.safe(node2.meta, {
        before: value,
        after: "\n",
        encode: ["`"],
        ...tracker.current()
      })
    );
    subexit();
  }
  value += tracker.move("\n");
  if (raw) {
    value += tracker.move(raw + "\n");
  }
  value += tracker.move(sequence);
  exit2();
  return value;
}
function map(line, _, blank) {
  return (blank ? "" : "    ") + line;
}
function checkQuote(state2) {
  const marker = state2.options.quote || '"';
  if (marker !== '"' && marker !== "'") {
    throw new Error(
      "Cannot serialize title with `" + marker + "` for `options.quote`, expected `\"`, or `'`"
    );
  }
  return marker;
}
function definition(node2, _, state2, info) {
  const quote = checkQuote(state2);
  const suffix = quote === '"' ? "Quote" : "Apostrophe";
  const exit2 = state2.enter("definition");
  let subexit = state2.enter("label");
  const tracker = state2.createTracker(info);
  let value = tracker.move("[");
  value += tracker.move(
    state2.safe(state2.associationId(node2), {
      before: value,
      after: "]",
      ...tracker.current()
    })
  );
  value += tracker.move("]: ");
  subexit();
  if (
    // If there’s no url, or…
    !node2.url || // If there are control characters or whitespace.
    /[\0- \u007F]/.test(node2.url)
  ) {
    subexit = state2.enter("destinationLiteral");
    value += tracker.move("<");
    value += tracker.move(
      state2.safe(node2.url, { before: value, after: ">", ...tracker.current() })
    );
    value += tracker.move(">");
  } else {
    subexit = state2.enter("destinationRaw");
    value += tracker.move(
      state2.safe(node2.url, {
        before: value,
        after: node2.title ? " " : "\n",
        ...tracker.current()
      })
    );
  }
  subexit();
  if (node2.title) {
    subexit = state2.enter(`title${suffix}`);
    value += tracker.move(" " + quote);
    value += tracker.move(
      state2.safe(node2.title, {
        before: value,
        after: quote,
        ...tracker.current()
      })
    );
    value += tracker.move(quote);
    subexit();
  }
  exit2();
  return value;
}
function checkEmphasis(state2) {
  const marker = state2.options.emphasis || "*";
  if (marker !== "*" && marker !== "_") {
    throw new Error(
      "Cannot serialize emphasis with `" + marker + "` for `options.emphasis`, expected `*`, or `_`"
    );
  }
  return marker;
}
function encodeCharacterReference(code2) {
  return "&#x" + code2.toString(16).toUpperCase() + ";";
}
function encodeInfo(outside, inside, marker) {
  const outsideKind = classifyCharacter(outside);
  const insideKind = classifyCharacter(inside);
  if (outsideKind === void 0) {
    return insideKind === void 0 ? (
      // Letter inside:
      // we have to encode *both* letters for `_` as it is looser.
      // it already forms for `*` (and GFMs `~`).
      marker === "_" ? { inside: true, outside: true } : { inside: false, outside: false }
    ) : insideKind === 1 ? (
      // Whitespace inside: encode both (letter, whitespace).
      { inside: true, outside: true }
    ) : (
      // Punctuation inside: encode outer (letter)
      { inside: false, outside: true }
    );
  }
  if (outsideKind === 1) {
    return insideKind === void 0 ? (
      // Letter inside: already forms.
      { inside: false, outside: false }
    ) : insideKind === 1 ? (
      // Whitespace inside: encode both (whitespace).
      { inside: true, outside: true }
    ) : (
      // Punctuation inside: already forms.
      { inside: false, outside: false }
    );
  }
  return insideKind === void 0 ? (
    // Letter inside: already forms.
    { inside: false, outside: false }
  ) : insideKind === 1 ? (
    // Whitespace inside: encode inner (whitespace).
    { inside: true, outside: false }
  ) : (
    // Punctuation inside: already forms.
    { inside: false, outside: false }
  );
}
emphasis.peek = emphasisPeek;
function emphasis(node2, _, state2, info) {
  const marker = checkEmphasis(state2);
  const exit2 = state2.enter("emphasis");
  const tracker = state2.createTracker(info);
  const before = tracker.move(marker);
  let between = tracker.move(
    state2.containerPhrasing(node2, {
      after: marker,
      before,
      ...tracker.current()
    })
  );
  const betweenHead = between.charCodeAt(0);
  const open = encodeInfo(
    info.before.charCodeAt(info.before.length - 1),
    betweenHead,
    marker
  );
  if (open.inside) {
    between = encodeCharacterReference(betweenHead) + between.slice(1);
  }
  const betweenTail = between.charCodeAt(between.length - 1);
  const close = encodeInfo(info.after.charCodeAt(0), betweenTail, marker);
  if (close.inside) {
    between = between.slice(0, -1) + encodeCharacterReference(betweenTail);
  }
  const after = tracker.move(marker);
  exit2();
  state2.attentionEncodeSurroundingInfo = {
    after: close.outside,
    before: open.outside
  };
  return before + between + after;
}
function emphasisPeek(_, _1, state2) {
  return state2.options.emphasis || "*";
}
function formatHeadingAsSetext(node2, state2) {
  let literalWithBreak = false;
  visit(node2, function(node3) {
    if ("value" in node3 && /\r?\n|\r/.test(node3.value) || node3.type === "break") {
      literalWithBreak = true;
      return EXIT;
    }
  });
  return Boolean(
    (!node2.depth || node2.depth < 3) && toString$1(node2) && (state2.options.setext || literalWithBreak)
  );
}
function heading(node2, _, state2, info) {
  const rank = Math.max(Math.min(6, node2.depth || 1), 1);
  const tracker = state2.createTracker(info);
  if (formatHeadingAsSetext(node2, state2)) {
    const exit3 = state2.enter("headingSetext");
    const subexit2 = state2.enter("phrasing");
    const value2 = state2.containerPhrasing(node2, {
      ...tracker.current(),
      before: "\n",
      after: "\n"
    });
    subexit2();
    exit3();
    return value2 + "\n" + (rank === 1 ? "=" : "-").repeat(
      // The whole size…
      value2.length - // Minus the position of the character after the last EOL (or
      // 0 if there is none)…
      (Math.max(value2.lastIndexOf("\r"), value2.lastIndexOf("\n")) + 1)
    );
  }
  const sequence = "#".repeat(rank);
  const exit2 = state2.enter("headingAtx");
  const subexit = state2.enter("phrasing");
  tracker.move(sequence + " ");
  let value = state2.containerPhrasing(node2, {
    before: "# ",
    after: "\n",
    ...tracker.current()
  });
  if (/^[\t ]/.test(value)) {
    value = encodeCharacterReference(value.charCodeAt(0)) + value.slice(1);
  }
  value = value ? sequence + " " + value : sequence;
  if (state2.options.closeAtx) {
    value += " " + sequence;
  }
  subexit();
  exit2();
  return value;
}
html.peek = htmlPeek;
function html(node2) {
  return node2.value || "";
}
function htmlPeek() {
  return "<";
}
image.peek = imagePeek;
function image(node2, _, state2, info) {
  const quote = checkQuote(state2);
  const suffix = quote === '"' ? "Quote" : "Apostrophe";
  const exit2 = state2.enter("image");
  let subexit = state2.enter("label");
  const tracker = state2.createTracker(info);
  let value = tracker.move("![");
  value += tracker.move(
    state2.safe(node2.alt, { before: value, after: "]", ...tracker.current() })
  );
  value += tracker.move("](");
  subexit();
  if (
    // If there’s no url but there is a title…
    !node2.url && node2.title || // If there are control characters or whitespace.
    /[\0- \u007F]/.test(node2.url)
  ) {
    subexit = state2.enter("destinationLiteral");
    value += tracker.move("<");
    value += tracker.move(
      state2.safe(node2.url, { before: value, after: ">", ...tracker.current() })
    );
    value += tracker.move(">");
  } else {
    subexit = state2.enter("destinationRaw");
    value += tracker.move(
      state2.safe(node2.url, {
        before: value,
        after: node2.title ? " " : ")",
        ...tracker.current()
      })
    );
  }
  subexit();
  if (node2.title) {
    subexit = state2.enter(`title${suffix}`);
    value += tracker.move(" " + quote);
    value += tracker.move(
      state2.safe(node2.title, {
        before: value,
        after: quote,
        ...tracker.current()
      })
    );
    value += tracker.move(quote);
    subexit();
  }
  value += tracker.move(")");
  exit2();
  return value;
}
function imagePeek() {
  return "!";
}
imageReference.peek = imageReferencePeek;
function imageReference(node2, _, state2, info) {
  const type = node2.referenceType;
  const exit2 = state2.enter("imageReference");
  let subexit = state2.enter("label");
  const tracker = state2.createTracker(info);
  let value = tracker.move("![");
  const alt = state2.safe(node2.alt, {
    before: value,
    after: "]",
    ...tracker.current()
  });
  value += tracker.move(alt + "][");
  subexit();
  const stack = state2.stack;
  state2.stack = [];
  subexit = state2.enter("reference");
  const reference = state2.safe(state2.associationId(node2), {
    before: value,
    after: "]",
    ...tracker.current()
  });
  subexit();
  state2.stack = stack;
  exit2();
  if (type === "full" || !alt || alt !== reference) {
    value += tracker.move(reference + "]");
  } else if (type === "shortcut") {
    value = value.slice(0, -1);
  } else {
    value += tracker.move("]");
  }
  return value;
}
function imageReferencePeek() {
  return "!";
}
inlineCode.peek = inlineCodePeek;
function inlineCode(node2, _, state2) {
  let value = node2.value || "";
  let sequence = "`";
  let index2 = -1;
  while (new RegExp("(^|[^`])" + sequence + "([^`]|$)").test(value)) {
    sequence += "`";
  }
  if (/[^ \r\n]/.test(value) && (/^[ \r\n]/.test(value) && /[ \r\n]$/.test(value) || /^`|`$/.test(value))) {
    value = " " + value + " ";
  }
  while (++index2 < state2.unsafe.length) {
    const pattern = state2.unsafe[index2];
    const expression = state2.compilePattern(pattern);
    let match;
    if (!pattern.atBreak) continue;
    while (match = expression.exec(value)) {
      let position2 = match.index;
      if (value.charCodeAt(position2) === 10 && value.charCodeAt(position2 - 1) === 13) {
        position2--;
      }
      value = value.slice(0, position2) + " " + value.slice(match.index + 1);
    }
  }
  return sequence + value + sequence;
}
function inlineCodePeek() {
  return "`";
}
function formatLinkAsAutolink(node2, state2) {
  const raw = toString$1(node2);
  return Boolean(
    !state2.options.resourceLink && // If there’s a url…
    node2.url && // And there’s a no title…
    !node2.title && // And the content of `node` is a single text node…
    node2.children && node2.children.length === 1 && node2.children[0].type === "text" && // And if the url is the same as the content…
    (raw === node2.url || "mailto:" + raw === node2.url) && // And that starts w/ a protocol…
    /^[a-z][a-z+.-]+:/i.test(node2.url) && // And that doesn’t contain ASCII control codes (character escapes and
    // references don’t work), space, or angle brackets…
    !/[\0- <>\u007F]/.test(node2.url)
  );
}
link.peek = linkPeek;
function link(node2, _, state2, info) {
  const quote = checkQuote(state2);
  const suffix = quote === '"' ? "Quote" : "Apostrophe";
  const tracker = state2.createTracker(info);
  let exit2;
  let subexit;
  if (formatLinkAsAutolink(node2, state2)) {
    const stack = state2.stack;
    state2.stack = [];
    exit2 = state2.enter("autolink");
    let value2 = tracker.move("<");
    value2 += tracker.move(
      state2.containerPhrasing(node2, {
        before: value2,
        after: ">",
        ...tracker.current()
      })
    );
    value2 += tracker.move(">");
    exit2();
    state2.stack = stack;
    return value2;
  }
  exit2 = state2.enter("link");
  subexit = state2.enter("label");
  let value = tracker.move("[");
  value += tracker.move(
    state2.containerPhrasing(node2, {
      before: value,
      after: "](",
      ...tracker.current()
    })
  );
  value += tracker.move("](");
  subexit();
  if (
    // If there’s no url but there is a title…
    !node2.url && node2.title || // If there are control characters or whitespace.
    /[\0- \u007F]/.test(node2.url)
  ) {
    subexit = state2.enter("destinationLiteral");
    value += tracker.move("<");
    value += tracker.move(
      state2.safe(node2.url, { before: value, after: ">", ...tracker.current() })
    );
    value += tracker.move(">");
  } else {
    subexit = state2.enter("destinationRaw");
    value += tracker.move(
      state2.safe(node2.url, {
        before: value,
        after: node2.title ? " " : ")",
        ...tracker.current()
      })
    );
  }
  subexit();
  if (node2.title) {
    subexit = state2.enter(`title${suffix}`);
    value += tracker.move(" " + quote);
    value += tracker.move(
      state2.safe(node2.title, {
        before: value,
        after: quote,
        ...tracker.current()
      })
    );
    value += tracker.move(quote);
    subexit();
  }
  value += tracker.move(")");
  exit2();
  return value;
}
function linkPeek(node2, _, state2) {
  return formatLinkAsAutolink(node2, state2) ? "<" : "[";
}
linkReference.peek = linkReferencePeek;
function linkReference(node2, _, state2, info) {
  const type = node2.referenceType;
  const exit2 = state2.enter("linkReference");
  let subexit = state2.enter("label");
  const tracker = state2.createTracker(info);
  let value = tracker.move("[");
  const text2 = state2.containerPhrasing(node2, {
    before: value,
    after: "]",
    ...tracker.current()
  });
  value += tracker.move(text2 + "][");
  subexit();
  const stack = state2.stack;
  state2.stack = [];
  subexit = state2.enter("reference");
  const reference = state2.safe(state2.associationId(node2), {
    before: value,
    after: "]",
    ...tracker.current()
  });
  subexit();
  state2.stack = stack;
  exit2();
  if (type === "full" || !text2 || text2 !== reference) {
    value += tracker.move(reference + "]");
  } else if (type === "shortcut") {
    value = value.slice(0, -1);
  } else {
    value += tracker.move("]");
  }
  return value;
}
function linkReferencePeek() {
  return "[";
}
function checkBullet(state2) {
  const marker = state2.options.bullet || "*";
  if (marker !== "*" && marker !== "+" && marker !== "-") {
    throw new Error(
      "Cannot serialize items with `" + marker + "` for `options.bullet`, expected `*`, `+`, or `-`"
    );
  }
  return marker;
}
function checkBulletOther(state2) {
  const bullet = checkBullet(state2);
  const bulletOther = state2.options.bulletOther;
  if (!bulletOther) {
    return bullet === "*" ? "-" : "*";
  }
  if (bulletOther !== "*" && bulletOther !== "+" && bulletOther !== "-") {
    throw new Error(
      "Cannot serialize items with `" + bulletOther + "` for `options.bulletOther`, expected `*`, `+`, or `-`"
    );
  }
  if (bulletOther === bullet) {
    throw new Error(
      "Expected `bullet` (`" + bullet + "`) and `bulletOther` (`" + bulletOther + "`) to be different"
    );
  }
  return bulletOther;
}
function checkBulletOrdered(state2) {
  const marker = state2.options.bulletOrdered || ".";
  if (marker !== "." && marker !== ")") {
    throw new Error(
      "Cannot serialize items with `" + marker + "` for `options.bulletOrdered`, expected `.` or `)`"
    );
  }
  return marker;
}
function checkRule(state2) {
  const marker = state2.options.rule || "*";
  if (marker !== "*" && marker !== "-" && marker !== "_") {
    throw new Error(
      "Cannot serialize rules with `" + marker + "` for `options.rule`, expected `*`, `-`, or `_`"
    );
  }
  return marker;
}
function list(node2, parent, state2, info) {
  const exit2 = state2.enter("list");
  const bulletCurrent = state2.bulletCurrent;
  let bullet = node2.ordered ? checkBulletOrdered(state2) : checkBullet(state2);
  const bulletOther = node2.ordered ? bullet === "." ? ")" : "." : checkBulletOther(state2);
  let useDifferentMarker = parent && state2.bulletLastUsed ? bullet === state2.bulletLastUsed : false;
  if (!node2.ordered) {
    const firstListItem = node2.children ? node2.children[0] : void 0;
    if (
      // Bullet could be used as a thematic break marker:
      (bullet === "*" || bullet === "-") && // Empty first list item:
      firstListItem && (!firstListItem.children || !firstListItem.children[0]) && // Directly in two other list items:
      state2.stack[state2.stack.length - 1] === "list" && state2.stack[state2.stack.length - 2] === "listItem" && state2.stack[state2.stack.length - 3] === "list" && state2.stack[state2.stack.length - 4] === "listItem" && // That are each the first child.
      state2.indexStack[state2.indexStack.length - 1] === 0 && state2.indexStack[state2.indexStack.length - 2] === 0 && state2.indexStack[state2.indexStack.length - 3] === 0
    ) {
      useDifferentMarker = true;
    }
    if (checkRule(state2) === bullet && firstListItem) {
      let index2 = -1;
      while (++index2 < node2.children.length) {
        const item = node2.children[index2];
        if (item && item.type === "listItem" && item.children && item.children[0] && item.children[0].type === "thematicBreak") {
          useDifferentMarker = true;
          break;
        }
      }
    }
  }
  if (useDifferentMarker) {
    bullet = bulletOther;
  }
  state2.bulletCurrent = bullet;
  const value = state2.containerFlow(node2, info);
  state2.bulletLastUsed = bullet;
  state2.bulletCurrent = bulletCurrent;
  exit2();
  return value;
}
function checkListItemIndent(state2) {
  const style = state2.options.listItemIndent || "one";
  if (style !== "tab" && style !== "one" && style !== "mixed") {
    throw new Error(
      "Cannot serialize items with `" + style + "` for `options.listItemIndent`, expected `tab`, `one`, or `mixed`"
    );
  }
  return style;
}
function listItem(node2, parent, state2, info) {
  const listItemIndent = checkListItemIndent(state2);
  let bullet = state2.bulletCurrent || checkBullet(state2);
  if (parent && parent.type === "list" && parent.ordered) {
    bullet = (typeof parent.start === "number" && parent.start > -1 ? parent.start : 1) + (state2.options.incrementListMarker === false ? 0 : parent.children.indexOf(node2)) + bullet;
  }
  let size = bullet.length + 1;
  if (listItemIndent === "tab" || listItemIndent === "mixed" && (parent && parent.type === "list" && parent.spread || node2.spread)) {
    size = Math.ceil(size / 4) * 4;
  }
  const tracker = state2.createTracker(info);
  tracker.move(bullet + " ".repeat(size - bullet.length));
  tracker.shift(size);
  const exit2 = state2.enter("listItem");
  const value = state2.indentLines(
    state2.containerFlow(node2, tracker.current()),
    map2
  );
  exit2();
  return value;
  function map2(line, index2, blank) {
    if (index2) {
      return (blank ? "" : " ".repeat(size)) + line;
    }
    return (blank ? bullet : bullet + " ".repeat(size - bullet.length)) + line;
  }
}
function paragraph(node2, _, state2, info) {
  const exit2 = state2.enter("paragraph");
  const subexit = state2.enter("phrasing");
  const value = state2.containerPhrasing(node2, info);
  subexit();
  exit2();
  return value;
}
const phrasing = (
  /** @type {(node?: unknown) => node is Exclude<PhrasingContent, Html>} */
  convert([
    "break",
    "delete",
    "emphasis",
    // To do: next major: removed since footnotes were added to GFM.
    "footnote",
    "footnoteReference",
    "image",
    "imageReference",
    "inlineCode",
    // Enabled by `mdast-util-math`:
    "inlineMath",
    "link",
    "linkReference",
    // Enabled by `mdast-util-mdx`:
    "mdxJsxTextElement",
    // Enabled by `mdast-util-mdx`:
    "mdxTextExpression",
    "strong",
    "text",
    // Enabled by `mdast-util-directive`:
    "textDirective"
  ])
);
function root(node2, _, state2, info) {
  const hasPhrasing = node2.children.some(function(d) {
    return phrasing(d);
  });
  const container = hasPhrasing ? state2.containerPhrasing : state2.containerFlow;
  return container.call(state2, node2, info);
}
function checkStrong(state2) {
  const marker = state2.options.strong || "*";
  if (marker !== "*" && marker !== "_") {
    throw new Error(
      "Cannot serialize strong with `" + marker + "` for `options.strong`, expected `*`, or `_`"
    );
  }
  return marker;
}
strong.peek = strongPeek;
function strong(node2, _, state2, info) {
  const marker = checkStrong(state2);
  const exit2 = state2.enter("strong");
  const tracker = state2.createTracker(info);
  const before = tracker.move(marker + marker);
  let between = tracker.move(
    state2.containerPhrasing(node2, {
      after: marker,
      before,
      ...tracker.current()
    })
  );
  const betweenHead = between.charCodeAt(0);
  const open = encodeInfo(
    info.before.charCodeAt(info.before.length - 1),
    betweenHead,
    marker
  );
  if (open.inside) {
    between = encodeCharacterReference(betweenHead) + between.slice(1);
  }
  const betweenTail = between.charCodeAt(between.length - 1);
  const close = encodeInfo(info.after.charCodeAt(0), betweenTail, marker);
  if (close.inside) {
    between = between.slice(0, -1) + encodeCharacterReference(betweenTail);
  }
  const after = tracker.move(marker + marker);
  exit2();
  state2.attentionEncodeSurroundingInfo = {
    after: close.outside,
    before: open.outside
  };
  return before + between + after;
}
function strongPeek(_, _1, state2) {
  return state2.options.strong || "*";
}
function text$1(node2, _, state2, info) {
  return state2.safe(node2.value, info);
}
function checkRuleRepetition(state2) {
  const repetition = state2.options.ruleRepetition || 3;
  if (repetition < 3) {
    throw new Error(
      "Cannot serialize rules with repetition `" + repetition + "` for `options.ruleRepetition`, expected `3` or more"
    );
  }
  return repetition;
}
function thematicBreak(_, _1, state2) {
  const value = (checkRule(state2) + (state2.options.ruleSpaces ? " " : "")).repeat(checkRuleRepetition(state2));
  return state2.options.ruleSpaces ? value.slice(0, -1) : value;
}
const handle = {
  blockquote,
  break: hardBreak,
  code: code$1,
  definition,
  emphasis,
  hardBreak,
  heading,
  html,
  image,
  imageReference,
  inlineCode,
  link,
  linkReference,
  list,
  listItem,
  paragraph,
  root,
  strong,
  text: text$1,
  thematicBreak
};
function gfmTableFromMarkdown() {
  return {
    enter: {
      table: enterTable,
      tableData: enterCell,
      tableHeader: enterCell,
      tableRow: enterRow
    },
    exit: {
      codeText: exitCodeText,
      table: exitTable,
      tableData: exit,
      tableHeader: exit,
      tableRow: exit
    }
  };
}
function enterTable(token) {
  const align = token._align;
  this.enter(
    {
      type: "table",
      align: align.map(function(d) {
        return d === "none" ? null : d;
      }),
      children: []
    },
    token
  );
  this.data.inTable = true;
}
function exitTable(token) {
  this.exit(token);
  this.data.inTable = void 0;
}
function enterRow(token) {
  this.enter({ type: "tableRow", children: [] }, token);
}
function exit(token) {
  this.exit(token);
}
function enterCell(token) {
  this.enter({ type: "tableCell", children: [] }, token);
}
function exitCodeText(token) {
  let value = this.resume();
  if (this.data.inTable) {
    value = value.replace(/\\([\\|])/g, replace);
  }
  const node2 = this.stack[this.stack.length - 1];
  ok$1(node2.type === "inlineCode");
  node2.value = value;
  this.exit(token);
}
function replace($0, $1) {
  return $1 === "|" ? $1 : $0;
}
function gfmTableToMarkdown(options) {
  const settings = options || {};
  const padding = settings.tableCellPadding;
  const alignDelimiters = settings.tablePipeAlign;
  const stringLength = settings.stringLength;
  const around = padding ? " " : "|";
  return {
    unsafe: [
      { character: "\r", inConstruct: "tableCell" },
      { character: "\n", inConstruct: "tableCell" },
      // A pipe, when followed by a tab or space (padding), or a dash or colon
      // (unpadded delimiter row), could result in a table.
      { atBreak: true, character: "|", after: "[	 :-]" },
      // A pipe in a cell must be encoded.
      { character: "|", inConstruct: "tableCell" },
      // A colon must be followed by a dash, in which case it could start a
      // delimiter row.
      { atBreak: true, character: ":", after: "-" },
      // A delimiter row can also start with a dash, when followed by more
      // dashes, a colon, or a pipe.
      // This is a stricter version than the built in check for lists, thematic
      // breaks, and setex heading underlines though:
      // <https://github.com/syntax-tree/mdast-util-to-markdown/blob/51a2038/lib/unsafe.js#L57>
      { atBreak: true, character: "-", after: "[:|-]" }
    ],
    handlers: {
      inlineCode: inlineCodeWithTable,
      table: handleTable,
      tableCell: handleTableCell,
      tableRow: handleTableRow
    }
  };
  function handleTable(node2, _, state2, info) {
    return serializeData(handleTableAsData(node2, state2, info), node2.align);
  }
  function handleTableRow(node2, _, state2, info) {
    const row = handleTableRowAsData(node2, state2, info);
    const value = serializeData([row]);
    return value.slice(0, value.indexOf("\n"));
  }
  function handleTableCell(node2, _, state2, info) {
    const exit2 = state2.enter("tableCell");
    const subexit = state2.enter("phrasing");
    const value = state2.containerPhrasing(node2, {
      ...info,
      before: around,
      after: around
    });
    subexit();
    exit2();
    return value;
  }
  function serializeData(matrix, align) {
    return markdownTable(matrix, {
      align,
      // @ts-expect-error: `markdown-table` types should support `null`.
      alignDelimiters,
      // @ts-expect-error: `markdown-table` types should support `null`.
      padding,
      // @ts-expect-error: `markdown-table` types should support `null`.
      stringLength
    });
  }
  function handleTableAsData(node2, state2, info) {
    const children = node2.children;
    let index2 = -1;
    const result = [];
    const subexit = state2.enter("table");
    while (++index2 < children.length) {
      result[index2] = handleTableRowAsData(children[index2], state2, info);
    }
    subexit();
    return result;
  }
  function handleTableRowAsData(node2, state2, info) {
    const children = node2.children;
    let index2 = -1;
    const result = [];
    const subexit = state2.enter("tableRow");
    while (++index2 < children.length) {
      result[index2] = handleTableCell(children[index2], node2, state2, info);
    }
    subexit();
    return result;
  }
  function inlineCodeWithTable(node2, parent, state2) {
    let value = handle.inlineCode(node2, parent, state2);
    if (state2.stack.includes("tableCell")) {
      value = value.replace(/\|/g, "\\$&");
    }
    return value;
  }
}
function gfmTaskListItemFromMarkdown() {
  return {
    exit: {
      taskListCheckValueChecked: exitCheck,
      taskListCheckValueUnchecked: exitCheck,
      paragraph: exitParagraphWithTaskListItem
    }
  };
}
function gfmTaskListItemToMarkdown() {
  return {
    unsafe: [{ atBreak: true, character: "-", after: "[:|-]" }],
    handlers: { listItem: listItemWithTaskListItem }
  };
}
function exitCheck(token) {
  const node2 = this.stack[this.stack.length - 2];
  ok$1(node2.type === "listItem");
  node2.checked = token.type === "taskListCheckValueChecked";
}
function exitParagraphWithTaskListItem(token) {
  const parent = this.stack[this.stack.length - 2];
  if (parent && parent.type === "listItem" && typeof parent.checked === "boolean") {
    const node2 = this.stack[this.stack.length - 1];
    ok$1(node2.type === "paragraph");
    const head = node2.children[0];
    if (head && head.type === "text") {
      const siblings = parent.children;
      let index2 = -1;
      let firstParaghraph;
      while (++index2 < siblings.length) {
        const sibling = siblings[index2];
        if (sibling.type === "paragraph") {
          firstParaghraph = sibling;
          break;
        }
      }
      if (firstParaghraph === node2) {
        head.value = head.value.slice(1);
        if (head.value.length === 0) {
          node2.children.shift();
        } else if (node2.position && head.position && typeof head.position.start.offset === "number") {
          head.position.start.column++;
          head.position.start.offset++;
          node2.position.start = Object.assign({}, head.position.start);
        }
      }
    }
  }
  this.exit(token);
}
function listItemWithTaskListItem(node2, parent, state2, info) {
  const head = node2.children[0];
  const checkable = typeof node2.checked === "boolean" && head && head.type === "paragraph";
  const checkbox = "[" + (node2.checked ? "x" : " ") + "] ";
  const tracker = state2.createTracker(info);
  if (checkable) {
    tracker.move(checkbox);
  }
  let value = handle.listItem(node2, parent, state2, {
    ...info,
    ...tracker.current()
  });
  if (checkable) {
    value = value.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, check);
  }
  return value;
  function check($0) {
    return $0 + checkbox;
  }
}
function gfmFromMarkdown() {
  return [
    gfmAutolinkLiteralFromMarkdown(),
    gfmFootnoteFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
    gfmTableFromMarkdown(),
    gfmTaskListItemFromMarkdown()
  ];
}
function gfmToMarkdown(options) {
  return {
    extensions: [
      gfmAutolinkLiteralToMarkdown(),
      gfmFootnoteToMarkdown(options),
      gfmStrikethroughToMarkdown(),
      gfmTableToMarkdown(options),
      gfmTaskListItemToMarkdown()
    ]
  };
}
const wwwPrefix = {
  tokenize: tokenizeWwwPrefix,
  partial: true
};
const domain = {
  tokenize: tokenizeDomain,
  partial: true
};
const path = {
  tokenize: tokenizePath,
  partial: true
};
const trail = {
  tokenize: tokenizeTrail,
  partial: true
};
const emailDomainDotTrail = {
  tokenize: tokenizeEmailDomainDotTrail,
  partial: true
};
const wwwAutolink = {
  name: "wwwAutolink",
  tokenize: tokenizeWwwAutolink,
  previous: previousWww
};
const protocolAutolink = {
  name: "protocolAutolink",
  tokenize: tokenizeProtocolAutolink,
  previous: previousProtocol
};
const emailAutolink = {
  name: "emailAutolink",
  tokenize: tokenizeEmailAutolink,
  previous: previousEmail
};
const text = {};
function gfmAutolinkLiteral() {
  return {
    text
  };
}
let code = 48;
while (code < 123) {
  text[code] = emailAutolink;
  code++;
  if (code === 58) code = 65;
  else if (code === 91) code = 97;
}
text[43] = emailAutolink;
text[45] = emailAutolink;
text[46] = emailAutolink;
text[95] = emailAutolink;
text[72] = [emailAutolink, protocolAutolink];
text[104] = [emailAutolink, protocolAutolink];
text[87] = [emailAutolink, wwwAutolink];
text[119] = [emailAutolink, wwwAutolink];
function tokenizeEmailAutolink(effects, ok2, nok) {
  const self2 = this;
  let dot;
  let data;
  return start;
  function start(code2) {
    if (!gfmAtext(code2) || !previousEmail.call(self2, self2.previous) || previousUnbalanced(self2.events)) {
      return nok(code2);
    }
    effects.enter("literalAutolink");
    effects.enter("literalAutolinkEmail");
    return atext(code2);
  }
  function atext(code2) {
    if (gfmAtext(code2)) {
      effects.consume(code2);
      return atext;
    }
    if (code2 === 64) {
      effects.consume(code2);
      return emailDomain;
    }
    return nok(code2);
  }
  function emailDomain(code2) {
    if (code2 === 46) {
      return effects.check(emailDomainDotTrail, emailDomainAfter, emailDomainDot)(code2);
    }
    if (code2 === 45 || code2 === 95 || asciiAlphanumeric(code2)) {
      data = true;
      effects.consume(code2);
      return emailDomain;
    }
    return emailDomainAfter(code2);
  }
  function emailDomainDot(code2) {
    effects.consume(code2);
    dot = true;
    return emailDomain;
  }
  function emailDomainAfter(code2) {
    if (data && dot && asciiAlpha(self2.previous)) {
      effects.exit("literalAutolinkEmail");
      effects.exit("literalAutolink");
      return ok2(code2);
    }
    return nok(code2);
  }
}
function tokenizeWwwAutolink(effects, ok2, nok) {
  const self2 = this;
  return wwwStart;
  function wwwStart(code2) {
    if (code2 !== 87 && code2 !== 119 || !previousWww.call(self2, self2.previous) || previousUnbalanced(self2.events)) {
      return nok(code2);
    }
    effects.enter("literalAutolink");
    effects.enter("literalAutolinkWww");
    return effects.check(wwwPrefix, effects.attempt(domain, effects.attempt(path, wwwAfter), nok), nok)(code2);
  }
  function wwwAfter(code2) {
    effects.exit("literalAutolinkWww");
    effects.exit("literalAutolink");
    return ok2(code2);
  }
}
function tokenizeProtocolAutolink(effects, ok2, nok) {
  const self2 = this;
  let buffer = "";
  let seen = false;
  return protocolStart;
  function protocolStart(code2) {
    if ((code2 === 72 || code2 === 104) && previousProtocol.call(self2, self2.previous) && !previousUnbalanced(self2.events)) {
      effects.enter("literalAutolink");
      effects.enter("literalAutolinkHttp");
      buffer += String.fromCodePoint(code2);
      effects.consume(code2);
      return protocolPrefixInside;
    }
    return nok(code2);
  }
  function protocolPrefixInside(code2) {
    if (asciiAlpha(code2) && buffer.length < 5) {
      buffer += String.fromCodePoint(code2);
      effects.consume(code2);
      return protocolPrefixInside;
    }
    if (code2 === 58) {
      const protocol = buffer.toLowerCase();
      if (protocol === "http" || protocol === "https") {
        effects.consume(code2);
        return protocolSlashesInside;
      }
    }
    return nok(code2);
  }
  function protocolSlashesInside(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      if (seen) {
        return afterProtocol;
      }
      seen = true;
      return protocolSlashesInside;
    }
    return nok(code2);
  }
  function afterProtocol(code2) {
    return code2 === null || asciiControl(code2) || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2) || unicodePunctuation(code2) ? nok(code2) : effects.attempt(domain, effects.attempt(path, protocolAfter), nok)(code2);
  }
  function protocolAfter(code2) {
    effects.exit("literalAutolinkHttp");
    effects.exit("literalAutolink");
    return ok2(code2);
  }
}
function tokenizeWwwPrefix(effects, ok2, nok) {
  let size = 0;
  return wwwPrefixInside;
  function wwwPrefixInside(code2) {
    if ((code2 === 87 || code2 === 119) && size < 3) {
      size++;
      effects.consume(code2);
      return wwwPrefixInside;
    }
    if (code2 === 46 && size === 3) {
      effects.consume(code2);
      return wwwPrefixAfter;
    }
    return nok(code2);
  }
  function wwwPrefixAfter(code2) {
    return code2 === null ? nok(code2) : ok2(code2);
  }
}
function tokenizeDomain(effects, ok2, nok) {
  let underscoreInLastSegment;
  let underscoreInLastLastSegment;
  let seen;
  return domainInside;
  function domainInside(code2) {
    if (code2 === 46 || code2 === 95) {
      return effects.check(trail, domainAfter, domainAtPunctuation)(code2);
    }
    if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2) || code2 !== 45 && unicodePunctuation(code2)) {
      return domainAfter(code2);
    }
    seen = true;
    effects.consume(code2);
    return domainInside;
  }
  function domainAtPunctuation(code2) {
    if (code2 === 95) {
      underscoreInLastSegment = true;
    } else {
      underscoreInLastLastSegment = underscoreInLastSegment;
      underscoreInLastSegment = void 0;
    }
    effects.consume(code2);
    return domainInside;
  }
  function domainAfter(code2) {
    if (underscoreInLastLastSegment || underscoreInLastSegment || !seen) {
      return nok(code2);
    }
    return ok2(code2);
  }
}
function tokenizePath(effects, ok2) {
  let sizeOpen = 0;
  let sizeClose = 0;
  return pathInside;
  function pathInside(code2) {
    if (code2 === 40) {
      sizeOpen++;
      effects.consume(code2);
      return pathInside;
    }
    if (code2 === 41 && sizeClose < sizeOpen) {
      return pathAtPunctuation(code2);
    }
    if (code2 === 33 || code2 === 34 || code2 === 38 || code2 === 39 || code2 === 41 || code2 === 42 || code2 === 44 || code2 === 46 || code2 === 58 || code2 === 59 || code2 === 60 || code2 === 63 || code2 === 93 || code2 === 95 || code2 === 126) {
      return effects.check(trail, ok2, pathAtPunctuation)(code2);
    }
    if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
      return ok2(code2);
    }
    effects.consume(code2);
    return pathInside;
  }
  function pathAtPunctuation(code2) {
    if (code2 === 41) {
      sizeClose++;
    }
    effects.consume(code2);
    return pathInside;
  }
}
function tokenizeTrail(effects, ok2, nok) {
  return trail2;
  function trail2(code2) {
    if (code2 === 33 || code2 === 34 || code2 === 39 || code2 === 41 || code2 === 42 || code2 === 44 || code2 === 46 || code2 === 58 || code2 === 59 || code2 === 63 || code2 === 95 || code2 === 126) {
      effects.consume(code2);
      return trail2;
    }
    if (code2 === 38) {
      effects.consume(code2);
      return trailCharacterReferenceStart;
    }
    if (code2 === 93) {
      effects.consume(code2);
      return trailBracketAfter;
    }
    if (
      // `<` is an end.
      code2 === 60 || // So is whitespace.
      code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)
    ) {
      return ok2(code2);
    }
    return nok(code2);
  }
  function trailBracketAfter(code2) {
    if (code2 === null || code2 === 40 || code2 === 91 || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
      return ok2(code2);
    }
    return trail2(code2);
  }
  function trailCharacterReferenceStart(code2) {
    return asciiAlpha(code2) ? trailCharacterReferenceInside(code2) : nok(code2);
  }
  function trailCharacterReferenceInside(code2) {
    if (code2 === 59) {
      effects.consume(code2);
      return trail2;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return trailCharacterReferenceInside;
    }
    return nok(code2);
  }
}
function tokenizeEmailDomainDotTrail(effects, ok2, nok) {
  return start;
  function start(code2) {
    effects.consume(code2);
    return after;
  }
  function after(code2) {
    return asciiAlphanumeric(code2) ? nok(code2) : ok2(code2);
  }
}
function previousWww(code2) {
  return code2 === null || code2 === 40 || code2 === 42 || code2 === 95 || code2 === 91 || code2 === 93 || code2 === 126 || markdownLineEndingOrSpace(code2);
}
function previousProtocol(code2) {
  return !asciiAlpha(code2);
}
function previousEmail(code2) {
  return !(code2 === 47 || gfmAtext(code2));
}
function gfmAtext(code2) {
  return code2 === 43 || code2 === 45 || code2 === 46 || code2 === 95 || asciiAlphanumeric(code2);
}
function previousUnbalanced(events) {
  let index2 = events.length;
  let result = false;
  while (index2--) {
    const token = events[index2][1];
    if ((token.type === "labelLink" || token.type === "labelImage") && !token._balanced) {
      result = true;
      break;
    }
    if (token._gfmAutolinkLiteralWalkedInto) {
      result = false;
      break;
    }
  }
  if (events.length > 0 && !result) {
    events[events.length - 1][1]._gfmAutolinkLiteralWalkedInto = true;
  }
  return result;
}
const indent = {
  tokenize: tokenizeIndent,
  partial: true
};
function gfmFootnote() {
  return {
    document: {
      [91]: {
        name: "gfmFootnoteDefinition",
        tokenize: tokenizeDefinitionStart,
        continuation: {
          tokenize: tokenizeDefinitionContinuation
        },
        exit: gfmFootnoteDefinitionEnd
      }
    },
    text: {
      [91]: {
        name: "gfmFootnoteCall",
        tokenize: tokenizeGfmFootnoteCall
      },
      [93]: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: tokenizePotentialGfmFootnoteCall,
        resolveTo: resolveToPotentialGfmFootnoteCall
      }
    }
  };
}
function tokenizePotentialGfmFootnoteCall(effects, ok2, nok) {
  const self2 = this;
  let index2 = self2.events.length;
  const defined = self2.parser.gfmFootnotes || (self2.parser.gfmFootnotes = []);
  let labelStart;
  while (index2--) {
    const token = self2.events[index2][1];
    if (token.type === "labelImage") {
      labelStart = token;
      break;
    }
    if (token.type === "gfmFootnoteCall" || token.type === "labelLink" || token.type === "label" || token.type === "image" || token.type === "link") {
      break;
    }
  }
  return start;
  function start(code2) {
    if (!labelStart || !labelStart._balanced) {
      return nok(code2);
    }
    const id = normalizeIdentifier(self2.sliceSerialize({
      start: labelStart.end,
      end: self2.now()
    }));
    if (id.codePointAt(0) !== 94 || !defined.includes(id.slice(1))) {
      return nok(code2);
    }
    effects.enter("gfmFootnoteCallLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallLabelMarker");
    return ok2(code2);
  }
}
function resolveToPotentialGfmFootnoteCall(events, context) {
  let index2 = events.length;
  while (index2--) {
    if (events[index2][1].type === "labelImage" && events[index2][0] === "enter") {
      events[index2][1];
      break;
    }
  }
  events[index2 + 1][1].type = "data";
  events[index2 + 3][1].type = "gfmFootnoteCallLabelMarker";
  const call = {
    type: "gfmFootnoteCall",
    start: Object.assign({}, events[index2 + 3][1].start),
    end: Object.assign({}, events[events.length - 1][1].end)
  };
  const marker = {
    type: "gfmFootnoteCallMarker",
    start: Object.assign({}, events[index2 + 3][1].end),
    end: Object.assign({}, events[index2 + 3][1].end)
  };
  marker.end.column++;
  marker.end.offset++;
  marker.end._bufferIndex++;
  const string2 = {
    type: "gfmFootnoteCallString",
    start: Object.assign({}, marker.end),
    end: Object.assign({}, events[events.length - 1][1].start)
  };
  const chunk = {
    type: "chunkString",
    contentType: "string",
    start: Object.assign({}, string2.start),
    end: Object.assign({}, string2.end)
  };
  const replacement = [
    // Take the `labelImageMarker` (now `data`, the `!`)
    events[index2 + 1],
    events[index2 + 2],
    ["enter", call, context],
    // The `[`
    events[index2 + 3],
    events[index2 + 4],
    // The `^`.
    ["enter", marker, context],
    ["exit", marker, context],
    // Everything in between.
    ["enter", string2, context],
    ["enter", chunk, context],
    ["exit", chunk, context],
    ["exit", string2, context],
    // The ending (`]`, properly parsed and labelled).
    events[events.length - 2],
    events[events.length - 1],
    ["exit", call, context]
  ];
  events.splice(index2, events.length - index2 + 1, ...replacement);
  return events;
}
function tokenizeGfmFootnoteCall(effects, ok2, nok) {
  const self2 = this;
  const defined = self2.parser.gfmFootnotes || (self2.parser.gfmFootnotes = []);
  let size = 0;
  let data;
  return start;
  function start(code2) {
    effects.enter("gfmFootnoteCall");
    effects.enter("gfmFootnoteCallLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallLabelMarker");
    return callStart;
  }
  function callStart(code2) {
    if (code2 !== 94) return nok(code2);
    effects.enter("gfmFootnoteCallMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallMarker");
    effects.enter("gfmFootnoteCallString");
    effects.enter("chunkString").contentType = "string";
    return callData;
  }
  function callData(code2) {
    if (
      // Too long.
      size > 999 || // Closing brace with nothing.
      code2 === 93 && !data || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      code2 === null || code2 === 91 || markdownLineEndingOrSpace(code2)
    ) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit("chunkString");
      const token = effects.exit("gfmFootnoteCallString");
      if (!defined.includes(normalizeIdentifier(self2.sliceSerialize(token)))) {
        return nok(code2);
      }
      effects.enter("gfmFootnoteCallLabelMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteCallLabelMarker");
      effects.exit("gfmFootnoteCall");
      return ok2;
    }
    if (!markdownLineEndingOrSpace(code2)) {
      data = true;
    }
    size++;
    effects.consume(code2);
    return code2 === 92 ? callEscape : callData;
  }
  function callEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return callData;
    }
    return callData(code2);
  }
}
function tokenizeDefinitionStart(effects, ok2, nok) {
  const self2 = this;
  const defined = self2.parser.gfmFootnotes || (self2.parser.gfmFootnotes = []);
  let identifier;
  let size = 0;
  let data;
  return start;
  function start(code2) {
    effects.enter("gfmFootnoteDefinition")._container = true;
    effects.enter("gfmFootnoteDefinitionLabel");
    effects.enter("gfmFootnoteDefinitionLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteDefinitionLabelMarker");
    return labelAtMarker;
  }
  function labelAtMarker(code2) {
    if (code2 === 94) {
      effects.enter("gfmFootnoteDefinitionMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteDefinitionMarker");
      effects.enter("gfmFootnoteDefinitionLabelString");
      effects.enter("chunkString").contentType = "string";
      return labelInside;
    }
    return nok(code2);
  }
  function labelInside(code2) {
    if (
      // Too long.
      size > 999 || // Closing brace with nothing.
      code2 === 93 && !data || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      code2 === null || code2 === 91 || markdownLineEndingOrSpace(code2)
    ) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit("chunkString");
      const token = effects.exit("gfmFootnoteDefinitionLabelString");
      identifier = normalizeIdentifier(self2.sliceSerialize(token));
      effects.enter("gfmFootnoteDefinitionLabelMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteDefinitionLabelMarker");
      effects.exit("gfmFootnoteDefinitionLabel");
      return labelAfter;
    }
    if (!markdownLineEndingOrSpace(code2)) {
      data = true;
    }
    size++;
    effects.consume(code2);
    return code2 === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return labelInside;
    }
    return labelInside(code2);
  }
  function labelAfter(code2) {
    if (code2 === 58) {
      effects.enter("definitionMarker");
      effects.consume(code2);
      effects.exit("definitionMarker");
      if (!defined.includes(identifier)) {
        defined.push(identifier);
      }
      return factorySpace(effects, whitespaceAfter, "gfmFootnoteDefinitionWhitespace");
    }
    return nok(code2);
  }
  function whitespaceAfter(code2) {
    return ok2(code2);
  }
}
function tokenizeDefinitionContinuation(effects, ok2, nok) {
  return effects.check(blankLine, ok2, effects.attempt(indent, ok2, nok));
}
function gfmFootnoteDefinitionEnd(effects) {
  effects.exit("gfmFootnoteDefinition");
}
function tokenizeIndent(effects, ok2, nok) {
  const self2 = this;
  return factorySpace(effects, afterPrefix, "gfmFootnoteDefinitionIndent", 4 + 1);
  function afterPrefix(code2) {
    const tail = self2.events[self2.events.length - 1];
    return tail && tail[1].type === "gfmFootnoteDefinitionIndent" && tail[2].sliceSerialize(tail[1], true).length === 4 ? ok2(code2) : nok(code2);
  }
}
function gfmStrikethrough(options) {
  const options_ = options || {};
  let single = options_.singleTilde;
  const tokenizer = {
    name: "strikethrough",
    tokenize: tokenizeStrikethrough,
    resolveAll: resolveAllStrikethrough
  };
  if (single === null || single === void 0) {
    single = true;
  }
  return {
    text: {
      [126]: tokenizer
    },
    insideSpan: {
      null: [tokenizer]
    },
    attentionMarkers: {
      null: [126]
    }
  };
  function resolveAllStrikethrough(events, context) {
    let index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][0] === "enter" && events[index2][1].type === "strikethroughSequenceTemporary" && events[index2][1]._close) {
        let open = index2;
        while (open--) {
          if (events[open][0] === "exit" && events[open][1].type === "strikethroughSequenceTemporary" && events[open][1]._open && // If the sizes are the same:
          events[index2][1].end.offset - events[index2][1].start.offset === events[open][1].end.offset - events[open][1].start.offset) {
            events[index2][1].type = "strikethroughSequence";
            events[open][1].type = "strikethroughSequence";
            const strikethrough2 = {
              type: "strikethrough",
              start: Object.assign({}, events[open][1].start),
              end: Object.assign({}, events[index2][1].end)
            };
            const text2 = {
              type: "strikethroughText",
              start: Object.assign({}, events[open][1].end),
              end: Object.assign({}, events[index2][1].start)
            };
            const nextEvents = [["enter", strikethrough2, context], ["enter", events[open][1], context], ["exit", events[open][1], context], ["enter", text2, context]];
            const insideSpan2 = context.parser.constructs.insideSpan.null;
            if (insideSpan2) {
              splice(nextEvents, nextEvents.length, 0, resolveAll(insideSpan2, events.slice(open + 1, index2), context));
            }
            splice(nextEvents, nextEvents.length, 0, [["exit", text2, context], ["enter", events[index2][1], context], ["exit", events[index2][1], context], ["exit", strikethrough2, context]]);
            splice(events, open - 1, index2 - open + 3, nextEvents);
            index2 = open + nextEvents.length - 2;
            break;
          }
        }
      }
    }
    index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][1].type === "strikethroughSequenceTemporary") {
        events[index2][1].type = "data";
      }
    }
    return events;
  }
  function tokenizeStrikethrough(effects, ok2, nok) {
    const previous2 = this.previous;
    const events = this.events;
    let size = 0;
    return start;
    function start(code2) {
      if (previous2 === 126 && events[events.length - 1][1].type !== "characterEscape") {
        return nok(code2);
      }
      effects.enter("strikethroughSequenceTemporary");
      return more(code2);
    }
    function more(code2) {
      const before = classifyCharacter(previous2);
      if (code2 === 126) {
        if (size > 1) return nok(code2);
        effects.consume(code2);
        size++;
        return more;
      }
      if (size < 2 && !single) return nok(code2);
      const token = effects.exit("strikethroughSequenceTemporary");
      const after = classifyCharacter(code2);
      token._open = !after || after === 2 && Boolean(before);
      token._close = !before || before === 2 && Boolean(after);
      return ok2(code2);
    }
  }
}
class EditMap {
  /**
   * Create a new edit map.
   */
  constructor() {
    this.map = [];
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   * @param {number} remove
   * @param {Array<Event>} add
   * @returns {undefined}
   */
  add(index2, remove, add) {
    addImplementation(this, index2, remove, add);
  }
  // To do: add this when moving to `micromark`.
  // /**
  //  * Create an edit: but insert `add` before existing additions.
  //  *
  //  * @param {number} index
  //  * @param {number} remove
  //  * @param {Array<Event>} add
  //  * @returns {undefined}
  //  */
  // addBefore(index, remove, add) {
  //   addImplementation(this, index, remove, add, true)
  // }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   * @returns {undefined}
   */
  consume(events) {
    this.map.sort(function(a, b) {
      return a[0] - b[0];
    });
    if (this.map.length === 0) {
      return;
    }
    let index2 = this.map.length;
    const vecs = [];
    while (index2 > 0) {
      index2 -= 1;
      vecs.push(events.slice(this.map[index2][0] + this.map[index2][1]), this.map[index2][2]);
      events.length = this.map[index2][0];
    }
    vecs.push(events.slice());
    events.length = 0;
    let slice = vecs.pop();
    while (slice) {
      for (const element2 of slice) {
        events.push(element2);
      }
      slice = vecs.pop();
    }
    this.map.length = 0;
  }
}
function addImplementation(editMap, at, remove, add) {
  let index2 = 0;
  if (remove === 0 && add.length === 0) {
    return;
  }
  while (index2 < editMap.map.length) {
    if (editMap.map[index2][0] === at) {
      editMap.map[index2][1] += remove;
      editMap.map[index2][2].push(...add);
      return;
    }
    index2 += 1;
  }
  editMap.map.push([at, remove, add]);
}
function gfmTableAlign(events, index2) {
  let inDelimiterRow = false;
  const align = [];
  while (index2 < events.length) {
    const event = events[index2];
    if (inDelimiterRow) {
      if (event[0] === "enter") {
        if (event[1].type === "tableContent") {
          align.push(events[index2 + 1][1].type === "tableDelimiterMarker" ? "left" : "none");
        }
      } else if (event[1].type === "tableContent") {
        if (events[index2 - 1][1].type === "tableDelimiterMarker") {
          const alignIndex = align.length - 1;
          align[alignIndex] = align[alignIndex] === "left" ? "center" : "right";
        }
      } else if (event[1].type === "tableDelimiterRow") {
        break;
      }
    } else if (event[0] === "enter" && event[1].type === "tableDelimiterRow") {
      inDelimiterRow = true;
    }
    index2 += 1;
  }
  return align;
}
function gfmTable() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: tokenizeTable,
        resolveAll: resolveTable
      }
    }
  };
}
function tokenizeTable(effects, ok2, nok) {
  const self2 = this;
  let size = 0;
  let sizeB = 0;
  let seen;
  return start;
  function start(code2) {
    let index2 = self2.events.length - 1;
    while (index2 > -1) {
      const type = self2.events[index2][1].type;
      if (type === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      type === "linePrefix") index2--;
      else break;
    }
    const tail = index2 > -1 ? self2.events[index2][1].type : null;
    const next = tail === "tableHead" || tail === "tableRow" ? bodyRowStart : headRowBefore;
    if (next === bodyRowStart && self2.parser.lazy[self2.now().line]) {
      return nok(code2);
    }
    return next(code2);
  }
  function headRowBefore(code2) {
    effects.enter("tableHead");
    effects.enter("tableRow");
    return headRowStart(code2);
  }
  function headRowStart(code2) {
    if (code2 === 124) {
      return headRowBreak(code2);
    }
    seen = true;
    sizeB += 1;
    return headRowBreak(code2);
  }
  function headRowBreak(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      if (sizeB > 1) {
        sizeB = 0;
        self2.interrupt = true;
        effects.exit("tableRow");
        effects.enter("lineEnding");
        effects.consume(code2);
        effects.exit("lineEnding");
        return headDelimiterStart;
      }
      return nok(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, headRowBreak, "whitespace")(code2);
    }
    sizeB += 1;
    if (seen) {
      seen = false;
      size += 1;
    }
    if (code2 === 124) {
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      seen = true;
      return headRowBreak;
    }
    effects.enter("data");
    return headRowData(code2);
  }
  function headRowData(code2) {
    if (code2 === null || code2 === 124 || markdownLineEndingOrSpace(code2)) {
      effects.exit("data");
      return headRowBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? headRowEscape : headRowData;
  }
  function headRowEscape(code2) {
    if (code2 === 92 || code2 === 124) {
      effects.consume(code2);
      return headRowData;
    }
    return headRowData(code2);
  }
  function headDelimiterStart(code2) {
    self2.interrupt = false;
    if (self2.parser.lazy[self2.now().line]) {
      return nok(code2);
    }
    effects.enter("tableDelimiterRow");
    seen = false;
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterBefore, "linePrefix", self2.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
    }
    return headDelimiterBefore(code2);
  }
  function headDelimiterBefore(code2) {
    if (code2 === 45 || code2 === 58) {
      return headDelimiterValueBefore(code2);
    }
    if (code2 === 124) {
      seen = true;
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      return headDelimiterCellBefore;
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterCellBefore(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterValueBefore, "whitespace")(code2);
    }
    return headDelimiterValueBefore(code2);
  }
  function headDelimiterValueBefore(code2) {
    if (code2 === 58) {
      sizeB += 1;
      seen = true;
      effects.enter("tableDelimiterMarker");
      effects.consume(code2);
      effects.exit("tableDelimiterMarker");
      return headDelimiterLeftAlignmentAfter;
    }
    if (code2 === 45) {
      sizeB += 1;
      return headDelimiterLeftAlignmentAfter(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      return headDelimiterCellAfter(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterLeftAlignmentAfter(code2) {
    if (code2 === 45) {
      effects.enter("tableDelimiterFiller");
      return headDelimiterFiller(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterFiller(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return headDelimiterFiller;
    }
    if (code2 === 58) {
      seen = true;
      effects.exit("tableDelimiterFiller");
      effects.enter("tableDelimiterMarker");
      effects.consume(code2);
      effects.exit("tableDelimiterMarker");
      return headDelimiterRightAlignmentAfter;
    }
    effects.exit("tableDelimiterFiller");
    return headDelimiterRightAlignmentAfter(code2);
  }
  function headDelimiterRightAlignmentAfter(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterCellAfter, "whitespace")(code2);
    }
    return headDelimiterCellAfter(code2);
  }
  function headDelimiterCellAfter(code2) {
    if (code2 === 124) {
      return headDelimiterBefore(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      if (!seen || size !== sizeB) {
        return headDelimiterNok(code2);
      }
      effects.exit("tableDelimiterRow");
      effects.exit("tableHead");
      return ok2(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterNok(code2) {
    return nok(code2);
  }
  function bodyRowStart(code2) {
    effects.enter("tableRow");
    return bodyRowBreak(code2);
  }
  function bodyRowBreak(code2) {
    if (code2 === 124) {
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      return bodyRowBreak;
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("tableRow");
      return ok2(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, bodyRowBreak, "whitespace")(code2);
    }
    effects.enter("data");
    return bodyRowData(code2);
  }
  function bodyRowData(code2) {
    if (code2 === null || code2 === 124 || markdownLineEndingOrSpace(code2)) {
      effects.exit("data");
      return bodyRowBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? bodyRowEscape : bodyRowData;
  }
  function bodyRowEscape(code2) {
    if (code2 === 92 || code2 === 124) {
      effects.consume(code2);
      return bodyRowData;
    }
    return bodyRowData(code2);
  }
}
function resolveTable(events, context) {
  let index2 = -1;
  let inFirstCellAwaitingPipe = true;
  let rowKind = 0;
  let lastCell = [0, 0, 0, 0];
  let cell = [0, 0, 0, 0];
  let afterHeadAwaitingFirstBodyRow = false;
  let lastTableEnd = 0;
  let currentTable;
  let currentBody;
  let currentCell;
  const map2 = new EditMap();
  while (++index2 < events.length) {
    const event = events[index2];
    const token = event[1];
    if (event[0] === "enter") {
      if (token.type === "tableHead") {
        afterHeadAwaitingFirstBodyRow = false;
        if (lastTableEnd !== 0) {
          flushTableEnd(map2, context, lastTableEnd, currentTable, currentBody);
          currentBody = void 0;
          lastTableEnd = 0;
        }
        currentTable = {
          type: "table",
          start: Object.assign({}, token.start),
          // Note: correct end is set later.
          end: Object.assign({}, token.end)
        };
        map2.add(index2, 0, [["enter", currentTable, context]]);
      } else if (token.type === "tableRow" || token.type === "tableDelimiterRow") {
        inFirstCellAwaitingPipe = true;
        currentCell = void 0;
        lastCell = [0, 0, 0, 0];
        cell = [0, index2 + 1, 0, 0];
        if (afterHeadAwaitingFirstBodyRow) {
          afterHeadAwaitingFirstBodyRow = false;
          currentBody = {
            type: "tableBody",
            start: Object.assign({}, token.start),
            // Note: correct end is set later.
            end: Object.assign({}, token.end)
          };
          map2.add(index2, 0, [["enter", currentBody, context]]);
        }
        rowKind = token.type === "tableDelimiterRow" ? 2 : currentBody ? 3 : 1;
      } else if (rowKind && (token.type === "data" || token.type === "tableDelimiterMarker" || token.type === "tableDelimiterFiller")) {
        inFirstCellAwaitingPipe = false;
        if (cell[2] === 0) {
          if (lastCell[1] !== 0) {
            cell[0] = cell[1];
            currentCell = flushCell(map2, context, lastCell, rowKind, void 0, currentCell);
            lastCell = [0, 0, 0, 0];
          }
          cell[2] = index2;
        }
      } else if (token.type === "tableCellDivider") {
        if (inFirstCellAwaitingPipe) {
          inFirstCellAwaitingPipe = false;
        } else {
          if (lastCell[1] !== 0) {
            cell[0] = cell[1];
            currentCell = flushCell(map2, context, lastCell, rowKind, void 0, currentCell);
          }
          lastCell = cell;
          cell = [lastCell[1], index2, 0, 0];
        }
      }
    } else if (token.type === "tableHead") {
      afterHeadAwaitingFirstBodyRow = true;
      lastTableEnd = index2;
    } else if (token.type === "tableRow" || token.type === "tableDelimiterRow") {
      lastTableEnd = index2;
      if (lastCell[1] !== 0) {
        cell[0] = cell[1];
        currentCell = flushCell(map2, context, lastCell, rowKind, index2, currentCell);
      } else if (cell[1] !== 0) {
        currentCell = flushCell(map2, context, cell, rowKind, index2, currentCell);
      }
      rowKind = 0;
    } else if (rowKind && (token.type === "data" || token.type === "tableDelimiterMarker" || token.type === "tableDelimiterFiller")) {
      cell[3] = index2;
    }
  }
  if (lastTableEnd !== 0) {
    flushTableEnd(map2, context, lastTableEnd, currentTable, currentBody);
  }
  map2.consume(context.events);
  index2 = -1;
  while (++index2 < context.events.length) {
    const event = context.events[index2];
    if (event[0] === "enter" && event[1].type === "table") {
      event[1]._align = gfmTableAlign(context.events, index2);
    }
  }
  return events;
}
function flushCell(map2, context, range, rowKind, rowEnd, previousCell) {
  const groupName = rowKind === 1 ? "tableHeader" : rowKind === 2 ? "tableDelimiter" : "tableData";
  const valueName = "tableContent";
  if (range[0] !== 0) {
    previousCell.end = Object.assign({}, getPoint(context.events, range[0]));
    map2.add(range[0], 0, [["exit", previousCell, context]]);
  }
  const now = getPoint(context.events, range[1]);
  previousCell = {
    type: groupName,
    start: Object.assign({}, now),
    // Note: correct end is set later.
    end: Object.assign({}, now)
  };
  map2.add(range[1], 0, [["enter", previousCell, context]]);
  if (range[2] !== 0) {
    const relatedStart = getPoint(context.events, range[2]);
    const relatedEnd = getPoint(context.events, range[3]);
    const valueToken = {
      type: valueName,
      start: Object.assign({}, relatedStart),
      end: Object.assign({}, relatedEnd)
    };
    map2.add(range[2], 0, [["enter", valueToken, context]]);
    if (rowKind !== 2) {
      const start = context.events[range[2]];
      const end = context.events[range[3]];
      start[1].end = Object.assign({}, end[1].end);
      start[1].type = "chunkText";
      start[1].contentType = "text";
      if (range[3] > range[2] + 1) {
        const a = range[2] + 1;
        const b = range[3] - range[2] - 1;
        map2.add(a, b, []);
      }
    }
    map2.add(range[3] + 1, 0, [["exit", valueToken, context]]);
  }
  if (rowEnd !== void 0) {
    previousCell.end = Object.assign({}, getPoint(context.events, rowEnd));
    map2.add(rowEnd, 0, [["exit", previousCell, context]]);
    previousCell = void 0;
  }
  return previousCell;
}
function flushTableEnd(map2, context, index2, table2, tableBody) {
  const exits = [];
  const related = getPoint(context.events, index2);
  if (tableBody) {
    tableBody.end = Object.assign({}, related);
    exits.push(["exit", tableBody, context]);
  }
  table2.end = Object.assign({}, related);
  exits.push(["exit", table2, context]);
  map2.add(index2 + 1, 0, exits);
}
function getPoint(events, index2) {
  const event = events[index2];
  const side = event[0] === "enter" ? "start" : "end";
  return event[1][side];
}
const tasklistCheck = {
  name: "tasklistCheck",
  tokenize: tokenizeTasklistCheck
};
function gfmTaskListItem() {
  return {
    text: {
      [91]: tasklistCheck
    }
  };
}
function tokenizeTasklistCheck(effects, ok2, nok) {
  const self2 = this;
  return open;
  function open(code2) {
    if (
      // Exit if there’s stuff before.
      self2.previous !== null || // Exit if not in the first content that is the first child of a list
      // item.
      !self2._gfmTasklistFirstContentOfListItem
    ) {
      return nok(code2);
    }
    effects.enter("taskListCheck");
    effects.enter("taskListCheckMarker");
    effects.consume(code2);
    effects.exit("taskListCheckMarker");
    return inside;
  }
  function inside(code2) {
    if (markdownLineEndingOrSpace(code2)) {
      effects.enter("taskListCheckValueUnchecked");
      effects.consume(code2);
      effects.exit("taskListCheckValueUnchecked");
      return close;
    }
    if (code2 === 88 || code2 === 120) {
      effects.enter("taskListCheckValueChecked");
      effects.consume(code2);
      effects.exit("taskListCheckValueChecked");
      return close;
    }
    return nok(code2);
  }
  function close(code2) {
    if (code2 === 93) {
      effects.enter("taskListCheckMarker");
      effects.consume(code2);
      effects.exit("taskListCheckMarker");
      effects.exit("taskListCheck");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    if (markdownLineEnding(code2)) {
      return ok2(code2);
    }
    if (markdownSpace(code2)) {
      return effects.check({
        tokenize: spaceThenNonSpace
      }, ok2, nok)(code2);
    }
    return nok(code2);
  }
}
function spaceThenNonSpace(effects, ok2, nok) {
  return factorySpace(effects, after, "whitespace");
  function after(code2) {
    return code2 === null ? nok(code2) : ok2(code2);
  }
}
function gfm(options) {
  return combineExtensions([
    gfmAutolinkLiteral(),
    gfmFootnote(),
    gfmStrikethrough(options),
    gfmTable(),
    gfmTaskListItem()
  ]);
}
const emptyOptions = {};
function remarkGfm(options) {
  const self2 = (
    /** @type {Processor<Root>} */
    this
  );
  const settings = options || emptyOptions;
  const data = self2.data();
  const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = []);
  const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);
  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);
  micromarkExtensions.push(gfm(settings));
  fromMarkdownExtensions.push(gfmFromMarkdown());
  toMarkdownExtensions.push(gfmToMarkdown(settings));
}
async function copyTextToClipboard(text2) {
  const value = text2.trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok2 = document.execCommand("copy");
      ta.remove();
      return ok2;
    } catch {
      return false;
    }
  }
}
function CopyTextButton({
  text: text2,
  label = "复制",
  copiedLabel = "已复制",
  className,
  size = "sm"
}) {
  const [copied, setCopied] = reactExports.useState(false);
  const onCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ok2 = await copyTextToClipboard(text2);
    if (!ok2) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const iconClass = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  const padClass = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick: (e) => void onCopy(e),
      className: cn(
        "inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/90 font-medium text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground",
        padClass,
        className
      ),
      title: copied ? copiedLabel : label,
      "aria-label": copied ? copiedLabel : label,
      children: copied ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: iconClass }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: copiedLabel })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: iconClass }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: label })
      ] })
    }
  );
}
function extractPlainText(node2) {
  if (node2 == null || typeof node2 === "boolean") return "";
  if (typeof node2 === "string" || typeof node2 === "number") return String(node2);
  if (Array.isArray(node2)) return node2.map(extractPlainText).join("");
  if (reactExports.isValidElement(node2)) {
    return extractPlainText(node2.props.children);
  }
  return "";
}
function MarkdownCodeBlock({
  codeClass,
  children,
  ...props
}) {
  const text2 = extractPlainText(children).replace(/\n$/, "");
  const isBlock = Boolean(codeClass?.includes("language-"));
  const isDiff = Boolean(codeClass?.includes("language-diff"));
  if (!isBlock) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "code",
      {
        className: "rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[length:var(--font-size-sm)] text-foreground",
        ...props,
        children
      }
    );
  }
  const diffBody = isDiff && text2 ? text2.split("\n").map((line, i) => {
    if (line.startsWith("+")) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "diff-add block", children: line }, i);
    }
    if (line.startsWith("-")) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "diff-del block", children: line }, i);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block", children: line }, i);
  }) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group/code relative my-2.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-2 top-2 z-10 opacity-0 transition group-hover/code:opacity-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CopyTextButton, { text: text2, size: "xs", className: "bg-background/95" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "pre",
      {
        className: cn(
          "overflow-x-auto rounded-lg border border-border/60 bg-code-bg px-3 py-2.5 pr-16 font-mono text-[length:var(--font-size-sm)] leading-relaxed text-foreground",
          isDiff && "chat-diff-block"
        ),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: cn("block whitespace-pre", codeClass && !isDiff && codeClass), ...props, children: isDiff ? diffBody : children })
      }
    )
  ] });
}
function ChatMarkdown({ content: content2, className }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("chat-md min-w-0 leading-relaxed text-foreground", className), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    Markdown,
    {
      remarkPlugins: [remarkGfm],
      components: {
        h1: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mb-2 mt-4 text-[1.05rem] font-semibold tracking-tight first:mt-0", children }),
        h2: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mb-2 mt-4 text-[1rem] font-semibold tracking-tight first:mt-0", children }),
        h3: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-1.5 mt-3 text-[0.95rem] font-semibold first:mt-0", children }),
        h4: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "mb-1 mt-2.5 text-[0.9rem] font-semibold first:mt-0", children }),
        p: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 last:mb-0", children }),
        ul: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mb-2 list-disc space-y-1 pl-5 last:mb-0", children }),
        ol: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "mb-2 list-decimal space-y-1 pl-5 last:mb-0", children }),
        li: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "leading-relaxed", children }),
        strong: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "font-semibold text-foreground", children }),
        em: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("em", { className: "text-muted-foreground", children }),
        hr: () => /* @__PURE__ */ jsxRuntimeExports.jsx("hr", { className: "my-4 border-border/70" }),
        blockquote: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("blockquote", { className: "my-2 border-l-2 border-border pl-3 text-muted-foreground", children }),
        a: ({ href, children }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href,
            className: "text-primary underline underline-offset-2 hover:text-primary/80",
            target: "_blank",
            rel: "noreferrer",
            children
          }
        ),
        pre: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children }),
        code: ({ className: codeClass, children, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownCodeBlock, { codeClass, ...props, children }),
        table: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "my-2 overflow-x-auto rounded-lg border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full border-collapse text-[length:var(--font-size-sm)]", children }) }),
        th: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "border-b border-border bg-muted/40 px-3 py-1.5 text-left font-semibold", children }),
        td: ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "border-b border-border/60 px-3 py-1.5", children })
      },
      children: content2
    }
  ) });
}
function WorkbenchMarkdownPreview({
  content: content2,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "workbench-md-preview workbench-md-unified min-h-0 flex-1 overflow-auto scrollbar-thin",
        className
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("article", { className: "workbench-md-article mx-auto max-w-3xl px-5 py-6 sm:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChatMarkdown, { content: content2 || "（空文件）", className: "workbench-md-body" }) })
    }
  );
}
function WorkbenchCodeEditor({
  content: content2,
  relPath,
  readOnly,
  dirty,
  onChange,
  onSave,
  saving,
  toolbarExtras
}) {
  const ws = useWorkbenchWorkspace();
  const isMd = isMarkdownPath(relPath);
  const [viewMode, setViewMode] = reactExports.useState("source");
  const readWorkspaceFile = reactExports.useCallback(async (path2) => {
    const api = getDesktop();
    if (!api?.readWorkspaceTextFile) return null;
    const tryRead = async (p) => {
      try {
        const r = await api.readWorkspaceTextFile(p);
        if (!r.ok || r.binary) return null;
        return r.text ?? null;
      } catch {
        return null;
      }
    };
    return tryRead(path2);
  }, []);
  reactExports.useEffect(() => {
    setViewMode("source");
  }, [relPath]);
  reactExports.useEffect(() => {
    const onKey = (e) => {
      if (readOnly || !onSave || viewMode !== "source") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, onSave, viewMode]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkbenchEditorToolbar,
      {
        relPath,
        dirty,
        saving,
        readOnly,
        onSave,
        viewMode: isMd ? viewMode : void 0,
        onViewModeChange: isMd ? setViewMode : void 0,
        extraActions: toolbarExtras
      }
    ),
    isMd && viewMode === "preview" ? /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchMarkdownPreview, { content: content2 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      CodemirrorWorkbench,
      {
        value: content2,
        relPath,
        readOnly,
        onChange,
        onOpenFile: ws.openFile,
        readWorkspaceFile
      }
    )
  ] });
}
function WorkbenchCenterEditor() {
  const ws = useWorkbenchWorkspace();
  if (!ws.editorTabs.length) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workbench-empty-state flex h-full min-h-0 flex-col items-center justify-center border-r border-border bg-code-bg/20 p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(FileCode, { className: "mb-3 h-10 w-10 text-muted-foreground/40" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "workbench-empty-title text-[13px] font-medium text-foreground/80", children: "预览 / 编辑" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "workbench-empty-desc mt-1 max-w-sm text-[12px] text-muted-foreground", children: "在左侧文件树中打开多个文件；点击「浏览器」可内嵌浏览网页。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => ws.openBrowserTab(),
          className: "mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium hover:bg-secondary",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "h-3.5 w-3.5" }),
            "打开浏览器"
          ]
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 flex-1 flex-col overflow-hidden border-r border-border bg-code-bg/30", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      EditorTabBar,
      {
        tabs: ws.editorTabs,
        activeId: ws.activeEditorTabId,
        onSelect: ws.setActiveEditorTab,
        onClose: ws.closeEditorTab,
        onNewBrowser: () => ws.openBrowserTab()
      }
    ),
    ws.activeEditorTab ? isFileTab(ws.activeEditorTab) ? /* @__PURE__ */ jsxRuntimeExports.jsx(FileTabContent, { tab: ws.activeEditorTab }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      BrowserTabContent,
      {
        tab: ws.activeEditorTab,
        onNavigate: (url) => ws.navigateBrowserTab(ws.activeEditorTab.id, url)
      }
    ) : null
  ] });
}
function EditorTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNewBrowser
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-stretch border-b border-border bg-surface-elevated/80", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-thin", children: tabs.map((tab2) => {
      const active = tab2.id === activeId;
      const fileExt = isFileTab(tab2) ? tab2.relPath.split(".").pop() : void 0;
      const fileName = isFileTab(tab2) ? tab2.label : void 0;
      const Icon = isBrowserTab(tab2) ? Globe : fileIconFor(fileExt, fileName);
      const iconCls = isFileTab(tab2) ? fileIconClass(fileExt, fileName) : "text-muted-foreground/80";
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: cn(
            "group flex max-w-[220px] shrink-0 items-center border-r border-border/60",
            active ? "bg-code-bg text-foreground" : "bg-surface-elevated/40 text-muted-foreground hover:bg-secondary/50"
          ),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => onSelect(tab2.id),
                className: cn(
                  "flex min-w-0 flex-1 items-center gap-1.5 px-3 py-[7px] text-left text-[12px] transition",
                  active && "border-t-2 border-t-primary pt-[5px]"
                ),
                title: isFileTab(tab2) ? tab2.relPath : tab2.url,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: cn("h-3.5 w-3.5 shrink-0", iconCls) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: tab2.label }),
                  isFileTab(tab2) && tab2.dirty ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] text-primary", title: "未保存", children: "●" }) : null,
                  isFileTab(tab2) && tab2.loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-2.5 w-2.5 shrink-0 animate-spin opacity-60" }) : null
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => onClose(tab2.id),
                className: "mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground group-hover:opacity-100",
                "aria-label": "关闭标签页",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" })
              }
            )
          ]
        },
        tab2.id
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: onNewBrowser,
        title: "新建浏览器标签",
        "aria-label": "新建浏览器标签",
        className: "flex w-9 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" })
      }
    )
  ] });
}
function FileTabContent({ tab: tab2 }) {
  const ws = useWorkbenchWorkspace();
  const [previewing, setPreviewing] = reactExports.useState(false);
  const isHtml = /\.html?$/i.test(tab2.relPath);
  const previewHtmlInline = reactExports.useCallback(() => {
    if (!tab2.content) return;
    const blob = new Blob([tab2.content], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    ws.openBrowserTab(void 0, { label: `${tab2.label} 预览`, blobUrl });
  }, [tab2.content, tab2.label, ws]);
  const previewHtmlServer = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    setPreviewing(true);
    try {
      const res = await performProjectPreview(api, `预览 ${tab2.relPath}`, {
        entryRel: tab2.relPath,
        preferStatic: true
      });
      if (res.ok && res.url) {
        ws.openBrowserTab(res.url, { label: fileHostLabel(res.url) });
        toast.success("已在编辑器内打开预览");
      } else {
        toast.warning(res.error || "预览未能启动");
      }
    } finally {
      setPreviewing(false);
    }
  }, [tab2.relPath, ws]);
  const htmlToolbarExtras = isHtml ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        disabled: previewing || tab2.loading,
        onClick: previewHtmlInline,
        className: "shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[10.5px] hover:bg-secondary disabled:opacity-50",
        children: "内嵌预览"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        disabled: previewing || tab2.loading,
        onClick: () => void previewHtmlServer(),
        className: "shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[10.5px] hover:bg-secondary disabled:opacity-50",
        children: previewing ? "启动中…" : "本地服务预览"
      }
    )
  ] }) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workbench-editor-pane flex min-h-0 flex-1 flex-col overflow-hidden", children: [
    tab2.loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-3 text-[12px] text-muted-foreground", children: "读取中…" }) : null,
    tab2.error ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-3 text-[12px] text-destructive", children: tab2.error }) : null,
    !tab2.loading && !tab2.error ? tab2.binary ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      BinaryFileViewer,
      {
        relPath: tab2.relPath,
        size: tab2.size,
        previewBytes: tab2.previewBytes,
        base64: tab2.binaryBase64,
        truncated: tab2.truncated
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      tab2.truncated ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10.5px] text-amber-700 dark:text-amber-400", children: "文件较大，仅显示前 512KB（不可编辑）" }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        WorkbenchCodeEditor,
        {
          content: tab2.content || "",
          relPath: tab2.relPath,
          readOnly: tab2.truncated,
          dirty: tab2.dirty,
          saving: tab2.saving,
          toolbarExtras: htmlToolbarExtras,
          onChange: (c) => ws.updateFileTabContent(tab2.id, c),
          onSave: () => void ws.saveFileTab(tab2.id)
        }
      )
    ] }) : null
  ] }) });
}
function BrowserTabContent({
  tab: tab2,
  onNavigate
}) {
  const [address, setAddress] = reactExports.useState(tab2.url === "about:blank" ? "" : tab2.url);
  const [iframeKey, setIframeKey] = reactExports.useState(0);
  const [historyIndex, setHistoryIndex] = reactExports.useState(0);
  const [historyLength, setHistoryLength] = reactExports.useState(1);
  const historyRef = reactExports.useRef([tab2.url]);
  const iframeRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    setAddress(tab2.url === "about:blank" ? "" : tab2.url);
    historyRef.current = [tab2.url];
    setHistoryIndex(0);
    setHistoryLength(1);
    setIframeKey((k) => k + 1);
  }, [tab2.id]);
  reactExports.useEffect(() => {
    setAddress(tab2.url === "about:blank" ? "" : tab2.url);
  }, [tab2.url]);
  const go = reactExports.useCallback(
    (raw) => {
      const target = normalizeBrowserUrl(raw ?? address);
      const next = historyRef.current.slice(0, historyIndex + 1);
      next.push(target);
      historyRef.current = next;
      setHistoryIndex(next.length - 1);
      setHistoryLength(next.length);
      onNavigate(target);
      setIframeKey((k) => k + 1);
    },
    [address, historyIndex, onNavigate]
  );
  const goBack = () => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    const url = historyRef.current[idx] ?? "about:blank";
    onNavigate(url);
    setIframeKey((k) => k + 1);
  };
  const goForward = () => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const idx = historyIndex + 1;
    setHistoryIndex(idx);
    const url = historyRef.current[idx] ?? "about:blank";
    onNavigate(url);
    setIframeKey((k) => k + 1);
  };
  const reload = () => setIframeKey((k) => k + 1);
  const openExternal = () => {
    if (tab2.url && tab2.url !== "about:blank") void openExternalUrl(tab2.url);
  };
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyLength - 1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1 border-b border-border/60 bg-surface-elevated/50 px-2 py-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavBtn, { onClick: goBack, disabled: !canGoBack, title: "后退", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3.5 w-3.5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavBtn, { onClick: goForward, disabled: !canGoForward, title: "前进", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-3.5 w-3.5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavBtn, { onClick: reload, title: "刷新", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCw, { className: "h-3.5 w-3.5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "form",
        {
          className: "flex min-w-0 flex-1 items-center gap-1",
          onSubmit: (e) => {
            e.preventDefault();
            go();
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: address,
                onChange: (e) => setAddress(e.target.value),
                placeholder: "输入 URL 后回车",
                className: "min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none focus:ring-1 focus:ring-primary/40",
                spellCheck: false
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavBtn, { onClick: openExternal, title: "在系统浏览器打开", disabled: !tab2.url || tab2.url === "about:blank", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3.5 w-3.5" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative min-h-0 flex-1 bg-background", children: tab2.url === "about:blank" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-center justify-center text-[12px] text-muted-foreground", children: "在上方地址栏输入网址后回车" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "iframe",
      {
        ref: iframeRef,
        src: tab2.url,
        title: tab2.label,
        className: "absolute inset-0 h-full w-full border-0 bg-white",
        sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
      },
      iframeKey
    ) })
  ] });
}
function NavBtn({
  children,
  onClick,
  disabled,
  title
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick,
      disabled,
      title,
      className: "flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30",
      children
    }
  );
}
function fileHostLabel(url) {
  try {
    return new URL(url).host || "预览";
  } catch {
    return "预览";
  }
}
function ExplorerTreeRow({
  node: node2,
  depth,
  pathKey,
  selectedRelPath,
  expandedDirs,
  onToggleDir,
  gitStatusByPath,
  gitHasDecoration,
  onOpenFile
}) {
  const isDir = node2.type === "dir";
  const key = pathKey ? `${pathKey}/${node2.name}` : node2.name;
  const expanded = isDir && expandedDirs.has(key);
  const selected = !isDir && selectedRelPath === key;
  const statusLetter = gitStatusByPath.get(key);
  const gitTone = gitStatusTone(statusLetter);
  const showFolderDot = isDir && gitHasDecoration.has(key) && !statusLetter;
  const hiddenName = isHiddenExplorerName(node2.name);
  const gitLabelClass = statusLetter ? explorerGitLabelClass(gitTone) : "explorer-git-label-neutral";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "explorer-tree-node", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => {
          if (isDir) onToggleDir(key);
          else onOpenFile(key);
        },
        className: cn(
          "explorer-tree-row group/row flex w-full items-center gap-0 pr-0 text-left",
          selected && "explorer-tree-row-active"
        ),
        style: { paddingLeft: `${EXPLORER_TREE_BASE_PADDING_PX + depth * EXPLORER_TREE_INDENT_PX}px` },
        title: key,
        children: [
          depth > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "explorer-tree-guides", "aria-hidden": true, children: Array.from({ length: depth }, (_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "explorer-tree-guide",
              style: { left: `${EXPLORER_TREE_BASE_PADDING_PX + i * EXPLORER_TREE_INDENT_PX + EXPLORER_TREE_INDENT_PX / 2}px` }
            },
            i
          )) }) : null,
          isDir ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "explorer-tree-twistie flex items-center justify-center",
              onClick: (e) => {
                e.stopPropagation();
                onToggleDir(key);
              },
              children: expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-4 w-4 text-[var(--explorer-twistie)]" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4 text-[var(--explorer-twistie)]" })
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "explorer-tree-twistie", "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ExplorerTreeIcon,
            {
              ext: node2.ext,
              fileName: node2.name,
              isDir,
              expanded
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: cn(
                "explorer-tree-label",
                hiddenName && !selected && !statusLetter && "explorer-tree-label-dimmed",
                gitLabelClass
              ),
              children: node2.name
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "explorer-tree-meta", children: [
            statusLetter ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn("explorer-tree-status", explorerGitStatusClass(gitTone)),
                title: `Git: ${statusLetter}`,
                children: statusLetter
              }
            ) : null,
            showFolderDot ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "explorer-tree-modified", title: "子项有未提交变更", "aria-label": "子项有未提交变更" }) : null
          ] })
        ]
      }
    ),
    isDir && expanded && node2.children?.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: node2.children.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExplorerTreeRow,
      {
        node: c,
        depth: depth + 1,
        pathKey: key,
        selectedRelPath,
        expandedDirs,
        onToggleDir,
        gitStatusByPath,
        gitHasDecoration,
        onOpenFile
      },
      `${key}/${c.name}-${i}`
    )) }) : null
  ] });
}
function WorkbenchLeftSidebar() {
  const [tab2, setTab] = reactExports.useState("files");
  const ws = useWorkbenchWorkspace();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workbench-explorer-sidebar flex h-full min-h-0 flex-col border-r border-[var(--explorer-border)] bg-[var(--explorer-bg)]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "explorer-panel-toolbar flex shrink-0 items-center border-b border-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SideTabBtn, { active: tab2 === "files", onClick: () => setTab("files"), icon: FolderTree, label: "文件" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SideTabBtn, { active: tab2 === "git", onClick: () => {
        setTab("git");
        void ws.refreshShell();
      }, icon: GitBranch, label: "Git" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(SideTabBtn, { active: tab2 === "diff", onClick: () => {
        setTab("diff");
        void ws.refreshDiff();
      }, icon: GitCompare, label: "改动" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => void (tab2 === "files" ? ws.refreshFiles() : tab2 === "git" ? ws.refreshShell() : ws.refreshDiff()),
          className: "ml-auto mr-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground",
          title: "刷新",
          "aria-label": "刷新",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", ws.loadingFiles && tab2 === "files" ? "animate-spin" : "") })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 overflow-hidden", children: [
      tab2 === "files" && /* @__PURE__ */ jsxRuntimeExports.jsx(FileTreePanel, {}),
      tab2 === "git" && /* @__PURE__ */ jsxRuntimeExports.jsx(GitSnapshotPanel, {}),
      tab2 === "diff" && /* @__PURE__ */ jsxRuntimeExports.jsx(DiffSnapshotPanel, {})
    ] })
  ] });
}
function SideTabBtn({
  active,
  onClick,
  icon: Icon,
  label
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick,
      className: cn(
        "inline-flex items-center gap-1 border-b-2 px-2.5 py-2 text-[11px] font-medium transition-colors",
        active ? "border-[var(--explorer-modified-dot)] text-[var(--explorer-row-active-fg)]" : "border-transparent text-muted-foreground hover:text-foreground"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3 w-3" }),
        label
      ]
    }
  );
}
function FileTreePanel() {
  const hasDesktop = useHasDesktop();
  const ws = useWorkbenchWorkspace();
  const [workspaceExpanded, setWorkspaceExpanded] = reactExports.useState(true);
  const [expandedDirs, setExpandedDirs] = reactExports.useState(() => /* @__PURE__ */ new Set());
  const workspaceName = workspaceFolderName(ws.rootLabel);
  reactExports.useEffect(() => {
    if (!ws.selectedRelPath) return;
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      const parts = ws.selectedRelPath.split("/");
      for (let i = 1; i < parts.length; i++) {
        next.add(parts.slice(0, i).join("/"));
      }
      return next;
    });
  }, [ws.selectedRelPath]);
  const toggleDir = (key) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  if (!hasDesktop) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "p-3 text-[11px] leading-relaxed text-muted-foreground", children: WORKBENCH_SIDEPANEL_OFFLINE });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 flex-col overflow-y-auto scrollbar-thin", children: [
    ws.filesErr ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-2 text-[11px] text-destructive", children: ws.filesErr }) : null,
    ws.loadingFiles && !ws.tree.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-2 text-[11px] text-muted-foreground", children: "加载中…" }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ExplorerSection,
      {
        title: workspaceName,
        expanded: workspaceExpanded,
        onToggle: () => setWorkspaceExpanded((v) => !v),
        titleTitle: ws.rootLabel,
        onCollapseAll: () => setExpandedDirs(/* @__PURE__ */ new Set()),
        onRefresh: () => void ws.refreshFiles(),
        refreshing: ws.loadingFiles,
        children: workspaceExpanded ? /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "explorer-tree-root", children: ws.tree.map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          ExplorerTreeRow,
          {
            node: n,
            depth: 0,
            pathKey: "",
            selectedRelPath: ws.selectedRelPath,
            expandedDirs,
            onToggleDir: toggleDir,
            gitStatusByPath: ws.gitStatusByPath,
            gitHasDecoration: ws.gitHasDecoration,
            onOpenFile: (p) => void ws.openFile(p)
          },
          `${n.name}-${i}`
        )) }) : null
      }
    )
  ] });
}
function ExplorerSection({
  title,
  titleTitle,
  expanded,
  onToggle,
  onCollapseAll,
  onRefresh,
  refreshing,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "explorer-section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "explorer-section-header-row flex w-full items-center pr-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: onToggle,
          className: "explorer-section-header flex min-w-0 flex-1 items-center gap-0.5 px-2 py-0 hover:text-sidebar-foreground",
          title: titleTitle,
          children: [
            expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-4 w-4 shrink-0 opacity-80" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4 shrink-0 opacity-80" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: title })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "explorer-section-actions flex shrink-0 items-center", children: [
        onRefresh ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onRefresh,
            className: "explorer-section-action",
            title: "刷新",
            "aria-label": "刷新",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", refreshing ? "animate-spin" : "") })
          }
        ) : null,
        onCollapseAll ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onCollapseAll,
            className: "explorer-section-action",
            title: "全部折叠",
            "aria-label": "全部折叠",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronsDownUp, { className: "h-3.5 w-3.5" })
          }
        ) : null
      ] })
    ] }),
    expanded ? children : null
  ] });
}
function workspaceFolderName(rootLabel) {
  const trimmed = rootLabel.trim();
  if (!trimmed || trimmed.startsWith("（")) return "工作区";
  const parts = trimmed.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || "工作区";
}
function GitSnapshotPanel() {
  const ws = useWorkbenchWorkspace();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full overflow-y-auto p-2 font-mono text-[11px] leading-relaxed scrollbar-thin", children: [
    ws.shellErr ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-destructive", children: ws.shellErr }) : null,
    ws.loadingShell && !ws.shellText ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: "加载中…" }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "whitespace-pre-wrap break-words text-foreground/90", children: ws.shellText || "（暂无数据）" })
  ] });
}
function DiffSnapshotPanel() {
  const ws = useWorkbenchWorkspace();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full overflow-y-auto p-2 scrollbar-thin", children: [
    ws.statusLine ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 font-mono text-[10.5px] text-muted-foreground", children: ws.statusLine }) : null,
    ws.diffErr ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 text-[11px] text-destructive", children: ws.diffErr }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "workbench-code text-foreground/90", children: ws.diffText.split("\n").map((line, i) => {
      const cls = line.startsWith("+") && !line.startsWith("+++") ? "text-[var(--diff-add)]" : line.startsWith("-") && !line.startsWith("---") ? "text-[var(--diff-del)]" : line.startsWith("@@") ? "text-primary" : "text-foreground/70";
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cls, children: line || " " }, i);
    }) })
  ] });
}
function WorkbenchCenterPreview() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchCenterEditor, {});
}
let handlers = null;
let focusTabHandler = null;
function registerWorkbenchTerminalRunHandlers(next) {
  handlers = next;
}
function registerWorkbenchTerminalFocusTab(fn) {
  focusTabHandler = fn;
}
function workbenchTerminalFocusTab() {
  focusTabHandler?.();
}
function workbenchTerminalRunInActive(command) {
  const cmd = command.trim();
  if (!cmd) return false;
  return handlers?.runInActive(cmd) ?? false;
}
function workbenchTerminalEnsureSession() {
  handlers?.ensureSession();
}
async function runCommandInWorkbenchTerminalBridge(command, opts) {
  const cmd = command.trim();
  if (!cmd) return false;
  workbenchTerminalEnsureSession();
  const maxWait = opts?.maxWaitMs ?? 15e3;
  const poll = opts?.pollMs ?? 200;
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    if (workbenchTerminalRunInActive(cmd)) return true;
    await new Promise((r) => window.setTimeout(r, poll));
  }
  return false;
}
function globMatch(path2, pattern) {
  const norm = path2.replace(/\\/g, "/");
  const pat = pattern.replace(/\\/g, "/");
  if (pat === norm) return true;
  const re2 = new RegExp(
    `^${pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "___GLOBSTAR___").replace(/\*/g, "[^/]*").replace(/___GLOBSTAR___/g, ".*")}$`,
    "i"
  );
  return re2.test(norm);
}
function tokenMatches(problem, token) {
  const t = token.trim();
  if (!t) return true;
  const hay = [problem.relPath, problem.message, problem.rule ?? "", String(problem.line), String(problem.column)].join(" ").toLowerCase();
  if (t.startsWith("!")) {
    const neg = t.slice(1);
    if (neg.includes("*") || neg.includes("/")) return !globMatch(problem.relPath, neg);
    return !hay.includes(neg.toLowerCase());
  }
  if (t.includes("*") || t.includes("/")) return globMatch(problem.relPath, t);
  return hay.includes(t.toLowerCase());
}
function matchProblemFilter(problem, filter) {
  const tokens = filter.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every((token) => tokenMatches(problem, token));
}
const MAX = 2e3;
let seq = 0;
const entries = [];
const listeners$1 = /* @__PURE__ */ new Set();
let debugSnapshot = entries;
function emit$1() {
  debugSnapshot = entries.slice();
  listeners$1.forEach((fn) => fn());
}
function subscribeDebugLog(fn) {
  listeners$1.add(fn);
  return () => listeners$1.delete(fn);
}
function getDebugEntries() {
  return debugSnapshot;
}
function appendDebugEntry(level, text2) {
  entries.push({ id: `d-${++seq}`, level, text: text2, ts: Date.now() });
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  emit$1();
}
function clearDebugLog() {
  entries.length = 0;
  emit$1();
}
function evalDebugExpression(source) {
  const expr = source.trim();
  if (!expr) return;
  appendDebugEntry("input", `> ${expr}`);
  try {
    const fn = new Function(`return (${expr});`);
    const result = fn();
    const text2 = typeof result === "string" ? result : result === void 0 ? "undefined" : JSON.stringify(result, null, 2) ?? String(result);
    appendDebugEntry("result", text2);
  } catch (e) {
    appendDebugEntry("error", e instanceof Error ? e.message : String(e));
  }
}
let consolePatched = false;
function installDebugConsoleCapture() {
  if (consolePatched || typeof window === "undefined") return;
  consolePatched = true;
  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
  const wrap2 = (level, fn) => (...args) => {
    fn(...args);
    try {
      appendDebugEntry(
        level,
        args.map((a) => typeof a === "string" ? a : JSON.stringify(a) ?? String(a)).join(" ")
      );
    } catch {
    }
  };
  console.log = wrap2("log", orig.log);
  console.info = wrap2("info", orig.info);
  console.warn = wrap2("warn", orig.warn);
  console.error = wrap2("error", orig.error);
}
const PORT_URL_RE = /(?:https?:\/\/)?(?:127\.0\.0\.1|localhost|\[::1\]|0\.0\.0\.0):(\d{2,5})\b/gi;
const KNOWN = [
  {
    port: 5188,
    address: "127.0.0.1:5188",
    url: "http://127.0.0.1:5188",
    label: "工作台 UI（Vite）",
    source: "工作台"
  },
  {
    port: 18790,
    address: "127.0.0.1:18790",
    url: "http://127.0.0.1:18790",
    label: "Web 桥接 API",
    source: "桥接"
  }
];
const ports = /* @__PURE__ */ new Map();
const listeners = /* @__PURE__ */ new Set();
let portsSnapshot = rebuildPortsSnapshot();
function rebuildPortsSnapshot() {
  return [...ports.values()].sort((a, b) => a.port - b.port);
}
function emit() {
  portsSnapshot = rebuildPortsSnapshot();
  listeners.forEach((fn) => fn());
}
function upsert(p) {
  const existing = ports.get(p.port);
  if (existing && existing.source !== p.source && existing.source !== "auto") return;
  ports.set(p.port, { ...p, id: `port-${p.port}` });
}
function subscribePorts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function getForwardedPorts() {
  return portsSnapshot;
}
function initKnownPorts() {
  for (const p of KNOWN) upsert(p);
  emit();
}
function scanTextForPorts(text2, source = "auto") {
  if (!text2) return;
  let m;
  PORT_URL_RE.lastIndex = 0;
  while (m = PORT_URL_RE.exec(text2)) {
    const port = Number(m[1]);
    if (port < 1 || port > 65535) continue;
    upsert({
      port,
      address: `127.0.0.1:${port}`,
      url: `http://127.0.0.1:${port}`,
      label: `端口 ${port}`,
      source
    });
  }
  emit();
}
function registerPort(port, label, source, url) {
  upsert({
    port,
    address: `127.0.0.1:${port}`,
    url: `http://127.0.0.1:${port}`,
    label,
    source
  });
  emit();
}
const TERMINAL_SHELL_PROFILES = [
  { id: "bash", label: "bash", path: "/bin/bash" },
  { id: "zsh", label: "zsh", path: "/bin/zsh" }
];
function getDefaultTerminalShell() {
  const v = getUiPrefsCache().defaultTerminalShell;
  if (v === "bash" || v === "zsh") return v;
  return "zsh";
}
function setDefaultTerminalShell(id) {
  patchUiPrefsCache({ defaultTerminalShell: id });
  void saveUiPrefsToProjectDb({ defaultTerminalShell: id });
}
function resolveShellPath(shell) {
  if (!shell?.trim()) return void 0;
  const hit = TERMINAL_SHELL_PROFILES.find((p) => p.id === shell || p.path === shell);
  return hit?.path ?? shell;
}
function shellDisplayLabel(shell) {
  if (!shell) return "zsh";
  const base = shell.split("/").pop();
  return base || shell;
}
function TerminalSessionRail({
  sessions,
  activeId,
  onSelect,
  onClose,
  onSplit
}) {
  if (sessions.length <= 1) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "aside",
    {
      className: "terminal-session-rail flex w-[120px] shrink-0 flex-col border-l border-border bg-surface-elevated/40",
      "aria-label": "终端列表",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "min-h-0 flex-1 overflow-y-auto scrollbar-thin py-0.5", children: sessions.map((session) => {
        const active = session.id === activeId;
        return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: cn(
              "group relative flex items-center gap-0.5 px-1 py-0.5",
              active && "bg-secondary/70"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => onSelect(session.id),
                  className: cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-1 text-left font-mono text-[11px] transition",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  ),
                  title: session.label,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SquareTerminal, { className: "h-3 w-3 shrink-0 opacity-60" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: session.label })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: cn(
                    "absolute right-0.5 flex items-center gap-0 opacity-0 transition group-hover:opacity-100",
                    active && "opacity-100"
                  ),
                  children: [
                    onSplit ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: (e) => {
                          e.stopPropagation();
                          onSelect(session.id);
                          onSplit(session.id);
                        },
                        title: "拆分终端",
                        "aria-label": "拆分终端",
                        className: "flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquareSplitHorizontal, { className: "h-3 w-3" })
                      }
                    ) : null,
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: (e) => {
                          e.stopPropagation();
                          onClose(session.id);
                        },
                        title: "关闭终端",
                        "aria-label": "关闭终端",
                        className: "flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground",
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3 w-3" })
                      }
                    )
                  ]
                }
              )
            ]
          }
        ) }, session.id);
      }) })
    }
  );
}
function readCssVarAsColor(varName, fallback) {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("div");
  probe.style.display = "none";
  probe.style.backgroundColor = `var(${varName})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (!resolved || resolved === "rgba(0, 0, 0, 0)" || resolved === "transparent") return fallback;
  return resolved;
}
function buildXtermTheme(_resolved) {
  const background = readCssVarAsColor("--terminal-bg", "#f8f6f3");
  const foreground = readCssVarAsColor("--terminal-fg", "#3f3f46");
  const cursor = readCssVarAsColor("--terminal-cursor", "#52525b");
  const selectionBackground = readCssVarAsColor("--terminal-selection-bg", "#e4e4e7");
  const selectionForeground = readCssVarAsColor("--terminal-selection-fg", foreground);
  const black = readCssVarAsColor("--terminal-ansi-black", "#52525b");
  const red = readCssVarAsColor("--terminal-ansi-red", "#dc2626");
  const green = readCssVarAsColor("--terminal-ansi-green", "#16a34a");
  const yellow = readCssVarAsColor("--terminal-ansi-yellow", "#ca8a04");
  const blue = readCssVarAsColor("--terminal-ansi-blue", "#2563eb");
  const magenta = readCssVarAsColor("--terminal-ansi-magenta", "#9333ea");
  const cyan = readCssVarAsColor("--terminal-ansi-cyan", "#0891b2");
  const white = readCssVarAsColor("--terminal-ansi-white", foreground);
  const brightBlack = readCssVarAsColor("--terminal-ansi-bright-black", "#71717a");
  const brightRed = readCssVarAsColor("--terminal-ansi-bright-red", "#ef4444");
  const brightGreen = readCssVarAsColor("--terminal-ansi-bright-green", "#22c55e");
  const brightYellow = readCssVarAsColor("--terminal-ansi-bright-yellow", "#eab308");
  const brightBlue = readCssVarAsColor("--terminal-ansi-bright-blue", "#3b82f6");
  const brightMagenta = readCssVarAsColor("--terminal-ansi-bright-magenta", "#a855f7");
  const brightCyan = readCssVarAsColor("--terminal-ansi-bright-cyan", "#06b6d4");
  const brightWhite = readCssVarAsColor("--terminal-ansi-bright-white", foreground);
  return {
    background,
    foreground,
    cursor,
    cursorAccent: background,
    selectionBackground,
    selectionForeground,
    black,
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
    brightBlack,
    brightRed,
    brightGreen,
    brightYellow,
    brightBlue,
    brightMagenta,
    brightCyan,
    brightWhite
  };
}
const WORKBENCH_MONO_FONT = '"JetBrains Mono", "SF Mono", ui-monospace, "Cascadia Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const WORKBENCH_TERMINAL_FONT_SIZE = 13;
const WORKBENCH_TERMINAL_LINE_HEIGHT = 1.35;
const WS_URL = "ws://127.0.0.1:18789";
function isOpenTerminalMessage(text2) {
  const t = text2.trim();
  if (!t || t.length > 80) return false;
  if (/^(?:\/terminal|\/term)\b/i.test(t)) return true;
  return /^(?:打开|开启|显示|切换)\s*(?:集成)?终端$/i.test(t) || /(?:打开|开启|显示|切换).*(?:终端|terminal|命令行)/i.test(t);
}
function connectWorkspaceTerminal(handlers2) {
  let ws = null;
  let open = false;
  const shell = handlers2.shell;
  const send = (payload) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };
  const start = () => {
    send({
      type: "terminal:start",
      cwd: handlers2.cwd,
      shell,
      cols: handlers2.cols ?? 80,
      rows: handlers2.rows ?? 24
    });
  };
  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    handlers2.onError?.(e instanceof Error ? e.message : String(e));
    return {
      sendInput: () => {
      },
      resize: () => {
      },
      restart: () => {
      },
      kill: () => {
      },
      close: () => {
      }
    };
  }
  ws.onopen = () => {
    open = true;
    handlers2.onOpen?.();
    start();
  };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      if (msg.type?.startsWith("terminal:")) handlers2.onMessage(msg);
    } catch {
    }
  };
  ws.onerror = () => {
    handlers2.onError?.(`连接失败：${BRIDGE_OFFLINE_TOAST}`);
  };
  ws.onclose = () => {
    open = false;
    handlers2.onClose?.();
  };
  return {
    sendInput: (data) => send({ type: "terminal:input", data }),
    resize: (cols, rows) => send({ type: "terminal:resize", cols, rows }),
    restart: () => {
      if (open) start();
    },
    kill: () => send({ type: "terminal:kill" }),
    close: () => {
      try {
        send({ type: "terminal:kill" });
        ws?.close();
      } catch {
      }
      ws = null;
    }
  };
}
function getTerminalSelectionLineRange(term) {
  try {
    const pos = term.getSelectionPosition?.();
    if (!pos) return void 0;
    const buf = term.buffer.active;
    const startRow = buf.baseY + Math.min(pos.start.y, pos.end.y) + 1;
    const endRow = buf.baseY + Math.max(pos.start.y, pos.end.y) + 1;
    return { startLine: startRow, endLine: endRow };
  } catch {
    return void 0;
  }
}
function inferTerminalSourceLabel(shellLabel, selectionText) {
  const t = selectionText.toLowerCase();
  if (/\[vite\]|npm run|node:|node\.js|\bnode\b/.test(t)) return "node";
  if (/\bpython\b|flask|django|uvicorn/.test(t)) return "python";
  if (/\bbash\b/.test(t)) return "bash";
  const base = shellLabel.trim().toLowerCase();
  if (base) return base.split("/").pop() || base;
  return "terminal";
}
function formatTerminalChipLabel(payload) {
  const name2 = payload.sourceLabel || "terminal";
  if (payload.startLine != null && payload.endLine != null) {
    return `${name2} (${payload.startLine}-${payload.endLine})`;
  }
  return name2;
}
function TerminalAddToChatButton({
  onClick,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: (e) => {
        e.stopPropagation();
        onClick();
      },
      className: cn(
        "pointer-events-auto absolute right-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-popover/95 px-2 py-1 text-[11px] font-medium text-foreground shadow-md backdrop-blur-sm transition hover:bg-secondary",
        className
      ),
      title: "添加到对话 (⌘L)",
      "aria-label": "添加到对话",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCirclePlus, { className: "h-3 w-3 shrink-0 text-muted-foreground", "aria-hidden": true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Add to Chat" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { className: "rounded border border-border/60 bg-muted/50 px-1 py-px font-mono text-[10px] leading-none text-muted-foreground", children: "⌘L" })
      ]
    }
  );
}
const MIN_TERMINAL_COLS = 24;
const MIN_TERMINAL_ROWS = 2;
const MIN_HOST_WIDTH = 48;
const MIN_HOST_HEIGHT = 16;
function hostReadyForFit(host) {
  return host.clientWidth >= MIN_HOST_WIDTH && host.clientHeight >= MIN_HOST_HEIGHT;
}
function terminalDimensionsReady(term, host) {
  return hostReadyForFit(host) && term.cols >= MIN_TERMINAL_COLS && term.rows >= MIN_TERMINAL_ROWS;
}
async function loadXtermModules() {
  const [xtermMod, fitMod] = await Promise.all([
    import("./xterm-BGxllGZi.js").then((n) => n.x),
    import("./addon-fit-DBaEb8h4.js").then((n) => n.a)
  ]);
  await Promise.resolve({          });
  const xtermPkg = xtermMod;
  const fitPkg = fitMod;
  const TerminalCtor = xtermPkg.Terminal ?? xtermPkg.default?.Terminal ?? xtermPkg.default;
  const FitAddonCtor = fitPkg.FitAddon ?? fitPkg.default?.FitAddon ?? fitPkg.default;
  if (!TerminalCtor || !FitAddonCtor) {
    throw new Error("无法加载 xterm 模块");
  }
  return {
    Terminal: TerminalCtor,
    FitAddon: FitAddonCtor
  };
}
function shortenHomeInPath(abs) {
  const m = abs.match(/^(\/Users\/[^/]+)(\/.*)?$/);
  if (m) return `~${m[2] ?? ""}` || "~";
  const w = abs.match(/^(\/home\/[^/]+)(\/.*)?$/);
  if (w) return `~${w[2] ?? ""}` || "~";
  return abs;
}
function clearTerminalHost(host) {
  host.replaceChildren();
}
function waitForTerminalFit(fit, term, host, maxAttempts = 20) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      if (n >= maxAttempts) {
        resolve();
        return;
      }
      if (host.clientHeight < MIN_HOST_HEIGHT || host.clientWidth < MIN_HOST_WIDTH) {
        requestAnimationFrame(() => attempt(n + 1));
        return;
      }
      try {
        fit.fit();
      } catch {
        requestAnimationFrame(() => attempt(n + 1));
        return;
      }
      const ready = terminalDimensionsReady(term, host);
      if (ready || n >= maxAttempts - 1) resolve();
      else requestAnimationFrame(() => attempt(n + 1));
    };
    requestAnimationFrame(() => attempt(0));
  });
}
function syncTerminalSize(fit, term, session, attempt = 0) {
  try {
    const host = term.element?.parentElement;
    if (!host || !hostReadyForFit(host)) {
      if (attempt < 24) {
        requestAnimationFrame(() => syncTerminalSize(fit, term, session, attempt + 1));
      }
      return;
    }
    const prevRows = term.rows;
    const prevCols = term.cols;
    fit.fit();
    if (!terminalDimensionsReady(term, host)) {
      if (attempt < 24) {
        requestAnimationFrame(() => syncTerminalSize(fit, term, session, attempt + 1));
      }
      return;
    }
    if (term.rows !== prevRows || term.cols !== prevCols) {
      session?.resize(term.cols, term.rows);
    }
    term.scrollToBottom();
  } catch {
    if (attempt < 24) {
      requestAnimationFrame(() => syncTerminalSize(fit, term, session, attempt + 1));
    }
  }
}
const WorkspaceTerminal = reactExports.forwardRef(function WorkspaceTerminal2({
  active,
  keepAlive = false,
  visible = true,
  focused = true,
  shell,
  variant = "sidebar",
  hideChrome = false,
  onMetaChange,
  renderChrome
}, ref) {
  const shellPathRef = reactExports.useRef(shell);
  shellPathRef.current = shell;
  const hasDesktop = useHasDesktop();
  const composerBridge = useWorkbenchComposerBridgeOptional();
  const { resolved: themeResolved } = useTheme();
  const containerRef = reactExports.useRef(null);
  const termRef = reactExports.useRef(null);
  const fitRef = reactExports.useRef(null);
  const sessionRef = reactExports.useRef(null);
  const mountGenRef = reactExports.useRef(0);
  const activeRef = reactExports.useRef(active);
  activeRef.current = active;
  const disposingRef = reactExports.useRef(false);
  const resizeDebounceRef = reactExports.useRef(null);
  const selectionDisposableRef = reactExports.useRef(null);
  const [selectionText, setSelectionText] = reactExports.useState("");
  const [cwdLabel, setCwdLabel] = reactExports.useState("（加载工作区…）");
  const [cwdFull, setCwdFull] = reactExports.useState(null);
  const [shellLabel, setShellLabel] = reactExports.useState("zsh");
  const [status, setStatus] = reactExports.useState("idle");
  const [hint, setHint] = reactExports.useState(null);
  const meta = { cwdLabel, cwdFull, shellLabel, status, hint };
  reactExports.useEffect(() => {
    onMetaChange?.(meta);
  }, [cwdLabel, cwdFull, shellLabel, status, hint, onMetaChange]);
  const teardown = () => {
    if (resizeDebounceRef.current) {
      clearTimeout(resizeDebounceRef.current);
      resizeDebounceRef.current = null;
    }
    selectionDisposableRef.current?.dispose();
    selectionDisposableRef.current = null;
    setSelectionText("");
    sessionRef.current?.close();
    sessionRef.current = null;
    termRef.current?.dispose();
    termRef.current = null;
    fitRef.current = null;
    if (containerRef.current) clearTerminalHost(containerRef.current);
  };
  const schedulePtyResize = reactExports.useCallback((cols, rows) => {
    if (cols < MIN_TERMINAL_COLS || rows < MIN_TERMINAL_ROWS) return;
    if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
    resizeDebounceRef.current = setTimeout(() => {
      resizeDebounceRef.current = null;
      sessionRef.current?.resize(cols, rows);
    }, 120);
  }, []);
  const applyTheme = reactExports.useCallback(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.theme = buildXtermTheme();
    if (term.rows > 0) term.refresh(0, term.rows - 1);
  }, [themeResolved]);
  const mountTerminal = async (mountGen, opts) => {
    if (!active || !hasDesktop || !containerRef.current) return;
    if (mountGen !== mountGenRef.current) return;
    if (termRef.current && sessionRef.current && keepAlive && !opts?.clearScreen) {
      applyTheme();
      const term2 = termRef.current;
      const fit2 = fitRef.current;
      const host2 = containerRef.current;
      if (term2 && fit2 && host2) {
        void waitForTerminalFit(fit2, term2, host2).then(() => {
          if (mountGen !== mountGenRef.current) return;
          syncTerminalSize(fit2, term2, sessionRef.current);
          if (visible && focused) term2.focus();
        });
      }
      return;
    }
    teardown();
    if (mountGen !== mountGenRef.current) return;
    disposingRef.current = false;
    setStatus("connecting");
    setHint(null);
    let cwd2;
    try {
      const api = getDesktop();
      const ws = api ? await api.getWorkspace() : null;
      if (mountGen !== mountGenRef.current) return;
      if (ws) {
        cwd2 = ws;
        setCwdFull(ws);
        setCwdLabel(shortenHomeInPath(ws));
      } else {
        setCwdFull(null);
        setCwdLabel("（未选择工作区，使用默认目录）");
      }
    } catch {
      if (mountGen !== mountGenRef.current) return;
      setCwdFull(null);
      setCwdLabel("（无法读取工作区）");
    }
    const { Terminal: TerminalCtor, FitAddon: FitAddonCtor } = await loadXtermModules();
    if (mountGen !== mountGenRef.current || !containerRef.current) return;
    const host = containerRef.current;
    clearTerminalHost(host);
    const term = new TerminalCtor({
      cursorBlink: true,
      cursorStyle: "block",
      cursorWidth: 1,
      fontSize: WORKBENCH_TERMINAL_FONT_SIZE,
      lineHeight: WORKBENCH_TERMINAL_LINE_HEIGHT,
      fontFamily: WORKBENCH_MONO_FONT,
      letterSpacing: 0,
      theme: buildXtermTheme(),
      scrollback: 1e4,
      allowTransparency: false,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      fastScrollModifier: "alt"
    });
    const fit = new FitAddonCtor();
    term.loadAddon(fit);
    term.open(host);
    if (opts?.clearScreen) term.clear();
    await waitForTerminalFit(fit, term, host);
    if (mountGen !== mountGenRef.current) {
      term.dispose();
      clearTerminalHost(host);
      return;
    }
    termRef.current = term;
    fitRef.current = fit;
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      if (mod && key === "c" && term.hasSelection()) return false;
      if (mod && key === "v") return false;
      return true;
    });
    const onMsg = (msg) => {
      if (mountGen !== mountGenRef.current) return;
      if (msg.type === "terminal:output") {
        term.write(msg.data);
        term.scrollToBottom();
        const plain = msg.data.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
        if (plain.trim()) {
          appendOutputRaw("terminal", plain);
          scanTextForPorts(plain, "终端");
        }
      } else if (msg.type === "terminal:started") {
        setStatus("ready");
        if (msg.cwd) {
          setCwdFull(msg.cwd);
          setCwdLabel(shortenHomeInPath(msg.cwd));
        }
        if (msg.shell) {
          const base = msg.shell.split("/").pop() || msg.shell;
          setShellLabel(base);
        }
        if (msg.warning) setHint(msg.warning);
        term.scrollToBottom();
      } else if (msg.type === "terminal:error") {
        setStatus("error");
        setHint(msg.error || "终端启动失败");
        term.writeln(`\r
\x1B[31m[terminal] ${msg.error || "error"}\x1B[0m`);
      } else if (msg.type === "terminal:exit") {
        if (disposingRef.current || mountGen !== mountGenRef.current) return;
        setStatus("connecting");
        session.restart();
      }
    };
    const cols = term.cols;
    const rows = term.rows;
    const session = connectWorkspaceTerminal({
      cwd: cwd2,
      shell: shellPathRef.current,
      cols,
      rows,
      onMessage: onMsg,
      onOpen: () => setStatus("connecting"),
      onClose: () => setStatus("closed"),
      onError: (err) => {
        setStatus("error");
        setHint(err);
      }
    });
    sessionRef.current = session;
    term.onData((data) => session.sendInput(data));
    selectionDisposableRef.current?.dispose();
    selectionDisposableRef.current = term.onSelectionChange(() => {
      if (mountGen !== mountGenRef.current) return;
      const sel = term.getSelection()?.trim() ?? "";
      setSelectionText(sel);
    });
    const ro = new ResizeObserver(() => {
      if (mountGen !== mountGenRef.current) return;
      if (!activeRef.current) return;
      try {
        if (!hostReadyForFit(host)) return;
        const prevRows = term.rows;
        const prevCols = term.cols;
        fit.fit();
        if (!terminalDimensionsReady(term, host)) return;
        if (term.rows !== prevRows || term.cols !== prevCols) {
          schedulePtyResize(term.cols, term.rows);
        }
        term.scrollToBottom();
      } catch {
      }
    });
    ro.observe(host);
    const parentEl = host.parentElement;
    if (parentEl) ro.observe(parentEl);
    return () => {
      ro.disconnect();
    };
  };
  reactExports.useEffect(() => {
    if (!active) {
      if (!keepAlive) {
        mountGenRef.current += 1;
        teardown();
        setStatus("idle");
      }
      return;
    }
    const mountGen = ++mountGenRef.current;
    let cleanupResize;
    void mountTerminal(mountGen).then((fn) => {
      if (mountGen === mountGenRef.current) cleanupResize = fn;
    });
    return () => {
      if (!keepAlive) {
        mountGenRef.current += 1;
        cleanupResize?.();
        teardown();
      }
    };
  }, [active, keepAlive, hasDesktop, shell]);
  reactExports.useEffect(() => {
    if (!active || !visible || !termRef.current) return;
    const term = termRef.current;
    const fit = fitRef.current;
    const host = containerRef.current;
    if (!fit || !host) return;
    let cancelled = false;
    void waitForTerminalFit(fit, term, host).then(() => {
      if (cancelled) return;
      syncTerminalSize(fit, term, sessionRef.current);
      if (focused) term.focus();
    });
    return () => {
      cancelled = true;
    };
  }, [active, visible, focused]);
  reactExports.useEffect(() => {
    applyTheme();
  }, [applyTheme, themeResolved]);
  reactExports.useEffect(() => () => teardown(), []);
  const restart = reactExports.useCallback(() => {
    disposingRef.current = false;
    const mountGen = ++mountGenRef.current;
    void mountTerminal(mountGen, { clearScreen: true });
  }, [active, hasDesktop, themeResolved]);
  const kill = reactExports.useCallback(() => {
    sessionRef.current?.kill();
  }, []);
  const dispose = reactExports.useCallback(() => {
    disposingRef.current = true;
    mountGenRef.current += 1;
    teardown();
    setStatus("idle");
  }, []);
  const focus = reactExports.useCallback(() => {
    try {
      const term = termRef.current;
      const fit = fitRef.current;
      if (term && fit) syncTerminalSize(fit, term, sessionRef.current);
      term?.focus();
    } catch {
    }
  }, []);
  const clear = reactExports.useCallback(() => {
    termRef.current?.clear();
  }, []);
  const runCommand = reactExports.useCallback(
    (command) => {
      const line = command.trim();
      if (!line || status !== "ready" || !sessionRef.current) return false;
      sessionRef.current.sendInput(`${line}\r`);
      termRef.current?.scrollToBottom();
      termRef.current?.focus();
      return true;
    },
    [status]
  );
  const isReady = reactExports.useCallback(() => status === "ready" && Boolean(sessionRef.current), [status]);
  reactExports.useImperativeHandle(
    ref,
    () => ({ restart, kill, dispose, focus, clear, runCommand, isReady }),
    [restart, kill, dispose, focus, clear, runCommand, isReady]
  );
  const addSelectionToChat = reactExports.useCallback(() => {
    const term = termRef.current;
    const text2 = term?.getSelection()?.trim() ?? selectionText.trim();
    if (!text2 || !composerBridge) return;
    const lineRange = term ? getTerminalSelectionLineRange(term) : void 0;
    composerBridge.addTerminalSelectionToChat({
      text: text2,
      sourceLabel: inferTerminalSourceLabel(shellLabel, text2),
      startLine: lineRange?.startLine,
      endLine: lineRange?.endLine
    });
    term?.clearSelection();
    setSelectionText("");
  }, [composerBridge, selectionText, shellLabel]);
  reactExports.useEffect(() => {
    if (!active || !composerBridge) return;
    const onKey = (ev) => {
      if (!(ev.metaKey || ev.ctrlKey) || ev.key.toLowerCase() !== "l") return;
      const term = termRef.current;
      if (!term?.hasSelection()) return;
      const sel = term.getSelection()?.trim();
      if (!sel) return;
      ev.preventDefault();
      addSelectionToChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, composerBridge, addSelectionToChat]);
  if (!hasDesktop) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 text-[12px] text-muted-foreground", children: TERMINAL_OFFLINE });
  }
  const isPanel = variant === "panel";
  const showInlineChrome = isPanel && renderChrome && !hideChrome;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full w-full min-h-0 flex-col", children: [
    showInlineChrome ? renderChrome({ meta, restart, kill, focus }) : null,
    variant === "sidebar" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SquareTerminal, { className: "h-3.5 w-3.5 text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground",
            title: cwdLabel,
            children: cwdLabel
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: cn(
              "text-[10px]",
              status === "ready" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            ),
            children: status === "ready" ? "已连接" : status === "connecting" ? "连接中…" : status === "error" ? "错误" : "未连接"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: restart,
            className: "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground",
            title: "重启终端",
            "aria-label": "重启终端",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "h-3.5 w-3.5" })
          }
        )
      ] }),
      hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 border-b border-border px-2 py-1 text-[10.5px] text-amber-700 dark:text-amber-300", children: hint }) : null
    ] }) : null,
    variant === "bottom" && hint ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "shrink-0 border-b border-border px-2 py-1 text-[10px] text-amber-700 dark:text-amber-300", children: hint }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-0 flex-1", children: [
      active && selectionText && composerBridge ? /* @__PURE__ */ jsxRuntimeExports.jsx(TerminalAddToChatButton, { onClick: addSelectionToChat }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          ref: containerRef,
          className: cn(
            "workbench-xterm workbench-xterm--panel min-h-0 h-full w-full overflow-hidden",
            isPanel ? "bg-[var(--terminal-bg)]" : "bg-code-bg p-2",
            !visible && "hidden"
          ),
          onClick: focus
        }
      )
    ] })
  ] });
});
function newSessionId() {
  return `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function createSession(shell = resolveShellPath(getDefaultTerminalShell()) ?? "/bin/zsh") {
  return {
    id: newSessionId(),
    label: shellDisplayLabel(shell),
    shell
  };
}
function TerminalSessionsView({
  panelActive,
  onActiveMetaChange,
  onRegisterActions,
  onRegisterHeader
}) {
  const initial = reactExports.useRef(createSession()).current;
  const [sessions, setSessions] = reactExports.useState([initial]);
  const [activeId, setActiveId] = reactExports.useState(initial.id);
  const [splitPeerId, setSplitPeerId] = reactExports.useState(null);
  const [focusedPaneId, setFocusedPaneId] = reactExports.useState(initial.id);
  const refs = reactExports.useRef(/* @__PURE__ */ new Map());
  const setRef = reactExports.useCallback(
    (id) => (handle2) => {
      if (handle2) refs.current.set(id, handle2);
      else refs.current.delete(id);
    },
    []
  );
  const handleFor = (id) => refs.current.get(id) ?? null;
  const focusedHandle = () => handleFor(focusedPaneId) ?? handleFor(activeId);
  const addSession = reactExports.useCallback((shell) => {
    const path2 = resolveShellPath(shell) ?? resolveShellPath(getDefaultTerminalShell()) ?? "/bin/zsh";
    const session = createSession(path2);
    setSessions((prev) => [...prev, session]);
    setActiveId(session.id);
    setFocusedPaneId(session.id);
    setSplitPeerId(null);
  }, []);
  const splitActive = reactExports.useCallback(() => {
    const current = sessions.find((s) => s.id === activeId);
    if (!current) return;
    if (splitPeerId) {
      addSession(current.shell);
      return;
    }
    const peer = createSession(current.shell);
    setSessions((prev) => [...prev, peer]);
    setSplitPeerId(peer.id);
    setFocusedPaneId(peer.id);
  }, [activeId, addSession, sessions, splitPeerId]);
  const splitSession = reactExports.useCallback(
    (id) => {
      const current = sessions.find((s) => s.id === id);
      if (!current) return;
      setActiveId(id);
      setFocusedPaneId(id);
      if (splitPeerId) {
        addSession(current.shell);
        return;
      }
      const peer = createSession(current.shell);
      setSessions((prev) => [...prev, peer]);
      setSplitPeerId(peer.id);
      setFocusedPaneId(peer.id);
    },
    [addSession, sessions, splitPeerId]
  );
  const restartActive = reactExports.useCallback(() => {
    focusedHandle()?.restart();
  }, [focusedPaneId, activeId]);
  const killActive = reactExports.useCallback(() => {
    focusedHandle()?.kill();
  }, [focusedPaneId, activeId]);
  const closeSession = reactExports.useCallback(
    (id) => {
      handleFor(id)?.dispose();
      if (splitPeerId === id) setSplitPeerId(null);
      else if (splitPeerId === activeId && id === activeId) setSplitPeerId(null);
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (!next.length) {
          const fresh = createSession();
          setActiveId(fresh.id);
          setFocusedPaneId(fresh.id);
          setSplitPeerId(null);
          return [fresh];
        }
        if (id === activeId) {
          const idx = prev.findIndex((s) => s.id === id);
          const fallback = next[Math.max(0, idx - 1)] ?? next[0];
          setActiveId(fallback.id);
          setFocusedPaneId(fallback.id);
        } else if (id === focusedPaneId) {
          setFocusedPaneId(activeId);
        }
        return next;
      });
      refs.current.delete(id);
    },
    [activeId, focusedPaneId, splitPeerId]
  );
  const closeActive = reactExports.useCallback(() => {
    closeSession(focusedPaneId);
  }, [closeSession, focusedPaneId]);
  const refitVisible = reactExports.useCallback(() => {
    const ids = splitPeerId ? [activeId, splitPeerId] : [activeId];
    for (const id of ids) {
      refs.current.get(id)?.focus();
    }
  }, [activeId, splitPeerId]);
  const selectSession = reactExports.useCallback((id) => {
    setActiveId(id);
    setFocusedPaneId(id);
    setSplitPeerId(null);
  }, []);
  reactExports.useEffect(() => {
    onRegisterActions({
      addSession,
      restartActive,
      killActive,
      closeActive,
      splitActive,
      refitActive: refitVisible
    });
  }, [addSession, restartActive, killActive, closeActive, splitActive, refitVisible, onRegisterActions]);
  reactExports.useEffect(() => {
    onRegisterHeader({
      sessions,
      activeId,
      selectSession,
      closeSession,
      addSession,
      splitActive,
      killActive,
      restartActive,
      closeActive
    });
    return () => onRegisterHeader(null);
  }, [
    sessions,
    activeId,
    selectSession,
    closeSession,
    addSession,
    splitActive,
    killActive,
    restartActive,
    closeActive,
    onRegisterHeader
  ]);
  reactExports.useEffect(() => {
    registerWorkbenchTerminalRunHandlers({
      runInActive: (command) => focusedHandle()?.runCommand(command) ?? false,
      ensureSession: () => {
        if (!sessions.length) addSession();
      },
      isActiveReady: () => focusedHandle()?.isReady() ?? false
    });
    return () => registerWorkbenchTerminalRunHandlers(null);
  }, [addSession, sessions.length, activeId, focusedPaneId]);
  reactExports.useEffect(() => {
    if (!panelActive || !focusedPaneId) return;
    const t = window.setTimeout(() => handleFor(focusedPaneId)?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [panelActive, focusedPaneId, sessions.length, splitPeerId]);
  const onSessionMeta = reactExports.useCallback(
    (sessionId, meta) => {
      setSessions((prev) => {
        const target = prev.find((s) => s.id === sessionId);
        const nextLabel = meta.shellLabel || target?.label || "";
        if (!target || target.label === nextLabel) return prev;
        return prev.map((s) => s.id === sessionId ? { ...s, label: nextLabel } : s);
      });
      if (sessionId === activeId || sessionId === focusedPaneId) {
        onActiveMetaChange(meta);
      }
    },
    [activeId, focusedPaneId, onActiveMetaChange]
  );
  const paneIds = splitPeerId ? [activeId, splitPeerId] : [activeId];
  const hiddenIds = sessions.map((s) => s.id).filter((id) => !paneIds.includes(id));
  const showRail = sessions.length > 1 && !splitPeerId;
  const renderTerminal = (sessionId, visible, focused) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      WorkspaceTerminal,
      {
        ref: setRef(session.id),
        active: panelActive,
        keepAlive: true,
        visible,
        focused,
        shell: session.shell,
        variant: "panel",
        hideChrome: true,
        onMetaChange: (meta) => onSessionMeta(session.id, meta)
      },
      session.id
    );
  };
  const terminalBody = /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    splitPeerId ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full min-h-0 w-full", children: paneIds.map((id, index2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(reactExports.Fragment, { children: [
      index2 > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "terminal-split-divider", "aria-hidden": true }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: cn(
            "terminal-pane relative min-h-0 min-w-0 flex-1 overflow-hidden",
            focusedPaneId === id && "terminal-pane--focused"
          ),
          onMouseDown: () => setFocusedPaneId(id),
          children: renderTerminal(id, true, focusedPaneId === id)
        }
      )
    ] }, id)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0", children: renderTerminal(activeId, true, true) }),
    hiddenIds.map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden", "aria-hidden": true, children: renderTerminal(id, false, false) }, id))
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 w-full overflow-hidden bg-[var(--terminal-bg)]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative min-h-0 min-w-0 flex-1 overflow-hidden", children: terminalBody }),
    showRail ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      TerminalSessionRail,
      {
        sessions,
        activeId,
        onSelect: selectSession,
        onClose: closeSession,
        onSplit: splitSession
      }
    ) : null
  ] });
}
function TerminalSessionPicker({
  sessions,
  activeId,
  onSelect
}) {
  if (sessions.length !== 1) return null;
  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];
  if (!active) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: "inline-flex max-w-[9rem] items-center gap-1 rounded px-1.5 py-1 font-mono text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground",
        title: `终端: ${active.label}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SquareTerminal, { className: "h-3 w-3 shrink-0 opacity-70" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: active.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3 shrink-0 opacity-60" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "min-w-[10rem]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { disabled: true, className: "font-mono text-[11px]", children: active.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
      sessions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => onSelect(s.id), children: s.label }, s.id))
    ] })
  ] });
}
const PANEL_TABS = [
  { id: "problems", label: "问题" },
  { id: "output", label: "输出" },
  { id: "debug", label: "调试控制台" },
  { id: "terminal", label: "终端" },
  { id: "ports", label: "端口" }
];
const DEFAULT_SEVERITY_FILTER = { errors: true, warnings: true };
function channelLabel(id) {
  return OUTPUT_CHANNELS.find((c) => c.id === id)?.label ?? id;
}
function WorkbenchBottomPanel({ onClose }) {
  const { problems, errorCount, warningCount, lintOpenFiles, linting } = useWorkbenchProblems();
  const ws = useWorkbenchWorkspace();
  const terminalActionsRef = reactExports.useRef(null);
  const [terminalHeader, setTerminalHeader] = reactExports.useState(null);
  const [activeTab, setActiveTab] = reactExports.useState("terminal");
  const [meta, setMeta] = reactExports.useState({
    cwdLabel: "（加载工作区…）",
    cwdFull: null,
    shellLabel: "zsh",
    status: "idle",
    hint: null
  });
  const [problemsFilter, setProblemsFilter] = reactExports.useState("");
  const [problemsSeverity, setProblemsSeverity] = reactExports.useState(DEFAULT_SEVERITY_FILTER);
  const [outputFilter, setOutputFilter] = reactExports.useState("");
  const [outputChannel, setOutputChannel] = reactExports.useState("workbench");
  const [debugFilter, setDebugFilter] = reactExports.useState("");
  const [debugInput, setDebugInput] = reactExports.useState("");
  const [outputScrollLock, setOutputScrollLock] = reactExports.useState(false);
  const outputEndRef = reactExports.useRef(null);
  const prevErrorCountRef = reactExports.useRef(0);
  const outputSnapshot = reactExports.useSyncExternalStore(subscribeOutputLog, getOutputSnapshot, getOutputSnapshot);
  const debugEntries = reactExports.useSyncExternalStore(subscribeDebugLog, getDebugEntries, getDebugEntries);
  const forwardedPorts = reactExports.useSyncExternalStore(subscribePorts, getForwardedPorts, getForwardedPorts);
  const relintOpenFiles = reactExports.useCallback(async () => {
    const paths = ws.editorTabs.filter(isFileTab).map((t) => t.relPath);
    if (!paths.length) {
      toast.message("没有已打开的文件可检查");
      return;
    }
    await lintOpenFiles(paths);
    toast.success(`已重新检查 ${paths.length} 个打开的文件`);
  }, [lintOpenFiles, ws.editorTabs]);
  reactExports.useEffect(() => {
    if (errorCount > 0 && prevErrorCountRef.current === 0) {
      setActiveTab("problems");
    }
    prevErrorCountRef.current = errorCount;
  }, [errorCount]);
  const onMetaChange = reactExports.useCallback((next) => {
    setMeta(
      (prev) => prev.cwdLabel === next.cwdLabel && prev.cwdFull === next.cwdFull && prev.shellLabel === next.shellLabel && prev.status === next.status && prev.hint === next.hint ? prev : next
    );
  }, []);
  const registerTerminalActions = reactExports.useCallback(
    (actions) => {
      terminalActionsRef.current = actions;
    },
    []
  );
  const registerTerminalHeader = reactExports.useCallback((state2) => {
    setTerminalHeader((prev) => {
      if (prev === state2) return prev;
      if (!prev || !state2) return state2;
      if (prev.activeId === state2.activeId && prev.sessions === state2.sessions && prev.selectSession === state2.selectSession && prev.closeSession === state2.closeSession && prev.addSession === state2.addSession && prev.splitActive === state2.splitActive && prev.killActive === state2.killActive && prev.restartActive === state2.restartActive && prev.closeActive === state2.closeActive) {
        return prev;
      }
      return state2;
    });
  }, []);
  const focusTerminal = reactExports.useCallback(() => {
    setActiveTab("terminal");
  }, []);
  reactExports.useEffect(() => {
    registerWorkbenchTerminalFocusTab(focusTerminal);
    return () => registerWorkbenchTerminalFocusTab(null);
  }, [focusTerminal]);
  reactExports.useEffect(() => {
    if (activeTab !== "terminal") return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        terminalActionsRef.current?.refitActive();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeTab]);
  reactExports.useEffect(() => {
    if (outputScrollLock || activeTab !== "output") return;
    outputEndRef.current?.scrollIntoView({ block: "end" });
  }, [outputSnapshot, outputChannel, activeTab, outputScrollLock]);
  const copyPath = async () => {
    const text2 = meta.cwdFull || meta.cwdLabel;
    try {
      await navigator.clipboard.writeText(text2);
      toast.success("已复制工作区路径");
    } catch {
      toast.error("复制失败");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workbench-bottom-panel relative z-0 flex h-full min-h-0 flex-col border-t border-border bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PanelHeader,
      {
        activeTab,
        onTabChange: setActiveTab,
        onClose,
        errorCount,
        warningCount,
        problems,
        problemsFilter,
        onProblemsFilterChange: setProblemsFilter,
        problemsSeverity,
        onProblemsSeverityChange: setProblemsSeverity,
        onRelintOpenFiles: () => void relintOpenFiles(),
        linting,
        outputFilter,
        onOutputFilterChange: setOutputFilter,
        outputChannel,
        onOutputChannelChange: setOutputChannel,
        debugFilter,
        onDebugFilterChange: setDebugFilter,
        onClearDebug: () => {
          clearDebugLog();
          toast.success("调试控制台已清除");
        },
        outputScrollLock,
        onOutputScrollLockToggle: () => setOutputScrollLock((v) => !v),
        onClearOutput: () => {
          clearOutput(outputChannel);
          toast.success(`已清除「${channelLabel(outputChannel)}」输出`);
        },
        onNewTerminal: (shell) => {
          focusTerminal();
          terminalActionsRef.current?.addSession(shell);
        },
        onSplitTerminal: () => {
          focusTerminal();
          terminalActionsRef.current?.splitActive();
        },
        onRestartTerminal: () => {
          focusTerminal();
          terminalActionsRef.current?.restartActive();
        },
        onKillTerminal: () => terminalActionsRef.current?.closeActive(),
        onCopyPath: copyPath,
        terminalHeader,
        terminalHint: meta.hint
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative min-h-0 flex-1 overflow-hidden bg-background", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-full min-h-0", activeTab !== "terminal" && "hidden"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        TerminalSessionsView,
        {
          panelActive: activeTab === "terminal",
          onActiveMetaChange: onMetaChange,
          onRegisterActions: registerTerminalActions,
          onRegisterHeader: registerTerminalHeader
        }
      ) }),
      activeTab === "problems" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ProblemsView, { filter: problemsFilter, severity: problemsSeverity, problems }) : null,
      activeTab === "output" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        OutputView,
        {
          filter: outputFilter,
          lines: outputSnapshot[outputChannel] ?? [],
          endRef: outputEndRef
        }
      ) : null,
      activeTab === "debug" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        DebugConsoleView,
        {
          filter: debugFilter,
          entries: debugEntries,
          input: debugInput,
          onInputChange: setDebugInput
        }
      ) : null,
      activeTab === "ports" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PortsView, { ports: forwardedPorts }) : null
    ] })
  ] });
}
function PanelHeader({
  activeTab,
  onTabChange,
  onClose,
  errorCount,
  warningCount,
  problems,
  problemsFilter,
  onProblemsFilterChange,
  problemsSeverity,
  onProblemsSeverityChange,
  onRelintOpenFiles,
  linting,
  outputFilter,
  onOutputFilterChange,
  outputChannel,
  onOutputChannelChange,
  debugFilter,
  onDebugFilterChange,
  onClearDebug,
  outputScrollLock,
  onOutputScrollLockToggle,
  onClearOutput,
  onNewTerminal,
  onSplitTerminal,
  onRestartTerminal,
  onKillTerminal,
  onCopyPath,
  terminalHeader,
  terminalHint
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workbench-bottom-panel-header flex h-[35px] shrink-0 items-stretch gap-0 border-b border-border bg-surface-elevated/95", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto scrollbar-thin pl-1", children: PANEL_TABS.map((tab2) => {
      const active = tab2.id === activeTab;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => onTabChange(tab2.id),
          className: cn(
            "shrink-0 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide transition",
            active ? "border-b-2 border-primary text-foreground" : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
          ),
          "aria-current": active ? "true" : void 0,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: tab2.label }),
            tab2.id === "problems" && (errorCount > 0 || warningCount > 0) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: cn(
                  "ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums",
                  errorCount > 0 ? "bg-destructive/90 text-destructive-foreground" : "bg-amber-500/90 text-white"
                ),
                children: errorCount > 0 ? errorCount : warningCount
              }
            ) : null
          ]
        },
        tab2.id
      );
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", "aria-hidden": true }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 shrink-0 items-center justify-end gap-0.5 pr-0.5", children: [
      activeTab === "problems" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FilterInput,
          {
            value: problemsFilter,
            onChange: onProblemsFilterChange,
            placeholder: "筛选 (例如 text, **/*.ts, !**/node_modules/**)",
            className: "max-w-[min(100%,22rem)]"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(HeaderIcon, { title: "筛选选项", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "h-3.5 w-3.5" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                onClick: () => onProblemsSeverityChange({ ...problemsSeverity, errors: !problemsSeverity.errors }),
                children: [
                  problemsSeverity.errors ? "✓ " : "",
                  "显示错误"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              DropdownMenuItem,
              {
                onClick: () => onProblemsSeverityChange({ ...problemsSeverity, warnings: !problemsSeverity.warnings }),
                children: [
                  problemsSeverity.warnings ? "✓ " : "",
                  "显示警告"
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HeaderIcon,
          {
            title: linting ? "正在检查…" : "重新检查已打开的文件",
            onClick: onRelintOpenFiles,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: cn("h-3.5 w-3.5", linting && "animate-spin") })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HeaderIcon,
          {
            title: "复制问题列表",
            onClick: () => {
              void copyProblemsList(problems, problemsFilter, problemsSeverity);
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutList, { className: "h-3.5 w-3.5" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HeaderIcon,
          {
            title: "换行显示",
            onClick: () => toast.message("问题列表已启用自动换行"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextWrap, { className: "h-3.5 w-3.5" })
          }
        )
      ] }) : null,
      activeTab === "output" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FilterInput,
          {
            value: outputFilter,
            onChange: onOutputFilterChange,
            placeholder: "筛选",
            className: "max-w-[8rem]"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              className: "inline-flex max-w-[10rem] items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] text-foreground transition hover:bg-secondary",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: channelLabel(outputChannel) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3 shrink-0 opacity-60" })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuContent, { align: "end", children: OUTPUT_CHANNELS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => onOutputChannelChange(c.id), children: c.label }, c.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(HeaderIcon, { title: "清除输出", onClick: onClearOutput, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          HeaderIcon,
          {
            title: outputScrollLock ? "解除滚动锁定" : "锁定滚动",
            onClick: onOutputScrollLockToggle,
            active: outputScrollLock,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-3.5 w-3.5" })
          }
        )
      ] }) : null,
      activeTab === "debug" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FilterInput,
          {
            value: debugFilter,
            onChange: onDebugFilterChange,
            placeholder: "筛选（如 text、!exclude、\\\\escape）",
            className: "max-w-[min(100%,20rem)]"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(HeaderIcon, { title: "清除控制台", onClick: onClearDebug, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
      ] }) : null,
      activeTab === "terminal" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        terminalHeader ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          TerminalSessionPicker,
          {
            sessions: terminalHeader.sessions,
            activeId: terminalHeader.activeId,
            onSelect: terminalHeader.selectSession
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(HeaderIcon, { title: "拆分终端", onClick: onSplitTerminal, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquareSplitHorizontal, { className: "h-3.5 w-3.5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NewTerminalSplitButton, { onNew: onNewTerminal, onSplit: onSplitTerminal }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(HeaderIcon, { title: "关闭终端", onClick: onKillTerminal, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              title: "更多操作",
              "aria-label": "更多操作",
              className: "flex h-[22px] w-[22px] items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "h-3.5 w-3.5" })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "min-w-[12rem]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: onRestartTerminal, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "mr-2 h-3.5 w-3.5" }),
              "重启终端"
            ] }),
            terminalHint ? /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { disabled: true, className: "max-w-[16rem] text-[11px] text-amber-700 dark:text-amber-300", children: terminalHint }) : null,
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: onCopyPath, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "mr-2 h-3.5 w-3.5" }),
              "复制工作区路径"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuItem, { onClick: onClose, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "mr-2 h-3.5 w-3.5" }),
              "关闭面板"
            ] })
          ] })
        ] })
      ] }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-0.5 border-l border-border/60 pl-1 pr-0.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(HeaderIcon, { title: "最大化面板", onClick: () => toast.message("拖动分隔条可调整高度"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { className: "h-3.5 w-3.5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(HeaderIcon, { title: "关闭面板", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
    ] })
  ] });
}
function NewTerminalSplitButton({
  onNew,
  onSplit
}) {
  const defaultShell = getDefaultTerminalShell();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex h-[22px] overflow-hidden rounded border border-border/80 bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        title: "新建终端（默认 Shell）",
        "aria-label": "新建终端",
        onClick: () => onNew(),
        className: "flex h-full w-[22px] items-center justify-center text-muted-foreground transition hover:bg-secondary hover:text-foreground",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenu, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          title: "选择 Shell 新建终端",
          "aria-label": "选择 Shell 新建终端",
          className: "flex h-full w-[18px] items-center justify-center border-l border-border/80 text-muted-foreground transition hover:bg-secondary hover:text-foreground",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3" })
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuContent, { align: "end", className: "min-w-[12rem]", children: [
        TERMINAL_SHELL_PROFILES.map((profile) => /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => onNew(profile.id), children: profile.label }, profile.id)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { disabled: true, className: "text-muted-foreground/70", children: "JavaScript Debug Terminal" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSubTrigger, { children: "拆分终端" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSubContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { onClick: () => (onSplit ?? onNew)(), children: "向右拆分" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DropdownMenuItem,
          {
            onClick: () => toast.message("请在设置页配置本机连接与工作目录"),
            children: "配置终端设置…"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DropdownMenuSub, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSubTrigger, { children: "选择默认配置文件" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSubContent, { children: TERMINAL_SHELL_PROFILES.map((profile) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            DropdownMenuItem,
            {
              onClick: () => {
                setDefaultTerminalShell(profile.id);
                toast.success(`默认终端已设为 ${profile.label}`);
              },
              children: [
                profile.label,
                defaultShell === profile.id ? " ✓" : ""
              ]
            },
            profile.id
          )) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuSeparator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { disabled: true, children: "运行任务…" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuItem, { disabled: true, children: "配置任务…" })
      ] })
    ] })
  ] });
}
function FilterInput({
  value,
  onChange,
  placeholder,
  className
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      type: "text",
      value,
      onChange: (e) => onChange(e.target.value),
      placeholder,
      className: cn(
        "h-[22px] min-w-[5rem] flex-1 rounded border border-border bg-background px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-1 focus:ring-primary/25",
        className
      )
    }
  );
}
function HeaderIcon({
  children,
  title,
  onClick,
  active
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      title,
      "aria-label": title,
      onClick,
      className: cn(
        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground",
        active && "bg-secondary text-foreground"
      ),
      children
    }
  );
}
function matchDebugFilter(entry, filter) {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  if (q.startsWith("!")) return !entry.text.toLowerCase().includes(q.slice(1));
  return entry.text.toLowerCase().includes(q);
}
function filterVisibleProblems(problems, filter, severity) {
  return problems.filter((p) => {
    if (p.severity === "error" && !severity.errors) return false;
    if (p.severity === "warning" && !severity.warnings) return false;
    return matchProblemFilter(p, filter);
  });
}
async function copyProblemsList(problems, filter, severity) {
  const visible = filterVisibleProblems(problems, filter, severity);
  if (!visible.length) {
    toast.message("暂无问题可复制");
    return;
  }
  const text2 = visible.map(
    (p) => `${p.severity === "error" ? "错误" : "警告"}	${p.relPath}:${p.line}:${p.column}	${p.message}${p.rule ? ` [${p.rule}]` : ""}`
  ).join("\n");
  try {
    await navigator.clipboard.writeText(text2);
    toast.success(`已复制 ${visible.length} 条问题`);
  } catch {
    toast.error("复制失败");
  }
}
function ProblemsView({
  filter,
  severity,
  problems
}) {
  const ws = useWorkbenchWorkspace();
  const visible = reactExports.useMemo(
    () => filterVisibleProblems(problems, filter, severity),
    [problems, filter, severity]
  );
  if (!visible.length) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-full items-start p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[13px] text-muted-foreground", children: filter.trim() || !severity.errors || !severity.warnings ? "筛选条件下无匹配问题。" : problems.length ? "筛选条件下无匹配问题。" : "工作区未检测到任何问题。" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full overflow-auto scrollbar-thin", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full table-fixed border-collapse text-left text-[12px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("colgroup", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[22px]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[min(38%,14rem)]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", { className: "w-[4.5rem]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("col", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: visible.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "tr",
      {
        className: "group cursor-pointer border-b border-border/50 hover:bg-secondary/40",
        onClick: () => void ws.openFile(p.relPath, { line: p.line, column: p.column }),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1 align-top", children: p.severity === "error" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-3.5 w-3.5 text-destructive", "aria-label": "错误" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5 text-amber-500", "aria-label": "警告" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "truncate px-1 py-1 align-top font-mono text-[11.5px] text-foreground/90", title: p.relPath, children: p.relPath }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "whitespace-nowrap px-1 py-1 align-top font-mono text-[11px] text-muted-foreground tabular-nums", children: [
            p.line,
            ":",
            p.column
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-2 py-1 align-top text-foreground/90", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "line-clamp-2", children: p.message }),
            p.rule ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ml-1 font-mono text-[10.5px] text-muted-foreground/80", children: [
              "(",
              p.rule,
              ")"
            ] }) : null
          ] })
        ]
      },
      `${p.relPath}:${p.line}:${p.column}:${i}`
    )) })
  ] }) });
}
function OutputView({
  filter,
  lines,
  endRef
}) {
  const visible = lines.filter((l) => !filter.trim() || l.toLowerCase().includes(filter.toLowerCase()));
  if (!visible.length) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full overflow-auto p-1 font-mono text-[12px] text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "opacity-40", children: "|" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: endRef })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-full overflow-auto p-2 font-mono text-[12px] leading-relaxed text-foreground", children: [
    visible.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "whitespace-pre-wrap break-all", children: line }, i)),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: endRef })
  ] });
}
function DebugConsoleView({
  filter,
  entries: entries2,
  input,
  onInputChange
}) {
  const visible = entries2.filter((e) => matchDebugFilter(e, filter));
  const submit = () => {
    if (!input.trim()) return;
    evalDebugExpression(input);
    onInputChange("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-auto p-2 font-mono text-[12px] leading-relaxed", children: !visible.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-muted-foreground", children: filter.trim() ? `未找到匹配「${filter}」的输出。` : "在下方输入 JavaScript 表达式以评估；页面 console 输出也会显示在此。" }) : visible.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: cn(
          "whitespace-pre-wrap break-all py-0.5",
          e.level === "error" && "text-destructive",
          e.level === "warn" && "text-amber-600 dark:text-amber-400",
          e.level === "input" && "text-primary",
          e.level === "result" && "text-foreground",
          (e.level === "log" || e.level === "info") && "text-muted-foreground"
        ),
        children: e.level === "input" ? e.text : e.text
      },
      e.id
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-2 border-t border-border px-2 py-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-primary", children: ">" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: input,
          onChange: (e) => onInputChange(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          },
          placeholder: "评估表达式",
          className: "min-w-0 flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground/60"
        }
      )
    ] })
  ] });
}
async function openPortInBrowser(url) {
  const api = getDesktop();
  if (api?.openExternal) {
    await api.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
function PortsView({ ports: ports2 }) {
  const addPort = () => {
    const raw = window.prompt("输入要转发的端口号（例如 3000）", "3000");
    if (!raw) return;
    const port = Number(raw.trim());
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast.error("端口号无效");
      return;
    }
    registerPort(port, `Port ${port}`, "手动转发");
    toast.success(`已添加端口 ${port}`);
  };
  if (!ports2.length) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full flex-col items-start gap-4 p-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "max-w-lg text-[13px] leading-relaxed text-muted-foreground", children: "暂无转发的端口。运行 dev server 或终端输出中的 localhost 地址会自动出现在此。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: addPort,
          className: "rounded-md bg-primary/90 px-4 py-1.5 text-[12px] font-medium text-primary-foreground transition hover:bg-primary",
          children: "转发端口"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-full min-h-0 flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex shrink-0 items-center justify-end gap-2 border-b border-border/60 px-3 py-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: addPort,
        className: "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3 w-3" }),
          "添加端口"
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-auto scrollbar-thin", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full border-collapse text-left text-[12px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-background/95 text-[11px] uppercase tracking-wide text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-1.5 font-medium", children: "端口" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-1.5 font-medium", children: "地址" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-1.5 font-medium", children: "来源" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-3 py-1.5 font-medium", children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: ports2.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-border/40 hover:bg-secondary/30", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-1.5 font-mono tabular-nums", children: p.port }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-3 py-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[11px]", children: p.address }),
          p.label ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-[11px] text-muted-foreground", children: p.label }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-1.5 text-muted-foreground", children: p.source }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-3 py-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            title: "在浏览器中打开",
            onClick: () => void openPortInBrowser(p.url),
            className: "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-primary transition hover:bg-secondary",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "h-3 w-3" }),
              "打开",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3 w-3 opacity-60" })
            ]
          }
        ) })
      ] }, p.id)) })
    ] }) })
  ] });
}
const ssrSafeLayoutStorage = {
  getItem(key) {
    if (typeof window === "undefined") return null;
    return getUiPrefsCache().layoutStorage[key] ?? null;
  },
  setItem(key, value) {
    if (typeof window === "undefined") return;
    scheduleSaveUiPrefs({ layoutStorage: { [key]: value } });
  }
};
const CENTER_PANEL_IDS = ["workbench-center-preview", "workbench-center-terminal"];
const CENTER_FALLBACK = {
  "workbench-center-preview": 62,
  "workbench-center-terminal": 38
};
function WorkbenchCenterPanel({
  terminalOpen,
  onTerminalOpenChange,
  panelToggles
}) {
  const { prefsLoaded } = useTheme();
  const { errorCount } = useWorkbenchProblems();
  const prevErrorCountRef = reactExports.useRef(0);
  const { defaultLayout, onLayoutChanged } = on({
    id: "workbench-center-v1",
    panelIds: [...CENTER_PANEL_IDS],
    storage: ssrSafeLayoutStorage
  });
  reactExports.useEffect(() => {
    if (errorCount > 0 && prevErrorCountRef.current === 0) {
      onTerminalOpenChange(true);
    }
    prevErrorCountRef.current = errorCount;
  }, [errorCount, onTerminalOpenChange]);
  if (!terminalOpen) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden", children: [
      panelToggles,
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchCenterPreview, {}) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden", children: [
    panelToggles,
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      ResizablePanelGroup,
      {
        orientation: "vertical",
        className: "h-full min-h-0 flex-1",
        id: "workbench-center-v1",
        defaultLayout: defaultLayout ?? CENTER_FALLBACK,
        onLayoutChanged,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ResizablePanel, { id: "workbench-center-preview", defaultSize: "62", minSize: "28", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full min-h-0 w-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchCenterPreview, {}) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ResizableHandle, { withHandle: true, className: "z-10 bg-border" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ResizablePanel, { id: "workbench-center-terminal", defaultSize: "38", minSize: "18", maxSize: "72", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full min-h-0 w-full overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchBottomPanel, { onClose: () => onTerminalOpenChange(false) }) }) })
        ]
      },
      prefsLoaded ? "workbench-center-ready" : "workbench-center-boot"
    )
  ] });
}
function WorkbenchChatComposerBridge({
  onOpenChatPanel,
  onInsertTerminalSelection
}) {
  const { registerComposerHandlers } = useWorkbenchComposerBridge();
  reactExports.useEffect(() => {
    return registerComposerHandlers({
      openChatPanel: onOpenChatPanel,
      insertTerminalSelection: onInsertTerminalSelection
    });
  }, [registerComposerHandlers, onOpenChatPanel, onInsertTerminalSelection]);
  return null;
}
let initialized = false;
function initWorkbenchBottomPanels() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  initKnownPorts();
  installDebugConsoleCapture();
  appendOutput("workbench", "Claude Orchestrator 已就绪");
}
const PANEL_IDS = ["workbench-left", "workbench-center", "workbench-chat"];
const FALLBACK_LAYOUT = {
  "workbench-left": 22,
  "workbench-center": 38,
  "workbench-chat": 40
};
function WorkbenchCursorLayout({
  chatHeader,
  chatBodyMountRef,
  onOpenChatPanel,
  onInsertTerminalSelection,
  centerToolbar,
  terminalOpen,
  onTerminalOpenChange,
  leftOpen,
  onLeftOpenChange,
  rightOpen,
  onRightOpenChange
}) {
  const { prefsLoaded } = useTheme();
  const leftPanelRef = ln();
  const chatPanelRef = ln();
  const { defaultLayout, onLayoutChanged } = on({
    id: "workbench-cursor-v3",
    panelIds: [...PANEL_IDS],
    storage: ssrSafeLayoutStorage
  });
  reactExports.useEffect(() => {
    initWorkbenchBottomPanels();
  }, []);
  reactExports.useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (leftOpen) panel.expand();
    else panel.collapse();
  }, [leftOpen, leftPanelRef]);
  reactExports.useEffect(() => {
    const panel = chatPanelRef.current;
    if (!panel) return;
    if (rightOpen) panel.expand();
    else panel.collapse();
  }, [rightOpen, chatPanelRef]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(WorkbenchWorkspaceProvider, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchComposerFileSync, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchComposerBridgeProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(WorkbenchTerminalBridgeProvider, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        WorkbenchChatComposerBridge,
        {
          onOpenChatPanel,
          onInsertTerminalSelection
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "workbench-shell flex min-h-0 flex-1 flex-col overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        ResizablePanelGroup,
        {
          orientation: "horizontal",
          className: "h-full min-h-0 flex-1",
          id: "workbench-cursor-v3",
          defaultLayout: defaultLayout ?? FALLBACK_LAYOUT,
          onLayoutChanged,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ResizablePanel,
              {
                id: "workbench-left",
                panelRef: leftPanelRef,
                collapsible: true,
                collapsedSize: "0",
                defaultSize: "22",
                minSize: "16",
                maxSize: "38",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full min-w-0 overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchLeftSidebar, {}) })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ResizableHandle, { withHandle: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ResizablePanel, { id: "workbench-center", defaultSize: "38", minSize: "22", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden", children: [
              !leftOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                PanelToggle,
                {
                  className: "absolute left-1.5 top-1.5 z-20",
                  onClick: () => onLeftOpenChange(true),
                  side: "left",
                  expand: true
                }
              ) : null,
              !rightOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                PanelToggle,
                {
                  className: "absolute right-1.5 top-1.5 z-20",
                  onClick: () => onRightOpenChange(true),
                  side: "right",
                  expand: true
                }
              ) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchProblemsProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                WorkbenchCenterPanel,
                {
                  terminalOpen,
                  onTerminalOpenChange,
                  panelToggles: centerToolbar
                }
              ) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ResizableHandle, { withHandle: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ResizablePanel,
              {
                id: "workbench-chat",
                panelRef: chatPanelRef,
                collapsible: true,
                collapsedSize: "0",
                defaultSize: "40",
                minSize: "28",
                maxSize: "58",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchChatPaneShell, { header: chatHeader, bodyMountRef: chatBodyMountRef })
              }
            )
          ]
        },
        prefsLoaded ? "workbench-cursor-ready" : "workbench-cursor-boot"
      ) })
    ] }) })
  ] });
}
const WorkbenchChatPaneShell = reactExports.memo(function WorkbenchChatPaneShell2({
  header,
  bodyMountRef
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workbench-chat-pane flex h-full min-h-0 min-w-0 flex-col overflow-hidden", children: [
    header,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        ref: bodyMountRef,
        className: "workbench-chat-mount relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      }
    )
  ] });
});
function PanelToggle({
  onClick,
  side,
  expand,
  className
}) {
  const Icon = side === "left" ? expand ? PanelLeftOpen : PanelLeftClose : expand ? PanelRightOpen : PanelRightClose;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      onClick,
      className: cn(
        "flex h-7 w-7 items-center justify-center rounded-md border border-border/80 bg-surface/90 text-muted-foreground shadow-sm backdrop-blur-sm transition hover:bg-secondary hover:text-foreground",
        className
      ),
      title: expand ? side === "left" ? "显示文件树" : "显示聊天" : side === "left" ? "隐藏文件树" : "隐藏聊天",
      "aria-label": expand ? "展开侧栏" : "收起侧栏",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3.5 w-3.5" })
    }
  );
}
const DEFAULT_WBS_REL_PATH = "docs/wbs.md";
const WBS_GENERATE_PM_PROMPT = `/agent project-manager 请为当前工作区项目输出完整 WBS，并确保可解析为任务链：
1. 使用 Markdown 表格，列含：任务编号、工作摘要、执行 Agent、依赖任务、交付标准
2. 任务编号格式 WBS-01、WBS-02…
3. 执行 Agent 使用可识别角色（如 前端工程师、后端工程师、测试工程师 或 frontend-engineer 等）
4. 在回复中给出完整表格（系统将自动写入 ${DEFAULT_WBS_REL_PATH} 并注册到「任务链」列表）`;
function wbsChainNameFromPath(relPath) {
  return `WBS · ${relPath.replace(/^\/+/, "")}`;
}
function summaryFromInstruction(instruction) {
  const m = instruction.match(/^请执行任务\s+\S+[：:]\s*([\s\S]*)$/);
  if (m) {
    const body = m[1].trim();
    const first = body.split("\n")[0]?.trim() ?? body;
    return first.replace(/\s+/g, " ");
  }
  return instruction.replace(/\s+/g, " ").trim().slice(0, 200);
}
function escapeMdCell(s) {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}
function buildWbsMarkdownFromChainState(state2, opts) {
  const title = "WBS 任务分解";
  const lines = [
    `# ${title}`,
    "",
    "由 Claude Orchestrator 根据项目经理 WBS 自动生成。",
    "",
    "| 任务编号 | 工作摘要 | 执行 Agent |",
    "| --- | --- | --- |"
  ];
  state2.steps.forEach((s, i) => {
    const taskId = s.taskId?.trim() || `WBS-${String(i + 1).padStart(2, "0")}`;
    const summary = escapeMdCell(summaryFromInstruction(s.instruction));
    const agent = escapeMdCell(s.agentName);
    lines.push(`| ${taskId} | ${summary} | ${agent} |`);
  });
  lines.push("");
  return lines.join("\n");
}
function pickWbsMarkdownToWrite(state2, markdownSource) {
  const src = markdownSource?.trim();
  if (src) {
    const parsed = parseActiveChainFromBubbleText(src);
    if (parsed.ok && (parsed.state.steps?.length ?? 0) > 0) {
      if (/\|.+\|/.test(src) && /工作摘要|执行\s*agent|task\s*summary/i.test(src)) {
        return src.includes("# WBS") ? src : `# WBS 任务分解

${src.trim()}
`;
      }
    }
  }
  return buildWbsMarkdownFromChainState(state2);
}
async function registerParsedChainInList(api, opts) {
  if (!api.orchestrationCreateChain || !api.orchestrationActivateChain) {
    return { ok: false, error: MSG_API_NOT_READY };
  }
  const steps = opts.state.steps?.filter((s) => s.agentName?.trim() && s.instruction?.trim()) ?? [];
  if (!steps.length) {
    return { ok: false, error: "任务链步骤为空" };
  }
  const state2 = {
    status: "idle",
    currentIndex: opts.resetProgress !== false ? 0 : opts.state.currentIndex ?? 0,
    steps
  };
  const wbsPath = opts.wbsPath?.trim() || DEFAULT_WBS_REL_PATH;
  const chainName = opts.name?.trim() || wbsChainNameFromPath(wbsPath);
  const description = opts.description?.trim() || `WBS 来源：${wbsPath} · ${steps.length} 步`;
  const listR = await api.orchestrationListChains?.();
  const items = listR?.ok ? listR.items ?? [] : [];
  const existing = items.find(
    (c) => c.name === chainName || opts.wbsPath && c.description?.includes(opts.wbsPath) || c.description?.includes(`WBS 来源：${wbsPath}`)
  );
  let chainId = "";
  if (existing?.id && api.orchestrationUpdateChain) {
    const updated = await api.orchestrationUpdateChain({
      id: existing.id,
      name: chainName,
      description,
      enabled: true,
      state: state2
    });
    if (!updated.ok) {
      return { ok: false, error: updated.error ?? "更新任务链失败" };
    }
    chainId = existing.id;
  } else {
    const created = await api.orchestrationCreateChain({
      name: chainName,
      description,
      category: "custom",
      templateId: null,
      enabled: true,
      state: state2
    });
    if (!created.ok || !created.chain?.id) {
      return { ok: false, error: created.error ?? "创建任务链失败" };
    }
    chainId = created.chain.id;
  }
  const act = await api.orchestrationActivateChain(chainId);
  if (!act.ok) {
    return { ok: false, error: act.error ?? "激活任务链失败" };
  }
  return { ok: true, chainId, chainName, stepCount: steps.length };
}
async function persistWbsAndRegisterChain(api, opts) {
  const wbsPath = opts.wbsPath?.trim() || DEFAULT_WBS_REL_PATH;
  if (api.workspaceApplyWriteFence) {
    const md = pickWbsMarkdownToWrite(opts.state, opts.markdownSource);
    try {
      const wr = await api.workspaceApplyWriteFence([{ path: wbsPath, content: md }]);
      if (!wr.ok) {
        return { ok: false, error: wr.error || `写入 ${wbsPath} 失败` };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  const registered = await registerParsedChainInList(api, {
    state: opts.state,
    wbsPath,
    name: opts.chainName,
    resetProgress: true
  });
  if (!registered.ok) return registered;
  return {
    ok: true,
    chainId: registered.chainId,
    chainName: registered.chainName,
    stepCount: registered.stepCount,
    wbsPath
  };
}
function parseWbsChainIntent(raw) {
  const t = raw.trim();
  if (!t) return { matched: false };
  if (t.startsWith("/wbs")) {
    const rest = t.slice(4).trim();
    if (rest === "生成" || rest === "generate" || rest === "gen") {
      return { matched: true, action: "generate-wbs" };
    }
    const autoRun = rest === "执行" || rest === "run" || rest === "开工" || rest === "执行链" || /^(执行|开工|跑)/.test(rest);
    if (!rest || rest === "同步" || rest === "sync" || rest === "链" || rest === "chain" || autoRun) {
      return { matched: true, action: "sync-from-workspace", autoRun };
    }
    return { matched: false };
  }
  if (/^\/任务链(?:\s+(.*))?$/i.test(t)) {
    const rest = (t.match(/^\/任务链(?:\s+(.*))?$/i)?.[1] ?? "").trim();
    const autoRun = /^(执行|开工|跑|run)/i.test(rest);
    return { matched: true, action: "sync-from-workspace", autoRun };
  }
  if (t.length > 160) return { matched: false };
  const autoRunPatterns = [
    /^(开始|继续)?执行.*任务链/,
    /任务链.*(开工|执行|跑起来|跑链)/,
    /按\s*wbs\s*(开工|执行)/i,
    /wbs.*(开工|执行|跑链|跑起来)/i,
    /同步.*并.*执行/
  ];
  for (const re2 of autoRunPatterns) {
    if (re2.test(t)) return { matched: true, action: "sync-from-workspace", autoRun: true };
  }
  const syncPatterns = [
    /生成.*(项目)?任务链/,
    /(创建|同步|建立|更新).*(项目)?任务链/,
    /根据.{0,24}wbs.{0,24}(生成|同步|创建|建立)/i,
    /wbs.{0,32}(生成|同步|转|变|建).{0,12}(任务链|执行链|链)/i,
    /从.{0,20}wbs.{0,20}(生成|同步|创建)/i,
    /把.{0,20}wbs.{0,20}(转成|变成|同步为).{0,12}任务链/,
    /生成对应.{0,12}任务链/,
    /^(同步|生成|创建)\s*任务链$/,
    /^任务链\s*(生成|同步)$/
  ];
  for (const re2 of syncPatterns) {
    if (re2.test(t)) return { matched: true, action: "sync-from-workspace", autoRun: false };
  }
  return { matched: false };
}
function formatWbsChainSyncAssistantReply(result) {
  const lines = [
    `已根据工作区 **${result.pickedPath}** 生成项目任务链 **「${result.chainName}」**（共 ${result.stepCount} 步）。`,
    "",
    "- 可在侧栏 **任务链** 列表查看与编辑（搜索 **WBS** 或筛选 **自定义**）",
    result.autoRun ? "- 已在后台 **开始执行**；切换页签不会中断" : "- 底部显示 **工作流：待执行** 时，到任务链页点 **执行** 即可开跑",
    "",
    "快捷命令：`/任务链` 仅生成 · `/任务链 执行` 或 `/wbs 同步` 生成并执行"
  ];
  return lines.join("\n");
}
async function autoSaveChainFromReply(api, rawReply, opts) {
  const text2 = rawReply?.trim() ?? "";
  if (!text2) return { saved: false, reason: "empty" };
  if (!api?.orchestrationCreateChain) return { saved: false, reason: "no-api" };
  const parsed = parseActiveChainFromBubbleText(text2);
  if (!parsed.ok) return { saved: false, reason: "unparseable", error: parsed.error };
  const persisted = await persistWbsAndRegisterChain(api, {
    state: parsed.state,
    wbsPath: DEFAULT_WBS_REL_PATH,
    markdownSource: text2
  });
  if (!persisted.ok) {
    return { saved: false, reason: "save-failed", error: persisted.error };
  }
  return {
    saved: true,
    stepCount: persisted.stepCount,
    source: parsed.source,
    chainId: persisted.chainId,
    chainName: persisted.chainName,
    wbsPath: persisted.wbsPath
  };
}
function notifyAutoSavedChain(result, onOpenChains) {
  toast.success(`已生成 WBS 与任务链「${result.chainName}」（${result.stepCount} 步）`, {
    description: `已写入 ${result.wbsPath}，可在侧栏「任务链」查看并执行。`,
    duration: 7e3,
    ...onOpenChains ? {
      action: {
        label: "打开任务链",
        onClick: () => onOpenChains?.()
      }
    } : {}
  });
}
async function saveChainFromBubbleText(api, content2) {
  const r = await autoSaveChainFromReply(api, content2);
  if (r.saved) {
    return {
      ok: true,
      stepCount: r.stepCount,
      chainId: r.chainId,
      chainName: r.chainName,
      wbsPath: r.wbsPath
    };
  }
  if (r.reason === "unparseable") return { ok: false, error: r.error || "未能解析任务链" };
  if (r.reason === "save-failed") return { ok: false, error: r.error || "写入失败" };
  if (r.reason === "no-api") return { ok: false, error: MSG_API_NOT_READY };
  return { ok: false, error: "气泡内容为空" };
}
const WBS_FILENAME_RE = /(^|\/)wbs[^/]*\.md$/i;
const DEFAULT_WBS_CANDIDATE_PATHS = [
  "docs/wbs.md",
  "docs/sprint-backlog.md",
  "docs/wbs_hie_egs.md",
  "docs/wbs_v1.2.md",
  "docs/wbs_v1.md",
  "docs/project-status.md"
];
function normalizeRelPath(raw) {
  return String(raw ?? "").replace(/\\/g, "/").trim();
}
function isParseableWbsText(text2) {
  const parsed = parseActiveChainFromBubbleText(text2);
  return parsed.ok && (parsed.state.steps?.length ?? 0) > 0;
}
async function discoverWbsDocument(listMarkdownFiles, readTextFile, opts) {
  const preferred = normalizeRelPath(opts?.preferredPath ?? "");
  let discoveredWbsPaths = [];
  let docsMarkdownPaths = [];
  try {
    const files = await listMarkdownFiles();
    const sorted = [...files].sort(
      (a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0)
    );
    for (const f of sorted) {
      const rel = normalizeRelPath(String(f.relPath ?? ""));
      if (!rel.endsWith(".md")) continue;
      if (WBS_FILENAME_RE.test(rel)) discoveredWbsPaths.push(rel);
      if (/(^|\/)docs\//i.test(rel)) docsMarkdownPaths.push(rel);
    }
  } catch {
  }
  const filenameCandidates = [
    preferred,
    ...discoveredWbsPaths,
    ...DEFAULT_WBS_CANDIDATE_PATHS,
    ...(opts?.extraCandidatePaths ?? []).map(normalizeRelPath)
  ].filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i).filter((x) => opts?.wbsFilenameOnly ? WBS_FILENAME_RE.test(x) : true);
  for (const p of filenameCandidates) {
    const r = await readTextFile(p);
    if (r?.ok && typeof r.text === "string" && r.text.trim()) {
      return { path: p, text: r.text, source: "filename" };
    }
  }
  const contentScanPaths = [...docsMarkdownPaths].filter((p) => !filenameCandidates.includes(p)).filter((p, i, arr) => arr.indexOf(p) === i);
  for (const p of contentScanPaths) {
    const r = await readTextFile(p);
    if (!r?.ok || typeof r.text !== "string" || !r.text.trim()) continue;
    if (!isParseableWbsText(r.text)) continue;
    return { path: p, text: r.text, source: "content-scan" };
  }
  return null;
}
function chainsForAgent(agentStem, savedItems) {
  const stem = agentStem.trim();
  if (!stem) return [];
  const fromRegistry = savedItems.filter((c) => c.enabled !== false && (c.agentStems?.includes(stem) || false)).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    official: Boolean(c.official || c.id.startsWith("official-")),
    stepCount: c.stepCount,
    templateId: c.templateId
  }));
  const registryTemplateIds = new Set(fromRegistry.map((c) => c.templateId).filter(Boolean));
  const fromTemplates = CHAIN_TEMPLATES.filter(
    (t) => t.agents.includes(stem) && !registryTemplateIds.has(t.id)
  ).map((t) => ({
    id: `official-${t.id}`,
    name: t.name,
    description: t.description,
    official: true,
    stepCount: t.steps.length,
    templateId: t.id
  }));
  return [...fromRegistry, ...fromTemplates];
}
function buildAgentChainCatalogMarkdown(agentStem, savedItems, agents) {
  const entries2 = chainsForAgent(agentStem, savedItems);
  if (!entries2.length) return "";
  const agentLabel = agentDisplayNameForStem(agentStem, agents) || agentStem;
  const lines = entries2.slice(0, 12).map((c, i) => {
    const tag = c.official ? "官方" : "自定义";
    return `${i + 1}. ${c.name}（${tag} · ${c.stepCount} 步）
   调用：/chain ${c.id.replace(/^official-/, "")} 或 /chain run ${c.id.replace(/^official-/, "")}`;
  });
  return `【${agentLabel} · 可调用任务链】
以下任务链含本 Agent 步骤；用户发送 /chain list 可列出，/chain run <名称或 id> 可后台执行。
Agent 也可在回复中引导用户使用上述命令。

` + lines.join("\n");
}
function resolveChainQuery(query, agentStem, savedItems) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const pool = chainsForAgent(agentStem, savedItems);
  const exact = pool.find(
    (c) => c.id.toLowerCase() === q || c.id.toLowerCase() === `official-${q}` || c.templateId?.toLowerCase() === q || c.name.toLowerCase() === q
  );
  if (exact) return exact;
  return pool.find(
    (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.templateId?.toLowerCase().includes(q) ?? false)
  ) ?? null;
}
function formatChainListForAgent(agentStem, savedItems) {
  const entries2 = chainsForAgent(agentStem, savedItems);
  if (!entries2.length) {
    return `当前 Agent（${agentStem}）暂无可调用的任务链。请先在「任务链」页确认官方已同步。`;
  }
  return `【可调用任务链 · ${agentStem}】
` + entries2.map(
    (c, i) => `${i + 1}. ${c.name} · ${c.stepCount} 步 · id=${c.templateId || c.id}
   执行：/chain run ${c.templateId || c.id.replace(/^official-/, "")}`
  ).join("\n") + `

用法：/chain list · /chain run <名称或 id>`;
}
function parseChainCommand(raw) {
  const s = raw.trim();
  if (!s.startsWith("/")) return { matched: false };
  const m = s.match(/^\/(?:chain|任务链)(?:\s+(.*))?$/is);
  if (!m) return { matched: false };
  const rest = (m[1] ?? "").trim();
  if (!rest || /^list$/i.test(rest) || rest === "列表") {
    return { matched: true, action: "list" };
  }
  const runMatch = rest.match(/^(?:run|执行|跑)\s+(.+)$/is);
  if (runMatch) {
    return { matched: true, action: "run", query: runMatch[1].trim() };
  }
  return { matched: true, action: "run", query: rest };
}
async function handleChainChatCommand(text2, agentStem, runChain) {
  const cmd = parseChainCommand(text2);
  if (!cmd.matched) return { handled: false };
  const api = getDesktop();
  if (!api?.orchestrationActivateChain || !api.orchestrationStartChainRun) {
    return {
      handled: true,
      assistantText: MSG_API_NOT_READY
    };
  }
  await syncOfficialGenericChains();
  const listR = await api.orchestrationListChains?.();
  const savedItems = listR?.ok ? listR.items ?? [] : [];
  if (cmd.action === "list") {
    return { handled: true, assistantText: formatChainListForAgent(agentStem, savedItems) };
  }
  const entry = resolveChainQuery(cmd.query, agentStem, savedItems);
  if (!entry) {
    return {
      handled: true,
      assistantText: `未找到匹配「${cmd.query}」的任务链。

` + formatChainListForAgent(agentStem, savedItems)
    };
  }
  const act = await api.orchestrationActivateChain(entry.id);
  if (!act.ok) {
    return {
      handled: true,
      assistantText: `无法激活任务链「${entry.name}」：${act.error ?? "未知错误"}`
    };
  }
  await runChain({ skipConfirm: true });
  return {
    handled: true,
    assistantText: `已开始后台执行任务链「${entry.name}」（${entry.stepCount} 步）。
可在顶栏查看进度；切换页签不会中断。发送停止指令或点击「停止」可中断。`
  };
}
const KNOWN_STEMS = /* @__PURE__ */ new Set([
  "product-manager",
  "project-manager",
  "software-architect",
  "frontend-engineer",
  "backend-engineer",
  "code-reviewer",
  "qa-engineer",
  "devops-engineer",
  "ui-ux-designer",
  "historian",
  "literature-scholar"
]);
const ALIASES = {
  pm: "product-manager",
  mgr: "project-manager",
  arch: "software-architect",
  fe: "frontend-engineer",
  be: "backend-engineer",
  reviewer: "code-reviewer",
  qa: "qa-engineer",
  devops: "devops-engineer",
  ux: "ui-ux-designer"
};
const STEM_LOWER_ASCII = /^[a-z0-9][a-z0-9_-]*$/;
function normalizeStem(token) {
  const t = token.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  if (KNOWN_STEMS.has(lower)) return lower;
  if (STEM_LOWER_ASCII.test(lower)) return lower;
  return null;
}
function parseAgentCommand(raw) {
  const s = raw.trim();
  if (!s.startsWith("/")) return { matched: false };
  const agentPrefix = s.match(/^\/agent\s+/i);
  if (agentPrefix) {
    const rest = s.slice(agentPrefix[0].length).trim();
    const m = rest.match(/^([a-zA-Z0-9][a-zA-Z0-9_-]*)/);
    if (!m) return { matched: false };
    const stem2 = normalizeStem(m[1]);
    if (!stem2) return { matched: false };
    const body2 = rest.slice(m[1].length).trim();
    return { matched: true, stem: stem2, body: body2 };
  }
  const lineMatch = s.match(/^\/([a-zA-Z][a-zA-Z0-9_-]*)(?:\s+(.*))?$/s);
  if (!lineMatch) return { matched: false };
  const token = lineMatch[1];
  if (token.toLowerCase() === "agent") return { matched: false };
  const stem = normalizeStem(token);
  if (!stem) return { matched: false };
  const body = (lineMatch[2] ?? "").trim();
  return { matched: true, stem, body };
}
function buildSubagentUserLine(stem, body) {
  const head = `【Agent 路由】global://${stem}（桌面助手·指令指定）`;
  const lock = `【角色锁定】你只扮演 global://${stem}；禁止自称其它 Agent，禁止混淆产品经理与项目经理等不同职务（除非上文 Agent 全文明确允许）。`;
  if (!body.trim()) return `${head}
${lock}`;
  return `${head}
${lock}
${body.trim()}`;
}
function resolveAgentForTurn(displayLine, selectedBasename) {
  const slash = parseAgentCommand(displayLine);
  if (slash.matched) {
    return {
      stem: slash.stem,
      body: slash.body || displayLine,
      source: "slash"
    };
  }
  if (!isAutoAgentBasename(selectedBasename)) {
    return {
      stem: agentStemFromBasename(selectedBasename),
      body: displayLine,
      source: "selected"
    };
  }
  return {
    stem: inferAgentStemFromText(displayLine),
    body: displayLine,
    source: "inferred"
  };
}
function looksLikeTerminalPaste(text2) {
  const t = text2.trim();
  if (!t || t.length < 16) return false;
  if (/^[^\n]{0,96}[@][^\n]{0,48}[%$#]\s/m.test(t)) return true;
  if (/\n[^\n]{0,96}[%$#]\s+\S/.test(t)) return true;
  if (/Address already in use|Serving Flask|Traceback \(most recent|command not found|Error:|WARNING:/i.test(
    t
  )) {
    return true;
  }
  return false;
}
function trimTerminalDisplay(text2) {
  const lines = text2.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 1) {
    const last = lines[lines.length - 1]?.trim() ?? "";
    if (last === "" || /^[^\s]{0,96}[@][^\s]{0,48}[%$#]\s*$/.test(last) || /^[%$#]\s*$/.test(last)) {
      lines.pop();
      continue;
    }
    break;
  }
  return lines.join("\n").trimEnd();
}
function looksLikeMarkdown(text2) {
  const t = text2.trim();
  if (!t) return false;
  return /^#{1,6}\s/m.test(t) || /```[\s\S]*?```/.test(t) || /^\s*[-*+]\s/m.test(t) || /^\s*\d+\.\s/m.test(t) || /\*\*[^*\n]+\*\*/.test(t) || /`[^`\n]+`/.test(t);
}
function splitUserDisplayText(content2) {
  const trimmed = content2.trim();
  if (!trimmed) return { lead: "" };
  const blocks = trimmed.split(/\n\n+/);
  if (blocks.length >= 2) {
    const last = blocks[blocks.length - 1] ?? "";
    if (looksLikeTerminalPaste(last)) {
      return {
        lead: blocks.slice(0, -1).join("\n\n").trim(),
        terminal: last
      };
    }
  }
  if (looksLikeTerminalPaste(trimmed)) {
    return { lead: "", terminal: trimmed };
  }
  return { lead: trimmed };
}
function newLocalId$1() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function restoreUserMsgToComposer(msg) {
  const { lead, terminal } = splitUserDisplayText(msg.content);
  let terminalSnippets = [];
  if (msg.terminalSnippets?.length) {
    terminalSnippets = msg.terminalSnippets.map((s) => ({
      ...s,
      id: newLocalId$1()
    }));
  } else if (terminal) {
    terminalSnippets = [
      {
        id: newLocalId$1(),
        text: terminal,
        sourceLabel: inferTerminalSourceLabel("zsh", terminal)
      }
    ];
  }
  const attachments = msg.attachments?.map((a) => ({
    ...a,
    id: newLocalId$1()
  })) ?? [];
  return {
    input: lead,
    terminalSnippets,
    attachments
  };
}
function collectAssistantTextsForBulkWrite(history) {
  const out = [];
  for (const m of history) {
    if (m.role !== "assistant") continue;
    if (m.requestError) continue;
    const c = typeof m.content === "string" ? m.content.trim() : "";
    if (!c || c === "__WAITING__") continue;
    if (/任务链执行异常|任务链在第 .* 步执行失败|流程未完成，已暂停/.test(c) && !/```/.test(c)) {
      continue;
    }
    const hasCode = /```/.test(c);
    const hasPaths = /###\s*涉及文件路径/i.test(c) || /【任务链】/.test(c);
    const hasWriteFence = /workspace-write/i.test(c);
    if (hasCode || hasWriteFence || hasPaths) out.push(c);
  }
  return out;
}
async function performBulkWriteFromHistory(api, history) {
  if (!api.workspaceBulkIngestFromHistory) {
    return { ok: false, written: [], displayText: "", error: MSG_API_NOT_READY };
  }
  const texts = collectAssistantTextsForBulkWrite(history);
  if (!texts.length) {
    return {
      ok: false,
      written: [],
      displayText: "",
      error: "会话历史中没有含代码块或文件路径的助手回复，无法批量落盘。"
    };
  }
  const res = await api.workspaceBulkIngestFromHistory({ texts });
  const written = res?.written ?? [];
  const displayText = typeof res?.displayText === "string" && res.displayText.trim() || (written.length ? `【批量落盘】已写入 ${written.length} 个文件：
${written.map((p) => `- \`${p}\``).join("\n")}` : "");
  return {
    ok: Boolean(res?.ok && written.length > 0),
    written,
    displayText,
    error: res?.error,
    scanned: typeof res?.scanned === "number" ? res.scanned : texts.length
  };
}
function isRunProjectIntent(text2) {
  const t = text2.trim();
  return /(?:运行|启动|run|start).*(?:项目|应用|dev|开发服务器|本地服务)/i.test(t) || /^(?:运行|启动)\s*项目/i.test(t);
}
function planToTerminalCommand(plan) {
  if (plan.terminalCommand?.trim()) return plan.terminalCommand.trim();
  if (plan.kind === "npm-script" && plan.script) {
    const base = plan.command?.trim() || `npm run ${plan.script}`;
    if (plan.cwdRel) return `cd "${plan.cwdRel}" && ${base}`;
    return base;
  }
  if (plan.kind === "python" && plan.entryRel) {
    return `python3 ${plan.entryRel}`;
  }
  if (plan.command?.trim()) {
    const base = plan.command.trim();
    if (plan.cwdRel) return `cd "${plan.cwdRel}" && ${base}`;
    return base;
  }
  return "";
}
function defaultRunProjectCommand() {
  return "npm run dev";
}
function formatTerminalRunReply(plan, command, sent) {
  if (sent) {
    const detail = plan.label ? `（${plan.label}）` : "";
    return `已在终端执行 \`${command}\`${detail}，输出见底部终端面板。`;
  }
  return `终端未就绪，请复制运行：\`${command}\``;
}
async function runProjectFromChat(api, userLine, opts) {
  const runProject = isRunProjectIntent(userLine);
  const hint = extractPreviewHint(userLine);
  const preferPython = isPythonPreviewQuestion(userLine);
  opts?.openTerminal?.();
  if (runProject) {
    await new Promise((r) => window.setTimeout(r, 500));
  }
  workbenchTerminalFocusTab();
  if (!api.workspaceDetectRunPlan) {
    if (runProject) {
      const cmd = defaultRunProjectCommand();
      const sent = await runCommandInWorkbenchTerminalBridge(cmd);
      return {
        ok: sent,
        ranInTerminal: sent,
        displayText: formatTerminalRunReply(
          { label: "默认 dev 脚本" },
          cmd,
          sent
        )
      };
    }
    return {
      ok: false,
      displayText: "当前无法自动检测启动方式，请在底部终端手动运行项目。"
    };
  }
  const plan = await api.workspaceDetectRunPlan({
    hint: runProject ? userLine.trim() : hint,
    userLine: userLine.trim(),
    preferStatic: !runProject,
    preferPython
  });
  if (runProject) {
    const cmd = plan.ok ? planToTerminalCommand(plan) || defaultRunProjectCommand() : defaultRunProjectCommand();
    const sent = await runCommandInWorkbenchTerminalBridge(cmd, { maxWaitMs: 15e3 });
    return {
      ok: sent,
      ranInTerminal: sent,
      displayText: formatTerminalRunReply(
        plan.ok ? plan : { label: "默认 dev 脚本" },
        cmd,
        sent
      )
    };
  }
  if (!plan.ok) {
    return {
      ok: false,
      displayText: `无法识别启动方式：${plan.error || "未检测到 dev/start 脚本或可预览文件"}。`
    };
  }
  const terminalCmd = planToTerminalCommand(plan);
  if (terminalCmd && (plan.kind === "npm-script" || plan.kind === "python")) {
    const sent = await runCommandInWorkbenchTerminalBridge(terminalCmd);
    return {
      ok: sent,
      ranInTerminal: sent,
      displayText: formatTerminalRunReply(plan, terminalCmd, sent)
    };
  }
  if (plan.kind === "static") {
    const preview2 = await performProjectPreview(api, userLine, {
      preferStatic: true,
      preferPython,
      entryRel: plan.entryRel
    });
    return {
      ok: preview2.ok,
      displayText: preview2.displayText,
      url: preview2.url
    };
  }
  if (terminalCmd) {
    const sent = await runCommandInWorkbenchTerminalBridge(terminalCmd);
    return {
      ok: sent,
      ranInTerminal: sent,
      displayText: formatTerminalRunReply(plan, terminalCmd, sent)
    };
  }
  const preview = await performProjectPreview(api, userLine);
  return {
    ok: preview.ok,
    displayText: preview.displayText,
    url: preview.url
  };
}
const EXPLICIT_PATH_RE = /\b((?:docs|app|data|scripts|frontend|src|test|tests)(?:\/[a-zA-Z0-9_.-]+)+\.(?:md|txt|json|yaml|yml))\b/g;
function uniq(paths) {
  return [...new Set(paths.map((p) => p.replace(/\\/g, "/")))];
}
function extractExplicitRelativePaths(line) {
  const out = /* @__PURE__ */ new Set();
  let m;
  const re2 = new RegExp(EXPLICIT_PATH_RE.source, "g");
  while ((m = re2.exec(line)) !== null) {
    const p = m[1];
    if (!p.includes("..")) out.add(p.replace(/\\/g, "/"));
  }
  return [...out];
}
function defaultImplicitCandidates(settings) {
  return uniq([
    settings.defaultConfirmWritePath?.trim() || "docs/prd.md",
    "docs/prd_v1.2.md",
    "docs/prd.md"
  ]);
}
function shouldTryImplicitPrdFiles(cmd, displayLine, bodyOrLine) {
  if (extractExplicitRelativePaths(bodyOrLine).length > 0) return false;
  if (cmd.matched && cmd.stem === "project-manager") {
    return /(?:需求|PRD|prd|产品经理|任务拆解|WBS|拆解|工作包)/i.test(bodyOrLine);
  }
  if (cmd.matched && cmd.stem === "product-manager") {
    return /(?:需求|PRD|prd|产品经理|项目|实现|检查|优化|落地|范围|验收|现状)/i.test(bodyOrLine);
  }
  if (!cmd.matched) {
    return /(?:需求文档|产品经理需求|根据.*PRD|任务拆解|WBS|优化|WEB|web\s*应用|项目|按照|上文)/i.test(
      displayLine
    );
  }
  return false;
}
function shouldInjectFollowUpWorkspaceContext(displayLine) {
  const s = displayLine.trim();
  if (!s) return false;
  return /(?:按照|根据|依).*?(?:以上|上文|前面|刚才|优化)/i.test(s) || /继续.*?(?:优化|写|做|完善)/i.test(s) || /(?:上面|前文)(?:的|说|提到)?/i.test(s) || /^执行(?:优化|改进|方案)?$/i.test(s) || /执行.*优化|落地.*优化|按.*优化建议/i.test(s) || /(?:将|把).*(?:以上|上文|前面).*(?:生成|整理|写入|落盘|保存)/i.test(s) || /(?:生成|整理|写入).*(?:需求文档|PRD|prd)/i.test(s);
}
function shouldInjectProjectBootstrap(displayLine) {
  const s = displayLine.trim();
  if (!s || s.length > 96) return false;
  return /^(WEB应用|web\s*应用|本项目|当前项目|这个仓库|工作区)$/i.test(s);
}
function flattenPanelTree(nodes, prefix = "", out = [], depth = 0) {
  if (depth > 4 || out.length > 120) return out;
  for (const n of nodes) {
    if (!n?.name) continue;
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "file") out.push(p);
    else {
      out.push(`${p}/`);
      if (Array.isArray(n.children)) {
        flattenPanelTree(n.children, p, out, depth + 1);
      }
    }
  }
  return out;
}
async function buildWorkspaceContextAppendix(desktop) {
  const parts = [];
  const injectedPaths = [];
  if (typeof desktop.workspaceGetExecutionSnapshot === "function") {
    try {
      const snap = await desktop.workspaceGetExecutionSnapshot();
      if (snap?.ok && typeof snap.text === "string" && snap.text.trim()) {
        parts.push(
          "【当前工作区执行情况快照】\n以下为应用从所选工作区采集的客观事实；请据此理解项目，勿编造 Django/Flask 等无关模板。\n\n" + snap.text.trim()
        );
        injectedPaths.push("（工作区快照）");
      }
    } catch {
    }
  }
  if (typeof desktop.listWorkspacePanelTree === "function") {
    try {
      const tree = await desktop.listWorkspacePanelTree();
      if (tree?.ok && Array.isArray(tree.tree) && tree.tree.length > 0) {
        const lines = flattenPanelTree(tree.tree);
        if (lines.length) {
          parts.push(
            "【工作区目录树（节选）】\n" + lines.slice(0, 100).join("\n")
          );
          injectedPaths.push("（目录树）");
        }
      }
    } catch {
    }
  }
  const read = desktop.readWorkspaceTextFile;
  if (typeof read === "function") {
    const candidates = [
      "README.md",
      "docs/TO1-requirements.md",
      "docs/architecture-layers.md",
      "docs/prd.md",
      "pyproject.toml",
      "package.json"
    ];
    let readmeDone = false;
    for (const rel of candidates) {
      try {
        const r = await read(rel);
        if (r?.ok && typeof r.text === "string" && r.text.trim()) {
          parts.push(`【工作区文件：${rel}】
${r.text.trim().slice(0, 16e3)}`);
          injectedPaths.push(rel);
          if (rel === "README.md") readmeDone = true;
          if (readmeDone && parts.length >= 3) break;
        }
      } catch {
      }
    }
  }
  const antiTemplate = "【强制·读工作区】以上内容为当前仓库真实文件。禁止假设 Django/Flask（若无 manage.py/settings.py）；禁止重复粘贴 pip install / runserver 等通用教程。若用户要求「执行/落地优化」，须基于上述 README/docs 给出针对本仓库的具体改动（路径+要点），需要写盘时使用 ```workspace-write``` JSON 或 MCP workspace-write 工具，勿只输出空泛 bash。";
  if (!parts.length) return { appendix: "", injectedPaths: [] };
  parts.push(antiTemplate);
  const joined = "\n\n---\n（以下由应用从当前工作区自动注入，请优先阅读再回答，禁止再向用户索要已在下列内容中的信息）\n\n" + parts.join("\n\n");
  const MAX_APPENDIX_CHARS = 2e4;
  return {
    appendix: joined.length > MAX_APPENDIX_CHARS ? `${joined.slice(0, MAX_APPENDIX_CHARS)}

…（工作区注入已截断至 ${MAX_APPENDIX_CHARS} 字符）` : joined,
    injectedPaths
  };
}
function shouldInjectClaudeAgentsCatalog(displayLine) {
  const s = displayLine.trim();
  if (!s) return false;
  return /三省|六部|sanshengliubu|翰林|中书|门下|尚书/i.test(s) || /(?:智能体|Agent|agent).*?(?:配置|职责|列表|目录)/i.test(s) || /~\/.claude\/agents/i.test(s) || /(?:查看|列出|显示).*(?:配置|职责|Agent|智能体)/i.test(s);
}
async function buildClaudeAgentsCatalogAppendix(desktop) {
  if (typeof desktop.listClaudeAgentMarkdown !== "function") {
    return { appendix: "", injectedPaths: [] };
  }
  const r = await desktop.listClaudeAgentMarkdown();
  const label = "~/.claude/agents（含 sanshengliubu/ 三省六部扩展）";
  if (!r?.ok) {
    return {
      appendix: `

---
（以下由应用尝试扫描 ${label} 失败：${r?.error ?? "未知错误"}）
`,
      injectedPaths: []
    };
  }
  const items = r.items ?? [];
  if (items.length === 0) {
    return {
      appendix: `

---
（以下由应用扫描 ${label}：当前尚无 .md；可在「智能体」页或本机目录添加角色文件。）
`,
      injectedPaths: ["~/.claude/agents（空目录）"]
    };
  }
  const lines = items.map((row) => {
    const loc = row.source === "sanshengliubu" ? `sanshengliubu/${row.basename}` : row.basename;
    const desc = (row.description || "").replace(/\s+/g, " ").trim().slice(0, 240);
    const cat = row.category ? ` [${row.category}]` : "";
    return `- **${loc}**${cat}${desc ? ` — ${desc}` : ""}`;
  });
  const body = [
    "【本机 Agent 角色索引】根目录为常用角色；**sanshengliubu/** 下为「三省六部」等扩展角色（与界面「智能体」页一致）。",
    "同名 `.md` 若根目录与 sanshengliubu 各有一份，索引会列两条；实际按 stem 读规则时仍**优先根目录**（与桌面「读 Agent」一致）。",
    "",
    ...lines
  ].join("\n");
  return {
    appendix: `

---
（以下由应用从 ${label} 自动读入目录索引）

${body}`,
    injectedPaths: ["~/.claude/agents（目录索引）"]
  };
}
async function expandUserLineWithWorkspaceFiles(desktop, baseUserLine, opts) {
  const { settings, cmd, displayLine } = opts;
  const injected = [];
  const seen = /* @__PURE__ */ new Set();
  const read = desktop.readWorkspaceTextFile;
  if (typeof read === "function") {
    const explicit = extractExplicitRelativePaths(baseUserLine);
    for (const rel of explicit) {
      if (seen.has(rel)) continue;
      const r = await read(rel);
      if (r?.ok && typeof r.text === "string" && r.text.trim()) {
        seen.add(rel);
        injected.push({ path: rel, text: r.text });
      }
    }
    const tryImplicit = shouldTryImplicitPrdFiles(cmd, displayLine, baseUserLine) && injected.length === 0;
    if (cmd.matched && typeof read === "function") {
      for (const rel of relatedArtifactPathsForAgent(cmd.stem)) {
        if (seen.has(rel)) continue;
        const r = await read(rel);
        if (r?.ok && typeof r.text === "string" && r.text.trim()) {
          seen.add(rel);
          injected.push({ path: rel, text: r.text });
        }
      }
    }
    if (tryImplicit) {
      const candidates = cmd.matched && cmd.stem === "product-manager" ? uniq([
        ...defaultImplicitCandidates(settings),
        "README.md",
        "docs/README.md",
        "docs/overview.md"
      ]) : defaultImplicitCandidates(settings);
      for (const rel of candidates) {
        if (seen.has(rel)) continue;
        const r = await read(rel);
        if (r?.ok && typeof r.text === "string" && r.text.trim()) {
          seen.add(rel);
          injected.push({ path: rel, text: r.text });
          break;
        }
      }
    }
  }
  const workspaceAppendix = injected.length ? injected.map(
    ({ path: path2, text: text2 }) => `

---
（以下由应用从当前工作区自动读入：${path2}）

${text2}`
  ).join("") : "";
  let agentsAppendix = "";
  const agentsInjected = [];
  if (shouldInjectClaudeAgentsCatalog(displayLine)) {
    const ag = await buildClaudeAgentsCatalogAppendix(desktop);
    agentsAppendix = ag.appendix;
    agentsInjected.push(...ag.injectedPaths);
  }
  let contextAppendix = "";
  const contextInjected = [];
  const needBootstrap = shouldInjectFollowUpWorkspaceContext(displayLine) || shouldInjectProjectBootstrap(displayLine) || injected.length === 0 && shouldTryImplicitPrdFiles(cmd, displayLine, baseUserLine);
  if (needBootstrap && typeof desktop.workspaceGetExecutionSnapshot === "function") {
    const ctx = await buildWorkspaceContextAppendix(desktop);
    contextAppendix = ctx.appendix;
    contextInjected.push(...ctx.injectedPaths);
  }
  if (!workspaceAppendix && !agentsAppendix && !contextAppendix) {
    return { expanded: baseUserLine, injectedPaths: [] };
  }
  return {
    expanded: baseUserLine + workspaceAppendix + contextAppendix + agentsAppendix,
    injectedPaths: [...injected.map((x) => x.path), ...contextInjected, ...agentsInjected]
  };
}
function dedupeAgentRowsByStem(rows) {
  const byStem = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const prev = byStem.get(row.stem);
    if (!prev || prev.source === "sanshengliubu" && row.source === "root") {
      byStem.set(row.stem, row);
    }
  }
  return [...byStem.values()];
}
const AUTO_AGENT_VALUE = "";
function ChatAgentSelector({ agentBasename, onAgentChange, disabled }) {
  const [agents, setAgents] = reactExports.useState([]);
  const [query, setQuery] = reactExports.useState("");
  const [open, setOpen] = reactExports.useState(false);
  const isAuto = isAutoAgentBasename(agentBasename);
  const activeStem = isAuto ? "" : agentStemFromBasename(agentBasename);
  const reload = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.listClaudeAgentMarkdown) return;
    const r = await api.listClaudeAgentMarkdown();
    if (!r.ok || !r.items?.length) return;
    setAgents(
      dedupeAgentRowsByStem(
        r.items.map((row) => {
          const displayName = row.displayName?.trim() || resolveAgentDisplayName({
            stem: row.stem,
            basename: row.basename,
            name: row.name,
            nameZh: row.nameZh,
            heading: row.heading,
            description: row.description
          });
          return {
            basename: row.basename,
            stem: row.stem,
            description: row.description ?? "",
            displayName,
            name: row.name,
            nameZh: row.nameZh,
            heading: row.heading,
            source: row.source
          };
        })
      )
    );
  }, []);
  reactExports.useEffect(() => {
    void reload();
  }, [reload]);
  const activeAgent = agents.find((a) => a.stem === activeStem);
  const defaultAutoAgent = agents.find((a) => a.stem === "product-manager");
  const defaultAutoLabel = defaultAutoAgent?.displayName ?? resolveAgentDisplayName({ stem: "product-manager", nameZh: "全面的产品领导者" });
  const subtitle = isAuto ? `Agent · 默认与「${defaultAutoLabel}」对话` : activeAgent?.displayName ?? activeStem;
  const buttonLabel = isAuto ? "Agent" : (activeAgent?.displayName ?? activeStem) || "Agent";
  const q = query.trim().toLowerCase();
  const showAuto = !q || q.includes("auto") || q.includes("agent") || q.includes("自动") || q.includes("关键词");
  const filteredAgents = reactExports.useMemo(() => {
    if (!q) return agents;
    return agents.filter(
      (a) => agentMatchesDisplayQuery(
        {
          stem: a.stem,
          basename: a.basename,
          name: a.name,
          nameZh: a.nameZh,
          heading: a.heading,
          description: a.description,
          displayName: a.displayName
        },
        q
      )
    );
  }, [agents, q]);
  const pickAgent = (basename2) => {
    onAgentChange(basename2);
    setQuery("");
    setOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DropdownMenu,
    {
      open,
      modal: false,
      onOpenChange: (next) => {
        setOpen(next);
        if (!next) setQuery("");
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            disabled,
            title: `Agent · ${subtitle}`,
            "aria-label": "选择 Agent",
            className: cn(
              "composer-agent-pill inline-flex max-w-[9rem] items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition",
              "text-foreground/90 hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40",
              "data-[state=open]:bg-secondary/70"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: buttonLabel }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3 shrink-0 opacity-55" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DropdownMenuContent,
          {
            align: "start",
            side: "top",
            sideOffset: 8,
            collisionPadding: 8,
            className: "model-picker-menu w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0",
            onCloseAutoFocus: (e) => e.preventDefault(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "border-b border-border/80 px-2 py-2",
                  onPointerDown: (e) => e.stopPropagation(),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "search",
                        value: query,
                        onChange: (e) => setQuery(e.target.value),
                        placeholder: "搜索 Agent",
                        className: "h-8 w-full rounded-md border-0 bg-secondary/50 pl-8 pr-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:bg-secondary/80",
                        onKeyDown: (e) => e.stopPropagation(),
                        onClick: (e) => e.stopPropagation()
                      }
                    )
                  ] })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "model-picker-list max-h-[min(50vh,18rem)] overflow-y-auto py-1 scrollbar-thin", children: [
                showAuto ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: cn(
                      "model-picker-row flex w-full items-start gap-2 px-3 py-2 text-left text-[12px] transition",
                      isAuto && "model-picker-row--active"
                    ),
                    onClick: () => pickAgent(AUTO_AGENT_VALUE),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "Auto" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10.5px] text-muted-foreground", children: [
                          "自动模式 · 默认与「",
                          defaultAutoLabel,
                          "」对话，并按关键词路由其它 Agent"
                        ] })
                      ] }),
                      isAuto ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary", strokeWidth: 2.25 }) : null
                    ]
                  }
                ) : null,
                filteredAgents.length ? filteredAgents.map((agent) => {
                  const active = !isAuto && agent.stem === activeStem;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      className: cn(
                        "model-picker-row flex w-full items-start gap-2 px-3 py-2 text-left text-[12px] transition",
                        active && "model-picker-row--active"
                      ),
                      onClick: () => pickAgent(agent.basename),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-medium", children: agent.displayName }),
                          agent.description ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "line-clamp-2 text-[10.5px] leading-snug text-muted-foreground", children: agent.description }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-mono text-[10px] text-muted-foreground", children: agent.stem })
                        ] }),
                        active ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mt-0.5 h-4 w-4 shrink-0 text-primary", strokeWidth: 2.25 }) : null
                      ]
                    },
                    `${agent.source}:${agent.stem}`
                  );
                }) : agents.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-4 text-center text-[12px] text-muted-foreground", children: "无匹配 Agent" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-4 text-center text-[12px] text-muted-foreground", children: "未扫描到 Agent 文件" })
              ] })
            ]
          }
        )
      ]
    }
  );
}
function tierLabel(tier) {
  if (tier === "Fast") return "快速";
  if (tier === "High") return "高质";
  if (tier === "Local") return "本地";
  if (tier === "Cloud") return "云端";
  return tier;
}
function tierForCloud(model) {
  const id = model.trim().toLowerCase();
  if (id === "sonnet" || id === "haiku") return "Fast";
  if (id === "opus") return "High";
  if (id.includes("opus")) return "High";
  if (id.includes("haiku")) return "Fast";
  if (id.includes("sonnet")) return "Fast";
  if (id.includes("flash")) return "Fast";
  if (id.includes("pro")) return "High";
  return "Cloud";
}
function buildModelEntries(cloudModels, localModels) {
  const cloud = cloudModels.filter(Boolean).map((model) => ({
    mode: "claude-code",
    model,
    tier: tierForCloud(model)
  }));
  const local = localModels.filter(Boolean).map((model) => ({
    mode: "local-mcp",
    model,
    tier: "Local"
  }));
  return [...cloud, ...local];
}
function isAutoModel(model) {
  const m = model.trim().toLowerCase();
  return !m || m === AUTO_MODEL_ID;
}
function shortModelLabel(model, mode) {
  if (isAutoModel(model)) return "Auto";
  const m = model.trim();
  if (mode === "local-mcp" && !m) return "Local";
  const tail = m.includes("/") ? m.split("/").pop() : m;
  if (tail.length <= 22) return tail;
  return `${tail.slice(0, 20)}…`;
}
function displayModelName(model) {
  const m = model.trim();
  if (/^(sonnet|opus|haiku)$/i.test(m)) return m.charAt(0).toUpperCase() + m.slice(1);
  return m;
}
function ChatModelSelector({
  orchMode,
  cloudModels,
  localModels,
  modelValue,
  onModelPick,
  modelFallback,
  disabled
}) {
  const [query, setQuery] = reactExports.useState("");
  const [open, setOpen] = reactExports.useState(false);
  const selectedModel = modelValue || modelFallback || "";
  const isAutoSelected = isAutoModelSelection(selectedModel);
  const displayLabel = isAutoSelected ? "Auto" : shortModelLabel(selectedModel, orchMode);
  const entries2 = reactExports.useMemo(
    () => buildModelEntries(cloudModels, localModels),
    [cloudModels, localModels]
  );
  const filtered = reactExports.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries2;
    return entries2.filter(
      (e) => e.model.toLowerCase().includes(q) || e.tier.toLowerCase().includes(q) || e.mode === "claude-code" && "cloud".includes(q) || e.mode === "local-mcp" && "local".includes(q) || "auto".includes(q)
    );
  }, [entries2, query]);
  const autoAvailable = cloudModels.length > 0 || localModels.length > 0;
  const autoPick = { mode: "claude-code", model: AUTO_MODEL_ID };
  const pickModel = (pick) => {
    onModelPick(pick);
    setQuery("");
    setOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    DropdownMenu,
    {
      open,
      modal: false,
      onOpenChange: (next) => {
        setOpen(next);
        if (!next) setQuery("");
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            disabled,
            title: isAutoSelected ? "Auto（云模型优先，无云则用本地）" : selectedModel || "选择模型",
            "aria-label": "选择模型",
            className: cn(
              "composer-model-pill inline-flex max-w-[5.5rem] items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition",
              "text-foreground/90 hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40",
              "data-[state=open]:bg-secondary/70"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate", children: displayLabel }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-3 w-3 shrink-0 opacity-55" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          DropdownMenuContent,
          {
            align: "start",
            side: "top",
            sideOffset: 8,
            collisionPadding: 8,
            className: "model-picker-menu w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0",
            onCloseAutoFocus: (e) => e.preventDefault(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "border-b border-border/80 px-2 py-2",
                  onPointerDown: (e) => e.stopPropagation(),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "search",
                        value: query,
                        onChange: (e) => setQuery(e.target.value),
                        placeholder: "搜索模型",
                        className: "h-8 w-full rounded-md border-0 bg-secondary/50 pl-8 pr-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:bg-secondary/80",
                        onKeyDown: (e) => e.stopPropagation(),
                        onClick: (e) => e.stopPropagation()
                      }
                    )
                  ] })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "model-picker-list max-h-[min(50vh,18rem)] overflow-y-auto py-1 scrollbar-thin", children: [
                !query.trim() && autoAvailable ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    className: cn(
                      "model-picker-row flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition",
                      isAutoSelected && "model-picker-row--active"
                    ),
                    onClick: () => pickModel(autoPick),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate font-medium", children: "Auto" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10.5px] text-muted-foreground", children: "云优先" }),
                      isAutoSelected ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4 shrink-0 text-primary", strokeWidth: 2.25 }) : null
                    ]
                  }
                ) : null,
                filtered.length ? filtered.map((entry) => {
                  const active = !isAutoSelected && orchMode === entry.mode && entry.model === selectedModel;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      className: cn(
                        "model-picker-row flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition",
                        active && "model-picker-row--active"
                      ),
                      onClick: () => pickModel({ mode: entry.mode, model: entry.model }),
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex min-w-0 flex-1 items-baseline gap-2", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate font-medium", children: displayModelName(entry.model) }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0 text-[11px] text-muted-foreground", children: tierLabel(entry.tier) })
                        ] }),
                        active ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4 shrink-0 text-primary", strokeWidth: 2.25 }) : null
                      ]
                    },
                    `${entry.mode}:${entry.model}`
                  );
                }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "px-3 py-4 text-center text-[12px] text-muted-foreground", children: "无匹配模型" })
              ] })
            ]
          }
        )
      ]
    }
  );
}
function ComposerTerminalAttachments({
  snippets,
  onRemove,
  className
}) {
  if (!snippets.length) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex flex-wrap items-center gap-1.5 px-3 pt-2.5 pb-1", className), children: snippets.map((snippet) => {
    const chipLabel = formatTerminalChipLabel(snippet);
    const preview = trimTerminalDisplay(snippet.text);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "span",
      {
        className: "group/chip terminal-context-chip inline-flex max-w-full items-center gap-1 rounded-[5px] px-1.5 py-0.5 font-mono text-[12px] leading-none",
        title: preview,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SquareTerminal, { className: "h-3 w-3 shrink-0 opacity-85", "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: chipLabel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-current/70 opacity-0 transition hover:bg-black/10 hover:text-current group-hover/chip:opacity-100 dark:hover:bg-white/10",
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(snippet.id);
              },
              title: "移除终端选区",
              "aria-label": `移除 ${chipLabel}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" })
            }
          )
        ]
      },
      snippet.id
    );
  }) });
}
function ChatComposerShell({
  textareaRef,
  input,
  onInputChange,
  onSend,
  onStop,
  onPaste,
  placeholder,
  disabled,
  workflowBusy,
  hasDesktopApi,
  canSend,
  pendingImages,
  onRemoveImage,
  pendingTerminalSnippets,
  onRemoveTerminalSnippet,
  onPickFiles,
  orchMode,
  localAgentBasename,
  onAgentChange,
  cloudModels,
  localModels,
  modelValue,
  modelFallback,
  onModelPick,
  editHistoryActive,
  onCancelEdit,
  variant = "dock"
}) {
  const inline = variant === "inline";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "chat-composer-cursor overflow-hidden rounded-xl border border-border/80 bg-background/80 shadow-sm transition focus-within:border-primary/35",
        editHistoryActive && "ring-1 ring-primary/20",
        inline && "chat-composer-cursor--inline"
      ),
      children: [
        editHistoryActive ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-composer-edit-banner flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-3 py-1.5 text-[11.5px] text-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: inline ? "编辑此提问 · 发送后将从此处重新对话" : "正在编辑历史消息 · 发送后将从此处重新对话" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              className: "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
              onClick: onCancelEdit,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" }),
                "取消"
              ]
            }
          )
        ] }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-composer-body px-3 pt-2.5", children: [
          pendingImages.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2 flex flex-wrap gap-2", children: pendingImages.map((img) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/20",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: img.dataUrl, alt: "", className: "h-full w-full object-cover" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 opacity-0 shadow-sm transition group-hover:opacity-100",
                    onClick: () => onRemoveImage(img.id),
                    "aria-label": "移除图片",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" })
                  }
                )
              ]
            },
            img.id
          )) }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ComposerTerminalAttachments,
            {
              snippets: pendingTerminalSnippets,
              onRemove: onRemoveTerminalSnippet
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              ref: textareaRef,
              value: input,
              onChange: (e) => onInputChange(e.target.value),
              onPaste,
              onKeyDown: (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!workflowBusy && canSend) onSend();
                }
              },
              placeholder,
              rows: 1,
              disabled,
              className: "scrollbar-thin box-border block w-full min-w-0 resize-none bg-transparent py-1.5 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/75 disabled:opacity-60",
              style: { minHeight: "28px", maxHeight: inline ? "180px" : "220px" }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "composer-cursor-footer flex min-w-0 items-center gap-1 px-2 pb-2 pt-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "composer-cursor-controls flex min-w-0 flex-1 items-center gap-0.5 overflow-visible", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ChatAgentSelector,
              {
                agentBasename: localAgentBasename,
                onAgentChange,
                disabled: !hasDesktopApi || workflowBusy
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ChatModelSelector,
              {
                orchMode,
                cloudModels,
                localModels,
                modelValue,
                onModelPick,
                modelFallback,
                disabled: !hasDesktopApi || workflowBusy
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                title: "添加文件或图片",
                disabled: !hasDesktopApi || workflowBusy,
                onClick: () => onPickFiles({ onlyImages: false }),
                className: "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground disabled:opacity-40",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "h-3.5 w-3.5" })
              }
            ),
            workflowBusy ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: onStop,
                className: "inline-flex h-7 w-7 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive transition hover:bg-destructive/15",
                title: "停止",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleStop, { className: "h-3.5 w-3.5" })
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: onSend,
                disabled: !canSend || !hasDesktopApi,
                className: "inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-35",
                title: "发送 (Enter)",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUp, { className: "h-3.5 w-3.5", strokeWidth: 2.25 })
              }
            )
          ] })
        ] })
      ]
    }
  );
}
function ChatComposerCursor({
  dockRef,
  chainStatusLabel,
  chainStatusTone,
  editHistoryActive,
  onCancelEdit,
  ...shellProps
}) {
  const fileBar = reactExports.useSyncExternalStore(
    subscribeComposerFileBar,
    getComposerFileBarState,
    getComposerFileBarState
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: dockRef, className: "chat-pane-composer border-t border-border/70 bg-card", children: [
    fileBar.count > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "composer-file-changes-bar mb-2 flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/35 px-2.5 py-1.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1 truncate text-[12px] font-medium text-foreground", children: [
        "> ",
        fileBar.count,
        " Files"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "shrink-0 text-[12px] text-muted-foreground transition hover:text-foreground",
          onClick: () => fileBar.undoAll?.(),
          children: "Undo All"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "shrink-0 rounded-md bg-secondary px-2.5 py-0.5 text-[12px] font-medium text-foreground transition hover:bg-secondary/80",
          onClick: () => fileBar.review?.(),
          children: "Review"
        }
      )
    ] }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ChatComposerShell,
      {
        ...shellProps,
        editHistoryActive,
        onCancelEdit,
        variant: "dock"
      }
    ),
    chainStatusLabel && chainStatusLabel !== "链：—" && chainStatusTone !== "done" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 flex justify-start px-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: cn(
          "inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium",
          chainStatusTone === "active" && "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          chainStatusTone === "idle" && "border-sky-400/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
          chainStatusTone === "paused" && "border-amber-400/45 bg-amber-500/12 text-amber-800 dark:text-amber-300",
          chainStatusTone === "done" && "border-blue-400/40 bg-blue-500/10 text-blue-800 dark:text-blue-300",
          chainStatusTone === "neutral" && "border-border/70 bg-background/35 text-muted-foreground"
        ),
        title: "任务链状态",
        children: chainStatusLabel
      }
    ) }) : null
  ] });
}
function ChatCursorCollapsible({
  lineCount,
  collapseAfterLines = 4,
  children,
  bodyClassName,
  expanded: expandedProp,
  onExpandedChange,
  hideToggle = false
}) {
  const [expandedLocal, setExpandedLocal] = reactExports.useState(false);
  const expanded = expandedProp ?? expandedLocal;
  const setExpanded = onExpandedChange ?? setExpandedLocal;
  const collapsible = lineCount > collapseAfterLines;
  const toggle = () => {
    if (!collapsible) return;
    setExpanded(!expanded);
  };
  if (!collapsible) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("chat-cursor-collapsible-body", bodyClassName), children });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "chat-cursor-collapsible",
        !expanded && "chat-cursor-collapsible--collapsed",
        expanded && "chat-cursor-collapsible--expanded"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: cn(
              "chat-cursor-collapsible-body",
              bodyClassName,
              !expanded && "chat-cursor-collapsible-body--collapsed",
              expanded && "chat-cursor-collapsible-body--expanded"
            ),
            children
          }
        ),
        !hideToggle ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "chat-cursor-collapsible-toggle",
            onClick: toggle,
            "aria-expanded": expanded,
            "aria-label": expanded ? "收起" : "展开全部",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              ChevronDown,
              {
                className: cn(
                  "chat-cursor-collapsible-chevron",
                  expanded && "chat-cursor-collapsible-chevron--open"
                )
              }
            )
          }
        ) : null
      ]
    }
  );
}
function ChatCursorCollapsibleChevron({
  expanded,
  collapsible
}) {
  if (!collapsible) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-file-edit-card-chevron-spacer", "aria-hidden": true });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ChevronRight,
    {
      className: cn(
        "chat-file-edit-card-head-chevron",
        expanded && "chat-file-edit-card-head-chevron--open"
      ),
      "aria-hidden": true
    }
  );
}
function useCursorCollapsibleState(lineCount, collapseAfterLines = 4) {
  const [expanded, setExpanded] = reactExports.useState(false);
  const collapsible = lineCount > collapseAfterLines;
  return { expanded, setExpanded, collapsible, toggle: () => collapsible && setExpanded((v) => !v) };
}
const TS_KEYWORDS = /\b(import|export|from|as|const|let|var|function|return|if|else|type|interface|extends|new|async|await|default|case|switch|while|for|of|in|class|public|private|protected|readonly|void|null|undefined|true|false)\b/g;
const TS_TYPES = /\b([A-Z][A-Za-z0-9_]*)\b/g;
const STRINGS = /(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
const COMMENTS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
const NUMBERS = /\b(\d+(?:\.\d+)?)\b/g;
function wrapClass(text2, cls) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cls, children: text2 });
}
function highlightWithRules(text2, rules) {
  const parts = [];
  for (const { re: re2, cls } of rules) {
    re2.lastIndex = 0;
    let m;
    while ((m = re2.exec(text2)) !== null) {
      parts.push({ start: m.index, end: m.index + m[0].length, cls });
    }
  }
  parts.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (const p of parts) {
    if (merged.some((x) => p.start < x.end && p.end > x.start)) continue;
    merged.push(p);
  }
  merged.sort((a, b) => a.start - b.start);
  const out = [];
  let i = 0;
  for (const p of merged) {
    if (p.start > i) out.push(text2.slice(i, p.start));
    out.push(wrapClass(text2.slice(p.start, p.end), p.cls));
    i = p.end;
  }
  if (i < text2.length) out.push(text2.slice(i));
  return out.length ? out : [text2];
}
function highlightDiffLine(text2, language) {
  const lang = language.toLowerCase();
  if (lang === "markdown") {
    return highlightWithRules(text2, [
      { re: /^#{1,6}\s.+$/g, cls: "chat-diff-tok-heading" },
      { re: STRINGS, cls: "chat-diff-tok-string" },
      { re: COMMENTS, cls: "chat-diff-tok-comment" }
    ]);
  }
  if (lang === "css" || lang === "scss") {
    return highlightWithRules(text2, [
      { re: COMMENTS, cls: "chat-diff-tok-comment" },
      { re: STRINGS, cls: "chat-diff-tok-string" },
      { re: /#[\w-]+|\.\w[\w-]*/g, cls: "chat-diff-tok-type" },
      { re: /[a-z-]+(?=\s*:)/gi, cls: "chat-diff-tok-keyword" }
    ]);
  }
  return highlightWithRules(text2, [
    { re: COMMENTS, cls: "chat-diff-tok-comment" },
    { re: STRINGS, cls: "chat-diff-tok-string" },
    { re: TS_KEYWORDS, cls: "chat-diff-tok-keyword" },
    { re: TS_TYPES, cls: "chat-diff-tok-type" },
    { re: NUMBERS, cls: "chat-diff-tok-number" }
  ]);
}
const EXT_LANG = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  py: "python",
  rs: "rust",
  go: "go",
  sh: "shell"
};
function languageFromPath(path2) {
  const base = path2.split("/").pop() ?? path2;
  const ext = base.includes(".") ? base.split(".").pop()?.toLowerCase() ?? "" : "";
  return EXT_LANG[ext] ?? (ext || "text");
}
function fileBadgeFromPath(path2) {
  const base = path2.split("/").pop() ?? path2;
  const ext = base.includes(".") ? base.split(".").pop()?.toUpperCase() ?? "" : "";
  if (ext.length <= 4) return ext || "FILE";
  return ext.slice(0, 4);
}
function linesToAddPreview(content2, maxLines = 28) {
  const lines = content2.replace(/\r\n/g, "\n").split("\n");
  return lines.slice(0, maxLines).map((text2) => ({ kind: "add", text: text2 }));
}
function countLineStats(lines) {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.kind === "add") added++;
    else if (l.kind === "del") removed++;
  }
  return { added, removed };
}
function makeEdit(seq2, partial) {
  seq2.n += 1;
  return { id: `${partial.path}::${seq2.n}`, ...partial };
}
function parseDiffBody(body, fallbackPath, seq2) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let path2 = "";
  const previewLines = [];
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (!path2) {
      const plus = line.match(/^\+\+\+\s+(?:b\/)?(.+?)\s*$/);
      if (plus?.[1]) path2 = plus[1].trim();
      const minus = line.match(/^---\s+(?:a\/)?(.+?)\s*$/);
      if (!path2 && minus?.[1] && !/^dev\/null/i.test(minus[1])) path2 = minus[1].trim();
    }
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) continue;
    if (line.startsWith("+")) previewLines.push({ kind: "add", text: line.slice(1) });
    else if (line.startsWith("-")) previewLines.push({ kind: "del", text: line.slice(1) });
    else if (line.trim()) previewLines.push({ kind: "ctx", text: line });
  }
  if (!path2 && previewLines.length === 0) return null;
  const stats = countLineStats(previewLines);
  return makeEdit(seq2, {
    path: path2 || "file",
    language: languageFromPath(path2 || ""),
    added: stats.added,
    removed: stats.removed,
    previewLines: previewLines.slice(0, 32)
  });
}
function parsePathFromCodeInfo(info) {
  const t = info.trim();
  if (!t) return null;
  const colon = t.match(/^(?:[\w.-]+:)?(.+\.[a-z0-9]{1,8})$/i);
  if (colon?.[1] && /\//.test(colon[1])) return colon[1].replace(/\\/g, "/");
  const pathish = t.match(
    /((?:docs|src|app|web|server|lib|components|routes)\/[a-zA-Z0-9_./-]+\.[a-z0-9]{1,8})/i
  );
  return pathish?.[1]?.replace(/\\/g, "/") ?? null;
}
function parseInlineWrittenPaths(text2, seq2) {
  const edits = [];
  const seen = /* @__PURE__ */ new Set();
  const patterns = [
    /已写入(?:[^`\n]*?)`([^`]+\.\w{1,8})`/gi,
    /已写入\s+[`'"]?((?:docs|[\w.-]+)\/[\w./-]+\.\w{1,8})/gi,
    /已写入\s+[`'"]?([\w./-]+\.(?:md|tsx?|jsx?|json|css|py|cjs|mjs))/gi
  ];
  for (const re2 of patterns) {
    re2.lastIndex = 0;
    let m;
    while ((m = re2.exec(text2)) !== null) {
      const p = m[1]?.replace(/\\/g, "/").trim();
      if (!p || seen.has(p)) continue;
      seen.add(p);
      edits.push(
        makeEdit(seq2, {
          path: p,
          language: languageFromPath(p),
          added: 0,
          removed: 0,
          previewLines: [],
          summaryOnly: true
        })
      );
    }
  }
  return edits;
}
function stripInlineWrittenClaims(text2) {
  return text2.replace(/^[^\n]*已写入\s+[`'"]?[\w./-]+\.\w+[`'"]?[^\n]*\n?/gim, "").replace(/^[^\n]*分析完成[^\n]*已写入[^\n]*\n?/gim, "").replace(/\n{3,}/g, "\n\n").trim();
}
function parseWrittenPathSummary(text2, seq2) {
  const edits = [];
  const blockRe = /【工作区已写入】[^\n]*\n((?:- `[^`\n]+`\n?)+)/g;
  let m;
  while ((m = blockRe.exec(text2)) !== null) {
    const lines = m[1].match(/- `([^`\n]+)`/g) ?? [];
    for (const raw of lines) {
      const p = raw.replace(/^- `|`$/g, "").trim();
      if (!p) continue;
      edits.push(
        makeEdit(seq2, {
          path: p,
          language: languageFromPath(p),
          added: 0,
          removed: 0,
          previewLines: [],
          summaryOnly: true
        })
      );
    }
  }
  return edits;
}
function parseChatFileEdits(text2) {
  if (!text2?.trim()) return { edits: [], stripped: text2 };
  const seq2 = { n: 0 };
  const edits = [];
  let stripped = text2;
  for (const item of parseWorkspaceWriteItemsFromBubble(text2)) {
    const previewLines = linesToAddPreview(item.content);
    const lineCount = item.content.replace(/\r\n/g, "\n").split("\n").length;
    edits.push(
      makeEdit(seq2, {
        path: item.path,
        language: languageFromPath(item.path),
        added: lineCount,
        removed: 0,
        previewLines
      })
    );
  }
  if (edits.length > 0) {
    stripped = stripWorkspaceWriteFencesForHistory(stripped);
  }
  const diffRe = /```diff\s*\n([\s\S]*?)```/gi;
  let dm;
  const diffRemovals = [];
  while ((dm = diffRe.exec(text2)) !== null) {
    const edit = parseDiffBody(dm[1] ?? "", void 0, seq2);
    if (edit) edits.push(edit);
    diffRemovals.push({ start: dm.index, end: dm.index + dm[0].length });
  }
  for (let i = diffRemovals.length - 1; i >= 0; i--) {
    const { start, end } = diffRemovals[i];
    stripped = stripped.slice(0, start) + stripped.slice(end);
  }
  const codeRe = /```([\w.:/\\-]+)\s*\n([\s\S]*?)```/g;
  let cm;
  const codeRemovals = [];
  while ((cm = codeRe.exec(text2)) !== null) {
    const info = cm[1] ?? "";
    if (/^diff$/i.test(info)) continue;
    const path2 = parsePathFromCodeInfo(info);
    if (!path2) continue;
    const body = (cm[2] ?? "").replace(/\n$/, "");
    if (!body.trim()) continue;
    const previewLines = linesToAddPreview(body);
    edits.push(
      makeEdit(seq2, {
        path: path2,
        language: languageFromPath(path2),
        added: body.split("\n").length,
        removed: 0,
        previewLines
      })
    );
    codeRemovals.push({ start: cm.index, end: cm.index + cm[0].length });
  }
  for (let i = codeRemovals.length - 1; i >= 0; i--) {
    const { start, end } = codeRemovals[i];
    stripped = stripped.slice(0, start) + stripped.slice(end);
  }
  for (const edit of parseWrittenPathSummary(text2, seq2)) {
    if (!edits.some((e) => e.path === edit.path)) edits.push(edit);
  }
  for (const edit of parseInlineWrittenPaths(text2, seq2)) {
    if (!edits.some((e) => e.path === edit.path)) edits.push(edit);
  }
  stripped = stripInlineWrittenClaims(stripped);
  stripped = stripped.replace(/\n*【工作区已写入】[^\n]*\n(?:- `[^`\n]+`\n?)+/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return { edits, stripped };
}
function takeEditForPath(path2, pool, used) {
  const queue = pool.get(path2);
  if (!queue?.length) return null;
  while (queue.length) {
    const edit = queue.shift();
    if (used.has(edit.id)) continue;
    used.add(edit.id);
    return edit;
  }
  return null;
}
function buildEditPool(edits) {
  const pool = /* @__PURE__ */ new Map();
  for (const edit of edits) {
    const list2 = pool.get(edit.path) ?? [];
    list2.push(edit);
    pool.set(edit.path, list2);
  }
  return pool;
}
function summaryEditForPath(path2, seq2) {
  return makeEdit(seq2, {
    path: path2,
    language: languageFromPath(path2),
    added: 0,
    removed: 0,
    previewLines: [],
    summaryOnly: true
  });
}
function EditLine({
  line,
  language,
  cursorStyle
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "chat-file-edit-line font-mono whitespace-pre-wrap break-all",
        cursorStyle ? "chat-file-edit-line--cursor" : "text-[11.5px] leading-[1.45]",
        line.kind === "add" && "chat-file-edit-line--add",
        line.kind === "del" && "chat-file-edit-line--del",
        line.kind === "ctx" && (cursorStyle ? "chat-file-edit-line--ctx" : "text-muted-foreground")
      ),
      children: highlightDiffLine(line.text || " ", language)
    }
  );
}
function EditStats({ edit }) {
  const showStats = edit.added > 0 || edit.removed > 0;
  if (showStats) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chat-file-edit-stats font-mono tabular-nums", children: [
      edit.added > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chat-file-edit-stat-add", children: [
        "+",
        edit.added
      ] }) : null,
      edit.removed > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chat-file-edit-stat-del", children: [
        "-",
        edit.removed
      ] }) : null
    ] });
  }
  if (edit.summaryOnly) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-file-edit-stat-muted", children: "已写入" });
  }
  return null;
}
function CursorFileEditCard({ edit }) {
  const badge = fileBadgeFromPath(edit.path);
  const fileName = edit.path.split("/").pop() ?? edit.path;
  const hasPreview = edit.previewLines.length > 0;
  const { expanded, setExpanded, collapsible, toggle } = useCursorCollapsibleState(
    edit.previewLines.length
  );
  const HeadTag = collapsible ? "button" : "div";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "chat-file-edit-card chat-file-edit-card--cursor",
        collapsible && !expanded && "chat-file-edit-card--collapsed",
        collapsible && expanded && "chat-file-edit-card--expanded"
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          HeadTag,
          {
            type: collapsible ? "button" : void 0,
            className: cn(
              "chat-file-edit-card-head",
              collapsible && "chat-file-edit-card-head--clickable"
            ),
            onClick: collapsible ? toggle : void 0,
            "aria-expanded": collapsible ? expanded : void 0,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ChatCursorCollapsibleChevron, { expanded, collapsible }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-file-edit-badge", children: badge }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileCodeCorner, { className: "chat-file-edit-card-icon", "aria-hidden": true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-file-edit-card-name", title: edit.path, children: fileName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(EditStats, { edit })
            ]
          }
        ),
        hasPreview ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChatCursorCollapsible,
          {
            lineCount: edit.previewLines.length,
            bodyClassName: "chat-file-edit-card-body",
            expanded,
            onExpandedChange: setExpanded,
            children: edit.previewLines.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(EditLine, { line, language: edit.language, cursorStyle: true }, i))
          }
        ) : null
      ]
    }
  );
}
function ClassicFileEditCard({ edit }) {
  const [open, setOpen] = reactExports.useState(false);
  const badge = fileBadgeFromPath(edit.path);
  const fileName = edit.path.split("/").pop() ?? edit.path;
  const hasPreview = edit.previewLines.length > 0;
  const expandable = hasPreview;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-file-edit-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: cn(
          "chat-file-edit-row-btn flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left transition",
          expandable && "hover:bg-muted/40",
          !expandable && "cursor-default"
        ),
        onClick: () => expandable && setOpen((v) => !v),
        "aria-expanded": expandable ? open : void 0,
        children: [
          expandable ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            ChevronRight,
            {
              className: cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90"
              )
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-file-edit-badge", children: badge }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileCodeCorner, { className: "h-3.5 w-3.5 shrink-0 text-sky-500/85 dark:text-sky-400/90", "aria-hidden": true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 truncate font-mono text-[12px] text-foreground/90", title: edit.path, children: fileName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(EditStats, { edit }) })
        ]
      }
    ),
    open && hasPreview ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-file-edit-preview mt-0.5 overflow-hidden rounded-md border border-border/50 bg-code-bg/70", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-[min(220px,32vh)] overflow-auto px-2.5 py-2", children: edit.previewLines.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(EditLine, { line, language: edit.language }, i)) }) }) : null
  ] });
}
function ChatFileEditCard({
  edit,
  variant = "classic"
}) {
  if (variant === "cursor") return /* @__PURE__ */ jsxRuntimeExports.jsx(CursorFileEditCard, { edit });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ClassicFileEditCard, { edit });
}
function ChatFileEditList({
  edits,
  usePanel = false,
  variant = "classic"
}) {
  if (!edits.length) return null;
  if (variant === "cursor") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-file-edit-stack", children: edits.map((edit) => /* @__PURE__ */ jsxRuntimeExports.jsx(ChatFileEditCard, { edit, variant: "cursor" }, edit.id)) });
  }
  const list2 = /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("chat-file-edit-list", !usePanel && "mt-2 space-y-0.5"), children: edits.map((edit) => /* @__PURE__ */ jsxRuntimeExports.jsx(ChatFileEditCard, { edit, variant: "classic" }, edit.id)) });
  if (usePanel) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-file-edit-panel", children: list2 });
  }
  return list2;
}
function normalizeThoughtTitle(title) {
  const t = title.trim();
  if (/^thought\b/i.test(t)) return t.replace(/^thought\b/i, "Thought");
  if (/^思考/.test(t)) return t;
  return t || "Thought";
}
function ChatThoughtBlock({ title, body }) {
  const [open, setOpen] = reactExports.useState(false);
  const label = reactExports.useMemo(() => normalizeThoughtTitle(title), [title]);
  const hasBody = Boolean(body.trim());
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-thought-block", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        className: "chat-thought-toggle",
        onClick: () => hasBody && setOpen((v) => !v),
        "aria-expanded": hasBody ? open : void 0,
        disabled: !hasBody,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: cn("chat-thought-chevron", open && "chat-thought-chevron--open") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: label })
        ]
      }
    ),
    open && hasBody ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-thought-body", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChatMarkdown, { content: body, className: "chat-thought-md" }) }) : null
  ] });
}
const TOOL_META = {
  Read: { icon: FileText, label: "Read" },
  Glob: { icon: FileText, label: "Glob" },
  Grep: { icon: FileText, label: "Grep" },
  Search: { icon: FileText, label: "Search" },
  Edit: { icon: Pencil, label: "Edit" },
  Write: { icon: Pencil, label: "Write" },
  MultiEdit: { icon: Pencil, label: "Edit" },
  Bash: { icon: Terminal, label: "Bash" },
  WebFetch: { icon: Globe, label: "WebFetch" },
  WebSearch: { icon: Globe, label: "WebSearch" }
};
function toolMeta(name2) {
  return TOOL_META[name2] ?? { icon: Wrench, label: name2 };
}
function ChatToolActivityRow({ name: name2, arg, status }) {
  const meta = toolMeta(name2);
  const Icon = meta.icon;
  const displayArg = arg?.trim().replace(/^[`'"]|[`'"]$/g, "");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-tool-activity-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "chat-tool-activity-icon", "aria-hidden": true }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-tool-activity-name", children: meta.label }),
    displayArg ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-tool-activity-arg", title: displayArg, children: displayArg }) : null,
    status === "running" ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "chat-tool-activity-status animate-spin", "aria-hidden": true }) : status === "fail" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-tool-activity-status chat-tool-activity-status--fail", "aria-hidden": true }) : null
  ] });
}
function ChatToolActivityGroup({ items }) {
  if (!items.length) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-tool-activity-group", children: items.map((item, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(ChatToolActivityRow, { ...item }, `${item.name}:${item.arg ?? ""}:${i}`)) });
}
function isFileEditTool(name2, arg) {
  const pathArg = arg?.trim().replace(/^[`'"]|[`'"]$/g, "") ?? "";
  return Boolean(pathArg && /^(Edit|Write|MultiEdit)$/i.test(name2) && /\.\w+$/.test(pathArg));
}
const ICONS = {
  Read: { icon: FileText, color: "text-tool-read", tone: "bg-tool-read/10 border-tool-read/30" },
  Glob: { icon: FileText, color: "text-tool-read", tone: "bg-tool-read/10 border-tool-read/30" },
  Grep: { icon: FileText, color: "text-tool-read", tone: "bg-tool-read/10 border-tool-read/30" },
  Edit: { icon: Pencil, color: "text-tool-edit", tone: "bg-tool-edit/10 border-tool-edit/30" },
  Write: { icon: Pencil, color: "text-tool-edit", tone: "bg-tool-edit/10 border-tool-edit/30" },
  MultiEdit: { icon: Pencil, color: "text-tool-edit", tone: "bg-tool-edit/10 border-tool-edit/30" },
  Bash: { icon: Terminal, color: "text-tool-bash", tone: "bg-tool-bash/10 border-tool-bash/30" },
  WebFetch: { icon: Globe, color: "text-tool-web", tone: "bg-tool-web/10 border-tool-web/30" },
  WebSearch: { icon: Globe, color: "text-tool-web", tone: "bg-tool-web/10 border-tool-web/30" }
};
function ToolCallBubble({ name: name2, arg, status }) {
  const meta = ICONS[name2] ?? { icon: Wrench, color: "text-muted-foreground", tone: "bg-secondary border-border" };
  const Icon = meta.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1 font-mono text-[11.5px]", meta.tone), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: cn("h-3.5 w-3.5 shrink-0", meta.color) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("font-semibold", meta.color), children: name2 }),
    arg && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate text-foreground/70", children: [
      "(",
      arg,
      ")"
    ] }),
    status === "running" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-warning" }),
    status === "ok" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 h-1.5 w-1.5 rounded-full bg-success" }),
    status === "fail" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 h-1.5 w-1.5 rounded-full bg-destructive" })
  ] });
}
const TOOL_LINE = /^(Read|Glob|Grep|Edit|Write|MultiEdit|Bash|WebFetch|WebSearch|Explored|Search)\s+(.+?)(?:\s*·|$)/i;
const THOUGHT_HEAD = /^(?:#{1,3}\s*)?(?:Thought(?:\s+for\s+[\d.]+s)?|Thinking(?:\s+for\s+[\d.]+s)?|Reasoning|思考(?:\s+[\d.]+秒)?|思考中)\s*$/i;
const THOUGHT_INLINE = /^>\s*(?:\*\*)?(?:Thought|Thinking|思考)(?:\*\*)?\s*$/i;
function tryToolLine(line) {
  const t = line.trim();
  const m = t.match(TOOL_LINE);
  if (!m) return null;
  const rawName = m[1];
  const name2 = rawName === "Explored" || rawName === "Search" ? "Grep" : rawName;
  const arg = m[2]?.trim().replace(/^[`'"]|[`'"]$/g, "");
  return { kind: "tool", name: name2, arg, status: "ok" };
}
function tryTerminalBlock(lines, start) {
  const head = lines[start]?.trim() ?? "";
  if (!/^【终端/.test(head) && !/^```(?:bash|sh|shell|zsh|terminal)/i.test(head)) return null;
  if (/^【终端/.test(head)) {
    const bodyLines = [head];
    let i = start + 1;
    while (i < lines.length && lines[i]?.trim() && !TOOL_LINE.test(lines[i].trim()) && !THOUGHT_HEAD.test(lines[i].trim())) {
      bodyLines.push(lines[i]);
      i++;
    }
    return {
      block: {
        kind: "terminal",
        title: head.replace(/^【|】$/g, "").slice(0, 48) || "终端",
        body: bodyLines.join("\n")
      },
      next: i
    };
  }
  const fenceEnd = lines.findIndex((l, idx) => idx > start && /^```\s*$/.test(l.trim()));
  if (fenceEnd === -1) return null;
  const body = lines.slice(start + 1, fenceEnd).join("\n");
  return {
    block: { kind: "terminal", title: "终端", body },
    next: fenceEnd + 1
  };
}
function parseAssistantContent(content2) {
  if (!content2?.trim()) return [{ kind: "markdown", body: content2 }];
  const xmlThinking = content2.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (xmlThinking) {
    const thoughtBody = xmlThinking[1]?.trim() ?? "";
    const rest = content2.replace(/<thinking>[\s\S]*?<\/thinking>/i, "").trim();
    const restBlocks = rest ? parseAssistantContent(rest) : [];
    return [{ kind: "thought", title: "Thought", body: thoughtBody }, ...restBlocks];
  }
  const lines = content2.split("\n");
  const blocks = [];
  let buf = [];
  let i = 0;
  const flushMarkdown = () => {
    const body = buf.join("\n").trim();
    buf = [];
    if (body) blocks.push({ kind: "markdown", body });
  };
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (THOUGHT_HEAD.test(trimmed) || THOUGHT_INLINE.test(trimmed)) {
      flushMarkdown();
      const title = trimmed.replace(/^#{1,3}\s*/, "").replace(/^>\s*/, "").replace(/\*\*/g, "") || "Thought";
      const thoughtLines = [];
      i++;
      while (i < lines.length) {
        const tl = lines[i]?.trim() ?? "";
        if (TOOL_LINE.test(tl) || THOUGHT_HEAD.test(tl) || THOUGHT_INLINE.test(tl) || /^【终端/.test(tl)) break;
        if (tl === "---" || tl === "***") {
          i++;
          break;
        }
        const raw = lines[i] ?? "";
        thoughtLines.push(/^>\s?/.test(raw) ? raw.replace(/^>\s?/, "") : raw);
        i++;
      }
      blocks.push({ kind: "thought", title, body: thoughtLines.join("\n").trim() });
      continue;
    }
    const tool = tryToolLine(trimmed);
    if (tool) {
      flushMarkdown();
      blocks.push(tool);
      i++;
      continue;
    }
    const term = tryTerminalBlock(lines, i);
    if (term) {
      flushMarkdown();
      blocks.push(term.block);
      i = term.next;
      continue;
    }
    buf.push(line);
    i++;
  }
  flushMarkdown();
  return blocks.length ? blocks : [{ kind: "markdown", body: content2 }];
}
function ClassicThoughtBlock({ title, body }) {
  const [open, setOpen] = reactExports.useState(false);
  if (!body.trim()) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-thought-block mb-2 text-[12px] text-muted-foreground", children: title });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-thought-block mb-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen((v) => !v),
        className: "inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition hover:text-foreground",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: cn("h-3.5 w-3.5 transition-transform", open && "rotate-90") }),
          title
        ]
      }
    ),
    open ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 border-l-2 border-border/80 pl-3 text-[12px] leading-relaxed text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChatMarkdown, { content: body, className: "text-[12px]" }) }) : null
  ] });
}
function ClassicTerminalOutputBlock({ title, body }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-terminal-output mb-3 overflow-hidden rounded-lg border border-border/70 bg-code-bg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border/50 bg-muted/20 px-2.5 py-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "workbench-code max-h-[min(360px,45vh)] overflow-auto p-3 whitespace-pre-wrap break-words text-[12px] text-foreground", children: body })
  ] });
}
function CursorTerminalOutputBlock({ title, body }) {
  const lineCount = body ? body.replace(/\r\n/g, "\n").split("\n").length : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-terminal-output", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-terminal-output-head", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ChatCursorCollapsible,
      {
        lineCount,
        bodyClassName: "chat-terminal-output-body",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "workbench-code m-0 whitespace-pre-wrap break-words", children: body })
      }
    )
  ] });
}
function groupCursorUnits(blocks, edits, pool, used, seq2) {
  const out = [];
  let toolBuf = [];
  const flushTools = () => {
    if (!toolBuf.length) return;
    out.push({ kind: "tools", items: [...toolBuf] });
    toolBuf = [];
  };
  const pushFileEdit = (path2) => {
    const edit = takeEditForPath(path2, pool, used) ?? summaryEditForPath(path2, seq2);
    out.push({ kind: "file-edit", edit });
  };
  for (const b of blocks) {
    if (b.kind === "tool") {
      if (isFileEditTool(b.name, b.arg)) {
        flushTools();
        const pathArg = b.arg?.trim().replace(/^[`'"]|[`'"]$/g, "") ?? "";
        if (pathArg) pushFileEdit(pathArg);
        continue;
      }
      toolBuf.push({ name: b.name, arg: b.arg, status: b.status });
      continue;
    }
    flushTools();
    if (b.kind === "thought") out.push({ kind: "thought", title: b.title, body: b.body });
    else if (b.kind === "terminal") out.push({ kind: "terminal", title: b.title, body: b.body });
    else if (b.kind === "markdown") out.push({ kind: "markdown", body: b.body });
  }
  flushTools();
  for (const edit of edits) {
    if (!used.has(edit.id)) {
      used.add(edit.id);
      out.push({ kind: "file-edit", edit });
    }
  }
  return out;
}
function ClassicAssistantContent({
  content: content2,
  blocks,
  edits
}) {
  if (blocks.length === 1 && blocks[0]?.kind === "markdown") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-assistant-blocks", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChatMarkdown, { content: content2 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChatFileEditList, { edits, usePanel: false })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-assistant-blocks space-y-1", children: [
    blocks.map((b, i) => {
      if (b.kind === "thought") {
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ClassicThoughtBlock, { title: b.title, body: b.body }, i);
      }
      if (b.kind === "tool") {
        const pathArg = b.arg?.trim().replace(/^[`'"]|[`'"]$/g, "");
        if (pathArg && isFileEditTool(b.name, pathArg)) {
          return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            ChatFileEditCard,
            {
              edit: {
                id: `${pathArg}::inline-${i}`,
                path: pathArg,
                language: languageFromPath(pathArg),
                added: 0,
                removed: 0,
                previewLines: [],
                summaryOnly: true
              }
            }
          ) }, i);
        }
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ToolCallBubble, { name: b.name, arg: b.arg, status: b.status }) }, i);
      }
      if (b.kind === "terminal") {
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ClassicTerminalOutputBlock, { title: b.title, body: b.body }, i);
      }
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ChatMarkdown, { content: b.body }, i);
    }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ChatFileEditList, { edits, usePanel: false })
  ] });
}
function CursorAssistantContent({ units }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-assistant-blocks chat-assistant-blocks--cursor", children: units.map((u, i) => {
    if (u.kind === "thought") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ChatThoughtBlock, { title: u.title, body: u.body }, `thought:${i}`);
    }
    if (u.kind === "tools") {
      return u.items.length === 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChatToolActivityRow, { ...u.items[0] }, `tool:${i}`) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChatToolActivityGroup, { items: u.items }, `tools:${i}`);
    }
    if (u.kind === "terminal") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CursorTerminalOutputBlock, { title: u.title, body: u.body }, `term:${i}`);
    }
    if (u.kind === "markdown") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ChatMarkdown, { content: u.body }, `md:${i}`);
    }
    if (u.kind === "file-edit") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(ChatFileEditCard, { edit: u.edit, variant: "cursor" }, u.edit.id);
    }
    return null;
  }) });
}
function ChatAssistantContent({ content: content2 }) {
  const { resolved } = useTheme();
  const { edits, stripped } = reactExports.useMemo(() => parseChatFileEdits(content2), [content2]);
  const blocks = reactExports.useMemo(() => parseAssistantContent(stripped), [stripped]);
  const cursorUnits = reactExports.useMemo(() => {
    const used = /* @__PURE__ */ new Set();
    const pool = buildEditPool(edits);
    const seq2 = { n: 1e4 };
    return groupCursorUnits(blocks, edits, pool, used, seq2);
  }, [blocks, edits]);
  if (resolved === "dark") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(CursorAssistantContent, { units: cursorUnits });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ClassicAssistantContent, { content: stripped, blocks, edits });
}
var CONTEXT_MENU_NAME = "ContextMenu";
var [createContextMenuContext] = createContextScope(CONTEXT_MENU_NAME, [
  createMenuScope
]);
var useMenuScope = createMenuScope();
var [ContextMenuProvider, useContextMenuContext] = createContextMenuContext(CONTEXT_MENU_NAME);
var ContextMenu$1 = (props) => {
  const { __scopeContextMenu, children, onOpenChange, dir, modal = true } = props;
  const [open, setOpen] = reactExports.useState(false);
  const menuScope = useMenuScope(__scopeContextMenu);
  const handleOpenChangeProp = useCallbackRef(onOpenChange);
  const handleOpenChange = reactExports.useCallback(
    (open2) => {
      setOpen(open2);
      handleOpenChangeProp(open2);
    },
    [handleOpenChangeProp]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ContextMenuProvider,
    {
      scope: __scopeContextMenu,
      open,
      onOpenChange: handleOpenChange,
      modal,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Root3,
        {
          ...menuScope,
          dir,
          open,
          onOpenChange: handleOpenChange,
          modal,
          children
        }
      )
    }
  );
};
ContextMenu$1.displayName = CONTEXT_MENU_NAME;
var TRIGGER_NAME$3 = "ContextMenuTrigger";
var ContextMenuTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeContextMenu, disabled = false, ...triggerProps } = props;
    const context = useContextMenuContext(TRIGGER_NAME$3, __scopeContextMenu);
    const menuScope = useMenuScope(__scopeContextMenu);
    const pointRef = reactExports.useRef({ x: 0, y: 0 });
    const virtualRef = reactExports.useRef({
      getBoundingClientRect: () => DOMRect.fromRect({ width: 0, height: 0, ...pointRef.current })
    });
    const longPressTimerRef = reactExports.useRef(0);
    const clearLongPress = reactExports.useCallback(
      () => window.clearTimeout(longPressTimerRef.current),
      []
    );
    const handleOpen = (event) => {
      pointRef.current = { x: event.clientX, y: event.clientY };
      context.onOpenChange(true);
    };
    reactExports.useEffect(() => clearLongPress, [clearLongPress]);
    reactExports.useEffect(() => void (disabled && clearLongPress()), [disabled, clearLongPress]);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Anchor2, { ...menuScope, virtualRef }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.span,
        {
          "data-state": context.open ? "open" : "closed",
          "data-disabled": disabled ? "" : void 0,
          ...triggerProps,
          ref: forwardedRef,
          style: { WebkitTouchCallout: "none", ...props.style },
          onContextMenu: disabled ? props.onContextMenu : composeEventHandlers(props.onContextMenu, (event) => {
            clearLongPress();
            handleOpen(event);
            event.preventDefault();
          }),
          onPointerDown: disabled ? props.onPointerDown : composeEventHandlers(
            props.onPointerDown,
            whenTouchOrPen((event) => {
              clearLongPress();
              longPressTimerRef.current = window.setTimeout(() => handleOpen(event), 700);
            })
          ),
          onPointerMove: disabled ? props.onPointerMove : composeEventHandlers(props.onPointerMove, whenTouchOrPen(clearLongPress)),
          onPointerCancel: disabled ? props.onPointerCancel : composeEventHandlers(props.onPointerCancel, whenTouchOrPen(clearLongPress)),
          onPointerUp: disabled ? props.onPointerUp : composeEventHandlers(props.onPointerUp, whenTouchOrPen(clearLongPress))
        }
      )
    ] });
  }
);
ContextMenuTrigger$1.displayName = TRIGGER_NAME$3;
var PORTAL_NAME$2 = "ContextMenuPortal";
var ContextMenuPortal = (props) => {
  const { __scopeContextMenu, ...portalProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$1, { ...menuScope, ...portalProps });
};
ContextMenuPortal.displayName = PORTAL_NAME$2;
var CONTENT_NAME$2 = "ContextMenuContent";
var ContextMenuContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeContextMenu, ...contentProps } = props;
    const context = useContextMenuContext(CONTENT_NAME$2, __scopeContextMenu);
    const menuScope = useMenuScope(__scopeContextMenu);
    const hasInteractedOutsideRef = reactExports.useRef(false);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Content2$2,
      {
        ...menuScope,
        ...contentProps,
        ref: forwardedRef,
        side: "right",
        sideOffset: 2,
        align: "start",
        onCloseAutoFocus: (event) => {
          props.onCloseAutoFocus?.(event);
          if (!event.defaultPrevented && hasInteractedOutsideRef.current) {
            event.preventDefault();
          }
          hasInteractedOutsideRef.current = false;
        },
        onInteractOutside: (event) => {
          props.onInteractOutside?.(event);
          if (!event.defaultPrevented && !context.modal) hasInteractedOutsideRef.current = true;
        },
        style: {
          ...props.style,
          // re-namespace exposed content custom properties
          ...{
            "--radix-context-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
            "--radix-context-menu-content-available-width": "var(--radix-popper-available-width)",
            "--radix-context-menu-content-available-height": "var(--radix-popper-available-height)",
            "--radix-context-menu-trigger-width": "var(--radix-popper-anchor-width)",
            "--radix-context-menu-trigger-height": "var(--radix-popper-anchor-height)"
          }
        }
      }
    );
  }
);
ContextMenuContent$1.displayName = CONTENT_NAME$2;
var GROUP_NAME = "ContextMenuGroup";
var ContextMenuGroup = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeContextMenu, ...groupProps } = props;
    const menuScope = useMenuScope(__scopeContextMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Group, { ...menuScope, ...groupProps, ref: forwardedRef });
  }
);
ContextMenuGroup.displayName = GROUP_NAME;
var LABEL_NAME = "ContextMenuLabel";
var ContextMenuLabel$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeContextMenu, ...labelProps } = props;
    const menuScope = useMenuScope(__scopeContextMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { ...menuScope, ...labelProps, ref: forwardedRef });
  }
);
ContextMenuLabel$1.displayName = LABEL_NAME;
var ITEM_NAME = "ContextMenuItem";
var ContextMenuItem$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeContextMenu, ...itemProps } = props;
    const menuScope = useMenuScope(__scopeContextMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Item2$1, { ...menuScope, ...itemProps, ref: forwardedRef });
  }
);
ContextMenuItem$1.displayName = ITEM_NAME;
var CHECKBOX_ITEM_NAME = "ContextMenuCheckboxItem";
var ContextMenuCheckboxItem$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeContextMenu, ...checkboxItemProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(CheckboxItem, { ...menuScope, ...checkboxItemProps, ref: forwardedRef });
});
ContextMenuCheckboxItem$1.displayName = CHECKBOX_ITEM_NAME;
var RADIO_GROUP_NAME = "ContextMenuRadioGroup";
var ContextMenuRadioGroup = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeContextMenu, ...radioGroupProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RadioGroup, { ...menuScope, ...radioGroupProps, ref: forwardedRef });
});
ContextMenuRadioGroup.displayName = RADIO_GROUP_NAME;
var RADIO_ITEM_NAME = "ContextMenuRadioItem";
var ContextMenuRadioItem$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeContextMenu, ...radioItemProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(RadioItem, { ...menuScope, ...radioItemProps, ref: forwardedRef });
});
ContextMenuRadioItem$1.displayName = RADIO_ITEM_NAME;
var INDICATOR_NAME$1 = "ContextMenuItemIndicator";
var ContextMenuItemIndicator = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeContextMenu, ...itemIndicatorProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicator, { ...menuScope, ...itemIndicatorProps, ref: forwardedRef });
});
ContextMenuItemIndicator.displayName = INDICATOR_NAME$1;
var SEPARATOR_NAME = "ContextMenuSeparator";
var ContextMenuSeparator$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeContextMenu, ...separatorProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Separator, { ...menuScope, ...separatorProps, ref: forwardedRef });
});
ContextMenuSeparator$1.displayName = SEPARATOR_NAME;
var ARROW_NAME = "ContextMenuArrow";
var ContextMenuArrow = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeContextMenu, ...arrowProps } = props;
    const menuScope = useMenuScope(__scopeContextMenu);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Arrow2, { ...menuScope, ...arrowProps, ref: forwardedRef });
  }
);
ContextMenuArrow.displayName = ARROW_NAME;
var SUB_TRIGGER_NAME = "ContextMenuSubTrigger";
var ContextMenuSubTrigger$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeContextMenu, ...triggerItemProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(SubTrigger, { ...menuScope, ...triggerItemProps, ref: forwardedRef });
});
ContextMenuSubTrigger$1.displayName = SUB_TRIGGER_NAME;
var SUB_CONTENT_NAME = "ContextMenuSubContent";
var ContextMenuSubContent$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeContextMenu, ...subContentProps } = props;
  const menuScope = useMenuScope(__scopeContextMenu);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    SubContent,
    {
      ...menuScope,
      ...subContentProps,
      ref: forwardedRef,
      style: {
        ...props.style,
        // re-namespace exposed content custom properties
        ...{
          "--radix-context-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
          "--radix-context-menu-content-available-width": "var(--radix-popper-available-width)",
          "--radix-context-menu-content-available-height": "var(--radix-popper-available-height)",
          "--radix-context-menu-trigger-width": "var(--radix-popper-anchor-width)",
          "--radix-context-menu-trigger-height": "var(--radix-popper-anchor-height)"
        }
      }
    }
  );
});
ContextMenuSubContent$1.displayName = SUB_CONTENT_NAME;
function whenTouchOrPen(handler) {
  return (event) => event.pointerType !== "mouse" ? handler(event) : void 0;
}
var Root2$1 = ContextMenu$1;
var Trigger$1 = ContextMenuTrigger$1;
var Portal2$1 = ContextMenuPortal;
var Content2$1 = ContextMenuContent$1;
var Label2 = ContextMenuLabel$1;
var Item2 = ContextMenuItem$1;
var CheckboxItem2 = ContextMenuCheckboxItem$1;
var RadioItem2 = ContextMenuRadioItem$1;
var ItemIndicator2 = ContextMenuItemIndicator;
var Separator2 = ContextMenuSeparator$1;
var SubTrigger2 = ContextMenuSubTrigger$1;
var SubContent2 = ContextMenuSubContent$1;
const ContextMenu = Root2$1;
const ContextMenuTrigger = Trigger$1;
const ContextMenuSubTrigger = reactExports.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  SubTrigger2,
  {
    ref,
    className: cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "ml-auto h-4 w-4" })
    ]
  }
));
ContextMenuSubTrigger.displayName = SubTrigger2.displayName;
const ContextMenuSubContent = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  SubContent2,
  {
    ref,
    className: cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin)",
      className
    ),
    ...props
  }
));
ContextMenuSubContent.displayName = SubContent2.displayName;
const ContextMenuContent = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Portal2$1, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
  Content2$1,
  {
    ref,
    className: cn(
      "z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
ContextMenuContent.displayName = Content2$1.displayName;
const ContextMenuItem = reactExports.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Item2,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    ),
    ...props
  }
));
ContextMenuItem.displayName = Item2.displayName;
const ContextMenuCheckboxItem = reactExports.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  CheckboxItem2,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    checked,
    ...props,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicator2, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4" }) }) }),
      children
    ]
  }
));
ContextMenuCheckboxItem.displayName = CheckboxItem2.displayName;
const ContextMenuRadioItem = reactExports.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  RadioItem2,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicator2, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "h-4 w-4 fill-current" }) }) }),
      children
    ]
  }
));
ContextMenuRadioItem.displayName = RadioItem2.displayName;
const ContextMenuLabel = reactExports.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Label2,
  {
    ref,
    className: cn("px-2 py-1.5 text-sm font-semibold text-foreground", inset && "pl-8", className),
    ...props
  }
));
ContextMenuLabel.displayName = Label2.displayName;
const ContextMenuSeparator = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Separator2,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-border", className),
    ...props
  }
));
ContextMenuSeparator.displayName = Separator2.displayName;
const ContextMenuShortcut = ({ className, ...props }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
      ...props
    }
  );
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";
function copyShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl+C";
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘C" : "Ctrl+C";
}
function selectAllShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl+A";
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘A" : "Ctrl+A";
}
function copyTextForMessage(content2, container) {
  const selection = window.getSelection();
  const selected = selection?.toString().trim() ?? "";
  if (selected && container && selection?.rangeCount) {
    const node2 = selection.getRangeAt(0).commonAncestorContainer;
    if (container.contains(node2)) return selected;
  }
  return content2;
}
function ChatMessageContextMenu({
  rowRef,
  content: content2,
  disabled,
  hasDesktopApi,
  onWriteToWorkspace,
  onGenerateChain,
  children
}) {
  const actionable = !disabled && typeof content2 === "string" && content2.trim().length > 0 && content2 !== "__WAITING__";
  const canChain = reactExports.useMemo(() => {
    if (!actionable || !hasDesktopApi || !onGenerateChain) return false;
    return parseActiveChainFromBubbleText(content2).ok;
  }, [actionable, content2, hasDesktopApi, onGenerateChain]);
  const onCopy = async () => {
    if (!actionable) return;
    const text2 = copyTextForMessage(content2, rowRef.current);
    const ok2 = await copyTextToClipboard(text2);
    if (ok2) toast.success("已复制");
    else toast.error("复制失败");
  };
  const onSelectAll = () => {
    if (!actionable || !rowRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(rowRef.current);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };
  if (!actionable) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenu, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(ContextMenuTrigger, { asChild: true, children }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenuContent, { className: "w-56", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenuItem, { onSelect: () => void onCopy(), children: [
        "复制",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ContextMenuShortcut, { children: copyShortcutLabel() })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(ContextMenuItem, { onSelect: onSelectAll, children: [
        "全选",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ContextMenuShortcut, { children: selectAllShortcutLabel() })
      ] }),
      hasDesktopApi && onWriteToWorkspace ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ContextMenuSeparator, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ContextMenuItem, { onSelect: () => onWriteToWorkspace(content2), children: "将本条气泡写入工作区" }),
        canChain && onGenerateChain ? /* @__PURE__ */ jsxRuntimeExports.jsx(ContextMenuItem, { onSelect: () => onGenerateChain(content2), children: "从本条生成任务链" }) : null
      ] }) : null
    ] })
  ] });
}
function TerminalChip({
  payload
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "terminal-context-chip inline-flex max-w-full items-center gap-1 rounded-[5px] px-1.5 py-0.5 font-mono text-[11.5px] leading-none", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SquareTerminal, { className: "h-3 w-3 shrink-0 opacity-85", "aria-hidden": true }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: formatTerminalChipLabel(payload) })
  ] });
}
function ChatUserMessageBody({
  content: content2,
  attachments,
  terminalSnippets,
  onEdit,
  onResend,
  editable
}) {
  const { lead, terminal } = splitUserDisplayText(content2);
  const chips = terminalSnippets?.length ? terminalSnippets : terminal ? [
    {
      text: terminal,
      sourceLabel: inferTerminalSourceLabel("zsh", terminal)
    }
  ] : [];
  const showTerminalBlock = Boolean(terminal) && !terminalSnippets?.length;
  const hasImages = attachments?.some((a) => a.kind === "image" && a.dataUrl.startsWith("data:")) ?? false;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "chat-user-body relative min-w-0 pr-6",
        editable && "cursor-pointer"
      ),
      role: editable ? "button" : void 0,
      tabIndex: editable ? 0 : void 0,
      onClick: editable && onEdit ? (e) => {
        const t = e.target;
        if (t.closest("button, a, [role=menuitem]")) return;
        onEdit();
      } : void 0,
      onKeyDown: editable && onEdit ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      } : void 0,
      children: [
        (hasImages || chips.length > 0) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex flex-wrap items-start gap-2", children: [
          attachments?.map(
            (a, idx) => a.kind === "image" && a.dataUrl.startsWith("data:") ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "chat-user-thumb shrink-0 overflow-hidden rounded-md border border-border/40",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: a.dataUrl,
                    alt: a.name || "",
                    className: "max-h-14 max-w-[4.5rem] object-cover"
                  }
                )
              },
              idx
            ) : null
          ),
          chips.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex min-w-0 flex-1 flex-wrap items-center gap-1.5", children: chips.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(TerminalChip, { payload: c }, i)) }) : null
        ] }),
        lead ? looksLikeMarkdown(lead) ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChatMarkdown, { content: lead, className: "text-[13px] leading-relaxed" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--chat-user-fg,var(--foreground))]", children: lead }) : null,
        showTerminalBlock ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "pre",
          {
            className: cn(
              "workbench-code mt-2 max-h-[min(280px,36vh)] overflow-auto rounded-md border border-border/40 bg-black/10 p-2.5 text-[11px] leading-relaxed dark:bg-black/25",
              !lead && "mt-0"
            ),
            children: trimTerminalDisplay(terminal)
          }
        ) : null,
        onResend || editable && onEdit ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "chat-user-reply-btn absolute bottom-0 right-0 rounded-md p-1 text-muted-foreground/70 opacity-0 transition hover:bg-black/10 hover:text-foreground group-hover/bubble:opacity-100 dark:hover:bg-white/10",
            title: onResend ? "重新发起提问" : "编辑并重新发送",
            "aria-label": onResend ? "重新发起提问" : "编辑并重新发送",
            onClick: (e) => {
              e.stopPropagation();
              if (onResend) onResend();
              else onEdit?.();
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(CornerUpLeft, { className: "h-3.5 w-3.5" })
          }
        ) : null
      ]
    }
  );
}
function UserMessageBody({
  content: content2,
  attachments,
  terminalSnippets,
  editable,
  onEdit
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ChatUserMessageBody,
    {
      content: content2,
      attachments,
      terminalSnippets,
      editable,
      onEdit
    }
  );
}
function WaitingReply({ modelName }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-waiting flex flex-col gap-1.5 py-1 text-muted-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1", "aria-hidden": true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.2s]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.1s]" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[12px]", children: [
        "思考中 · ",
        modelName
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11.5px] leading-relaxed text-muted-foreground/85", children: "Claude Code 正在执行：工具调用、思考与回复将在此实时显示。" })
  ] });
}
function MessageBubbleInner({
  m,
  hasDesktopApi,
  onWriteToWorkspace,
  onGenerateChain,
  onEditUserMessage
}) {
  const rowRef = reactExports.useRef(null);
  if (m.role === "user") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ChatMessageContextMenu,
      {
        rowRef,
        content: m.content,
        hasDesktopApi,
        onWriteToWorkspace,
        onGenerateChain,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: rowRef, className: "chat-message-row chat-message-row--user", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "group/bubble chat-message-col", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-bubble-user", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          UserMessageBody,
          {
            content: m.content,
            attachments: m.attachments,
            terminalSnippets: m.terminalSnippets,
            editable: m.historyIndex != null && typeof onEditUserMessage === "function" && m.content !== "__WAITING__",
            onEdit: m.historyIndex != null && onEditUserMessage ? () => onEditUserMessage(m.historyIndex) : void 0
          }
        ) }) }) })
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ChatMessageContextMenu,
    {
      rowRef,
      content: m.content,
      hasDesktopApi,
      onWriteToWorkspace,
      onGenerateChain,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: rowRef, className: "chat-message-row chat-message-row--assistant", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "group/bubble chat-message-col chat-message-col--wide", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-message-meta", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono font-medium text-foreground", children: m.name ?? "assistant" }),
          m.time ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chat-message-time", children: m.time }) : null,
          m.content !== "__WAITING__" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            CopyTextButton,
            {
              text: m.content,
              label: "复制",
              copiedLabel: "已复制",
              size: "xs",
              className: "opacity-0 transition group-hover/bubble:opacity-100"
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-bubble-assistant", children: m.content === "__WAITING__" ? /* @__PURE__ */ jsxRuntimeExports.jsx(WaitingReply, { modelName: m.name ?? "assistant" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChatAssistantContent, { content: m.content }) })
      ] }) })
    }
  );
}
function attachmentsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((item, i) => item.dataUrl === b[i]?.dataUrl && item.name === b[i]?.name);
}
function terminalSnippetsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every(
    (item, i) => item.text === b[i]?.text && item.sourceLabel === b[i]?.sourceLabel && item.startLine === b[i]?.startLine && item.endLine === b[i]?.endLine
  );
}
const MessageBubble = reactExports.memo(MessageBubbleInner, (prev, next) => {
  return prev.m.role === next.m.role && prev.m.content === next.m.content && prev.m.name === next.m.name && prev.m.time === next.m.time && prev.hasDesktopApi === next.hasDesktopApi && prev.onWriteToWorkspace === next.onWriteToWorkspace && prev.onGenerateChain === next.onGenerateChain && prev.onEditUserMessage === next.onEditUserMessage && prev.m.historyIndex === next.m.historyIndex && attachmentsEqual(prev.m.attachments, next.m.attachments) && terminalSnippetsEqual(prev.m.terminalSnippets, next.m.terminalSnippets);
});
function ChatStickyUserHeader({
  message,
  isEditing = false,
  inlineComposer,
  hasDesktopApi,
  onWriteToWorkspace,
  onGenerateChain,
  onEditUserMessage,
  onRequestResendUserMessage
}) {
  const rowRef = reactExports.useRef(null);
  const headerRef = reactExports.useRef(null);
  const editable = !isEditing && message.historyIndex != null && typeof onEditUserMessage === "function" && message.content !== "__WAITING__";
  const canResend = !isEditing && message.historyIndex != null && typeof onRequestResendUserMessage === "function" && message.content !== "__WAITING__";
  if (isEditing && inlineComposer) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: headerRef, className: "chat-sticky-user-header chat-sticky-user-header--editing", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      ChatComposerShell,
      {
        ...inlineComposer,
        variant: "inline",
        editHistoryActive: true
      }
    ) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ChatMessageContextMenu,
    {
      rowRef,
      content: message.content,
      hasDesktopApi,
      onWriteToWorkspace,
      onGenerateChain,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: headerRef, className: "chat-sticky-user-header group/bubble", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-bubble-user chat-sticky-user-header-bubble", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ChatUserMessageBody,
        {
          content: message.content,
          attachments: message.attachments,
          terminalSnippets: message.terminalSnippets,
          editable,
          onEdit: message.historyIndex != null && onEditUserMessage ? () => onEditUserMessage(message.historyIndex) : void 0,
          onResend: canResend && message.historyIndex != null ? () => onRequestResendUserMessage(message.historyIndex) : void 0
        }
      ) }) })
    }
  );
}
function isDisplayUserMessage(m) {
  return m.role === "user" && Boolean(m.content.trim()) && m.content !== "__WAITING__";
}
function groupChatTurns(messages) {
  const leadingOrphans = [];
  const turns = [];
  let current = null;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (isDisplayUserMessage(m)) {
      if (current) turns.push(current);
      current = { userIndex: i, user: m, replyIndices: [] };
      continue;
    }
    if (m.role === "assistant") {
      if (current) current.replyIndices.push(i);
      else leadingOrphans.push(i);
    }
  }
  if (current) turns.push(current);
  return { leadingOrphans, turns };
}
const SCROLL_ANCHOR_OFFSET = 16;
function findActiveTurnIndex(root2, turnElements) {
  if (!turnElements.length) return -1;
  const anchorY = root2.getBoundingClientRect().top + SCROLL_ANCHOR_OFFSET;
  const first = turnElements[0];
  if (first && anchorY < first.getBoundingClientRect().top - 8) return -1;
  let active = 0;
  for (let i = 0; i < turnElements.length; i++) {
    const el = turnElements[i];
    if (!el) continue;
    if (el.getBoundingClientRect().top <= anchorY) active = i;
  }
  return active;
}
function isUserBubbleScrolledAway(root2, userEl) {
  if (!userEl) return false;
  const rootTop = root2.getBoundingClientRect().top + SCROLL_ANCHOR_OFFSET;
  return userEl.getBoundingClientRect().bottom < rootTop + 2;
}
function useStickyUserPrompt(scrollAreaRef, messages, opts) {
  const turnRefs = reactExports.useRef([]);
  const userRefs = reactExports.useRef([]);
  const [activeTurnIndex, setActiveTurnIndex] = reactExports.useState(-1);
  const [showStickyHeader, setShowStickyHeader] = reactExports.useState(false);
  const { leadingOrphans, turns } = reactExports.useMemo(() => groupChatTurns(messages), [messages]);
  const setTurnRef = reactExports.useCallback(
    (index2) => (el) => {
      turnRefs.current[index2] = el;
    },
    []
  );
  const setUserRef = reactExports.useCallback(
    (index2) => (el) => {
      userRefs.current[index2] = el;
    },
    []
  );
  reactExports.useEffect(() => {
    turnRefs.current.length = turns.length;
    userRefs.current.length = turns.length;
  }, [turns.length]);
  const syncStickyState = reactExports.useCallback(() => {
    const root2 = scrollAreaRef.current;
    if (!root2 || turns.length === 0) {
      setActiveTurnIndex(-1);
      setShowStickyHeader(false);
      return;
    }
    const nextActive = findActiveTurnIndex(root2, turnRefs.current);
    setActiveTurnIndex((prev) => prev === nextActive ? prev : nextActive);
    if (opts?.forceSticky) {
      setShowStickyHeader(true);
      return;
    }
    const userEl = nextActive >= 0 && nextActive < userRefs.current.length ? userRefs.current[nextActive] : null;
    const away = isUserBubbleScrolledAway(root2, userEl);
    setShowStickyHeader((prev) => prev === away ? prev : away);
  }, [scrollAreaRef, turns.length, opts?.forceSticky]);
  reactExports.useLayoutEffect(() => {
    syncStickyState();
  }, [syncStickyState, messages.length, turns]);
  reactExports.useEffect(() => {
    const root2 = scrollAreaRef.current;
    if (!root2) return;
    syncStickyState();
    root2.addEventListener("scroll", syncStickyState, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncStickyState) : null;
    ro?.observe(root2);
    for (const el of turnRefs.current) {
      if (el) ro?.observe(el);
    }
    for (const el of userRefs.current) {
      if (el) ro?.observe(el);
    }
    return () => {
      root2.removeEventListener("scroll", syncStickyState);
      ro?.disconnect();
    };
  }, [scrollAreaRef, syncStickyState, turns.length]);
  const stickyUser = showStickyHeader && activeTurnIndex >= 0 && activeTurnIndex < turns.length ? turns[activeTurnIndex]?.user ?? null : opts?.forceSticky && turns.length > 0 ? turns[turns.length - 1]?.user ?? null : null;
  return {
    leadingOrphans,
    turns,
    activeTurnIndex,
    stickyUser,
    showStickyHeader: Boolean(opts?.forceSticky || showStickyHeader),
    setTurnRef,
    setUserRef
  };
}
function chatMessagesPanePropsEqual(prev, next) {
  return prev.messages === next.messages && prev.editHistoryIndex === next.editHistoryIndex && prev.editingUserMessage === next.editingUserMessage && prev.inlineComposer === next.inlineComposer && prev.showJumpLatest === next.showJumpLatest && prev.hasDesktopApi === next.hasDesktopApi && prev.scrollAreaRef === next.scrollAreaRef && prev.messagesEndRef === next.messagesEndRef && prev.onJumpToLatest === next.onJumpToLatest && prev.onWriteToWorkspace === next.onWriteToWorkspace && prev.onGenerateChain === next.onGenerateChain && prev.onEditUserMessage === next.onEditUserMessage && prev.onRequestResendUserMessage === next.onRequestResendUserMessage;
}
const ChatMessagesPane = reactExports.memo(function ChatMessagesPane2({
  messages,
  editHistoryIndex = null,
  editingUserMessage = null,
  inlineComposer = null,
  scrollAreaRef,
  messagesEndRef,
  showJumpLatest,
  onJumpToLatest,
  hasDesktopApi,
  onWriteToWorkspace,
  onGenerateChain,
  onEditUserMessage,
  onRequestResendUserMessage
}) {
  const isEditingSticky = editHistoryIndex != null && editingUserMessage != null && inlineComposer != null;
  const { leadingOrphans, turns, stickyUser, showStickyHeader, setTurnRef, setUserRef } = useStickyUserPrompt(scrollAreaRef, messages, { forceSticky: isEditingSticky });
  const headerMessage = isEditingSticky ? editingUserMessage : stickyUser;
  const renderUser = (m, turnIndex) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: setUserRef(turnIndex), className: "chat-turn-user", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    MessageBubble,
    {
      m,
      hasDesktopApi,
      onWriteToWorkspace,
      onGenerateChain,
      onEditUserMessage
    }
  ) }, `user:${m.historyIndex ?? turnIndex}`);
  const renderAssistant = (i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    MessageBubble,
    {
      m: messages[i],
      hasDesktopApi,
      onWriteToWorkspace,
      onGenerateChain,
      onEditUserMessage
    },
    `${i}:${messages[i].role}:${messages[i].content.length}`
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: cn(
        "chat-pane-messages",
        showStickyHeader && headerMessage || isEditingSticky ? "chat-pane-messages--sticky-user" : null
      ),
      children: [
        (showStickyHeader || isEditingSticky) && headerMessage ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          ChatStickyUserHeader,
          {
            message: headerMessage,
            isEditing: isEditingSticky,
            inlineComposer: isEditingSticky ? inlineComposer : null,
            hasDesktopApi,
            onWriteToWorkspace,
            onGenerateChain,
            onEditUserMessage,
            onRequestResendUserMessage
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            ref: scrollAreaRef,
            className: "chat-pane-messages-scroll overscroll-contain scrollbar-thin",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-messages-inner", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-messages-list", children: [
                leadingOrphans.map((i) => renderAssistant(i)),
                turns.map((turn, turnIndex) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    ref: setTurnRef(turnIndex),
                    className: "chat-turn-section",
                    children: [
                      renderUser(turn.user, turnIndex),
                      turn.replyIndices.map((i) => renderAssistant(i))
                    ]
                  },
                  `turn:${turn.userIndex}`
                ))
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: messagesEndRef, className: "chat-messages-anchor", "aria-hidden": true })
            ] })
          }
        ),
        messages.length > 0 && showJumpLatest ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-jump-latest", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: onJumpToLatest, className: "chat-jump-latest-btn", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDown, { className: "h-3.5 w-3.5" }),
          "回到最新消息"
        ] }) }) : null
      ]
    }
  );
}, chatMessagesPanePropsEqual);
const SCROLL_BOTTOM_EPS = 56;
const LAYOUT_FREEZE_MS = 400;
function isNearBottom(el) {
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
  return dist <= SCROLL_BOTTOM_EPS;
}
function useChatScroll({
  messages,
  activeId,
  sending,
  streamScrollKey,
  layoutFreezeDeps = []
}) {
  const scrollAreaRef = reactExports.useRef(null);
  const messagesEndRef = reactExports.useRef(null);
  const composerDockRef = reactExports.useRef(null);
  const userScrolledAwayRef = reactExports.useRef(false);
  const layoutFreezeRef = reactExports.useRef(false);
  const savedScrollTopRef = reactExports.useRef(0);
  const freezeTimerRef = reactExports.useRef(0);
  const scrollFollowLockUntilRef = reactExports.useRef(0);
  const showJumpLatestRef = reactExports.useRef(false);
  const [composerDockHeight, setComposerDockHeight] = reactExports.useState(200);
  const [showJumpLatest, setShowJumpLatest] = reactExports.useState(false);
  const setJumpLatestVisible = reactExports.useCallback((visible) => {
    if (showJumpLatestRef.current === visible) return;
    showJumpLatestRef.current = visible;
    setShowJumpLatest(visible);
  }, []);
  const markScrollContainer = reactExports.useCallback((frozen) => {
    const el = scrollAreaRef.current;
    if (!el) return;
    if (frozen) el.setAttribute("data-layout-frozen", "");
    else el.removeAttribute("data-layout-frozen");
  }, []);
  const pinScrollToBottom = reactExports.useCallback((behavior = "auto") => {
    const el = scrollAreaRef.current;
    if (layoutFreezeRef.current || !el) return;
    const top = Math.max(0, el.scrollHeight - el.clientHeight);
    if (top <= 0) {
      if (el.scrollTop !== 0) el.scrollTop = 0;
      return;
    }
    if (behavior === "smooth") el.scrollTo({ top, behavior: "smooth" });
    else el.scrollTop = top;
  }, []);
  const syncScrollToBottom = reactExports.useCallback(
    (behavior = "auto") => {
      pinScrollToBottom(behavior);
    },
    [pinScrollToBottom]
  );
  const updateScrollPinnedState = reactExports.useCallback(() => {
    if (layoutFreezeRef.current) return;
    if (Date.now() < scrollFollowLockUntilRef.current) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    const atBottom = isNearBottom(el);
    userScrolledAwayRef.current = !atBottom;
    setJumpLatestVisible(!atBottom && messages.length > 0);
  }, [messages.length, setJumpLatestVisible]);
  const cancelLayoutFreeze = reactExports.useCallback(() => {
    window.clearTimeout(freezeTimerRef.current);
    layoutFreezeRef.current = false;
    markScrollContainer(false);
  }, [markScrollContainer]);
  const startLayoutFreeze = reactExports.useCallback(() => {
    const el = scrollAreaRef.current;
    if (el) {
      savedScrollTopRef.current = el.scrollTop;
      if (isNearBottom(el)) userScrolledAwayRef.current = false;
    }
    layoutFreezeRef.current = true;
    markScrollContainer(true);
    window.clearTimeout(freezeTimerRef.current);
    freezeTimerRef.current = window.setTimeout(() => {
      layoutFreezeRef.current = false;
      markScrollContainer(false);
      const scrollEl = scrollAreaRef.current;
      if (!scrollEl) return;
      if (!userScrolledAwayRef.current) {
        syncScrollToBottom("auto");
        setJumpLatestVisible(false);
        return;
      }
      scrollEl.scrollTop = savedScrollTopRef.current;
      updateScrollPinnedState();
    }, LAYOUT_FREEZE_MS);
  }, [markScrollContainer, setJumpLatestVisible, syncScrollToBottom, updateScrollPinnedState]);
  reactExports.useEffect(() => {
    startLayoutFreeze();
    return () => window.clearTimeout(freezeTimerRef.current);
  }, layoutFreezeDeps);
  reactExports.useLayoutEffect(() => {
    const el = scrollAreaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (Math.abs(w - lastWidth) <= 1) return;
      lastWidth = w;
      startLayoutFreeze();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [startLayoutFreeze]);
  reactExports.useLayoutEffect(() => {
    const dock = composerDockRef.current;
    if (!dock || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const syncDockHeight = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = Math.ceil(dock.getBoundingClientRect().height);
        setComposerDockHeight((prev) => Math.abs(prev - h) <= 1 ? prev : h);
      });
    };
    const ro = new ResizeObserver(syncDockHeight);
    ro.observe(dock);
    syncDockHeight();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  reactExports.useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      if (layoutFreezeRef.current) return;
      updateScrollPinnedState();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    updateScrollPinnedState();
    return () => el.removeEventListener("scroll", onScroll);
  }, [updateScrollPinnedState]);
  reactExports.useLayoutEffect(() => {
    if (layoutFreezeRef.current || userScrolledAwayRef.current) return;
    syncScrollToBottom("auto");
  }, [composerDockHeight, syncScrollToBottom]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPathnameRef = reactExports.useRef(void 0);
  const scrollToLatest = reactExports.useCallback(
    (behavior = "auto") => {
      cancelLayoutFreeze();
      userScrolledAwayRef.current = false;
      setJumpLatestVisible(false);
      scrollFollowLockUntilRef.current = Date.now() + (behavior === "smooth" ? 700 : 180);
      const run = () => pinScrollToBottom(behavior);
      run();
      requestAnimationFrame(run);
      requestAnimationFrame(() => {
        run();
        window.setTimeout(() => {
          run();
          updateScrollPinnedState();
        }, behavior === "smooth" ? 320 : 120);
        window.setTimeout(run, behavior === "smooth" ? 520 : 280);
      });
    },
    [cancelLayoutFreeze, pinScrollToBottom, setJumpLatestVisible, updateScrollPinnedState]
  );
  reactExports.useLayoutEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (pathname !== "/") return;
    const enteredChat = prev === void 0 || prev !== "/" && pathname === "/";
    if (!enteredChat) return;
    scrollToLatest("auto");
  }, [pathname, scrollToLatest]);
  reactExports.useLayoutEffect(() => {
    scrollToLatest("auto");
  }, [activeId, scrollToLatest]);
  reactExports.useLayoutEffect(() => {
    if (userScrolledAwayRef.current || layoutFreezeRef.current) return;
    scrollFollowLockUntilRef.current = Date.now() + 120;
    syncScrollToBottom("auto");
  }, [messages.length, activeId, syncScrollToBottom]);
  reactExports.useLayoutEffect(() => {
    if (userScrolledAwayRef.current || layoutFreezeRef.current) return;
    scrollFollowLockUntilRef.current = Date.now() + (sending ? 200 : 120);
    syncScrollToBottom("auto");
    setJumpLatestVisible(false);
  }, [streamScrollKey, sending, syncScrollToBottom, setJumpLatestVisible]);
  reactExports.useLayoutEffect(() => {
    if (!sending || userScrolledAwayRef.current || layoutFreezeRef.current) return;
    scrollFollowLockUntilRef.current = Date.now() + 160;
    syncScrollToBottom("auto");
  }, [sending, syncScrollToBottom]);
  const resetScrollFollow = reactExports.useCallback(() => {
    scrollToLatest("auto");
  }, [scrollToLatest]);
  const jumpToLatest = reactExports.useCallback(() => {
    scrollToLatest("auto");
  }, [scrollToLatest]);
  return {
    scrollAreaRef,
    messagesEndRef,
    composerDockRef,
    composerDockHeight,
    showJumpLatest,
    jumpToLatest,
    resetScrollFollow
  };
}
function useChatStream(opts) {
  const optsRef = reactExports.useRef(opts);
  optsRef.current = opts;
  reactExports.useEffect(() => {
    if (!opts.enabled) return;
    const off = onBridgeEvent("message_delta", (detail) => {
      const { activeSessionId, requestId, requestIdRef, onDelta } = optsRef.current;
      const liveRequestId = requestIdRef?.current ?? requestId;
      if (!liveRequestId) return;
      const payload = detail || {};
      if (payload.requestId !== liveRequestId) return;
      const chunk = payload.content ?? "";
      if (!chunk) return;
      onDelta(activeSessionId, chunk);
    });
    return off;
  }, [opts.enabled]);
}
function HistoryRow({
  item,
  active,
  sending,
  showWorkspace,
  onSelect
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      className: cn(
        "chat-history-dropdown-row group/row flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition",
        active ? "bg-secondary/80 text-foreground" : "text-foreground hover:bg-secondary/60"
      ),
      onClick: onSelect,
      children: [
        sending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 shrink-0 animate-spin text-primary" }) : active ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5 shrink-0 text-primary" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground/45" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "block truncate text-[12px] leading-snug", children: item.title }),
          showWorkspace ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mt-0.5 block truncate text-[10px] text-muted-foreground", children: shortenWorkspaceLabel(workspaceSessionKey(item.workspacePath)) }) : null
        ] })
      ]
    }
  );
}
function ChatHistoryDropdown({
  scope,
  onScopeChange,
  projectItems,
  allItems,
  activeId,
  sendingSessions,
  onSelectSession
}) {
  const [query, setQuery] = reactExports.useState("");
  const source = scope === "project" ? projectItems : allItems;
  const filtered = reactExports.useMemo(() => filterHistoryItems(source, query), [source, query]);
  const dateGroups = reactExports.useMemo(() => groupHistoryByDate(filtered), [filtered]);
  const workspaceGroups = reactExports.useMemo(() => groupHistoryByWorkspace(filtered), [filtered]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-history-dropdown flex max-h-[min(440px,70vh)] w-[min(320px,calc(100vw-24px))] flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "shrink-0 border-b border-border/60 p-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "search",
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "搜索对话…",
            className: "h-8 w-full rounded-md border border-border/70 bg-muted/15 pl-8 pr-2 text-[12px] outline-none focus-visible:ring-1 focus-visible:ring-ring"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex gap-0.5 rounded-md bg-muted/25 p-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: cn(
              "flex-1 rounded-[5px] px-2 py-1 text-[10px] font-medium transition",
              scope === "project" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            ),
            onClick: () => onScopeChange("project"),
            children: "当前项目"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: cn(
              "flex-1 rounded-[5px] px-2 py-1 text-[10px] font-medium transition",
              scope === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            ),
            onClick: () => onScopeChange("all"),
            children: "全部项目"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-1.5 scrollbar-thin", children: !filtered.length ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 py-6 text-center text-[11px] text-muted-foreground", children: query.trim() ? "没有匹配的对话" : "暂无聊天记录" }) : scope === "project" ? dateGroups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground", children: group.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: group.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        HistoryRow,
        {
          item,
          active: item.id === activeId,
          sending: Boolean(sendingSessions[item.id]),
          showWorkspace: false,
          onSelect: () => onSelectSession(item.id)
        },
        item.id
      )) })
    ] }, group.label)) : workspaceGroups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-2 pb-0.5 text-[10px] font-semibold text-muted-foreground", children: group.workspaceLabel }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-0.5", children: group.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        HistoryRow,
        {
          item,
          active: item.id === activeId,
          sending: Boolean(sendingSessions[item.id]),
          showWorkspace: false,
          onSelect: () => onSelectSession(item.id)
        },
        item.id
      )) })
    ] }, group.workspaceKey || "__none__")) })
  ] });
}
function ChatSessionTabs({
  sessions,
  activeId,
  sendingSessions,
  onSessionChange,
  onNewSession,
  onCloseSession,
  hasDesktopApi,
  onClosePanel,
  terminalOpen,
  onToggleTerminal,
  projectHistoryItems,
  allHistoryItems,
  onSelectHistorySession,
  onHistoryOpen
}) {
  const tabsRef = reactExports.useRef(null);
  const menuRef = reactExports.useRef(null);
  const [menuOpen, setMenuOpen] = reactExports.useState(false);
  const [historyOpen, setHistoryOpen] = reactExports.useState(false);
  const [historyScope, setHistoryScope] = reactExports.useState("project");
  reactExports.useEffect(() => {
    const el = tabsRef.current?.querySelector(`[data-session-id="${activeId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, sessions.length]);
  reactExports.useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      const t = e.target;
      if (menuRef.current && !menuRef.current.contains(t)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);
  const onTabsWheel = (e) => {
    const el = tabsRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  };
  const handleSelectHistory = (sessionId) => {
    onSelectHistorySession(sessionId);
    setHistoryOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-session-tabs-bar group/chat-tabs flex h-[35px] min-h-[35px] shrink-0 items-stretch border-b border-border bg-card/90", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        ref: tabsRef,
        onWheel: onTabsWheel,
        className: "chat-session-tabs-scroll flex min-w-0 flex-1 items-stretch",
        role: "tablist",
        "aria-label": "聊天会话",
        children: [
          sessions.map((s) => {
            const active = s.id === activeId;
            const sending = Boolean(sendingSessions[s.id]);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                "data-session-id": s.id,
                role: "tab",
                "aria-selected": active,
                className: cn(
                  "chat-session-tab group relative flex h-[35px] max-w-[200px] min-w-[72px] shrink-0 cursor-pointer items-center gap-1.5 border-r border-border/70 px-2 text-[11px] transition-colors",
                  active ? "bg-background text-foreground" : "bg-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                ),
                onClick: () => onSessionChange(s.id),
                title: s.title,
                children: [
                  sending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 shrink-0 animate-spin text-primary", "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { className: "h-3 w-3 shrink-0 opacity-50", "aria-hidden": true }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "min-w-0 flex-1 truncate font-medium", children: s.title }),
                  sessions.length > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      className: "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-80 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100",
                      title: "关闭会话",
                      "aria-label": `关闭 ${s.title}`,
                      onClick: (e) => {
                        e.stopPropagation();
                        onCloseSession(s.id);
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3 w-3" })
                    }
                  ) : null
                ]
              },
              s.id
            );
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "chat-session-tabs-empty min-h-[35px] min-w-[8px] flex-1", "aria-hidden": true })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex shrink-0 items-center gap-0.5 border-l border-border/70 px-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onNewSession,
          disabled: !hasDesktopApi,
          className: "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40",
          title: "新对话",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Popover,
        {
          open: historyOpen,
          onOpenChange: (open) => {
            setHistoryOpen(open);
            if (open) {
              setHistoryScope("project");
              onHistoryOpen?.();
            }
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                disabled: !hasDesktopApi,
                className: cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md transition",
                  historyOpen ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  !hasDesktopApi && "opacity-40"
                ),
                title: "对话历史",
                "aria-label": "对话历史",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3.5 w-3.5" })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              PopoverContent,
              {
                align: "end",
                side: "bottom",
                sideOffset: 6,
                className: "w-auto border-border/80 p-0 shadow-lg",
                onOpenAutoFocus: (e) => e.preventDefault(),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ChatHistoryDropdown,
                  {
                    scope: historyScope,
                    onScopeChange: setHistoryScope,
                    projectItems: projectHistoryItems,
                    allItems: allHistoryItems,
                    activeId,
                    sendingSessions,
                    onSelectSession: handleSelectHistory
                  }
                )
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: menuRef, className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setMenuOpen((v) => !v),
            disabled: !hasDesktopApi || sessions.length <= 1,
            className: "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40",
            title: "更多",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "h-3.5 w-3.5" })
          }
        ),
        menuOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-popover py-1 shadow-lg", children: sessions.length > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "block w-full px-3 py-1.5 text-left text-[11px] text-destructive transition hover:bg-secondary",
            onClick: () => {
              onCloseSession(activeId);
              setMenuOpen(false);
            },
            children: "关闭当前会话"
          }
        ) : null }) : null
      ] }),
      onToggleTerminal ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onToggleTerminal,
          className: cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md transition",
            terminalOpen ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          ),
          title: "终端（Ctrl+`）",
          "aria-pressed": terminalOpen,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquareTerminal, { className: "h-3.5 w-3.5" })
        }
      ) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClosePanel,
          className: "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground",
          title: "隐藏聊天面板",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(PanelRightClose, { className: "h-3.5 w-3.5" })
        }
      )
    ] })
  ] });
}
function ChatPanelToolbar(props) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ChatSessionTabs, { ...props });
}
function usePrevious(value) {
  const ref = reactExports.useRef({ value, previous: value });
  return reactExports.useMemo(() => {
    if (ref.current.value !== value) {
      ref.current.previous = ref.current.value;
      ref.current.value = value;
    }
    return ref.current.previous;
  }, [value]);
}
var CHECKBOX_NAME = "Checkbox";
var [createCheckboxContext] = createContextScope(CHECKBOX_NAME);
var [CheckboxProviderImpl, useCheckboxContext] = createCheckboxContext(CHECKBOX_NAME);
function CheckboxProvider(props) {
  const {
    __scopeCheckbox,
    checked: checkedProp,
    children,
    defaultChecked,
    disabled,
    form,
    name: name2,
    onCheckedChange,
    required,
    value = "on",
    // @ts-expect-error
    internal_do_not_use_render
  } = props;
  const [checked, setChecked] = useControllableState({
    prop: checkedProp,
    defaultProp: defaultChecked ?? false,
    onChange: onCheckedChange,
    caller: CHECKBOX_NAME
  });
  const [control, setControl] = reactExports.useState(null);
  const [bubbleInput, setBubbleInput] = reactExports.useState(null);
  const hasConsumerStoppedPropagationRef = reactExports.useRef(false);
  const isFormControl = control ? !!form || !!control.closest("form") : (
    // We set this to true by default so that events bubble to forms without JS (SSR)
    true
  );
  const context = {
    checked,
    disabled,
    setChecked,
    control,
    setControl,
    name: name2,
    form,
    value,
    hasConsumerStoppedPropagationRef,
    required,
    defaultChecked: isIndeterminate(defaultChecked) ? false : defaultChecked,
    isFormControl,
    bubbleInput,
    setBubbleInput
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    CheckboxProviderImpl,
    {
      scope: __scopeCheckbox,
      ...context,
      children: isFunction(internal_do_not_use_render) ? internal_do_not_use_render(context) : children
    }
  );
}
var TRIGGER_NAME$2 = "CheckboxTrigger";
var CheckboxTrigger = reactExports.forwardRef(
  ({ __scopeCheckbox, onKeyDown, onClick, ...checkboxProps }, forwardedRef) => {
    const {
      control,
      value,
      disabled,
      checked,
      required,
      setControl,
      setChecked,
      hasConsumerStoppedPropagationRef,
      isFormControl,
      bubbleInput
    } = useCheckboxContext(TRIGGER_NAME$2, __scopeCheckbox);
    const composedRefs = useComposedRefs(forwardedRef, setControl);
    const initialCheckedStateRef = reactExports.useRef(checked);
    reactExports.useEffect(() => {
      const form = control?.form;
      if (form) {
        const reset = () => setChecked(initialCheckedStateRef.current);
        form.addEventListener("reset", reset);
        return () => form.removeEventListener("reset", reset);
      }
    }, [control, setChecked]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        role: "checkbox",
        "aria-checked": isIndeterminate(checked) ? "mixed" : checked,
        "aria-required": required,
        "data-state": getState$1(checked),
        "data-disabled": disabled ? "" : void 0,
        disabled,
        value,
        ...checkboxProps,
        ref: composedRefs,
        onKeyDown: composeEventHandlers(onKeyDown, (event) => {
          if (event.key === "Enter") event.preventDefault();
        }),
        onClick: composeEventHandlers(onClick, (event) => {
          setChecked((prevChecked) => isIndeterminate(prevChecked) ? true : !prevChecked);
          if (bubbleInput && isFormControl) {
            hasConsumerStoppedPropagationRef.current = event.isPropagationStopped();
            if (!hasConsumerStoppedPropagationRef.current) event.stopPropagation();
          }
        })
      }
    );
  }
);
CheckboxTrigger.displayName = TRIGGER_NAME$2;
var Checkbox$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeCheckbox,
      name: name2,
      checked,
      defaultChecked,
      required,
      disabled,
      value,
      onCheckedChange,
      form,
      ...checkboxProps
    } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      CheckboxProvider,
      {
        __scopeCheckbox,
        checked,
        defaultChecked,
        disabled,
        required,
        onCheckedChange,
        name: name2,
        form,
        value,
        internal_do_not_use_render: ({ isFormControl }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            CheckboxTrigger,
            {
              ...checkboxProps,
              ref: forwardedRef,
              __scopeCheckbox
            }
          ),
          isFormControl && /* @__PURE__ */ jsxRuntimeExports.jsx(
            CheckboxBubbleInput,
            {
              __scopeCheckbox
            }
          )
        ] })
      }
    );
  }
);
Checkbox$1.displayName = CHECKBOX_NAME;
var INDICATOR_NAME = "CheckboxIndicator";
var CheckboxIndicator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeCheckbox, forceMount, ...indicatorProps } = props;
    const context = useCheckboxContext(INDICATOR_NAME, __scopeCheckbox);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Presence,
      {
        present: forceMount || isIndeterminate(context.checked) || context.checked === true,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Primitive.span,
          {
            "data-state": getState$1(context.checked),
            "data-disabled": context.disabled ? "" : void 0,
            ...indicatorProps,
            ref: forwardedRef,
            style: { pointerEvents: "none", ...props.style }
          }
        )
      }
    );
  }
);
CheckboxIndicator.displayName = INDICATOR_NAME;
var BUBBLE_INPUT_NAME = "CheckboxBubbleInput";
var CheckboxBubbleInput = reactExports.forwardRef(
  ({ __scopeCheckbox, ...props }, forwardedRef) => {
    const {
      control,
      hasConsumerStoppedPropagationRef,
      checked,
      defaultChecked,
      required,
      disabled,
      name: name2,
      value,
      form,
      bubbleInput,
      setBubbleInput
    } = useCheckboxContext(BUBBLE_INPUT_NAME, __scopeCheckbox);
    const composedRefs = useComposedRefs(forwardedRef, setBubbleInput);
    const prevChecked = usePrevious(checked);
    const controlSize = useSize(control);
    reactExports.useEffect(() => {
      const input = bubbleInput;
      if (!input) return;
      const inputProto = window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(
        inputProto,
        "checked"
      );
      const setChecked = descriptor.set;
      const bubbles = !hasConsumerStoppedPropagationRef.current;
      if (prevChecked !== checked && setChecked) {
        const event = new Event("click", { bubbles });
        input.indeterminate = isIndeterminate(checked);
        setChecked.call(input, isIndeterminate(checked) ? false : checked);
        input.dispatchEvent(event);
      }
    }, [bubbleInput, prevChecked, checked, hasConsumerStoppedPropagationRef]);
    const defaultCheckedRef = reactExports.useRef(isIndeterminate(checked) ? false : checked);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.input,
      {
        type: "checkbox",
        "aria-hidden": true,
        defaultChecked: defaultChecked ?? defaultCheckedRef.current,
        required,
        disabled,
        name: name2,
        value,
        form,
        ...props,
        tabIndex: -1,
        ref: composedRefs,
        style: {
          ...props.style,
          ...controlSize,
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          margin: 0,
          // We transform because the input is absolutely positioned but we have
          // rendered it **after** the button. This pulls it back to sit on top
          // of the button.
          transform: "translateX(-100%)"
        }
      }
    );
  }
);
CheckboxBubbleInput.displayName = BUBBLE_INPUT_NAME;
function isFunction(value) {
  return typeof value === "function";
}
function isIndeterminate(checked) {
  return checked === "indeterminate";
}
function getState$1(checked) {
  return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
}
const Checkbox = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Checkbox$1,
  {
    ref,
    className: cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckboxIndicator, { className: cn("grid place-content-center text-current"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4" }) })
  }
));
Checkbox.displayName = Checkbox$1.displayName;
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER$1 = /* @__PURE__ */ Symbol("radix.slottable");
function isSlottable(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER$1;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element2) {
  let getter = Object.getOwnPropertyDescriptor(element2.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element2.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element2, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element2.props.ref;
  }
  return element2.props.ref || element2.ref;
}
var DIALOG_NAME = "Dialog";
var [createDialogContext, createDialogScope] = createContextScope(DIALOG_NAME);
var [DialogProvider, useDialogContext] = createDialogContext(DIALOG_NAME);
var Dialog = (props) => {
  const {
    __scopeDialog,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    modal = true
  } = props;
  const triggerRef = reactExports.useRef(null);
  const contentRef = reactExports.useRef(null);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: DIALOG_NAME
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DialogProvider,
    {
      scope: __scopeDialog,
      triggerRef,
      contentRef,
      contentId: useId(),
      titleId: useId(),
      descriptionId: useId(),
      open,
      onOpenChange: setOpen,
      onOpenToggle: reactExports.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
      modal,
      children
    }
  );
};
Dialog.displayName = DIALOG_NAME;
var TRIGGER_NAME$1 = "DialogTrigger";
var DialogTrigger = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...triggerProps } = props;
    const context = useDialogContext(TRIGGER_NAME$1, __scopeDialog);
    const composedTriggerRef = useComposedRefs(forwardedRef, context.triggerRef);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": context.open,
        "aria-controls": context.contentId,
        "data-state": getState(context.open),
        ...triggerProps,
        ref: composedTriggerRef,
        onClick: composeEventHandlers(props.onClick, context.onOpenToggle)
      }
    );
  }
);
DialogTrigger.displayName = TRIGGER_NAME$1;
var PORTAL_NAME$1 = "DialogPortal";
var [PortalProvider, usePortalContext] = createDialogContext(PORTAL_NAME$1, {
  forceMount: void 0
});
var DialogPortal = (props) => {
  const { __scopeDialog, forceMount, children, container } = props;
  const context = useDialogContext(PORTAL_NAME$1, __scopeDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PortalProvider, { scope: __scopeDialog, forceMount, children: reactExports.Children.map(children, (child) => /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$2, { asChild: true, container, children: child }) })) });
};
DialogPortal.displayName = PORTAL_NAME$1;
var OVERLAY_NAME$1 = "DialogOverlay";
var DialogOverlay = reactExports.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(OVERLAY_NAME$1, props.__scopeDialog);
    const { forceMount = portalContext.forceMount, ...overlayProps } = props;
    const context = useDialogContext(OVERLAY_NAME$1, props.__scopeDialog);
    return context.modal ? /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogOverlayImpl, { ...overlayProps, ref: forwardedRef }) }) : null;
  }
);
DialogOverlay.displayName = OVERLAY_NAME$1;
var Slot = /* @__PURE__ */ createSlot("DialogOverlay.RemoveScroll");
var DialogOverlayImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...overlayProps } = props;
    const context = useDialogContext(OVERLAY_NAME$1, __scopeDialog);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ jsxRuntimeExports.jsx(ReactRemoveScroll, { as: Slot, allowPinchZoom: true, shards: [context.contentRef], children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.div,
        {
          "data-state": getState(context.open),
          ...overlayProps,
          ref: forwardedRef,
          style: { pointerEvents: "auto", ...overlayProps.style }
        }
      ) })
    );
  }
);
var CONTENT_NAME$1 = "DialogContent";
var DialogContent = reactExports.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME$1, props.__scopeDialog);
    const { forceMount = portalContext.forceMount, ...contentProps } = props;
    const context = useDialogContext(CONTENT_NAME$1, props.__scopeDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: context.modal ? /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContentModal, { ...contentProps, ref: forwardedRef }) : /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContentNonModal, { ...contentProps, ref: forwardedRef }) });
  }
);
DialogContent.displayName = CONTENT_NAME$1;
var DialogContentModal = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useDialogContext(CONTENT_NAME$1, props.__scopeDialog);
    const contentRef = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, context.contentRef, contentRef);
    reactExports.useEffect(() => {
      const content2 = contentRef.current;
      if (content2) return hideOthers(content2);
    }, []);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      DialogContentImpl,
      {
        ...props,
        ref: composedRefs,
        trapFocus: context.open,
        disableOutsidePointerEvents: true,
        onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
          event.preventDefault();
          context.triggerRef.current?.focus();
        }),
        onPointerDownOutside: composeEventHandlers(props.onPointerDownOutside, (event) => {
          const originalEvent = event.detail.originalEvent;
          const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
          const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
          if (isRightClick) event.preventDefault();
        }),
        onFocusOutside: composeEventHandlers(
          props.onFocusOutside,
          (event) => event.preventDefault()
        )
      }
    );
  }
);
var DialogContentNonModal = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useDialogContext(CONTENT_NAME$1, props.__scopeDialog);
    const hasInteractedOutsideRef = reactExports.useRef(false);
    const hasPointerDownOutsideRef = reactExports.useRef(false);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      DialogContentImpl,
      {
        ...props,
        ref: forwardedRef,
        trapFocus: false,
        disableOutsidePointerEvents: false,
        onCloseAutoFocus: (event) => {
          props.onCloseAutoFocus?.(event);
          if (!event.defaultPrevented) {
            if (!hasInteractedOutsideRef.current) context.triggerRef.current?.focus();
            event.preventDefault();
          }
          hasInteractedOutsideRef.current = false;
          hasPointerDownOutsideRef.current = false;
        },
        onInteractOutside: (event) => {
          props.onInteractOutside?.(event);
          if (!event.defaultPrevented) {
            hasInteractedOutsideRef.current = true;
            if (event.detail.originalEvent.type === "pointerdown") {
              hasPointerDownOutsideRef.current = true;
            }
          }
          const target = event.target;
          const targetIsTrigger = context.triggerRef.current?.contains(target);
          if (targetIsTrigger) event.preventDefault();
          if (event.detail.originalEvent.type === "focusin" && hasPointerDownOutsideRef.current) {
            event.preventDefault();
          }
        }
      }
    );
  }
);
var DialogContentImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, trapFocus, onOpenAutoFocus, onCloseAutoFocus, ...contentProps } = props;
    const context = useDialogContext(CONTENT_NAME$1, __scopeDialog);
    const contentRef = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef);
    useFocusGuards();
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        FocusScope,
        {
          asChild: true,
          loop: true,
          trapped: trapFocus,
          onMountAutoFocus: onOpenAutoFocus,
          onUnmountAutoFocus: onCloseAutoFocus,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            DismissableLayer,
            {
              role: "dialog",
              id: context.contentId,
              "aria-describedby": context.descriptionId,
              "aria-labelledby": context.titleId,
              "data-state": getState(context.open),
              ...contentProps,
              ref: composedRefs,
              onDismiss: () => context.onOpenChange(false)
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TitleWarning, { titleId: context.titleId }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DescriptionWarning$1, { contentRef, descriptionId: context.descriptionId })
      ] })
    ] });
  }
);
var TITLE_NAME$1 = "DialogTitle";
var DialogTitle = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...titleProps } = props;
    const context = useDialogContext(TITLE_NAME$1, __scopeDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.h2, { id: context.titleId, ...titleProps, ref: forwardedRef });
  }
);
DialogTitle.displayName = TITLE_NAME$1;
var DESCRIPTION_NAME$1 = "DialogDescription";
var DialogDescription = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...descriptionProps } = props;
    const context = useDialogContext(DESCRIPTION_NAME$1, __scopeDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.p, { id: context.descriptionId, ...descriptionProps, ref: forwardedRef });
  }
);
DialogDescription.displayName = DESCRIPTION_NAME$1;
var CLOSE_NAME = "DialogClose";
var DialogClose = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...closeProps } = props;
    const context = useDialogContext(CLOSE_NAME, __scopeDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        ...closeProps,
        ref: forwardedRef,
        onClick: composeEventHandlers(props.onClick, () => context.onOpenChange(false))
      }
    );
  }
);
DialogClose.displayName = CLOSE_NAME;
function getState(open) {
  return open ? "open" : "closed";
}
var TITLE_WARNING_NAME = "DialogTitleWarning";
var [WarningProvider, useWarningContext] = createContext2(TITLE_WARNING_NAME, {
  contentName: CONTENT_NAME$1,
  titleName: TITLE_NAME$1,
  docsSlug: "dialog"
});
var TitleWarning = ({ titleId }) => {
  const titleWarningContext = useWarningContext(TITLE_WARNING_NAME);
  const MESSAGE = `\`${titleWarningContext.contentName}\` requires a \`${titleWarningContext.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${titleWarningContext.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${titleWarningContext.docsSlug}`;
  reactExports.useEffect(() => {
    if (titleId) {
      const hasTitle = document.getElementById(titleId);
      if (!hasTitle) console.error(MESSAGE);
    }
  }, [MESSAGE, titleId]);
  return null;
};
var DESCRIPTION_WARNING_NAME = "DialogDescriptionWarning";
var DescriptionWarning$1 = ({ contentRef, descriptionId }) => {
  const descriptionWarningContext = useWarningContext(DESCRIPTION_WARNING_NAME);
  const MESSAGE = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${descriptionWarningContext.contentName}}.`;
  reactExports.useEffect(() => {
    const describedById = contentRef.current?.getAttribute("aria-describedby");
    if (descriptionId && describedById) {
      const hasDescription = document.getElementById(descriptionId);
      if (!hasDescription) console.warn(MESSAGE);
    }
  }, [MESSAGE, contentRef, descriptionId]);
  return null;
};
var Root = Dialog;
var Trigger = DialogTrigger;
var Portal = DialogPortal;
var Overlay = DialogOverlay;
var Content = DialogContent;
var Title = DialogTitle;
var Description = DialogDescription;
var Close = DialogClose;
var SLOTTABLE_IDENTIFIER = /* @__PURE__ */ Symbol("radix.slottable");
// @__NO_SIDE_EFFECTS__
function createSlottable(ownerName) {
  const Slottable2 = ({ children }) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
  };
  Slottable2.displayName = `${ownerName}.Slottable`;
  Slottable2.__radixId = SLOTTABLE_IDENTIFIER;
  return Slottable2;
}
var ROOT_NAME = "AlertDialog";
var [createAlertDialogContext] = createContextScope(ROOT_NAME, [
  createDialogScope
]);
var useDialogScope = createDialogScope();
var AlertDialog$1 = (props) => {
  const { __scopeAlertDialog, ...alertDialogProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root, { ...dialogScope, ...alertDialogProps, modal: true });
};
AlertDialog$1.displayName = ROOT_NAME;
var TRIGGER_NAME = "AlertDialogTrigger";
var AlertDialogTrigger = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...triggerProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Trigger, { ...dialogScope, ...triggerProps, ref: forwardedRef });
  }
);
AlertDialogTrigger.displayName = TRIGGER_NAME;
var PORTAL_NAME = "AlertDialogPortal";
var AlertDialogPortal$1 = (props) => {
  const { __scopeAlertDialog, ...portalProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal, { ...dialogScope, ...portalProps });
};
AlertDialogPortal$1.displayName = PORTAL_NAME;
var OVERLAY_NAME = "AlertDialogOverlay";
var AlertDialogOverlay$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...overlayProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Overlay, { ...dialogScope, ...overlayProps, ref: forwardedRef });
  }
);
AlertDialogOverlay$1.displayName = OVERLAY_NAME;
var CONTENT_NAME = "AlertDialogContent";
var [AlertDialogContentProvider, useAlertDialogContentContext] = createAlertDialogContext(CONTENT_NAME);
var Slottable = /* @__PURE__ */ createSlottable("AlertDialogContent");
var AlertDialogContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, children, ...contentProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    const contentRef = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef);
    const cancelRef = reactExports.useRef(null);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      WarningProvider,
      {
        contentName: CONTENT_NAME,
        titleName: TITLE_NAME,
        docsSlug: "alert-dialog",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogContentProvider, { scope: __scopeAlertDialog, cancelRef, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Content,
          {
            role: "alertdialog",
            ...dialogScope,
            ...contentProps,
            ref: composedRefs,
            onOpenAutoFocus: composeEventHandlers(contentProps.onOpenAutoFocus, (event) => {
              event.preventDefault();
              cancelRef.current?.focus({ preventScroll: true });
            }),
            onPointerDownOutside: (event) => event.preventDefault(),
            onInteractOutside: (event) => event.preventDefault(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Slottable, { children }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DescriptionWarning, { contentRef })
            ]
          }
        ) })
      }
    );
  }
);
AlertDialogContent$1.displayName = CONTENT_NAME;
var TITLE_NAME = "AlertDialogTitle";
var AlertDialogTitle$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...titleProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { ...dialogScope, ...titleProps, ref: forwardedRef });
  }
);
AlertDialogTitle$1.displayName = TITLE_NAME;
var DESCRIPTION_NAME = "AlertDialogDescription";
var AlertDialogDescription$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeAlertDialog, ...descriptionProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { ...dialogScope, ...descriptionProps, ref: forwardedRef });
});
AlertDialogDescription$1.displayName = DESCRIPTION_NAME;
var ACTION_NAME = "AlertDialogAction";
var AlertDialogAction$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...actionProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Close, { ...dialogScope, ...actionProps, ref: forwardedRef });
  }
);
AlertDialogAction$1.displayName = ACTION_NAME;
var CANCEL_NAME = "AlertDialogCancel";
var AlertDialogCancel$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...cancelProps } = props;
    const { cancelRef } = useAlertDialogContentContext(CANCEL_NAME, __scopeAlertDialog);
    const dialogScope = useDialogScope(__scopeAlertDialog);
    const ref = useComposedRefs(forwardedRef, cancelRef);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Close, { ...dialogScope, ...cancelProps, ref });
  }
);
AlertDialogCancel$1.displayName = CANCEL_NAME;
var DescriptionWarning = ({ contentRef }) => {
  const MESSAGE = `\`${CONTENT_NAME}\` requires a description for the component to be accessible for screen reader users.

You can add a description to the \`${CONTENT_NAME}\` by passing a \`${DESCRIPTION_NAME}\` component as a child, which also benefits sighted users by adding visible context to the dialog.

Alternatively, you can use your own component as a description by assigning it an \`id\` and passing the same value to the \`aria-describedby\` prop in \`${CONTENT_NAME}\`. If the description is confusing or duplicative for sighted users, you can use the \`@radix-ui/react-visually-hidden\` primitive as a wrapper around your description component.

For more information, see https://radix-ui.com/primitives/docs/components/alert-dialog`;
  reactExports.useEffect(() => {
    const hasDescription = document.getElementById(
      contentRef.current?.getAttribute("aria-describedby")
    );
    if (!hasDescription) console.warn(MESSAGE);
  }, [MESSAGE, contentRef]);
  return null;
};
var Root2 = AlertDialog$1;
var Portal2 = AlertDialogPortal$1;
var Overlay2 = AlertDialogOverlay$1;
var Content2 = AlertDialogContent$1;
var Action = AlertDialogAction$1;
var Cancel = AlertDialogCancel$1;
var Title2 = AlertDialogTitle$1;
var Description2 = AlertDialogDescription$1;
const AlertDialog = Root2;
const AlertDialogPortal = Portal2;
const AlertDialogOverlay = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Overlay2,
  {
    className: cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props,
    ref
  }
));
AlertDialogOverlay.displayName = Overlay2.displayName;
const AlertDialogContent = reactExports.forwardRef(({ className, overlayClassName, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogPortal, { children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogOverlay, { className: overlayClassName }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(
    Content2,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      ),
      ...props
    }
  )
] }));
AlertDialogContent.displayName = Content2.displayName;
const AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("flex flex-col space-y-2 text-center sm:text-left", className), ...props });
AlertDialogHeader.displayName = "AlertDialogHeader";
const AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "div",
  {
    className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
    ...props
  }
);
AlertDialogFooter.displayName = "AlertDialogFooter";
const AlertDialogTitle = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Title2,
  {
    ref,
    className: cn("text-lg font-semibold", className),
    ...props
  }
));
AlertDialogTitle.displayName = Title2.displayName;
const AlertDialogDescription = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Description2,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
AlertDialogDescription.displayName = Description2.displayName;
const AlertDialogAction = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(Action, { ref, className: cn(buttonVariants(), className), ...props }));
AlertDialogAction.displayName = Action.displayName;
const AlertDialogCancel = reactExports.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  Cancel,
  {
    ref,
    className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
    ...props
  }
));
AlertDialogCancel.displayName = Cancel.displayName;
function shouldSkipCheckpointConfirm() {
  return getUiPrefsCache().skipCheckpointConfirm === true;
}
function setSkipCheckpointConfirm(skip) {
  patchUiPrefsCache({ skipCheckpointConfirm: skip });
  void saveUiPrefsToProjectDb({ skipCheckpointConfirm: skip });
}
function ChatResendConfirmDialog({ open, onOpenChange, onConfirm }) {
  const [dontAskAgain, setDontAskAgain] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!open) setDontAskAgain(false);
  }, [open]);
  reactExports.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = e.target?.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") return;
        e.preventDefault();
        if (dontAskAgain) setSkipCheckpointConfirm(true);
        onConfirm();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dontAskAgain, onConfirm, onOpenChange]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    AlertDialogContent,
    {
      overlayClassName: "bg-black/42 backdrop-blur-[1px]",
      className: "chat-resend-confirm-dialog gap-0 p-0 sm:max-w-[420px]",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { className: "space-y-1.5 px-5 pb-4 pt-5 text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { className: "text-[15px] font-semibold leading-snug", children: "要丢弃此检查点之后的所有更改吗？" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { className: "text-[13px] leading-relaxed text-muted-foreground", children: "之后仍可撤销此操作。" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-5 pb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Checkbox,
            {
              id: "chat-checkpoint-dont-ask",
              checked: dontAskAgain,
              onCheckedChange: (v) => setDontAskAgain(v === true)
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              htmlFor: "chat-checkpoint-dont-ask",
              className: "cursor-pointer select-none text-[13px] leading-none text-muted-foreground",
              children: "不再询问"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { className: "flex-row justify-end gap-2 border-t border-border/70 bg-muted/10 px-5 py-3 sm:space-x-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "sm",
              className: "h-8 rounded-md px-3.5 text-[13px] text-muted-foreground hover:text-foreground",
              onClick: () => onOpenChange(false),
              children: "取消 (Esc)"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              size: "sm",
              className: "h-8 rounded-md px-3.5 text-[13px]",
              onClick: () => {
                if (dontAskAgain) setSkipCheckpointConfirm(true);
                onConfirm();
                onOpenChange(false);
              },
              children: "继续 ↵"
            }
          )
        ] })
      ]
    }
  ) });
}
const STORAGE_KEY = "claudecode.chatSessionsCache.v1";
let cache = null;
function readStorageCache() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeStorageCache(next) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!next) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
  }
}
function getChatSessionsCache() {
  if (cache) return cache;
  const stored = readStorageCache();
  if (stored) cache = stored;
  return cache;
}
function setChatSessionsCache(next) {
  cache = next;
  writeStorageCache(next);
}
function markExplicitEmptyChatSession(sessionId) {
  const base = cache ?? readStorageCache();
  if (!base) {
    cache = {
      sessions: [],
      activeId: sessionId,
      activeByWorkspace: {},
      workspacePath: null,
      composerDrafts: {},
      explicitEmptySessionId: sessionId
    };
    writeStorageCache(cache);
    return;
  }
  setChatSessionsCache({ ...base, explicitEmptySessionId: sessionId });
}
function clearExplicitEmptyChatSessionIf(sessionId) {
  if (cache?.explicitEmptySessionId === sessionId) {
    setChatSessionsCache({ ...cache, explicitEmptySessionId: null });
  }
}
function clearExplicitEmptyChatSession() {
  if (cache?.explicitEmptySessionId) {
    setChatSessionsCache({ ...cache, explicitEmptySessionId: null });
  }
}
function syncExplicitEmptyInCache(sessionId) {
  if (!cache) return;
  setChatSessionsCache({ ...cache, explicitEmptySessionId: sessionId });
}
function fullChatSettingsPayload(s) {
  return chatSettingsPreservePayload(s);
}
function toastIfLocalOrchestrationHints(res) {
  const hints = res?.orchestrationHints;
  if (!Array.isArray(hints) || !hints.some((s) => String(s ?? "").trim())) return;
  toast.warning(hints.map((s) => String(s ?? "").trim()).filter(Boolean).join("\n"), {
    duration: 1e4
  });
}
function toastIngestWorkspaceHint(msg) {
  toast.warning(msg, {
    duration: 12e3
  });
}
function needsCheckpointConfirm(sess, historyIndex) {
  if (!sess) return false;
  return historyIndex < sess.history.length - 1;
}
function countUserMessages(hist) {
  return hist.filter((m) => m.role === "user").length;
}
function lastUserMessageTs(hist) {
  for (let i = hist.length - 1; i >= 0; i--) {
    const m = hist[i];
    if (m?.role === "user") return m.ts ?? 0;
  }
  return 0;
}
function mergeSessionsPreferLongerHistory(local, disk, sendingById) {
  const localById = new Map(local.map((s) => [s.id, s]));
  const merged = [];
  const bootstrapFromDisk = local.length === 0;
  for (const d of disk) {
    const l = localById.get(d.id);
    if (!l) {
      if (bootstrapFromDisk) merged.push(d);
      continue;
    }
    const keepLocal = l.history.length > d.history.length || Boolean(sendingById[l.id]) || countUserMessages(l.history) > countUserMessages(d.history) || l.history.length === d.history.length && lastUserMessageTs(l.history) >= lastUserMessageTs(d.history);
    merged.push(keepLocal ? {
      ...l,
      title: d.title || l.title,
      modelId: d.modelId || l.modelId
    } : {
      ...d,
      modelId: d.modelId || l.modelId
    });
    localById.delete(d.id);
  }
  for (const l of localById.values()) merged.push(l);
  return merged;
}
const EMPTY_SESSION_WELCOME = "新对话已开始。";
function shortenLegacyChainUserBubbleForDisplay(raw) {
  const t = raw.trim();
  if (t.length < 480) return raw;
  const hasVerboseHints = t.includes("【任务上下文】") || t.includes("【自动路由】") || t.includes("【执行约束】") || /^\/agent\s+\S+/i.test(t) || t.includes("【任务链 Agent 路由】");
  if (!hasVerboseHints) return raw;
  if (t.includes("【任务上下文】")) {
    const head = t.slice(0, 900);
    const ag = head.match(/\bagent\s*=\s*([^；\s\n]+)/i);
    const tid = head.match(/\btaskId\s*=\s*([^；\s\n]+)/i);
    if (ag && tid) {
      const snip = t.split("\n").find((l) => {
        const s = l.trim();
        return s.length > 0 && !/^【任务上下文】/.test(s) && !/^【执行约束】/.test(s) && !/^【自动路由】/.test(s);
      })?.replace(/\s+/g, " ").trim().slice(0, 140);
      return `【任务链】${ag[1]} · ${tid[1]}${snip ? `
${snip}${snip.length >= 140 ? "…" : ""}` : ""}`;
    }
  }
  const claude = t.match(/【任务链 Agent 路由】global:\/\/(\S+)（任务\s*([^）]+)）/);
  if (claude) {
    const line = t.split("\n").find((l) => l.trim().startsWith("【任务】"))?.trim().slice(0, 120);
    return `【任务链】${claude[1]} · ${claude[2].trim()}${line ? `
${line}${line.length >= 120 ? "…" : ""}` : ""}`;
  }
  const local = t.match(/^\/agent\s+(\S+)\s*（任务\s*([^）]+)）/);
  if (local) {
    const rest = t.slice(local[0].length).trim();
    const first = rest.split("\n").find((l) => l.trim().length > 0) ?? "";
    const snip = first.replace(/\s+/g, " ").slice(0, 140);
    return `【任务链】${local[1]} · ${local[2].trim()}${snip ? `
${snip}${first.length > 140 ? "…" : ""}` : ""}`;
  }
  return raw;
}
function lastAgentStemFromHistory(hist) {
  for (let i = hist.length - 1; i >= 0; i--) {
    const m = hist[i];
    if (m.role === "assistant" && m.agentStem) return m.agentStem;
    if (m.role === "user") {
      const cmd = parseAgentCommand(m.content);
      if (cmd.matched) return cmd.stem;
    }
  }
  return void 0;
}
function assistantBubbleName(m, modelLabel) {
  if (m.agentStem) {
    const label = m.agentLabel?.trim() || m.agentStem;
    return `@${label} · ${modelLabel}`;
  }
  return modelLabel;
}
function diskToDisplay(list2, modelLabel) {
  return list2.map((m, historyIndex) => ({
    role: m.role,
    content: m.role === "user" ? shortenLegacyChainUserBubbleForDisplay(m.content) : stripLargeAssistantArtifacts(m.content),
    name: m.role === "assistant" ? assistantBubbleName(m, modelLabel) : void 0,
    time: m.ts ? new Date(m.ts).toLocaleString() : void 0,
    attachments: m.role === "user" && m.attachments?.length ? m.attachments : void 0,
    terminalSnippets: m.role === "user" && m.terminalSnippets?.length ? m.terminalSnippets : void 0,
    historyIndex: m.role === "user" ? historyIndex : void 0
  }));
}
function userMessageForHistoryIndex(history, historyIndex, modelLabel) {
  const msg = history[historyIndex];
  if (!msg || msg.role !== "user") return null;
  const users = diskToDisplay(history.slice(0, historyIndex + 1), modelLabel).filter((m) => m.role === "user");
  return users[users.length - 1] ?? null;
}
function newLocalId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function buildComposerUserLine(text2, terminalSnippets) {
  const terminalPart = terminalSnippets.map((s) => trimTerminalDisplay(s.text)).filter(Boolean).join("\n\n");
  if (text2 && terminalPart) return `${text2}

${terminalPart}`;
  return text2 || terminalPart;
}
function pickOrchestratorModel(raw, pool, mode) {
  const t = normalizeChatModelSelection(raw);
  if (isAutoModelSelection(t)) return AUTO_MODEL_ID;
  const list2 = pool.filter(Boolean);
  if (t && list2.includes(t)) return t;
  if (mode === "claude-code" && /^(sonnet|opus|haiku|claude-)/i.test(t)) return t;
  if (t) return t;
  return AUTO_MODEL_ID;
}
function priorTurnsToOrchestrationMessages(prior) {
  return prior.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
    ...m.attachments?.length ? {
      attachments: m.attachments
    } : {}
  }));
}
function formatAssistantFailure(res) {
  const err = String(res.error || "").trim();
  if (res.aborted || res.error === "请求已取消") {
    if (err && /超时|429|配额|模型与连接|deepseek|API Key|连接失败/i.test(err)) {
      return `请求失败：${err}`;
    }
    if (err && /已取消|已中止|生成已停止/i.test(err)) {
      return "（生成已停止）";
    }
    if (err && err.length > 24) {
      return `请求失败：${err}`;
    }
    return "（生成已停止）";
  }
  return `请求失败：${err || "未知错误"}`;
}
function ChatPage() {
  const hasDesktopApi = useHasDesktop();
  const navigate = useNavigate();
  const {
    session: urlSessionId,
    new: urlNewSession,
    claudeResume: urlClaudeResume
  } = Route.useSearch();
  const urlSessionHandledRef = reactExports.useRef(null);
  const urlNewHandledRef = reactExports.useRef(false);
  const urlClaudeResumeHandledRef = reactExports.useRef(null);
  const {
    chainRunning,
    chainStatusBadge,
    runOrchestrationChain,
    stopChainExecution,
    syncExecutionState
  } = useOrchestrationExecution();
  const sessionRevision = useChatSessionRevision();
  const [input, setInput] = reactExports.useState("");
  const [leftSidebarOpen, setLeftSidebarOpen] = reactExports.useState(true);
  const [chatPanelOpen, setChatPanelOpen] = reactExports.useState(true);
  const [terminalOpen, setTerminalOpen] = reactExports.useState(false);
  const [activeSkill, setActiveSkill] = reactExports.useState("快速");
  const [imageVideoSegment, setImageVideoSegment] = reactExports.useState("图像");
  const [speedOpen, setSpeedOpen] = reactExports.useState(false);
  const [lengthOpen, setLengthOpen] = reactExports.useState(false);
  const [ratioOpen, setRatioOpen] = reactExports.useState(false);
  const [moreOpen, setMoreOpen] = reactExports.useState(false);
  const [ratio, setRatio] = reactExports.useState("16:9");
  const [length, setLength] = reactExports.useState("适中");
  const [speed, setSpeed] = reactExports.useState("快速");
  const [styleOpen, setStyleOpen] = reactExports.useState(false);
  const [tplOpen, setTplOpen] = reactExports.useState(false);
  const [style, setStyle] = reactExports.useState("电影写真");
  const [tpl, setTpl] = reactExports.useState(null);
  const [githubOpen, setGithubOpen] = reactExports.useState(false);
  const [imageModel, setImageModel] = reactExports.useState("");
  const [videoModel, setVideoModel] = reactExports.useState("");
  const [imgModelOpen, setImgModelOpen] = reactExports.useState(false);
  const [vidModelOpen, setVidModelOpen] = reactExports.useState(false);
  const popRef = reactExports.useRef(null);
  const taRef = reactExports.useRef(null);
  const inlineTaRef = reactExports.useRef(null);
  const attachInputRef = reactExports.useRef(null);
  const [pendingImages, setPendingImages] = reactExports.useState([]);
  const [pendingTerminalSnippets, setPendingTerminalSnippets] = reactExports.useState([]);
  const [editHistoryIndex, setEditHistoryIndex] = reactExports.useState(null);
  const editHistoryIndexRef = reactExports.useRef(null);
  const [editComposer, setEditComposer] = reactExports.useState(null);
  const editComposerRef = reactExports.useRef(null);
  const sendPayloadOverrideRef = reactExports.useRef(null);
  const activeRequestIdsRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const newSessionInFlightRef = reactExports.useRef(false);
  const streamContextRef = reactExports.useRef(null);
  const activeStreamRequestIdRef = reactExports.useRef(null);
  const [activeStreamRequestId, setActiveStreamRequestId] = reactExports.useState(null);
  const sendingSessionsRef = reactExports.useRef({});
  const chainRunningRef = reactExports.useRef(false);
  const composerDraftsRef = reactExports.useRef({});
  const draftSaveTimerRef = reactExports.useRef(null);
  const chatBodyMountRef = reactExports.useRef(null);
  const [chatBodyMountEl, setChatBodyMountEl] = reactExports.useState(null);
  const onChatBodyMountRef = reactExports.useCallback((el) => {
    chatBodyMountRef.current = el;
    setChatBodyMountEl(el);
  }, []);
  const insertTerminalSelection = reactExports.useCallback((payload) => {
    const trimmed = payload.text.trim();
    if (!trimmed) return;
    setPendingTerminalSnippets((prev) => [...prev, {
      id: newLocalId(),
      text: trimmed,
      sourceLabel: payload.sourceLabel,
      startLine: payload.startLine,
      endLine: payload.endLine
    }]);
    requestAnimationFrame(() => taRef.current?.focus());
  }, []);
  const openChatPanel = reactExports.useCallback(() => {
    setChatPanelOpen(true);
  }, []);
  const pickLocalFiles = reactExports.useCallback(async (opts) => {
    const onlyImages = opts?.onlyImages ?? false;
    const api = getDesktop();
    const appendPaths = (paths) => {
      if (!paths.length) return;
      const note = paths.map((p) => `[附件: ${p}]`).join("\n");
      setInput((prev) => prev.trim() ? `${prev.trim()}
${note}` : note);
    };
    if (api?.chooseReferenceFiles) {
      const r = await api.chooseReferenceFiles({
        multiple: true,
        onlyImages
      });
      if (r.canceled || !r.filePaths.length) return;
      if (onlyImages && api.readReferenceFilesAsImageAttachments) {
        const read = await api.readReferenceFilesAsImageAttachments(r.filePaths);
        const items = read?.items ?? [];
        if (read?.ok && items.length) {
          setPendingImages((p) => [...p, ...items.map((it) => ({
            kind: "image",
            name: it.name,
            mime: it.mime,
            dataUrl: it.dataUrl,
            id: newLocalId()
          }))]);
        }
        return;
      }
      appendPaths(r.filePaths);
      return;
    }
    const inp = attachInputRef.current;
    if (inp) {
      inp.accept = onlyImages ? "image/*" : "";
      inp.multiple = true;
      inp.click();
    }
  }, []);
  const onAttachInputChange = reactExports.useCallback((e) => {
    const {
      files
    } = e.target;
    if (!files?.length) return;
    const list2 = Array.from(files);
    const allImg = list2.every((f) => f.type.startsWith("image/"));
    if (allImg) {
      for (const f of list2) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          setPendingImages((p) => [...p, {
            id: newLocalId(),
            kind: "image",
            name: f.name,
            mime: f.type,
            dataUrl
          }]);
        };
        reader.readAsDataURL(f);
      }
      e.target.value = "";
      return;
    }
    const names = list2.map((f) => f.name);
    const note = names.map((n) => `[附件: ${n}]`).join("\n");
    setInput((prev) => prev.trim() ? `${prev.trim()}
${note}` : note);
    e.target.value = "";
  }, []);
  const [sessions, setSessions] = reactExports.useState([]);
  const [activeId, setActiveId] = reactExports.useState("s0");
  const [workspacePath, setWorkspacePath] = reactExports.useState(null);
  const workspacePathRef = reactExports.useRef(null);
  const activeByWorkspaceRef = reactExports.useRef({});
  const pendingHistorySessionRef = reactExports.useRef(null);
  const sessionsHydratedRef = reactExports.useRef(false);
  const [checkpointConfirm, setCheckpointConfirm] = reactExports.useState(null);
  const activeIdRef = reactExports.useRef(activeId);
  const sessionsRef = reactExports.useRef([]);
  const [messages, setMessages] = reactExports.useState([]);
  const messagesRef = reactExports.useRef([]);
  const [sendingSessions, setSendingSessions] = reactExports.useState({});
  const setSessionSending = reactExports.useCallback((sessionId, value) => {
    setSendingSessions((prev) => {
      const next = !value ? (() => {
        const {
          [sessionId]: _removed,
          ...rest
        } = prev;
        return rest;
      })() : {
        ...prev,
        [sessionId]: true
      };
      sendingSessionsRef.current = next;
      return next;
    });
  }, []);
  const switchActiveSession = reactExports.useCallback((id) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);
  const sending = Boolean(sendingSessions[activeId]);
  const [stopRequested, setStopRequested] = reactExports.useState(false);
  reactExports.useEffect(() => {
    chainRunningRef.current = chainRunning;
  }, [chainRunning]);
  const workflowBusy = sending || chainRunning;
  const [globalModel, setGlobalModel] = reactExports.useState("");
  const [orchestratorModels, setOrchestratorModels] = reactExports.useState([]);
  const [localOllamaTags, setLocalOllamaTags] = reactExports.useState([]);
  const [orchMode, setOrchMode] = reactExports.useState("claude-code");
  const [localAgentBasename, setLocalAgentBasename] = reactExports.useState("");
  const agentDisplayByStemRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const reloadAgentDisplayMap = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.listClaudeAgentMarkdown) return;
    const r = await api.listClaudeAgentMarkdown();
    if (!r.ok || !r.items) return;
    const map2 = /* @__PURE__ */ new Map();
    for (const row of r.items) {
      map2.set(row.stem, row.displayName?.trim() || resolveAgentDisplayName({
        stem: row.stem,
        basename: row.basename,
        name: row.name,
        nameZh: row.nameZh,
        heading: row.heading,
        description: row.description
      }));
    }
    agentDisplayByStemRef.current = map2;
  }, []);
  const stemAgentMeta = reactExports.useCallback((stem) => {
    return {
      agentStem: stem,
      agentLabel: agentDisplayByStemRef.current.get(stem) || stem
    };
  }, []);
  const sendingRef = reactExports.useRef(false);
  const streamScrollKey = (() => {
    const last = messages[messages.length - 1];
    if (!last) return "0";
    return `${messages.length}:${last.role}:${last.content.length}`;
  })();
  const {
    scrollAreaRef,
    messagesEndRef,
    composerDockRef,
    composerDockHeight,
    showJumpLatest,
    jumpToLatest,
    resetScrollFollow
  } = useChatScroll({
    messages,
    activeId,
    sending: sending || chainRunning,
    streamScrollKey,
    layoutFreezeDeps: [terminalOpen, leftSidebarOpen, chatPanelOpen]
  });
  useChatStream({
    activeSessionId: activeId,
    requestId: activeStreamRequestId,
    requestIdRef: activeStreamRequestIdRef,
    enabled: sending,
    onDelta: (_sessionId, chunk) => {
      const ctx = streamContextRef.current;
      if (!ctx || !chunk) return;
      if (ctx.sessionId !== activeIdRef.current) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        const nextContent = last.content === "__WAITING__" ? chunk : `${last.content}${chunk}`;
        return [...prev.slice(0, -1), {
          ...last,
          content: nextContent
        }];
      });
    }
  });
  reactExports.useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  reactExports.useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  reactExports.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  reactExports.useEffect(() => {
    sendingRef.current = sending || chainRunning;
    if (!sending) setStopRequested(false);
  }, [sending, chainRunning]);
  reactExports.useEffect(() => {
    const onKey = (ev) => {
      if (ev.key !== "`" || !ev.metaKey && !ev.ctrlKey) return;
      const t = ev.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
        return;
      }
      ev.preventDefault();
      setTerminalOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  reactExports.useEffect(() => {
    editHistoryIndexRef.current = editHistoryIndex;
  }, [editHistoryIndex]);
  reactExports.useEffect(() => {
    editComposerRef.current = editComposer;
  }, [editComposer]);
  const persist = reactExports.useCallback(async (nextSessions, nextActive) => {
    const api = getDesktop();
    if (!api) return;
    if (!nextSessions.length) return;
    const wsKey = workspaceSessionKey(workspacePathRef.current);
    activeByWorkspaceRef.current = {
      ...activeByWorkspaceRef.current,
      [wsKey]: nextActive
    };
    await api.saveChatSessions({
      activeId: nextActive,
      activeByWorkspace: activeByWorkspaceRef.current,
      sessions: nextSessions,
      composerDrafts: composerDraftsRef.current
    });
    const cached = getChatSessionsCache();
    setChatSessionsCache({
      sessions: nextSessions,
      activeId: nextActive,
      activeByWorkspace: activeByWorkspaceRef.current,
      workspacePath: workspacePathRef.current,
      composerDrafts: composerDraftsRef.current,
      explicitEmptySessionId: cached?.explicitEmptySessionId ?? null
    });
  }, []);
  const flushComposerDraftsToDb = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    await api.saveChatSessions({
      activeId: activeIdRef.current,
      activeByWorkspace: activeByWorkspaceRef.current,
      sessions: sessionsRef.current,
      composerDrafts: composerDraftsRef.current
    });
  }, []);
  const scheduleComposerDraftsSave = reactExports.useCallback(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      void flushComposerDraftsToDb();
    }, 400);
  }, [flushComposerDraftsToDb]);
  const patchSession = reactExports.useCallback(async (sessionId, patch2, persistActiveId = activeIdRef.current) => {
    let nextSessions = [];
    setSessions((prev) => {
      nextSessions = prev.map((s) => s.id === sessionId ? patch2(s) : s);
      sessionsRef.current = nextSessions;
      return nextSessions;
    });
    await persist(nextSessions, persistActiveId);
    return nextSessions;
  }, [persist]);
  const pruneWorkspaceSessions = reactExports.useCallback(async (keepId) => {
    const pruned = pruneDuplicateEmptySessions(sessionsRef.current, workspacePathRef.current, keepId);
    if (pruned.length !== sessionsRef.current.length) {
      sessionsRef.current = pruned;
      setSessions(pruned);
      await persist(pruned, keepId);
    }
    return pruned;
  }, [persist]);
  const appendLocalChatExchange = reactExports.useCallback(async (sessionId, userLine, assistantLine) => {
    const sess = sessionsRef.current.find((s) => s.id === sessionId);
    if (!sess) return;
    const hist = [...sess.history, {
      role: "user",
      content: userLine,
      ts: Date.now()
    }, {
      role: "assistant",
      content: assistantLine,
      ts: Date.now(),
      name: "系统"
    }];
    let title = sess.title;
    if (sess.history.length === 0) {
      const t = userLine.trim();
      title = t.length > 28 ? `${t.slice(0, 28)}…` : t;
    }
    await patchSession(sessionId, (s) => ({
      ...s,
      title,
      history: hist
    }));
    if (sessionId === activeIdRef.current) {
      const ml = sess.modelId?.trim() || globalModel || "模型";
      setMessages(diskToDisplay(hist, ml));
    }
    clearExplicitEmptyChatSessionIf(sessionId);
    if (sess.history.length === 0) {
      await pruneWorkspaceSessions(sessionId);
    }
  }, [patchSession, globalModel, pruneWorkspaceSessions]);
  const appendAgentExecEvent = reactExports.useCallback(async (payload) => {
    const api = getDesktop();
    if (!api?.memoryAppendEvent) return;
    try {
      await api.memoryAppendEvent({
        type: "agent_exec",
        agent: payload.agent,
        mode: payload.mode,
        source: payload.source,
        phase: payload.phase ?? "exec",
        taskId: payload.taskId ?? "",
        modelId: payload.modelId ?? "",
        instruction_preview: String(payload.instruction ?? "").slice(0, 240)
      });
    } catch {
    }
  }, []);
  const performConfirmWriteForText = reactExports.useCallback(async (rawContent, userLineContent) => {
    const api = getDesktop();
    if (!api?.workspaceApplyWriteFence) {
      toast.error("当前无法写入工作区。");
      return;
    }
    const trimmed = typeof rawContent === "string" ? rawContent.trim() : "";
    if (!trimmed || trimmed === "__WAITING__") {
      toast.warning("无可写入的正文。");
      return;
    }
    const settings = await api.getChatSettings();
    const defaultPath = settings.defaultConfirmWritePath?.trim() || "docs/prd.md";
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    const agentStem = lastAgentStemFromHistory(sess.history);
    const items = buildConfirmWriteItems(trimmed, defaultPath, agentStem);
    if (!items.length) {
      toast.warning("内容经处理后为空，无法写入。");
      return;
    }
    setStopRequested(false);
    setSessionSending(activeId, true);
    try {
      const res = await api.workspaceApplyWriteFence(items);
      const written = res?.written ?? [];
      if (written.length > 0) {
        const pathNote = agentStem ? `
（按 Agent \`${agentStem}\` → \`${defaultArtifactPathForAgent(agentStem)}\`）` : "";
        const summary = `【一键写入】已将内容写入当前工作区：${pathNote}
` + written.map((p) => `- \`${p}\``).join("\n");
        const userLine = {
          role: "user",
          content: userLineContent,
          ts: Date.now()
        };
        const asstLine = {
          role: "assistant",
          content: summary,
          ts: Date.now()
        };
        const hist = [...sess.history, userLine, asstLine];
        const modelLabel = sess.modelId?.trim() || settings.model || "模型";
        const nextSessions = sessions.map((s) => s.id === activeId ? {
          ...s,
          history: hist
        } : s);
        setSessions(nextSessions);
        setMessages(diskToDisplay(hist, modelLabel));
        await persist(nextSessions, activeId);
        toast.success(`已写入 ${written.length} 个文件`);
      } else if (res?.error) {
        toast.error(`未能写入：${res.error}`);
      } else if (res?.errors?.length) {
        toast.error(res.errors.slice(0, 2).join("; "));
      } else {
        toast.warning("未写入任何路径（请检查工作区是否已选择）。");
      }
    } finally {
      setSessionSending(activeId, false);
    }
  }, [activeId, sessions, persist]);
  const performConfirmWrite = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    const lastAsst = [...sess.history].reverse().find((m) => m.role === "assistant" && !m.requestError && typeof m.content === "string" && m.content.trim() && m.content !== "__WAITING__");
    if (!lastAsst) {
      toast.warning("没有可写入的上一条助手回复。请先让助手生成 PRD 等内容。");
      return;
    }
    await performConfirmWriteForText(lastAsst.content, "确认写入");
  }, [sessions, activeId, performConfirmWriteForText]);
  const handleBubbleWriteToWorkspace = reactExports.useCallback((content2) => {
    void performConfirmWriteForText(content2, "确认写入（本条气泡）");
  }, [performConfirmWriteForText]);
  const handleBubbleGenerateChain = reactExports.useCallback(async (content2) => {
    const api = getDesktop();
    const r = await saveChainFromBubbleText(api, content2);
    if (!r.ok) {
      toast.error(r.error, {
        duration: 5e3
      });
      return;
    }
    notifyAutoSavedChain({
      stepCount: r.stepCount,
      chainName: r.chainName,
      wbsPath: r.wbsPath
    }, () => navigate({
      to: "/chains",
      search: {
        q: "WBS"
      }
    }));
  }, [navigate]);
  const performBulkWriteProject = reactExports.useCallback(async (userLineContent) => {
    const api = getDesktop();
    if (!api) return;
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    setStopRequested(false);
    setSessionSending(activeId, true);
    try {
      const res = await performBulkWriteFromHistory(api, sess.history);
      const userLine = {
        role: "user",
        content: userLineContent,
        ts: Date.now()
      };
      const asstLine = {
        role: "assistant",
        content: res.displayText || (res.ok ? `【批量落盘】已写入 ${res.written.length} 个文件。` : res.error || "批量落盘未写入任何文件。"),
        ts: Date.now(),
        ...res.ok ? {} : {
          requestError: true
        }
      };
      const hist = [...sess.history, userLine, asstLine];
      const settings = await api.getChatSettings();
      const modelLabel = sess.modelId?.trim() || settings.model || "模型";
      const nextSessions = sessions.map((s) => s.id === activeId ? {
        ...s,
        history: hist
      } : s);
      setSessions(nextSessions);
      setMessages(diskToDisplay(hist, modelLabel));
      await persist(nextSessions, activeId);
      if (res.ok && res.written.length > 0) {
        toast.success(`已从 ${res.scanned ?? "?"} 条历史回复写入 ${res.written.length} 个文件`);
      } else {
        toast.warning(res.error || "未找到可落盘的代码块");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSessionSending(activeId, false);
    }
  }, [activeId, sessions, persist]);
  const runProjectPreview = reactExports.useCallback(async (userLineContent) => {
    const api = getDesktop();
    if (!api) return;
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    setStopRequested(false);
    setSessionSending(activeId, true);
    setTerminalOpen(true);
    try {
      const res = await runProjectFromChat(api, userLineContent, {
        openTerminal: () => setTerminalOpen(true)
      });
      const userLine = {
        role: "user",
        content: userLineContent,
        ts: Date.now()
      };
      const asstLine = {
        role: "assistant",
        content: res.displayText,
        ts: Date.now(),
        ...res.ok ? {} : {
          requestError: true
        }
      };
      const hist = [...sess.history, userLine, asstLine];
      const settings = await api.getChatSettings();
      const modelLabel = sess.modelId?.trim() || settings.model || "模型";
      const nextSessions = sessions.map((s) => s.id === activeId ? {
        ...s,
        history: hist
      } : s);
      setSessions(nextSessions);
      setMessages(diskToDisplay(hist, modelLabel));
      await persist(nextSessions, activeId);
      if (res.ranInTerminal) toast.success("已在集成终端执行命令");
      else if (res.ok && res.url) toast.success("已在系统浏览器打开预览");
      else if (!res.ok) toast.warning("未能自动运行，请查看终端或手动执行");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSessionSending(activeId, false);
    }
  }, [activeId, sessions, persist]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    void (async () => {
      const api = getDesktop();
      if (!api) {
        setMessages([{
          role: "assistant",
          content: BROWSER_MODE_CHAT_MESSAGE
        }]);
        return;
      }
      let bridgeOk = true;
      let settings;
      try {
        settings = await api.getChatSettings();
      } catch (e) {
        bridgeOk = false;
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`${MSG_BRIDGE_OFFLINE} 模型列表使用默认项。`, {
          description: msg.slice(0, 120),
          duration: 8e3
        });
        settings = {
          ollamaBase: "http://127.0.0.1:11434",
          model: AUTO_MODEL_ID,
          localOllamaModel: "qwen2.5-coder:14b",
          claudeCliPath: "/opt/homebrew/bin/claude",
          orchestrationMode: "claude-code",
          localAgentBasename: "",
          defaultConfirmWritePath: "docs/prd.md",
          mcpConfigAbsolutePath: "",
          devMcpOrchDebug: false,
          localModelCatalog: []
        };
      }
      const mode = settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
      setOrchMode(mode);
      setLocalAgentBasename(settings.localAgentBasename?.trim() ?? "");
      let claudePool = [];
      let localPool = [];
      if (bridgeOk) {
        try {
          const pools = await loadChatModelPools(api);
          claudePool = pools.cloudModels;
          localPool = pools.localModels;
        } catch {
        }
      }
      setOrchestratorModels(claudePool);
      setLocalOllamaTags(localPool);
      const sessionPool = [...claudePool, ...localPool];
      const migratedGlobal = pickOrchestratorModel(settings.model, sessionPool, mode);
      setGlobalModel(migratedGlobal);
      if (bridgeOk && migratedGlobal !== (settings.model || "")) {
        try {
          await api.saveChatSettings({
            ...fullChatSettingsPayload(settings),
            model: migratedGlobal
          });
        } catch {
        }
      }
      let list2 = [];
      let aid = "s0";
      let activeByWorkspace = {};
      let workspace = null;
      if (bridgeOk) {
        try {
          workspace = await api.getWorkspace();
        } catch {
          workspace = null;
        }
        workspacePathRef.current = workspace;
        setWorkspacePath(workspace);
      }
      let diskSessionsBackfilled = false;
      if (bridgeOk) {
        try {
          const disk = await api.loadChatSessions();
          const rawActiveByWorkspace = disk.activeByWorkspace ?? {
            "": disk.activeId || "s0"
          };
          const backfilled = backfillSessionWorkspaceFromActiveMap(disk.sessions, rawActiveByWorkspace);
          if (backfilled !== disk.sessions) diskSessionsBackfilled = true;
          list2 = backfilled;
          activeByWorkspace = rawActiveByWorkspace;
          activeByWorkspaceRef.current = activeByWorkspace;
          aid = pickActiveSessionId(list2, activeByWorkspace, workspace, disk.activeId);
          if (disk.composerDrafts && typeof disk.composerDrafts === "object") {
            composerDraftsRef.current = Object.fromEntries(Object.entries(disk.composerDrafts).map(([id, draft]) => [id, {
              input: typeof draft?.input === "string" ? draft.input : "",
              pendingImages: Array.isArray(draft?.pendingImages) ? draft.pendingImages : [],
              pendingTerminalSnippets: Array.isArray(draft?.pendingTerminalSnippets) ? draft.pendingTerminalSnippets : []
            }]));
          }
        } catch {
          bridgeOk = false;
        }
      }
      const cached = getChatSessionsCache();
      const cacheMatchesWorkspace = cached && chatSessionsCacheMatchesWorkspace(cached.workspacePath, workspace, cached.sessions);
      const explicitEmptyId = cacheMatchesWorkspace ? cached.explicitEmptySessionId : null;
      if (cacheMatchesWorkspace && cached.sessions.length) {
        list2 = mergeSessionsPreferLongerHistory(cached.sessions, list2, sendingSessionsRef.current);
        activeByWorkspace = {
          ...activeByWorkspace,
          ...cached.activeByWorkspace
        };
        activeByWorkspaceRef.current = activeByWorkspace;
        if (cached.composerDrafts && typeof cached.composerDrafts === "object") {
          composerDraftsRef.current = {
            ...composerDraftsRef.current,
            ...Object.fromEntries(Object.entries(cached.composerDrafts).map(([id, draft]) => [id, {
              input: typeof draft?.input === "string" ? draft.input : "",
              pendingImages: Array.isArray(draft?.pendingImages) ? draft.pendingImages : [],
              pendingTerminalSnippets: Array.isArray(draft?.pendingTerminalSnippets) ? draft.pendingTerminalSnippets : []
            }]))
          };
        }
      }
      const createEmptySession = () => ({
        id: `s${Date.now()}`,
        title: "新对话",
        modelId: migratedGlobal,
        history: [],
        workspacePath: workspaceSessionKey(workspace) || null
      });
      const beforeResolveLen = list2.length;
      const resolved = resolveWorkspaceChatSessions(list2, workspace, activeByWorkspaceRef.current, createEmptySession, {
        resume: true,
        explicitEmptySessionId: explicitEmptyId,
        cachedActiveId: cacheMatchesWorkspace ? cached.activeId : null
      });
      list2 = resolved.sessions;
      aid = resolved.activeId;
      activeByWorkspace = resolved.activeByWorkspace;
      activeByWorkspaceRef.current = activeByWorkspace;
      if (bridgeOk && typeof api.orchestrationGetChainRunStatus === "function") {
        try {
          const chainSt = await api.orchestrationGetChainRunStatus();
          const pinned = chainSt?.pinnedSessionId?.trim();
          if (pinned && list2.some((s) => s.id === pinned)) {
            const pinnedSess = list2.find((s) => s.id === pinned);
            const cachedActive = cacheMatchesWorkspace && cached.activeId ? cached.activeId : null;
            const cachedSess = cachedActive ? list2.find((s) => s.id === cachedActive) : void 0;
            if (cachedSess && cachedSess.history.length > 0) {
              aid = cachedActive;
            } else if (pinnedSess && pinnedSess.history.length > 0) {
              aid = pinned;
            } else if (cachedActive && list2.some((s) => s.id === cachedActive)) {
              aid = cachedActive;
            } else if ((pinnedSess?.history.length ?? 0) === 0) {
              const withHist = sortSessionsByLatest(filterSessionsForWorkspaceTabs(list2, workspace).filter((s) => s.history.length > 0));
              if (withHist[0]) aid = withHist[0].id;
              else aid = pinned;
            } else {
              aid = pinned;
            }
            const wsKey = workspaceSessionKey(workspace);
            activeByWorkspace = {
              ...activeByWorkspace,
              [wsKey]: aid
            };
            activeByWorkspaceRef.current = activeByWorkspace;
          }
        } catch {
        }
      }
      if (cached?.explicitEmptySessionId === aid) {
        markExplicitEmptyChatSession(aid);
      } else {
        clearExplicitEmptyChatSession();
        syncExplicitEmptyInCache(null);
      }
      let sessionsNeedSave = beforeResolveLen !== list2.length || diskSessionsBackfilled;
      list2 = list2.map((s) => {
        if (isAutoModelSelection(migratedGlobal)) {
          if (s.modelId !== AUTO_MODEL_ID) sessionsNeedSave = true;
          return {
            ...s,
            modelId: AUTO_MODEL_ID
          };
        }
        const nextId = pickOrchestratorModel(s.modelId, sessionPool, mode);
        if (nextId !== s.modelId) sessionsNeedSave = true;
        return {
          ...s,
          modelId: nextId
        };
      });
      if (bridgeOk && sessionsNeedSave) {
        try {
          await api.saveChatSessions({
            activeId: aid,
            activeByWorkspace: activeByWorkspaceRef.current,
            sessions: list2
          });
        } catch {
        }
      }
      setSessions(list2);
      switchActiveSession(aid);
      sessionsRef.current = list2;
      const active = list2.find((s) => s.id === aid) ?? list2[0];
      setChatSessionsCache({
        sessions: list2,
        activeId: aid,
        activeByWorkspace: activeByWorkspaceRef.current,
        workspacePath: workspacePathRef.current,
        composerDrafts: composerDraftsRef.current,
        explicitEmptySessionId: getChatSessionsCache()?.explicitEmptySessionId === aid ? aid : null
      });
      syncMessagesFromSession(active);
      sessionsHydratedRef.current = true;
    })();
  }, [hasDesktopApi]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    return () => {
      if (!sessionsHydratedRef.current) return;
      const list2 = sessionsRef.current;
      const cacheHasHistory = getChatSessionsCache()?.sessions?.some((s) => (s.history?.length ?? 0) > 0);
      list2.some((s) => s.history.length > 0);
      if (!list2.length && !cacheHasHistory) return;
      const cached = getChatSessionsCache();
      setChatSessionsCache({
        sessions: sessionsRef.current,
        activeId: activeIdRef.current,
        activeByWorkspace: activeByWorkspaceRef.current,
        workspacePath: workspacePathRef.current,
        composerDrafts: composerDraftsRef.current,
        explicitEmptySessionId: cached?.explicitEmptySessionId ?? null
      });
      void persist(sessionsRef.current, activeIdRef.current);
    };
  }, [hasDesktopApi, persist]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api) return;
    const sync = () => {
      void api.getChatSettings().then((s) => setOrchMode(s.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code"));
      void loadChatModelPools(api).then((pools) => {
        setOrchestratorModels(pools.cloudModels);
        setLocalOllamaTags(pools.localModels);
      });
    };
    window.addEventListener("focus", sync);
    const offSettings = api.onChatSettingsChanged?.(() => sync());
    return () => {
      window.removeEventListener("focus", sync);
      offSettings?.();
    };
  }, [hasDesktopApi]);
  reactExports.useEffect(() => {
    if (!localOllamaTags.length) return;
    setImageModel((prev) => prev && localOllamaTags.includes(prev) ? prev : localOllamaTags[0]);
    setVideoModel((prev) => prev && localOllamaTags.includes(prev) ? prev : localOllamaTags[0]);
  }, [localOllamaTags]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    void reloadAgentDisplayMap();
  }, [hasDesktopApi, reloadAgentDisplayMap]);
  reactExports.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 240;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [input, pendingImages.length, pendingTerminalSnippets.length]);
  reactExports.useEffect(() => {
    const onClick = (e) => {
      if (!popRef.current?.contains(e.target)) {
        setSpeedOpen(false);
        setLengthOpen(false);
        setRatioOpen(false);
        setMoreOpen(false);
        setStyleOpen(false);
        setTplOpen(false);
        setImgModelOpen(false);
        setVidModelOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const visibleSessions = reactExports.useMemo(() => filterSessionsForWorkspaceTabs(sessions, workspacePath), [sessions, workspacePath]);
  const activeSession = visibleSessions.find((s) => s.id === activeId) ?? sessions.find((s) => s.id === activeId);
  const projectHistoryItems = reactExports.useMemo(() => visibleSessions.filter((s) => s.history.length > 0).map((s) => toChatHistoryListItem(s)), [visibleSessions]);
  const allHistoryItems = reactExports.useMemo(() => sortSessionsByLatest(sessions.filter((s) => s.history.length > 0)).map((s) => toChatHistoryListItem(s)), [sessions]);
  activeSession?.modelId?.trim() || globalModel || "未选模型";
  const primaryModelFallback = AUTO_MODEL_ID;
  const handleAgentChange = async (basename2) => {
    const api = getDesktop();
    if (!api) return;
    const nextBasename = basename2.trim();
    setLocalAgentBasename(nextBasename);
    const s = await api.getChatSettings();
    await api.saveChatSettings({
      ...fullChatSettingsPayload(s),
      localAgentBasename: nextBasename
    });
  };
  const handleModelPick = async (pick) => {
    const api = getDesktop();
    if (!api) return;
    const nextModel = isAutoModelSelection(pick.model) ? AUTO_MODEL_ID : pick.model;
    const nextMode = isAutoModelSelection(pick.model) ? "claude-code" : pick.mode;
    if (nextMode !== orchMode) {
      setOrchMode(nextMode);
      const s2 = await api.getChatSettings();
      await api.saveChatSettings({
        ...fullChatSettingsPayload(s2),
        orchestrationMode: nextMode
      });
    }
    if (nextMode === "claude-code" && nextModel && !isAutoModelSelection(nextModel) && api.ccSwitchListProviders && api.ccSwitchSetCurrentProvider) {
      try {
        const listed = await api.ccSwitchListProviders();
        const matches = (listed.providers || []).filter((p) => p.models?.includes(nextModel));
        const provider = matches.find((p) => p.isCurrent) || matches[0];
        if (provider) {
          await api.ccSwitchSetCurrentProvider({
            providerId: provider.id,
            model: nextModel,
            syncWorkbench: false
          });
        }
      } catch {
      }
    }
    const next = sessions.map((s2) => s2.id === activeId ? {
      ...s2,
      modelId: nextModel
    } : s2);
    setSessions(next);
    setGlobalModel(nextModel);
    const s = await api.getChatSettings();
    await api.saveChatSettings({
      ...fullChatSettingsPayload(s),
      model: nextModel
    });
    await persist(next, activeId);
    const sess = next.find((s2) => s2.id === activeId);
    syncMessagesFromSession(sess);
  };
  const syncMessagesFromSession = reactExports.useCallback((sess) => {
    if (!sess) {
      setMessages([]);
      return;
    }
    let source = sess;
    const live = sessionsRef.current.find((s) => s.id === sess.id);
    if (live) {
      if (live.history.length > sess.history.length || countUserMessages(live.history) > countUserMessages(sess.history) || Boolean(sendingSessionsRef.current[sess.id])) {
        source = {
          ...live,
          title: sess.title || live.title,
          modelId: sess.modelId || live.modelId
        };
      }
    }
    if (source.id === activeIdRef.current) {
      const uiUsers = messagesRef.current.filter((m) => m.role === "user").length;
      const sourceUsers = countUserMessages(source.history);
      if (uiUsers > sourceUsers) {
        const liveAgain = sessionsRef.current.find((s) => s.id === source.id);
        if (liveAgain && countUserMessages(liveAgain.history) >= uiUsers) {
          source = liveAgain;
        } else if (!sendingSessionsRef.current[source.id] && !chainRunningRef.current) {
          return;
        }
      }
    }
    const ml = source.modelId?.trim() || globalModel || "模型";
    let msgs = diskToDisplay(source.history, ml);
    if (!msgs.length && !sendingSessionsRef.current[source.id]) {
      msgs = [{
        role: "assistant",
        content: EMPTY_SESSION_WELCOME
      }];
    }
    if (sendingSessionsRef.current[source.id]) {
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== "assistant") {
        msgs = [...msgs, {
          role: "assistant",
          name: ml,
          content: "__WAITING__"
        }];
      } else if (last.content === "__WAITING__") ;
    }
    setMessages(msgs);
  }, [globalModel]);
  reactExports.useLayoutEffect(() => {
    if (sessionsHydratedRef.current) return;
    const cached = getChatSessionsCache();
    if (!cached?.sessions?.length) return;
    const list2 = cached.sessions;
    sessionsRef.current = list2;
    activeIdRef.current = cached.activeId;
    setSessions(list2);
    setActiveId(cached.activeId);
    if (cached.workspacePath) {
      workspacePathRef.current = cached.workspacePath;
      setWorkspacePath(cached.workspacePath);
    }
    if (cached.activeByWorkspace) {
      activeByWorkspaceRef.current = {
        ...cached.activeByWorkspace
      };
    }
    const sess = list2.find((s) => s.id === cached.activeId);
    if (sess?.history?.length) {
      const ml = sess.modelId?.trim() || globalModel || "模型";
      setMessages(diskToDisplay(sess.history, ml));
    }
  }, [globalModel]);
  const refreshSessionsFromDisk = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    try {
      const disk = await api.loadChatSessions();
      let merged = [];
      setSessions((prev) => {
        merged = mergeSessionsPreferLongerHistory(prev, disk.sessions, sendingSessionsRef.current);
        merged = backfillSessionWorkspaceFromActiveMap(merged, {
          ...disk.activeByWorkspace,
          ...activeByWorkspaceRef.current
        });
        merged = pruneDuplicateEmptySessions(merged, workspacePathRef.current, activeIdRef.current);
        sessionsRef.current = merged;
        return merged;
      });
      if (disk.activeByWorkspace) {
        activeByWorkspaceRef.current = {
          ...disk.activeByWorkspace,
          ...activeByWorkspaceRef.current
        };
      }
      const cached = getChatSessionsCache();
      setChatSessionsCache({
        sessions: merged,
        activeId: activeIdRef.current,
        activeByWorkspace: activeByWorkspaceRef.current,
        workspacePath: workspacePathRef.current,
        composerDrafts: composerDraftsRef.current,
        explicitEmptySessionId: cached?.explicitEmptySessionId ?? null
      });
      const viewId = activeIdRef.current;
      if (sendingSessionsRef.current[viewId]) return;
      const sess = merged.find((s) => s.id === viewId) ?? merged.find((s) => s.history.length > 0 && sessionMatchesWorkspaceTab(s, workspacePathRef.current));
      if (sess) syncMessagesFromSession(sess);
    } catch {
    }
  }, [syncMessagesFromSession]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api) return;
    void syncExecutionState();
    void api.loadChatSessions().then((disk) => {
      let merged = [];
      setSessions((prev) => {
        merged = mergeSessionsPreferLongerHistory(prev, disk.sessions, sendingSessionsRef.current);
        merged = backfillSessionWorkspaceFromActiveMap(merged, {
          ...disk.activeByWorkspace,
          ...activeByWorkspaceRef.current
        });
        merged = pruneDuplicateEmptySessions(merged, workspacePathRef.current, activeIdRef.current);
        sessionsRef.current = merged;
        return merged;
      });
      if (disk.activeByWorkspace) {
        activeByWorkspaceRef.current = {
          ...disk.activeByWorkspace,
          ...activeByWorkspaceRef.current
        };
      }
      const viewId = activeIdRef.current;
      if (sendingSessionsRef.current[viewId]) return;
      if (!chainRunning && Object.keys(sendingSessionsRef.current).length > 0) return;
      const live = sessionsRef.current.find((s) => s.id === viewId);
      const fromMerged = merged.find((s) => s.id === viewId) ?? disk.sessions.find((s) => s.id === viewId);
      const sess = live && fromMerged && live.history.length >= fromMerged.history.length ? live : fromMerged;
      syncMessagesFromSession(sess);
    });
  }, [sessionRevision, chainRunning, hasDesktopApi, syncExecutionState, syncMessagesFromSession]);
  const handleHistoryOpen = reactExports.useCallback(() => {
    void refreshSessionsFromDisk();
  }, [refreshSessionsFromDisk]);
  const saveComposerDraft = reactExports.useCallback((sessionId) => {
    composerDraftsRef.current[sessionId] = {
      input,
      pendingImages,
      pendingTerminalSnippets
    };
    scheduleComposerDraftsSave();
  }, [input, pendingImages, pendingTerminalSnippets, scheduleComposerDraftsSave]);
  const loadComposerDraft = reactExports.useCallback((sessionId) => {
    const draft = composerDraftsRef.current[sessionId];
    setInput(draft?.input ?? "");
    setPendingImages(draft?.pendingImages ?? []);
    setPendingTerminalSnippets(draft?.pendingTerminalSnippets ?? []);
  }, []);
  const cancelEditUserMessage = reactExports.useCallback(() => {
    if (editHistoryIndexRef.current == null) return;
    setEditHistoryIndex(null);
    editHistoryIndexRef.current = null;
    setEditComposer(null);
    const sess = sessionsRef.current.find((s) => s.id === activeIdRef.current);
    syncMessagesFromSession(sess);
    loadComposerDraft(activeIdRef.current);
  }, [loadComposerDraft, syncMessagesFromSession]);
  const beginEditUserMessageImpl = reactExports.useCallback((historyIndex) => {
    const sessionId = activeIdRef.current;
    const sess = sessionsRef.current.find((s) => s.id === sessionId);
    const msg = sess?.history[historyIndex];
    if (!msg || msg.role !== "user") return;
    saveComposerDraft(sessionId);
    const restored = restoreUserMsgToComposer(msg);
    setEditComposer({
      input: restored.input,
      pendingImages: restored.attachments,
      pendingTerminalSnippets: restored.terminalSnippets
    });
    setEditHistoryIndex(historyIndex);
    editHistoryIndexRef.current = historyIndex;
    loadComposerDraft(sessionId);
    const ml = sess.modelId?.trim() || globalModel || "模型";
    setMessages(diskToDisplay(sess.history.slice(0, historyIndex), ml));
    requestAnimationFrame(() => inlineTaRef.current?.focus());
  }, [globalModel, saveComposerDraft, loadComposerDraft]);
  const composerPlaceholder = COMPOSER_PLACEHOLDER;
  const handleInlineComposerPaste = reactExports.useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      const f = it.getAsFile();
      if (!f?.type.startsWith("image/")) continue;
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setEditComposer((prev) => prev ? {
          ...prev,
          pendingImages: [...prev.pendingImages, {
            id: newLocalId(),
            kind: "image",
            name: f.name || "粘贴图片.png",
            mime: f.type,
            dataUrl
          }]
        } : prev);
      };
      reader.readAsDataURL(f);
    }
  }, []);
  const handleComposerPaste = reactExports.useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      const f = it.getAsFile();
      if (!f?.type.startsWith("image/")) continue;
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setPendingImages((p) => [...p, {
          id: newLocalId(),
          kind: "image",
          name: f.name || "粘贴图片.png",
          mime: f.type,
          dataUrl
        }]);
      };
      reader.readAsDataURL(f);
    }
  }, []);
  const handleSessionChange = async (id) => {
    if (id === activeIdRef.current) return;
    resetScrollFollow();
    saveComposerDraft(activeIdRef.current);
    setEditHistoryIndex(null);
    editHistoryIndexRef.current = null;
    setEditComposer(null);
    const api = getDesktop();
    const s = sessionsRef.current.find((x) => x.id === id);
    if (s && s.history.length > 0) clearExplicitEmptyChatSession();
    switchActiveSession(id);
    loadComposerDraft(id);
    syncMessagesFromSession(s);
    if (api) await persist(sessionsRef.current, id);
    setChatSessionsCache({
      sessions: sessionsRef.current,
      activeId: id,
      activeByWorkspace: activeByWorkspaceRef.current,
      workspacePath: workspacePathRef.current,
      composerDrafts: composerDraftsRef.current,
      explicitEmptySessionId: getChatSessionsCache()?.explicitEmptySessionId ?? null
    });
  };
  const activateHistorySession = reactExports.useCallback(async (sessionId) => {
    let sess = sessionsRef.current.find((s) => s.id === sessionId);
    if (!sess) return;
    resetScrollFollow();
    saveComposerDraft(activeIdRef.current);
    setEditHistoryIndex(null);
    editHistoryIndexRef.current = null;
    setEditComposer(null);
    const targetWs = sess.workspacePath ?? null;
    let sameWorkspace = sessionMatchesWorkspaceTab(sess, workspacePathRef.current);
    const api = getDesktop();
    if (!sameWorkspace && api && !targetWs) {
      const ws = workspaceSessionKey(workspacePathRef.current);
      if (!ws) {
        toast.warning("该对话未关联工作区，请先打开对应项目。");
        return;
      }
      const stamped = stampSessionWorkspaceIfMissing(sess, ws);
      let next = sessionsRef.current.map((s) => s.id === sessionId ? stamped : s);
      next = pruneDuplicateEmptySessions(next, ws, sessionId);
      sessionsRef.current = next;
      setSessions(next);
      sess = stamped;
      sameWorkspace = true;
    }
    if (!sameWorkspace && api && targetWs) {
      pendingHistorySessionRef.current = sessionId;
      try {
        await api.chooseWorkspace(targetWs);
      } catch (e) {
        pendingHistorySessionRef.current = null;
        toast.error(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (sess.history.length > 0) clearExplicitEmptyChatSession();
    switchActiveSession(sessionId);
    loadComposerDraft(sessionId);
    syncMessagesFromSession(sess);
    if (api) await persist(sessionsRef.current, sessionId);
  }, [resetScrollFollow, saveComposerDraft, loadComposerDraft, syncMessagesFromSession, persist]);
  const handleNewSession = async () => {
    if (newSessionInFlightRef.current) return;
    newSessionInFlightRef.current = true;
    try {
      resetScrollFollow();
      saveComposerDraft(activeIdRef.current);
      setEditHistoryIndex(null);
      editHistoryIndexRef.current = null;
      setEditComposer(null);
      const api = getDesktop();
      if (!api) return;
      const ws = workspacePathRef.current;
      const settings = await api.getChatSettings();
      const mode = settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
      const id = `s${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const ns = {
        id,
        title: "新对话",
        modelId: pickOrchestratorModel(settings.model, [...orchestratorModels, ...localOllamaTags], mode),
        history: [],
        workspacePath: workspaceSessionKey(ws) || null
      };
      let next = [];
      setSessions((prev) => {
        next = pruneDuplicateEmptySessions([...prev, ns], ws, id);
        sessionsRef.current = next;
        return next;
      });
      switchActiveSession(id);
      markExplicitEmptyChatSession(id);
      setInput("");
      setPendingImages([]);
      setPendingTerminalSnippets([]);
      setMessages([{
        role: "assistant",
        content: EMPTY_SESSION_WELCOME
      }]);
      await persist(next, id);
    } finally {
      newSessionInFlightRef.current = false;
    }
  };
  reactExports.useEffect(() => {
    if (!urlSessionId || !hasDesktopApi || sessions.length === 0) return;
    if (urlSessionHandledRef.current === urlSessionId) return;
    if (!sessions.some((s) => s.id === urlSessionId)) return;
    urlSessionHandledRef.current = urlSessionId;
    void activateHistorySession(urlSessionId).finally(() => {
      navigate({
        to: "/",
        search: EMPTY_CHAT_SEARCH,
        replace: true
      });
    });
  }, [urlSessionId, sessions, hasDesktopApi, activateHistorySession, navigate]);
  reactExports.useEffect(() => {
    if (!urlNewSession || !hasDesktopApi || sessions.length === 0) return;
    if (urlNewHandledRef.current) return;
    urlNewHandledRef.current = true;
    void handleNewSession().finally(() => {
      navigate({
        to: "/",
        search: EMPTY_CHAT_SEARCH,
        replace: true
      });
    });
  }, [urlNewSession, hasDesktopApi, sessions.length, navigate]);
  reactExports.useEffect(() => {
    if (!urlClaudeResume || !hasDesktopApi || sessions.length === 0) return;
    if (urlClaudeResumeHandledRef.current === urlClaudeResume) return;
    urlClaudeResumeHandledRef.current = urlClaudeResume;
    const existing = sessions.find((s) => s.claudeSessionId === urlClaudeResume);
    if (existing) {
      void activateHistorySession(existing.id).finally(() => {
        navigate({
          to: "/",
          search: EMPTY_CHAT_SEARCH,
          replace: true
        });
      });
      return;
    }
    void (async () => {
      const api = getDesktop();
      if (!api) return;
      const id = `s${Date.now()}`;
      const ws = workspacePathRef.current;
      const settings = await api.getChatSettings();
      const ns = {
        id,
        title: "Claude 会话",
        modelId: settings.model || globalModel || AUTO_MODEL_ID,
        history: [],
        workspacePath: workspaceSessionKey(ws) || null,
        claudeSessionId: urlClaudeResume
      };
      let next = [];
      setSessions((prev) => {
        next = [...prev, ns];
        sessionsRef.current = next;
        return next;
      });
      switchActiveSession(id);
      setMessages([{
        role: "assistant",
        content: "已绑定 Claude CLI 会话，继续对话将使用 --resume。"
      }]);
      await persist(next, id);
      navigate({
        to: "/",
        search: EMPTY_CHAT_SEARCH,
        replace: true
      });
    })();
  }, [urlClaudeResume, sessions, hasDesktopApi, activateHistorySession, globalModel, navigate, persist, switchActiveSession]);
  const handleCloseSession = async (id) => {
    const visible = filterSessionsForWorkspaceTabs(sessionsRef.current, workspacePathRef.current);
    if (visible.length <= 1) return;
    resetScrollFollow();
    const reqId = activeRequestIdsRef.current.get(id);
    const api = getDesktop();
    if (reqId && api?.claudeCodeAbort) void api.claudeCodeAbort(reqId);
    if (reqId && api?.localOrchestrationAbort) void api.localOrchestrationAbort(reqId);
    activeRequestIdsRef.current.delete(id);
    setSessionSending(id, false);
    delete composerDraftsRef.current[id];
    const next = sessionsRef.current.filter((s) => s.id !== id);
    const visibleAfter = filterSessionsForWorkspaceTabs(next, workspacePathRef.current);
    const aid = id === activeIdRef.current ? sortSessionsByLatest(visibleAfter)[0]?.id ?? visibleAfter[0]?.id ?? "" : activeIdRef.current;
    const pruned = pruneDuplicateEmptySessions(next, workspacePathRef.current, aid || activeIdRef.current);
    if (id === activeIdRef.current && aid) {
      switchActiveSession(aid);
      loadComposerDraft(aid);
      syncMessagesFromSession(pruned.find((s) => s.id === aid));
    }
    setSessions(pruned);
    sessionsRef.current = pruned;
    if (api) await persist(pruned, aid || activeIdRef.current);
  };
  const stopChat = reactExports.useCallback(() => {
    setStopRequested(true);
    if (chainRunning) {
      stopChainExecution();
    }
    const id = activeRequestIdsRef.current.get(activeId);
    const api = getDesktop();
    if (id && api?.claudeCodeAbort) void api.claudeCodeAbort(id);
    if (id && api?.localOrchestrationAbort) void api.localOrchestrationAbort(id);
  }, [activeId, chainRunning, stopChainExecution]);
  const runPmDelegationRuntime = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.multiAgentExecuteDelegation) {
      toast.error("请完全退出并重启桌面应用以加载 Multi-Agent Runtime（委派执行）。");
      return;
    }
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return;
    const settings = await api.getChatSettings();
    const resolved = resolveModelForExecution({
      selectedModel: sess.modelId || settings.model,
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
      preferredMode: orchMode
    });
    if (!resolved) {
      toast.error("请先在「模型与连接」添加云或本地模型。");
      return;
    }
    const {
      mode,
      modelId
    } = resolved;
    const hist = [...sess.history ?? []];
    const lastAssistant = [...hist].reverse().find((m) => m.role === "assistant" && m.content && m.content !== "__WAITING__" && !m.requestError);
    if (!lastAssistant?.content?.trim()) {
      toast.error("未找到可用的上一条助手消息（须含 delegation-v1 或 delegate_to / steps 的 JSON）。");
      return;
    }
    if (!confirm("将从最近一条助手气泡解析 delegation-v1，按顺序真实调用各子 Agent（独立 CLI / MCP 进程）。可能较久，是否继续？")) {
      return;
    }
    setSessionSending(activeId, true);
    try {
      const r = await api.multiAgentExecuteDelegation({
        rawText: lastAssistant.content,
        orchestratorModel: modelId
      });
      let nextHist = [...hist];
      nextHist.push({
        role: "user",
        content: "【Multi-Agent Runtime】/delegation-run — 解析上一条助手气泡中的 delegation-v1 并顺序执行子 Agent",
        ts: Date.now()
      });
      if (!r.ok) {
        nextHist.push({
          role: "assistant",
          content: `【Multi-Agent Runtime】失败：${r.error || "未知错误"}`,
          ts: Date.now(),
          requestError: true
        });
      } else {
        let block = "【Multi-Agent Runtime · delegation-v1】\n\n";
        for (const step of r.stepResults ?? []) {
          if (step.ok) {
            const raw = String(step.output ?? "").trim();
            if (raw) {
              maybeToastMissingWorkspaceWrite(raw);
              const chainIngest = await ingestChainStepWorkspaceWrites(api, raw, {
                agentName: step.agentName,
                taskId: step.taskId
              }, toastIngestWorkspaceHint);
              const collapsed = stripLargeAssistantArtifacts(chainIngest.displayText);
              block += `### ${step.agentName}（${step.taskId}）
${collapsed}

`;
            } else {
              block += `### ${step.agentName}（${step.taskId}）
（本步无正文输出）

`;
            }
          } else {
            block += `### ${step.agentName}（${step.taskId}）
失败：${step.error ?? ""}

`;
          }
        }
        if (r.synthesis?.output) {
          const synRaw = String(r.synthesis.output).trim();
          if (synRaw) {
            maybeToastMissingWorkspaceWrite(synRaw);
            const synIngest = await ingestChainStepWorkspaceWrites(api, synRaw, {
              agentName: r.synthesis.agentName,
              taskId: "synthesis"
            }, toastIngestWorkspaceHint);
            const synCollapsed = stripLargeAssistantArtifacts(synIngest.displayText);
            block += `### 汇总（${r.synthesis.agentName}）
${synCollapsed}
`;
          }
        }
        nextHist.push({
          role: "assistant",
          content: stripLargeAssistantArtifacts(block.trim()),
          ts: Date.now()
        });
        toast.success("委派 Runtime 已跑完（见最新消息）。");
      }
      const nextSessions = sessions.map((s) => s.id === activeId ? {
        ...s,
        history: nextHist
      } : s);
      setSessions(nextSessions);
      setMessages(diskToDisplay(nextHist, modelId));
      await persist(nextSessions, activeId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSessionSending(activeId, false);
    }
  }, [activeId, persist, sessions, localOllamaTags, orchestratorModels]);
  const sendChat = async () => {
    const override = sendPayloadOverrideRef.current;
    if (override) sendPayloadOverrideRef.current = null;
    const editDraft = editComposerRef.current;
    const editingFromInline = !override && editHistoryIndexRef.current != null && editDraft != null;
    const text2 = (override?.text ?? (editingFromInline ? editDraft.input : input)).trim();
    const activePendingImages = override?.pendingImages ?? (editingFromInline ? editDraft.pendingImages : pendingImages);
    const activePendingTerminal = override?.pendingTerminalSnippets ?? (editingFromInline ? editDraft.pendingTerminalSnippets : pendingTerminalSnippets);
    const presetEditCutoff = override?.editCutoff;
    const hasTerminal = activePendingTerminal.length > 0;
    const sendSessionId = activeIdRef.current;
    if (!text2 && !activePendingImages.length && !hasTerminal || sendingSessionsRef.current[sendSessionId]) return;
    const wsKeySend = workspaceSessionKey(workspacePathRef.current);
    if (wsKeySend) {
      activeByWorkspaceRef.current = {
        ...activeByWorkspaceRef.current,
        [wsKeySend]: sendSessionId
      };
    }
    setChatSessionsCache({
      sessions: sessionsRef.current,
      activeId: sendSessionId,
      activeByWorkspace: activeByWorkspaceRef.current,
      workspacePath: workspacePathRef.current,
      composerDrafts: composerDraftsRef.current,
      explicitEmptySessionId: getChatSessionsCache()?.explicitEmptySessionId ?? null
    });
    const api = getDesktop();
    if (!api) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: BROWSER_MODE_CHAT_MESSAGE
      }]);
      return;
    }
    const sess = sessionsRef.current.find((s) => s.id === sendSessionId);
    if (!sess) return;
    if (text2 === "/delegation-run") {
      setInput("");
      await runPmDelegationRuntime();
      return;
    }
    const wbsIntent = parseWbsChainIntent(text2);
    if (wbsIntent.matched && activePendingImages.length === 0 && !hasTerminal) {
      setInput("");
      if (wbsIntent.action === "generate-wbs") {
        sendPayloadOverrideRef.current = {
          text: WBS_GENERATE_PM_PROMPT
        };
        await sendChat();
        return;
      }
      const syncResult = await runWorkflowFromWbs({
        quietPickToast: true,
        autoRun: wbsIntent.autoRun,
        recordUserLine: text2
      });
      if (syncResult && !syncResult.ok) {
        await appendLocalChatExchange(sendSessionId, text2, `未能生成任务链：${syncResult.error}`);
      }
      return;
    }
    if (text2 && activePendingImages.length === 0 && !hasTerminal && parseChainCommand(text2).matched) {
      setInput("");
      const route2 = resolveAgentForTurn(text2, localAgentBasename);
      let chainTitle = sess.title;
      if (sess.history.length === 0) {
        const t = text2.trim();
        chainTitle = t.length > 28 ? `${t.slice(0, 28)}…` : t;
      }
      const hist2 = [...sess.history, {
        role: "user",
        content: text2,
        ts: Date.now()
      }];
      const settings2 = await api.getChatSettings();
      const modelLabel = sess.modelId?.trim() || settings2.model || "模型";
      const nextSessions = sessionsRef.current.map((s) => s.id === sendSessionId ? {
        ...s,
        title: chainTitle,
        history: hist2
      } : s);
      setSessions(nextSessions);
      sessionsRef.current = nextSessions;
      setMessages(diskToDisplay(hist2, modelLabel));
      await persist(nextSessions, sendSessionId);
      clearExplicitEmptyChatSessionIf(sendSessionId);
      await pruneWorkspaceSessions(sendSessionId);
      const chainResult = await handleChainChatCommand(text2, route2.stem, (opts) => runOrchestrationChain({
        ...opts,
        pinnedSessionId: sendSessionId
      }));
      const histWithReply = [...hist2, {
        role: "assistant",
        content: chainResult.assistantText,
        ts: Date.now(),
        name: "系统"
      }];
      const finalSessions = sessionsRef.current.map((s) => s.id === sendSessionId ? {
        ...s,
        history: histWithReply,
        title: chainTitle
      } : s);
      setSessions(finalSessions);
      sessionsRef.current = finalSessions;
      setMessages(diskToDisplay(histWithReply, modelLabel));
      await persist(finalSessions, sendSessionId);
      return;
    }
    if (text2 && activePendingImages.length === 0 && !hasTerminal && isConfirmWriteOnlyMessage(text2)) {
      setInput("");
      await performConfirmWrite();
      return;
    }
    if (text2 && activePendingImages.length === 0 && !hasTerminal && isBulkWriteProjectMessage(text2)) {
      setInput("");
      await performBulkWriteProject(text2);
      return;
    }
    if (text2 && activePendingImages.length === 0 && !hasTerminal && isStopPreviewMessage(text2)) {
      setInput("");
      const api2 = getDesktop();
      if (api2) {
        const sess2 = sessions.find((s) => s.id === activeId);
        if (sess2) {
          const summary = await performStopPreview(api2);
          const hist2 = [...sess2.history, {
            role: "user",
            content: text2,
            ts: Date.now()
          }, {
            role: "assistant",
            content: summary,
            ts: Date.now()
          }];
          const settings2 = await api2.getChatSettings();
          const modelLabel = sess2.modelId?.trim() || settings2.model || "模型";
          const nextSessions = sessions.map((s) => s.id === activeId ? {
            ...s,
            history: hist2
          } : s);
          setSessions(nextSessions);
          setMessages(diskToDisplay(hist2, modelLabel));
          await persist(nextSessions, activeId);
        }
      }
      return;
    }
    if (text2 && activePendingImages.length === 0 && !hasTerminal && isOpenTerminalMessage(text2)) {
      setInput("");
      setTerminalOpen(true);
      const hist2 = [...sess.history, {
        role: "user",
        content: text2,
        ts: Date.now()
      }, {
        role: "assistant",
        content: "已在底部打开终端面板，工作目录为当前项目根。",
        ts: Date.now()
      }];
      const settings2 = await api.getChatSettings();
      const modelLabel = sess.modelId?.trim() || settings2.model || "模型";
      const nextSessions = sessions.map((s) => s.id === activeId ? {
        ...s,
        history: hist2
      } : s);
      setSessions(nextSessions);
      setMessages(diskToDisplay(hist2, modelLabel));
      await persist(nextSessions, activeId);
      return;
    }
    if (text2 && activePendingImages.length === 0 && !hasTerminal && isProjectPreviewMessage(text2)) {
      setInput("");
      await runProjectPreview(text2);
      return;
    }
    const settings = await api.getChatSettings();
    resetScrollFollow();
    const attachmentsToSave = activePendingImages.length > 0 ? activePendingImages.map(({
      id: _id,
      ...rest
    }) => rest) : void 0;
    const displayLine = buildComposerUserLine(text2 || (attachmentsToSave?.length ? "请结合附图回答。" : ""), activePendingTerminal);
    const route = resolveAgentForTurn(displayLine, localAgentBasename);
    const cmd = {
      matched: true,
      stem: route.stem,
      body: route.body
    };
    const turnAgent = stemAgentMeta(cmd.stem);
    let agentModel;
    let agentMarkdownMissing = false;
    if (api.readClaudeAgentMarkdown) {
      try {
        const agentDoc = await api.readClaudeAgentMarkdown(`${cmd.stem}.md`);
        if (agentDoc.ok && agentDoc.content?.trim()) {
          agentModel = parseAgentModelFromFrontmatter(agentDoc.content);
        } else {
          agentMarkdownMissing = true;
        }
      } catch {
        agentMarkdownMissing = true;
      }
    }
    const resolvedExec = resolveModelForExecution({
      selectedModel: sess.modelId || settings.model,
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
      agentModel,
      preferredMode: orchMode
    });
    if (!resolvedExec) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "请先在「设置 → 模型与连接」通过「添加云模型」或「配置本地模型」添加至少一个模型。",
        name: "系统"
      }]);
      return;
    }
    const mode = resolvedExec.mode;
    const modelId = resolvedExec.modelId;
    if (mode === "local-mcp") {
      if (!api.localOrchestrationPrompt) {
        setMessages((m) => [...m, {
          role: "assistant",
          content: "当前预加载脚本未暴露本地 MCP 编排接口，请完全退出并重启桌面应用。",
          name: "系统"
        }]);
        return;
      }
    } else if (!api.claudeCodePrompt) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "Claude Code 接口不可用，请重启应用后重试。",
        name: "系统"
      }]);
      return;
    }
    if (mode === "local-mcp" && agentMarkdownMissing) {
      toast.warning(`未找到 Agent 文件 ${cmd.stem}.md，将以通用编排身份回复。`, {
        duration: 6e3
      });
    }
    const baseForExpand = route.body;
    const {
      expanded: expandedBase,
      injectedPaths
    } = await expandUserLineWithWorkspaceFiles(api, baseForExpand, {
      settings,
      cmd,
      displayLine
    });
    if (injectedPaths.length > 0) {
      toast.info("已把文件内容并入本轮提示词（只读）", {
        description: `从工作区读取：${injectedPaths.join("，")}
未修改磁盘上的任何文件；与底部「确认写入」「按WBS开工」无关。`,
        duration: 6500
      });
    }
    const routedBase = buildAgentRoutedInstruction(cmd.stem, expandedBase, mode);
    await syncOfficialGenericChains();
    const chainListR = await api.orchestrationListChains?.();
    const chainCatalogSnippet = buildAgentChainCatalogMarkdown(cmd.stem, chainListR?.ok ? chainListR.items ?? [] : [], []);
    const localUserLineFinal = chainCatalogSnippet ? `${routedBase}

${chainCatalogSnippet}` : routedBase;
    const cloudUserLineFinal = buildSubagentUserLine(cmd.stem, localUserLineFinal);
    setStopRequested(false);
    setSessionSending(sendSessionId, true);
    if (editingFromInline) {
      setEditComposer(null);
    }
    const terminalSnippetsToSave = activePendingTerminal.map(({
      id: _id,
      ...rest
    }) => rest);
    const editCutoff = presetEditCutoff !== void 0 ? presetEditCutoff : editingFromInline ? editHistoryIndexRef.current : null;
    if (editCutoff != null) {
      setEditHistoryIndex(null);
      editHistoryIndexRef.current = null;
      setEditComposer(null);
    }
    const historyBefore = editCutoff != null ? sess.history.slice(0, editCutoff) : sess.history;
    delete composerDraftsRef.current[sendSessionId];
    const userMsg = {
      role: "user",
      content: displayLine,
      ts: Date.now(),
      ...attachmentsToSave ? {
        attachments: attachmentsToSave
      } : {},
      ...terminalSnippetsToSave.length ? {
        terminalSnippets: terminalSnippetsToSave
      } : {}
    };
    const priorForApi = historyBefore.map((m) => {
      if (m.role === "user") {
        const t = {
          role: "user",
          content: m.content
        };
        if (m.attachments?.length) t.attachments = m.attachments;
        return t;
      }
      return {
        role: "assistant",
        content: m.content
      };
    });
    let title = sess.title;
    if (historyBefore.length === 0) {
      const t = displayLine || "图片";
      title = t.length > 28 ? `${t.slice(0, 28)}…` : t;
    }
    let hist = [...historyBefore, userMsg];
    workspaceSessionKey(workspacePathRef.current) || null;
    await patchSession(sendSessionId, (s) => stampSessionWorkspaceIfMissing({
      ...s,
      title,
      history: hist
    }, workspacePathRef.current));
    clearExplicitEmptyChatSessionIf(sendSessionId);
    if (historyBefore.length === 0) {
      await pruneWorkspaceSessions(sendSessionId);
    }
    if (!editingFromInline) {
      setInput("");
      setPendingImages([]);
      setPendingTerminalSnippets([]);
    }
    if (sendSessionId === activeIdRef.current) {
      setMessages([...diskToDisplay(hist, modelId), {
        role: "assistant",
        name: assistantBubbleName(turnAgent, modelId),
        content: "__WAITING__"
      }]);
      queueMicrotask(() => resetScrollFollow());
    }
    const reqId = newLocalId();
    activeRequestIdsRef.current.set(sendSessionId, reqId);
    streamContextRef.current = {
      sessionId: sendSessionId,
      requestId: reqId
    };
    activeStreamRequestIdRef.current = reqId;
    setActiveStreamRequestId(reqId);
    try {
      const sendStarted = Date.now();
      let res;
      const basenameOverride = `${cmd.stem}.md`;
      await appendAgentExecEvent({
        agent: cmd.stem,
        mode,
        source: "chat_command",
        phase: "start",
        instruction: route.body || displayLine,
        modelId
      });
      if (mode === "local-mcp") {
        res = await api.localOrchestrationPrompt({
          priorMessages: priorTurnsToOrchestrationMessages(priorForApi),
          userLine: localUserLineFinal,
          userAttachments: attachmentsToSave,
          orchestratorModel: modelId,
          requestId: reqId,
          agentBasenameOverride: basenameOverride
        });
      } else {
        const workspaceDir = await api.getWorkspace();
        let savedImagePaths;
        if (attachmentsToSave?.length && api.saveChatImageAttachments) {
          const saved = await api.saveChatImageAttachments(attachmentsToSave);
          if (saved.ok && saved.paths?.length) savedImagePaths = saved.paths;
        }
        const prompt = await buildClaudeCodePrompt(api, {
          workspaceDir,
          priorHistory: priorForApi,
          userLine: cloudUserLineFinal,
          userAttachments: attachmentsToSave,
          savedImagePaths,
          localAgentBasename: basenameOverride,
          skipDefaultRoleBlock: true,
          chainCatalogSnippet,
          orchestration: {
            orchestratorModel: modelId,
            localOllamaModel: settings.localOllamaModel,
            ollamaBase: settings.ollamaBase
          }
        });
        res = await api.claudeCodePrompt({
          prompt,
          model: modelId,
          requestId: reqId,
          claudeSessionId: sess?.claudeSessionId ?? void 0,
          isNewClaudeSession: !sess?.claudeSessionId
        });
      }
      toastIfLocalOrchestrationHints(res);
      if (!res.ok) {
        const line = formatAssistantFailure(res);
        hist = [...hist, {
          role: "assistant",
          content: line,
          ts: Date.now(),
          requestError: true,
          billingSource: mode === "local-mcp" ? "local" : "cloud",
          modelId,
          ...turnAgent
        }];
      } else {
        const reply = res.content || "";
        maybeToastMissingWorkspaceWrite(reply);
        const agentStemForIngest = cmd.stem;
        const autoProjectWrite = Boolean(agentStemForIngest) && agentAutoWritesToProject(agentStemForIngest);
        const defaultConfirmWritePath = settings.defaultConfirmWritePath?.trim() || "docs/prd.md";
        const displayContent = stripLargeAssistantArtifacts(await ingestWorkspaceWritesAndCollapseDisplay(api, reply, toastIngestWorkspaceHint, {
          ...agentStemForIngest ? {
            agentStem: agentStemForIngest
          } : {},
          ...autoProjectWrite ? {
            autoWriteProject: true
          } : {},
          defaultConfirmWritePath
        })) || "（助手未返回可见正文）";
        const am = {
          role: "assistant",
          content: displayContent,
          ts: Date.now(),
          latencyMs: Math.max(0, Date.now() - sendStarted),
          billingSource: mode === "local-mcp" ? "local" : "cloud",
          modelId,
          ...res.usage ? {
            usage: res.usage
          } : {},
          ...turnAgent
        };
        hist = [...hist, am];
        void autoSaveChainFromReply(api, reply).then((r) => {
          if (r.saved) {
            notifyAutoSavedChain({
              stepCount: r.stepCount,
              chainName: r.chainName,
              wbsPath: r.wbsPath
            }, () => navigate({
              to: "/chains",
              search: {
                q: "WBS"
              }
            }));
          }
        });
      }
      await patchSession(sendSessionId, (s) => ({
        ...s,
        history: hist,
        title,
        ...res.claudeSessionId ? {
          claudeSessionId: res.claudeSessionId
        } : {}
      }));
      if (sendSessionId === activeIdRef.current) {
        setMessages(diskToDisplay(hist, modelId));
      }
    } catch (e) {
      const errLine = e instanceof Error ? e.message : String(e);
      hist = [...hist, {
        role: "assistant",
        content: `请求异常：${errLine}`,
        ts: Date.now(),
        requestError: true,
        billingSource: mode === "local-mcp" ? "local" : "cloud",
        modelId,
        ...turnAgent
      }];
      await patchSession(sendSessionId, (s) => ({
        ...s,
        history: hist,
        title
      }));
      if (sendSessionId === activeIdRef.current) {
        setMessages(diskToDisplay(hist, modelId));
      }
      toast.error(errLine);
    } finally {
      await appendAgentExecEvent({
        agent: cmd.stem,
        mode,
        source: "chat_command",
        phase: "end",
        instruction: route.body || displayLine,
        modelId
      });
      activeRequestIdsRef.current.delete(sendSessionId);
      if (streamContextRef.current?.sessionId === sendSessionId) {
        streamContextRef.current = null;
      }
      activeStreamRequestIdRef.current = null;
      setActiveStreamRequestId(null);
      setSessionSending(sendSessionId, false);
      await pruneWorkspaceSessions(activeIdRef.current);
    }
  };
  const resendUserMessageImpl = reactExports.useCallback(async (historyIndex) => {
    const sessionId = activeIdRef.current;
    const sess = sessionsRef.current.find((s) => s.id === sessionId);
    const msg = sess?.history[historyIndex];
    if (!msg || msg.role !== "user") return;
    const restored = restoreUserMsgToComposer(msg);
    const ml = sess.modelId?.trim() || globalModel || "模型";
    setEditHistoryIndex(null);
    setMessages(diskToDisplay(sess.history.slice(0, historyIndex), ml));
    sendPayloadOverrideRef.current = {
      text: restored.input,
      pendingImages: restored.attachments,
      pendingTerminalSnippets: restored.terminalSnippets,
      editCutoff: historyIndex
    };
    resetScrollFollow();
    await sendChat();
  }, [globalModel, resetScrollFollow]);
  const runCheckpointAction = reactExports.useCallback((historyIndex, action) => {
    if (action === "edit") beginEditUserMessageImpl(historyIndex);
    else void resendUserMessageImpl(historyIndex);
  }, [beginEditUserMessageImpl, resendUserMessageImpl]);
  const requestCheckpointAction = reactExports.useCallback((historyIndex, action) => {
    const sessionId = activeIdRef.current;
    if (sendingSessionsRef.current[sessionId]) {
      toast.warning(action === "edit" ? "请等待当前回复完成后再编辑历史消息。" : "请等待当前回复完成后再重新提问。");
      return;
    }
    const sess = sessionsRef.current.find((s) => s.id === sessionId);
    if (!needsCheckpointConfirm(sess, historyIndex) || shouldSkipCheckpointConfirm()) {
      runCheckpointAction(historyIndex, action);
      return;
    }
    setCheckpointConfirm({
      historyIndex,
      action
    });
  }, [runCheckpointAction]);
  const beginEditUserMessage = reactExports.useCallback((historyIndex) => requestCheckpointAction(historyIndex, "edit"), [requestCheckpointAction]);
  const requestResendUserMessage = reactExports.useCallback((historyIndex) => requestCheckpointAction(historyIndex, "resend"), [requestCheckpointAction]);
  reactExports.useEffect(() => {
    if (!hasDesktopApi) return;
    const api = getDesktop();
    if (!api?.onWorkspaceChanged) return;
    const off = api.onWorkspaceChanged((detail) => {
      void (async () => {
        const nextWs = detail.workspace ?? null;
        const prevKey = workspaceSessionKey(workspacePathRef.current);
        if (prevKey) {
          activeByWorkspaceRef.current = {
            ...activeByWorkspaceRef.current,
            [prevKey]: activeIdRef.current
          };
        }
        workspacePathRef.current = nextWs;
        setWorkspacePath(nextWs);
        resetScrollFollow();
        saveComposerDraft(activeIdRef.current);
        setEditHistoryIndex(null);
        editHistoryIndexRef.current = null;
        setEditComposer(null);
        let all2 = sessionsRef.current;
        const pendingId = pendingHistorySessionRef.current;
        if (pendingId) {
          pendingHistorySessionRef.current = null;
          if (all2.some((s) => s.id === pendingId && sessionMatchesWorkspaceTab(s, nextWs))) {
            activeByWorkspaceRef.current = {
              ...activeByWorkspaceRef.current,
              [workspaceSessionKey(nextWs)]: pendingId
            };
          }
        }
        const settings = await api.getChatSettings();
        const mode = settings.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code";
        const modelId = pickOrchestratorModel(settings.model, [...orchestratorModels, ...localOllamaTags], mode);
        const resolved = resolveWorkspaceChatSessions(all2, nextWs, activeByWorkspaceRef.current, () => ({
          id: `s${Date.now()}`,
          title: "新对话",
          modelId,
          history: [],
          workspacePath: workspaceSessionKey(nextWs) || null
        }), {
          resume: true,
          explicitEmptySessionId: getChatSessionsCache()?.explicitEmptySessionId ?? null,
          cachedActiveId: getChatSessionsCache()?.activeId ?? null
        });
        all2 = resolved.sessions;
        const aid = resolved.activeId;
        activeByWorkspaceRef.current = resolved.activeByWorkspace;
        setSessions(all2);
        sessionsRef.current = all2;
        switchActiveSession(aid);
        loadComposerDraft(aid);
        syncMessagesFromSession(all2.find((s) => s.id === aid));
        await persist(all2, aid);
      })();
    });
    return () => {
      try {
        off?.();
      } catch {
      }
    };
  }, [hasDesktopApi, resetScrollFollow, saveComposerDraft, loadComposerDraft, syncMessagesFromSession, persist, localOllamaTags, orchestratorModels]);
  const runWorkflowFromWbs = async (opts) => {
    const api = getDesktop();
    if (!api) {
      const error = LOCAL_ONLY_HINT;
      if (!opts?.recordUserLine) toast.error(error, {
        duration: 5e3
      });
      return {
        ok: false,
        error
      };
    }
    try {
      const runningNow = await syncExecutionState();
      if (opts?.autoRun && (runningNow || sending)) {
        stopChainExecution();
        stopChat();
        toast.info("已请求停止当前工作流，准备从 WBS 第 0 步重新开始…", {
          duration: 2600
        });
        const deadline = Date.now() + 6e3;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 120));
          const running = await syncExecutionState();
          if (!running && !sendingRef.current) break;
        }
        const stillBusy = await syncExecutionState();
        if (stillBusy || sendingRef.current) {
          const error = "旧流程仍在收尾，请稍后再试。";
          if (!opts?.recordUserLine) toast.warning(error, {
            duration: 3600
          });
          return {
            ok: false,
            error
          };
        }
      }
      if (!api.orchestrationCreateChain || !api.orchestrationActivateChain) {
        const error = "当前版本未暴露任务链注册接口，请重启到最新桌面应用。";
        if (!opts?.recordUserLine) toast.error(error);
        return {
          ok: false,
          error
        };
      }
      const settings = await api.getChatSettings();
      const readWorkspaceTextFile = api.readWorkspaceTextFile;
      if (typeof readWorkspaceTextFile !== "function") {
        const error = "当前版本未暴露工作区读文件接口，请重启到最新桌面应用。";
        if (!opts?.recordUserLine) toast.error(error);
        return {
          ok: false,
          error
        };
      }
      const listMd = typeof api.listWorkspaceMarkdownFiles === "function" ? async () => {
        const listed = await api.listWorkspaceMarkdownFiles();
        return listed.ok && Array.isArray(listed.files) ? listed.files : [];
      } : async () => [];
      const discovered = await discoverWbsDocument(listMd, (p) => readWorkspaceTextFile(p), {
        preferredPath: opts?.preferredPath,
        extraCandidatePaths: [settings.defaultConfirmWritePath?.trim() || ""],
        wbsFilenameOnly: Boolean(opts?.wbsOnly)
      });
      let pickedPath = "";
      let pickedText = "";
      let wbsDiscoverSource = "";
      if (discovered) {
        pickedPath = discovered.path;
        pickedText = discovered.text;
        wbsDiscoverSource = discovered.source;
      } else if (opts?.wbsOnly) {
        const fallback = await discoverWbsDocument(listMd, (p) => readWorkspaceTextFile(p), {
          preferredPath: opts?.preferredPath,
          extraCandidatePaths: ["docs/project-status.md", settings.defaultConfirmWritePath?.trim() || ""],
          wbsFilenameOnly: false
        });
        if (fallback) {
          pickedPath = fallback.path;
          pickedText = fallback.text;
          wbsDiscoverSource = fallback.source;
          if (!opts?.quietPickToast) {
            toast.info(`未找到 docs/wbs*.md，已从 ${pickedPath} 识别任务分配（/agent 或 WBS 表格）并生成任务链。`, {
              duration: 5600
            });
          }
        }
      }
      if (!pickedText) {
        const error = "未读取到可解析的 WBS。请确认 docs/wbs.md 或 sprint-backlog 等文档含「编号 | 工作摘要 | 执行 Agent」表格。";
        if (!opts?.recordUserLine) {
          toast.error("未读取到可解析的 WBS。请先用 `/agent project-manager` 生成含「编号 | 工作摘要 | 执行 Agent」表格并落盘到 docs/wbs.md；project-shepherd 默认写入 docs/project-status.md，不能替代 WBS。", {
            duration: 7200
          });
        }
        return {
          ok: false,
          error
        };
      }
      if (wbsDiscoverSource === "content-scan" && !opts?.quietPickToast) {
        toast.info(`未找到 docs/wbs*.md，已从 ${pickedPath} 识别 WBS 表格并生成任务链。`, {
          duration: 5200
        });
      }
      if (opts?.preferredPath && !opts?.quietPickToast) {
        toast.info(`已按退出点优先匹配：${pickedPath}`);
      }
      const parsed = parseActiveChainFromBubbleText(pickedText);
      if (!parsed.ok) {
        const error = `WBS 解析失败：${parsed.error}`;
        if (!opts?.recordUserLine) {
          toast.error(error, {
            duration: 5e3
          });
          toast.info(`已尝试文件：${pickedPath}。建议先将 WBS 导出为 Markdown 表格（含“编号/工作摘要/执行 Agent”）。`, {
            duration: 5500
          });
        }
        return {
          ok: false,
          error
        };
      }
      const saved = await registerParsedChainInList(api, {
        state: parsed.state,
        wbsPath: pickedPath,
        description: `WBS 来源：${pickedPath} · 工作区同步`,
        resetProgress: true
      });
      if (!saved.ok) {
        const error = saved.error || "注册任务链失败";
        if (!opts?.recordUserLine) toast.error(error, {
          duration: 5e3
        });
        return {
          ok: false,
          error
        };
      }
      const autoRun = Boolean(opts?.autoRun);
      const result = {
        ok: true,
        pickedPath,
        chainName: saved.chainName,
        chainId: saved.chainId,
        stepCount: saved.stepCount,
        autoRun
      };
      if (autoRun) {
        if (!opts?.quietPickToast) {
          toast.success(`已基于 ${pickedPath} 同步任务链「${saved.chainName}」（${saved.stepCount} 步）到列表，开始执行…`);
        }
        await runOrchestrationChain({
          skipConfirm: true,
          pinnedSessionId: activeIdRef.current
        });
      } else if (!opts?.quietPickToast) {
        toast.success(`已生成任务链「${saved.chainName}」（${saved.stepCount} 步），可在侧栏「任务链」查看并执行`, {
          duration: 5500
        });
      }
      if (opts?.recordUserLine) {
        await appendLocalChatExchange(activeIdRef.current, opts.recordUserLine, `${formatWbsChainSyncAssistantReply(result)}

可在侧栏 **任务链** 搜索 \`WBS\` 或筛选 **自定义** 查看。`);
      }
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("runWorkflowFromWbs", e);
      const error = `按 WBS 生成任务链失败：${msg || "未知错误"}`;
      if (!opts?.recordUserLine) toast.error(error, {
        duration: 6e3
      });
      return {
        ok: false,
        error
      };
    }
  };
  const inlineComposer = reactExports.useMemo(() => {
    if (editHistoryIndex == null || !editComposer) return null;
    return {
      textareaRef: inlineTaRef,
      input: editComposer.input,
      onInputChange: (v) => setEditComposer((prev) => prev ? {
        ...prev,
        input: v
      } : prev),
      onSend: () => void sendChat(),
      onStop: () => stopChat(),
      onPaste: handleInlineComposerPaste,
      placeholder: composerPlaceholder,
      disabled: workflowBusy,
      workflowBusy,
      hasDesktopApi,
      canSend: Boolean(editComposer.input.trim() || editComposer.pendingImages.length || editComposer.pendingTerminalSnippets.length),
      pendingImages: editComposer.pendingImages,
      onRemoveImage: (id) => setEditComposer((prev) => prev ? {
        ...prev,
        pendingImages: prev.pendingImages.filter((x) => x.id !== id)
      } : prev),
      pendingTerminalSnippets: editComposer.pendingTerminalSnippets,
      onRemoveTerminalSnippet: (id) => setEditComposer((prev) => prev ? {
        ...prev,
        pendingTerminalSnippets: prev.pendingTerminalSnippets.filter((x) => x.id !== id)
      } : prev),
      onPickFiles: (opts) => void pickLocalFiles(opts),
      orchMode,
      localAgentBasename,
      onAgentChange: (b) => void handleAgentChange(b),
      cloudModels: orchestratorModels,
      localModels: localOllamaTags,
      modelValue: activeSession?.modelId || globalModel || primaryModelFallback,
      modelFallback: primaryModelFallback,
      onModelPick: (pick) => void handleModelPick(pick),
      onCancelEdit: cancelEditUserMessage
    };
  }, [editHistoryIndex, editComposer, workflowBusy, hasDesktopApi, orchMode, localAgentBasename, orchestratorModels, localOllamaTags, activeSession?.modelId, globalModel, primaryModelFallback, handleInlineComposerPaste, cancelEditUserMessage, pickLocalFiles, handleAgentChange, handleModelPick, stopChat]);
  const editingUserMessage = reactExports.useMemo(() => {
    if (editHistoryIndex == null) return null;
    const sess = sessions.find((s) => s.id === activeId);
    if (!sess) return null;
    const ml = sess.modelId?.trim() || globalModel || "模型";
    return userMessageForHistoryIndex(sess.history, editHistoryIndex, ml);
  }, [editHistoryIndex, sessions, activeId, globalModel]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AppShell, { variant: "workbench", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "workbench-page flex h-full min-h-0 flex-1 flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(WorkbenchCursorLayout, { chatBodyMountRef: onChatBodyMountRef, onOpenChatPanel: openChatPanel, onInsertTerminalSelection: insertTerminalSelection, chatHeader: /* @__PURE__ */ jsxRuntimeExports.jsx(ChatPanelToolbar, { sessions: visibleSessions, activeId, sendingSessions, onSessionChange: (id) => void handleSessionChange(id), onNewSession: () => void handleNewSession(), onCloseSession: (id) => void handleCloseSession(id), hasDesktopApi, onClosePanel: () => setChatPanelOpen(false), terminalOpen, onToggleTerminal: () => setTerminalOpen((v) => !v), projectHistoryItems, allHistoryItems, onSelectHistorySession: (id) => void activateHistorySession(id), onHistoryOpen: handleHistoryOpen }), centerToolbar: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute left-1.5 top-1.5 z-20 flex items-center gap-1", children: [
        !leftSidebarOpen ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setLeftSidebarOpen(true), className: "inline-flex h-7 items-center gap-1 rounded-md border border-border/80 bg-surface/90 px-2 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition hover:bg-secondary hover:text-foreground", title: "显示文件树", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(PanelRightOpen, { className: "h-3.5 w-3.5 rotate-180" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "文件" })
        ] }) : null,
        !chatPanelOpen ? /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "button", onClick: () => setChatPanelOpen(true), className: "inline-flex h-7 items-center gap-1 rounded-md border border-border/80 bg-surface/90 px-2 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition hover:bg-secondary hover:text-foreground", title: "显示聊天", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MessageCircle, { className: "h-3.5 w-3.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: "聊天" })
        ] }) : null
      ] }), terminalOpen, onTerminalOpenChange: setTerminalOpen, leftOpen: leftSidebarOpen, onLeftOpenChange: setLeftSidebarOpen, rightOpen: chatPanelOpen, onRightOpenChange: setChatPanelOpen }),
      chatBodyMountEl ? reactDomExports.createPortal(/* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "chat-pane-layout h-full min-h-0", style: {
        ["--composer-h"]: `${composerDockHeight}px`
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChatMessagesPane, { messages, editHistoryIndex, editingUserMessage, inlineComposer, scrollAreaRef, messagesEndRef, showJumpLatest, onJumpToLatest: jumpToLatest, hasDesktopApi, onWriteToWorkspace: handleBubbleWriteToWorkspace, onGenerateChain: handleBubbleGenerateChain, onEditUserMessage: beginEditUserMessage, onRequestResendUserMessage: requestResendUserMessage }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChatComposerCursor, { dockRef: composerDockRef, textareaRef: taRef, input, onInputChange: setInput, onSend: () => void sendChat(), onStop: () => stopChat(), onPaste: handleComposerPaste, placeholder: composerPlaceholder, disabled: workflowBusy, workflowBusy, hasDesktopApi, canSend: Boolean(input.trim() || pendingImages.length || pendingTerminalSnippets.length), pendingImages, onRemoveImage: (id) => setPendingImages((p) => p.filter((x) => x.id !== id)), pendingTerminalSnippets, onRemoveTerminalSnippet: (id) => setPendingTerminalSnippets((p) => p.filter((x) => x.id !== id)), onPickFiles: (opts) => void pickLocalFiles(opts), orchMode, localAgentBasename, onAgentChange: (b) => void handleAgentChange(b), cloudModels: orchestratorModels, localModels: localOllamaTags, modelValue: activeSession?.modelId || globalModel || primaryModelFallback, modelFallback: primaryModelFallback, onModelPick: (pick) => void handleModelPick(pick), chainStatusLabel: chainStatusBadge.label, chainStatusTone: chainStatusBadge.tone, onCancelEdit: cancelEditUserMessage })
      ] }), chatBodyMountEl) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { ref: attachInputRef, type: "file", multiple: true, className: "pointer-events-none fixed inset-0 h-0 w-0 opacity-0", "aria-hidden": true, tabIndex: -1, onChange: onAttachInputChange }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(GithubDialog, { open: githubOpen, onClose: () => setGithubOpen(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ChatResendConfirmDialog, { open: checkpointConfirm != null, onOpenChange: (open) => {
      if (!open) setCheckpointConfirm(null);
    }, onConfirm: () => {
      if (!checkpointConfirm) return;
      runCheckpointAction(checkpointConfirm.historyIndex, checkpointConfirm.action);
      setCheckpointConfirm(null);
    } })
  ] });
}
function GithubDialog({
  open,
  onClose
}) {
  if (!open) return null;
  const repos = [{
    name: "EPLB",
    desc: "EP 间并行动态负载均衡"
  }, {
    name: "deepseek",
    desc: "面向 MoE 与 EP 的通信相关参考"
  }, {
    name: "lighthouse",
    desc: "网络应用质量与性能"
  }, {
    name: "blog",
    desc: "数据结构与算法笔记"
  }, {
    name: "notekit",
    desc: "支持手绘的 Markdown 笔记"
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-[16px] font-semibold text-foreground", children: "引入开源仓库" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] leading-relaxed text-muted-foreground", children: "目前仅支持在终端手动克隆公开仓库；此处可记录常用 GitHub 链接便于复制。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", placeholder: "输入 GitHub 链接", className: "mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 text-[12px] font-semibold text-foreground", children: "热门仓库" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 divide-y divide-border", children: repos.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2 py-2.5 text-[13px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-foreground", children: r.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
        "：",
        r.desc
      ] })
    ] }, r.name)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "rounded-lg border border-border bg-surface px-4 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary", children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded-lg px-4 py-1.5 text-[12.5px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-95", style: {
        backgroundImage: "var(--gradient-primary)"
      }, children: "复制链接" })
    ] })
  ] }) });
}
export {
  ChatPage as component
};
