// lib/mail.ts
import nodemailer from "nodemailer";

const {
  SMTP_HOST = "",
  SMTP_PORT = "587",
  SMTP_USER = "",
  SMTP_PASS = "",
  MAIL_FROM = "",
} = process.env;

// Don't throw during local dev if env vars are not set;
// the actual send will fail (and we surface that error then).
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn("[mail] Missing SMTP env vars; emails will fail until set.");
}

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // 465 = TLS
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ✅ Export a `mailer` alias so routes that do `import { mailer } from "@/lib/mail"` work.
// This preserves your existing behavior and unblocks the build.
export const mailer = transporter;

// Helper used by registration flow – unchanged
export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const from = MAIL_FROM || SMTP_USER; // safe default
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
      <h2>Verify your Trades Finder account</h2>
      <p>Thanks for signing up! Click the button below to verify your email.</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;background:#6d28d9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">
          Verify Email
        </a>
      </p>
      <p>If that doesn’t work, copy and paste this URL:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link will expire in 24 hours.</p>
    </div>
  `;

  // Standard Nodemailer pattern: create transporter -> transporter.sendMail()
  // (documented in Nodemailer quick-start/usage). :contentReference[oaicite:0]{index=0}
  await transporter.sendMail({
    from,
    to,
    subject: "Verify your Trades Finder account",
    html,
    text: `Verify your account: ${verifyUrl}`,
  });
}

