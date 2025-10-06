// app/api/auth/register/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getUserByEmail, createUser, createVerificationToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";

function baseUrlFrom(req: Request) {
  const h = new Headers(req.headers);
  const origin = h.get("origin") || process.env.APP_URL || "";
  return origin.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      const r = NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
      r.headers.set("Cache-Control", "no-store");
      return r;
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      const r = NextResponse.json({ ok: false, error: "Email already registered" }, { status: 409 });
      r.headers.set("Cache-Control", "no-store");
      return r;
    }

    const u = await createUser(email, password);

    const { token } = await createVerificationToken(u.id, u.email);
    const verifyUrl = `${baseUrlFrom(req)}/api/auth/verify?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail(u.email, verifyUrl); // Nodemailer sendMail flow. :contentReference[oaicite:0]{index=0}

    // Do NOT create session yet — must verify first.
    const r = NextResponse.json(
      { ok: true, requireVerification: true, message: "Please verify your email to complete registration." },
      { status: 200 }
    );
    r.headers.set("Cache-Control", "no-store");
    return r;
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    r.headers.set("Cache-Control", "no-store");
    return r;
  }
}

