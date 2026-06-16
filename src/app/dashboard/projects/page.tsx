"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useProjects } from "@/lib/projectsContext";
import { type Project } from "@/lib/projects";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-green-500/20 text-green-400",
  planning:  "bg-amber-500/20 text-amber-400",
  completed: "bg-indigo-500/20 text-indigo-400",
  "on-hold": "bg-slate-700 text-slate-400",
};
const MEMBER_COLOR: Record<string, string> = {
  Mukul: "from-indigo-500 to-indigo-700", Suhas: "from-amber-500 to-amber-600",
  Rohan: "from-blue-500 to-blue-700", Anjali: "from-pink-500 to-pink-700", Anurag: "from-green-500 to-green-700",
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const { projects, addProject, deleteProject } = useProjects();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  function handleAdd() {
    if (!form.name.trim()) return;
    const newProj: Project = {
      id: `${form.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      status: "planning",
      progress: 0,
      lead: user?.name ?? "",
      members: [user?.name ?? ""],
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      tasks: [], // starts completely empty
    };
    addProject(newProj);
    setShowModal(false);
    setForm({ name: "", description: "" });
  }

  return (
    <AuthGuard>
      <Header title="Projects" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">

        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-slate-500">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            New Project
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-3xl">
          {projects.map(p => {
            const allTasks = p.tasks.flatMap(t => t.subtasks);
            const done = allTasks.filter(t => t.status === "done").length;
            const pct  = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;
            return (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{p.name}</h3>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                    </div>
                    {p.description && <p className="text-sm text-slate-400 leading-relaxed">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/dashboard/projects/${p.id}`}
                      className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                      Open →
                    </Link>
                    <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id); }}
                      className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors" title="Delete project">
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M8 6V4h4v2M7 6v10h6V6H7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 flex-shrink-0">{pct}%</span>
                </div>
                <div className="flex items-center gap-5 text-xs text-slate-500">
                  <span>Lead: <span className="text-slate-300">{p.lead}</span></span>
                  <span>{allTasks.length} tasks · {done} done</span>
                </div>
                {p.members.length > 0 && (
                  <div className="flex items-center gap-1 mt-3">
                    {p.members.map(m => (
                      <div key={m} className={`w-6 h-6 rounded-full bg-gradient-to-br ${MEMBER_COLOR[m] ?? "from-slate-600 to-slate-700"} flex items-center justify-center text-white text-[9px] font-bold`} title={m}>
                        {m[0]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Project Modal — no due date field */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-white text-base mb-1">New Project</h2>
            <p className="text-xs text-slate-500 mb-4">You can add sections and tasks after creating the project.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Project Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder="e.g. Bagulbua Season 2"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description <span className="text-slate-600">(optional)</span></label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={3} placeholder="What is this project about?"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAdd}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium cursor-pointer"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                Create Project
              </button>
              <button onClick={() => { setShowModal(false); setForm({ name: "", description: "" }); }}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 bg-slate-800 cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
