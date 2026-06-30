import { cn } from "@/lib/utils";
import {
  AlignJustify,
  AlignLeft,
  Check,
  ChevronDown,
  Circle,
  Diamond,
  Disc,
  Menu,
  Paperclip,
  Sparkles,
  Square,
  X,
  Zap,
} from "lucide-react";

export function SkillChip({ label, icon: Icon, onRemove }: { label: string; icon: typeof Zap; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[11.5px] font-medium text-primary">
      <Icon className="h-3 w-3" />
      {label}
      <button onClick={onRemove} className="ml-0.5 rounded-full p-0.5 text-primary/60 transition hover:bg-primary/10 hover:text-primary">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

export function SpeedChip({ open, setOpen, speed, setSpeed }: { open: boolean; setOpen: (v: boolean) => void; speed: string; setSpeed: (v: string) => void }) {
  const opts = [
    { label: "快速", desc: "适用于大部分情况", icon: Zap, color: "text-amber-500" },
    { label: "思考", desc: "擅长解决更难的问题", icon: Circle, color: "text-foreground" },
    { label: "专家", desc: "研究级智能模型", icon: Diamond, color: "text-muted-foreground", badge: "新" },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground">
        <Zap className="h-3 w-3 text-amber-500" /> {speed} <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          {opts.map((o, i) => {
            const Icon = o.icon;
            const sel = o.label === speed;
            return (
              <button key={i} onClick={() => { setSpeed(o.label); setOpen(false); }} className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition", sel ? "bg-primary-soft/50" : "hover:bg-secondary")}>
                <Icon className={cn("mt-0.5 h-4 w-4", o.color)} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    {o.label}
                    {o.badge && <span className="rounded bg-primary-soft px-1 py-px text-[10px] font-medium text-primary">{o.badge}</span>}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">{o.desc}</div>
                </div>
                {sel && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UploadChip({ onClick, label, hasArrow }: { onClick: () => void; label: string; hasArrow?: boolean }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground">
      <Paperclip className="h-3.5 w-3.5" /> {label} {hasArrow && <ChevronDown className="h-2.5 w-2.5" />}
    </button>
  );
}

export function ModelChip({
  label,
  open,
  setOpen,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  options: string[];
  onSelect: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-40"
      >
        <Zap className="h-3.5 w-3.5" /> {label} <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && options.length > 0 && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-44 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">模型</div>
          {options.map((o) => {
            const sel = o === label;
            return (
              <button key={o} onClick={() => { onSelect(o); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition", sel ? "bg-primary-soft/40 font-semibold text-foreground" : "hover:bg-secondary text-muted-foreground")}>
                {o}
                {sel && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STYLE_OPTIONS = [
  "人像摄影", "电影写真", "中国风", "动漫", "3D 渲染", "赛博朋克",
  "平面插画", "风景", "像素风格", "水墨画", "油画", "水彩画",
];

export function StylePopover({ open, setOpen, value, setValue }: { open: boolean; setOpen: (v: boolean) => void; value: string; setValue: (v: string) => void }) {
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground transition hover:text-foreground">
        <Disc className="h-3.5 w-3.5" /> {value || "风格"} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">风格</div>
          <div className="max-h-72 space-y-0.5 overflow-y-auto scrollbar-thin pr-1">
            {STYLE_OPTIONS.map((s) => {
              const sel = s === value;
              return (
                <button key={s} onClick={() => { setValue(s); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition", sel ? "bg-secondary" : "hover:bg-secondary/60")}>
                  <span className="h-10 w-10 shrink-0 rounded-xl border border-border bg-gradient-to-br from-secondary to-muted" />
                  <span className="text-[13px] text-foreground">{s}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const TEMPLATE_OPTIONS = ["现代设计", "极简", "复古", "夏日", "节日", "科技感", "自然", "商务", "教育", "社交媒体"];

export function TemplatePopover({ open, setOpen, value, setValue }: { open: boolean; setOpen: (v: boolean) => void; value: string | null; setValue: (v: string | null) => void }) {
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground transition hover:text-foreground">
        <Menu className="h-3.5 w-3.5" /> {value || "模板"} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-48 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">模板</div>
          {TEMPLATE_OPTIONS.map((t) => {
            const sel = t === value;
            return (
              <button key={t} onClick={() => { setValue(sel ? null : t); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition", sel ? "bg-primary-soft/40 font-semibold text-foreground" : "hover:bg-secondary text-muted-foreground")}>
                {sel && <Check className="h-3.5 w-3.5 text-primary" />}
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SegmentToggle({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-secondary p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full px-3 py-0.5 text-[11.5px] font-medium transition",
            value === o ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function RatioChip({ open, setOpen, ratio, setRatio }: { open: boolean; setOpen: (v: boolean) => void; ratio: string; setRatio: (v: string) => void }) {
  const opts = [
    { v: "1:1", desc: "正方形，头像" },
    { v: "2:3", desc: "社交媒体，自拍" },
    { v: "3:4", desc: "经典比例，拍照" },
    { v: "4:3", desc: "文章配图，插画" },
    { v: "9:16", desc: "手机壁纸，人像" },
    { v: "16:9", desc: "桌面壁纸，风景" },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground">
        <Square className="h-3.5 w-3.5" /> 比例 · {ratio} <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">比例</div>
          {opts.map((o) => {
            const sel = o.v === ratio;
            return (
              <button key={o.v} onClick={() => { setRatio(o.v); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition", sel ? "bg-primary-soft/40" : "hover:bg-secondary")}>
                <Square className={cn("h-3.5 w-3.5", sel ? "fill-primary/30 text-primary" : "text-muted-foreground")} />
                <span className="text-[13px] font-semibold text-foreground">{o.v}</span>
                <span className="text-[12px] text-muted-foreground">{o.desc}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LengthChip({ open, setOpen, length, setLength }: { open: boolean; setOpen: (v: boolean) => void; length: string; setLength: (v: string) => void }) {
  const opts = [
    { v: "智能推荐", icon: Sparkles },
    { v: "精简", icon: Menu },
    { v: "适中", icon: AlignJustify },
    { v: "详细", icon: AlignLeft },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:text-foreground">
        <AlignJustify className="h-3.5 w-3.5" /> 篇幅 <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-44 rounded-2xl border border-border bg-surface p-2 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">篇幅</div>
          {opts.map((o) => {
            const Icon = o.icon;
            const sel = o.v === length;
            return (
              <button key={o.v} onClick={() => { setLength(o.v); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition", sel ? "bg-primary-soft/40 font-semibold text-foreground" : "hover:bg-secondary")}>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {o.v}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
