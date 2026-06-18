import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ImageLightboxProps = {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
};

export function ImageLightbox({ src, alt, open, onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-background/20 text-white/80 transition hover:bg-background/30 hover:text-white"
        onClick={onClose}
        aria-label="关闭大图"
      >
        <X className="h-5 w-5" />
      </button>

      <img
        src={src}
        alt={alt || ""}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
