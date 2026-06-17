"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Obstacle = { lane: 0 | 1 | 2; y: number; type: "train" | "barrier" | "gap" };
type Coin = { lane: 0 | 1 | 2; y: number; collected: boolean };

type SubwayState = {
  lane: 0 | 1 | 2;
  targetLane: 0 | 1 | 2;
  laneX: number;
  playerY: number;
  jumping: boolean;
  velY: number;
  sliding: boolean;
  slideTimer: number;
  obstacles: Obstacle[];
  coins: Coin[];
  score: number;
  coinCount: number;
  frame: number;
  phase: "idle" | "running" | "dead";
  bgOffset: number;
  bestScore: number;
  nextSpawn: number;
  nextCoinSpawn: number;
};

interface Props {
  playerName: string;
  onScore: (n: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 380;
const CANVAS_H = 500;
const LANES = [80, 190, 300] as const;
const GROUND_Y = 420;
const PLAYER_BASE_Y = 380;
const GRAVITY = 0.6;
const JUMP_VEL = -14;
const LANE_LERP = 18;

function makeInitialState(): SubwayState {
  return {
    lane: 1,
    targetLane: 1,
    laneX: LANES[1],
    playerY: PLAYER_BASE_Y,
    jumping: false,
    velY: 0,
    sliding: false,
    slideTimer: 0,
    obstacles: [],
    coins: [],
    score: 0,
    coinCount: 0,
    frame: 0,
    phase: "idle",
    bgOffset: 0,
    bestScore: 0,
    nextSpawn: 60,
    nextCoinSpawn: 80,
  };
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  s: SubwayState,
  bgOffset: number
) {
  // ── Sky gradient background
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  sky.addColorStop(0, "#1a1a2e");
  sky.addColorStop(0.6, "#16213e");
  sky.addColorStop(1, "#0f3460");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Scrolling building silhouettes (parallax)
  const bOff = bgOffset % 260;

  // Left buildings
  ctx.fillStyle = "#0d0d1a";
  const leftBuildings = [
    { x: -bOff, w: 50, h: 180 },
    { x: 60 - bOff, w: 30, h: 140 },
    { x: 100 - bOff, w: 45, h: 200 },
    { x: 260 - bOff, w: 50, h: 160 },
    { x: 320 - bOff, w: 35, h: 210 },
  ];
  for (const b of leftBuildings) {
    if (b.x < 60) {
      const bx = ((b.x % 260) + 260) % 260;
      ctx.fillRect(bx, GROUND_Y - b.h, b.w, b.h);
      // windows
      ctx.fillStyle = "rgba(255,220,100,0.15)";
      for (let wy = GROUND_Y - b.h + 10; wy < GROUND_Y - 10; wy += 20) {
        for (let wx = bx + 5; wx < bx + b.w - 5; wx += 12) {
          if (Math.random() > 0.3) ctx.fillRect(wx, wy, 6, 8);
        }
      }
      ctx.fillStyle = "#0d0d1a";
    }
  }

  // Right buildings
  const rightBuildings = [
    { x: 320 - bOff, w: 50, h: 175 },
    { x: 375 - bOff, w: 30, h: 145 },
    { x: -bOff + 520, w: 45, h: 195 },
    { x: -bOff + 580, w: 35, h: 165 },
  ];
  for (const b of rightBuildings) {
    const bx = 320 + ((b.x - 320 + bOff) % 260);
    if (bx > 300) {
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(bx, GROUND_Y - b.h, b.w, b.h);
      ctx.fillStyle = "rgba(255,220,100,0.12)";
      for (let wy = GROUND_Y - b.h + 10; wy < GROUND_Y - 10; wy += 20) {
        for (let wx = bx + 5; wx < bx + b.w - 5; wx += 12) {
          if (Math.random() > 0.4) ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
  }

  // ── Ground strip
  ctx.fillStyle = "#2a2a3e";
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // Ground top line
  ctx.fillStyle = "#3a3a5e";
  ctx.fillRect(0, GROUND_Y, CANVAS_W, 4);

  // ── Lane dividers (dashed white lines between lanes)
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  // Line between lane 0 and 1 (x=135)
  ctx.beginPath();
  ctx.moveTo(135, 120);
  ctx.lineTo(135, GROUND_Y);
  ctx.stroke();
  // Line between lane 1 and 2 (x=245)
  ctx.beginPath();
  ctx.moveTo(245, 120);
  ctx.lineTo(245, GROUND_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Coins
  for (const coin of s.coins) {
    if (coin.collected) continue;
    const cx = LANES[coin.lane];
    const cy = coin.y;
    const pulse = 0.8 + 0.2 * Math.sin(s.frame * 0.15);
    ctx.save();
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 8 * pulse;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#fbbf24";
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.stroke();
    // inner $
    ctx.fillStyle = "#7c3aed";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", cx, cy);
    ctx.restore();
  }

  // ── Obstacles
  for (const obs of s.obstacles) {
    const ox = LANES[obs.lane];
    const oy = obs.y;

    if (obs.type === "train") {
      // Red train body
      ctx.save();
      drawRoundRect(ctx, ox - 30, oy - 100, 60, 100, 8);
      const trainGrad = ctx.createLinearGradient(ox - 30, 0, ox + 30, 0);
      trainGrad.addColorStop(0, "#b91c1c");
      trainGrad.addColorStop(0.5, "#ef4444");
      trainGrad.addColorStop(1, "#b91c1c");
      ctx.fillStyle = trainGrad;
      ctx.fill();
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Windows (dark)
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(ox - 22, oy - 88, 16, 14);
      ctx.fillRect(ox + 6, oy - 88, 16, 14);
      ctx.fillRect(ox - 22, oy - 64, 16, 14);
      ctx.fillRect(ox + 6, oy - 64, 16, 14);
      // Window shine
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(ox - 20, oy - 86, 5, 10);
      ctx.fillRect(ox + 8, oy - 86, 5, 10);
      // Front stripe
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(ox - 30, oy - 18, 60, 6);
      ctx.restore();
    } else if (obs.type === "barrier") {
      // Yellow striped barrier
      ctx.save();
      drawRoundRect(ctx, ox - 22, oy - 44, 44, 44, 6);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      // Diagonal stripes
      ctx.save();
      drawRoundRect(ctx, ox - 22, oy - 44, 44, 44, 6);
      ctx.clip();
      ctx.fillStyle = "#000000";
      for (let si = -4; si < 8; si++) {
        ctx.fillRect(ox - 22 + si * 10, oy - 44, 5, 50);
      }
      ctx.restore();
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2;
      drawRoundRect(ctx, ox - 22, oy - 44, 44, 44, 6);
      ctx.stroke();
      // Barrier icon
      ctx.fillStyle = "white";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚠", ox, oy - 22);
      ctx.restore();
    } else if (obs.type === "gap") {
      // Dark void on the ground strip in this lane
      ctx.save();
      ctx.fillStyle = "#000000";
      ctx.fillRect(ox - 30, GROUND_Y - 2, 60, CANVAS_H - GROUND_Y + 2);
      // Void glow effect
      const gapGrad = ctx.createRadialGradient(ox, GROUND_Y, 0, ox, GROUND_Y, 35);
      gapGrad.addColorStop(0, "rgba(100,0,200,0.4)");
      gapGrad.addColorStop(1, "transparent");
      ctx.fillStyle = gapGrad;
      ctx.fillRect(ox - 35, GROUND_Y - 20, 70, 40);
      // Warning arrows
      if (oy > 200) {
        ctx.fillStyle = "rgba(239,68,68,0.7)";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("▼", ox, oy - 20);
      }
      ctx.restore();
    }
  }

  // ── Player
  const px = s.laneX;
  const py = s.playerY;
  const isSliding = s.sliding;
  const isJumping = s.jumping;

  ctx.save();
  ctx.translate(px, py);

  if (isJumping) {
    ctx.rotate(-0.18);
  }

  if (isSliding) {
    // Flattened sliding form
    // Body (flat)
    drawRoundRect(ctx, -22, -18, 44, 18, 5);
    const bodyGrad = ctx.createLinearGradient(-22, -18, 22, 0);
    bodyGrad.addColorStop(0, "#0d9488");
    bodyGrad.addColorStop(1, "#14b8a6");
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    // Head (flat)
    ctx.beginPath();
    ctx.arc(14, -9, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#fde68a";
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Standing/jumping form
    // Body
    drawRoundRect(ctx, -14, -60, 28, 40, 6);
    const bodyGrad = ctx.createLinearGradient(-14, -60, 14, -20);
    bodyGrad.addColorStop(0, "#0d9488");
    bodyGrad.addColorStop(1, "#14b8a6");
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Stripe on body
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(-8, -55, 4, 30);

    // Head
    ctx.beginPath();
    ctx.arc(0, -68, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#fde68a";
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.arc(-4, -70, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -70, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -65, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Legs (animated)
    const legSwing = isJumping ? 0 : Math.sin(s.frame * 0.35) * 10;
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    // Left leg
    ctx.beginPath();
    ctx.moveTo(-6, -22);
    ctx.lineTo(-6 - legSwing * 0.3, -5);
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(6, -22);
    ctx.lineTo(6 + legSwing * 0.3, -5);
    ctx.stroke();

    // Arms
    const armSwing = isJumping ? -20 : Math.sin(s.frame * 0.35 + Math.PI) * 12;
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 4;
    // Left arm
    ctx.beginPath();
    ctx.moveTo(-12, -50);
    ctx.lineTo(-20 + armSwing * 0.4, -36);
    ctx.stroke();
    // Right arm
    ctx.beginPath();
    ctx.moveTo(12, -50);
    ctx.lineTo(20 - armSwing * 0.4, -36);
    ctx.stroke();
  }

  ctx.restore();

  // ── HUD
  const speed = (5 + s.score * 0.01).toFixed(1);
  const multi = (1 + s.score * 0.001).toFixed(1);

  // Score — top center
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "white";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${s.score}m`, CANVAS_W / 2, 12);

  // Coin count — top right
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`$${s.coinCount}`, CANVAS_W - 10, 14);

  // Speed multiplier — top left
  ctx.textAlign = "left";
  ctx.fillStyle = "#a5f3fc";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(`x${multi}`, 10, 14);

  ctx.shadowBlur = 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubwayGame({ playerName, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, forceUpdate] = useState(0);
  const stateRef = useRef<SubwayState>(makeInitialState());
  const inputRef = useRef<{ dir: "left" | "right" | "up" | "down" | null }>({ dir: null });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreFiredRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function tick() {
      const s = stateRef.current;
      const ctx = canvas!.getContext("2d");
      if (!ctx) return;

      // ── Consume input
      const dir = inputRef.current.dir;
      inputRef.current.dir = null;

      // ── Phase: idle — any arrow starts game
      if (s.phase === "idle") {
        if (dir) {
          stateRef.current = { ...makeInitialState(), phase: "running", bestScore: s.bestScore };
          scoreFiredRef.current = false;
        }
        drawScene(ctx, stateRef.current, stateRef.current.bgOffset);
        drawOverlay(ctx, stateRef.current);
        forceUpdate(n => n + 1);
        return;
      }

      // ── Phase: dead — draw only, wait for restart (handled by button)
      if (s.phase === "dead") {
        drawScene(ctx, s, s.bgOffset);
        drawOverlay(ctx, s);
        forceUpdate(n => n + 1);
        return;
      }

      // ── Running ──

      const frame = s.frame + 1;
      const score = s.score + 1;
      const obstacleSpeed = 5 + score * 0.01;
      let bgOffset = s.bgOffset + 2;

      // Lane change input
      let targetLane = s.targetLane;
      if (dir === "left" && targetLane > 0) targetLane = (targetLane - 1) as 0 | 1 | 2;
      if (dir === "right" && targetLane < 2) targetLane = (targetLane + 1) as 0 | 1 | 2;

      // Lerp laneX toward target
      const targetX = LANES[targetLane];
      let laneX = s.laneX;
      const diff = targetX - laneX;
      laneX += Math.sign(diff) * Math.min(LANE_LERP, Math.abs(diff));
      const lane = Math.round((laneX - LANES[0]) / (LANES[1] - LANES[0])) as 0 | 1 | 2;

      // Jump
      let jumping = s.jumping;
      let velY = s.velY;
      let playerY = s.playerY;

      if (dir === "up" && !jumping) {
        jumping = true;
        velY = JUMP_VEL;
      }

      if (jumping) {
        velY += GRAVITY;
        playerY += velY;
        if (playerY >= PLAYER_BASE_Y) {
          playerY = PLAYER_BASE_Y;
          jumping = false;
          velY = 0;
        }
      }

      // Slide
      let sliding = s.sliding;
      let slideTimer = s.slideTimer;

      if (dir === "down" && !jumping) {
        sliding = true;
        slideTimer = 30;
      }

      if (sliding) {
        slideTimer -= 1;
        if (slideTimer <= 0) {
          sliding = false;
          slideTimer = 0;
        }
      }

      // Obstacles: move + spawn
      let obstacles = s.obstacles
        .map(o => ({ ...o, y: o.y - obstacleSpeed }))
        .filter(o => o.y > -120);

      let nextSpawn = s.nextSpawn - 1;
      if (nextSpawn <= 0) {
        const obsLane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        const types: Array<"train" | "barrier" | "gap"> = ["train", "barrier", "gap"];
        const obsType = types[Math.floor(Math.random() * types.length)];
        obstacles.push({ lane: obsLane, y: CANVAS_H + 110, type: obsType });
        nextSpawn = 60 + Math.floor(Math.random() * 20);
      }

      // Coins: move + spawn + collect
      let coins = s.coins
        .map(c => ({ ...c, y: c.y - obstacleSpeed }))
        .filter(c => c.y > -20);

      let nextCoinSpawn = s.nextCoinSpawn - 1;
      if (nextCoinSpawn <= 0) {
        const coinLane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        coins.push({ lane: coinLane, y: CANVAS_H + 10, collected: false });
        nextCoinSpawn = 80 + Math.floor(Math.random() * 40);
      }

      let coinCount = s.coinCount;
      coins = coins.map(c => {
        if (c.collected) return c;
        if (c.lane === lane && Math.abs(c.y - playerY) < 40) {
          coinCount += 1;
          return { ...c, collected: true };
        }
        return c;
      });

      // ── Collision detection
      // Player hitbox
      const pLeft = laneX - 22;
      const pTop = playerY - (sliding ? 35 : 70);
      const pRight = laneX + 22;
      const pBottom = playerY;

      let dead = false;

      for (const obs of obstacles) {
        const oLane = LANES[obs.lane];

        if (obs.type === "train") {
          const oLeft = oLane - 30;
          const oTop = obs.y - 100;
          const oRight = oLane + 30;
          const oBottom = obs.y;
          if (pLeft < oRight && pRight > oLeft && pTop < oBottom && pBottom > oTop) {
            dead = true;
            break;
          }
        } else if (obs.type === "barrier") {
          // Can slide under (no collision when sliding)
          if (!sliding) {
            const oLeft = oLane - 22;
            const oTop = obs.y - 44;
            const oRight = oLane + 22;
            const oBottom = obs.y;
            if (pLeft < oRight && pRight > oLeft && pTop < oBottom && pBottom > oTop) {
              dead = true;
              break;
            }
          }
        } else if (obs.type === "gap") {
          // Player dies if not jumping and is in the gap zone
          const gapTop = GROUND_Y - 10;
          const gapBottom = GROUND_Y + 10;
          if (
            !jumping &&
            Math.abs(laneX - oLane) < 30 &&
            obs.y >= gapTop &&
            obs.y <= gapBottom + 60
          ) {
            dead = true;
            break;
          }
        }
      }

      if (dead) {
        const newBest = Math.max(s.bestScore, score);
        stateRef.current = {
          ...s,
          frame,
          score,
          phase: "dead",
          bestScore: newBest,
          laneX,
          lane,
          targetLane,
          playerY,
          jumping,
          velY,
          sliding,
          slideTimer,
          obstacles,
          coins,
          coinCount,
          bgOffset,
          nextSpawn,
          nextCoinSpawn,
        };
        if (!scoreFiredRef.current) {
          scoreFiredRef.current = true;
          onScore(score);
        }
        drawScene(ctx, stateRef.current, bgOffset);
        drawOverlay(ctx, stateRef.current);
        forceUpdate(n => n + 1);
        return;
      }

      stateRef.current = {
        lane,
        targetLane,
        laneX,
        playerY,
        jumping,
        velY,
        sliding,
        slideTimer,
        obstacles,
        coins,
        score,
        coinCount,
        frame,
        phase: "running",
        bgOffset,
        bestScore: s.bestScore,
        nextSpawn,
        nextCoinSpawn,
      };

      drawScene(ctx, stateRef.current, bgOffset);
      forceUpdate(n => n + 1);
    }

    intervalRef.current = setInterval(tick, 16);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      inputRef.current.dir = d;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleRestart() {
    const best = stateRef.current.bestScore;
    stateRef.current = { ...makeInitialState(), phase: "idle", bestScore: best };
    scoreFiredRef.current = false;
    forceUpdate(n => n + 1);
  }

  const s = stateRef.current;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block rounded-2xl"
          style={{ border: "2px solid rgba(99,102,241,0.4)", boxShadow: "0 0 30px rgba(99,102,241,0.2)" }}
        />

        {/* Idle overlay */}
        {s.phase === "idle" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: "rgba(0,0,0,0.65)" }}
          >
            <div className="text-6xl mb-3">🏃</div>
            <div
              className="text-3xl font-black text-white mb-1 tracking-wide"
              style={{ textShadow: "0 0 20px #6366f1" }}
            >
              SUBWAY RUN
            </div>
            <div className="text-slate-300 text-sm mb-2">
              Hi, {playerName}! Dodge the obstacles!
            </div>
            <div className="flex gap-3 text-xs text-slate-400 mb-5">
              <span>← → Dodge</span>
              <span>↑ Jump</span>
              <span>↓ Slide</span>
            </div>
            <div className="text-indigo-300 font-bold text-sm animate-pulse">
              Press any arrow key to start
            </div>
          </div>
        )}

        {/* Dead overlay */}
        {s.phase === "dead" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <div className="text-5xl mb-2">💀</div>
            <div
              className="text-3xl font-black text-white mb-1"
              style={{ textShadow: "0 0 20px #ef4444" }}
            >
              GAME OVER
            </div>
            <div className="text-slate-300 text-sm mb-4">{playerName} got wiped out!</div>

            <div className="flex gap-4 mb-5">
              <div
                className="text-center px-5 py-2 rounded-xl"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)" }}
              >
                <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Distance</div>
                <div className="text-2xl font-black text-indigo-300">{s.score}m</div>
              </div>
              <div
                className="text-center px-5 py-2 rounded-xl"
                style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)" }}
              >
                <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Coins</div>
                <div className="text-2xl font-black text-amber-300">${s.coinCount}</div>
              </div>
              <div
                className="text-center px-5 py-2 rounded-xl"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}
              >
                <div className="text-xs text-green-400 font-semibold uppercase tracking-wider">Best</div>
                <div className="text-2xl font-black text-green-300">{s.bestScore}m</div>
              </div>
            </div>

            {s.score >= s.bestScore && s.score > 0 && (
              <div className="text-yellow-300 font-bold text-sm mb-3">🏆 New Personal Best!</div>
            )}

            <button
              onClick={handleRestart}
              className="px-8 py-3 rounded-xl font-black text-white text-lg cursor-pointer"
              style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
            >
              ↺ Try Again
            </button>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span>← → Change lane</span>
        <span>↑ Jump</span>
        <span>↓ Slide under barriers</span>
      </div>
    </div>
  );
}

// ─── Overlay draw (called from tick for idle/dead canvas state) ───────────────

function drawOverlay(ctx: CanvasRenderingContext2D, s: SubwayState) {
  if (s.phase === "idle") {
    // Draw minimal background text so canvas isn't blank before React overlay renders
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}
