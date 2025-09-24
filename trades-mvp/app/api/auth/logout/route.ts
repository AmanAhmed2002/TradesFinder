//app/api/auth/logout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST() {
  const store = await cookies();                // ✅ Next 15: await cookies()
  const sid = store.get("sid")?.value;
  if (sid) {
    await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [sid] });
    store.delete("sid");                        // ✅ delete via awaited store
  }
  return NextResponse.json({ ok: true });
}

