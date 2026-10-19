/** 与 server/claude-stream-parse.mjs 序列化块对齐的结构化步骤事件 */

export type StreamAgentEvent = {
  type: "thinking" | "tool" | "text";
  name?: string;
  arg?: string;
  status?: "running" | "ok" | "fail";
  path?: string;
  /** Bash/run_command 等工具 stdout/stderr（截断后）；无则回显「（无输出）」 */
  output?: string;
};

const BEGIN = "<<<stream-events>>>";
const END = "<<<end-stream-events>>>";

export function parseStreamEventsBlock(text: string): StreamAgentEvent[] {
  if (!text || !text.includes(BEGIN)) return [];
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END, start + BEGIN.length);
  if (start < 0 || end < 0) return [];
  const raw = text.slice(start + BEGIN.length, end).trim();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) => e && typeof e === "object" && typeof (e as StreamAgentEvent).type === "string",
    ) as StreamAgentEvent[];
  } catch {
    return [];
  }
}

export function stripStreamEventsBlock(text: string): string {
  if (!text || !text.includes(BEGIN)) return text;
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END, start + BEGIN.length);
  if (start < 0 || end < 0) return text;
  return (text.slice(0, start) + text.slice(end + END.length)).replace(/\n{3,}/g, "\n\n").trim();
}

export function formatStreamEventsBlock(events: StreamAgentEvent[]): string {
  if (!events.length) return "";
  return `\n\n${BEGIN}\n${JSON.stringify(events)}\n${END}\n`;
}
