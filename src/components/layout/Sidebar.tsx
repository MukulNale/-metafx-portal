"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Sidebar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const NAV = [
    { href: "/dashboard",          label: "Dashboard", icon: <GridIcon /> },
    { href: "/dashboard/projects", label: "Projects",  icon: <ProjectIcon /> },
    { href: "/dashboard/tasks",    label: "Tasks",     icon: <TaskIcon /> },
    { href: "/dashboard/tickets",   label: "Tickets",   icon: <TicketIcon /> },
    { href: "/dashboard/invoices", label: "Invoices",  icon: <InvoiceIcon /> },
    { href: "/dashboard/rewards",  label: "Rewards",   icon: <RewardIcon /> },
    { href: "/dashboard/games",    label: "Games",     icon: <GameIcon /> },
    ...(user?.role === "admin" ? [{ href: "/dashboard/admin", label: "Admin", icon: <ShieldIcon /> }] : []),
  ];

  function handleLogout() { logout(); router.push("/"); }

  return (
    <aside className="w-[200px] flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-800">
        <span className="font-bold text-[17px] text-white">Meta<span className="text-indigo-400">FX</span></span>
      </div>

      <nav className="flex-1 py-3">
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-medium transition-colors relative
                ${active ? "bg-indigo-500/20 text-indigo-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>
              {active && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-400 rounded-r" />}
              <span className="w-4 h-4 flex-shrink-0">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${user?.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
            {user?.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-slate-200 truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3M13 14l4-4-4-4M17 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

function GridIcon()    { return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function ProjectIcon() { return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5"/><path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function TaskIcon()    { return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><path d="M4 6h12M4 10h8M4 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function ShieldIcon()  { return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><path d="M10 2l6 2.5v5c0 3.5-2.5 6.5-6 7.5-3.5-1-6-4-6-7.5v-5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7.5 10l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function TicketIcon()  { return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><path d="M3 7a1 1 0 011-1h12a1 1 0 011 1v1.5a1.5 1.5 0 000 3V13a1 1 0 01-1 1H4a1 1 0 01-1-1v-1.5a1.5 1.5 0 000-3V7z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function InvoiceIcon() { return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><path d="M5 3h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function RewardIcon() { return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.82L10 13.25l-4.33 2.25.83-4.82L3 7.27l4.91-.71L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>; }
function GameIcon()    { return <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><rect x="2" y="6" width="16" height="10" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7 11h2M8 10v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="13" cy="10.5" r="0.75" fill="currentColor"/><circle cx="12" cy="12" r="0.75" fill="currentColor"/><path d="M6 4l1.5 2M14 4l-1.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
