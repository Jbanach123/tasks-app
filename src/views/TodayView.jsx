// "Dziś" (Today) tab — a day-by-day checklist. Defaults to today, but the
// user can step backward to any past day and retroactively check off what
// they actually completed (e.g. forgot to log yesterday).
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Ring, KindIcon, StreakBadge, EmptyState } from "../ui";
import { dateKey, isRelevantOnDay, dayLabel, computeStreak, kindLabel } from "../utils";

export default function TodayView({ tasks, completions, todayKey, onToggle, onEdit }) {
  // Which day is currently being viewed/edited — starts on today, can only move backward
  const [viewDate, setViewDate] = useState(() => new Date());
  const viewKey = dateKey(viewDate);
  const isToday = viewKey === todayKey;

  const shiftDay = (delta) => {
    setViewDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + delta);
      return nd;
    });
  };

  const relevant = tasks.filter((t) => isRelevantOnDay(t, viewDate, viewKey, completions, todayKey));
  const recurring = relevant.filter((t) => t.kind === "recurring");
  const flexible = relevant.filter((t) => t.kind === "flexible");
  const oneoff = relevant.filter((t) => t.kind === "oneoff");
  // One-off tasks with a future due date — not "relevant" to any specific day yet,
  // but worth surfacing on today's screen so nothing with a deadline gets forgotten.
  // Only shown while looking at today (doesn't make sense while browsing past days).
  const upcoming = isToday
    ? tasks.filter((t) => t.kind === "oneoff" && t.dueDate && t.dueDate > todayKey && (completions[t.id] || []).length === 0)
    : [];

  // One row in the checklist — shared between the "scheduled" and "flexible" sections
  const Row = ({ t }) => {
    const done = (completions[t.id] || []).includes(viewKey);
    const streak = computeStreak(t, completions);
    return (
      <div className="flex items-center gap-3.5 px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Ring percent={done ? 1 : 0} color={t.color} checked={done} onClick={() => onToggle(t.id, viewKey)} size={44} stroke={4} icon={t.icon} />
        <button onClick={() => onEdit(t)} className="flex-1 min-w-0 text-left">
          <p className={`font-medium truncate ${done ? "line-through rt-dim-40" : ""}`}>{t.name}</p>
          <p className="text-xs rt-dim-40 flex items-center gap-1.5 mt-0.5">
            <span className="flex items-center gap-1"><KindIcon task={t} />{kindLabel(t)}</span>
            {/* Streaks only make sense relative to "today", not while browsing history */}
            {isToday && <StreakBadge streak={streak} />}
          </p>
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm rt-dim-45 mb-1">{viewDate.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="text-2xl font-semibold">{dayLabel(viewDate, todayKey)}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => shiftDay(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><ChevronLeft size={16} /></button>
          {/* Can't navigate into the future — nothing to check off yet */}
          <button onClick={() => shiftDay(1)} disabled={isToday} className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-25" style={{ background: "rgba(255,255,255,0.08)" }}><ChevronRight size={16} /></button>
        </div>
      </div>
      {!isToday && (
        <button onClick={() => setViewDate(new Date())} className="text-xs font-medium rt-accent mb-4 -mt-3 block">← Wróć do dzisiaj</button>
      )}
      {relevant.length === 0 && upcoming.length === 0 ? (
        <EmptyState text={isToday ? "Brak zadań na dziś. Dodaj pierwsze w zakładce Zadania." : "Brak zadań zaplanowanych na ten dzień."} />
      ) : (
        <>
          {recurring.length > 0 && (
            <div className="rounded-3xl overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {recurring.map((t, i) => <div key={t.id} style={{ borderTop: i === 0 ? "none" : undefined }}><Row t={t} /></div>)}
            </div>
          )}
          {flexible.length > 0 && (
            <>
              <p className="text-xs rt-dim-40 mb-2 px-1">Bez terminu — kiedy chcesz</p>
              <div className="rounded-3xl overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {flexible.map((t, i) => <div key={t.id} style={{ borderTop: i === 0 ? "none" : undefined }}><Row t={t} /></div>)}
              </div>
            </>
          )}
          {oneoff.length > 0 && (
            <>
              <p className="text-xs rt-dim-40 mb-2 px-1">Jednorazowe</p>
              <div className="rounded-3xl overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {oneoff.map((t, i) => <div key={t.id} style={{ borderTop: i === 0 ? "none" : undefined }}><Row t={t} /></div>)}
              </div>
            </>
          )}
          {upcoming.length > 0 && (
            <>
              <p className="text-xs rt-dim-40 mb-2 px-1">Nadchodzące</p>
              <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {upcoming.map((t, i) => <div key={t.id} style={{ borderTop: i === 0 ? "none" : undefined }}><Row t={t} /></div>)}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}