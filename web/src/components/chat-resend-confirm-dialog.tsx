import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { setSkipCheckpointConfirm } from "@/lib/chat-checkpoint-prefs";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

/** Cursor checkpoint confirmation when editing or resending a prior user message. */
export function ChatResendConfirmDialog({ open, onOpenChange, onConfirm }: Props) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    if (!open) setDontAskAgain(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        overlayClassName="bg-black/42 backdrop-blur-[1px]"
        className="chat-resend-confirm-dialog gap-0 p-0 sm:max-w-[420px]"
      >
        <AlertDialogHeader className="space-y-1.5 px-5 pb-4 pt-5 text-left">
          <AlertDialogTitle className="text-[15px] font-semibold leading-snug">
            要丢弃此检查点之后的所有更改吗？
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
            之后仍可撤销此操作。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2 px-5 pb-4">
          <Checkbox
            id="chat-checkpoint-dont-ask"
            checked={dontAskAgain}
            onCheckedChange={(v) => setDontAskAgain(v === true)}
          />
          <label
            htmlFor="chat-checkpoint-dont-ask"
            className="cursor-pointer select-none text-[13px] leading-none text-muted-foreground"
          >
            不再询问
          </label>
        </div>

        <AlertDialogFooter className="flex-row justify-end gap-2 border-t border-border/70 bg-muted/10 px-5 py-3 sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-md px-3.5 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            取消 (Esc)
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-md px-3.5 text-[13px]"
            onClick={() => {
              if (dontAskAgain) setSkipCheckpointConfirm(true);
              onConfirm();
              onOpenChange(false);
            }}
          >
            继续 ↵
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
