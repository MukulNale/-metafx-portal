"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { type User, authenticate } from "./users";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, ready: false, login: () => false, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mfx_user");
    if (stored) setUser(JSON.parse(stored));
    setReady(true);
  }, []);

  function login(username: string, password: string) {
    const u = authenticate(username, password);
    if (u) { setUser(u); localStorage.setItem("mfx_user", JSON.stringify(u)); return true; }
    return false;
  }

  function logout() { setUser(null); localStorage.removeItem("mfx_user"); }

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() { return useContext(Ctx); }
