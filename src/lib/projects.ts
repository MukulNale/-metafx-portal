export type Status = "todo" | "in-progress" | "review" | "done";
export type Priority = "high" | "medium" | "low";

export interface SubTask {
  id: string;
  title: string;
  assignee: string;
  status: Status;
  priority: Priority;
  due?: string;
}

export interface Task {
  id: string;
  title: string;
  phase: string;
  subtasks: SubTask[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "planning" | "completed" | "on-hold";
  progress: number;
  lead: string;
  members: string[];
  startDate: string;
  dueDate: string;
  tasks: Task[];
}

export const PROJECTS: Project[] = [
  {
    id: "bagulbua",
    name: "Bagulbua",
    description: "An AI-powered feature film — blending cinematic storytelling with cutting-edge generative AI visuals, voice, and sound design.",
    status: "active",
    progress: 0,
    lead: "Mukul",
    members: ["Mukul", "Suhas", "Rohan", "Anjali", "Anurag"],
    startDate: "2024-06-01",
    dueDate: "2024-12-31",
    tasks: [
      {
        id: "pre-production",
        title: "Pre-Production",
        phase: "Phase 1",
        subtasks: [
          { id: "pp-1", title: "Location Generations",   assignee: "Rohan",  status: "todo", priority: "high",   due: "Jul 10" },
          { id: "pp-2", title: "Character Sheets",       assignee: "Anjali", status: "todo", priority: "high",   due: "Jul 15" },
          { id: "pp-3", title: "Script Breakdown",       assignee: "Mukul",  status: "todo", priority: "high",   due: "Jul 5"  },
          { id: "pp-4", title: "Mood Board",             assignee: "Anjali", status: "todo", priority: "medium", due: "Jul 8"  },
          { id: "pp-5", title: "Storyboard",             assignee: "Suhas",  status: "todo", priority: "high",   due: "Jul 20" },
          { id: "pp-6", title: "Voice & Dialogue Direction", assignee: "Anurag", status: "todo", priority: "medium", due: "Jul 25" },
        ],
      },
      {
        id: "production",
        title: "Production",
        phase: "Phase 2",
        subtasks: [
          { id: "pr-1", title: "AI Scene Generation — Act 1", assignee: "Rohan",  status: "todo", priority: "high",   due: "Aug 10" },
          { id: "pr-2", title: "AI Scene Generation — Act 2", assignee: "Rohan",  status: "todo", priority: "high",   due: "Sep 1"  },
          { id: "pr-3", title: "AI Scene Generation — Act 3", assignee: "Rohan",  status: "todo", priority: "high",   due: "Sep 20" },
          { id: "pr-4", title: "AI Voice Recording",          assignee: "Anurag", status: "todo", priority: "high",   due: "Sep 15" },
          { id: "pr-5", title: "Animation & Motion",          assignee: "Suhas",  status: "todo", priority: "medium", due: "Oct 1"  },
          { id: "pr-6", title: "Visual Effects",              assignee: "Suhas",  status: "todo", priority: "medium", due: "Oct 15" },
        ],
      },
    ],
  },
];
