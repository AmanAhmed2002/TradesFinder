export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const u = await requireUser();
  if (!u) return NextResponse.json({ ok:false, user:null }, { status:200 });
  return NextResponse.json({ ok:true, user: { id: u.id, email: u.email } });
}

