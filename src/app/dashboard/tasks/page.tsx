"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { PROJECTS, type Status } from "@/lib/projects";
import { useAuth } from "@/lib/auth";

const STATUS_STYLE: Record<Status, string> = {
  todo:          "bg-slate-100 text-slate-500",
  "in-progress": "bg-amber-50 text-amber-600",
  review:        "bg-blue-50 text-blue-500",
  done:          "bg-green-50 text-green-600",
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

export default function TasksPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "mine">("mine");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const allTasks = PROJECTS.flatMap(p =>
    p.tasks.flatMap(phase =>
      phase.subtasks.map(sub => ({ ...sub, project: p.name, phase: phase.title }))
    )
  );

  const filtered = allTasks.filter(t => {
    if (filter === "mine" && t.assignee !== user?.name) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <AuthGuard>
      <Header title="Tasks" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(["mine", "all"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer capitalize
                  ${filter === f ? "bg-indigo-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                {f === "mine" ? "My Tasks" : "All Tasks"}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {(["all", "todo", "in-progress", "review", "done"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer capitalize
                  ${statusFilter === s ? "bg-indigo-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                {s === "all" ? "All" : s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <span className="text-sm text-slate-400 ml-auto">{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Task table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No tasks match this filter.</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b border-slate-100 bg-slate-50">
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
                  <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-[13px] font-medium text-slate-800">{t.title}</td>
                    <td className="px-3 py-3 text-[12px] text-slate-400">{t.phase}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${MEMBER_COLOR[t.assignee] ?? "from-slate-400 to-slate-500"} flex items-center justify-center text-white text-[8px] font-bold`}>
                          {t.assignee[0]}
                        </div>
                        <span className="text-[12px] text-slate-600">{t.assignee}</span>
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
                    <td className="px-3 py-3 text-[12px] text-slate-400">{t.due ?? "—"}</td>
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
