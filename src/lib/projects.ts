export type Status = "todo" | "in-progress" | "review" | "done";
export type Priority = "high" | "medium" | "low";

export interface SubTask {
  id: string;
  title: string;
  assignees: string[];   // was assignee: string
  status: Status;
  priority: Priority;
  due?: string;
}

export interface Task {
  id: string;
  title: string;
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
        subtasks: [
          { id: "pp-1", title: "Location Generations",       assignees: ["Rohan"],          status: "todo", priority: "high",   due: "Jul 10" },
          { id: "pp-2", title: "Character Sheets",           assignees: ["Anjali"],         status: "todo", priority: "high",   due: "Jul 15" },
          { id: "pp-3", title: "Script Breakdown",           assignees: ["Mukul"],          status: "todo", priority: "high",   due: "Jul 5"  },
          { id: "pp-4", title: "Mood Board",                 assignees: ["Anjali", "Suhas"],status: "todo", priority: "medium", due: "Jul 8"  },
          { id: "pp-5", title: "Storyboard",                 assignees: ["Suhas"],          status: "todo", priority: "high",   due: "Jul 20" },
          { id: "pp-6", title: "Voice & Dialogue Direction", assignees: ["Anurag"],         status: "todo", priority: "medium", due: "Jul 25" },
        ],
      },
      {
        id: "production",
        title: "Production",
        subtasks: [
          { id: "pr-1", title: "AI Scene Generation — Act 1", assignees: ["Rohan"],           status: "todo", priority: "high",   due: "Aug 10" },
          { id: "pr-2", title: "AI Scene Generation — Act 2", assignees: ["Rohan"],           status: "todo", priority: "high",   due: "Sep 1"  },
          { id: "pr-3", title: "AI Scene Generation — Act 3", assignees: ["Rohan", "Mukul"],  status: "todo", priority: "high",   due: "Sep 20" },
          { id: "pr-4", title: "AI Voice Recording",          assignees: ["Anurag"],          status: "todo", priority: "high",   due: "Sep 15" },
          { id: "pr-5", title: "Animation & Motion",          assignees: ["Suhas"],           status: "todo", priority: "medium", due: "Oct 1"  },
          { id: "pr-6", title: "Visual Effects",              assignees: ["Suhas", "Rohan"],  status: "todo", priority: "medium", due: "Oct 15" },
        ],
      },
    ],
  },
];
