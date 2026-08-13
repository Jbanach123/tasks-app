// "Statystyki" (Stats) tab — monthly completion totals per task, with
// month-by-month navigation (can browse history, never into the future)
// and a month-over-month trend indicator.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Ring, KindIcon, EmptyState, MonthTrend } from "../ui";
import { pad, fmtShort, monthlyCount, monthlyTarget, kindLabel } from "../utils";
import { MONTH_NAMES } from "../theme";

export default function StatsView({ tasks, completions, statsMonth, setStatsMonth, today }) {
  const { y, m } = statsMonth;
  const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();

  const shift = (delta) => {
    let ny = y, nm = m + delta;
    if (nm < 0) { nm = 11; ny -= 1; }
    if (nm > 11) { nm = 0; ny += 1; }
    // Guard against navigating past the current month — no data to show yet
    if (ny > today.getFullYear() || (ny === today.getFullYear() && nm > today.getMonth())) return;
    setStatsMonth({ y: ny, m: nm });
  };

  const rows = tasks.map((t) => {
    const count = monthlyCount(t.id, completions, y, m);
    const target = monthlyTarget(t, y, m, count);
    const completedInMonth = t.kind === "oneoff" ? (completions[t.id] || []).find((d) => d.startsWith(`${y}-${pad(m + 1)}`)) : null;
    // Compare against the month right before the one being viewed
    const prevY = m === 0 ? y - 1 : y;
    const prevM = m === 0 ? 11 : m - 1;
    const prevCount = t.kind === "oneoff" ? null : monthlyCount(t.id, completions, prevY, prevM);
    return { t, count, target, completedInMonth, prevCount };
  }).filter((r) => r.t.kind !== "oneoff" || r.completedInMonth); // hide one-off tasks not completed in this month

  const totalCompletions = rows.reduce((sum, r) => sum + (r.t.kind === "oneoff" ? (r.completedInMonth ? 1 : 0) : r.count), 0);

  return (
    <>
      <h1 className="text-2xl font-semibold mb-5">Statystyki</h1>
      <div className="flex items-center justify-between mb-5 rounded-2xl px-2 py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
        <button onClick={() => shift(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><ChevronLeft size={16} /></button>
        <p className="font-medium">{MONTH_NAMES[m]} {y}</p>
        <button onClick={() => shift(1)} disabled={isCurrentMonth} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-25" style={{ background: "rgba(255,255,255,0.08)" }}><ChevronRight size={16} /></button>
      </div>

      <div className="rounded-2xl px-5 py-4 mb-5 flex items-center justify-between" style={{ background: "rgba(227,154,99,0.1)", border: "1px solid rgba(227,154,99,0.25)" }}>
        <span className="text-sm rt-dim-70">Łącznie wykonanych</span>
        <span className="text-lg font-semibold rt-accent">{totalCompletions}</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState text="Brak zapisanych wykonań w tym miesiącu." />
      ) : (
        <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {rows.map((r, i) => (
            <div key={r.t.id} className="flex items-center gap-3.5 px-5 py-4" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
              <Ring percent={r.t.kind === "oneoff" ? (r.completedInMonth ? 1 : 0) : r.count / r.target} color={r.t.color} size={44} stroke={4} icon={r.t.icon} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.t.name}</p>
                <p className="text-xs rt-dim-40 flex items-center gap-1 mt-0.5"><KindIcon task={r.t} />{kindLabel(r.t)}</p>
              </div>
              <div className="text-right shrink-0">
                {r.t.kind === "oneoff" ? (
                  <p className="text-sm font-semibold rt-accent">{fmtShort(r.completedInMonth)}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold rt-accent">{r.count}/{r.target}</p>
                    <MonthTrend count={r.count} prevCount={r.prevCount} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
