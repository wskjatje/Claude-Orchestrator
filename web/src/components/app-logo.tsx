import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/ui-copy";

type AppLogoProps = {
  className?: string;
  /** full：通用；sidebar：侧栏品牌区（更大）；mark：顶栏图标裁切 */
  variant?: "full" | "sidebar" | "mark";
};

/** 项目主 logo（public/logo.png · 图一） */
export function AppLogo({ className, variant = "full" }: AppLogoProps) {
  if (variant === "mark") {
    return (
      <img
        src="/logo.png"
        alt={APP_NAME}
        className={cn("h-7 w-7 shrink-0 rounded-md object-cover object-top", className)}
        style={{ clipPath: "inset(0 0 42% 0)" }}
        draggable={false}
      />
    );
  }
  if (variant === "sidebar") {
    return (
      <img
        src="/logo.png"
        alt={APP_NAME}
        className={cn(
          "mx-auto block h-[4.25rem] w-full max-w-[11.5rem] object-contain",
          "mix-blend-multiply dark:mix-blend-normal dark:brightness-[1.08]",
          className,
        )}
        draggable={false}
      />
    );
  }
  return (
    <img
      src="/logo.png"
      alt={APP_NAME}
      className={cn(
        "block h-11 w-auto max-w-[152px] shrink-0 object-contain object-left",
        "mix-blend-multiply dark:mix-blend-normal dark:brightness-[1.08]",
        className,
      )}
      draggable={false}
    />
  );
}
