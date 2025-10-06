// app/api/auth/login/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getUserByEmail, verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      const res = NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const u: any = await getUserByEmail(email);
    if (!u) {
      const res = NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // Require verification if your schema has email_verified_at
    if (Object.prototype.hasOwnProperty.call(u, "email_verified_at") && !u.email_verified_at) {
      const res = NextResponse.json(
        { ok: false, error: "Please verify your email before logging in." },
        { status: 403 }
      );
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const ok = await verifyPassword(u.password_hash, password);
    if (!ok) {
      const res = NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    await createSession(u.id);
    const res = NextResponse.json({ ok: true, user: { id: u.id, email: u.email } }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    // This will show in Vercel Function Logs for the deployment
    console.error("login error:", e);
    const res = NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}

