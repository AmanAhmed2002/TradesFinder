// lib/db.ts
import { createClient } from "@libsql/client";
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function one<T=any>(sql: string, params: any[] = []): Promise<T|null> {
  const r = await db.execute({ sql, args: params });
  return (r.rows[0] as any) ?? null;
}
export async function all<T=any>(sql: string, params: any[] = []): Promise<T[]> {
  const r = await db.execute({ sql, args: params });
  return r.rows as any;
}

