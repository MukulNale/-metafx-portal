"use client";

import { useEffect, useRef, useState } from "react";

interface Segment {
  x: number;
  width: number;
  y: number;
}

interface State {
  segments: Segment[];
  ballX: number;
  ballVX: number;
  speed: number;
  frame: number;
  score: number;
  bestScore: number;
  dead: boolean;
  keys: { left: boolean; right: boolean };
  segmentWidth: number;
  lastSegX: number;
}

interface Props {
  playerName: string;
  onScore: (score: number) => void;
}

const CANVAS_W = 380;
const CANVAS_H = 480;
const BALL_Y = 380;
const BALL_R = 12;
const SEGMENT_H = 20;
const INITIAL_WIDTH = 280;
const INITIAL_SPEED = 4;

export default function SlopeGame({ playerName, onScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, forceUpdate] = useState(0);

  const stateRef = useRef<State>({
    segments: [],
    ballX: CANVAS_W / 2,
    ballVX: 0,
    speed: INITIAL_SPEED,
    frame: 0,
    score: 0,
    bestScore: 0,
    dead: false,
    keys: { left: false, right: false },
    segmentWidth: INITIAL_WIDTH,
    lastSegX: CANVAS_W / 2,
  });

  const initSegments = (): Segment[] => {
    const segs: Segment[] = [];
    const count = Math.ceil(CANVAS_H / SEGMENT_H) + 4;
    let cx = CANVAS_W / 2;
    for (let i = 0; i < count; i++) {
      segs.push({ x: cx, width: INITIAL_WIDTH, y: CANVAS_H - i * SEGMENT_H });
    }
    return segs;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    s.segments = initSegments();
    s.ballX = CANVAS_W / 2;
    s.ballVX = 0;
    s.speed = INITIAL_SPEED;
    s.frame = 0;
    s.score = 0;
    s.dead = false;
    s.keys = { left: false, right: false };
    s.segmentWidth = INITIAL_WIDTH;
    s.lastSegX = CANVAS_W / 2;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") s.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") s.keys.right = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") s.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") s.keys.right = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const tick = () => {
      const st = stateRef.current;
      if (st.dead) return;

      st.frame++;
      st.score = Math.floor(st.frame / 60);
      st.speed += 0.001;
      st.segmentWidth = Math.max(80, INITIAL_WIDTH - (st.frame / 60) * 0.3 * 60);

      // Ball movement
      if (st.keys.left) st.ballVX = -4;
      if (st.keys.right) st.ballVX = 4;
      st.ballVX *= 0.85;
      st.ballX += st.ballVX;
      st.ballX = Math.max(BALL_R, Math.min(CANVAS_W - BALL_R, st.ballX));

      // Scroll segments down
      for (const seg of st.segments) {
        seg.y += st.speed;
      }

      // Remove off-screen segments
      st.segments = st.segments.filter((seg) => seg.y < CANVAS_H + SEGMENT_H * 2);

      // Add new segments at top
      while (st.segments.length < Math.ceil(CANVAS_H / SEGMENT_H) + 6) {
        const topSeg = st.segments.reduce((a, b) => (a.y < b.y ? a : b));
        const drift = (Math.random() - 0.5) * 30;
        const newX = Math.max(st.segmentWidth / 2 + 10, Math.min(CANVAS_W - st.segmentWidth / 2 - 10, topSeg.x + drift));
        st.segments.push({ x: newX, width: st.segmentWidth, y: topSeg.y - SEGMENT_H });
        st.lastSegX = newX;
      }

      // Collision check: find segment at ball Y
      let onTrack = false;
      for (const seg of st.segments) {
        if (seg.y >= BALL_Y - SEGMENT_H && seg.y <= BALL_Y + SEGMENT_H) {
          const left = seg.x - seg.width / 2;
          const right = seg.x + seg.width / 2;
          if (st.ballX - BALL_R >= left && st.ballX + BALL_R <= right) {
            onTrack = true;
            break;
          }
        }
      }
      if (!onTrack) {
        st.dead = true;
        if (st.score > st.bestScore) st.bestScore = st.score;
        onScore(st.score);
      }

      // Draw
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background
      ctx.fillStyle = "#070714";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Speed lines
      ctx.strokeStyle = "rgba(129, 140, 248, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const lx = 20 + i * 10;
        const ly = ((st.frame * st.speed * 2 + i * 70) % (CANVAS_H + 60)) - 30;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 2, ly + 40);
        ctx.stroke();

        const rx = CANVAS_W - 20 - i * 10;
        const ry = ((st.frame * st.speed * 2 + i * 50 + 25) % (CANVAS_H + 60)) - 30;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + 2, ry + 40);
        ctx.stroke();
      }

      // Draw track walls for each segment
      for (const seg of st.segments) {
        const left = seg.x - seg.width / 2;
        const right = seg.x + seg.width / 2;

        // Left wall
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(0, seg.y - SEGMENT_H, left, SEGMENT_H);

        // Right wall
        ctx.fillRect(right, seg.y - SEGMENT_H, CANVAS_W - right, SEGMENT_H);

        // Subtle grid line in track area
        ctx.strokeStyle = "rgba(34, 197, 94, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, seg.y - SEGMENT_H);
        ctx.lineTo(right, seg.y - SEGMENT_H);
        ctx.stroke();

        // Track edges (bright green lines)
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left, seg.y - SEGMENT_H);
        ctx.lineTo(left, seg.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(right, seg.y - SEGMENT_H);
        ctx.lineTo(right, seg.y);
        ctx.stroke();
      }

      // Ball glow
      const glowGrad = ctx.createRadialGradient(st.ballX, BALL_Y, 0, st.ballX, BALL_Y, BALL_R * 3);
      glowGrad.addColorStop(0, "rgba(129, 140, 248, 0.5)");
      glowGrad.addColorStop(1, "rgba(129, 140, 248, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(st.ballX, BALL_Y, BALL_R * 3, 0, Math.PI * 2);
      ctx.fill();

      // Ball
      ctx.fillStyle = "#818cf8";
      ctx.shadowColor = "#818cf8";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(st.ballX, BALL_Y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Score
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${st.score}`, CANVAS_W / 2, 44);
      ctx.font = "12px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("SCORE", CANVAS_W / 2, 60);

      // Player name
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(playerName, 10, 20);

      forceUpdate((n) => n + 1);
    };

    const interval = setInterval(tick, 16);
    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const s = stateRef.current;
    const best = s.bestScore;
    s.segments = initSegments();
    s.ballX = CANVAS_W / 2;
    s.ballVX = 0;
    s.speed = INITIAL_SPEED;
    s.frame = 0;
    s.score = 0;
    s.dead = false;
    s.keys = { left: false, right: false };
    s.segmentWidth = INITIAL_WIDTH;
    s.lastSegX = CANVAS_W / 2;
    s.bestScore = best;

    forceUpdate((n) => n + 1);
  };

  const st = stateRef.current;

  return (
    <div
      style={{
        position: "relative",
        width: CANVAS_W,
        height: CANVAS_H,
        display: "inline-block",
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          display: "block",
          borderRadius: 12,
          boxShadow: "0 0 40px rgba(129,140,248,0.3)",
        }}
      />
      {st.dead && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(7,7,20,0.88)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div style={{ color: "#f87171", fontSize: 32, fontWeight: 900, fontFamily: "monospace", letterSpacing: 2 }}>
            GAME OVER
          </div>
          <div style={{ color: "#ffffff", fontSize: 48, fontWeight: 900, fontFamily: "monospace" }}>
            {st.score}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "monospace" }}>
            BEST: {st.bestScore}
          </div>
          <button
            onClick={handleRestart}
            style={{
              marginTop: 8,
              padding: "10px 32px",
              background: "#818cf8",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "monospace",
              cursor: "pointer",
              letterSpacing: 1,
              boxShadow: "0 0 20px rgba(129,140,248,0.5)",
            }}
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
}
