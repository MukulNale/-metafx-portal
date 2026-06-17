"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";
import { USERS } from "@/lib/users";
import type { RewardTask } from "@/app/api/data/rewards/route";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getUserColor(name: string) {
  return USERS.find((u) => u.name === name)?.color ?? "#6366f1";
}

const CFG = {
  "1month": {
    label: "1 Month",
    gradient: "from-amber-500 to-orange-500",
    gradientBg: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    rewardBg: "bg-amber-500/10 border-amber-500/20",
    rewardText: "text-amber-300",
    btn: "from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400",
    tab: "bg-gradient-to-r from-amber-500 to-orange-500",
  },
  "3month": {
    label: "3 Months",
    gradient: "from-indigo-500 to-purple-500",
    gradientBg: "from-indigo-500/20 to-purple-500/20",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
    badge: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
    rewardBg: "bg-indigo-500/10 border-indigo-500/20",
    rewardText: "text-indigo-300",
    btn: "from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400",
    tab: "bg-gradient-to-r from-indigo-500 to-purple-500",
  },
};

function AvatarChip({ name, completed }: { name: string; completed?: boolean }) {
  return (
    <div className="relative" title={name}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white select-none ${completed ? "ring-2 ring-green-400 ring-offset-1 ring-offset-slate-800" : ""}`}
        style={{ backgroundColor: getUserColor(name) }}
      >
        {getInitials(name)}
      </div>
      {completed && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 12 12">
            <path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-6.5z" />
          </svg>
        </div>
      )}
    </div>
  );
}

function RewardCard({
  task, isAdmin, userName, onParticipate, onComplete,
}: {
  task: RewardTask; isAdmin: boolean; userName: string;
  onParticipate: (id: string) => void; onComplete: (id: string, player: string) => void;
}) {
  const cfg = CFG[task.duration];
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const hasJoined = task.participants.includes(userName);
  const dueDate = new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const TRUNC = 140;
  const isLong = task.description.length > TRUNC;
  const desc = !expanded && isLong ? task.description.slice(0, TRUNC) + "…" : task.description;
  const completable = task.participants.filter((p) => !task.completedBy.includes(p));

  return (
    <div className={`rounded-2xl border bg-slate-800/60 p-5 flex flex-col gap-4 shadow-lg ${cfg.border} hover:-translate-y-0.5 transition-transform duration-200`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${task.status === "open" ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-slate-600/40 text-slate-400 border border-slate-600/30"}`}>
          {task.status === "open" ? "🟢 Active" : "🔒 Closed"}
        </span>
      </div>

      <h3 className="text-base font-bold text-white leading-snug">{task.title}</h3>

      <div>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
        {isLong && (
          <button onClick={() => setExpanded((e) => !e)} className={`text-xs mt-1 font-medium ${cfg.text} hover:underline`}>
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Reward box */}
      <div className={`rounded-xl border p-3.5 ${cfg.rewardBg} ${cfg.border}`}>
        <div className="flex items-center gap-2 mb-1">
          <span>🎁</span>
          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>Reward</span>
        </div>
        <p className={`text-sm font-bold ${cfg.rewardText}`}>{task.reward}</p>
      </div>

      <p className="text-xs text-slate-500"><span className="text-slate-400 font-medium">Due:</span> {dueDate}</p>

      {task.participants.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5 font-medium">Participants</p>
          <div className="flex flex-wrap gap-1.5">
            {task.participants.map((p) => <AvatarChip key={p} name={p} completed={task.completedBy.includes(p)} />)}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
        {hasJoined ? (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 bg-slate-700/50 px-4 py-2 rounded-xl">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Joined
          </span>
        ) : (
          <button
            onClick={() => onParticipate(task.id)}
            disabled={task.status === "closed"}
            className={`flex-1 text-sm font-semibold text-white px-4 py-2 rounded-xl bg-gradient-to-r transition-all shadow-md ${cfg.btn} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Join Challenge
          </button>
        )}

        {isAdmin && completable.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="text-xs font-medium text-slate-400 border border-slate-600/50 px-3 py-2 rounded-xl hover:bg-slate-700/60 transition-colors"
            >
              Mark Complete ▾
            </button>
            {showMenu && (
              <div className="absolute bottom-full mb-1 right-0 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl min-w-[160px] overflow-hidden">
                {completable.map((p) => (
                  <button
                    key={p}
                    onClick={() => { onComplete(task.id, p); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <AvatarChip name={p} />
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Column({ duration, tasks, isAdmin, userName, onParticipate, onComplete }: {
  duration: "1month" | "3month"; tasks: RewardTask[]; isAdmin: boolean; userName: string;
  onParticipate: (id: string) => void; onComplete: (id: string, player: string) => void;
}) {
  const cfg = CFG[duration];
  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${cfg.gradientBg} border ${cfg.border}`}>
        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${cfg.gradient}`} />
        <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label} Challenges</span>
        <span className={`ml-auto text-xs ${cfg.text} font-medium`}>{tasks.length} challenge{tasks.length !== 1 ? "s" : ""}</span>
      </div>
      {tasks.map((t) => (
        <RewardCard key={t.id} task={t} isAdmin={isAdmin} userName={userName} onParticipate={onParticipate} onComplete={onComplete} />
      ))}
    </div>
  );
}

export default function RewardsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<RewardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"1month" | "3month">("1month");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/data/rewards", { cache: "no-store" });
      setTasks(await res.json());
    } catch (e) {
      console.error("Failed to fetch rewards", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleParticipate = async (id: string) => {
    if (!user) return;
    await fetch("/api/data/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "participate", id, player: user.name }),
    });
    fetchTasks();
  };

  const handleComplete = async (id: string, player: string) => {
    await fetch("/api/data/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", id, player }),
    });
    fetchTasks();
  };

  const isAdmin = user?.role === "admin";
  const userName = user?.name ?? "";
  const by = (d: "1month" | "3month") => tasks.filter((t) => t.duration === d);
  const myParticipations = tasks.filter((t) => t.participants.includes(userName)).length;
  const myCompletions = tasks.filter((t) => t.completedBy.includes(userName)).length;

  return (
    <AuthGuard>
      <Header title="Rewards" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 px-8 py-10 text-center">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:1s]" />
            <div className="relative">
              <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-amber-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight mb-3">
                🏆 Team Challenges
              </h1>
              <p className="text-slate-400 text-lg">Complete challenges. Earn real rewards.</p>
            </div>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Active Challenges", value: tasks.filter((t) => t.status === "open").length, icon: "⚡", g: "from-amber-500 to-orange-500" },
                { label: "Your Participations", value: myParticipations, icon: "🙋", g: "from-indigo-500 to-purple-500" },
                { label: "Your Completions", value: myCompletions, icon: "✅", g: "from-green-500 to-emerald-500" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.g} flex items-center justify-center text-lg shadow-md flex-shrink-0`}>{s.icon}</div>
                  <div>
                    <p className="text-2xl font-extrabold text-white leading-none">{s.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              {/* Desktop: 2 columns */}
              <div className="hidden lg:grid lg:grid-cols-2 gap-6">
                {(["1month", "3month"] as const).map((d) => (
                  <Column key={d} duration={d} tasks={by(d)} isAdmin={isAdmin} userName={userName} onParticipate={handleParticipate} onComplete={handleComplete} />
                ))}
              </div>

              {/* Mobile/tablet: tabs */}
              <div className="lg:hidden space-y-4">
                <div className="flex gap-2 rounded-xl bg-slate-800/60 p-1 border border-slate-700/50">
                  {(["1month", "3month"] as const).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${activeTab === key ? `${CFG[key].tab} text-white shadow-md` : "text-slate-400 hover:text-white"}`}
                    >
                      {CFG[key].label}
                    </button>
                  ))}
                </div>
                <Column duration={activeTab} tasks={by(activeTab)} isAdmin={isAdmin} userName={userName} onParticipate={handleParticipate} onComplete={handleComplete} />
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
