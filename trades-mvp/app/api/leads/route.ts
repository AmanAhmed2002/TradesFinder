import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const useResend = !!process.env.RESEND_API_KEY;
// fallback could be SendGrid if set

export async function POST(req: Request) {
  const { provider_id, name, email, phone, message } = await req.json();

  const id = crypto.randomUUID();

  await db.execute({
    sql: `INSERT INTO leads (id, provider_id, name, email, phone, message)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, provider_id, name, email, phone ?? null, message ?? null],
  });

  // Send email to admin inbox for now
  const admin = process.env.ADMIN_EMAIL!;
  try {
    if (useResend) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "noreply@yourdomain.com",
        to: admin,
        subject: "New lead (Trades Finder MVP)",
        html: `<p><b>Provider ID:</b> ${provider_id}</p>
               <p><b>Name:</b> ${name}</p>
               <p><b>Email:</b> ${email}</p>
               <p><b>Phone:</b> ${phone ?? ""}</p>
               <p><b>Message:</b> ${message ?? ""}</p>`,
      });
    } else if (process.env.SENDGRID_API_KEY) {
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: admin,
        from: "noreply@yourdomain.com",
        subject: "New lead (Trades Finder MVP)",
        html: `<p><b>Provider ID:</b> ${provider_id}</p>
               <p><b>Name:</b> ${name}</p>
               <p><b>Email:</b> ${email}</p>
               <p><b>Phone:</b> ${phone ?? ""}</p>
               <p><b>Message:</b> ${message ?? ""}</p>`,
      });
    }
  } catch (e) {
    // Log and keep going; the lead is still recorded
    console.error("Email error", e);
  }

  return NextResponse.json({ ok: true, id });
}

