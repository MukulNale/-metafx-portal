"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { type Status } from "@/lib/projects";
import { useAuth } from "@/lib/auth";
import { useProjects } from "@/lib/projectsContext";

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

export default function TasksPage() {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [filter, setFilter] = useState<"all" | "mine">("mine");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const allTasks = projects.flatMap(p =>
    p.tasks.flatMap(phase =>
      phase.subtasks.map(sub => ({ ...sub, project: p.name, phase: phase.title }))
    )
  );

  const filtered = allTasks.filter(t => {
    if (filter === "mine" && !t.assignees?.includes(user?.name ?? "")) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <AuthGuard>
      <Header title="Tasks" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {(["mine", "all"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer capitalize
                  ${filter === f ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}`}>
                {f === "mine" ? "My Tasks" : "All Tasks"}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {(["all", "todo", "in-progress", "review", "done"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer capitalize
                  ${statusFilter === s ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800"}`}>
                {s === "all" ? "All" : s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 ml-auto">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Task table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600 text-sm">No tasks match this filter.</div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-slate-600 border-b border-slate-800 bg-slate-800/50">
                  <th className="text-left px-5 py-3 font-medium">Task</th>
                  <th className="text-left px-3 py-3 font-medium">Phase</th>
                  <th className="text-left px-3 py-3 font-medium">Assigned to</th>
                  <th className="text-left px-3 py-3 font-medium">Status</th>
                  <th className="text-left px-3 py-3 font-medium">Priority</th>
                  <th className="text-left px-3 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-medium text-slate-200">{t.title}</td>
                    <td className="px-3 py-3 text-[12px] text-slate-500">{t.phase}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {(t.assignees ?? []).map(name => (
                          <div key={name} className={`w-5 h-5 rounded-full bg-gradient-to-br ${MEMBER_COLOR[name] ?? "from-slate-600 to-slate-700"} flex items-center justify-center text-white text-[8px] font-bold`} title={name}>
                            {name[0]}
                          </div>
                        ))}
                        {(t.assignees ?? []).length > 0 && <span className="text-[12px] text-slate-400 ml-1">{(t.assignees ?? []).join(", ")}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${STATUS_STYLE[t.status]}`}>
                        {t.status === "in-progress" ? "In Progress" : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-slate-500">{t.due ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
