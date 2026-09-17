import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { api } from "../lib/api";
import type { Project, ProjectStatus, TaskPriority, TaskStatus, User } from "../types";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Shell({ onClose, title, sub, children }: { onClose: () => void; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fade absolute inset-0 bg-slate-900/45" onClick={onClose} />
      <div className="modal-rise relative w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div><h2 className="text-base font-bold text-slate-900">{title}</h2><p className="text-[13px] text-slate-500">{sub}</p></div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: { title: string; description: string; status: ProjectStatus; dueDate: string }) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [due, setDue] = useState(todayStr());
  return (
    <Shell onClose={onClose} title="New project" sub="Projects group related tasks and owners.">
      <form onSubmit={(e) => { e.preventDefault(); if (title.trim().length < 3) return; onCreate({ title: title.trim(), description: desc.trim() || "No description yet.", status, dueDate: due }); }} className="space-y-3">
        <label className="block text-[13px] font-medium text-slate-700">Project name<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Onboarding revamp" minLength={3} required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>
        <label className="block text-[13px] font-medium text-slate-700">Description<textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What is this project about?" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[13px] font-medium text-slate-700">Status<select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="active">Active</option><option value="completed">Completed</option><option value="on-hold">On hold</option></select></label>
          <label className="block text-[13px] font-medium text-slate-700">Due date<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-700">Create project</button>
        </div>
      </form>
    </Shell>
  );
}

export function NewTaskModal({ projects, members, defaultProjectId, onClose, onCreate, onCreateMany, onCreateTeam }: {
  projects: Project[]; members: User[]; defaultProjectId?: string; onClose: () => void;
  onCreate: (t: { projectId: string; title: string; description: string; status: TaskStatus; priority: TaskPriority; dueDate: string; assignee: string }) => void;
  onCreateMany: (t: { projectId: string; title: string; status: TaskStatus; priority: TaskPriority; dueDate: string; assignee: string }[]) => void;
  onCreateTeam: () => void;
}) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [due, setDue] = useState(todayStr());
  const [assignee, setAssignee] = useState("");
  const [aiTasks, setAiTasks] = useState<string[] | null>(null);
  const [aiSelected, setAiSelected] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === projectId);

  // Picking a different project invalidates any previous AI suggestions.
  useEffect(() => {
    setAiTasks(null);
    setAiSelected(new Set());
    setAiNote(null);
  }, [projectId]);

  const generateWithAi = async () => {
    if (!selectedProject || aiLoading) return;
    setAiLoading(true);
    setAiNote(null);
    try {
      const res = await api.aiGenerateTasks({ projectTitle: selectedProject.title, projectDescription: selectedProject.description });
      setAiTasks(res.tasks);
      setAiSelected(new Set(res.tasks));
      setAiNote(res.note ?? null);
    } catch (e) {
      setAiNote(e instanceof Error ? e.message : "Could not reach the AI service");
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAi = (task: string) => {
    setAiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(task)) next.delete(task);
      else next.add(task);
      return next;
    });
  };

  const addSelected = () => {
    const titles = aiTasks?.filter((t) => aiSelected.has(t)) ?? [];
    if (titles.length === 0) return;
    onCreateMany(titles.map((t) => ({ projectId, title: t, status, priority, dueDate: due, assignee })));
  };

  return (
    <Shell onClose={onClose} title="New task" sub="Tasks belong to a project and one owner.">
      <form onSubmit={(e) => { e.preventDefault(); if (title.trim().length < 3 || !projectId) return; onCreate({ projectId, title: title.trim(), description: desc.trim() || "No details yet.", status, priority, dueDate: due, assignee }); }} className="space-y-3">
        <label className="block text-[13px] font-medium text-slate-700">Project<select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>

        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-indigo-700">✨ AI task breakdown</p>
            <button type="button" onClick={generateWithAi} disabled={aiLoading || !selectedProject}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">
              {aiLoading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Sparkles size={12} />}
              {aiLoading ? "Generating…" : aiTasks ? "Regenerate" : "Generate"}
            </button>
          </div>
          {selectedProject && !aiTasks && !aiLoading && (
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">Auto-split “{selectedProject.title}” into a ready-made task list — no typing required.</p>
          )}
          {aiNote && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{aiNote}</p>}
          {aiTasks && (
            <div className="mt-2 space-y-1">
              {aiTasks.map((t) => (
                <label key={t} className="flex cursor-pointer items-start gap-2 rounded-lg bg-white px-2.5 py-2 text-left ring-1 ring-slate-100 hover:ring-indigo-200">
                  <input type="checkbox" checked={aiSelected.has(t)} onChange={() => toggleAi(t)} className="mt-0.5 accent-indigo-600" aria-label={t} />
                  <span className="text-[13px] leading-snug text-slate-700">{t}</span>
                </label>
              ))}
              <button type="button" onClick={addSelected} disabled={aiSelected.size === 0}
                className="mt-1.5 w-full rounded-lg bg-indigo-600 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">
                Add {aiSelected.size} selected {aiSelected.size === 1 ? "task" : "tasks"}
              </button>
              <p className="pt-0.5 text-center text-[10px] text-slate-400">Suggestions inherit this form's assignee, priority and due date.</p>
            </div>
          )}
        </div>

        <label className="block text-[13px] font-medium text-slate-700">Task title<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Write empty-state copy" minLength={3} required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>
        <label className="block text-[13px] font-medium text-slate-700">Details<textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" /></label>
        <label className="block text-[13px] font-medium text-slate-700">Assignee (team member)
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-[13px] font-medium text-slate-700">Status<select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="todo">To do</option><option value="in-progress">In progress</option><option value="review">Review</option><option value="done">Done</option></select></label>
          <label className="block text-[13px] font-medium text-slate-700">Priority<select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label className="block text-[13px] font-medium text-slate-700">Due<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" /></label>
        </div>
        {members.length === 0 && (
          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-600">
            No teammates yet — <button type="button" onClick={onCreateTeam} className="font-bold underline">create a team</button> first, then assign tasks to your members.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-500">Create task</button>
        </div>
      </form>
    </Shell>
  );
}

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows = [["/", "Focus search"], ["N", "New task"], ["P", "New project"], ["1 / 2 / 3", "Go to Dashboard / Projects / Tasks"], ["4 / 5 / 6", "Go to Profile / People / Chat"], ["Esc", "Close dialogs"] ];
  return (
    <Shell onClose={onClose} title="Keyboard shortcuts" sub="Work faster without the mouse.">
      <dl className="divide-y divide-slate-100">{rows.map(([k, d]) => (
        <div key={k} className="flex items-center justify-between py-2.5 text-sm">
          <dt className="text-slate-600">{d}</dt>
          <dd><kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">{k}</kbd></dd>
        </div>))}
      </dl>
    </Shell>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="fade fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2.5 text-[13px] font-medium text-white shadow-xl" role="status">{message}</div>;
}
