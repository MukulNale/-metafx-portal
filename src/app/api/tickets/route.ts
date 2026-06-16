import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const FILE = join(process.cwd(), "src", "data", "tickets.json");

function read() {
  try { return JSON.parse(readFileSync(FILE, "utf8")); }
  catch { return { tickets: [] }; }
}
function write(data: object) {
  writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = read();
  const ticket = {
    id: `T-${String(data.tickets.length + 1).padStart(3, "0")}`,
    ...body,
    status: "open",
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
    notes: "",
  };
  data.tickets.unshift(ticket);
  write(data);
  return NextResponse.json(ticket, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  const data = read();
  const idx = data.tickets.findIndex((t: { id: string }) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  data.tickets[idx] = { ...data.tickets[idx], ...updates, updatedAt: new Date().toISOString().split("T")[0] };
  write(data);
  return NextResponse.json(data.tickets[idx]);
}
