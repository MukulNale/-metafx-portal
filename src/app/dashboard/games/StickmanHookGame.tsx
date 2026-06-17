"use client";

import { useEffect, useRef, useState } from "react";

type Anchor = { x: number; y: number; active: boolean };
type SHState = {
  px: number;
  py: number;
  vx: number;
  vy: number;
  hooked: boolean;
  hookAnchorIdx: number;
  rope: { x1: number; y1: number; x2: number; y2: number } | null;
  ropeLen: number;
  anchors: Anchor[];
  goal: { x: number; y: number };
  level: number;
  score: number;
  phase: "idle" | "flying" | "hooked" | "dead" | "win";
  frame: number;
  camX: number;
};

interface Props {
  playerName: string;
  onScore: (n: number) => void;
}

function generateAnchors(level: number): Anchor[] {
  const anchors: Anchor[] = [];
  const count = 8 + level;
  const spacing = 1200 / count;
  for (let i = 0; i < count; i++) {
    anchors.push({
      x: 60 + i * spacing + Math.random() * 60,
      y: 80 + Math.sin(i * 1.2) * 80 + Math.random() * 40,
      active: true,
    });
  }
  return anchors;
}

function initState(level = 1): SHState {
  const anchors = generateAnchors(level);
  return {
    px: 60,
    py: 300,
    vx: 2,
    vy: -2,
    hooked: false,
    hookAnchorIdx: -1,
    rope: null,
    ropeLen: 0,
    anchors,
    goal: { x: 1240, y: 140 },
    level,
    score: 0,
    phase: "idle",
    frame: 0,
    camX: 0,
  };
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, glow: boolean) {
  const spikes = 5;
  const inner = r * 0.4;
  ctx.save();
  if (glow) {
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 18;
  }
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffd700";
  ctx.fill();
  ctx.strokeStyle = "#ff8c00";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawStickman(ctx: CanvasRenderingContext2D, sx: number, sy: number, vx: number, hooked: boolean) {
  ctx.save();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";

  // Head
  ctx.beginPath();
  ctx.arc(sx, sy - 26, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#fde68a";
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(sx, sy - 17);
  ctx.lineTo(sx, sy + 4);
  ctx.stroke();

  // Legs (animated based on vx)
  const legAngle = hooked ? 0.4 : Math.sin(vx * 0.8) * 0.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy + 4);
  ctx.lineTo(sx - 10 + Math.cos(legAngle) * 4, sy + 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy + 4);
  ctx.lineTo(sx + 10 - Math.cos(legAngle) * 4, sy + 20);
  ctx.stroke();

  // Arms
  const armAngle = hooked ? -0.6 : Math.sin(vx * 0.5) * 0.3;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 12);
  ctx.lineTo(sx - 12, sy - 4 + Math.sin(armAngle) * 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy - 12);
  ctx.lineTo(sx + 12, sy - 4 - Math.sin(armAngle) * 6);
  ctx.stroke();

  ctx.restore();
}

export default function StickmanHookGame({ playerName, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SHState>(initState(1));
  const clickRef = useRef<boolean>(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onClick = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      clickRef.current = true;
    };

    canvas.addEventListener("mousedown", onClick);
    canvas.addEventListener("touchstart", onClick, { passive: false });

    const tick = () => {
      const s = stateRef.current;
      s.frame++;

      const W = 400, H = 500;
      const FLOOR = 470;

      // Handle click
      if (clickRef.current) {
        clickRef.current = false;

        if (s.phase === "idle") {
          s.phase = "flying";
          return;
        }

        if (s.phase === "dead") {
          stateRef.current = initState(s.level);
          stateRef.current.phase = "flying";
          return;
        }

        if (s.phase === "win") {
          const newLevel = s.level + 1;
          stateRef.current = initState(newLevel);
          stateRef.current.score = s.score;
          stateRef.current.phase = "flying";
          return;
        }

        if (s.phase === "flying") {
          // Find nearest anchor
          let nearest = -1;
          let nearestDist = 200;
          for (let i = 0; i < s.anchors.length; i++) {
            const a = s.anchors[i];
            const dx = a.x - s.px;
            const dy = a.y - s.py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = i;
            }
          }
          if (nearest >= 0) {
            s.hooked = true;
            s.hookAnchorIdx = nearest;
            const a = s.anchors[nearest];
            s.ropeLen = Math.sqrt((a.x - s.px) ** 2 + (a.y - s.py) ** 2);
            s.rope = { x1: s.px, y1: s.py, x2: a.x, y2: a.y };
            s.phase = "hooked";
          }
        } else if (s.phase === "hooked") {
          // Release
          s.hooked = false;
          s.rope = null;
          s.hookAnchorIdx = -1;
          s.phase = "flying";
        }
      }

      if (s.phase !== "flying" && s.phase !== "hooked") return;

      // Physics
      if (s.phase === "hooked") {
        const a = s.anchors[s.hookAnchorIdx];
        // Pendulum: constrain to rope length
        const dx = s.px - a.x;
        const dy = s.py - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Apply gravity
        s.vy += 0.4;

        // Move player
        s.px += s.vx;
        s.py += s.vy;

        // Constrain to rope length
        const ndx = s.px - a.x;
        const ndy = s.py - a.y;
        const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
        if (ndist > s.ropeLen) {
          const nx = ndx / ndist;
          const ny = ndy / ndist;
          s.px = a.x + nx * s.ropeLen;
          s.py = a.y + ny * s.ropeLen;
          // Project velocity onto tangent
          const dot = s.vx * nx + s.vy * ny;
          s.vx -= dot * nx;
          s.vy -= dot * ny;
        }

        s.rope = { x1: s.px, y1: s.py, x2: a.x, y2: a.y };
      } else {
        // Free fly
        s.vy += 0.4;
        s.px += s.vx;
        s.py += s.vy;
      }

      // Camera
      s.camX = Math.max(0, s.px - 200);

      // Floor death
      if (s.py >= FLOOR) {
        s.phase = "dead";
        onScore(s.score);
        return;
      }

      // Ceiling bounce
      if (s.py <= 0) {
        s.vy = Math.abs(s.vy);
        s.py = 0;
      }

      // Goal check
      const gdx = s.px - s.goal.x;
      const gdy = s.py - s.goal.y;
      if (Math.sqrt(gdx * gdx + gdy * gdy) < 24) {
        s.score += s.level * 10;
        s.phase = "win";
        onScore(s.score);
        return;
      }

      // Score for swinging
      if (s.phase === "hooked" && s.frame % 30 === 0) {
        s.score += 1;
      }

      draw(s);
      forceUpdate(f => f + 1);
    };

    const draw = (s: SHState) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = 400, H = 500;

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#87CEEB");
      sky.addColorStop(1, "#4a9eff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Clouds
      const clouds = [
        { wx: 100, y: 60, w: 80 },
        { wx: 400, y: 40, w: 100 },
        { wx: 700, y: 80, w: 70 },
        { wx: 950, y: 55, w: 90 },
      ];
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const c of clouds) {
        const cx = c.wx - s.camX;
        ctx.beginPath();
        ctx.roundRect(cx, c.y, c.w, 28, 14);
        ctx.fill();
      }

      // Ground
      ctx.fillStyle = "#1e3a1e";
      ctx.fillRect(0, 470, W, 30);
      ctx.fillStyle = "#2d5a1b";
      ctx.fillRect(0, 468, W, 6);

      // Anchors
      for (let i = 0; i < s.anchors.length; i++) {
        const a = s.anchors[i];
        const ax = a.x - s.camX;
        const ay = a.y;

        // Check if nearest
        const dx = a.x - s.px;
        const dy = a.y - s.py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isNearest = dist < 200 && s.phase === "flying";

        // Pulsing ring for nearest reachable
        if (isNearest) {
          const pulse = 0.5 + 0.5 * Math.sin(s.frame * 0.15);
          ctx.beginPath();
          ctx.arc(ax, ay, 16 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(147,51,234,${0.4 + pulse * 0.4})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Anchor circle
        ctx.beginPath();
        ctx.arc(ax, ay, 10, 0, Math.PI * 2);
        const anchorGrad = ctx.createRadialGradient(ax - 3, ay - 3, 1, ax, ay, 10);
        anchorGrad.addColorStop(0, "#93c5fd");
        anchorGrad.addColorStop(1, "#475569");
        ctx.fillStyle = anchorGrad;
        ctx.fill();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Hook icon
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.fillText("⚓", ax, ay + 4);
      }

      // Goal star
      const gx = s.goal.x - s.camX;
      const gy = s.goal.y;
      drawStar(ctx, gx, gy, 18, true);

      // Rope
      if (s.rope && s.phase === "hooked") {
        ctx.beginPath();
        ctx.moveTo(s.rope.x1 - s.camX, s.rope.y1);
        ctx.lineTo(s.rope.x2 - s.camX, s.rope.y2);
        ctx.strokeStyle = "#9333ea";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();

        // Rope length arc near player
        const ropePercent = s.ropeLen / 150;
        ctx.beginPath();
        ctx.arc(s.rope.x1 - s.camX, s.rope.y1, 22, -Math.PI / 2, -Math.PI / 2 + ropePercent * Math.PI);
        ctx.strokeStyle = "rgba(147,51,234,0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Stickman
      const sx = s.px - s.camX;
      const sy = s.py;
      drawStickman(ctx, sx, sy, s.vx, s.hooked);

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.roundRect(8, 8, 130, 44, 8);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`Level ${s.level}`, 18, 26);
      ctx.font = "12px Arial";
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(`Score: ${s.score}`, 18, 44);

      // Progress bar toward goal
      const progress = Math.min(1, s.px / s.goal.x);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.roundRect(W - 110, 12, 100, 12, 6);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.roundRect(W - 110, 12, 100 * progress, 12, 6);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "9px Arial";
      ctx.textAlign = "center";
      ctx.fillText("GOAL", W - 60, 32);

      // --- Overlays ---
      if (s.phase === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🕹️ STICKMAN HOOK", W / 2, H / 2 - 40);
        ctx.font = "16px Arial";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText("Click to grapple!", W / 2, H / 2 + 4);
        ctx.fillText("Click again to release", W / 2, H / 2 + 28);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "13px Arial";
        ctx.fillText(`Player: ${playerName}`, W / 2, H / 2 + 58);
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.roundRect(W / 2 - 60, H / 2 + 76, 120, 36, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 15px Arial";
        ctx.fillText("Play!", W / 2, H / 2 + 99);
      }

      if (s.phase === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("💀 FELL DOWN!", W / 2, H / 2 - 50);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 - 10);
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.roundRect(W / 2 - 70, H / 2 + 20, 140, 38, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.fillText("Try Again", W / 2, H / 2 + 44);
      }

      if (s.phase === "win") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        ctx.fillText("⭐ LEVEL COMPLETE!", W / 2, H / 2 - 50);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 - 10);
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.roundRect(W / 2 - 80, H / 2 + 20, 160, 38, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.fillText(`Next Level →`, W / 2, H / 2 + 44);
      }
    };

    // Initial draw
    draw(stateRef.current);

    const interval = setInterval(tick, 16);

    return () => {
      clearInterval(interval);
      canvas.removeEventListener("mousedown", onClick);
      canvas.removeEventListener("touchstart", onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={500}
      style={{ display: "block", cursor: "pointer", maxWidth: "100%", touchAction: "none" }}
    />
  );
}
