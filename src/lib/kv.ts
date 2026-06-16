// Server-side KV abstraction — uses @vercel/kv when env vars are present,
// falls back to module-level in-memory store for local dev.
const mem: Record<string, unknown> = {};

const isConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!isConfigured) return (mem[key] as T) ?? null;
  const { kv } = await import("@vercel/kv");
  return kv.get<T>(key);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (!isConfigured) { mem[key] = value; return; }
  const { kv } = await import("@vercel/kv");
  await kv.set(key, value);
}
