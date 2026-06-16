"use client";
import { useAuth } from "@/lib/auth";

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
      <span className="font-semibold text-slate-800">{title}</span>
      <div className="ml-auto flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${user?.color} flex items-center justify-center text-white text-[10px] font-bold`}>
          {user?.initials}
        </div>
        <span className="text-sm font-medium text-slate-700">{user?.name}</span>
        {user?.role === "admin" && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500">Admin</span>
        )}
      </div>
    </header>
  );
}
