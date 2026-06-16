import Sidebar from "@/components/layout/Sidebar";
import { ProjectsProvider } from "@/lib/projectsContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectsProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">{children}</div>
      </div>
    </ProjectsProvider>
  );
}
