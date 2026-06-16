"use client";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { USERS } from "@/lib/users";
import { useProjects } from "@/lib/projectsContext";

const MEMBER_COLOR: Record<string, string> = {
  Mukul: "from-indigo-500 to-indigo-700", Suhas: "from-amber-500 to-amber-600",
  Rohan: "from-blue-500 to-blue-700", Anjali: "from-pink-500 to-pink-700", Anurag: "from-green-500 to-green-700",
};

export default function AdminPage() {
  const { projects } = useProjects();
  const allTasks = projects.flatMap(p => p.tasks.flatMap(t => t.subtasks));

  return (
    <AuthGuard adminOnly>
      <Header title="Admin" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">

        {/* Users */}
        <section>
          <h2 className="font-semibold text-slate-200 mb-3">Team Members</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-slate-600 border-b border-slate-800 bg-slate-800/50">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-3 py-3 font-medium">Username</th>
                  <th className="text-left px-3 py-3 font-medium">Password</th>
                  <th className="text-left px-3 py-3 font-medium">Role</th>
                  <th className="text-left px-3 py-3 font-medium">Tasks assigned</th>
                  <th className="text-left px-3 py-3 font-medium">Done</th>
                </tr>
              </thead>
              <tbody>
                {USERS.map(u => {
                  const mine = allTasks.filter(t => t.assignee === u.name);
                  const done = mine.filter(t => t.status === "done").length;
                  return (
                    <tr key={u.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${MEMBER_COLOR[u.name] ?? "from-slate-600 to-slate-700"} flex items-center justify-center text-white text-[10px] font-bold`}>
                            {u.initials}
                          </div>
                          <span className="text-[13px] font-medium text-slate-200">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-slate-400 font-mono">{u.username}</td>
                      <td className="px-3 py-3 text-[13px] text-slate-400 font-mono">{u.password}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${u.role === "admin" ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-700 text-slate-300"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-slate-400">{mine.length}</td>
                      <td className="px-3 py-3 text-[13px] text-green-400 font-medium">{done}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Projects overview */}
        <section>
          <h2 className="font-semibold text-slate-200 mb-3">Projects</h2>
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {projects.map(p => {
              const all  = p.tasks.flatMap(t => t.subtasks);
              const done = all.filter(t => t.status === "done").length;
              const pct  = all.length ? Math.round((done / all.length) * 100) : 0;
              return (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-200">{p.name}</span>
                    <span className="text-sm font-bold text-indigo-400">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-slate-500">{all.length} tasks · {done} done · Lead: {p.lead}</div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </AuthGuard>
  );
}
