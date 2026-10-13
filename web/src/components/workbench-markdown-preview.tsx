import { ChatMarkdown } from "@/components/chat-markdown";
import { cn } from "@/lib/utils";

/** Markdown 预览：背景/正文全程跟主题 token（夜间 = editor #181818） */
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
      <article className="workbench-md-article mx-auto w-full max-w-3xl px-5 py-6 sm:px-8">
        <ChatMarkdown content={content || "（空文件）"} variant="workbench" />
      </article>
    </div>
  );
}
