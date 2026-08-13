// Both modal ("bottom sheet") dialogs live here since they're small and
// closely related — both are full-screen overlays for editing app data.
import { useState } from "react";
import { X, Check, Pencil, Trash2, ChevronLeft, Plus } from "lucide-react";
import { Avatar } from "../ui";
import { RING_COLORS, EMOJI_CHOICES, DAY_LABELS, THEME, FONT } from "../theme";
import { dateKey } from "../utils";
import { EmptyState } from "../ui";

// ─────────────────────────────────────────────────────────
// CategoryManager — rename or delete categories. Deleting a category never
// deletes its tasks; they fall back to "Bez kategorii" instead.
// ─────────────────────────────────────────────────────────
export function CategoryManager({ categories, tasks, onRename, onDelete, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const countFor = (id) => tasks.filter((t) => t.categoryId === id).length;

  const startEdit = (c) => { setEditingId(c.id); setDraft(c.name); };
  const saveEdit = () => {
    if (draft.trim()) onRename(editingId, draft.trim());
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl px-5 pt-5 pb-8 overflow-y-auto" style={{ background: THEME.surfaceDark, border: "1px solid rgba(255,255,255,0.08)", fontFamily: FONT, maxHeight: "80vh" }}>
        <div className="flex items-center justify-between mb-5">
          <p className="font-semibold">Kategorie</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><X size={16} /></button>
        </div>

        {categories.length === 0 ? (
          <EmptyState text="Nie masz jeszcze żadnych kategorii. Dodasz je przy tworzeniu zadania." />
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {categories.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                {editingId === c.id ? (
                  <>
                    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      className="flex-1 rounded-lg px-3 py-1.5 text-sm rt-text rt-placeholder focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
                    <button onClick={saveEdit} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}><Check size={14}/></button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs rt-dim-40">{countFor(c.id)} zadań</p>
                    </div>
                    <button onClick={() => startEdit(c)} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><Pencil size={13} /></button>
                    <button onClick={() => setConfirmingDeleteId(c.id)} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(224,112,90,0.12)" }}><Trash2 size={13} color={THEME.danger} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {confirmingDeleteId && (
          <div className="rounded-2xl px-5 py-4 mt-3" style={{ background: "rgba(224,112,90,0.1)", border: "1px solid rgba(224,112,90,0.3)" }}>
            <p className="text-sm rt-text mb-3">Usunąć tę kategorię? Zadania w niej nie zostaną usunięte — przejdą do "Bez kategorii".</p>
            <div className="flex gap-2">
              <button onClick={() => { onDelete(confirmingDeleteId); setConfirmingDeleteId(null); }} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: THEME.danger, color: THEME.surfaceDark }}>Usuń</button>
              <button onClick={() => setConfirmingDeleteId(null)} className="flex-1 py-2 rounded-xl text-sm font-medium rt-text" style={{ background: "rgba(255,255,255,0.08)" }}>Anuluj</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TaskEditor — create or edit a single task: name, color, emoji, category,
// and its kind-specific schedule (recurring / flexible / one-off).
// All fields are local draft state; nothing is saved until "Save" is tapped.
// ─────────────────────────────────────────────────────────
export function TaskEditor({ task, categories, isNew, onCancel, onSave, onDelete, onAddCategory }) {
  const [name, setName] = useState(task.name);
  const [color, setColor] = useState(task.color);
  const [icon, setIcon] = useState(task.icon || "");
  const [customIcon, setCustomIcon] = useState("");
  const [categoryId, setCategoryId] = useState(task.categoryId || null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [kind, setKind] = useState(task.kind);
  const [type, setType] = useState(task.recurrence?.type || "daily");
  const [days, setDays] = useState(task.recurrence?.days || []);
  const [timesPerWeek, setTimesPerWeek] = useState(task.recurrence?.timesPerWeek || 3);
  const [dueDate, setDueDate] = useState(task.dueDate || dateKey(new Date()));
  const [hasDueDate, setHasDueDate] = useState(task.kind === "oneoff" ? !!task.dueDate : true);

  const toggleDay = (i) => setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  // Save is disabled until the form is in a valid state for the selected kind.
  // A one-off task is always valid — it either has a date, or explicitly has none.
  const canSave = name.trim().length > 0 && (kind !== "recurring" || type !== "weekdays" || days.length > 0);

  const confirmNewCategory = () => {
    if (!newCategoryName.trim()) { setAddingCategory(false); return; }
    const cat = onAddCategory(newCategoryName);
    setCategoryId(cat.id);
    setNewCategoryName("");
    setAddingCategory(false);
  };

  const handleSave = () => {
    const base = { ...task, name: name.trim(), color, icon: icon.trim(), categoryId, kind };
    // Only keep the fields relevant to the selected kind — avoids stale
    // `recurrence`/`dueDate` leftovers if the user switched kind mid-edit
    if (kind === "recurring") {
      base.recurrence = type === "weekdays" ? { type, days } : type === "timesPerWeek" ? { type, timesPerWeek } : { type: "daily" };
      delete base.dueDate;
    } else if (kind === "oneoff") {
      base.dueDate = hasDueDate ? dueDate : null; // null = "do it someday", no specific deadline
      delete base.recurrence;
    } else {
      delete base.recurrence;
      delete base.dueDate;
    }
    onSave(base);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl px-5 pt-5 pb-8 overflow-y-auto" style={{ background: THEME.surfaceDark, border: "1px solid rgba(255,255,255,0.08)", fontFamily: FONT, maxHeight: "88vh" }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}><ChevronLeft size={16} /></button>
          <p className="font-semibold">{isNew ? "Nowe zadanie" : "Edytuj zadanie"}</p>
          <button onClick={handleSave} disabled={!canSave} className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30" style={{ background: color }}><Check size={16} strokeWidth={3} /></button>
        </div>

        <div className="flex justify-center mb-5">
          <Avatar task={{ name, color, icon }} size={56} />
        </div>

        <label className="text-xs rt-dim-45 mb-1.5 block">Nazwa</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Tabletki"
          className="w-full rounded-xl px-4 py-3 mb-5 rt-text rt-placeholder focus:outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }} />

        <label className="text-xs rt-dim-45 mb-2 block">Kolor</label>
        <div className="flex gap-2.5 mb-5">
          {RING_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${THEME.surfaceDark}, 0 0 0 4px ${c}` : "none" }}>
              {color === c && <Check size={14} strokeWidth={3} />}
            </button>
          ))}
        </div>

        <label className="text-xs rt-dim-45 mb-2 block">Symbol / emotka</label>
        <div className="grid grid-cols-8 gap-1.5 mb-2">
          {EMOJI_CHOICES.map((e) => (
            <button key={e} onClick={() => setIcon(icon === e ? "" : e)} className="aspect-square rounded-lg flex items-center justify-center text-base"
              style={{ background: icon === e ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)" }}>
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          <input value={customIcon} onChange={(e) => setCustomIcon(e.target.value.slice(0, 2))} placeholder="własna emotka"
            className="flex-1 rounded-xl px-3 py-2 text-sm rt-text rt-placeholder focus:outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }} />
          <button onClick={() => { if (customIcon) { setIcon(customIcon); setCustomIcon(""); } }} className="px-4 rounded-xl text-xs font-medium" style={{ background: "rgba(255,255,255,0.1)" }}>Ustaw</button>
        </div>

        <label className="text-xs rt-dim-45 mb-2 block">Kategoria</label>
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setCategoryId(null)} className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: categoryId === null ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)", color: categoryId === null ? THEME.text : "rgba(242,245,243,0.5)" }}>
            Bez kategorii
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)} className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: categoryId === c.id ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)", color: categoryId === c.id ? THEME.text : "rgba(242,245,243,0.5)" }}>
              {c.name}
            </button>
          ))}
          {addingCategory ? (
            <div className="flex items-center gap-1">
              <input autoFocus value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmNewCategory()} placeholder="nazwa"
                className="w-24 rounded-full px-3 py-1.5 text-xs rt-text rt-placeholder focus:outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
              <button onClick={confirmNewCategory} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}><Check size={12} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingCategory(true)} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(242,245,243,0.5)" }}>
              <Plus size={11} /> Nowa
            </button>
          )}
        </div>

        <label className="text-xs rt-dim-45 mb-2 block">Typ zadania</label>
        <div className="flex rounded-xl p-1 mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
          {[["recurring", "Powtarzające"], ["flexible", "Bez terminu"], ["oneoff", "Jednorazowe"]].map(([key, label]) => (
            <button key={key} onClick={() => setKind(key)} className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: kind === key ? "rgba(255,255,255,0.12)" : "transparent", color: kind === key ? THEME.text : "rgba(242,245,243,0.45)" }}>
              {label}
            </button>
          ))}
        </div>

        {kind === "recurring" && (
          <>
            <label className="text-xs rt-dim-45 mb-2 block">Częstotliwość</label>
            <div className="flex rounded-xl p-1 mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
              {[["daily", "Codziennie"], ["weekdays", "Dni tyg."], ["timesPerWeek", "X / tydzień"]].map(([key, label]) => (
                <button key={key} onClick={() => setType(key)} className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: type === key ? "rgba(255,255,255,0.12)" : "transparent", color: type === key ? THEME.text : "rgba(242,245,243,0.45)" }}>
                  {label}
                </button>
              ))}
            </div>
            {type === "weekdays" && (
              <div className="flex gap-1.5 mb-6 justify-between">
                {DAY_LABELS.map((label, i) => (
                  <button key={i} onClick={() => toggleDay(i)} className="w-9 h-9 rounded-full text-xs font-medium"
                    style={{ background: days.includes(i) ? color : "rgba(255,255,255,0.06)", color: days.includes(i) ? THEME.surfaceDark : "rgba(242,245,243,0.5)" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {type === "timesPerWeek" && (
              <div className="flex items-center justify-between mb-6 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                <span className="text-sm rt-dim-70">Razy w tygodniu</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setTimesPerWeek((n) => Math.max(1, n - 1))} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>–</button>
                  <span className="w-4 text-center font-semibold">{timesPerWeek}</span>
                  <button onClick={() => setTimesPerWeek((n) => Math.min(7, n + 1))} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>+</button>
                </div>
              </div>
            )}
          </>
        )}

        {kind === "flexible" && (
          <p className="text-xs rt-dim-40 mb-6 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.05)" }}>
            To zadanie nie ma ustalonego harmonogramu — będzie widoczne w zakładce Dziś każdego dnia, a Ty odhaczasz je, kiedy je zrobisz.
          </p>
        )}

        {kind === "oneoff" && (
          <>
            <label className="text-xs rt-dim-45 mb-2 block">Termin</label>
            <div className="flex rounded-xl p-1 mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
              <button onClick={() => setHasDueDate(true)} className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: hasDueDate ? "rgba(255,255,255,0.12)" : "transparent", color: hasDueDate ? THEME.text : "rgba(242,245,243,0.45)" }}>
                Konkretna data
              </button>
              <button onClick={() => setHasDueDate(false)} className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: !hasDueDate ? "rgba(255,255,255,0.12)" : "transparent", color: !hasDueDate ? THEME.text : "rgba(242,245,243,0.45)" }}>
                Bez terminu
              </button>
            </div>
            {hasDueDate ? (
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl px-4 py-3 mb-6 rt-text focus:outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", colorScheme: "dark" }} />
            ) : (
              <p className="text-xs rt-dim-40 mb-6 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.05)" }}>
                Zadanie do zrobienia raz, kiedykolwiek — będzie widoczne w zakładce Dziś, dopóki go nie odhaczysz.
              </p>
            )}
          </>
        )}

        {!isNew && (
          <button onClick={() => onDelete(task.id)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium mt-2" style={{ background: "rgba(224,112,90,0.12)", color: THEME.danger }}>
            <Trash2 size={15} /> Usuń zadanie
          </button>
        )}
      </div>
    </div>
  );
}