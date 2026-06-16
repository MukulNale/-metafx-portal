"use client";
import { use, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { PROJECTS, type SubTask, type Status } from "@/lib/projects";
import { useAuth } from "@/lib/auth";
import { USERS } from "@/lib/users";

const STATUS_LABEL: Record<Status, string> = { todo: "To Do", "in-progress": "In Progress", review: "Review", done: "Done" };
const STATUS_STYLE: Record<Status, string> = {
  todo:         "bg-slate-100 text-slate-500",
  "in-progress":"bg-amber-50 text-amber-600",
  review:       "bg-blue-50 text-blue-500",
  done:         "bg-green-50 text-green-600",
};
const PRIORITY_STYLE: Record<string, string> = {
  high:   "bg-red-50 text-red-500",
  medium: "bg-amber-50 text-amber-500",
  low:    "bg-green-50 text-green-600",
};
const MEMBER_COLOR: Record<string, string> = {
  Mukul: "from-indigo-500 to-indigo-700", Suhas: "from-amber-500 to-amber-600",
  Rohan: "from-blue-500 to-blue-700", Anjali: "from-pink-500 to-pink-700", Anurag: "from-green-500 to-green-700",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const project = PROJECTS.find(p => p.id === id);
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: "", assignee: "", priority: "medium", due: "" });

  if (!project) return <div className="p-8 text-slate-400">Project not found.</div>;

  const allSubtasks = project.tasks.flatMap(t => t.subtasks);
  const done    = allSubtasks.filter(t => t.status === "done").length;
  const pct     = allSubtasks.length ? Math.round((done / allSubtasks.length) * 100) : 0;

  function handleAddTask(phaseId: string) {
    if (!newTask.title.trim() || !newTask.assignee) return;
    const phase = project!.tasks.find(t => t.id === phaseId);
    if (!phase) return;
    phase.subtasks.push({
      id: `st-${Date.now()}`,
      title: newTask.title,
      assignee: newTask.assignee,
      status: "todo",
      priority: newTask.priority as "high" | "medium" | "low",
      due: newTask.due || undefined,
    });
    setNewTask({ title: "", assignee: "", priority: "medium", due: "" });
    setShowAdd(null);
  }

  function cycleStatus(sub: SubTask) {
    if (user?.role !== "admin" && sub.assignee !== user?.name) return;
    const cycle: Status[] = ["todo", "in-progress", "review", "done"];
    const next = cycle[(cycle.indexOf(sub.status) + 1) % cycle.length];
    sub.status = next;
    // force re-render
    window.location.reload();
  }

  return (
    <AuthGuard>
      <Header title={project.name} />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">

        {/* Project header */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800 mb-1">{project.name}</h2>
              <p className="text-sm text-slate-400">{project.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-indigo-500">{pct}%</div>
              <div className="text-[11px] text-slate-400">complete</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex gap-5 mt-3 text-xs text-slate-400">
            <span>Lead: <span className="font-medium text-slate-600">{project.lead}</span></span>
            <span>{allSubtasks.length} tasks · {done} done</span>
            <span>Due {project.dueDate}</span>
          </div>
        </div>

        {/* Phases */}
        {project.tasks.map(phase => (
          <div key={phase.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
              <div>
                <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mr-2">{phase.phase}</span>
                <span className="font-semibold text-slate-700">{phase.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{phase.subtasks.filter(s => s.status === "done").length}/{phase.subtasks.length} done</span>
                {user?.role === "admin" && (
                  <button onClick={() => setShowAdd(showAdd === phase.id ? null : phase.id)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 cursor-pointer">
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Add task
                  </button>
                )}
              </div>
            </div>

            {/* Add task form */}
            {showAdd === phase.id && (
              <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex flex-wrap gap-2 items-end">
                <input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Task title" className="flex-1 min-w-[180px] px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400" />
                <select value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white">
                  <option value="">Assign to…</option>
                  {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input type="date" value={newTask.due} onChange={e => setNewTask({...newTask, due: e.target.value})}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white" />
                <button onClick={() => handleAddTask(phase.id)}
                  className="px-4 py-1.5 rounded-lg text-white text-sm font-medium cursor-pointer"
                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Add</button>
                <button onClick={() => setShowAdd(null)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 cursor-pointer">Cancel</button>
              </div>
            )}

            {/* Subtasks */}
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b border-slate-100">
                  <th className="text-left px-5 py-2 font-medium">Task</th>
                  <th className="text-left px-3 py-2 font-medium">Assigned to</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Priority</th>
                  <th className="text-left px-3 py-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {phase.subtasks.map(sub => (
                  <tr key={sub.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-medium text-slate-800">{sub.title}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${MEMBER_COLOR[sub.assignee] ?? "from-slate-400 to-slate-500"} flex items-center justify-center text-white text-[8px] font-bold`}>
                          {sub.assignee[0]}
                        </div>
                        <span className="text-[12px] text-slate-600">{sub.assignee}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => cycleStatus(sub)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${STATUS_STYLE[sub.status]}`}>
                        {STATUS_LABEL[sub.status]}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${PRIORITY_STYLE[sub.priority]}`}>{sub.priority}</span>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-slate-400">{sub.due ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </AuthGuard>
  );
}
