import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kv";
import { PROJECTS } from "@/lib/projects";
import type { Project, SubTask } from "@/lib/projects";

const KEY = "mfx:projects";

// Migrate old single-assignee shape to assignees array
function migrate(projects: unknown[]): Project[] {
  return (projects as Project[]).map(p => ({
    ...p,
    tasks: p.tasks.map(t => ({
      ...t,
      subtasks: t.subtasks.map((s: SubTask & { assignee?: string }) => {
        if (Array.isArray(s.assignees)) return s;
        const legacy = s.assignee ?? "";
        const { assignee: _a, ...rest } = s as SubTask & { assignee?: string };
        return { ...rest, assignees: legacy ? [legacy] : [] };
      }),
    })),
  }));
}

export async function GET() {
  let projects = await kvGet<Project[]>(KEY);
  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    projects = PROJECTS;
    await kvSet(KEY, projects);
  } else {
    projects = migrate(projects);
  }
  return NextResponse.json({ projects });
}

export async function PUT(req: NextRequest) {
  const { projects } = await req.json();
  await kvSet(KEY, projects);
  return NextResponse.json({ ok: true });
}
