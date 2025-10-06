// lib/mail.ts
import nodemailer from "nodemailer";

const {
  SMTP_HOST = "",
  SMTP_PORT = "587",
  SMTP_USER = "",
  SMTP_PASS = "",
  MAIL_FROM = "",
} = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn("[mail] Missing SMTP env vars; emails will fail until set.");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const from = MAIL_FROM || SMTP_USER; // safe default — use SMTP_USER if MAIL_FROM not set
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
  await transporter.sendMail({
    from,
    to,
    subject: "Verify your Trades Finder account",
    html,
    text: `Verify your account: ${verifyUrl}`,
  });
}

