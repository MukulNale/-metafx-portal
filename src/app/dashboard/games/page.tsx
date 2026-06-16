"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";

// ─── Snake ───────────────────────────────────────────────────────────────────

const GRID = 20;
const TICK = 130;

type Pt = { x: number; y: number };
type Dir = "U" | "D" | "L" | "R";
const OPP: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };

function rnd() { return { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
function ptEq(a: Pt, b: Pt) { return a.x === b.x && a.y === b.y; }

function SnakeGame() {
  const init = () => {
    const head = { x: 10, y: 10 };
    return { snake: [head, { x: 9, y: 10 }, { x: 8, y: 10 }], food: rnd(), dir: "R" as Dir, pending: "R" as Dir, running: false, dead: false, score: 0 };
  };
  const [g, setG] = useState(init);
  const gRef = useRef(g);
  gRef.current = g;

  const tick = useCallback(() => {
    setG(prev => {
      if (!prev.running || prev.dead) return prev;
      const dir = prev.pending;
      const head = prev.snake[0];
      const next: Pt = {
        x: (head.x + (dir === "R" ? 1 : dir === "L" ? -1 : 0) + GRID) % GRID,
        y: (head.y + (dir === "D" ? 1 : dir === "U" ? -1 : 0) + GRID) % GRID,
      };
      const ate = ptEq(next, prev.food);
      const newSnake = [next, ...prev.snake.slice(0, ate ? undefined : -1)];
      const dead = newSnake.slice(1).some(p => ptEq(p, next));
      return { ...prev, snake: newSnake, food: ate ? rnd() : prev.food, score: prev.score + (ate ? 1 : 0), dead, running: !dead, dir };
    });
  }, []);

  useEffect(() => {
    if (!g.running) return;
    const t = setInterval(tick, TICK);
    return () => clearInterval(t);
  }, [g.running, tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R", w: "U", s: "D", a: "L", d: "R" };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      setG(prev => {
        if (d === OPP[prev.dir]) return prev;
        if (!prev.running && !prev.dead) return { ...prev, running: true, pending: d };
        return { ...prev, pending: d };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const CELL = 18;
  const SIZE = GRID * CELL;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <div className="text-sm text-slate-400">Score: <span className="font-bold text-white text-lg">{g.score}</span></div>
        {!g.running && (
          <button onClick={() => setG(prev => ({ ...init(), running: true, score: prev.dead ? 0 : prev.score }))}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white cursor-pointer"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
            {g.dead ? "Restart" : "Start"}
          </button>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-700" style={{ width: SIZE, height: SIZE, background: "#0f172a" }}>
        {/* Grid dots */}
        <svg width={SIZE} height={SIZE} className="absolute inset-0 opacity-10">
          {Array.from({ length: GRID }, (_, y) => Array.from({ length: GRID }, (_, x) => (
            <circle key={`${x}-${y}`} cx={x * CELL + CELL / 2} cy={y * CELL + CELL / 2} r="1" fill="#94a3b8" />
          )))}
        </svg>

        {/* Food */}
        <div className="absolute rounded-full bg-red-400 shadow-[0_0_8px_2px_rgba(248,113,113,0.6)]"
          style={{ width: CELL - 4, height: CELL - 4, left: g.food.x * CELL + 2, top: g.food.y * CELL + 2 }} />

        {/* Snake */}
        {g.snake.map((p, i) => (
          <div key={i} className="absolute rounded-sm transition-none"
            style={{
              width: CELL - 2, height: CELL - 2,
              left: p.x * CELL + 1, top: p.y * CELL + 1,
              background: i === 0 ? "#818cf8" : `rgba(99,102,241,${1 - i / g.snake.length * 0.7})`,
              boxShadow: i === 0 ? "0 0 6px 1px rgba(129,140,248,0.5)" : undefined,
            }} />
        ))}

        {/* Overlay */}
        {(!g.running) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 rounded-xl">
            {g.dead ? (
              <>
                <div className="text-2xl font-bold text-white mb-1">Game Over</div>
                <div className="text-slate-400 text-sm mb-3">Score: {g.score}</div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-white mb-1">Snake</div>
                <div className="text-slate-400 text-sm mb-3">Use arrow keys or WASD</div>
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600">Arrow keys / WASD to move</p>
    </div>
  );
}

// ─── Memory Match ─────────────────────────────────────────────────────────────

const EMOJIS = ["🎬", "🎭", "🎨", "🎵", "🌟", "🚀", "🦋", "🎯"];
type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards(): Card[] {
  return shuffle([...EMOJIS, ...EMOJIS].map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false })));
}

function MemoryGame() {
  const [cards, setCards]   = useState<Card[]>(makeCards);
  const [picks, setPicks]   = useState<number[]>([]);
  const [moves, setMoves]   = useState(0);
  const [locked, setLocked] = useState(false);
  const [won, setWon]       = useState(false);

  function flip(id: number) {
    if (locked) return;
    setCards(prev => {
      const c = prev.find(c => c.id === id);
      if (!c || c.flipped || c.matched) return prev;
      return prev.map(x => x.id === id ? { ...x, flipped: true } : x);
    });
    setPicks(prev => {
      const next = [...prev, id];
      if (next.length === 2) {
        setMoves(m => m + 1);
        setLocked(true);
        setTimeout(() => {
          setCards(prev2 => {
            const [a, b] = next.map(i => prev2.find(c => c.id === i)!);
            const match = a.emoji === b.emoji;
            const updated = prev2.map(c =>
              next.includes(c.id) ? { ...c, matched: match, flipped: match } : c
            );
            if (updated.every(c => c.matched)) setTimeout(() => setWon(true), 200);
            return updated;
          });
          setPicks([]);
          setLocked(false);
        }, 900);
        return next;
      }
      return next;
    });
  }

  function reset() { setCards(makeCards()); setPicks([]); setMoves(0); setLocked(false); setWon(false); }

  const matched = cards.filter(c => c.matched).length / 2;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <div className="text-sm text-slate-400">Moves: <span className="font-bold text-white text-lg">{moves}</span></div>
        <div className="text-sm text-slate-400">Matched: <span className="font-bold text-green-400">{matched}/{EMOJIS.length}</span></div>
        <button onClick={reset} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white cursor-pointer"
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>New game</button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {cards.map(card => (
          <button key={card.id} onClick={() => flip(card.id)}
            className={`w-16 h-16 rounded-xl text-2xl font-bold flex items-center justify-center transition-all duration-300 cursor-pointer select-none border
              ${card.flipped || card.matched
                ? "bg-slate-800 border-indigo-500/50 scale-105"
                : "bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800"
              } ${card.matched ? "border-green-500/50 bg-green-500/10" : ""}`}>
            {card.flipped || card.matched ? card.emoji : <span className="text-slate-600 text-lg">?</span>}
          </button>
        ))}
      </div>

      {won && (
        <div className="mt-2 px-5 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
          <div className="text-green-400 font-bold text-base">You won! 🎉</div>
          <div className="text-slate-400 text-sm">{moves} moves</div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const [active, setActive] = useState<"snake" | "memory">("snake");

  return (
    <AuthGuard>
      <Header title="Games" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-2xl mx-auto">

          {/* Tab selector */}
          <div className="flex gap-2 mb-8">
            {([
              { id: "snake",  label: "🐍 Snake" },
              { id: "memory", label: "🃏 Memory Match" },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActive(tab.id)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border
                  ${active === tab.id
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center">
            {active === "snake"  && <SnakeGame />}
            {active === "memory" && <MemoryGame />}
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
