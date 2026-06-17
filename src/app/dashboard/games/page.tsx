"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";

// ─── API helpers ──────────────────────────────────────────────────────────────
type ScoreEntry = { player: string; value: number; date: string };
type ScoreBoard = { snake: ScoreEntry[] };

async function addScore(game: keyof ScoreBoard, entry: ScoreEntry) {
  try { await fetch("/api/data/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game, entry }) }); } catch { /* silent */ }
}
async function fetchScores(): Promise<ScoreBoard> {
  try { const r = await fetch("/api/data/scores", { cache: "no-store" }); return r.json(); } catch { return { snake: [] }; }
}
async function fetchBalance(player: string): Promise<number> {
  try { const r = await fetch("/api/data/balances", { cache: "no-store" }); const b = await r.json(); return b[player] ?? 500; } catch { return 500; }
}
async function applyDelta(player: string, delta: number): Promise<number> {
  try { const r = await fetch("/api/data/balances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player, delta }) }); const d = await r.json(); return d.balance; } catch { return 0; }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const BETS = [10, 25, 50, 100];

function BetBar({ balance, bet, setBet, disabled }: { balance: number; bet: number; setBet: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <span className="text-xs text-slate-500">Bet:</span>
      {BETS.map(b => (
        <button key={b} disabled={disabled || b > balance} onClick={() => setBet(b)}
          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${bet === b ? "bg-indigo-500/30 border-indigo-500 text-indigo-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
          ₹{b}
        </button>
      ))}
    </div>
  );
}

function ResultBanner({ delta, onClose }: { delta: number; onClose: () => void }) {
  const won = delta > 0, push = delta === 0;
  return (
    <div className={`w-full rounded-2xl border p-5 text-center ${won ? "bg-green-500/10 border-green-500/30" : push ? "bg-slate-700/40 border-slate-600" : "bg-red-500/10 border-red-500/30"}`}>
      <div className={`text-3xl font-bold mb-1 ${won ? "text-green-400" : push ? "text-slate-300" : "text-red-400"}`}>
        {won ? `+₹${delta}` : push ? "Break even" : `-₹${Math.abs(delta)}`}
      </div>
      <div className="text-slate-500 text-sm mb-4">{won ? "Winner!" : push ? "Bet returned." : "Better luck next time."}</div>
      <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Play Again</button>
    </div>
  );
}

// ─── CRASH ────────────────────────────────────────────────────────────────────
function genCrash() {
  if (Math.random() < 0.04) return 1.00;
  return Math.max(1.01, parseFloat((1 / (1 - Math.random() * 0.97)).toFixed(2)));
}

function CrashGame({ player, balance, onBal }: { player: string; balance: number; onBal: (b: number) => void }) {
  const [bet, setBet] = useState(25);
  const [phase, setPhase] = useState<"idle" | "running" | "cashed" | "crashed" | "result">("idle");
  const [mult, setMult] = useState(1.00);
  const [crashAt, setCrashAt] = useState(1.00);
  const [cashedMult, setCashedMult] = useState(0);
  const [delta, setDelta] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const multRef = useRef(1.00);

  function start() {
    if (bet > balance) return;
    const crash = genCrash();
    setCrashAt(crash); multRef.current = 1.00; setMult(1.00); setPhase("running");
    intervalRef.current = setInterval(() => {
      multRef.current = parseFloat((multRef.current * 1.07).toFixed(2));
      setMult(multRef.current);
      if (multRef.current >= crash) {
        clearInterval(intervalRef.current!);
        setHistory(h => [crash, ...h.slice(0, 9)]);
        setPhase("crashed");
        setTimeout(async () => {
          const d = -bet;
          setDelta(d);
          const nb = await applyDelta(player, d);
          onBal(nb);
          setPhase("result");
        }, 1200);
      }
    }, 80);
  }

  async function cashOut() {
    if (phase !== "running") return;
    clearInterval(intervalRef.current!);
    const m = multRef.current;
    setCashedMult(m);
    setPhase("cashed");
    const profit = Math.floor(bet * m) - bet;
    setDelta(profit);
    setHistory(h => [m, ...h.slice(0, 9)]);
    setTimeout(async () => {
      const nb = await applyDelta(player, profit);
      onBal(nb);
      setPhase("result");
    }, 800);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const color = phase === "crashed" ? "#ef4444" : phase === "cashed" ? "#22c55e" : mult < 2 ? "#818cf8" : mult < 5 ? "#f59e0b" : "#22c55e";

  if (phase === "result") return <div className="w-full max-w-sm mx-auto flex flex-col gap-4"><ResultBanner delta={delta} onClose={() => { setPhase("idle"); setMult(1.00); }} /></div>;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      {/* Multiplier display */}
      <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl h-36 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="text-5xl font-black transition-all" style={{ color, textShadow: `0 0 20px ${color}40` }}>
          {phase === "crashed" ? `${crashAt.toFixed(2)}×` : `${mult.toFixed(2)}×`}
        </div>
        <div className="text-xs mt-2 font-semibold" style={{ color }}>
          {phase === "crashed" ? "CRASHED" : phase === "cashed" ? `CASHED OUT @ ${cashedMult.toFixed(2)}×` : phase === "running" ? "LIVE" : "Waiting…"}
        </div>
        {phase === "running" && <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 120%, ${color}08 0%, transparent 70%)` }} />}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="flex gap-1.5 flex-wrap justify-center">
          {history.map((v, i) => (
            <span key={i} className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${v < 2 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>{v.toFixed(2)}×</span>
          ))}
        </div>
      )}

      <BetBar balance={balance} bet={bet} setBet={setBet} disabled={phase === "running"} />

      {phase === "idle" && (
        <button onClick={start} disabled={bet > balance}
          className="w-full py-3 rounded-xl text-white font-bold cursor-pointer disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
          Bet ₹{bet} &amp; Start
        </button>
      )}
      {phase === "running" && (
        <button onClick={cashOut}
          className="w-full py-3 rounded-xl font-black cursor-pointer text-white text-lg animate-pulse"
          style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
          CASH OUT @ {mult.toFixed(2)}×
        </button>
      )}
      {(phase === "crashed" || phase === "cashed") && (
        <div className="w-full py-3 rounded-xl font-bold text-center text-slate-500 bg-slate-800 border border-slate-700">Settling…</div>
      )}
      <p className="text-[11px] text-slate-600">Cash out before the crash · house edge 3%</p>
    </div>
  );
}

// ─── MINES ────────────────────────────────────────────────────────────────────
const MINE_COUNTS = [3, 5, 10];

function minesMult(mines: number, revealed: number): number {
  const total = 25;
  let num = 1, den = 1;
  for (let i = 0; i < revealed; i++) { num *= (total - i); den *= (total - mines - i); }
  return Math.max(1, Math.round(num / den * 0.97 * 100) / 100);
}

type Cell = "hidden" | "safe" | "mine";

function MinesGame({ player, balance, onBal }: { player: string; balance: number; onBal: (b: number) => void }) {
  const [bet, setBet] = useState(25);
  const [mines, setMines] = useState(5);
  const [phase, setPhase] = useState<"idle" | "playing" | "result">("idle");
  const [grid, setGrid] = useState<Cell[]>(Array(25).fill("hidden"));
  const [minePos, setMinePos] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(0);
  const [delta, setDelta] = useState(0);
  const [boom, setBoom] = useState<number | null>(null);

  function startGame() {
    const positions = new Set<number>();
    while (positions.size < mines) positions.add(Math.floor(Math.random() * 25));
    setMinePos(positions); setGrid(Array(25).fill("hidden")); setRevealed(0); setBoom(null); setPhase("playing");
  }

  async function cashOut() {
    const profit = Math.floor(bet * minesMult(mines, revealed)) - bet;
    setDelta(profit);
    // reveal all safe tiles
    setGrid(g => g.map((c, i) => c === "hidden" ? (minePos.has(i) ? "mine" : "safe") : c));
    await applyDelta(player, profit).then(onBal);
    setPhase("result");
  }

  async function pick(idx: number) {
    if (phase !== "playing" || grid[idx] !== "hidden") return;
    if (minePos.has(idx)) {
      setBoom(idx);
      setGrid(g => g.map((c, i) => i === idx ? "mine" : minePos.has(i) ? "mine" : c === "safe" ? "safe" : "hidden"));
      setDelta(-bet);
      await applyDelta(player, -bet).then(onBal);
      setTimeout(() => setPhase("result"), 800);
    } else {
      const nr = revealed + 1;
      setRevealed(nr);
      setGrid(g => g.map((c, i) => i === idx ? "safe" : c));
      // auto cash out if all safe tiles revealed
      if (nr === 25 - mines) {
        const profit = Math.floor(bet * minesMult(mines, nr)) - bet;
        setDelta(profit);
        await applyDelta(player, profit).then(onBal);
        setPhase("result");
      }
    }
  }

  const currentMult = minesMult(mines, revealed);

  if (phase === "result") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {grid.map((c, i) => (
          <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${c === "mine" ? (i === boom ? "bg-red-600 border-red-400 animate-bounce" : "bg-red-900/40 border-red-800") : c === "safe" ? "bg-green-500/20 border-green-500/40" : "bg-slate-800 border-slate-700"}`}>
            {c === "mine" ? "💣" : c === "safe" ? "💎" : ""}
          </div>
        ))}
      </div>
      <ResultBanner delta={delta} onClose={() => setPhase("idle")} />
    </div>
  );

  if (phase === "idle") return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="text-center"><div className="text-3xl mb-1">💣</div><div className="font-bold text-white text-lg">Mines</div><div className="text-xs text-slate-500 mt-0.5">Reveal gems, avoid bombs. Cash out anytime.</div></div>
      <div className="w-full">
        <div className="text-xs text-slate-400 mb-2">Mines count</div>
        <div className="flex gap-2">
          {MINE_COUNTS.map(m => <button key={m} onClick={() => setMines(m)} className={`flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer border transition-all ${mines === m ? "bg-red-500/20 border-red-500 text-red-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"}`}>{m} 💣</button>)}
        </div>
      </div>
      <BetBar balance={balance} bet={bet} setBet={setBet} />
      <div className="text-xs text-slate-500">1st gem → {minesMult(mines,1)}× · 3 gems → {minesMult(mines,3)}× · 5 gems → {minesMult(mines,5)}×</div>
      <button onClick={startGame} disabled={bet > balance} className="w-full py-3 rounded-xl text-white font-bold cursor-pointer disabled:opacity-40" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Bet ₹{bet} &amp; Play</button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between w-full">
        <div className="text-sm text-slate-400">Bet: <span className="text-amber-400 font-bold">₹{bet}</span></div>
        <div className="text-sm text-slate-400">Multiplier: <span className="text-green-400 font-bold">{currentMult}×</span></div>
        <div className="text-sm text-slate-400">Gems: <span className="text-white font-bold">{revealed}</span></div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {grid.map((c, i) => (
          <button key={i} onClick={() => pick(i)} disabled={c !== "hidden"}
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl cursor-pointer border transition-all ${c === "hidden" ? "bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-indigo-500/50 hover:scale-105" : c === "mine" ? (i === boom ? "bg-red-600 border-red-400" : "bg-red-900/40 border-red-800") : "bg-green-500/20 border-green-500/40 scale-105"}`}>
            {c === "mine" ? "💣" : c === "safe" ? "💎" : ""}
          </button>
        ))}
      </div>
      {revealed > 0 && (
        <button onClick={cashOut} className="w-full py-3 rounded-xl font-bold text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
          Cash Out — ₹{Math.floor(bet * currentMult)}
        </button>
      )}
    </div>
  );
}

// ─── DICE ─────────────────────────────────────────────────────────────────────
function DiceGame({ player, balance, onBal }: { player: string; balance: number; onBal: (b: number) => void }) {
  const [bet, setBet] = useState(25);
  const [target, setTarget] = useState(50);
  const [side, setSide] = useState<"over" | "under">("over");
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [delta, setDelta] = useState(0);
  const [phase, setPhase] = useState<"idle" | "result">("idle");

  const winChance = side === "over" ? (99 - target) : target;
  const mult = Math.round(97 / winChance * 100) / 100;

  async function playRound() {
    setRolling(true); setRoll(null);
    await new Promise(r => setTimeout(r, 600));
    const result = Math.floor(Math.random() * 100);
    setRoll(result);
    const won = side === "over" ? result > target : result < target;
    const d = won ? Math.floor(bet * mult) - bet : -bet;
    setDelta(d);
    setRolling(false);
    await applyDelta(player, d).then(onBal);
    setPhase("result");
  }

  if (phase === "result") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-8 flex flex-col items-center">
        <div className="text-6xl font-black mb-2" style={{ color: delta >= 0 ? "#22c55e" : "#ef4444" }}>{roll}</div>
        <div className="text-sm text-slate-400">{side === "over" ? `Needed > ${target}` : `Needed < ${target}`}</div>
      </div>
      <ResultBanner delta={delta} onClose={() => { setPhase("idle"); setRoll(null); }} />
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="text-center"><div className="text-3xl mb-1">🎲</div><div className="font-bold text-white text-lg">Dice</div></div>

      {/* Roll display */}
      <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-8 flex flex-col items-center">
        {rolling ? (
          <div className="text-5xl font-black text-indigo-400 animate-pulse">{Math.floor(Math.random() * 100)}</div>
        ) : (
          <div className="text-5xl font-black text-slate-600">—</div>
        )}
      </div>

      {/* Target slider */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>0</span><span className="text-white font-bold">Target: {target}</span><span>99</span>
        </div>
        <input type="range" min={2} max={97} value={target} onChange={e => setTarget(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer" />
        <div className="flex justify-between mt-2">
          {(["under", "over"] as const).map(s => (
            <button key={s} onClick={() => setSide(s)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer border transition-all ${s === "under" ? "mr-1" : "ml-1"} ${side === s ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
              {s === "under" ? `< ${target} (Under)` : `> ${target} (Over)`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <div className="text-center"><div className="text-slate-500 text-xs">Win chance</div><div className="font-bold text-white">{winChance}%</div></div>
        <div className="text-center"><div className="text-slate-500 text-xs">Multiplier</div><div className="font-bold text-amber-400">{mult}×</div></div>
        <div className="text-center"><div className="text-slate-500 text-xs">Payout</div><div className="font-bold text-green-400">₹{Math.floor(bet * mult)}</div></div>
      </div>

      <BetBar balance={balance} bet={bet} setBet={setBet} disabled={rolling} />
      <button onClick={playRound} disabled={rolling || bet > balance}
        className="w-full py-3 rounded-xl text-white font-bold cursor-pointer disabled:opacity-40"
        style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
        {rolling ? "Rolling…" : `Roll — Bet ₹${bet}`}
      </button>
    </div>
  );
}

// ─── PLINKO ───────────────────────────────────────────────────────────────────
const ROWS = 8;
const MULTIPLIERS = [8.0, 4.0, 2.0, 0.5, 0.3, 0.5, 2.0, 4.0, 8.0];

function PlinkoGame({ player, balance, onBal }: { player: string; balance: number; onBal: (b: number) => void }) {
  const [bet, setBet] = useState(25);
  const [dropping, setDropping] = useState(false);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [finalSlot, setFinalSlot] = useState<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "dropping" | "result">("idle");

  async function drop() {
    setDropping(true); setBallPath([]); setFinalSlot(null); setDelta(null); setPhase("dropping");
    const path = [4]; // start centre
    let pos = 4;
    for (let r = 0; r < ROWS; r++) {
      pos = Math.random() < 0.5 ? Math.max(0, pos - 1) : Math.min(ROWS, pos + 1);
      path.push(pos);
      await new Promise(res => setTimeout(res, 120));
      setBallPath([...path]);
    }
    const slot = pos;
    setFinalSlot(slot);
    const mult = MULTIPLIERS[slot];
    const d = Math.floor(bet * mult) - bet;
    setDelta(d);
    await applyDelta(player, d).then(onBal);
    setDropping(false);
    setPhase("result");
  }

  // Peg board dimensions
  const W = 300, H = 280, slotW = W / 9;

  if (phase === "result") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="text-center text-sm text-slate-400">Landed on <span className="font-bold text-white">{MULTIPLIERS[finalSlot!]}×</span></div>
      <ResultBanner delta={delta!} onClose={() => { setPhase("idle"); setBallPath([]); setFinalSlot(null); }} />
    </div>
  );

  const lastPos = ballPath.length > 0 ? ballPath[ballPath.length - 1] : 4;
  const ballRow = ballPath.length - 1;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="text-center"><div className="text-3xl mb-1">🎰</div><div className="font-bold text-white text-lg">Plinko</div></div>

      {/* Board */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden" style={{ width: W, height: H }}>
        {/* Pegs */}
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: row + 2 }, (_, col) => {
            const x = (W / 2) - ((row + 1) / 2 * 28) + col * 28;
            const y = 20 + row * 28;
            return <div key={`${row}-${col}`} className="absolute w-2 h-2 rounded-full bg-slate-600" style={{ left: x - 4, top: y - 4 }} />;
          })
        )}
        {/* Ball */}
        {phase === "dropping" && (
          <div className="absolute w-4 h-4 rounded-full bg-indigo-400 shadow-[0_0_8px_2px_rgba(129,140,248,0.6)] transition-all duration-100"
            style={{ left: (W / 2) - ((ballRow) / 2 * 28) + lastPos * 28 - 8, top: 12 + ballRow * 28 - 8 }} />
        )}
        {/* Slots */}
        <div className="absolute bottom-0 left-0 right-0 flex h-10">
          {MULTIPLIERS.map((m, i) => (
            <div key={i} className={`flex-1 flex items-center justify-center text-[10px] font-black border-t border-slate-700 transition-all ${finalSlot === i ? "bg-indigo-500/40 text-white" : m >= 4 ? "text-amber-400 bg-amber-500/5" : m >= 1 ? "text-slate-300 bg-slate-800/50" : "text-slate-600 bg-slate-900"}`}>
              {m}×
            </div>
          ))}
        </div>
      </div>

      <BetBar balance={balance} bet={bet} setBet={setBet} disabled={dropping} />
      <button onClick={drop} disabled={dropping || bet > balance}
        className="w-full py-3 rounded-xl text-white font-bold cursor-pointer disabled:opacity-40"
        style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
        {dropping ? "Dropping…" : `Drop Ball — ₹${bet}`}
      </button>
    </div>
  );
}

// ─── SNAKE ────────────────────────────────────────────────────────────────────
const GRID = 20, TICK = 125;
type Pt = { x: number; y: number };
type Dir = "U" | "D" | "L" | "R";
const OPP: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };
const ptEq = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;
function safeFood(snake: Pt[]): Pt {
  let pos: Pt;
  do { pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
  while (snake.some(p => ptEq(p, pos)));
  return pos;
}

function SnakeGame({ playerName }: { playerName: string }) {
  const initSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  const init = () => ({ snake: initSnake, food: safeFood(initSnake), dir: "R" as Dir, pending: "R" as Dir, running: false, dead: false, score: 0 });
  const [g, setG] = useState(init);
  const prevDead = useRef(false);

  // Save score when game ends
  useEffect(() => {
    if (g.dead && !prevDead.current) {
      addScore("snake", { player: playerName, value: g.score, date: new Date().toISOString().split("T")[0] });
    }
    prevDead.current = g.dead;
  }, [g.dead, g.score, playerName]);

  const tick = useCallback(() => {
    setG(prev => {
      if (!prev.running || prev.dead) return prev;
      const d = prev.pending, h = prev.snake[0];
      const next = { x: (h.x + (d === "R" ? 1 : d === "L" ? -1 : 0) + GRID) % GRID, y: (h.y + (d === "D" ? 1 : d === "U" ? -1 : 0) + GRID) % GRID };
      const ate = ptEq(next, prev.food);
      const newSnake = [next, ...prev.snake.slice(0, ate ? undefined : -1)];
      const dead = newSnake.slice(1).some(p => ptEq(p, next));
      return { ...prev, snake: newSnake, food: ate ? safeFood(newSnake) : prev.food, score: prev.score + (ate ? 1 : 0), dead, running: !dead, dir: d };
    });
  }, []);

  useEffect(() => { if (!g.running) return; const t = setInterval(tick, TICK); return () => clearInterval(t); }, [g.running, tick]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R", w: "U", s: "D", a: "L", d: "R" };
      const d = map[e.key]; if (!d) return; e.preventDefault();
      setG(prev => { if (d === OPP[prev.dir]) return prev; if (!prev.running && !prev.dead) return { ...prev, running: true, pending: d }; return { ...prev, pending: d }; });
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const CELL = 18, SIZE = GRID * CELL;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <div className="text-sm text-slate-400">Score: <span className="font-bold text-white text-lg">{g.score}</span></div>
        {!g.running && <button onClick={() => { prevDead.current = false; setG({ ...init(), running: true }); }} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>{g.dead ? "Restart" : "Start"}</button>}
      </div>
      <div className="relative rounded-xl overflow-hidden border border-slate-700" style={{ width: SIZE, height: SIZE, background: "#0f172a" }}>
        <svg width={SIZE} height={SIZE} className="absolute inset-0 opacity-10">{Array.from({ length: GRID }, (_, y) => Array.from({ length: GRID }, (_, x) => <circle key={`${x}-${y}`} cx={x * CELL + CELL / 2} cy={y * CELL + CELL / 2} r="1" fill="#94a3b8" />))}</svg>
        <div className="absolute flex items-center justify-center" style={{ width: CELL, height: CELL, left: g.food.x * CELL, top: g.food.y * CELL, fontSize: CELL - 4, lineHeight: 1 }}>🍺</div>
        {g.snake.map((p, i) => <div key={i} className="absolute rounded-sm" style={{ width: CELL - 2, height: CELL - 2, left: p.x * CELL + 1, top: p.y * CELL + 1, background: i === 0 ? "#818cf8" : `rgba(99,102,241,${1 - i / g.snake.length * 0.7})`, boxShadow: i === 0 ? "0 0 6px 1px rgba(129,140,248,0.5)" : undefined }} />)}
        {!g.running && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 rounded-xl">
          {g.dead ? <><div className="text-2xl font-bold text-white mb-1">Game Over</div><div className="text-slate-400 text-sm mb-3">Score: {g.score}</div></> : <><div className="text-xl font-bold text-white mb-1">Snake 🐍</div><div className="text-slate-400 text-sm mb-3">Collect 🍺 · Arrow keys / WASD</div></>}
        </div>}
      </div>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function Leaderboard() {
  const [scores, setScores] = useState<ScoreBoard>({ snake: [] });
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setScores(await fetchScores()); setLoading(false); }
  useEffect(() => { load(); }, []);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      <div className="text-center mb-2"><div className="text-2xl mb-1">🏆</div><div className="font-bold text-white">Leaderboard</div><div className="text-xs text-slate-500 mt-0.5">Shared across all team members</div></div>
      {loading ? <div className="text-center text-slate-500 text-sm py-8">Loading…</div> : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700"><span className="font-semibold text-slate-200 text-sm">🐍 Snake</span></div>
          {(scores.snake ?? []).length === 0 ? <div className="px-4 py-4 text-center text-slate-600 text-xs">No scores yet — play Snake!</div> : (
            <div className="divide-y divide-slate-700/50">
              {(scores.snake ?? []).slice(0, 10).map((e, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-5 text-center text-sm">{medals[i] ?? <span className="text-slate-500 text-xs">{i + 1}</span>}</span>
                  <span className="flex-1 text-sm font-medium text-slate-200">{e.player}</span>
                  <span className="text-sm font-bold text-indigo-400">{e.value} <span className="text-slate-500 font-normal text-xs">pts</span></span>
                  <span className="text-xs text-slate-600">{e.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <button onClick={load} className="w-full py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">↻ Refresh</button>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
type Tab = "crash" | "mines" | "dice" | "plinko" | "snake" | "leaderboard";
const TABS: { id: Tab; label: string }[] = [
  { id: "crash",       label: "🚀 Crash"       },
  { id: "mines",       label: "💣 Mines"        },
  { id: "dice",        label: "🎲 Dice"         },
  { id: "plinko",      label: "🎰 Plinko"       },
  { id: "snake",       label: "🐍 Snake"        },
  { id: "leaderboard", label: "🏆 Leaderboard"  },
];

export default function GamesPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<Tab>("crash");
  const [balance, setBalance] = useState<number | null>(null);
  const playerName = user?.name ?? "Player";

  useEffect(() => { fetchBalance(playerName).then(setBalance); }, [playerName]);

  async function refill() {
    const current = balance ?? 0;
    const nb = await applyDelta(playerName, 500 - current);
    setBalance(nb);
  }

  return (
    <AuthGuard>
      <Header title="Games" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-2xl mx-auto">
          {/* Balance bar */}
          {balance !== null && (
            <div className="mb-5 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-3">
              <div><span className="text-xs text-slate-500">💰 Demo Balance</span></div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white">₹{balance.toLocaleString("en-IN")}</span>
                {balance < 50 && (
                  <button onClick={refill} className="px-3 py-1 rounded-lg text-xs font-bold text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
                    ↺ Refill ₹500
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-1.5 mb-7 flex-wrap">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActive(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${active === t.id ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center">
            {active === "crash"       && balance !== null && <CrashGame  player={playerName} balance={balance} onBal={setBalance} />}
            {active === "mines"       && balance !== null && <MinesGame  player={playerName} balance={balance} onBal={setBalance} />}
            {active === "dice"        && balance !== null && <DiceGame   player={playerName} balance={balance} onBal={setBalance} />}
            {active === "plinko"      && balance !== null && <PlinkoGame player={playerName} balance={balance} onBal={setBalance} />}
            {active === "snake"       && <SnakeGame playerName={playerName} />}
            {active === "leaderboard" && <Leaderboard />}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
