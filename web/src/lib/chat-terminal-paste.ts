/** 判断用户消息是否像从终端整段粘贴的内容。 */
export function looksLikeTerminalPaste(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 16) return false;

  if (/^[^\n]{0,96}[@][^\n]{0,48}[%$#]\s/m.test(t)) return true;
  if (/\n[^\n]{0,96}[%$#]\s+\S/.test(t)) return true;
  if (
    /Address already in use|Serving Flask|Traceback \(most recent|command not found|Error:|WARNING:/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/** 展示时去掉末尾多余的空 prompt，避免「两个命令输入点」。 */
export function trimTerminalDisplay(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 1) {
    const last = lines[lines.length - 1]?.trim() ?? "";
    if (
      last === "" ||
      /^[^\s]{0,96}[@][^\s]{0,48}[%$#]\s*$/.test(last) ||
      /^[%$#]\s*$/.test(last)
    ) {
      lines.pop();
      continue;
    }
    break;
  }
  return lines.join("\n").trimEnd();
}

/** 用户消息是否含 Markdown 结构（非纯终端粘贴时仍可按 Markdown 渲染）。 */
export function looksLikeMarkdown(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /^#{1,6}\s/m.test(t) ||
    /```[\s\S]*?```/.test(t) ||
    /^\s*[-*+]\s/m.test(t) ||
    /^\s*\d+\.\s/m.test(t) ||
    /\*\*[^*\n]+\*\*/.test(t) ||
    /`[^`\n]+`/.test(t)
  );
}
