"use client";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { PROJECTS } from "@/lib/projects";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-green-50 text-green-600",
  planning:  "bg-amber-50 text-amber-500",
  completed: "bg-indigo-50 text-indigo-500",
  "on-hold": "bg-slate-100 text-slate-500",
};

export default function ProjectsPage() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <Header title="Projects" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-slate-500">{PROJECTS.length} project{PROJECTS.length !== 1 ? "s" : ""}</p>
          {user?.role === "admin" && (
            <Link href="/dashboard/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Add Project
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-3xl">
          {PROJECTS.map(p => {
            const allTasks = p.tasks.flatMap(t => t.subtasks);
            const done = allTasks.filter(t => t.status === "done").length;
            const pct  = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-200 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800">{p.name}</h3>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{p.description}</p>
                  </div>
                  <Link href={`/dashboard/projects/${p.id}`}
                    className="flex-shrink-0 text-sm font-medium text-indigo-500 hover:underline">
                    Open →
                  </Link>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{pct}%</span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-5 text-xs text-slate-400">
                  <span>Lead: <span className="font-medium text-slate-600">{p.lead}</span></span>
                  <span>{allTasks.length} tasks</span>
                  <span>{done} done</span>
                  <span>Due {p.dueDate}</span>
                </div>

                {/* Members */}
                <div className="flex items-center gap-1 mt-3">
                  {p.members.map(m => {
                    const colors: Record<string, string> = { Mukul: "from-indigo-500 to-indigo-700", Suhas: "from-amber-500 to-amber-600", Rohan: "from-blue-500 to-blue-700", Anjali: "from-pink-500 to-pink-700", Anurag: "from-green-500 to-green-700" };
                    return (
                      <div key={m} className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[m] ?? "from-slate-400 to-slate-500"} flex items-center justify-center text-white text-[9px] font-bold`} title={m}>
                        {m[0]}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AuthGuard>
  );
}
