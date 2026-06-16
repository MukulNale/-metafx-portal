"use client";
import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";

type TicketStatus = "open" | "in-progress" | "done" | "rejected";
type TicketType   = "feature" | "bug" | "improvement" | "other";
type TicketPriority = "high" | "medium" | "low";

interface Ticket {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

const STATUS_STYLE: Record<TicketStatus, string> = {
  open:        "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "in-progress":"bg-amber-500/20 text-amber-400 border-amber-500/30",
  done:        "bg-green-500/20 text-green-400 border-green-500/30",
  rejected:    "bg-red-500/20 text-red-400 border-red-500/30",
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open", "in-progress": "In Progress", done: "Done", rejected: "Rejected",
};
const TYPE_STYLE: Record<TicketType, string> = {
  feature:     "bg-blue-500/20 text-blue-400",
  bug:         "bg-red-500/20 text-red-400",
  improvement: "bg-purple-500/20 text-purple-400",
  other:       "bg-slate-700 text-slate-400",
};
const PRIORITY_STYLE: Record<TicketPriority, string> = {
  high:   "text-red-400",
  medium: "text-amber-400",
  low:    "text-slate-400",
};
const PRIORITY_DOT: Record<TicketPriority, string> = {
  high:   "bg-red-400",
  medium: "bg-amber-400",
  low:    "bg-slate-500",
};

const BLANK = { title: "", description: "", type: "feature" as TicketType, priority: "medium" as TicketPriority };

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ ...BLANK });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter]     = useState<TicketStatus | "all">("all");
  const [detail, setDetail]     = useState<Ticket | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/tickets");
      const data = await r.json();
      setTickets(data.tickets ?? []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, createdBy: user?.name ?? "Unknown" }),
      });
      if (r.ok) {
        const ticket = await r.json();
        setTickets(prev => [ticket, ...prev]);
        setShowModal(false);
        setForm({ ...BLANK });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const counts: Record<string, number> = { all: tickets.length, open: 0, "in-progress": 0, done: 0, rejected: 0 };
  for (const t of tickets) counts[t.status] = (counts[t.status] ?? 0) + 1;

  return (
    <AuthGuard>
      <Header title="Tickets" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-5">

        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              Submit a feature request, bug report, or improvement idea. Claude will pick it up, implement the change, and mark it done.
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white cursor-pointer flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            New Ticket
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {(["all", "open", "in-progress", "done", "rejected"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border
                ${filter === s
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"}`}>
              {s === "all" ? "All" : STATUS_LABEL[s as TicketStatus]}
              <span className="ml-1.5 opacity-60">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {loading ? (
          <div className="text-sm text-slate-600 py-8 text-center">Loading tickets…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900 border border-dashed border-slate-800 rounded-xl py-14 text-center">
            <div className="text-3xl mb-3">🎫</div>
            <div className="text-slate-400 font-medium mb-1">No tickets yet</div>
            <div className="text-slate-600 text-sm">Click &quot;New Ticket&quot; to submit a request</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <button key={t.id} onClick={() => setDetail(t)}
                className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 hover:border-slate-700 transition-colors group cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-mono text-slate-600">{t.id}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${TYPE_STYLE[t.type]}`}>{t.type}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    </div>
                    <div className="text-[14px] font-semibold text-slate-200 mb-1">{t.title}</div>
                    <div className="text-[12px] text-slate-500 line-clamp-1">{t.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                      <span className={`text-[11px] font-medium capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                    </div>
                    <span className="text-[11px] text-slate-600">{t.createdBy} · {t.createdAt}</span>
                  </div>
                </div>
                {t.notes && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-[12px] text-slate-500 flex gap-1.5">
                    <span className="text-indigo-400 font-semibold flex-shrink-0">Claude:</span>
                    <span className="line-clamp-2">{t.notes}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg">
            <h2 className="font-semibold text-white text-base mb-1">New Ticket</h2>
            <p className="text-xs text-slate-500 mb-4">Describe what you want — Claude will read this and make the change.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Title <span className="text-red-400">*</span></label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="Short summary of the request"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description <span className="text-red-400">*</span></label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={4} placeholder="Explain exactly what you want — be as specific as possible so Claude can implement it correctly."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value as TicketType})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="improvement">Improvement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as TicketPriority})}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={submit} disabled={submitting || !form.title.trim() || !form.description.trim()}
                className="flex-1 py-2 rounded-lg text-white text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                {submitting ? "Submitting…" : "Submit Ticket"}
              </button>
              <button onClick={() => { setShowModal(false); setForm({ ...BLANK }); }}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 bg-slate-800 cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-mono text-slate-600">{detail.id}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${TYPE_STYLE[detail.type]}`}>{detail.type}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[detail.status]}`}>{STATUS_LABEL[detail.status]}</span>
                </div>
                <h2 className="font-semibold text-white text-base">{detail.title}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-600 hover:text-slate-300 cursor-pointer p-1">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{detail.description}</p>
            </div>
            <div className="flex gap-4 text-xs text-slate-500 mb-4">
              <span>Submitted by <span className="text-slate-300">{detail.createdBy}</span></span>
              <span>Created {detail.createdAt}</span>
              <span className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[detail.priority]}`} />
                <span className={`capitalize ${PRIORITY_STYLE[detail.priority]}`}>{detail.priority} priority</span>
              </span>
            </div>
            {detail.notes && (
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-indigo-400 mb-1">Claude&apos;s notes</div>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{detail.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
