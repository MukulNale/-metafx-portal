export type Status = "todo" | "in-progress" | "review" | "done";
export type Priority = "high" | "medium" | "low";

export interface SubTask {
  id: string;
  title: string;
  assignee: string; // user name
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
    progress: 20,
    lead: "Mukul",
    members: ["Mukul", "Suhas", "Rohan", "Anjali", "Anurag"],
    startDate: "2024-05-01",
    dueDate: "2024-12-31",
    tasks: [
      {
        id: "pre-prod",
        title: "Pre-Production",
        phase: "Phase 1",
        subtasks: [
          { id: "st-1",  title: "Script & Story Development",       assignee: "Mukul",  status: "done",        priority: "high",   due: "Jun 10" },
          { id: "st-2",  title: "Character Bible & World Building",  assignee: "Anjali", status: "in-progress", priority: "high",   due: "Jun 25" },
          { id: "st-3",  title: "AI Concept Art — Characters",       assignee: "Anjali", status: "in-progress", priority: "high",   due: "Jun 30" },
          { id: "st-4",  title: "AI Concept Art — Locations",        assignee: "Rohan",  status: "todo",        priority: "medium", due: "Jul 10" },
          { id: "st-5",  title: "Storyboard & Shot List",            assignee: "Suhas",  status: "todo",        priority: "high",   due: "Jul 15" },
          { id: "st-6",  title: "Music & Sound Direction",           assignee: "Anurag", status: "todo",        priority: "medium", due: "Jul 20" },
        ],
      },
      {
        id: "production",
        title: "Production",
        phase: "Phase 2",
        subtasks: [
          { id: "st-7",  title: "AI Scene Generation — Act 1",       assignee: "Rohan",  status: "todo", priority: "high",   due: "Aug 1"  },
          { id: "st-8",  title: "AI Scene Generation — Act 2",       assignee: "Rohan",  status: "todo", priority: "high",   due: "Aug 20" },
          { id: "st-9",  title: "AI Scene Generation — Act 3",       assignee: "Rohan",  status: "todo", priority: "high",   due: "Sep 5"  },
          { id: "st-10", title: "AI Voice & Dialogue",               assignee: "Anurag", status: "todo", priority: "high",   due: "Sep 10" },
          { id: "st-11", title: "Animation & Motion — Key Scenes",   assignee: "Suhas",  status: "todo", priority: "medium", due: "Sep 20" },
          { id: "st-12", title: "Visual Effects Pass",               assignee: "Suhas",  status: "todo", priority: "medium", due: "Oct 1"  },
        ],
      },
      {
        id: "post-prod",
        title: "Post-Production",
        phase: "Phase 3",
        subtasks: [
          { id: "st-13", title: "Rough Cut Assembly",                assignee: "Mukul",  status: "todo", priority: "high",   due: "Oct 15" },
          { id: "st-14", title: "Color Grading",                     assignee: "Anjali", status: "todo", priority: "medium", due: "Oct 25" },
          { id: "st-15", title: "Sound Design & Mixing",             assignee: "Anurag", status: "todo", priority: "high",   due: "Nov 5"  },
          { id: "st-16", title: "VFX Compositing — Final Pass",      assignee: "Suhas",  status: "todo", priority: "medium", due: "Nov 15" },
          { id: "st-17", title: "Final Edit & Master Export",        assignee: "Mukul",  status: "todo", priority: "high",   due: "Nov 30" },
        ],
      },
      {
        id: "distribution",
        title: "Distribution & Marketing",
        phase: "Phase 4",
        subtasks: [
          { id: "st-18", title: "Trailer Cut",                       assignee: "Mukul",  status: "todo", priority: "high",   due: "Dec 5"  },
          { id: "st-19", title: "Festival Submission Strategy",      assignee: "Anjali", status: "todo", priority: "medium", due: "Dec 10" },
          { id: "st-20", title: "Marketing & Social Assets",         assignee: "Anurag", status: "todo", priority: "medium", due: "Dec 15" },
          { id: "st-21", title: "Press Kit & Poster Design",         assignee: "Anjali", status: "todo", priority: "low",    due: "Dec 20" },
        ],
      },
    ],
  },
];
