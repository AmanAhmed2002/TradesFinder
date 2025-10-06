// app/api/auth/logout/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { deleteCurrentSession } from "@/lib/auth";

export async function POST() {
  try {
    await deleteCurrentSession();
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    const res = NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}

