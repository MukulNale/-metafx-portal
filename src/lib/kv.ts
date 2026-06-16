// Server-side KV using Upstash Redis REST API directly.
// Falls back to in-memory for local dev when env vars are absent.
const mem: Record<string, unknown> = {};

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!KV_URL || !KV_TOKEN) return (mem[key] as T) ?? null;

  const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  const { result } = await r.json();
  if (result === null || result === undefined) return null;
  // Upstash returns the stored string; parse it back to the original object
  return typeof result === "string" ? (JSON.parse(result) as T) : (result as T);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (!KV_URL || !KV_TOKEN) { mem[key] = value; return; }

  // Stringify once — Upstash stores it as a plain string
  const body = JSON.stringify(value);
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "text/plain",
    },
    body,
    cache: "no-store",
  });
}
