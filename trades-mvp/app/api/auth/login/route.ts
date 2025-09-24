export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserByEmail, verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ ok:false, error:"Missing fields" }, { status:400 });

    const u: any = await getUserByEmail(email);
    if (!u) return NextResponse.json({ ok:false, error:"Invalid credentials" }, { status:401 });

    const ok = await verifyPassword(u.password_hash, password);
    if (!ok) return NextResponse.json({ ok:false, error:"Invalid credentials" }, { status:401 });

    await createSession(u.id);
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}

