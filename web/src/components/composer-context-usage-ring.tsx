/** Cursor 式上下文占用环：仅描边弧，百分比只在 title / aria。 */
import { cn } from "@/lib/utils";

const RING_SIZE = 18;
const RING_STROKE = 1.75;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUM = 2 * Math.PI * RING_RADIUS;

export type ComposerContextUsageRingProps = {
  percent: number;
  /** 建议 summarize 时用警示色 */
  warn?: boolean;
  flash?: boolean;
  className?: string;
  "aria-hidden"?: boolean;
};

export function ComposerContextUsageRing({
  percent,
  warn = false,
  flash = false,
  className,
  "aria-hidden": ariaHidden,
}: ComposerContextUsageRingProps) {
  const fill = Math.min(1, Math.max(0, percent / 100));
  const offset = RING_CIRCUM * (1 - fill);
  return (
    <span
      className={cn(
        "composer-context-ring inline-flex shrink-0 items-center justify-center",
        flash && "composer-context-ring--flash",
        warn && "composer-context-ring--warn",
        className,
      )}
      aria-hidden={ariaHidden}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="composer-context-ring__svg"
        aria-hidden
      >
        <circle
          className="composer-context-ring__track"
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
        />
        {fill > 0 ? (
          <circle
            className="composer-context-ring__fg"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUM}
            strokeDashoffset={offset}
          />
        ) : null}
      </svg>
    </span>
  );
}
