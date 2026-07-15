/** 浏览器内嵌检查器选中的 DOM 元素，可附加到聊天 Composer */
export type DomElementPayload = {
  tag: string;
  /** 展示用标签，如「ChatSessionTabs · div」或「span.chat-tab-title」 */
  label: string;
  selector: string;
  textPreview: string;
  outerHtmlSnippet: string;
  pageUrl: string;
};

export type PendingDomElement = DomElementPayload & { id: string };

export function formatDomChipLabel(payload: Pick<DomElementPayload, "tag">): string {
  const tag = String(payload.tag || "element").toLowerCase();
  return `<${tag}>`;
}

/** 发送给模型时的上下文块 */
export function formatDomElementContext(payload: DomElementPayload): string {
  const lines = [`[DOM 元素 ${payload.label}]`, `页面: ${payload.pageUrl}`, `选择器: ${payload.selector}`];
  if (payload.textPreview) lines.push(`文本: ${payload.textPreview}`);
  if (payload.outerHtmlSnippet) lines.push(`HTML:\n${payload.outerHtmlSnippet}`);
  return lines.join("\n");
}
