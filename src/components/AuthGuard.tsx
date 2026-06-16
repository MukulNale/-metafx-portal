"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.replace("/"); return; }
    if (adminOnly && user.role !== "admin") { router.replace("/dashboard"); }
  }, [user, ready, adminOnly, router]);

  // Show nothing until auth is resolved
  if (!ready) return null;
  if (!user) return null;
  if (adminOnly && user.role !== "admin") return null;

  return <>{children}</>;
}
