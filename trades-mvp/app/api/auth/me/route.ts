// app/api/auth/me/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";

export async function GET() {
  try {
    const u = await getUserFromSession();
    const res = NextResponse.json({ ok: true, user: u ? { id: u.id, email: u.email } : null }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    const res = NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}

