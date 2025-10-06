// app/api/auth/reset/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { db, one } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ ok:false, error:"Missing fields" }, { status:400 });

  const row: any = await one(`SELECT * FROM email_tokens WHERE token=? AND type='reset'`, [token]);
  if (!row) return NextResponse.json({ ok:false, error:"Invalid token" }, { status:400 });
  if (new Date(row.expires_at).getTime() < Date.now())
    return NextResponse.json({ ok:false, error:"Expired token" }, { status:400 });

  const hash = await hashPassword(password);
  await db.execute({ sql:`UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?`, args:[hash,row.user_id] });
  await db.execute({ sql:`DELETE FROM email_tokens WHERE id=?`, args:[row.id] });
  return NextResponse.json({ ok:true });
}

