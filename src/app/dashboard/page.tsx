"use client";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { type SubTask } from "@/lib/projects";
import { useAuth } from "@/lib/auth";
import { useProjects } from "@/lib/projectsContext";
import Link from "next/link";

export default function DashboardPage() {
  const { projects } = useProjects();
  const proj = projects[0];
  const allTasks = proj ? proj.tasks.flatMap(t => t.subtasks) : [];
  const done    = allTasks.filter(t => t.status === "done").length;
  const inProg  = allTasks.filter(t => t.status === "in-progress").length;
  const todo    = allTasks.filter(t => t.status === "todo").length;
  const review  = allTasks.filter(t => t.status === "review").length;
  const total   = allTasks.length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <AuthGuard>
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Tasks"  value={total}  color="text-indigo-400" />
          <StatCard label="In Progress"  value={inProg} color="text-amber-400"  />
          <StatCard label="In Review"    value={review} color="text-blue-400"   />
          <StatCard label="Completed"    value={done}   color="text-green-400"  />
        </div>

        {proj && <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-white text-base">{proj.name}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{proj.description}</p>
            </div>
            <Link href={`/dashboard/projects/${proj.id}`}
              className="text-sm text-indigo-400 font-medium hover:text-indigo-300 flex-shrink-0 ml-4">
              Open project →
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-300 flex-shrink-0">{progress}% done</span>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span>{done} completed</span>
            <span>{inProg} in progress</span>
            <span>{todo} to do</span>
          </div>
        </div>}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">My Tasks</h2>
            <Link href="/dashboard/tasks" className="text-sm text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>
          <MyTasks allTasks={allTasks} />
        </div>

      </div>
    </AuthGuard>
  );
}

function MyTasks({ allTasks }: { allTasks: SubTask[] }) {
  const { user } = useAuth();
  const mine = allTasks.filter(t => t.assignee === user?.name).slice(0, 6);
  if (!mine.length) return <p className="text-sm text-slate-500">No tasks assigned to you yet.</p>;
  return (
    <div className="space-y-0.5">
      {mine.map(t => (
        <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-slate-800 last:border-0">
          <StatusDot status={t.status} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-slate-200 truncate">{t.title}</div>
          </div>
          <PriorityBadge p={t.priority} />
          {t.due && <span className="text-[11px] text-slate-500 flex-shrink-0">{t.due}</span>}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="text-[13px] text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const c: Record<string, string> = { done: "bg-green-500", "in-progress": "bg-amber-400", review: "bg-blue-400", todo: "bg-slate-600" };
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c[status] ?? "bg-slate-600"}`} />;
}

export function PriorityBadge({ p }: { p: string }) {
  const s: Record<string, string> = { high: "bg-red-500/20 text-red-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-green-500/20 text-green-400" };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize flex-shrink-0 ${s[p] ?? ""}`}>{p}</span>;
}
