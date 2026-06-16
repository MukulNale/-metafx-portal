// Server-side KV abstraction — uses Vercel KV (Upstash Redis) when configured,
// falls back to a module-level in-memory store for local dev without credentials.
const mem: Record<string, string> = {};

const URL   = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function req(path: string, init?: RequestInit) {
  return fetch(`${URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!URL || !TOKEN) {
    const v = mem[key];
    return v ? (JSON.parse(v) as T) : null;
  }
  const r = await req(`/get/${encodeURIComponent(key)}`);
  const { result } = await r.json();
  if (!result) return null;
  return typeof result === "string" ? (JSON.parse(result) as T) : (result as T);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const str = JSON.stringify(value);
  if (!URL || !TOKEN) { mem[key] = str; return; }
  await req(`/set/${encodeURIComponent(key)}`, { method: "POST", body: JSON.stringify(str) });
}
