"use client";

import { useEffect, useRef, useState } from "react";

type Obstacle = { x: number; type: "spike" | "block" | "gap" };

type GDState = {
  playerY: number;
  vel: number;
  obstacles: Obstacle[];
  score: number;
  frame: number;
  phase: "idle" | "running" | "dead";
  onGround: boolean;
};

interface Props {
  playerName: string;
  onScore: (n: number) => void;
}

const CANVAS_W = 400;
const CANVAS_H = 280;
const GROUND_Y = 200;
const PLAYER_SIZE = 28;
const PLAYER_X = 80;

// 5 background stars positions (x, y, parallax offset accumulator)
const STAR_POSITIONS: [number, number][] = [
  [40, 30],
  [120, 60],
  [220, 20],
  [310, 50],
  [370, 80],
];

export default function GeoDashGame({ playerName, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GDState>({
    playerY: GROUND_Y - PLAYER_SIZE,
    vel: 0,
    obstacles: [],
    score: 0,
    frame: 0,
    phase: "idle",
    onGround: true,
  });
  const flapRef = useRef(false);
  const bestScoreRef = useRef(0);
  const starOffsetRef = useRef(0);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resetState() {
      stateRef.current = {
        playerY: GROUND_Y - PLAYER_SIZE,
        vel: 0,
        obstacles: [],
        score: 0,
        frame: 0,
        phase: "idle",
        onGround: true,
      };
      starOffsetRef.current = 0;
    }

    function tick() {
      const s = stateRef.current;

      if (s.phase === "idle") {
        if (flapRef.current) {
          flapRef.current = false;
          s.phase = "running";
        }
        drawFrame(ctx!, s);
        forceUpdate((n) => n + 1);
        return;
      }

      if (s.phase === "dead") {
        if (flapRef.current) {
          flapRef.current = false;
          resetState();
          stateRef.current.phase = "running";
        }
        drawFrame(ctx!, stateRef.current);
        forceUpdate((n) => n + 1);
        return;
      }

      // running
      const speed = 4 + s.score * 0.02;

      // Parallax star offset
      starOffsetRef.current = (starOffsetRef.current + speed * 0.3) % CANVAS_W;

      // Jump input
      if (flapRef.current && s.onGround) {
        s.vel = -12;
        s.onGround = false;
      }
      flapRef.current = false;

      // Physics
      s.vel += 0.7;
      s.playerY += s.vel;

      // Ground collision
      const groundLevel = GROUND_Y - PLAYER_SIZE;
      if (s.playerY >= groundLevel) {
        s.playerY = groundLevel;
        s.vel = 0;
        s.onGround = true;
      } else {
        s.onGround = false;
      }

      // Scroll obstacles
      for (const obs of s.obstacles) {
        obs.x -= speed;
      }

      // Remove off-screen obstacles
      s.obstacles = s.obstacles.filter((o) => o.x > -60);

      // Generate new obstacles
      s.frame++;
      const lastObs = s.obstacles[s.obstacles.length - 1];
      const minGap = 80 + Math.random() * 20;
      const shouldSpawn =
        !lastObs || lastObs.x < CANVAS_W - minGap;
      if (shouldSpawn && s.frame > 60) {
        const rand = Math.random();
        const type: Obstacle["type"] =
          rand < 0.35 ? "spike" : rand < 0.7 ? "block" : "gap";
        s.obstacles.push({ x: CANVAS_W + 10, type });
      }

      // Score
      s.score++;

      // Collision detection
      const px = PLAYER_X;
      const py = s.playerY;

      for (const obs of s.obstacles) {
        if (obs.type === "spike") {
          // Spike box: 20×30 at obs.x, ground-30
          const sx = obs.x;
          const sy = GROUND_Y - 30;
          const sw = 20;
          const sh = 30;
          if (
            px < sx + sw &&
            px + PLAYER_SIZE > sx &&
            py < sy + sh &&
            py + PLAYER_SIZE > sy
          ) {
            die(s);
            return;
          }
        } else if (obs.type === "block") {
          const bx = obs.x;
          const by = GROUND_Y - PLAYER_SIZE;
          const bw = PLAYER_SIZE;
          const bh = PLAYER_SIZE;
          if (
            px < bx + bw &&
            px + PLAYER_SIZE > bx &&
            py < by + bh &&
            py + PLAYER_SIZE > by
          ) {
            die(s);
            return;
          }
        } else if (obs.type === "gap") {
          // Gap: 40px wide starting at obs.x
          if (
            s.onGround &&
            px + PLAYER_SIZE > obs.x &&
            px < obs.x + 40
          ) {
            die(s);
            return;
          }
        }
      }

      drawFrame(ctx!, s);
      forceUpdate((n) => n + 1);
    }

    function die(s: GDState) {
      s.phase = "dead";
      if (s.score > bestScoreRef.current) {
        bestScoreRef.current = s.score;
      }
      onScore(s.score);
      drawFrame(ctx!, s);
      forceUpdate((n) => n + 1);
    }

    function drawFrame(ctx: CanvasRenderingContext2D, s: GDState) {
      const speed = 4 + s.score * 0.02;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, "#0f0c29");
      bg.addColorStop(1, "#302b63");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars with parallax
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (const [sx, sy] of STAR_POSITIONS) {
        const x = ((sx - starOffsetRef.current + CANVAS_W * 10) % CANVAS_W);
        ctx.beginPath();
        ctx.arc(x, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ground — draw with gaps
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 4;
      ctx.beginPath();

      let gx = 0;
      const gapObstacles = s.obstacles.filter((o) => o.type === "gap");

      // Build segments excluding gaps
      const segments: [number, number][] = [];
      let start = 0;
      for (const go of gapObstacles) {
        if (go.x > start) {
          segments.push([start, go.x]);
        }
        start = go.x + 40;
      }
      segments.push([start, CANVAS_W]);

      for (const [from, to] of segments) {
        if (to > from) {
          ctx.moveTo(from, GROUND_Y);
          ctx.lineTo(to, GROUND_Y);
        }
      }
      ctx.stroke();

      // Gap pits
      for (const go of gapObstacles) {
        ctx.fillStyle = "#0a0820";
        ctx.fillRect(go.x, GROUND_Y, 40, CANVAS_H - GROUND_Y);
      }

      // Obstacles
      for (const obs of s.obstacles) {
        if (obs.type === "spike") {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(obs.x, GROUND_Y);
          ctx.lineTo(obs.x + 10, GROUND_Y - 30);
          ctx.lineTo(obs.x + 20, GROUND_Y);
          ctx.closePath();
          ctx.fill();
        } else if (obs.type === "block") {
          ctx.fillStyle = "#f97316";
          ctx.fillRect(obs.x, GROUND_Y - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
          ctx.strokeStyle = "#fb923c";
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x, GROUND_Y - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
        }
      }

      // Player
      ctx.save();
      const cx = PLAYER_X + PLAYER_SIZE / 2;
      const cy = s.playerY + PLAYER_SIZE / 2;
      ctx.translate(cx, cy);
      if (s.phase === "running") {
        const angle = ((s.frame * 4) * Math.PI) / 180;
        ctx.rotate(angle);
      }
      const grad = ctx.createLinearGradient(
        -PLAYER_SIZE / 2,
        -PLAYER_SIZE / 2,
        PLAYER_SIZE / 2,
        PLAYER_SIZE / 2
      );
      grad.addColorStop(0, "#6366f1");
      grad.addColorStop(1, "#a855f7");
      ctx.fillStyle = grad;
      ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
      ctx.restore();

      // HUD
      ctx.fillStyle = "white";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`SCORE: ${s.score}`, CANVAS_W - 10, 24);

      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(`SPD: ${speed.toFixed(1)}`, 10, 24);

      // Overlays
      if (s.phase === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.textAlign = "center";
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 22px monospace";
        ctx.fillText("🎮 GEOMETRY DASH", CANVAS_W / 2, CANVAS_H / 2 - 18);
        ctx.fillStyle = "white";
        ctx.font = "14px monospace";
        ctx.fillText("Click or Space to start", CANVAS_W / 2, CANVAS_H / 2 + 14);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "11px monospace";
        ctx.fillText(`Player: ${playerName}`, CANVAS_W / 2, CANVAS_H / 2 + 38);
      }

      if (s.phase === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.textAlign = "center";
        ctx.font = "bold 28px monospace";
        ctx.fillStyle = "#ef4444";
        ctx.fillText("💥 DEAD", CANVAS_W / 2, CANVAS_H / 2 - 36);
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "white";
        ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2);
        ctx.fillStyle = "#facc15";
        ctx.fillText(`Best: ${bestScoreRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 24);
        // "Try Again" button drawn on canvas for visual only; click handled by canvas click
        ctx.fillStyle = "#6366f1";
        ctx.beginPath();
        const bx2 = CANVAS_W / 2 - 60;
        const by2 = CANVAS_H / 2 + 44;
        const bw2 = 120;
        const bh2 = 32;
        const r2 = 8;
        ctx.moveTo(bx2 + r2, by2);
        ctx.lineTo(bx2 + bw2 - r2, by2);
        ctx.arcTo(bx2 + bw2, by2, bx2 + bw2, by2 + r2, r2);
        ctx.lineTo(bx2 + bw2, by2 + bh2 - r2);
        ctx.arcTo(bx2 + bw2, by2 + bh2, bx2 + bw2 - r2, by2 + bh2, r2);
        ctx.lineTo(bx2 + r2, by2 + bh2);
        ctx.arcTo(bx2, by2 + bh2, bx2, by2 + bh2 - r2, r2);
        ctx.lineTo(bx2, by2 + r2);
        ctx.arcTo(bx2, by2, bx2 + r2, by2, r2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 13px monospace";
        ctx.fillText("Try Again", CANVAS_W / 2, CANVAS_H / 2 + 65);
      }
    }

    // Initial draw
    drawFrame(ctx, stateRef.current);

    const interval = setInterval(tick, 16);

    // Key handlers
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flapRef.current = true;
      }
    }
    function onCanvasClick() {
      flapRef.current = true;
    }

    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("click", onCanvasClick);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("click", onCanvasClick);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          border: "2px solid #4ade80",
          borderRadius: "8px",
          cursor: "pointer",
          display: "block",
        }}
      />
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", margin: 0 }}>
        Space / ↑ / Click to jump
      </p>
    </div>
  );
}
