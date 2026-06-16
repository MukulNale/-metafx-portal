"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";

// ─── Score storage ────────────────────────────────────────────────────────────
const SCORE_KEY = "mfx_scores_v1";
type ScoreEntry = { player: string; value: number; date: string };
type ScoreBoard = { snake: ScoreEntry[]; memory: ScoreEntry[]; wordle: ScoreEntry[]; trivia: ScoreEntry[] };

function loadScores(): ScoreBoard {
  try { return { snake: [], memory: [], wordle: [], trivia: [], ...JSON.parse(localStorage.getItem(SCORE_KEY) ?? "{}") }; }
  catch { return { snake: [], memory: [], wordle: [], trivia: [] }; }
}
function addScore(game: keyof ScoreBoard, entry: ScoreEntry) {
  const all = loadScores();
  const isLowBetter = game === "memory" || game === "wordle";
  all[game] = [...all[game], entry]
    .sort((a, b) => isLowBetter ? a.value - b.value : b.value - a.value)
    .slice(0, 10);
  localStorage.setItem(SCORE_KEY, JSON.stringify(all));
}

// ─── Snake ────────────────────────────────────────────────────────────────────
const GRID = 20, TICK = 125;
type Pt = { x: number; y: number };
type Dir = "U" | "D" | "L" | "R";
const OPP: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };
const rnd = () => ({ x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) });
const ptEq = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;

function SnakeGame({ playerName }: { playerName: string }) {
  const init = () => ({ snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], food: rnd(), dir: "R" as Dir, pending: "R" as Dir, running: false, dead: false, score: 0 });
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
      return { ...prev, snake: newSnake, food: ate ? rnd() : prev.food, score: prev.score + (ate ? 1 : 0), dead, running: !dead, dir: d };
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
        <div className="absolute rounded-full bg-red-400 shadow-[0_0_8px_2px_rgba(248,113,113,0.6)]" style={{ width: CELL - 4, height: CELL - 4, left: g.food.x * CELL + 2, top: g.food.y * CELL + 2 }} />
        {g.snake.map((p, i) => <div key={i} className="absolute rounded-sm" style={{ width: CELL - 2, height: CELL - 2, left: p.x * CELL + 1, top: p.y * CELL + 1, background: i === 0 ? "#818cf8" : `rgba(99,102,241,${1 - i / g.snake.length * 0.7})`, boxShadow: i === 0 ? "0 0 6px 1px rgba(129,140,248,0.5)" : undefined }} />)}
        {!g.running && <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 rounded-xl">
          {g.dead ? <><div className="text-2xl font-bold text-white mb-1">Game Over</div><div className="text-slate-400 text-sm mb-3">Score: {g.score}</div></> : <><div className="text-xl font-bold text-white mb-1">Snake</div><div className="text-slate-400 text-sm mb-3">Arrow keys or WASD</div></>}
        </div>}
      </div>
      <p className="text-xs text-slate-600">Arrow keys / WASD · score saves to leaderboard on death</p>
    </div>
  );
}

// ─── Memory Match ─────────────────────────────────────────────────────────────
const EMOJIS = ["🎬", "🎭", "🎨", "🎵", "🌟", "🚀", "🦋", "🎯"];
type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const makeCards = () => shuffle([...EMOJIS, ...EMOJIS].map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false })));

function MemoryGame({ playerName }: { playerName: string }) {
  const [cards, setCards] = useState<Card[]>(makeCards);
  const [picks, setPicks] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);

  function flip(id: number) {
    if (locked) return;
    setCards(prev => { const c = prev.find(c => c.id === id); if (!c || c.flipped || c.matched) return prev; return prev.map(x => x.id === id ? { ...x, flipped: true } : x); });
    setPicks(prev => {
      const next = [...prev, id];
      if (next.length === 2) {
        setMoves(m => m + 1); setLocked(true);
        setTimeout(() => {
          setCards(prev2 => {
            const [a, b] = next.map(i => prev2.find(c => c.id === i)!);
            const match = a.emoji === b.emoji;
            const updated = prev2.map(c => next.includes(c.id) ? { ...c, matched: match, flipped: match } : c);
            if (updated.every(c => c.matched)) { setTimeout(() => { setWon(true); addScore("memory", { player: playerName, value: moves + 1, date: new Date().toISOString().split("T")[0] }); }, 200); }
            return updated;
          });
          setPicks([]); setLocked(false);
        }, 900);
        return next;
      }
      return next;
    });
  }
  function reset() { setCards(makeCards()); setPicks([]); setMoves(0); setLocked(false); setWon(false); }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6">
        <div className="text-sm text-slate-400">Moves: <span className="font-bold text-white text-lg">{moves}</span></div>
        <div className="text-sm text-slate-400">Matched: <span className="font-bold text-green-400">{cards.filter(c => c.matched).length / 2}/{EMOJIS.length}</span></div>
        <button onClick={reset} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>New game</button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {cards.map(card => (
          <button key={card.id} onClick={() => flip(card.id)}
            className={`w-16 h-16 rounded-xl text-2xl flex items-center justify-center transition-all duration-300 cursor-pointer select-none border ${card.flipped || card.matched ? "bg-slate-800 border-indigo-500/50 scale-105" : "bg-slate-800/60 border-slate-700 hover:border-slate-500"} ${card.matched ? "border-green-500/50 bg-green-500/10" : ""}`}>
            {card.flipped || card.matched ? card.emoji : <span className="text-slate-600 text-lg">?</span>}
          </button>
        ))}
      </div>
      {won && <div className="px-5 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-center"><div className="text-green-400 font-bold">You won! 🎉</div><div className="text-slate-400 text-sm">{moves} moves · saved to leaderboard</div></div>}
    </div>
  );
}

// ─── Wordle ───────────────────────────────────────────────────────────────────
const WORDS = ["SCENE", "LIGHT", "FRAME", "SHOOT", "DRAFT", "SOUND", "SCORE", "STORY", "ACTOR", "STAGE", "DANCE", "TEMPO", "LYRIC", "PITCH", "BEATS", "AUDIO", "PRINT", "FOCUS", "ANGLE", "PAINT", "BRUSH", "MOVIE", "PIXEL", "BLOOM", "TRACK", "CABLE", "PRISM", "BOKEH", "CRANE", "SLATE"];
const pickWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];
type TileState = "empty" | "typing" | "correct" | "present" | "absent";

function WordleGame({ playerName }: { playerName: string }) {
  const [target, setTarget] = useState(pickWord);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState<"win" | "lose" | null>(null);
  const [shake, setShake] = useState(false);
  const MAX = 6;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      const k = e.key.toUpperCase();
      if (k === "ENTER") {
        if (current.length !== 5) { setShake(true); setTimeout(() => setShake(false), 500); return; }
        const next = [...guesses, current];
        setGuesses(next);
        if (current === target) {
          setDone("win");
          addScore("wordle", { player: playerName, value: next.length, date: new Date().toISOString().split("T")[0] });
        } else if (next.length >= MAX) {
          setDone("lose");
        }
        setCurrent("");
      } else if (k === "BACKSPACE") {
        setCurrent(p => p.slice(0, -1));
      } else if (/^[A-Z]$/.test(k) && current.length < 5) {
        setCurrent(p => p + k);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, guesses, target, done, playerName]);

  function reset() { setTarget(pickWord()); setGuesses([]); setCurrent(""); setDone(null); }

  function tileStyle(row: number, col: number): { bg: string; border: string } {
    if (row < guesses.length) {
      const g = guesses[row], t = target;
      // count occurrences
      const targetArr = t.split("");
      const state = Array(5).fill("absent");
      // correct pass
      for (let i = 0; i < 5; i++) if (g[i] === t[i]) { state[i] = "correct"; targetArr[i] = "_"; }
      // present pass
      for (let i = 0; i < 5; i++) {
        if (state[i] === "correct") continue;
        const idx = targetArr.indexOf(g[i]);
        if (idx !== -1) { state[i] = "present"; targetArr[idx] = "_"; }
      }
      const s = state[col] as TileState;
      return { bg: s === "correct" ? "#22c55e" : s === "present" ? "#eab308" : "#334155", border: "transparent" };
    }
    if (row === guesses.length) {
      const letter = current[col];
      return { bg: "transparent", border: letter ? "#6366f1" : "#334155" };
    }
    return { bg: "transparent", border: "#1e293b" };
  }

  // keyboard letter states
  const letterState: Record<string, string> = {};
  for (const g of guesses) {
    const targetArr = target.split("");
    const state = Array(5).fill("absent");
    for (let i = 0; i < 5; i++) if (g[i] === target[i]) { state[i] = "correct"; targetArr[i] = "_"; }
    for (let i = 0; i < 5; i++) {
      if (state[i] === "correct") continue;
      const idx = targetArr.indexOf(g[i]);
      if (idx !== -1) { state[i] = "present"; targetArr[idx] = "_"; }
    }
    for (let i = 0; i < 5; i++) {
      const prev = letterState[g[i]];
      if (prev === "correct") continue;
      if (state[i] === "correct" || (!prev && state[i] === "present") || (!prev && state[i] === "absent")) letterState[g[i]] = state[i];
    }
  }
  const kbColor = (l: string) => ({ correct: "bg-green-600 text-white", present: "bg-yellow-500 text-white", absent: "bg-slate-700 text-slate-400" })[letterState[l] ?? ""] ?? "bg-slate-700 text-slate-300";
  const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-400">Guess the 5-letter word · {MAX} tries</span>
        <button onClick={reset} className="px-3 py-1 rounded-lg text-xs font-medium text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>New word</button>
      </div>

      {/* Grid */}
      <div className={`grid gap-1.5 ${shake ? "animate-[shake_0.4s_ease]" : ""}`} style={{ gridTemplateRows: `repeat(${MAX},1fr)` }}>
        {Array.from({ length: MAX }, (_, row) => (
          <div key={row} className="flex gap-1.5">
            {Array.from({ length: 5 }, (_, col) => {
              const { bg, border } = tileStyle(row, col);
              const letter = row < guesses.length ? guesses[row][col] : row === guesses.length ? current[col] ?? "" : "";
              return (
                <div key={col} className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold text-white transition-all duration-300"
                  style={{ background: bg, border: `2px solid ${border}` }}>
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Result */}
      {done && (
        <div className={`px-5 py-3 rounded-xl border text-center ${done === "win" ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <div className={`font-bold ${done === "win" ? "text-green-400" : "text-red-400"}`}>{done === "win" ? `🎉 Solved in ${guesses.length}!` : `😔 The word was ${target}`}</div>
          {done === "win" && <div className="text-slate-400 text-sm">Saved to leaderboard</div>}
        </div>
      )}

      {/* Keyboard */}
      <div className="flex flex-col items-center gap-1.5 mt-1">
        {ROWS.map(row => (
          <div key={row} className="flex gap-1">
            {row.split("").map(l => (
              <button key={l} onClick={() => { if (!done && current.length < 5) setCurrent(p => p + l); }}
                className={`w-8 h-9 rounded text-[11px] font-bold cursor-pointer transition-colors ${kbColor(l)}`}>{l}</button>
            ))}
            {row === "ZXCVBNM" && (
              <button onClick={() => { if (!done) setCurrent(p => p.slice(0, -1)); }} className="px-2 h-9 rounded text-[11px] font-bold cursor-pointer bg-slate-700 text-slate-300 hover:bg-slate-600 ml-1">⌫</button>
            )}
          </div>
        ))}
        <button onClick={() => {
          if (!done && current.length === 5) {
            const next = [...guesses, current];
            setGuesses(next);
            if (current === target) { setDone("win"); addScore("wordle", { player: playerName, value: next.length, date: new Date().toISOString().split("T")[0] }); }
            else if (next.length >= MAX) setDone("lose");
            setCurrent("");
          } else if (!done) { setShake(true); setTimeout(() => setShake(false), 500); }
        }} className="mt-1 px-8 h-9 rounded text-xs font-bold cursor-pointer bg-slate-700 text-slate-300 hover:bg-slate-600">ENTER</button>
      </div>
      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }`}</style>
    </div>
  );
}

// ─── Trivia ───────────────────────────────────────────────────────────────────
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

function pickQuestions(n = 8) {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

type TriviaPhase = "setup" | "p1" | "p2" | "result";

function TriviaGame({ playerName }: { playerName: string }) {
  const [p2Name, setP2Name] = useState("");
  const [phase, setPhase] = useState<TriviaPhase>("setup");
  const [questions, setQuestions] = useState(() => pickQuestions(8));
  const [qIndex, setQIndex] = useState(0);
  const [p1Answers, setP1Answers] = useState<number[]>([]);
  const [p2Answers, setP2Answers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  function startGame() {
    const qs = pickQuestions(8);
    setQuestions(qs); setQIndex(0); setP1Answers([]); setP2Answers([]); setSelected(null); setRevealed(false); setPhase("p1");
  }
  function reset() { setPhase("setup"); setP2Name(""); setP1Answers([]); setP2Answers([]); }

  function pick(i: number) {
    if (revealed || selected !== null) return;
    setSelected(i); setRevealed(true);
    setTimeout(() => {
      const answers = phase === "p1" ? p1Answers : p2Answers;
      const nextAnswers = [...answers, i];
      if (phase === "p1") setP1Answers(nextAnswers);
      else setP2Answers(nextAnswers);

      if (qIndex + 1 >= questions.length) {
        // done with this player
        if (phase === "p1") {
          setPhase("p2"); setQIndex(0); setSelected(null); setRevealed(false);
        } else {
          // calc scores
          const s1 = nextAnswers.filter((a, i) => a === questions[i].ans).length;
          const s2 = [...p2Answers, i].filter((a, j) => a === questions[j].ans).length;
          addScore("trivia", { player: playerName, value: s1, date: new Date().toISOString().split("T")[0] });
          if (p2Name) addScore("trivia", { player: p2Name, value: s2, date: new Date().toISOString().split("T")[0] });
          setPhase("result");
        }
      } else {
        setQIndex(q => q + 1); setSelected(null); setRevealed(false);
      }
    }, 900);
  }

  const p1Score = p1Answers.filter((a, i) => a === questions[i].ans).length;
  const p2Score = p2Answers.filter((a, i) => a === questions[i].ans).length;
  const currentPlayer = phase === "p1" ? playerName : (p2Name || "Player 2");
  const q = questions[qIndex];

  if (phase === "setup") return (
    <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
      <div className="text-center"><div className="text-3xl mb-2">🎯</div><div className="font-bold text-white text-lg">Trivia Battle</div><div className="text-slate-400 text-sm mt-1">2-player pass-and-play · 8 questions each</div></div>
      <div className="w-full"><label className="block text-xs font-medium text-slate-400 mb-1">Player 2 name (optional)</label><input value={p2Name} onChange={e => setP2Name(e.target.value)} placeholder="Enter teammate's name…" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500" /></div>
      <button onClick={startGame} className="w-full py-2.5 rounded-xl text-white font-semibold cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Start — {playerName} goes first</button>
    </div>
  );

  if (phase === "result") {
    const winner = p1Score > p2Score ? playerName : p1Score < p2Score ? (p2Name || "Player 2") : null;
    return (
      <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
        <div className="text-center"><div className="text-3xl mb-2">{winner ? "🏆" : "🤝"}</div><div className="font-bold text-white text-lg">{winner ? `${winner} wins!` : "It's a tie!"}</div></div>
        <div className="flex gap-4 w-full">
          {[{ name: playerName, score: p1Score }, { name: p2Name || "Player 2", score: p2Score }].map(({ name, score }) => (
            <div key={name} className={`flex-1 rounded-xl p-4 text-center border ${score === Math.max(p1Score, p2Score) && p1Score !== p2Score ? "bg-indigo-500/20 border-indigo-500/40" : "bg-slate-800 border-slate-700"}`}>
              <div className="text-slate-400 text-sm mb-1">{name}</div>
              <div className="text-3xl font-bold text-white">{score}</div>
              <div className="text-slate-500 text-xs">/ {questions.length}</div>
            </div>
          ))}
        </div>
        <div className="w-full space-y-2">
          {questions.map((question, i) => (
            <div key={i} className="flex gap-2 items-start text-xs bg-slate-800/50 rounded-lg px-3 py-2">
              <span className="text-slate-500 flex-shrink-0 pt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0"><div className="text-slate-300 mb-0.5 truncate">{question.q}</div>
                <div className="flex gap-3 text-[11px]">
                  <span className={p1Answers[i] === question.ans ? "text-green-400" : "text-red-400"}>{playerName}: {question.opts[p1Answers[i]]}</span>
                  {p2Name && <span className={p2Answers[i] === question.ans ? "text-green-400" : "text-red-400"}>{p2Name}: {question.opts[p2Answers[i]]}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={reset} className="px-6 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>Play again</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 max-w-sm mx-auto w-full">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${phase === "p1" ? "bg-indigo-400" : "bg-amber-400"}`} />
          <span className="text-sm font-semibold text-white">{currentPlayer}&apos;s turn</span>
        </div>
        <span className="text-xs text-slate-500">Q{qIndex + 1} / {questions.length}</span>
      </div>
      <div className="w-full bg-slate-800/50 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${((qIndex) / questions.length) * 100}%` }} /></div>
      {phase === "p2" && qIndex === 0 && <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center text-sm text-amber-400">Pass the device to <strong>{p2Name || "Player 2"}</strong> 🤝</div>}
      <div className="w-full bg-slate-800 rounded-2xl p-5">
        <p className="text-white font-semibold text-base leading-relaxed">{q.q}</p>
      </div>
      <div className="w-full grid grid-cols-1 gap-2">
        {q.opts.map((opt, i) => {
          let style = "bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-700";
          if (revealed) {
            if (i === q.ans) style = "bg-green-500/20 border-green-500/50 text-green-300";
            else if (i === selected) style = "bg-red-500/20 border-red-500/50 text-red-300";
            else style = "bg-slate-800 border-slate-700 text-slate-500";
          } else if (selected === i) style = "bg-indigo-500/20 border-indigo-500 text-indigo-300";
          return (
            <button key={i} onClick={() => pick(i)} disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${style}`}>
              <span className="text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard() {
  const [scores, setScores] = useState<ScoreBoard>({ snake: [], memory: [], wordle: [], trivia: [] });
  useEffect(() => { setScores(loadScores()); }, []);

  const medals = ["🥇", "🥈", "🥉"];
  const GAMES: { key: keyof ScoreBoard; label: string; unit: string; lowBetter?: boolean }[] = [
    { key: "snake",  label: "🐍 Snake",        unit: "pts" },
    { key: "memory", label: "🃏 Memory Match",  unit: "moves", lowBetter: true },
    { key: "wordle", label: "📝 Wordle",        unit: "guesses", lowBetter: true },
    { key: "trivia", label: "🎯 Trivia Battle", unit: "pts" },
  ];

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      <div className="text-center mb-2"><div className="text-2xl mb-1">🏆</div><div className="font-bold text-white">Leaderboard</div><div className="text-xs text-slate-500 mt-0.5">Scores saved on this device</div></div>
      {GAMES.map(({ key, label, unit, lowBetter }) => {
        const list = scores[key];
        return (
          <div key={key} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700"><span className="font-semibold text-slate-200 text-sm">{label}</span>{lowBetter && <span className="text-[10px] text-slate-500 ml-2">lower is better</span>}</div>
            {list.length === 0 ? (
              <div className="px-4 py-4 text-center text-slate-600 text-xs">No scores yet — play a game!</div>
            ) : (
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
      <button onClick={() => setScores(loadScores())} className="w-full py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors">↻ Refresh</button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = "snake" | "memory" | "wordle" | "trivia" | "leaderboard";
const TABS: { id: Tab; label: string }[] = [
  { id: "snake",       label: "🐍 Snake"        },
  { id: "memory",      label: "🃏 Memory"        },
  { id: "wordle",      label: "📝 Wordle"        },
  { id: "trivia",      label: "🎯 Trivia Battle" },
  { id: "leaderboard", label: "🏆 Leaderboard"   },
];

export default function GamesPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<Tab>("snake");
  const playerName = user?.name ?? "Player";

  return (
    <AuthGuard>
      <Header title="Games" />
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-1.5 mb-7 flex-wrap">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActive(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border
                  ${active === t.id ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center">
            {active === "snake"       && <SnakeGame  playerName={playerName} />}
            {active === "memory"      && <MemoryGame playerName={playerName} />}
            {active === "wordle"      && <WordleGame playerName={playerName} />}
            {active === "trivia"      && <TriviaGame playerName={playerName} />}
            {active === "leaderboard" && <Leaderboard />}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
