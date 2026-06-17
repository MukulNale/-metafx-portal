"use client";
import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";

// ─── Score + Balance API ──────────────────────────────────────────────────────
type ScoreEntry = { player: string; value: number; date: string };
type ScoreBoard = { snake: ScoreEntry[]; memory: ScoreEntry[]; wordle: ScoreEntry[]; trivia: ScoreEntry[] };

async function addScore(game: keyof ScoreBoard, entry: ScoreEntry) {
  try { await fetch("/api/data/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game, entry }) }); } catch { /* silent */ }
}
async function fetchScores(): Promise<ScoreBoard> {
  try { const r = await fetch("/api/data/scores", { cache: "no-store" }); return r.json(); }
  catch { return { snake: [], memory: [], wordle: [], trivia: [] }; }
}
async function fetchBalance(player: string): Promise<number> {
  try { const r = await fetch("/api/data/balances", { cache: "no-store" }); const b = await r.json(); return b[player] ?? 500; }
  catch { return 500; }
}
async function updateBalance(player: string, delta: number): Promise<number> {
  try { const r = await fetch("/api/data/balances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player, delta }) }); const d = await r.json(); return d.balance; }
  catch { return 0; }
}

// ─── Shared betting UI ────────────────────────────────────────────────────────
const BET_OPTIONS = [10, 25, 50, 100];
function BetSelector({ balance, bet, setBet, onStart, label }: { balance: number; bet: number; setBet: (n: number) => void; onStart: () => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">
      <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 text-center">
        <div className="text-xs text-slate-500 mb-1">Your Balance</div>
        <div className="text-3xl font-bold text-white">₹{balance.toLocaleString("en-IN")}</div>
      </div>
      <div className="w-full">
        <div className="text-xs font-medium text-slate-400 mb-2">Choose your bet</div>
        <div className="grid grid-cols-4 gap-2">
          {BET_OPTIONS.map(b => (
            <button key={b} onClick={() => setBet(b)} disabled={b > balance}
              className={`py-2.5 rounded-xl text-sm font-bold cursor-pointer border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${bet === b ? "bg-indigo-500/30 border-indigo-500 text-indigo-300" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
              ₹{b}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onStart} disabled={bet === 0 || bet > balance}
        className="w-full py-3 rounded-xl text-white font-bold cursor-pointer disabled:opacity-40 text-sm"
        style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>
        {label} — Bet ₹{bet}
      </button>
    </div>
  );
}

function WinLoseBanner({ won, profit, bet, onClose }: { won: boolean | "push"; profit: number; bet: number; onClose: () => void }) {
  return (
    <div className={`w-full rounded-2xl border p-5 text-center ${won === true ? "bg-green-500/10 border-green-500/30" : won === "push" ? "bg-slate-700/40 border-slate-600" : "bg-red-500/10 border-red-500/30"}`}>
      <div className={`text-2xl font-bold mb-1 ${won === true ? "text-green-400" : won === "push" ? "text-slate-300" : "text-red-400"}`}>
        {won === true ? `🎉 +₹${profit}` : won === "push" ? "🤝 Break even" : `😔 -₹${bet}`}
      </div>
      <div className="text-slate-400 text-sm mb-3">{won === true ? `You won ₹${profit} profit!` : won === "push" ? "Bet returned." : `Better luck next time.`}</div>
      <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Play Again</button>
    </div>
  );
}

// ─── Snake ────────────────────────────────────────────────────────────────────
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

  const tick = useCallback(() => {
    setG(prev => {
      if (!prev.running || prev.dead) return prev;
      const d = prev.pending, h = prev.snake[0];
      const next = { x: (h.x + (d === "R" ? 1 : d === "L" ? -1 : 0) + GRID) % GRID, y: (h.y + (d === "D" ? 1 : d === "U" ? -1 : 0) + GRID) % GRID };
      const ate = ptEq(next, prev.food);
      const newSnake = [next, ...prev.snake.slice(0, ate ? undefined : -1)];
      const dead = newSnake.slice(1).some(p => ptEq(p, next));
      if (dead) addScore("snake", { player: playerName, value: prev.score + (ate ? 1 : 0), date: new Date().toISOString().split("T")[0] });
      return { ...prev, snake: newSnake, food: ate ? safeFood(newSnake) : prev.food, score: prev.score + (ate ? 1 : 0), dead, running: !dead, dir: d };
    });
  }, [playerName]);

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
        {!g.running && <button onClick={() => setG({ ...init(), running: true })} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>{g.dead ? "Restart" : "Start"}</button>}
      </div>
      <div className="relative rounded-xl overflow-hidden border border-slate-700" style={{ width: SIZE, height: SIZE, background: "#0f172a" }}>
        <svg width={SIZE} height={SIZE} className="absolute inset-0 opacity-10">{Array.from({ length: GRID }, (_, y) => Array.from({ length: GRID }, (_, x) => <circle key={`${x}-${y}`} cx={x * CELL + CELL / 2} cy={y * CELL + CELL / 2} r="1" fill="#94a3b8" />))}</svg>
        {/* Beer bottle food */}
        <div className="absolute flex items-center justify-center" style={{ width: CELL, height: CELL, left: g.food.x * CELL, top: g.food.y * CELL, fontSize: CELL - 4, lineHeight: 1 }}>🍺</div>
        {g.snake.map((p, i) => <div key={i} className="absolute rounded-sm" style={{ width: CELL - 2, height: CELL - 2, left: p.x * CELL + 1, top: p.y * CELL + 1, background: i === 0 ? "#818cf8" : `rgba(99,102,241,${1 - i / g.snake.length * 0.7})`, boxShadow: i === 0 ? "0 0 6px 1px rgba(129,140,248,0.5)" : undefined }} />)}
        {!g.running && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 rounded-xl">
          {g.dead ? <><div className="text-2xl font-bold text-white mb-1">Game Over</div><div className="text-slate-400 text-sm mb-3">Score: {g.score}</div></> : <><div className="text-xl font-bold text-white mb-1">Snake 🐍</div><div className="text-slate-400 text-sm mb-3">Collect 🍺 · Arrow keys or WASD</div></>}
        </div>}
      </div>
      <p className="text-xs text-slate-600">Arrow keys / WASD · score saves on death</p>
    </div>
  );
}

// ─── Memory Match (Stake) ─────────────────────────────────────────────────────
const EMOJIS = ["🎬", "🎭", "🎨", "🎵", "🌟", "🚀", "🦋", "🎯"];
type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const makeCards = () => shuffle([...EMOJIS, ...EMOJIS].map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false })));

// Payout: ≤10 moves → 3×bet profit | ≤15 → 2×bet | ≤20 → push | >20 → lose
function memoryPayout(moves: number, bet: number): { won: boolean | "push"; profit: number } {
  if (moves <= 10) return { won: true, profit: bet * 3 };
  if (moves <= 15) return { won: true, profit: bet * 2 };
  if (moves <= 20) return { won: "push", profit: 0 };
  return { won: false, profit: 0 };
}

function MemoryGame({ playerName, balance, onBalanceChange }: { playerName: string; balance: number; onBalanceChange: (b: number) => void }) {
  const [phase, setPhase] = useState<"bet" | "play" | "result">("bet");
  const [bet, setBet] = useState(25);
  const [cards, setCards] = useState<Card[]>(makeCards);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<{ won: boolean | "push"; profit: number } | null>(null);

  function startGame() {
    setCards(makeCards()); setMoves(0); setLocked(false); setResult(null); setPhase("play");
  }
  async function finish(finalMoves: number) {
    const r = memoryPayout(finalMoves, bet);
    setResult(r);
    addScore("memory", { player: playerName, value: finalMoves, date: new Date().toISOString().split("T")[0] });
    const delta = r.won === true ? r.profit : r.won === "push" ? 0 : -bet;
    const newBal = await updateBalance(playerName, delta);
    onBalanceChange(newBal);
    setPhase("result");
  }

  function flip(id: number) {
    if (locked || phase !== "play") return;
    setCards(prev => { const c = prev.find(c => c.id === id); if (!c || c.flipped || c.matched) return prev; return prev.map(x => x.id === id ? { ...x, flipped: true } : x); });
    setCards(prev => {
      const flipped = prev.filter(c => c.flipped && !c.matched);
      if (flipped.length === 2) {
        setMoves(m => {
          const nm = m + 1;
          setLocked(true);
          setTimeout(() => {
            setCards(prev2 => {
              const [a, b] = flipped;
              const match = a.emoji === b.emoji;
              const updated = prev2.map(c => [a.id, b.id].includes(c.id) ? { ...c, matched: match, flipped: match } : c);
              if (updated.every(c => c.matched)) setTimeout(() => finish(nm), 300);
              return updated;
            });
            setLocked(false);
          }, 900);
          return nm;
        });
      }
      return prev;
    });
  }

  if (phase === "bet") return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="text-center mb-1">
        <div className="text-lg font-bold text-white mb-1">🃏 Memory Match</div>
        <div className="text-xs text-slate-500">≤10 moves → 3× · ≤15 → 2× · ≤20 → push · else lose</div>
      </div>
      <BetSelector balance={balance} bet={bet} setBet={setBet} onStart={startGame} label="Play Memory" />
    </div>
  );

  if (phase === "result") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="text-sm text-slate-400">Completed in <span className="text-white font-bold">{moves} moves</span></div>
      <WinLoseBanner won={result!.won} profit={result!.profit} bet={bet} onClose={() => setPhase("bet")} />
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <div className="text-sm text-slate-400">Moves: <span className="font-bold text-white text-lg">{moves}</span></div>
        <div className="text-sm text-slate-400">Bet: <span className="font-bold text-amber-400">₹{bet}</span></div>
        <div className="text-sm text-slate-400">Matched: <span className="font-bold text-green-400">{cards.filter(c => c.matched).length / 2}/{EMOJIS.length}</span></div>
      </div>
      <div className="text-xs text-slate-600">≤10 moves → 3× · ≤15 → 2× · ≤20 → push</div>
      <div className="grid grid-cols-4 gap-3">
        {cards.map(card => (
          <button key={card.id} onClick={() => flip(card.id)}
            className={`w-16 h-16 rounded-xl text-2xl flex items-center justify-center transition-all duration-300 cursor-pointer select-none border ${card.flipped || card.matched ? "bg-slate-800 border-indigo-500/50 scale-105" : "bg-slate-800/60 border-slate-700 hover:border-slate-500"} ${card.matched ? "border-green-500/50 bg-green-500/10" : ""}`}>
            {card.flipped || card.matched ? card.emoji : <span className="text-slate-600 text-lg">?</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Wordle (Stake) ───────────────────────────────────────────────────────────
const WORDS = ["SCENE", "LIGHT", "FRAME", "SHOOT", "DRAFT", "SOUND", "SCORE", "STORY", "ACTOR", "STAGE", "DANCE", "TEMPO", "LYRIC", "PITCH", "BEATS", "AUDIO", "PRINT", "FOCUS", "ANGLE", "PAINT", "BRUSH", "MOVIE", "PIXEL", "BLOOM", "TRACK", "CABLE", "PRISM", "BOKEH", "CRANE", "SLATE"];
const pickWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];
const MAX_HINTS = 3;

// Payout: 1-2 guesses → 4× | 3-4 → 2× | 5-6 → push | fail → lose
function wordlePayout(guesses: number, solved: boolean, bet: number): { won: boolean | "push"; profit: number } {
  if (!solved) return { won: false, profit: 0 };
  if (guesses <= 2) return { won: true, profit: bet * 4 };
  if (guesses <= 4) return { won: true, profit: bet * 2 };
  return { won: "push", profit: 0 };
}

function WordleGame({ playerName, balance, onBalanceChange }: { playerName: string; balance: number; onBalanceChange: (b: number) => void }) {
  const [phase, setPhase] = useState<"bet" | "play" | "result">("bet");
  const [bet, setBet] = useState(25);
  const [target, setTarget] = useState(pickWord);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState<"win" | "lose" | null>(null);
  const [shake, setShake] = useState(false);
  const [hintedPositions, setHintedPositions] = useState<Set<number>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [result, setResult] = useState<{ won: boolean | "push"; profit: number } | null>(null);
  const MAX = 6;

  async function finishGame(solved: boolean, numGuesses: number) {
    const r = wordlePayout(numGuesses, solved, bet);
    setResult(r);
    addScore("wordle", { player: playerName, value: solved ? numGuesses : 99, date: new Date().toISOString().split("T")[0] });
    const delta = r.won === true ? r.profit : r.won === "push" ? 0 : -bet;
    const newBal = await updateBalance(playerName, delta);
    onBalanceChange(newBal);
    setPhase("result");
  }

  const submitGuess = useCallback((guess: string) => {
    if (done || guess.length !== 5) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    const next = [...guesses, guess];
    setGuesses(next);
    const solved = guess === target;
    if (solved) { setDone("win"); setTimeout(() => finishGame(true, next.length), 600); }
    else if (next.length >= MAX) { setDone("lose"); setTimeout(() => finishGame(false, next.length), 600); }
    setCurrent("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guesses, target, done, bet]);

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      const k = e.key.toUpperCase();
      if (k === "ENTER") submitGuess(current);
      else if (k === "BACKSPACE") setCurrent(p => p.slice(0, -1));
      else if (/^[A-Z]$/.test(k) && current.length < 5) setCurrent(p => p + k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, done, submitGuess, phase]);

  function startGame() {
    setTarget(pickWord()); setGuesses([]); setCurrent(""); setDone(null);
    setHintedPositions(new Set()); setHintsUsed(0); setResult(null); setPhase("play");
  }

  function useHint() {
    if (done || hintsUsed >= MAX_HINTS) return;
    const revealed = new Set<number>(hintedPositions);
    for (const g of guesses) for (let i = 0; i < 5; i++) if (g[i] === target[i]) revealed.add(i);
    const candidates = [0, 1, 2, 3, 4].filter(i => !revealed.has(i));
    if (!candidates.length) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setHintedPositions(prev => new Set([...prev, pick]));
    setHintsUsed(h => h + 1);
  }

  function tileStyle(row: number, col: number): { bg: string; border: string } {
    if (row < guesses.length) {
      const g = guesses[row], t = target, targetArr = t.split(""), state = Array(5).fill("absent");
      for (let i = 0; i < 5; i++) if (g[i] === t[i]) { state[i] = "correct"; targetArr[i] = "_"; }
      for (let i = 0; i < 5; i++) { if (state[i] === "correct") continue; const idx = targetArr.indexOf(g[i]); if (idx !== -1) { state[i] = "present"; targetArr[idx] = "_"; } }
      const s = state[col];
      return { bg: s === "correct" ? "#22c55e" : s === "present" ? "#eab308" : "#334155", border: "transparent" };
    }
    if (row === guesses.length) return { bg: "transparent", border: current[col] ? "#6366f1" : "#334155" };
    return { bg: "transparent", border: "#1e293b" };
  }

  const letterState: Record<string, string> = {};
  for (const g of guesses) {
    const targetArr = target.split(""), state = Array(5).fill("absent");
    for (let i = 0; i < 5; i++) if (g[i] === target[i]) { state[i] = "correct"; targetArr[i] = "_"; }
    for (let i = 0; i < 5; i++) { if (state[i] === "correct") continue; const idx = targetArr.indexOf(g[i]); if (idx !== -1) { state[i] = "present"; targetArr[idx] = "_"; } }
    for (let i = 0; i < 5; i++) { const prev = letterState[g[i]]; if (prev === "correct") continue; if (state[i] === "correct" || (!prev && state[i] === "present") || (!prev && state[i] === "absent")) letterState[g[i]] = state[i]; }
  }
  const kbColor = (l: string) => ({ correct: "bg-green-600 text-white", present: "bg-yellow-500 text-white", absent: "bg-slate-700 text-slate-400" })[letterState[l] ?? ""] ?? "bg-slate-700 text-slate-300";
  const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

  if (phase === "bet") return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="text-center mb-1">
        <div className="text-lg font-bold text-white mb-1">📝 Wordle</div>
        <div className="text-xs text-slate-500">1-2 guesses → 4× · 3-4 → 2× · 5-6 → push · miss → lose</div>
      </div>
      <BetSelector balance={balance} bet={bet} setBet={setBet} onStart={startGame} label="Play Wordle" />
    </div>
  );

  if (phase === "result") return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      <div className="text-sm text-slate-400">{done === "win" ? `Solved in ${guesses.length} guesses` : `Word was: ${target}`}</div>
      <WinLoseBanner won={result!.won} profit={result!.profit} bet={bet} onClose={() => setPhase("bet")} />
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="text-sm text-slate-400">Bet: <span className="font-bold text-amber-400">₹{bet}</span></span>
        <span className="text-xs text-slate-600">1-2→4× · 3-4→2× · 5-6→push</span>
        {!done && <button onClick={useHint} disabled={hintsUsed >= MAX_HINTS}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${hintsUsed >= MAX_HINTS ? "bg-slate-800/40 border-slate-700 text-slate-600 cursor-not-allowed" : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"}`}>
          💡 Hint ({MAX_HINTS - hintsUsed} left)
        </button>}
      </div>
      <div className={`grid gap-1.5 ${shake ? "animate-[shake_0.4s_ease]" : ""}`}>
        {Array.from({ length: MAX }, (_, row) => (
          <div key={row} className="flex gap-1.5">
            {Array.from({ length: 5 }, (_, col) => {
              const { bg, border } = tileStyle(row, col);
              const isCurrentRow = row === guesses.length;
              const letter = row < guesses.length ? guesses[row][col] : isCurrentRow ? current[col] ?? (hintedPositions.has(col) ? target[col] : "") : "";
              const isHint = isCurrentRow && hintedPositions.has(col) && !current[col];
              return <div key={col} className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold transition-all duration-300"
                style={{ background: isHint ? "rgba(234,179,8,0.15)" : bg, border: `2px solid ${isHint ? "#eab308" : border}`, color: isHint ? "#fbbf24" : "white" }}>{letter}</div>;
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1.5 mt-1">
        {ROWS.map(row => (
          <div key={row} className="flex gap-1">
            {row.split("").map(l => <button key={l} onClick={() => { if (!done && current.length < 5) setCurrent(p => p + l); }} className={`w-8 h-9 rounded text-[11px] font-bold cursor-pointer transition-colors ${kbColor(l)}`}>{l}</button>)}
            {row === "ZXCVBNM" && <button onClick={() => { if (!done) setCurrent(p => p.slice(0, -1)); }} className="px-2 h-9 rounded text-[11px] font-bold cursor-pointer bg-slate-700 text-slate-300 hover:bg-slate-600 ml-1">⌫</button>}
          </div>
        ))}
        <button onClick={() => submitGuess(current)} className="mt-1 px-8 h-9 rounded text-xs font-bold cursor-pointer bg-slate-700 text-slate-300 hover:bg-slate-600">ENTER</button>
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }`}</style>
    </div>
  );
}

// ─── Trivia (Stake) ───────────────────────────────────────────────────────────
const QUESTIONS = [
  { q: "What does 'fps' stand for in filmmaking?",        opts: ["Frames Per Second","Focal Point System","Film Processing Speed","Focus Pull Shot"], ans: 0 },
  { q: "Who directed '2001: A Space Odyssey'?",           opts: ["James Cameron","Stanley Kubrick","Ridley Scott","Steven Spielberg"],                  ans: 1 },
  { q: "What is a 'storyboard'?",                         opts: ["A sound recording","A visual scene-by-scene plan","A film budget","A lens spec"],     ans: 1 },
  { q: "What does 'ADR' stand for in post-production?",   opts: ["Audio Data Record","Ambient Drama Rerun","Automated Dialogue Replacement","Advanced Digital Rendering"], ans: 2 },
  { q: "What year was the first Star Wars released?",     opts: ["1972","1975","1980","1977"],                                                            ans: 3 },
  { q: "What is 'B-roll' footage?",                       opts: ["Bad takes","Supplementary / cutaway footage","Budget tracking","Bottom captions"],     ans: 1 },
  { q: "Who composed the score for Inception?",           opts: ["John Williams","Howard Shore","Hans Zimmer","Danny Elfman"],                           ans: 2 },
  { q: "What is the rule of thirds?",                     opts: ["An aspect ratio","A budget guideline","A visual composition principle","A frame rate"], ans: 2 },
  { q: "What does 'LUT' stand for in color grading?",     opts: ["Luminance Unity Tool","Look Up Table","Layer Usage Template","Light Under Tones"],     ans: 1 },
  { q: "Which company developed Unreal Engine?",          opts: ["Valve","Unity Technologies","Crytek","Epic Games"],                                     ans: 3 },
  { q: "What does 'VFX' stand for?",                      opts: ["Video Flux Extension","Visual Effects","Vector Field Export","Vignette Frame Exchange"], ans: 1 },
  { q: "What is a 'dolly shot'?",                         opts: ["A handheld shot","An aerial shot","A camera on a rolling track","A zoom effect"],      ans: 2 },
  { q: "What is 'foley' in filmmaking?",                  opts: ["A type of lens","Recreated everyday sound effects","A color palette","A lighting rig"], ans: 1 },
  { q: "The golden ratio is approximately:",              opts: ["2.718","3.141","1.618","1.414"],                                                         ans: 2 },
  { q: "What does 'IP' mean in the film industry?",       opts: ["Image Processing","Intellectual Property","Incremental Production","Integrated Pipeline"], ans: 1 },
];
function pickQuestions(n = 8) { return [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, n); }

// Payout: 100% → 3× | ≥75% → 2× | ≥50% → push | <50% → lose
function triviaPayout(score: number, total: number, bet: number): { won: boolean | "push"; profit: number } {
  const pct = score / total;
  if (pct >= 1)    return { won: true, profit: bet * 3 };
  if (pct >= 0.75) return { won: true, profit: bet * 2 };
  if (pct >= 0.5)  return { won: "push", profit: 0 };
  return { won: false, profit: 0 };
}

type TriviaPhase = "bet" | "setup" | "p1" | "p2" | "result";

function TriviaGame({ playerName, balance, onBalanceChange }: { playerName: string; balance: number; onBalanceChange: (b: number) => void }) {
  const [phase, setPhase] = useState<TriviaPhase>("bet");
  const [bet, setBet] = useState(25);
  const [p2Name, setP2Name] = useState("");
  const [questions, setQuestions] = useState(() => pickQuestions(8));
  const [qIndex, setQIndex] = useState(0);
  const [p1Answers, setP1Answers] = useState<number[]>([]);
  const [p2Answers, setP2Answers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<{ won: boolean | "push"; profit: number } | null>(null);

  function startSetup() { setPhase("setup"); }
  function startGame() {
    const qs = pickQuestions(8);
    setQuestions(qs); setQIndex(0); setP1Answers([]); setP2Answers([]); setSelected(null); setRevealed(false); setPhase("p1");
  }

  async function pick(i: number) {
    if (revealed || selected !== null) return;
    setSelected(i); setRevealed(true);
    setTimeout(async () => {
      const answers = phase === "p1" ? p1Answers : p2Answers;
      const nextAnswers = [...answers, i];
      if (phase === "p1") setP1Answers(nextAnswers);
      else setP2Answers(nextAnswers);

      if (qIndex + 1 >= questions.length) {
        if (phase === "p1") { setPhase("p2"); setQIndex(0); setSelected(null); setRevealed(false); }
        else {
          const s1 = nextAnswers.filter((a, j) => a === questions[j].ans).length;
          const s2 = [...p2Answers, i].filter((a, j) => a === questions[j].ans).length;
          addScore("trivia", { player: playerName, value: s1, date: new Date().toISOString().split("T")[0] });
          if (p2Name) addScore("trivia", { player: p2Name, value: s2, date: new Date().toISOString().split("T")[0] });
          const r = triviaPayout(s1, questions.length, bet);
          setResult(r);
          const delta = r.won === true ? r.profit : r.won === "push" ? 0 : -bet;
          const newBal = await updateBalance(playerName, delta);
          onBalanceChange(newBal);
          setPhase("result");
        }
      } else { setQIndex(q => q + 1); setSelected(null); setRevealed(false); }
    }, 900);
  }

  const p1Score = p1Answers.filter((a, i) => a === questions[i].ans).length;
  const p2Score = p2Answers.filter((a, i) => a === questions[i].ans).length;
  const q = questions[qIndex];
  const currentPlayer = phase === "p1" ? playerName : (p2Name || "Player 2");

  if (phase === "bet") return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="text-center mb-1">
        <div className="text-lg font-bold text-white mb-1">🎯 Trivia Battle</div>
        <div className="text-xs text-slate-500">100% → 3× · ≥75% → 2× · ≥50% → push · else lose</div>
      </div>
      <BetSelector balance={balance} bet={bet} setBet={setBet} onStart={startSetup} label="Continue to Setup" />
    </div>
  );

  if (phase === "setup") return (
    <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
      <div className="text-center"><div className="text-3xl mb-2">🎯</div><div className="font-bold text-white text-lg">Trivia Battle</div><div className="text-slate-400 text-sm mt-1">2-player pass-and-play · 8 questions · Bet ₹{bet}</div></div>
      <div className="w-full"><label className="block text-xs font-medium text-slate-400 mb-1">Player 2 name (optional)</label><input value={p2Name} onChange={e => setP2Name(e.target.value)} placeholder="Enter teammate's name…" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500" /></div>
      <button onClick={startGame} className="w-full py-2.5 rounded-xl text-white font-semibold cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Start — {playerName} goes first</button>
    </div>
  );

  if (phase === "result") {
    const winner = p1Score > p2Score ? playerName : p1Score < p2Score ? (p2Name || "P2") : null;
    return (
      <div className="flex flex-col items-center gap-4 max-w-sm mx-auto w-full">
        <div className="flex gap-4 w-full">
          {[{ name: playerName, score: p1Score }, { name: p2Name || "Player 2", score: p2Score }].map(({ name, score }) => (
            <div key={name} className={`flex-1 rounded-xl p-4 text-center border ${score === Math.max(p1Score, p2Score) && p1Score !== p2Score ? "bg-indigo-500/20 border-indigo-500/40" : "bg-slate-800 border-slate-700"}`}>
              <div className="text-slate-400 text-sm mb-1">{name}</div>
              <div className="text-3xl font-bold text-white">{score}/{questions.length}</div>
            </div>
          ))}
        </div>
        <div className="text-sm text-slate-400 text-center">{winner ? `${winner} wins!` : "Tie game!"}</div>
        <WinLoseBanner won={result!.won} profit={result!.profit} bet={bet} onClose={() => setPhase("bet")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 max-w-sm mx-auto w-full">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${phase === "p1" ? "bg-indigo-400" : "bg-amber-400"}`} /><span className="text-sm font-semibold text-white">{currentPlayer}&apos;s turn</span></div>
        <div className="flex items-center gap-3"><span className="text-xs text-amber-400 font-semibold">Bet ₹{bet}</span><span className="text-xs text-slate-500">Q{qIndex + 1}/{questions.length}</span></div>
      </div>
      <div className="w-full bg-slate-800/50 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${(qIndex / questions.length) * 100}%` }} /></div>
      {phase === "p2" && qIndex === 0 && <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center text-sm text-amber-400">Pass the device to <strong>{p2Name || "Player 2"}</strong> 🤝</div>}
      <div className="w-full bg-slate-800 rounded-2xl p-5"><p className="text-white font-semibold text-base leading-relaxed">{q.q}</p></div>
      <div className="w-full grid grid-cols-1 gap-2">
        {q.opts.map((opt, i) => {
          let style = "bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-700";
          if (revealed) {
            if (i === q.ans) style = "bg-green-500/20 border-green-500/50 text-green-300";
            else if (i === selected) style = "bg-red-500/20 border-red-500/50 text-red-300";
            else style = "bg-slate-800 border-slate-700 text-slate-500";
          } else if (selected === i) style = "bg-indigo-500/20 border-indigo-500 text-indigo-300";
          return <button key={i} onClick={() => pick(i)} disabled={revealed} className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${style}`}><span className="text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>{opt}</button>;
        })}
      </div>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard() {
  const [scores, setScores] = useState<ScoreBoard>({ snake: [], memory: [], wordle: [], trivia: [] });
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); setScores(await fetchScores()); setLoading(false); }
  useEffect(() => { load(); }, []);

  const medals = ["🥇", "🥈", "🥉"];
  const GAMES: { key: keyof ScoreBoard; label: string; unit: string; lowBetter?: boolean }[] = [
    { key: "snake",  label: "🐍 Snake",        unit: "pts" },
    { key: "memory", label: "🃏 Memory Match",  unit: "moves", lowBetter: true },
    { key: "wordle", label: "📝 Wordle",        unit: "guesses", lowBetter: true },
    { key: "trivia", label: "🎯 Trivia Battle", unit: "pts" },
  ];

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      <div className="text-center mb-2"><div className="text-2xl mb-1">🏆</div><div className="font-bold text-white">Leaderboard</div><div className="text-xs text-slate-500 mt-0.5">Shared across all team members</div></div>
      {loading ? <div className="text-center text-slate-500 text-sm py-8">Loading…</div> : GAMES.map(({ key, label, unit, lowBetter }) => {
        const list = (scores[key] ?? []).filter(e => e.value !== 99);
        return (
          <div key={key} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700"><span className="font-semibold text-slate-200 text-sm">{label}</span>{lowBetter && <span className="text-[10px] text-slate-500 ml-2">lower is better</span>}</div>
            {list.length === 0 ? <div className="px-4 py-4 text-center text-slate-600 text-xs">No scores yet</div> : (
              <div className="divide-y divide-slate-700/50">
                {list.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-sm w-5 text-center">{medals[i] ?? <span className="text-slate-500 text-xs">{i + 1}</span>}</span>
                    <span className="flex-1 text-sm font-medium text-slate-200">{e.player}</span>
                    <span className="text-sm font-bold text-indigo-400">{e.value} <span className="text-slate-500 font-normal text-xs">{unit}</span></span>
                    <span className="text-xs text-slate-600">{e.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={load} className="w-full py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">↻ Refresh</button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = "snake" | "memory" | "wordle" | "trivia" | "leaderboard";
const TABS: { id: Tab; label: string }[] = [
  { id: "snake",       label: "🐍 Snake"        },
  { id: "memory",      label: "🃏 Memory"        },
  { id: "wordle",      label: "📝 Wordle"        },
  { id: "trivia",      label: "🎯 Trivia"        },
  { id: "leaderboard", label: "🏆 Leaderboard"   },
];

export default function GamesPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<Tab>("snake");
  const [balance, setBalance] = useState<number | null>(null);
  const playerName = user?.name ?? "Player";

  useEffect(() => {
    fetchBalance(playerName).then(setBalance);
  }, [playerName]);

  const onBalanceChange = (b: number) => setBalance(b);

  return (
    <AuthGuard>
      <Header title="Games" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-2xl mx-auto">
          {/* Balance bar */}
          {balance !== null && (
            <div className="mb-5 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-3">
              <span className="text-sm text-slate-400">💰 Demo Balance</span>
              <span className="text-lg font-bold text-white">₹{balance.toLocaleString("en-IN")}</span>
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
            {active === "snake"       && <SnakeGame  playerName={playerName} />}
            {active === "memory"      && balance !== null && <MemoryGame playerName={playerName} balance={balance} onBalanceChange={onBalanceChange} />}
            {active === "wordle"      && balance !== null && <WordleGame playerName={playerName} balance={balance} onBalanceChange={onBalanceChange} />}
            {active === "trivia"      && balance !== null && <TriviaGame playerName={playerName} balance={balance} onBalanceChange={onBalanceChange} />}
            {active === "leaderboard" && <Leaderboard />}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
