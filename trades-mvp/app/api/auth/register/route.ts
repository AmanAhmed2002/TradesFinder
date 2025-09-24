export const runtime = "nodejs";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createUser, getUserByEmail, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { mailer } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ ok:false, error:"Missing fields" }, { status:400 });

    const exists = await getUserByEmail(email);
    if (exists) return NextResponse.json({ ok:false, error:"Email already registered" }, { status:409 });

    const u = await createUser(email, password);

    // Optional email verify (send but don't block login)
    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now()+864e5).toISOString();
    await db.execute({
      sql:`INSERT INTO email_tokens (id,user_id,type,token,expires_at) VALUES (?,?,?,?,?)`,
      args:[crypto.randomUUID(), u.id, "verify", token, expires],
    });
    const link = `${process.env.APP_BASE_URL}/api/auth/verify?token=${token}`;
    try {
      await mailer.sendMail({
        from: process.env.SMTP_USER!,
        to: u.email,
        subject: "Verify your Trades Finder account",
        text: `Click to verify: ${link}`,
      });
    } catch (err) {
      console.error("[SMTP verify] send failed:", err);
    }

    await createSession(u.id);
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}

