import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";

const KEY = "mfx:rewards";

export type RewardTask = {
  id: string;
  title: string;
  description: string;
  duration: "1month" | "3month" | "6month";
  reward: string;
  rewardType: "voucher" | "trip" | "both";
  rewardAlt?: string;
  participants: string[];
  completedBy: string[];
  status: "open" | "closed";
  createdAt: string;
  dueDate: string;
};

const SEED: RewardTask[] = [
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
    title: "Client Portfolio Website",
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
    title: "AI Marketing Funnel — SMB Clients",
    description:
      "Create a fully automated marketing funnel targeting small and medium-sized businesses for AI content creation, social media management, and retainer services. The system must be end-to-end automated (lead capture → nurture → booking → onboarding). Goal: at least 5–10 paying clients using the funnel by the end of month 3.",
    duration: "3month",
    reward: "5-Day Paid Trip with +1",
    rewardType: "both",
    rewardAlt: "₹25,000 Amazon Voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-09-17",
  },
  {
    id: "RW-004",
    title: "YouTube AI Channel — 500 Subscribers",
    description:
      "Launch and grow a YouTube channel focused on AI tools, automation workflows, and MetaFX work. Publish at least 12 high-quality videos over 3 months. Reach 500 subscribers with an average video watch time of at least 3 minutes. Each video should have proper SEO titles, descriptions, and thumbnails.",
    duration: "3month",
    reward: "₹5,000 Amazon Voucher",
    rewardType: "voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-09-17",
  },
  {
    id: "RW-005",
    title: "Land 3 AI Retainer Clients",
    description:
      "Secure 3 new paying retainer clients for MetaFX's AI services through cold outreach, LinkedIn, partnerships, or referrals. Each retainer must be a minimum of ₹15,000/month. Provide signed contracts or confirmed payment as proof. Document the outreach strategy so it can be replicated.",
    duration: "3month",
    reward: "₹8,000 Amazon Voucher",
    rewardType: "voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-09-17",
  },
  {
    id: "RW-006",
    title: "AI SaaS Product Launch",
    description:
      "Conceptualise, build, and launch an AI-powered SaaS product or tool that generates recurring revenue. The product must be live, publicly accessible, and have at least 10 paying users by the end of 6 months. Document the build process and publish a case study on the MetaFX website.",
    duration: "6month",
    reward: "₹50,000 Amazon Voucher",
    rewardType: "both",
    rewardAlt: "Equity discussion with Mukul",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-12-17",
  },
  {
    id: "RW-007",
    title: "AI Agency Brand — 10 Clients",
    description:
      "Build a full-scale AI content agency brand under the MetaFX umbrella — complete with a dedicated website, service packages, pricing pages, testimonials, and case studies. Run targeted ad campaigns and outreach. Secure 10 paying clients by the 6-month mark. The brand must be independent and self-sustaining.",
    duration: "6month",
    reward: "10-Day International Trip with +1",
    rewardType: "both",
    rewardAlt: "₹40,000 Amazon Voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-12-17",
  },
  {
    id: "RW-008",
    title: "Enterprise AI Automation Case Study",
    description:
      "Develop and deploy a comprehensive AI automation system for a major client that saves them 20+ hours per week. The system should cover content creation, scheduling, reporting, or internal operations. Deliver a detailed case study with before/after metrics, published on the MetaFX portfolio — ready to use for business development.",
    duration: "6month",
    reward: "₹20,000 Amazon Voucher",
    rewardType: "voucher",
    participants: [],
    completedBy: [],
    status: "open",
    createdAt: "2026-06-17",
    dueDate: "2026-12-17",
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
    const tasks = await getAll();
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("rewards GET error:", err);
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, player } = body as {
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
    const body = await req.json();
    const { id, ...fields } = body as { id: string } & Partial<RewardTask>;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const tasks = await getAll();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updated = [...tasks];
    updated[idx] = { ...tasks[idx], ...fields };
    await kvSet(KEY, updated);

    return NextResponse.json(updated[idx]);
  } catch (err) {
    console.error("rewards PATCH error:", err);
    return NextResponse.json({ error: "Failed to update reward" }, { status: 500 });
  }
}
