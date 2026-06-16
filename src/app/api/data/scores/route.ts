import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "mfx:scores";

type ScoreEntry = { player: string; value: number; date: string };
type ScoreBoard = { snake: ScoreEntry[]; memory: ScoreEntry[]; wordle: ScoreEntry[]; trivia: ScoreEntry[] };

const empty = (): ScoreBoard => ({ snake: [], memory: [], wordle: [], trivia: [] });

export async function GET() {
  const scores = await kvGet<ScoreBoard>(KEY) ?? empty();
  return NextResponse.json(scores);
}

export async function POST(req: NextRequest) {
  const { game, entry }: { game: keyof ScoreBoard; entry: ScoreEntry } = await req.json();
  const scores = await kvGet<ScoreBoard>(KEY) ?? empty();
  const isLowBetter = game === "memory" || game === "wordle";
  scores[game] = [...(scores[game] ?? []), entry]
    .sort((a, b) => isLowBetter ? a.value - b.value : b.value - a.value)
    .slice(0, 10);
  await kvSet(KEY, scores);
  return NextResponse.json({ ok: true });
}
