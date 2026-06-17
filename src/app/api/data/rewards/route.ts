import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "mfx:rewards:v2";

export type RewardTask = {
  id: string;
  title: string;
  description: string;
  duration: "1month" | "3month";
  reward: string;
  rewardType: "voucher";
  participants: string[];
  completedBy: string[];
  status: "open" | "closed";
  createdAt: string;
  dueDate: string;
};

const SEED: RewardTask[] = [
  // ── 1-Month ──────────────────────────────────────────────────────────────────
  {
    id: "RW-001",
    title: "MetaFX Social Media Launch",
    description:
      "Build out a MetaFX social media page across Instagram, LinkedIn, and X (Twitter). Create and schedule consistent posts for the full month — at least 20 posts total. Content should showcase MetaFX work, AI projects, team culture, and industry insights. Track follower growth and engagement metrics.",
    duration: "1month",
    reward: "₹2,500 Amazon Voucher",
    rewardType: "voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-07-17",
  },
  {
    id: "RW-002",
    title: "Client Portfolio Website + SEO",
    description:
      "Design and launch a polished portfolio website showcasing MetaFX's best work — AI projects, client case studies, and creative output. Implement on-page SEO (meta tags, structured data, optimised images, fast load times). The site must be live and indexable by the deadline.",
    duration: "1month",
    reward: "₹1,500 Amazon Voucher",
    rewardType: "voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-07-17",
  },
  {
    id: "RW-003",
    title: "Short-Form Video Series",
    description:
      "Produce and publish 8 short-form AI/MetaFX-themed videos across Instagram Reels, YouTube Shorts, and TikTok. Each video should be edited, captioned, and posted with relevant hashtags. Track total views and saves — minimum 5,000 combined views across all 8 videos by the deadline.",
    duration: "1month",
    reward: "₹1,500 Amazon Voucher",
    rewardType: "voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-07-17",
  },
  {
    id: "RW-004",
    title: "Cold Outreach Campaign",
    description:
      "Run a structured cold email or DM outreach campaign for MetaFX's AI services. Minimum 200 outreaches across LinkedIn, email, or Instagram DMs. Track all outreach in a spreadsheet and report open rates, reply rates, and booked calls. Goal: at least 1 discovery call booked per week for the full month.",
    duration: "1month",
    reward: "₹2,000 Amazon Voucher",
    rewardType: "voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-07-17",
  },
  // ── 3-Month ───────────────────────────────────────────────────────────────────
  {
    id: "RW-005",
    title: "AI Marketing Funnel — SMB Clients",
    description:
      "Create a fully automated marketing funnel targeting small and medium-sized businesses for AI content creation, social media management, and retainer services. The system must be end-to-end automated — lead capture, nurture sequence, booking, and onboarding. Goal: at least 5–10 paying clients signed through the funnel by the end of month 3.",
    duration: "3month",
    reward: "₹25,000 Amazon Voucher",
    rewardType: "voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-09-17",
  },
];

async function getAll(): Promise<RewardTask[]> {
  const stored = await kvGet<RewardTask[]>(KEY);
  if (!stored || stored.length === 0) {
    await kvSet(KEY, SEED);
    return SEED;
  }
  return stored;
}

export async function GET() {
  try {
    return NextResponse.json(await getAll());
  } catch (err) {
    console.error("rewards GET error:", err);
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, id, player } = await req.json() as {
      action: "participate" | "complete";
      id: string;
      player: string;
    };

    if (!id || !player) {
      return NextResponse.json({ error: "id and player are required" }, { status: 400 });
    }

    const tasks = await getAll();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = { ...tasks[idx] };

    if (action === "participate") {
      if (!task.participants.includes(player)) {
        task.participants = [...task.participants, player];
      }
    } else if (action === "complete") {
      if (!task.completedBy.includes(player)) {
        task.completedBy = [...task.completedBy, player];
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = [...tasks];
    updated[idx] = task;
    await kvSet(KEY, updated);
    return NextResponse.json(task);
  } catch (err) {
    console.error("rewards POST error:", err);
    return NextResponse.json({ error: "Failed to update reward" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...fields } = await req.json() as { id: string } & Partial<RewardTask>;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const tasks = await getAll();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const updated = [...tasks];
    updated[idx] = { ...tasks[idx], ...fields };
    await kvSet(KEY, updated);
    return NextResponse.json(updated[idx]);
  } catch (err) {
    console.error("rewards PATCH error:", err);
    return NextResponse.json({ error: "Failed to update reward" }, { status: 500 });
  }
}
