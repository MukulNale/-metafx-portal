"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";
import { USERS } from "@/lib/users";
import type { RewardTask } from "@/app/api/data/rewards/route";

// ─── Avatar helpers ───────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getUserColor(name: string): string {
  const u = USERS.find((u) => u.name === name);
  return u?.color ?? "#6366f1";
}

// ─── Duration config ──────────────────────────────────────────────────────────

const DURATION_CONFIG = {
  "1month": {
    label: "1 Month",
    gradient: "from-amber-500 to-orange-500",
    gradientBg: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    glow: "shadow-amber-500/20",
    rewardBg: "bg-amber-500/10 border-amber-500/20",
    rewardText: "text-amber-300",
    btnGradient: "from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400",
  },
  "3month": {
    label: "3 Months",
    gradient: "from-indigo-500 to-purple-500",
    gradientBg: "from-indigo-500/20 to-purple-500/20",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
    badge: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
    glow: "shadow-indigo-500/20",
    rewardBg: "bg-indigo-500/10 border-indigo-500/20",
    rewardText: "text-indigo-300",
    btnGradient: "from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400",
  },
  "6month": {
    label: "6 Months",
    gradient: "from-emerald-500 to-teal-500",
    gradientBg: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    glow: "shadow-emerald-500/20",
    rewardBg: "bg-emerald-500/10 border-emerald-500/20",
    rewardText: "text-emerald-300",
    btnGradient: "from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400",
  },
};

// ─── Avatar chip ──────────────────────────────────────────────────────────────

function AvatarChip({
  name,
  completed,
}: {
  name: string;
  completed?: boolean;
}) {
  const color = getUserColor(name);
  const initials = getInitials(name);
  return (
    <div className="relative" title={name}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white select-none ${
          completed ? "ring-2 ring-green-400 ring-offset-1 ring-offset-slate-800" : ""
        }`}
        style={{ backgroundColor: color }}
      >
        {initials}
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

// ─── Reward card ──────────────────────────────────────────────────────────────

function RewardCard({
  task,
  isAdmin,
  userName,
  onParticipate,
  onComplete,
}: {
  task: RewardTask;
  isAdmin: boolean;
  userName: string;
  onParticipate: (id: string) => void;
  onComplete: (id: string, player: string) => void;
}) {
  const cfg = DURATION_CONFIG[task.duration];
  const [expanded, setExpanded] = useState(false);
  const [showCompleteMenu, setShowCompleteMenu] = useState(false);

  const hasJoined = task.participants.includes(userName);
  const dueDate = new Date(task.dueDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const TRUNCATE_AT = 140;
  const isLong = task.description.length > TRUNCATE_AT;
  const descText =
    !expanded && isLong
      ? task.description.slice(0, TRUNCATE_AT) + "…"
      : task.description;

  // Participants not yet in completedBy — available to mark complete
  const completableParticipants = task.participants.filter(
    (p) => !task.completedBy.includes(p)
  );

  return (
    <div
      className={`relative rounded-2xl border bg-slate-800/60 backdrop-blur-sm p-5 flex flex-col gap-4 shadow-lg ${cfg.glow} ${cfg.border} transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
          {cfg.label}
        </span>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            task.status === "open"
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : "bg-slate-600/40 text-slate-400 border border-slate-600/30"
          }`}
        >
          {task.status === "open" ? "🟢 Active" : "🔒 Closed"}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-white leading-snug">{task.title}</h3>

      {/* Description */}
      <div>
        <p className="text-sm text-slate-400 leading-relaxed">{descText}</p>
        {isLong && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className={`text-xs mt-1 font-medium ${cfg.text} hover:underline`}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>

      {/* Reward box */}
      <div className={`rounded-xl border p-3.5 ${cfg.rewardBg} ${cfg.border}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🎁</span>
          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>
            Reward
          </span>
        </div>
        <p className={`text-sm font-bold ${cfg.rewardText}`}>{task.reward}</p>
        {task.rewardAlt && (
          <p className="text-xs text-slate-400 mt-0.5">
            or{" "}
            <span className={`font-semibold ${cfg.rewardText}`}>{task.rewardAlt}</span>
          </p>
        )}
      </div>

      {/* Due date */}
      <p className="text-xs text-slate-500">
        <span className="text-slate-400 font-medium">Due:</span> {dueDate}
      </p>

      {/* Participants */}
      {task.participants.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5 font-medium">Participants</p>
          <div className="flex flex-wrap gap-1.5">
            {task.participants.map((p) => (
              <AvatarChip
                key={p}
                name={p}
                completed={task.completedBy.includes(p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed by */}
      {task.completedBy.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5 font-medium">Completed</p>
          <div className="flex flex-wrap gap-1.5">
            {task.completedBy.map((p) => (
              <AvatarChip key={p} name={p} completed />
            ))}
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
        {hasJoined ? (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 bg-slate-700/50 px-4 py-2 rounded-xl">
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Joined
          </span>
        ) : (
          <button
            onClick={() => onParticipate(task.id)}
            disabled={task.status === "closed"}
            className={`flex-1 text-sm font-semibold text-white px-4 py-2 rounded-xl bg-gradient-to-r transition-all duration-150 shadow-md ${cfg.btnGradient} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Join Challenge
          </button>
        )}

        {/* Admin mark-complete dropdown */}
        {isAdmin && completableParticipants.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowCompleteMenu((v) => !v)}
              className="text-xs font-medium text-slate-400 border border-slate-600/50 px-3 py-2 rounded-xl hover:bg-slate-700/60 transition-colors"
            >
              Mark Complete ▾
            </button>
            {showCompleteMenu && (
              <div className="absolute bottom-full mb-1 right-0 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl min-w-[160px] overflow-hidden">
                {completableParticipants.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      onComplete(task.id, p);
                      setShowCompleteMenu(false);
                    }}
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

// ─── Column ───────────────────────────────────────────────────────────────────

function DurationColumn({
  duration,
  tasks,
  isAdmin,
  userName,
  onParticipate,
  onComplete,
}: {
  duration: "1month" | "3month" | "6month";
  tasks: RewardTask[];
  isAdmin: boolean;
  userName: string;
  onParticipate: (id: string) => void;
  onComplete: (id: string, player: string) => void;
}) {
  const cfg = DURATION_CONFIG[duration];
  return (
    <div className="flex flex-col gap-4">
      {/* Column header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${cfg.gradientBg} border ${cfg.border}`}
      >
        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${cfg.gradient}`} />
        <span className={`font-bold text-sm ${cfg.text}`}>{cfg.label} Challenges</span>
        <span className={`ml-auto text-xs ${cfg.text} font-medium`}>
          {tasks.length} challenge{tasks.length !== 1 ? "s" : ""}
        </span>
      </div>
      {tasks.map((t) => (
        <RewardCard
          key={t.id}
          task={t}
          isAdmin={isAdmin}
          userName={userName}
          onParticipate={onParticipate}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  gradient,
}: {
  label: string;
  value: number;
  icon: string;
  gradient: string;
}) {
  return (
    <div className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4 flex-1 min-w-[150px]">
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg shadow-md`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function RewardsContent() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<RewardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"1month" | "3month" | "6month">("1month");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/data/rewards", { cache: "no-store" });
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error("Failed to fetch rewards", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleParticipate = async (id: string) => {
    if (!user) return;
    await fetch("/api/data/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "participate", id, player: user.name }),
    });
    await fetchTasks();
  };

  const handleComplete = async (id: string, player: string) => {
    await fetch("/api/data/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", id, player }),
    });
    await fetchTasks();
  };

  const isAdmin = user?.role === "admin";
  const userName = user?.name ?? "";

  const byDuration = (d: "1month" | "3month" | "6month") =>
    tasks.filter((t) => t.duration === d);

  const myParticipations = tasks.filter((t) => t.participants.includes(userName)).length;
  const myCompletions = tasks.filter((t) => t.completedBy.includes(userName)).length;

  const tabs: Array<{ key: "1month" | "3month" | "6month"; label: string }> = [
    { key: "1month", label: "1 Month" },
    { key: "3month", label: "3 Months" },
    { key: "6month", label: "6 Months" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header title="Rewards" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 px-8 py-10 text-center">
          {/* Animated blobs */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse [animation-delay:2s]" />

          <div className="relative">
            <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tight mb-3">
              🏆 Team Challenges
            </h1>
            <p className="text-slate-400 text-lg">
              Complete challenges. Earn real rewards.
            </p>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Active Challenges"
              value={tasks.filter((t) => t.status === "open").length}
              icon="⚡"
              gradient="from-amber-500 to-orange-500"
            />
            <StatCard
              label="Your Participations"
              value={myParticipations}
              icon="🙋"
              gradient="from-indigo-500 to-purple-500"
            />
            <StatCard
              label="Your Completions"
              value={myCompletions}
              icon="✅"
              gradient="from-emerald-500 to-teal-500"
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Desktop 3-column grid */}
        {!loading && (
          <>
            <div className="hidden lg:grid lg:grid-cols-3 gap-6">
              {(["1month", "3month", "6month"] as const).map((d) => (
                <DurationColumn
                  key={d}
                  duration={d}
                  tasks={byDuration(d)}
                  isAdmin={isAdmin}
                  userName={userName}
                  onParticipate={handleParticipate}
                  onComplete={handleComplete}
                />
              ))}
            </div>

            {/* Mobile/tablet tabs */}
            <div className="lg:hidden space-y-4">
              <div className="flex gap-2 rounded-xl bg-slate-800/60 p-1 border border-slate-700/50">
                {tabs.map((tab) => {
                  const cfg = DURATION_CONFIG[tab.key];
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
                        activeTab === tab.key
                          ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-md`
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <DurationColumn
                duration={activeTab}
                tasks={byDuration(activeTab)}
                isAdmin={isAdmin}
                userName={userName}
                onParticipate={handleParticipate}
                onComplete={handleComplete}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RewardsPage() {
  return (
    <AuthGuard>
      <RewardsContent />
    </AuthGuard>
  );
}
