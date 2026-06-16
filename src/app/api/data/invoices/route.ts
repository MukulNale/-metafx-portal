import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "mfx:invoices";

export interface InvoiceItem { description: string; qty: number; rate: number; }
export interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  notes: string;
  dueDate: string;
  status: "draft" | "sent" | "paid";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

async function read(): Promise<Invoice[]> {
  return (await kvGet<Invoice[]>(KEY)) ?? [];
}

export async function GET() {
  return NextResponse.json({ invoices: await read() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const all = await read();
  const num = all.length + 1;
  const invoice: Invoice = {
    id: crypto.randomUUID(),
    number: `INV-${String(num).padStart(4, "0")}`,
    clientName: body.clientName ?? "",
    clientEmail: body.clientEmail ?? "",
    items: body.items ?? [],
    notes: body.notes ?? "",
    dueDate: body.dueDate ?? "",
    status: "draft",
    createdBy: body.createdBy ?? "",
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
  };
  await kvSet(KEY, [invoice, ...all]);
  return NextResponse.json(invoice, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  const all = await read();
  const idx = all.findIndex(inv => inv.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString().split("T")[0] };
  await kvSet(KEY, all);
  return NextResponse.json(all[idx]);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const all = await read();
  await kvSet(KEY, all.filter(inv => inv.id !== id));
  return NextResponse.json({ ok: true });
}
