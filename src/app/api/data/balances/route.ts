import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { USERS } from "@/lib/users";

const KEY = "mfx:balances";
const STARTING = 500;

type Balances = Record<string, number>;

async function read(): Promise<Balances> {
  const stored = await kvGet<Balances>(KEY) ?? {};
  // Ensure every user has a balance entry
  const out: Balances = {};
  for (const u of USERS) {
    out[u.name] = stored[u.name] ?? STARTING;
  }
  return out;
}

export async function GET() {
  return NextResponse.json(await read());
}

export async function POST(req: NextRequest) {
  const { player, delta }: { player: string; delta: number } = await req.json();
  const bal = await read();
  bal[player] = Math.max(0, (bal[player] ?? STARTING) + delta);
  await kvSet(KEY, bal);
  return NextResponse.json({ player, balance: bal[player] });
}
