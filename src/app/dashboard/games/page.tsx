"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";
import SubwayGame from "./SubwayGame";
import GeoDashGame from "./GeoDashGame";
import BasketballGame from "./BasketballGame";
import StickmanHookGame from "./StickmanHookGame";
import SlopeGame from "./SlopeGame";

// ─── API helpers ──────────────────────────────────────────────────────────────
type ScoreEntry = { player: string; value: number; date: string };
type GameKey = "snake" | "flappy" | "mole" | "subway" | "geoDash" | "basketball" | "stickman";
type ScoreBoard = Record<GameKey, ScoreEntry[]>;

async function addScore(game: GameKey, entry: ScoreEntry) {
  try { await fetch("/api/data/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game, entry }) }); } catch { /* silent */ }
}
async function fetchScores(): Promise<ScoreBoard> {
  try { const r = await fetch("/api/data/scores", { cache: "no-store" }); return r.json(); } catch { return { snake: [], flappy: [], mole: [], subway: [], geoDash: [], basketball: [], stickman: [] }; }
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
        <div className="text-sm text-slate-400">Score: <span className="font-bold text-green-300 text-2xl">{g.score}</span></div>
        {!g.running && <button onClick={() => { prevDead.current = false; setG({ ...init(), running: true }); }} className="px-4 py-1.5 rounded-lg text-sm font-bold text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>{g.dead ? "Restart" : "Start"}</button>}
      </div>
      <div className="relative rounded-xl overflow-hidden border border-green-900/50" style={{ width: SIZE, height: SIZE, background: "#0f172a" }}>
        <svg width={SIZE} height={SIZE} className="absolute inset-0 opacity-10">{Array.from({ length: GRID }, (_, y) => Array.from({ length: GRID }, (_, x) => <circle key={`${x}-${y}`} cx={x * CELL + CELL / 2} cy={y * CELL + CELL / 2} r="1" fill="#94a3b8" />))}</svg>
        <div className="absolute flex items-center justify-center" style={{ width: CELL, height: CELL, left: g.food.x * CELL, top: g.food.y * CELL, fontSize: CELL - 4, lineHeight: 1 }}>🍺</div>
        {g.snake.map((p, i) => <div key={i} className="absolute rounded-sm" style={{ width: CELL - 2, height: CELL - 2, left: p.x * CELL + 1, top: p.y * CELL + 1, background: i === 0 ? "#4ade80" : `rgba(34,197,94,${1 - i / g.snake.length * 0.7})`, boxShadow: i === 0 ? "0 0 6px 1px rgba(74,222,128,0.5)" : undefined }} />)}
        {!g.running && <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ background: "rgba(0,0,0,0.75)" }}>
          {g.dead ? (
            <>
              <div className="text-4xl mb-2">💀</div>
              <div className="text-2xl font-black text-white mb-1">Game Over!</div>
              <div className="text-green-400 font-bold text-lg mb-3">Score: {g.score}</div>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">🐍</div>
              <div className="text-xl font-bold text-white mb-1">Snake</div>
              <div className="text-slate-400 text-sm mb-3">Collect 🍺 · Arrow keys / WASD</div>
            </>
          )}
        </div>}
      </div>
    </div>
  );
}

// ─── FLAPPY BIRD ──────────────────────────────────────────────────────────────
const GAME_W = 360, GAME_H = 460, BIRD_X = 70, PIPE_W = 52, PIPE_GAP = 130;

type Pipe = { x: number; topH: number; scored: boolean };
type FlappyState = {
  birdY: number;
  vel: number;
  pipes: Pipe[];
  score: number;
  frame: number;
  phase: "idle" | "running" | "dead";
};

function FlappyGame({ playerName }: { playerName: string }) {
  const [, forceUpdate] = useState(0);
  const stateRef = useRef<FlappyState>({
    birdY: GAME_H / 2,
    vel: 0,
    pipes: [],
    score: 0,
    frame: 0,
    phase: "idle",
  });
  const flapRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevDead = useRef(false);

  function startGame() {
    stateRef.current = { birdY: GAME_H / 2, vel: 0, pipes: [], score: 0, frame: 0, phase: "running" };
    prevDead.current = false;
    forceUpdate(n => n + 1);
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.phase !== "running") return;

      // Flap
      let vel = s.vel + 0.45;
      if (flapRef.current) { vel = -8; flapRef.current = false; }

      const birdY = s.birdY + vel;
      const frame = s.frame + 1;

      // New pipe every 90 frames
      let pipes = s.pipes.map(p => ({ ...p, x: p.x - 2.5 })).filter(p => p.x > -PIPE_W);
      if (frame % 90 === 0) {
        const topH = 60 + Math.random() * (GAME_H - PIPE_GAP - 120);
        pipes.push({ x: GAME_W, topH, scored: false });
      }

      // Score: pipe center passed BIRD_X
      let score = s.score;
      pipes = pipes.map(p => {
        if (!p.scored && p.x + PIPE_W / 2 < BIRD_X) { score++; return { ...p, scored: true }; }
        return p;
      });

      // Collision
      const birdTop = birdY - 14, birdBot = birdY + 14;
      let dead = birdY > GAME_H - 30 || birdY < 10;
      for (const p of pipes) {
        if (BIRD_X + 14 > p.x && BIRD_X - 14 < p.x + PIPE_W) {
          if (birdTop < p.topH || birdBot > p.topH + PIPE_GAP) { dead = true; break; }
        }
      }

      if (dead) {
        stateRef.current = { ...s, birdY, vel, pipes, score, frame, phase: "dead" };
        if (!prevDead.current) {
          addScore("flappy", { player: playerName, value: score, date: new Date().toISOString().split("T")[0] });
          prevDead.current = true;
        }
      } else {
        stateRef.current = { birdY, vel, pipes, score, frame, phase: "running" };
      }
      forceUpdate(n => n + 1);
    }, 16);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playerName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        const s = stateRef.current;
        if (s.phase === "idle" || s.phase === "dead") { startGame(); return; }
        flapRef.current = true;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const s = stateRef.current;
  const birdRotate = Math.min(s.vel * 4, 45);

  function handleTap() {
    if (s.phase === "idle" || s.phase === "dead") { startGame(); return; }
    flapRef.current = true;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sky-300 font-black text-2xl">{s.score} <span className="text-sm font-normal text-sky-500">points</span></div>
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-sky-700/50 cursor-pointer select-none"
        style={{ width: GAME_W, height: GAME_H, background: "linear-gradient(180deg, #0ea5e9 0%, #38bdf8 40%, #7dd3fc 100%)" }}
        onClick={handleTap}
      >
        {/* Clouds */}
        <div className="absolute opacity-70" style={{ left: 30, top: 40, width: 80, height: 25, background: "white", borderRadius: 20 }} />
        <div className="absolute opacity-50" style={{ left: 60, top: 28, width: 50, height: 20, background: "white", borderRadius: 15 }} />
        <div className="absolute opacity-70" style={{ left: 220, top: 70, width: 90, height: 28, background: "white", borderRadius: 20 }} />
        <div className="absolute opacity-50" style={{ left: 250, top: 60, width: 55, height: 22, background: "white", borderRadius: 15 }} />

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-[30px]" style={{ background: "linear-gradient(180deg,#65a30d,#4d7c0f)" }} />
        <div className="absolute bottom-[28px] left-0 right-0 h-[4px]" style={{ background: "#86efac" }} />

        {/* Pipes */}
        {s.pipes.map((p, i) => (
          <div key={i}>
            {/* Top pipe */}
            <div className="absolute" style={{ left: p.x, top: 0, width: PIPE_W, height: p.topH, background: "linear-gradient(90deg,#16a34a,#22c55e,#16a34a)" }}>
              <div className="absolute bottom-0 left-[-4px] right-[-4px] h-[18px]" style={{ background: "linear-gradient(90deg,#15803d,#22c55e,#15803d)", borderRadius: "4px 4px 0 0" }} />
            </div>
            {/* Bottom pipe */}
            <div className="absolute" style={{ left: p.x, top: p.topH + PIPE_GAP, width: PIPE_W, bottom: 30, background: "linear-gradient(90deg,#16a34a,#22c55e,#16a34a)" }}>
              <div className="absolute top-0 left-[-4px] right-[-4px] h-[18px]" style={{ background: "linear-gradient(90deg,#15803d,#22c55e,#15803d)", borderRadius: "0 0 4px 4px" }} />
            </div>
          </div>
        ))}

        {/* Bird */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: BIRD_X - 14,
            top: s.birdY - 14,
            width: 28,
            height: 28,
            fontSize: 22,
            transform: `rotate(${birdRotate}deg)`,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
          }}
        >
          🎬
        </div>

        {/* Idle overlay */}
        {s.phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
            <div className="text-5xl mb-3">🎬</div>
            <div className="text-white font-black text-2xl tracking-wide drop-shadow-lg">TAP TO START</div>
            <div className="text-sky-200 text-sm mt-2">or press Space</div>
          </div>
        )}

        {/* Dead overlay */}
        {s.phase === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="text-5xl mb-2">💥</div>
            <div className="text-white font-black text-3xl mb-1" style={{ textShadow: "0 0 20px #f97316" }}>GAME OVER</div>
            <div className="text-orange-300 font-bold text-xl mb-4">Score: {s.score}</div>
            <button
              onClick={e => { e.stopPropagation(); startGame(); }}
              className="px-6 py-3 rounded-xl font-black text-white text-lg cursor-pointer"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
            >
              ↺ Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2048 ────────────────────────────────────────────────────────────────────
type Board = (number | null)[][];

function emptyBoard(): Board { return Array.from({ length: 4 }, () => Array(4).fill(null)); }

function addTile(board: Board): Board {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!board[r][c]) empty.push([r, c]);
  if (!empty.length) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const nb = board.map(row => [...row]);
  nb[r][c] = Math.random() < 0.9 ? 2 : 4;
  return nb;
}

function slideRow(row: (number | null)[]): { row: (number | null)[]; score: number } {
  const vals = row.filter(Boolean) as number[];
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < vals.length) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      merged.push(vals[i] * 2);
      score += vals[i] * 2;
      i += 2;
    } else {
      merged.push(vals[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged.map(v => v || null), score };
}

type MoveDir = "left" | "right" | "up" | "down";

function move(board: Board, dir: MoveDir): { board: Board; score: number; changed: boolean } {
  let grid = board.map(r => [...r]);
  let totalScore = 0;
  let changed = false;

  // Transpose
  const transpose = (g: Board): Board => g[0].map((_, c) => g.map(r => r[c]));
  // Reverse rows
  const reverseRows = (g: Board): Board => g.map(r => [...r].reverse());

  if (dir === "right") grid = reverseRows(grid);
  else if (dir === "up") grid = transpose(grid);
  else if (dir === "down") grid = reverseRows(transpose(grid));

  const newGrid = grid.map(row => {
    const before = JSON.stringify(row);
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    if (JSON.stringify(newRow) !== before) changed = true;
    return newRow;
  });

  let result = newGrid;
  if (dir === "right") result = reverseRows(newGrid);
  else if (dir === "up") result = transpose(newGrid);
  else if (dir === "down") result = transpose(reverseRows(newGrid));

  return { board: result, score: totalScore, changed };
}

function hasValidMoves(board: Board): boolean {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    if (!board[r][c]) return true;
    if (c < 3 && board[r][c] === board[r][c + 1]) return true;
    if (r < 3 && board[r][c] === board[r + 1][c]) return true;
  }
  return false;
}

function tileStyle(val: number | null): string {
  if (!val) return "bg-slate-800/50 border-slate-700/30";
  const map: Record<number, string> = {
    2: "bg-slate-500/20 border-slate-400/30 text-slate-100",
    4: "bg-indigo-500/20 border-indigo-400/30 text-indigo-100",
    8: "bg-violet-500/20 border-violet-400/30 text-violet-100",
    16: "bg-purple-500/20 border-purple-400/30 text-purple-100",
    32: "bg-fuchsia-500/20 border-fuchsia-400/30 text-fuchsia-100",
    64: "bg-pink-500/20 border-pink-400/30 text-pink-100",
    128: "bg-rose-500/20 border-rose-400/30 text-rose-100",
    256: "bg-orange-500/20 border-orange-400/30 text-orange-100",
    512: "bg-amber-500/20 border-amber-400/30 text-amber-100",
    1024: "bg-yellow-500/20 border-yellow-400/30 text-yellow-100",
    2048: "bg-lime-500/30 border-lime-400/50 text-lime-100",
  };
  return map[val] ?? "bg-lime-500/40 border-lime-300/60 text-white";
}

function tileFontSize(val: number | null): string {
  if (!val) return "";
  if (val < 100) return "text-2xl";
  if (val < 1000) return "text-xl";
  return "text-lg";
}

function initGame2048() {
  return addTile(addTile(emptyBoard()));
}

function Game2048() {
  const [board, setBoard] = useState<Board>(initGame2048);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);

  function newGame() {
    setBoard(initGame2048());
    setScore(0);
    setWon(false);
    setOver(false);
  }

  function doMove(dir: MoveDir) {
    if (over) return;
    setBoard(prev => {
      const { board: nb, score: gained, changed } = move(prev, dir);
      if (!changed) return prev;
      const withTile = addTile(nb);
      setScore(s => {
        const ns = s + gained;
        setBest(b => Math.max(b, ns));
        return ns;
      });
      if (withTile.some(r => r.some(v => v === 2048))) setWon(true);
      if (!hasValidMoves(withTile)) setOver(true);
      return withTile;
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, MoveDir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      const d = map[e.key];
      if (d) { e.preventDefault(); doMove(d); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [over]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score row */}
      <div className="flex items-center gap-4 w-full justify-center">
        <div className="text-center px-5 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider">Score</div>
          <div className="text-2xl font-black text-orange-300">{score}</div>
        </div>
        <div className="text-center px-5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Best</div>
          <div className="text-2xl font-black text-amber-300">{best}</div>
        </div>
        <button onClick={newGame} className="px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
          New Game
        </button>
      </div>

      {/* Grid */}
      <div className="relative p-3 rounded-2xl" style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", boxShadow: "0 0 30px rgba(99,102,241,0.2)" }}>
        <div className="grid grid-cols-4 gap-2">
          {board.map((row, r) => row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-16 h-16 rounded-xl flex items-center justify-center font-black border transition-all ${tileStyle(val)} ${tileFontSize(val)}`}
            >
              {val ?? ""}
            </div>
          )))}
        </div>

        {/* Won overlay */}
        {won && !over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-white font-black text-2xl mb-1" style={{ textShadow: "0 0 20px #a3e635" }}>You reached 2048!</div>
            <div className="text-lime-300 text-sm mb-4">Keep playing or start fresh</div>
            <div className="flex gap-2">
              <button onClick={() => setWon(false)} className="px-4 py-2 rounded-xl font-bold text-white cursor-pointer text-sm" style={{ background: "linear-gradient(135deg,#84cc16,#65a30d)" }}>Keep Playing</button>
              <button onClick={newGame} className="px-4 py-2 rounded-xl font-bold text-white cursor-pointer text-sm" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>New Game</button>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="text-4xl mb-2">😢</div>
            <div className="text-white font-black text-2xl mb-1">Game Over!</div>
            <div className="text-orange-300 font-bold text-lg mb-4">Score: {score}</div>
            <button onClick={newGame} className="px-6 py-2 rounded-xl font-black text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>Try Again</button>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500">Use arrow keys to slide tiles</div>
    </div>
  );
}

// ─── WHACK-A-MOLE ─────────────────────────────────────────────────────────────
const GAME_DURATION = 30;

type MoleState = { active: boolean; flash: boolean };

function MoleGame({ playerName }: { playerName: string }) {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [moles, setMoles] = useState<MoleState[]>(Array(9).fill({ active: false, flash: false }));
  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>(Array(9).fill(null));

  function getSpawnInterval(sc: number) {
    return Math.max(300, 800 - Math.floor(sc / 3) * 20);
  }
  function getMoleDuration(sc: number) {
    return Math.max(500, 900 - Math.floor(sc / 5) * 50);
  }

  function spawnMole() {
    const sc = scoreRef.current;
    // Count active moles
    setMoles(prev => {
      const activeCount = prev.filter(m => m.active).length;
      if (activeCount >= 3) return prev;
      const available = prev.map((m, i) => (!m.active ? i : -1)).filter(i => i >= 0);
      if (!available.length) return prev;
      const idx = available[Math.floor(Math.random() * available.length)];
      const next = prev.map((m, i) => i === idx ? { ...m, active: true } : m);
      // Auto hide after duration
      if (moleTimers.current[idx]) clearTimeout(moleTimers.current[idx]!);
      moleTimers.current[idx] = setTimeout(() => {
        setMoles(p => p.map((m, i) => i === idx ? { ...m, active: false } : m));
      }, getMoleDuration(sc));
      return next;
    });
  }

  function startGame() {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMoles(Array(9).fill({ active: false, flash: false }));
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(spawnMole, getSpawnInterval(0));
  }

  function endGame() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (spawnRef.current) { clearInterval(spawnRef.current); spawnRef.current = null; }
    moleTimers.current.forEach(t => { if (t) clearTimeout(t); });
    setMoles(Array(9).fill({ active: false, flash: false }));
    setPhase("done");
    const finalScore = scoreRef.current;
    setHighScore(h => {
      const nh = Math.max(h, finalScore);
      return nh;
    });
    addScore("mole", { player: playerName, value: finalScore, date: new Date().toISOString().split("T")[0] });
  }

  // Restart spawn interval when score changes so interval updates
  useEffect(() => {
    if (phase !== "playing") return;
    if (spawnRef.current) clearInterval(spawnRef.current);
    spawnRef.current = setInterval(spawnMole, getSpawnInterval(score));
    return () => { if (spawnRef.current) clearInterval(spawnRef.current); };
  }, [Math.floor(score / 3), phase]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      moleTimers.current.forEach(t => { if (t) clearTimeout(t); });
    };
  }, []);

  function whack(idx: number) {
    if (phase !== "playing") return;
    setMoles(prev => {
      if (!prev[idx].active) return prev;
      if (moleTimers.current[idx]) { clearTimeout(moleTimers.current[idx]!); moleTimers.current[idx] = null; }
      scoreRef.current += 1;
      setScore(scoreRef.current);
      const next = prev.map((m, i) => i === idx ? { active: false, flash: true } : m);
      setTimeout(() => setMoles(p => p.map((m, i) => i === idx ? { ...m, flash: false } : m)), 300);
      return next;
    });
  }

  const pct = (timeLeft / GAME_DURATION) * 100;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Score display */}
      <div className="flex items-center gap-5">
        <div className="text-center px-5 py-2 rounded-xl bg-lime-500/10 border border-lime-500/20">
          <div className="text-xs text-lime-400 font-semibold uppercase tracking-wider">Score</div>
          <div className="text-3xl font-black text-lime-300">{score}</div>
        </div>
        <div className="text-center px-5 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="text-xs text-green-400 font-semibold uppercase tracking-wider">Best</div>
          <div className="text-3xl font-black text-green-300">{highScore}</div>
        </div>
      </div>

      {/* Timer bar */}
      {phase === "playing" && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Time</span>
            <span className={`font-bold ${timeLeft <= 5 ? "text-red-400" : "text-lime-300"}`}>{timeLeft}s</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: pct > 50 ? "linear-gradient(90deg,#4ade80,#84cc16)" : pct > 20 ? "linear-gradient(90deg,#facc15,#f97316)" : "linear-gradient(90deg,#f97316,#ef4444)" }}
            />
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        className="p-5 rounded-2xl"
        style={{ background: "linear-gradient(135deg,#14532d,#166534)", boxShadow: "0 0 30px rgba(74,222,128,0.15)" }}
      >
        <div className="grid grid-cols-3 gap-4">
          {moles.map((mole, idx) => (
            <button
              key={idx}
              onClick={() => whack(idx)}
              className="relative w-20 h-20 rounded-full flex items-center justify-center text-3xl cursor-pointer transition-transform active:scale-90"
              style={{
                background: mole.active ? "linear-gradient(135deg,#92400e,#78350f)" : "linear-gradient(135deg,#431407,#3b0764)",
                boxShadow: mole.active ? "0 0 15px rgba(217,119,6,0.4), inset 0 -4px 8px rgba(0,0,0,0.4)" : "inset 0 -4px 8px rgba(0,0,0,0.4)",
                border: mole.active ? "2px solid #d97706" : "2px solid #1e1b4b",
                transform: mole.active ? "scale(1.05)" : "scale(0.95)",
              }}
            >
              {mole.flash ? "✨" : mole.active ? "🐹" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Idle / Done state */}
      {phase === "idle" && (
        <button onClick={startGame} className="px-8 py-3 rounded-xl font-black text-white text-lg cursor-pointer" style={{ background: "linear-gradient(135deg,#84cc16,#4d7c0f)" }}>
          🔨 Start Game!
        </button>
      )}
      {phase === "done" && (
        <div className="flex flex-col items-center gap-3 p-5 rounded-2xl border" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(74,222,128,0.3)" }}>
          <div className="text-4xl">🏁</div>
          <div className="text-white font-black text-2xl">Time&apos;s Up!</div>
          <div className="text-lime-300 font-bold text-xl">Score: {score}</div>
          {score === highScore && score > 0 && <div className="text-yellow-300 text-sm font-semibold">🏆 New High Score!</div>}
          <button onClick={startGame} className="px-6 py-2 rounded-xl font-black text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#84cc16,#4d7c0f)" }}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function Leaderboard() {
  const [scores, setScores] = useState<Partial<ScoreBoard>>({});
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setScores(await fetchScores()); setLoading(false); }
  useEffect(() => { load(); }, []);
  const medals = ["🥇", "🥈", "🥉"];

  const sections: { key: GameKey; label: string; color: string }[] = [
    { key: "snake",      label: "🐍 Snake",          color: "text-green-400" },
    { key: "flappy",     label: "🎬 Flappy Bird",     color: "text-sky-400" },
    { key: "mole",       label: "🔨 Whack-a-Mole",   color: "text-lime-400" },
    { key: "geoDash",    label: "🟦 Geometry Dash",   color: "text-indigo-400" },
    { key: "subway",     label: "🏃 Subway Run",      color: "text-violet-400" },
    { key: "basketball", label: "🏀 Basketball",      color: "text-orange-400" },
    { key: "stickman",   label: "🕹️ Stickman Hook",   color: "text-purple-400" },
  ];

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      <div className="text-center mb-2">
        <div className="text-4xl mb-1">🏆</div>
        <div className="font-black text-white text-xl">Leaderboard</div>
        <div className="text-xs text-slate-500 mt-0.5">Shared across all team members</div>
      </div>
      {loading ? (
        <div className="text-center text-slate-500 text-sm py-8">Loading scores…</div>
      ) : (
        sections.map(sec => {
          const list = (scores[sec.key] ?? []).slice(0, 10);
          return (
            <div key={sec.key} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700">
                <span className={`font-bold text-sm ${sec.color}`}>{sec.label}</span>
              </div>
              {list.length === 0 ? (
                <div className="px-4 py-4 text-center text-slate-600 text-xs">No scores yet — play to get on the board!</div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {list.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-5 text-center text-sm">{medals[i] ?? <span className="text-slate-500 text-xs">{i + 1}</span>}</span>
                      <span className="flex-1 text-sm font-medium text-slate-200">{e.player}</span>
                      <span className={`text-sm font-bold ${sec.color}`}>{e.value} <span className="text-slate-500 font-normal text-xs">pts</span></span>
                      <span className="text-xs text-slate-600">{e.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
      <button onClick={load} className="w-full py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">↻ Refresh</button>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
type Tab = "flappy" | "2048" | "mole" | "snake" | "subway" | "geodash" | "basketball" | "stickman" | "slope" | "leaderboard";

const TABS: { id: Tab; label: string; active: string; inactive: string }[] = [
  { id: "snake",       label: "🐍 Snake",        active: "bg-green-500/20 border-green-500 text-green-300",    inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "flappy",      label: "🎬 Flappy",        active: "bg-sky-500/20 border-sky-500 text-sky-300",          inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "2048",        label: "🔢 2048",           active: "bg-orange-500/20 border-orange-500 text-orange-300", inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "mole",        label: "🔨 Whack-Mole",    active: "bg-lime-500/20 border-lime-500 text-lime-300",       inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "slope",       label: "⚡ Slope",          active: "bg-cyan-500/20 border-cyan-500 text-cyan-300",       inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "geodash",     label: "🟦 Geo Dash",       active: "bg-indigo-500/20 border-indigo-500 text-indigo-300", inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "subway",      label: "🏃 Subway Run",     active: "bg-violet-500/20 border-violet-500 text-violet-300", inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "basketball",  label: "🏀 Basketball",     active: "bg-orange-500/20 border-orange-500 text-orange-300", inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "stickman",    label: "🕹️ Stickman Hook",  active: "bg-purple-500/20 border-purple-500 text-purple-300", inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
  { id: "leaderboard", label: "🏆 Leaderboard",   active: "bg-amber-500/20 border-amber-500 text-amber-300",   inactive: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700" },
];

export default function GamesPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<Tab>("flappy");
  const playerName = user?.name ?? "Player";

  return (
    <AuthGuard>
      <Header title="Games" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-2xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              🎮 MetaFX Arcade
            </h1>
            <p className="text-slate-500 text-sm mt-1">Nine games. Zero stakes. Pure fun.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-7 flex-wrap">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${active === t.id ? t.active : t.inactive}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Game card with gradient border */}
          <div className="p-px rounded-2xl" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7,#ec4899)" }}>
            <div className="bg-slate-950 rounded-2xl p-8 flex flex-col items-center min-h-[400px] justify-center">
              {active === "snake"       && <SnakeGame playerName={playerName} />}
              {active === "flappy"      && <FlappyGame playerName={playerName} />}
              {active === "2048"        && <Game2048 />}
              {active === "mole"        && <MoleGame playerName={playerName} />}
              {active === "slope"       && <SlopeGame playerName={playerName} onScore={(s) => addScore("geoDash", { player: playerName, value: s, date: new Date().toISOString().split("T")[0] })} />}
              {active === "geodash"     && <GeoDashGame playerName={playerName} onScore={(s) => addScore("geoDash", { player: playerName, value: s, date: new Date().toISOString().split("T")[0] })} />}
              {active === "subway"      && <SubwayGame playerName={playerName} onScore={(s) => addScore("subway", { player: playerName, value: s, date: new Date().toISOString().split("T")[0] })} />}
              {active === "basketball"  && <BasketballGame playerName={playerName} onScore={(s) => addScore("basketball", { player: playerName, value: s, date: new Date().toISOString().split("T")[0] })} />}
              {active === "stickman"    && <StickmanHookGame playerName={playerName} onScore={(s) => addScore("stickman", { player: playerName, value: s, date: new Date().toISOString().split("T")[0] })} />}
              {active === "leaderboard" && <Leaderboard />}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
