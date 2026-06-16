"use client";
import { use, useState, useRef, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useProjects } from "@/lib/projectsContext";
import { type SubTask, type Status, type Task, type Project } from "@/lib/projects";
import { USERS } from "@/lib/users";

const STATUS_OPTIONS: Status[] = ["todo", "in-progress", "review", "done"];
const STATUS_LABEL: Record<Status, string> = { todo: "To Do", "in-progress": "In Progress", review: "Review", done: "Done" };
const STATUS_STYLE: Record<Status, string> = {
  todo:          "bg-slate-700 text-slate-300",
  "in-progress": "bg-amber-500/20 text-amber-400",
  review:        "bg-blue-500/20 text-blue-400",
  done:          "bg-green-500/20 text-green-400",
};
const PRIORITY_STYLE: Record<string, string> = {
  high:   "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low:    "bg-green-500/20 text-green-400",
};
const MEMBER_COLOR: Record<string, string> = {
  Mukul: "from-indigo-500 to-indigo-700", Suhas: "from-amber-500 to-amber-600",
  Rohan: "from-blue-500 to-blue-700", Anjali: "from-pink-500 to-pink-700", Anurag: "from-green-500 to-green-700",
};

const BLANK_TASK = { title: "", assignee: "", priority: "medium", due: "" };

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { projects, saveProject } = useProjects();

  // Keep a local working copy; sync to context (→ localStorage) on every mutation
  const [proj, setProj] = useState<Project | null>(null);

  useEffect(() => {
    const found = projects.find(p => p.id === id);
    if (found) setProj(deepClone(found));
  }, [id]); // intentionally only on mount — we own the state after that

  const sectionInputRef = useRef<HTMLInputElement>(null);

  const [showAdd, setShowAdd]               = useState<string | null>(null);
  const [newTask, setNewTask]               = useState({ ...BLANK_TASK });
  const [editTask, setEditTask]             = useState<{ sectionId: string; task: SubTask } | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle]     = useState("");
  const [editingName, setEditingName]       = useState(false);
  const [nameDraft, setNameDraft]           = useState("");
  const [editingDesc, setEditingDesc]       = useState(false);
  const [descDraft, setDescDraft]           = useState("");

  if (!proj) return <div className="p-8 text-slate-400">Project not found.</div>;

  // Persist helper — update local state and push to context/localStorage
  function update(next: Project) {
    setProj(next);
    saveProject(next);
  }

  const allSubtasks = proj!.tasks.flatMap(t => t.subtasks);
  const done = allSubtasks.filter(t => t.status === "done").length;
  const pct  = allSubtasks.length ? Math.round((done / allSubtasks.length) * 100) : 0;

  // ── Project name / description ──
  function saveName() {
    if (nameDraft.trim()) update({ ...proj!, name: nameDraft.trim() });
    setEditingName(false);
  }
  function saveDesc() {
    update({ ...proj!, description: descDraft.trim() });
    setEditingDesc(false);
  }

  // ── Section helpers ──
  function startEditSection(section: Task) {
    setEditingSection(section.id);
    setSectionTitle(section.title);
    setTimeout(() => sectionInputRef.current?.focus(), 50);
  }
  function saveSection(sectionId: string) {
    if (!sectionTitle.trim()) { setEditingSection(null); return; }
    update({ ...proj!, tasks: proj!.tasks.map(t => t.id === sectionId ? { ...t, title: sectionTitle.trim() } : t) });
    setEditingSection(null);
  }
  function deleteSection(sectionId: string) {
    update({ ...proj!, tasks: proj!.tasks.filter(t => t.id !== sectionId) });
  }
  function addSection() {
    const newSection: Task = { id: `section-${Date.now()}`, title: "New Section", subtasks: [] };
    const next = { ...proj!, tasks: [...proj!.tasks, newSection] };
    update(next);
    setTimeout(() => {
      setEditingSection(newSection.id);
      setSectionTitle(newSection.title);
      setTimeout(() => sectionInputRef.current?.focus(), 50);
    }, 30);
  }

  // ── Subtask helpers ──
  function withSection(sectionId: string, fn: (tasks: SubTask[]) => SubTask[]): Project {
    return { ...proj!, tasks: proj!.tasks.map(t => t.id === sectionId ? { ...t, subtasks: fn(t.subtasks) } : t) };
  }
  function addTask(sectionId: string) {
    if (!newTask.title.trim() || !newTask.assignee) return;
    const sub: SubTask = { id: `st-${Date.now()}`, title: newTask.title, assignee: newTask.assignee, status: "todo", priority: newTask.priority as "high"|"medium"|"low", due: newTask.due || undefined };
    update(withSection(sectionId, tasks => [...tasks, sub]));
    setNewTask({ ...BLANK_TASK });
    setShowAdd(null);
  }
  function deleteTask(sectionId: string, taskId: string) {
    update(withSection(sectionId, tasks => tasks.filter(s => s.id !== taskId)));
  }
  function saveEdit() {
    if (!editTask) return;
    update(withSection(editTask.sectionId, tasks => tasks.map(s => s.id === editTask.task.id ? { ...editTask.task } : s)));
    setEditTask(null);
  }
  function cycleStatus(sectionId: string, sub: SubTask) {
    const next = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(sub.status) + 1) % STATUS_OPTIONS.length];
    update(withSection(sectionId, tasks => tasks.map(s => s.id === sub.id ? { ...s, status: next } : s)));
  }

  return (
    <AuthGuard>
      <Header title={proj!.name} />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">

        {/* Project header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Editable project name */}
              {editingName ? (
                <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  className="text-lg font-bold text-white bg-slate-800 border border-indigo-500 rounded-lg px-2 py-0.5 outline-none w-full max-w-xs mb-1" />
              ) : (
                <div className="flex items-center gap-2 group mb-1">
                  <h2 className="text-lg font-bold text-white">{proj!.name}</h2>
                  <button onClick={() => { setNameDraft(proj!.name); setEditingName(true); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-indigo-400 transition-opacity cursor-pointer">
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M14.5 3.5l2 2L6 16H4v-2L14.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              )}
              {/* Editable description */}
              {editingDesc ? (
                <textarea autoFocus value={descDraft} onChange={e => setDescDraft(e.target.value)}
                  onBlur={saveDesc}
                  onKeyDown={e => { if (e.key === "Escape") setEditingDesc(false); }}
                  rows={2}
                  className="w-full text-sm text-slate-300 bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1 outline-none resize-none" />
              ) : (
                <div className="flex items-start gap-2 group">
                  <p className="text-sm text-slate-400 flex-1">{proj!.description || <span className="text-slate-600 italic">No description — click to add</span>}</p>
                  <button onClick={() => { setDescDraft(proj!.description); setEditingDesc(true); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-indigo-400 transition-opacity cursor-pointer flex-shrink-0 mt-0.5">
                    <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M14.5 3.5l2 2L6 16H4v-2L14.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-indigo-400">{pct}%</div>
              <div className="text-[11px] text-slate-500">complete</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex gap-5 mt-3 text-xs text-slate-500">
            <span>Lead: <span className="text-slate-300">{proj!.lead}</span></span>
            <span>{allSubtasks.length} tasks · {done} done</span>
          </div>
        </div>

        {/* Empty state */}
        {proj!.tasks.length === 0 && (
          <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl py-14 text-center">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-slate-400 font-medium mb-1">No sections yet</div>
            <div className="text-slate-600 text-sm mb-4">Add a section to start organising tasks</div>
            <button onClick={addSection}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Add first section
            </button>
          </div>
        )}

        {/* Sections */}
        {proj!.tasks.map(section => (
          <div key={section.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800 bg-slate-800/50">
              {editingSection === section.id ? (
                <input ref={sectionInputRef} value={sectionTitle}
                  onChange={e => setSectionTitle(e.target.value)}
                  onBlur={() => saveSection(section.id)}
                  onKeyDown={e => { if (e.key === "Enter") saveSection(section.id); if (e.key === "Escape") setEditingSection(null); }}
                  className="flex-1 font-semibold text-white bg-slate-800 border border-indigo-500 rounded-lg px-2 py-0.5 text-sm outline-none" />
              ) : (
                <div className="flex items-center gap-1.5 flex-1 min-w-0 group">
                  <span className="font-semibold text-slate-200">{section.title}</span>
                  <button onClick={() => startEditSection(section)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-indigo-400 transition-opacity cursor-pointer flex-shrink-0" title="Rename">
                    <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M14.5 3.5l2 2L6 16H4v-2L14.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                <span className="text-xs text-slate-500">{section.subtasks.filter(s => s.status === "done").length}/{section.subtasks.length} done</span>
                <button onClick={() => { setShowAdd(showAdd === section.id ? null : section.id); setNewTask({ ...BLANK_TASK }); }}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Add task
                </button>
                <button onClick={() => deleteSection(section.id)}
                  className="p-1 rounded text-slate-700 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors" title="Delete section">
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 6v10h6V6H7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>

            {showAdd === section.id && (
              <div className="px-5 py-3 bg-indigo-500/5 border-b border-slate-800 flex flex-wrap gap-2 items-end">
                <input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                  onKeyDown={e => e.key === "Enter" && addTask(section.id)}
                  autoFocus placeholder="Task title"
                  className="flex-1 min-w-[180px] px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 outline-none focus:border-indigo-500" />
                <select value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})}
                  className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-indigo-500">
                  <option value="">Assign to…</option>
                  {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}
                  className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-indigo-500">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input type="date" value={newTask.due} onChange={e => setNewTask({...newTask, due: e.target.value})}
                  className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white outline-none focus:border-indigo-500" />
                <button onClick={() => addTask(section.id)}
                  className="px-4 py-1.5 rounded-lg text-white text-sm font-medium cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Add</button>
                <button onClick={() => setShowAdd(null)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 cursor-pointer">Cancel</button>
              </div>
            )}

            {section.subtasks.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-600 text-center">No tasks yet — click &quot;Add task&quot; to get started.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-slate-600 border-b border-slate-800">
                    <th className="text-left px-5 py-2 font-medium">Task</th>
                    <th className="text-left px-3 py-2 font-medium">Assigned to</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Priority</th>
                    <th className="text-left px-3 py-2 font-medium">Due</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {section.subtasks.map(sub => (
                    <tr key={sub.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors group">
                      <td className="px-5 py-3 text-[13px] font-medium text-slate-200">{sub.title}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${MEMBER_COLOR[sub.assignee] ?? "from-slate-600 to-slate-700"} flex items-center justify-center text-white text-[8px] font-bold`}>
                            {sub.assignee[0]}
                          </div>
                          <span className="text-[12px] text-slate-400">{sub.assignee}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => cycleStatus(section.id, sub)}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${STATUS_STYLE[sub.status]}`}>
                          {STATUS_LABEL[sub.status]}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${PRIORITY_STYLE[sub.priority]}`}>{sub.priority}</span>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-slate-500">{sub.due ?? "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditTask({ sectionId: section.id, task: { ...sub } })}
                            className="p-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer transition-colors" title="Edit">
                            <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M14.5 3.5l2 2L6 16H4v-2L14.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button onClick={() => deleteTask(section.id, sub.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors" title="Delete">
                            <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 6v10h6V6H7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}

        {proj!.tasks.length > 0 && (
          <button onClick={addSection}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-700 text-sm text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors w-full cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Add section
          </button>
        )}
      </div>

      {/* Edit Task Modal */}
      {editTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-white text-base mb-4">Edit Task</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                <input value={editTask.task.title} onChange={e => setEditTask({...editTask, task: {...editTask.task, title: e.target.value}})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Assigned to</label>
                <select value={editTask.task.assignee} onChange={e => setEditTask({...editTask, task: {...editTask.task, assignee: e.target.value}})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                  {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                  <select value={editTask.task.status} onChange={e => setEditTask({...editTask, task: {...editTask.task, status: e.target.value as Status}})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <select value={editTask.task.priority} onChange={e => setEditTask({...editTask, task: {...editTask.task, priority: e.target.value as "high"|"medium"|"low"}})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
                <input type="date" value={editTask.task.due ?? ""} onChange={e => setEditTask({...editTask, task: {...editTask.task, due: e.target.value}})}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveEdit}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium cursor-pointer"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Save Changes</button>
              <button onClick={() => setEditTask(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 bg-slate-800 cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
