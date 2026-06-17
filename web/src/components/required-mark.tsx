import { cn } from "@/lib/utils";

/** 表单必填项星号（统一红色） */
export function RequiredMark({ className }: { className?: string }) {
  return (
    <span className={cn("font-normal text-destructive", className)} aria-hidden="true">
      *
    </span>
  );
}
