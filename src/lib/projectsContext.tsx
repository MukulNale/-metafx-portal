"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { type Project } from "./projects";

interface Ctx {
  projects: Project[];
  ready: boolean;
  addProject: (p: Project) => Promise<void>;
  saveProject: (p: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectsCtx = createContext<Ctx | null>(null);

async function apiFetch(): Promise<Project[]> {
  const r = await fetch("/api/data/projects", { cache: "no-store" });
  const { projects } = await r.json();
  return projects ?? [];
}

async function apiSave(projects: Project[]) {
  await fetch("/api/data/projects", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projects }),
  });
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch();
      setProjects(data);
    } catch {
      // stay with current state if fetch fails
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
    // Refresh every 20 seconds so teammates' changes show up
    const interval = setInterval(load, 20_000);
    // Also refresh when the tab comes back into focus
    window.addEventListener("focus", load);
    return () => { clearInterval(interval); window.removeEventListener("focus", load); };
  }, [load]);

  const persist = useCallback(async (next: Project[]) => {
    setProjects(next);           // optimistic update
    await apiSave(next);
  }, []);

  const addProject    = useCallback(async (p: Project)  => persist([p, ...projects]),                          [persist, projects]);
  const saveProject   = useCallback(async (p: Project)  => persist(projects.map(x => x.id === p.id ? p : x)), [persist, projects]);
  const deleteProject = useCallback(async (id: string)  => persist(projects.filter(x => x.id !== id)),         [persist, projects]);

  return (
    <ProjectsCtx.Provider value={{ projects, ready, addProject, saveProject, deleteProject }}>
      {children}
    </ProjectsCtx.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsCtx);
  if (!ctx) throw new Error("useProjects must be inside ProjectsProvider");
  return ctx;
}
