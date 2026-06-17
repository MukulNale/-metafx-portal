"use client";

import { useEffect, useRef, useState } from "react";

type Shot = { x: number; y: number; vx: number; vy: number; active: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type BBState = {
  ballX: number;
  ballY: number;
  shot: Shot;
  hoopX: number;
  hoopY: number;
  score: number;
  misses: number;
  timeLeft: number;
  phase: "idle" | "aiming" | "flying" | "scored" | "missed" | "dead";
  frame: number;
  powerBar: number;
  aimAngle: number;
  particles: Particle[];
};

interface Props {
  playerName: string;
  onScore: (n: number) => void;
}

function randomHoopX() {
  return 80 + Math.random() * 240;
}

function initState(): BBState {
  return {
    ballX: 200,
    ballY: 380,
    shot: { x: 200, y: 380, vx: 0, vy: 0, active: false },
    hoopX: randomHoopX(),
    hoopY: 120,
    score: 0,
    misses: 0,
    timeLeft: 3600,
    phase: "idle",
    frame: 0,
    powerBar: 0,
    aimAngle: -Math.PI / 3,
    particles: [],
  };
}

export default function BasketballGame({ playerName, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<BBState>(initState());
  const mouseRef = useRef<{ x: number; y: number; holding: boolean; holdStart: number }>({
    x: 200,
    y: 200,
    holding: false,
    holdStart: 0,
  });
  const [, forceUpdate] = useState(0);
  const bestRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      if (s.phase === "dead") return;
      if (s.phase === "idle") s.phase = "aiming";
      if (s.phase === "aiming" || s.phase === "scored" || s.phase === "missed") {
        s.phase = "aiming";
        const pos = getPos(e);
        mouseRef.current.x = pos.x;
        mouseRef.current.y = pos.y;
        mouseRef.current.holding = true;
        mouseRef.current.holdStart = s.frame;
      }
    };

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const pos = getPos(e);
      mouseRef.current.x = pos.x;
      mouseRef.current.y = pos.y;
      const s = stateRef.current;
      const dx = pos.x - s.ballX;
      const dy = pos.y - s.ballY;
      s.aimAngle = Math.atan2(dy, dx);
    };

    const onMouseUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const m = mouseRef.current;
      if (!m.holding) return;
      m.holding = false;
      const s = stateRef.current;
      if (s.phase !== "aiming") return;
      const power = s.powerBar / 100;
      const maxSpeed = 14;
      const speed = power * maxSpeed;
      s.shot = {
        x: s.ballX,
        y: s.ballY,
        vx: Math.cos(s.aimAngle) * speed,
        vy: Math.sin(s.aimAngle) * speed,
        active: true,
      };
      s.phase = "flying";
      s.powerBar = 0;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onMouseDown, { passive: false });
    canvas.addEventListener("touchmove", onMouseMove, { passive: false });
    canvas.addEventListener("touchend", onMouseUp, { passive: false });

    const tick = () => {
      const s = stateRef.current;
      const m = mouseRef.current;
      s.frame++;

      // Timer
      if (s.phase !== "idle" && s.phase !== "dead") {
        s.timeLeft = Math.max(0, s.timeLeft - 1);
        if (s.timeLeft === 0) {
          s.phase = "dead";
          if (s.score > bestRef.current) bestRef.current = s.score;
          onScore(s.score);
        }
      }

      // Power bar
      if (m.holding && s.phase === "aiming") {
        const held = s.frame - m.holdStart;
        s.powerBar = Math.min(100, (held / 90) * 100);
      }

      // Update aim angle from mouse
      if (s.phase === "aiming") {
        const dx = m.x - s.ballX;
        const dy = m.y - s.ballY;
        s.aimAngle = Math.atan2(dy, dx);
      }

      // Ball physics
      if (s.phase === "flying") {
        const shot = s.shot;
        const prevY = shot.y;
        shot.vy += 0.4;
        shot.x += shot.vx;
        shot.y += shot.vy;

        // Score check
        if (
          shot.vy > 0 &&
          prevY < s.hoopY &&
          shot.y >= s.hoopY &&
          Math.abs(shot.x - s.hoopX) < 28
        ) {
          s.score++;
          onScore(s.score);
          s.phase = "scored";
          // Confetti burst
          for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * Math.PI * 2;
            s.particles.push({
              x: shot.x,
              y: shot.y,
              vx: Math.cos(angle) * (2 + Math.random() * 3),
              vy: Math.sin(angle) * (2 + Math.random() * 3) - 2,
              life: 40,
              color: ["#ff6b00", "#ffd700", "#ff4500", "#fff"][Math.floor(Math.random() * 4)],
            });
          }
          setTimeout(() => {
            s.hoopX = randomHoopX();
            s.ballX = 200;
            s.ballY = 380;
            s.shot.active = false;
            if (s.phase !== "dead") s.phase = "aiming";
          }, 600);
        } else if (
          shot.x < -20 ||
          shot.x > 420 ||
          shot.y > 460
        ) {
          s.misses++;
          s.phase = "missed";
          s.ballX = 200;
          s.ballY = 380;
          s.shot.active = false;
          setTimeout(() => {
            if (s.phase !== "dead") s.phase = "aiming";
          }, 500);
        }
      }

      // Particles
      s.particles = s.particles
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, life: p.life - 1 }))
        .filter(p => p.life > 0);

      draw(s);
      forceUpdate(f => f + 1);
    };

    const draw = (s: BBState) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = 400, H = 450;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#1a1a2e");
      bg.addColorStop(1, "#0d0d1a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Hardwood floor stripes
      for (let i = 0; i < 8; i++) {
        const y = 400 + i * 7;
        ctx.fillStyle = i % 2 === 0 ? "#8B4513" : "#A0522D";
        ctx.fillRect(0, y, W, 7);
      }
      // Floor line
      ctx.strokeStyle = "#cc8800";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 400);
      ctx.lineTo(W, 400);
      ctx.stroke();

      // Court center circle suggestion
      ctx.strokeStyle = "rgba(204,136,0,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(200, 400, 60, Math.PI, 0);
      ctx.stroke();

      // --- Power bar ---
      if (s.phase === "aiming" && mouseRef.current.holding) {
        const barH = 120;
        const barY = H / 2 - barH / 2;
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(12, barY, 16, barH);
        const filled = (s.powerBar / 100) * barH;
        const barGrad = ctx.createLinearGradient(0, barY + barH, 0, barY);
        barGrad.addColorStop(0, "#22c55e");
        barGrad.addColorStop(0.5, "#eab308");
        barGrad.addColorStop(1, "#ef4444");
        ctx.fillStyle = barGrad;
        ctx.fillRect(13, barY + barH - filled, 14, filled);
        ctx.fillStyle = "white";
        ctx.font = "9px Arial";
        ctx.textAlign = "center";
        ctx.fillText("PWR", 20, barY - 6);
      }

      // --- Aim indicator (trajectory preview) ---
      if (s.phase === "aiming" && mouseRef.current.holding && s.powerBar > 5) {
        const power = s.powerBar / 100;
        const speed = power * 14;
        const vx0 = Math.cos(s.aimAngle) * speed;
        const vy0 = Math.sin(s.aimAngle) * speed;
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "rgba(255,200,100,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let t = 0; t <= 25; t += 5) {
          const px = s.ballX + vx0 * t;
          const py = s.ballY + vy0 * t + 0.5 * 0.4 * t * t;
          if (t === 0) ctx.moveTo(px, py);
          else {
            ctx.lineTo(px, py);
            // dot
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.moveTo(px, py);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // --- Hoop ---
      const hx = s.hoopX, hy = s.hoopY;
      // Backboard
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(hx - 38, hy - 30, 76, 46);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(hx - 38, hy - 30, 76, 46);
      // Inner square on backboard
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx - 14, hy - 16, 28, 20);

      // Rim
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hx, hy + 16, 28, 0, Math.PI * 2);
      ctx.stroke();

      // Net lines (8 lines hanging down)
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI;
        const x1 = hx + Math.cos(Math.PI + angle) * 28;
        const x2 = hx + Math.cos(Math.PI + angle) * 14;
        ctx.beginPath();
        ctx.moveTo(x1, hy + 16);
        ctx.lineTo(x2, hy + 40);
        ctx.stroke();
      }
      // Bottom of net
      ctx.beginPath();
      ctx.moveTo(hx - 14, hy + 40);
      ctx.lineTo(hx + 14, hy + 40);
      ctx.stroke();

      // --- Ball ---
      const bx = s.phase === "flying" ? s.shot.x : s.ballX;
      const by = s.phase === "flying" ? s.shot.y : s.ballY;

      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      const ballGrad = ctx.createRadialGradient(bx - 5, by - 5, 2, bx, by, 16);
      ballGrad.addColorStop(0, "#ff8c00");
      ballGrad.addColorStop(1, "#cc4400");
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Seam lines
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      // Horizontal seam
      ctx.beginPath();
      ctx.arc(bx, by, 16, -0.3, Math.PI + 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, 16, Math.PI - 0.3, -0.3);
      ctx.stroke();
      // Vertical seam
      ctx.beginPath();
      ctx.arc(bx, by, 16, Math.PI / 2 - 0.3, (3 * Math.PI) / 2 + 0.3);
      ctx.stroke();
      ctx.restore();

      // --- Particles ---
      s.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor((p.life / 40) * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });

      // --- HUD ---
      // Timer
      const secs = Math.ceil(s.timeLeft / 60);
      ctx.fillStyle = secs <= 10 ? "#ef4444" : "white";
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`${secs}s`, W - 14, 34);

      // Score
      ctx.fillStyle = "white";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`🏀 ${s.score}`, W / 2, 34);

      // Misses
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`Miss: ${s.misses}`, 14, 34);

      // --- Overlays ---
      if (s.phase === "idle") {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🏀 BASKETBALL", W / 2, H / 2 - 40);
        ctx.font = "16px Arial";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText("Click and hold to aim", W / 2, H / 2 + 4);
        ctx.fillText("Release to shoot", W / 2, H / 2 + 28);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "13px Arial";
        ctx.fillText(`Player: ${playerName}`, W / 2, H / 2 + 58);
      }

      if (s.phase === "scored") {
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        ctx.fillText("NICE SHOT! 🔥", W / 2, H / 2);
      }

      if (s.phase === "missed") {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MISS!", W / 2, H / 2);
      }

      if (s.phase === "dead") {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.font = "bold 28px Arial";
        ctx.textAlign = "center";
        ctx.fillText("TIME'S UP!", W / 2, H / 2 - 60);
        ctx.font = "22px Arial";
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 - 20);
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(`Best: ${bestRef.current}`, W / 2, H / 2 + 16);
        // Try Again button hint
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.roundRect(W / 2 - 70, H / 2 + 44, 140, 38, 8);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "bold 16px Arial";
        ctx.fillText("Try Again", W / 2, H / 2 + 68);
      }
    };

    const interval = setInterval(tick, 16);

    // Try Again click
    const onTryAgain = (e: MouseEvent | TouchEvent) => {
      const s = stateRef.current;
      if (s.phase !== "dead") return;
      const pos = getPos(e);
      const W = 400, H = 450;
      if (
        pos.x >= W / 2 - 70 &&
        pos.x <= W / 2 + 70 &&
        pos.y >= H / 2 + 44 &&
        pos.y <= H / 2 + 82
      ) {
        stateRef.current = initState();
        stateRef.current.phase = "aiming";
      }
    };
    canvas.addEventListener("click", onTryAgain);
    canvas.addEventListener("touchstart", onTryAgain, { passive: false });

    return () => {
      clearInterval(interval);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onMouseDown);
      canvas.removeEventListener("touchmove", onMouseMove);
      canvas.removeEventListener("touchend", onMouseUp);
      canvas.removeEventListener("click", onTryAgain);
      canvas.removeEventListener("touchstart", onTryAgain);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={450}
      style={{ display: "block", cursor: "crosshair", maxWidth: "100%", touchAction: "none" }}
    />
  );
}
