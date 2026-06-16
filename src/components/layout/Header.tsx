"use client";
import { useAuth } from "@/lib/auth";

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4 flex-shrink-0">
      <span className="font-semibold text-white">{title}</span>
      <div className="ml-auto flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${user?.color} flex items-center justify-center text-white text-[10px] font-bold`}>
          {user?.initials}
        </div>
        <span className="text-sm font-medium text-slate-300">{user?.name}</span>
        {user?.role === "admin" && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">Admin</span>
        )}
      </div>
    </header>
  );
}
