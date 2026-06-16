import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "mfx:tickets";

interface Ticket { id: string; [k: string]: unknown; }

async function read(): Promise<{ tickets: Ticket[] }> {
  return (await kvGet<{ tickets: Ticket[] }>(KEY)) ?? { tickets: [] };
}

export async function GET() {
  return NextResponse.json(await read());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = await read();
  const ticket: Ticket = {
    id: `T-${String(data.tickets.length + 1).padStart(3, "0")}`,
    ...body,
    status: "open",
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
    notes: "",
  };
  data.tickets.unshift(ticket);
  await kvSet(KEY, data);
  return NextResponse.json(ticket, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  const data = await read();
  const idx = data.tickets.findIndex(t => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  data.tickets[idx] = { ...data.tickets[idx], ...updates, updatedAt: new Date().toISOString().split("T")[0] };
  await kvSet(KEY, data);
  return NextResponse.json(data.tickets[idx]);
}
