// App — top-level state and wiring. Owns all data (tasks, completions,
// categories) and persistence; each tab/view below is a "dumb" component
// that just renders what it's given and calls back up through props.
import { useState, useEffect, useCallback, useRef } from "react";
import { CalendarDays, ListChecks, BarChart3 } from "lucide-react";

import { storage } from "./storage";
import { THEME, FONT, RING_COLORS } from "./theme";
import { dateKey } from "./utils";
import { TabButton } from "./ui";

import TodayView from "./views/TodayView";
import TasksView from "./views/TasksView";
import StatsView from "./views/StatsView";
import { TaskEditor, CategoryManager } from "./views/modals";

export default function ReminderTracker() {
  // ── Core data, loaded once from storage on mount ──────────────────
  const [tasks, setTasks] = useState(null);
  const [completions, setCompletions] = useState(null);
  const [categories, setCategories] = useState(null);

  // ── Navigation ──────────────────────────────────────────────────
  const [view, setView] = useState("today");
  const VIEW_ORDER = ["today", "tasks", "stats"];

  // Swipe-to-switch-tabs: track touch start, compare to touch end on release.
  // Horizontal swipes past a distance/angle threshold change the active tab.
  const touchRef = useRef({ x: 0, y: 0 });
  const handleTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (editing || showCategoryManager) return; // don't hijack swipes while a modal is open
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // too short, or more vertical than horizontal
    const idx = VIEW_ORDER.indexOf(view);
    if (dx < 0 && idx < VIEW_ORDER.length - 1) setView(VIEW_ORDER[idx + 1]); // swipe left -> next tab
    if (dx > 0 && idx > 0) setView(VIEW_ORDER[idx - 1]); // swipe right -> previous tab
  };

  // ── Modal state ─────────────────────────────────────────────────
  const [editing, setEditing] = useState(null); // task being added/edited, or null
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // ── UI feedback ─────────────────────────────────────────────────
  const [saveError, setSaveError] = useState("");
  const [dataMessage, setDataMessage] = useState("");

  const today = new Date();
  const [statsMonth, setStatsMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });

  // Load everything once on mount. Each key is loaded independently so a
  // missing/corrupt one key doesn't block the others.
  useEffect(() => {
    (async () => {
      let t = [], c = {}, cat = [];
      try { const r = await storage.get("tasks", false); if (r?.value) t = JSON.parse(r.value); } catch {}
      try { const r = await storage.get("completions", false); if (r?.value) c = JSON.parse(r.value); } catch {}
      try { const r = await storage.get("categories", false); if (r?.value) cat = JSON.parse(r.value); } catch {}
      setTasks(t); setCompletions(c); setCategories(cat);
    })();
  }, []);

  // Generic persist helper: updates local state immediately (optimistic),
  // then writes through to storage; surfaces an error message if the write fails.
  const persist = useCallback(async (key, value, setter) => {
    setter(value);
    try {
      const res = await storage.set(key, JSON.stringify(value), false);
      if (!res) setSaveError("Nie udało się zapisać zmian.");
    } catch { setSaveError("Nie udało się zapisać zmian."); }
  }, []);

  const persistTasks = (next) => persist("tasks", next, setTasks);
  const persistCompletions = (next) => persist("completions", next, setCompletions);
  const persistCategories = (next) => persist("categories", next, setCategories);

  // Toggle a task's completion for an arbitrary date (used by both "today"
  // and past-day editing in TodayView).
  const toggleOnDate = (taskId, dateKeyStr) => {
    const list = completions[taskId] || [];
    const next = list.includes(dateKeyStr) ? list.filter((d) => d !== dateKeyStr) : [...list, dateKeyStr];
    persistCompletions({ ...completions, [taskId]: next });
  };

  const saveTask = (task) => {
    const exists = tasks.some((t) => t.id === task.id);
    const next = exists ? tasks.map((t) => (t.id === task.id ? task : t)) : [...tasks, task];
    persistTasks(next);
    setEditing(null);
  };

  const addCategory = (name) => {
    const cat = { id: crypto.randomUUID(), name: name.trim() };
    persistCategories([...categories, cat]);
    return cat; // returned so the caller (TaskEditor) can immediately select it
  };

  const renameCategory = (id, name) => {
    persistCategories(categories.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const deleteCategory = (id) => {
    persistCategories(categories.filter((c) => c.id !== id));
    // Tasks in the deleted category fall back to uncategorized, never deleted
    persistTasks(tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)));
  };

  const deleteTask = (id) => {
    persistTasks(tasks.filter((t) => t.id !== id));
    const nextC = { ...completions };
    delete nextC[id];
    persistCompletions(nextC);
    setEditing(null);
  };

  // ── Backup: export/import as JSON ──────────────────────────────
  const [pendingImport, setPendingImport] = useState(null); // parsed file awaiting user confirmation

  const exportData = () => {
    const payload = { tasks, completions, categories, exportedAt: new Date().toISOString(), version: 2 };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sledzenie-zadan-kopia-${dateKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDataMessage("Wyeksportowano dane do pliku.");
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.tasks) || typeof parsed.completions !== "object" || !Array.isArray(parsed.categories)) {
          throw new Error("bad shape");
        }
        setDataMessage("");
        setPendingImport(parsed); // don't apply yet — wait for explicit confirmation
      } catch {
        setDataMessage("Ten plik nie wygląda na poprawną kopię zapasową.");
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    persistTasks(pendingImport.tasks);
    persistCompletions(pendingImport.completions);
    persistCategories(pendingImport.categories);
    setDataMessage("Zaimportowano dane z pliku.");
    setPendingImport(null);
  };

  const cancelImport = () => setPendingImport(null);

  const todayKey = dateKey(today);

  if (tasks === null || completions === null || categories === null) {
    return <div style={{ background: `linear-gradient(160deg,${THEME.bg1} 0%,${THEME.bg2} 55%,${THEME.bg3} 100%)` }} className="min-h-screen flex items-center justify-center text-white/50 text-sm">Wczytywanie…</div>;
  }

  return (
    <div style={{ background: `linear-gradient(160deg,${THEME.bg1} 0%,${THEME.bg2} 55%,${THEME.bg3} 100%)`, fontFamily: FONT, color: THEME.text }} className="min-h-screen w-full flex flex-col">
      {/* Global CSS classes for text colors — plain CSS (not Tailwind arbitrary
          values) so they render correctly in every environment. */}
      <style>{`
        .rt-text { color: ${THEME.text}; }
        .rt-dim-70 { color: rgba(242,245,243,0.70); }
        .rt-dim-45 { color: rgba(242,245,243,0.45); }
        .rt-dim-40 { color: rgba(242,245,243,0.40); }
        .rt-dim-35 { color: rgba(242,245,243,0.35); }
        .rt-dim-30 { color: rgba(242,245,243,0.30); }
        .rt-danger { color: ${THEME.danger}; }
        .rt-accent { color: ${THEME.accent}; }
        .rt-placeholder::placeholder { color: rgba(242,245,243,0.30); }
      `}</style>
      <div className="flex-1 max-w-md w-full mx-auto px-5 pt-8 pb-28" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {view === "today" && (
          <TodayView tasks={tasks} completions={completions} todayKey={todayKey}
            onToggle={toggleOnDate} onEdit={(t) => setEditing(t)} />
        )}
        {view === "tasks" && (
          <TasksView tasks={tasks} categories={categories} completions={completions}
            onAdd={() => setEditing({ id: crypto.randomUUID(), name: "", color: RING_COLORS[0], icon: "", categoryId: null, kind: "recurring", recurrence: { type: "daily" } })}
            onEdit={(t) => setEditing(t)}
            onExport={exportData}
            onImport={importData}
            dataMessage={dataMessage}
            pendingImport={pendingImport}
            onConfirmImport={confirmImport}
            onCancelImport={cancelImport}
            onManageCategories={() => setShowCategoryManager(true)} />
        )}
        {view === "stats" && (
          <StatsView tasks={tasks} completions={completions} statsMonth={statsMonth} setStatsMonth={setStatsMonth}
            today={today} />
        )}
        {saveError && <p className="mt-4 text-center text-xs rt-danger">{saveError}</p>}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 flex justify-center pb-6 pt-3" style={{ background: "linear-gradient(to top, rgba(5,10,8,0.95), rgba(5,10,8,0))" }}>
        <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <TabButton active={view === "today"} onClick={() => setView("today")} icon={<CalendarDays size={16} />} label="Dziś" />
          <TabButton active={view === "tasks"} onClick={() => setView("tasks")} icon={<ListChecks size={16} />} label="Zadania" />
          <TabButton active={view === "stats"} onClick={() => setView("stats")} icon={<BarChart3 size={16} />} label="Statystyki" />
        </div>
      </nav>

      {editing && (
        <TaskEditor task={editing} categories={categories} isNew={!tasks.some((t) => t.id === editing.id)}
          onCancel={() => setEditing(null)} onSave={saveTask} onDelete={deleteTask} onAddCategory={addCategory} />
      )}

      {showCategoryManager && (
        <CategoryManager categories={categories} tasks={tasks}
          onRename={renameCategory} onDelete={deleteCategory} onClose={() => setShowCategoryManager(false)} />
      )}
    </div>
  );
}