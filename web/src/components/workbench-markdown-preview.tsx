import { ChatMarkdown } from "@/components/chat-markdown";
import { cn } from "@/lib/utils";

/** Cursor 式 Markdown 预览：层次清晰、与源码配色体系一致 */
export function WorkbenchMarkdownPreview({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "workbench-md-preview workbench-md-unified min-h-0 flex-1 overflow-auto scrollbar-thin",
        className,
      )}
    >
      <article className="workbench-md-article mx-auto max-w-3xl px-5 py-6 sm:px-8">
        <ChatMarkdown content={content || "（空文件）"} className="workbench-md-body" />
      </article>
    </div>
  );
}
