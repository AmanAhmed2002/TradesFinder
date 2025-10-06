// app/api/auth/forgot/route.ts
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db, one } from "@/lib/db";
import { mailer } from "@/lib/mail";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ ok:false, error:"Missing email" }, { status:400 });
  const u: any = await one(`SELECT * FROM users WHERE email=?`, [email.toLowerCase()]);
  if (!u) return NextResponse.json({ ok:true }); // don't disclose existence

  const token = crypto.randomBytes(24).toString("hex");
  const expires = new Date(Date.now()+3600e3).toISOString();
  await db.execute({
    sql:`INSERT INTO email_tokens (id,user_id,type,token,expires_at) VALUES (?,?,?,?,?)`,
    args:[crypto.randomUUID(), u.id, "reset", token, expires],
  });
  const link = `${process.env.APP_BASE_URL}/reset?token=${token}`;
  try {
    await mailer.sendMail({
      from: process.env.SMTP_USER!,
      to: u.email,
      subject: "Reset password",
      text: link,
    });
  } catch (err) {
    console.error("[SMTP reset] send failed:", err);
  }
  return NextResponse.json({ ok:true });
}

