"use client";
import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";

interface InvoiceItem { description: string; qty: number; rate: number; }
interface Invoice {
  id: string; number: string; clientName: string; clientEmail: string;
  items: InvoiceItem[]; notes: string; dueDate: string;
  status: "draft" | "sent" | "paid"; createdBy: string; createdAt: string; updatedAt: string;
}

const empty = (): Omit<Invoice, "id" | "number" | "status" | "createdBy" | "createdAt" | "updatedAt"> => ({
  clientName: "", clientEmail: "", items: [{ description: "", qty: 1, rate: 0 }], notes: "", dueDate: "",
});

const total = (items: InvoiceItem[]) => items.reduce((s, i) => s + i.qty * i.rate, 0);
const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLORS: Record<Invoice["status"], string> = {
  draft: "bg-slate-700 text-slate-300",
  sent:  "bg-blue-500/20 text-blue-400",
  paid:  "bg-green-500/20 text-green-400",
};

async function apiFetch() {
  const r = await fetch("/api/data/invoices", { cache: "no-store" });
  const { invoices } = await r.json();
  return (invoices ?? []) as Invoice[];
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setInvoices(await apiFetch());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function setItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));
  }
  function addItem() { setForm(f => ({ ...f, items: [...f.items, { description: "", qty: 1, rate: 0 }] })); }
  function removeItem(idx: number) { setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) })); }

  async function create() {
    if (!form.clientName.trim()) return;
    setSaving(true);
    const r = await fetch("/api/data/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, createdBy: user?.name ?? "" }),
    });
    const inv = await r.json();
    setInvoices(prev => [inv, ...prev]);
    setShowCreate(false);
    setForm(empty());
    setSaving(false);
    setSelected(inv);
  }

  async function patch(id: string, updates: Partial<Invoice>) {
    const r = await fetch("/api/data/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const updated = await r.json();
    setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
    if (selected?.id === id) setSelected(updated);
  }

  async function deleteInvoice(id: string) {
    if (!confirm("Delete this invoice?")) return;
    await fetch("/api/data/invoices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function sendEmail(inv: Invoice) {
    const lineItems = inv.items.map(it => `  • ${it.description} × ${it.qty} @ ₹${it.rate} = ₹${it.qty * it.rate}`).join("\n");
    const body = `Dear ${inv.clientName},\n\nPlease find below your invoice details:\n\nInvoice No: ${inv.number}\nDue Date: ${inv.dueDate || "N/A"}\n\nItems:\n${lineItems}\n\nTotal: ${fmt(total(inv.items))}\n${inv.notes ? `\nNotes: ${inv.notes}` : ""}\n\nThank you for your business.\n\nMetaFX`;
    window.open(`mailto:${inv.clientEmail}?subject=Invoice ${inv.number} from MetaFX&body=${encodeURIComponent(body)}`);
    if (inv.status === "draft") patch(inv.id, { status: "sent" });
  }

  const inv = selected;

  return (
    <AuthGuard>
      <Header title="Invoices" />
      <div className="flex-1 overflow-hidden flex">

        {/* List panel */}
        <div className="w-80 flex-shrink-0 border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
            <button onClick={() => { setShowCreate(true); setSelected(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-600 text-sm">Loading…</div>
            ) : invoices.length === 0 ? (
              <div className="p-6 text-center text-slate-600 text-sm">No invoices yet</div>
            ) : (
              invoices.map(inv => (
                <button key={inv.id} onClick={() => { setSelected(inv); setShowCreate(false); }}
                  className={`w-full text-left px-4 py-3.5 border-b border-slate-800/60 hover:bg-slate-800/50 transition-colors cursor-pointer ${selected?.id === inv.id ? "bg-slate-800/70" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-400">{inv.number}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-200 truncate">{inv.clientName}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">{inv.createdAt}</span>
                    <span className="text-xs font-semibold text-slate-300">{fmt(total(inv.items))}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail / Create panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {showCreate && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">New Invoice</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer text-xl leading-none">×</button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Client Name *</label>
                    <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" placeholder="Acme Studios" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Client Email</label>
                    <input value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                      type="email" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" placeholder="client@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
                  <input value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    type="date" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500" />
                </div>

                {/* Line items */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Line Items</label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-500 px-1">
                      <span className="col-span-6">Description</span><span className="col-span-2 text-center">Qty</span><span className="col-span-3 text-center">Rate (₹)</span>
                    </div>
                    {form.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <input value={item.description} onChange={e => setItem(idx, "description", e.target.value)}
                          className="col-span-6 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white outline-none focus:border-indigo-500" placeholder="Service description" />
                        <input value={item.qty} onChange={e => setItem(idx, "qty", Number(e.target.value))}
                          type="number" min="1" className="col-span-2 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white outline-none focus:border-indigo-500 text-center" />
                        <input value={item.rate} onChange={e => setItem(idx, "rate", Number(e.target.value))}
                          type="number" min="0" className="col-span-3 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white outline-none focus:border-indigo-500 text-center" />
                        <button onClick={() => removeItem(idx)} disabled={form.items.length === 1}
                          className="col-span-1 text-slate-600 hover:text-red-400 cursor-pointer disabled:opacity-20 text-lg leading-none text-center">×</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addItem} className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">+ Add line</button>
                </div>

                <div className="flex justify-end">
                  <div className="text-sm text-slate-400">Total: <span className="font-bold text-white text-base ml-2">{fmt(total(form.items))}</span></div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-indigo-500 resize-none" placeholder="Payment terms, bank details, etc." />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={create} disabled={saving || !form.clientName.trim()}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                    {saving ? "Saving…" : "Create Invoice"}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="px-5 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 cursor-pointer border border-slate-700">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {!showCreate && inv && (
            <div className="max-w-2xl mx-auto">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">{inv.number}</h2>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                  </div>
                  <div className="text-slate-400 text-sm">Created by {inv.createdBy} · {inv.createdAt}</div>
                </div>
                <div className="flex gap-2">
                  {inv.status !== "paid" && (
                    <button onClick={() => sendEmail(inv)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                      style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M2 4h16v12H2V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 4l8 7 8-7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                      Send Email
                    </button>
                  )}
                  {inv.status === "sent" && (
                    <button onClick={() => patch(inv.id, { status: "paid" })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 cursor-pointer">
                      Mark Paid
                    </button>
                  )}
                  {inv.status === "draft" && (
                    <button onClick={() => patch(inv.id, { status: "sent" })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 cursor-pointer">
                      Mark Sent
                    </button>
                  )}
                  <button onClick={() => deleteInvoice(inv.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 cursor-pointer">
                    Delete
                  </button>
                </div>
              </div>

              {/* Invoice card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Client info */}
                <div className="px-6 py-5 border-b border-slate-800 flex justify-between">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Bill To</div>
                    <div className="font-semibold text-white">{inv.clientName}</div>
                    {inv.clientEmail && <div className="text-sm text-slate-400">{inv.clientEmail}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-0.5">Due Date</div>
                    <div className="font-semibold text-white">{inv.dueDate || "—"}</div>
                  </div>
                </div>

                {/* Line items */}
                <div className="px-6 py-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 border-b border-slate-800">
                        <th className="text-left pb-2 font-medium">Description</th>
                        <th className="text-center pb-2 font-medium w-16">Qty</th>
                        <th className="text-right pb-2 font-medium w-24">Rate</th>
                        <th className="text-right pb-2 font-medium w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {inv.items.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2.5 text-slate-200">{item.description || "—"}</td>
                          <td className="py-2.5 text-center text-slate-400">{item.qty}</td>
                          <td className="py-2.5 text-right text-slate-400">{fmt(item.rate)}</td>
                          <td className="py-2.5 text-right font-medium text-white">{fmt(item.qty * item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-white">{fmt(total(inv.items))}</div>
                  </div>
                </div>

                {/* Notes */}
                {inv.notes && (
                  <div className="px-6 py-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Notes</div>
                    <div className="text-sm text-slate-400 whitespace-pre-wrap">{inv.notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!showCreate && !inv && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-3">🧾</div>
              <div className="text-slate-400 font-medium mb-1">No invoice selected</div>
              <div className="text-slate-600 text-sm">Select one from the list or create a new invoice</div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
