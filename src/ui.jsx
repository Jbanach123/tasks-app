import { Check, Repeat, Flag, Infinity as InfinityIcon, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { THEME } from "./theme";

// ─────────────────────────────────────────────────────────
// Ring — circular progress indicator, doubles as a completion toggle button
// when `onClick` is passed, or a read-only progress display otherwise.
// ─────────────────────────────────────────────────────────
export function Ring({ percent, color, size = 52, checked, onClick, stroke = 5, icon }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - Math.min(1, percent) * c;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} style={{ width: size, height: size }}
      className="relative shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-full">
      <svg width={size} height={size} className="absolute -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 300ms ease" }} />
      </svg>
      {checked ? <Check size={18} color={color} strokeWidth={3} /> : icon ? <span style={{ fontSize: size * 0.4 }}>{icon}</span> : null}
    </Tag>
  );
}

// ─────────────────────────────────────────────────────────
// Avatar — colored circle showing a task's emoji/icon, falling back to its
// initial letter when no icon was set.
// ─────────────────────────────────────────────────────────
export function Avatar({ task, size = 40 }) {
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 font-semibold"
      style={{ width: size, height: size, background: `${task.color}26`, border: `1.5px solid ${task.color}`, fontSize: size * 0.46, color: task.color }}>
      {task.icon || task.name.trim().charAt(0).toUpperCase() || "•"}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// KindIcon — tiny icon indicating whether a task is recurring, flexible,
// or a one-off with a deadline.
// ─────────────────────────────────────────────────────────
export function KindIcon({ task, size = 11 }) {
  if (task.kind === "flexible") return <InfinityIcon size={size} />;
  if (task.kind === "oneoff") return <Flag size={size} />;
  return <Repeat size={size} />;
}

// ─────────────────────────────────────────────────────────
// StreakBadge — small flame + count of consecutive completed days.
// Renders nothing when there's no active streak, so callers can use it
// unconditionally.
// ─────────────────────────────────────────────────────────
export function StreakBadge({ streak }) {
  if (!streak || streak < 1) return null;
  return (
    <span className="inline-flex items-center gap-0.5 rt-dim-70" style={{ fontSize: 11 }}>
      <Flame size={11} color={THEME.accent} /> {streak}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// MonthTrend — compares this month's completion count to the previous
// month's, shown in the stats list. Hidden for tasks with no prior data.
// ─────────────────────────────────────────────────────────
export function MonthTrend({ count, prevCount }) {
  if (prevCount === null || (count === 0 && prevCount === 0)) return null;
  const delta = count - prevCount;
  if (delta === 0) {
    return <p className="text-xs rt-dim-35 flex items-center justify-end gap-0.5 mt-0.5"><Minus size={10} /> jak poprz.</p>;
  }
  const up = delta > 0;
  return (
    <p className="text-xs flex items-center justify-end gap-0.5 mt-0.5" style={{ color: up ? "#57C2A3" : THEME.danger }}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {up ? "+" : ""}{delta} vs poprz.
    </p>
  );
}

// ─────────────────────────────────────────────────────────
// TabButton — bottom navigation pill button
// ─────────────────────────────────────────────────────────
export function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors"
      style={{ background: active ? "rgba(255,255,255,0.12)" : "transparent", color: active ? THEME.text : "rgba(242,245,243,0.5)" }}>
      {icon}{label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// EmptyState — generic "nothing here yet" placeholder card
// ─────────────────────────────────────────────────────────
export function EmptyState({ text }) {
  return (
    <div className="rounded-3xl px-6 py-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}>
      <p className="text-sm rt-dim-45">{text}</p>
    </div>
  );
}
