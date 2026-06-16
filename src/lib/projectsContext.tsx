"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { PROJECTS as SEED, type Project, type SubTask } from "./projects";

interface Ctx {
  projects: Project[];
  addProject: (p: Project) => void;
  saveProject: (p: Project) => void;
  deleteProject: (id: string) => void;
}

const ProjectsCtx = createContext<Ctx | null>(null);
const KEY    = "mfx_projects_v3";
const OLD_KEY = "mfx_projects_v2";

// Migrate a subtask from old shape (assignee: string) to new shape (assignees: string[])
function migrateSubTask(s: SubTask & { assignee?: string }): SubTask {
  if (Array.isArray(s.assignees)) return s;
  const legacy = (s as unknown as { assignee?: string }).assignee ?? "";
  const { assignee: _a, ...rest } = s as SubTask & { assignee?: string };
  return { ...rest, assignees: legacy ? [legacy] : [] };
}

function migrateProjects(raw: unknown[]): Project[] {
  return (raw as Project[]).map(p => ({
    ...p,
    tasks: p.tasks.map(t => ({ ...t, subtasks: t.subtasks.map(migrateSubTask) })),
  }));
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Try current key first
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { setProjects(JSON.parse(raw)); setReady(true); return; } catch { /* fall through */ }
    }
    // Try migrating from v2
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      try {
        const migrated = migrateProjects(JSON.parse(old));
        localStorage.setItem(KEY, JSON.stringify(migrated));
        setProjects(migrated);
        setReady(true);
        return;
      } catch { /* fall through */ }
    }
    // Seed
    localStorage.setItem(KEY, JSON.stringify(SEED));
    setProjects(SEED);
    setReady(true);
  }, []);

  const persist = useCallback((next: Project[]) => {
    setProjects(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const addProject    = useCallback((p: Project)  => persist([p, ...projects]),                          [persist, projects]);
  const saveProject   = useCallback((p: Project)  => persist(projects.map(x => x.id === p.id ? p : x)), [persist, projects]);
  const deleteProject = useCallback((id: string)  => persist(projects.filter(x => x.id !== id)),         [persist, projects]);

  if (!ready) return null;

  return (
    <ProjectsCtx.Provider value={{ projects, addProject, saveProject, deleteProject }}>
      {children}
    </ProjectsCtx.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsCtx);
  if (!ctx) throw new Error("useProjects must be inside ProjectsProvider");
  return ctx;
}
