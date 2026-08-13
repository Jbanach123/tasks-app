// "Zadania" (Tasks) tab — manage all tasks, grouped by category, plus a
// backup section for exporting/importing all app data as JSON.
import { Plus, Settings2, Download, Upload } from "lucide-react";
import { Avatar, KindIcon, EmptyState } from "../ui";
import { kindLabel } from "../utils";
import { THEME } from "../theme";

export default function TasksView({ tasks, categories, completions, onAdd, onEdit, onExport, onImport, dataMessage, pendingImport, onConfirmImport, onCancelImport, onManageCategories }) {
  // "__none__" is a synthetic bucket id for tasks without a category, always shown last
  const groupsOrder = [...categories.map((c) => c.id), "__none__"];
  const groupLabel = (id) => (id === "__none__" ? "Bez kategorii" : categories.find((c) => c.id === id)?.name || "Bez kategorii");
  // A completed one-off task is "done" for good — hide it here so the list only
  // shows tasks that still need action. It stays visible in Statystyki, just not here.
  const visibleTasks = tasks.filter((t) => t.kind !== "oneoff" || (completions[t.id] || []).length === 0);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Zadania</h1>
        <div className="flex items-center gap-2">
          <button onClick={onManageCategories} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <Settings2 size={16} />
          </button>
          <button onClick={onAdd} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <Plus size={18} />
          </button>
        </div>
      </div>
      {visibleTasks.length === 0 ? (
        <EmptyState text="Nie masz jeszcze żadnych zadań. Dotknij +, aby dodać pierwsze." />
      ) : (
        groupsOrder.map((gid) => {
          const list = visibleTasks.filter((t) => (t.categoryId || "__none__") === gid);
          if (list.length === 0) return null; // skip empty category sections entirely
          return (
            <div key={gid} className="mb-5">
              <p className="text-xs rt-dim-40 mb-2 px-1">{groupLabel(gid)}</p>
              <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {list.map((t, i) => (
                  <div key={t.id} className="flex items-center" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={() => onEdit(t)} className="flex-1 min-w-0 flex items-center gap-3.5 px-5 py-4 text-left">
                      <Avatar task={t} size={38} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{t.name || "Bez nazwy"}</p>
                        <p className="text-xs rt-dim-40 flex items-center gap-1 mt-0.5"><KindIcon task={t} />{kindLabel(t)}</p>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Backup: export writes the current tasks/completions/categories to a
          downloadable JSON file; import reads one back in (with confirmation,
          since it fully replaces current data). */}
      <div className="mt-2">
        <p className="text-xs rt-dim-40 mb-2 px-1">Kopia zapasowa</p>
        <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={onExport} className="w-full flex items-center gap-3.5 px-5 py-4 text-left" style={{ borderTop: "none" }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><Download size={16} /></span>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Eksportuj dane</p>
              <p className="text-xs rt-dim-40 mt-0.5">Zapisz wszystko do pliku .json</p>
            </div>
          </button>
          <label className="w-full flex items-center gap-3.5 px-5 py-4 text-left cursor-pointer" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><Upload size={16} /></span>
            <div className="flex-1 min-w-0">
              <p className="font-medium">Importuj dane</p>
              <p className="text-xs rt-dim-40 mt-0.5">Wczytaj plik .json z kopii zapasowej</p>
            </div>
            <input type="file" accept="application/json" className="hidden" onChange={(e) => { if (e.target.files[0]) onImport(e.target.files[0]); e.target.value = ""; }} />
          </label>
        </div>
        {dataMessage && <p className="text-xs rt-dim-45 mt-2 px-1">{dataMessage}</p>}
        {pendingImport && (
          <div className="rounded-2xl px-5 py-4 mt-3" style={{ background: "rgba(224,112,90,0.1)", border: "1px solid rgba(224,112,90,0.3)" }}>
            <p className="text-sm rt-text mb-3">To zastąpi obecne dane ({pendingImport.tasks.length} zadań) zawartością pliku. Kontynuować?</p>
            <div className="flex gap-2">
              <button onClick={onConfirmImport} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: THEME.danger, color: THEME.surfaceDark }}>Tak, zastąp</button>
              <button onClick={onCancelImport} className="flex-1 py-2 rounded-xl text-sm font-medium rt-text" style={{ background: "rgba(255,255,255,0.08)" }}>Anuluj</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}