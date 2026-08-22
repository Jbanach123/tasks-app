import { DAY_LABELS } from "./theme";

// ─────────────────────────────────────────────────────────
// DATE HELPERS
// All dates are stored/compared as "YYYY-MM-DD" strings (local time, not UTC)
// so they sort and compare correctly with plain string operations.
// ─────────────────────────────────────────────────────────

export const pad = (n) => String(n).padStart(2, "0");

// Converts a JS Date into a local "YYYY-MM-DD" key
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// JS's Date.getDay() is Sunday-first (0-6); we want Monday-first (0-6) to match DAY_LABELS
export const mondayIndex = (d) => (d.getDay() === 0 ? 6 : d.getDay() - 1);

// Returns the Monday of the week containing the given date.
export const getWeekStart = (dateObj) => {
  const d = new Date(dateObj);
  const day = d.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
};

// "2026-08-07" -> "07.08.2026" for display
export const fmtShort = (dateStr) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
};

// Adds/subtracts n days from a "YYYY-MM-DD" string, returns a new "YYYY-MM-DD" string
export const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dateKey(dt);
};

// ─────────────────────────────────────────────────────────
// TASK SCHEDULING & STATS
// A task has a `kind`: "recurring" | "flexible" | "oneoff".
// - recurring: has `task.recurrence` = { type: "daily" | "weekdays" | "timesPerWeek", days?, timesPerWeek? }
// - flexible: no schedule, always available, tracked whenever completed
// - oneoff: has `task.dueDate` ("YYYY-MM-DD"), done at most once
// ─────────────────────────────────────────────────────────

// Is this task scheduled on the given day? (recurring/flexible only — oneoff handled separately)
export function isDueOnDate(task, dateObj) {
  if (task.kind === "flexible") return true;
  if (task.kind === "oneoff") return false;
  const rec = task.recurrence || { type: "daily" }; // fallback guards against legacy/incomplete task records
  if (rec.type === "daily") return true;
  if (rec.type === "weekdays") return (rec.days || []).includes(mondayIndex(dateObj));
  return true; // timesPerWeek: flexible day-to-day, every day is a valid candidate
}

// Full "is this task relevant to show on this specific day" check, including oneoff tasks.
// Used by the day view (today or any past day the user navigates to).
export function isRelevantOnDay(task, dateObj, dateKeyStr, completions, todayKey) {
  if (task.kind === "oneoff") {
    const doneEver = (completions[task.id] || []).length > 0;

    if (!task.dueDate) {
      // No deadline set — just sits on "today" until completed,
      // but remains visible on the day it was actually completed.
      if (dateKeyStr === todayKey) return !doneEver;
      return (completions[task.id] || []).includes(dateKeyStr);
    }

    if (dateKeyStr === todayKey) {
      return !doneEver && task.dueDate <= todayKey;
    }

    return task.dueDate === dateKeyStr ||
      (completions[task.id] || []).includes(dateKeyStr);
  }

  if (
    task.kind === "recurring" &&
    task.recurrence?.type === "timesPerWeek"
  ) {
    const completed = completions[task.id] || [];

    const weekStart = getWeekStart(dateObj);
    const weekStartKey = dateKey(weekStart);

    const completedThisWeek = completed.filter(
      (d) => d >= weekStartKey && d <= dateKeyStr
    ).length;

    // Keep the task visible on the exact day it was completed,
    // so the UI can show it as checked.
    const completedToday = completed.includes(dateKeyStr);

    if (completedToday) {
      return true;
    }

    // Hide it on subsequent days once the weekly target is reached.
    return completedThisWeek < (task.recurrence.timesPerWeek || 1);
  }

  return isDueOnDate(task, dateObj);
}

// Human label for the day header: "Dziś" / "Wczoraj" / full weekday+date
export function dayLabel(dateObj, todayKey) {
  const key = dateKey(dateObj);
  if (key === todayKey) return "Dziś";
  if (key === addDays(todayKey, -1)) return "Wczoraj";
  const s = dateObj.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Counts how many completions a task has within a given year/month
export function monthlyCount(taskId, completions, y, m) {
  const prefix = `${y}-${pad(m + 1)}`;
  return (completions[taskId] || []).filter((d) => d.startsWith(prefix)).length;
}

// How many completions "should" happen in a given month, used as the denominator
// for the progress ring and the "count/target" display.
export function monthlyTarget(task, y, m, count) {
  if (task.kind === "oneoff") return 1;
  if (task.kind === "flexible") return Math.max(count, 1); // no fixed target — ring fills once anything is logged
  const rec = task.recurrence || { type: "daily" };
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  if (rec.type === "daily") return daysInMonth;
  if (rec.type === "weekdays") {
    let c = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if ((rec.days || []).includes(mondayIndex(new Date(y, m, d)))) c++;
    }
    return Math.max(c, 1);
  }
  // timesPerWeek: approximate using (days in month / 7) * weekly target
  return Math.max(Math.round((daysInMonth / 7) * (rec.timesPerWeek || 1)), 1);
}

// Current streak (consecutive scheduled days completed), walking backward from today.
// Today not being done yet does NOT break the streak — the day isn't "over" yet.
export function computeStreak(task, completions) {
  if (task.kind === "oneoff") return null; // streaks don't apply to one-off tasks
  const done = new Set(completions[task.id] || []);
  const cursor = new Date();
  let streak = 0;
  for (let i = 0; i < 3650; i++) { // 10-year safety cap, avoids any risk of an infinite loop
    if (isDueOnDate(task, cursor)) {
      const key = dateKey(cursor);
      if (done.has(key)) streak++;
      else if (i > 0) break; // missed a scheduled day (not counting today) — streak ends here
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Short recurrence description shown under a task's name in lists
export function kindLabel(task) {
  if (task.kind === "flexible") return "Bez terminu";
  if (task.kind === "oneoff") return task.dueDate ? `Termin: ${fmtShort(task.dueDate)}` : "Jednorazowe, bez terminu";
  const rec = task.recurrence || { type: "daily" };
  if (rec.type === "daily") return "Codziennie";
  if (rec.type === "weekdays") {
    if (!rec.days || rec.days.length === 0) return "Wybierz dni";
    return rec.days.slice().sort((a, b) => a - b).map((i) => DAY_LABELS[i]).join(" · ");
  }
  return `${rec.timesPerWeek || 1}× w tygodniu`;
}