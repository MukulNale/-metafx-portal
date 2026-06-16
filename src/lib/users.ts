export type Role = "admin" | "member";

export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: Role;
  initials: string;
  color: string;
}

export const USERS: User[] = [
  { id: 1, username: "mukul",  password: "Mukul@2024",  name: "Mukul",  role: "admin",  initials: "MK", color: "from-indigo-500 to-indigo-700" },
  { id: 2, username: "suhas",  password: "Suhas@2024",  name: "Suhas",  role: "member", initials: "SH", color: "from-amber-500 to-amber-600"   },
  { id: 3, username: "rohan",  password: "Rohan@2024",  name: "Rohan",  role: "member", initials: "RH", color: "from-blue-500 to-blue-700"     },
  { id: 4, username: "anjali", password: "Anjali@2024", name: "Anjali", role: "member", initials: "AJ", color: "from-pink-500 to-pink-700"     },
  { id: 5, username: "anurag", password: "Anurag@2024", name: "Anurag", role: "member", initials: "AN", color: "from-green-500 to-green-700"   },
];

export function authenticate(username: string, password: string): User | null {
  return USERS.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password) ?? null;
}
