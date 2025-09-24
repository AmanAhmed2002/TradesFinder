export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db, one } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ ok:false, error:"Missing token" }, { status:400 });
  const row: any = await one(`SELECT * FROM email_tokens WHERE token = ? AND type='verify'`, [token]);
  if (!row) return NextResponse.json({ ok:false, error:"Invalid token" }, { status:400 });
  if (new Date(row.expires_at).getTime() < Date.now())
    return NextResponse.json({ ok:false, error:"Expired token" }, { status:400 });

  await db.execute({ sql:`UPDATE users SET email_verified_at=datetime('now') WHERE id=?`, args:[row.user_id]});
  await db.execute({ sql:`DELETE FROM email_tokens WHERE id=?`, args:[row.id]});
  return NextResponse.json({ ok:true });
}

