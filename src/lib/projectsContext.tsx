"use client";
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { PROJECTS as SEED, type Project } from "./projects";

interface Ctx {
  projects: Project[];
  addProject: (p: Project) => void;
  saveProject: (p: Project) => void;
  deleteProject: (id: string) => void;
}

const ProjectsCtx = createContext<Ctx | null>(null);
const KEY = "mfx_projects_v2";

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { setProjects(JSON.parse(raw)); setReady(true); return; }
      catch { /* fall through to seed */ }
    }
    // First load — seed with the default Bagulbua project
    localStorage.setItem(KEY, JSON.stringify(SEED));
    setProjects(SEED);
    setReady(true);
  }, []);

  const persist = useCallback((next: Project[]) => {
    setProjects(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const addProject  = useCallback((p: Project) => persist([p, ...projects]), [persist, projects]);
  const saveProject = useCallback((p: Project) => persist(projects.map(x => x.id === p.id ? p : x)), [persist, projects]);
  const deleteProject = useCallback((id: string) => persist(projects.filter(x => x.id !== id)), [persist, projects]);

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
