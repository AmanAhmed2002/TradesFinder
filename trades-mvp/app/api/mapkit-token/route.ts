// app/api/mapkit-token/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // avoid static optimization for this route
export const revalidate = 0;

import { NextResponse } from "next/server";
import { sign } from "jsonwebtoken";

/** Allowed origins (comma-separated, include protocol, no trailing slash) */
function allowedOrigins(): string[] {
  return (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function isAllowed(origin: string | null) {
  const list = allowedOrigins();
  return !!origin && list.includes(origin);
}

/** Load Apple MapKit credentials/key at request time (never at module load). */
function getAppleCreds() {
  const TEAM_ID = process.env.MAPKIT_TEAM_ID || process.env.APPLE_TEAM_ID;
  const KEY_ID  = process.env.MAPKIT_KEY_ID  || process.env.APPLE_MAPKIT_KEY_ID;

  // Prefer secret in env: MAPKIT_PRIVATE_KEY (raw with \n or base64)
  const envKey = process.env.MAPKIT_PRIVATE_KEY || process.env.MAPKIT_PRIVATE_KEY_BASE64 || "";
  let PRIVATE_KEY = envKey;

  // If it's base64, decode; if it has literal "\n", fix line breaks.
  if (PRIVATE_KEY && !PRIVATE_KEY.includes("BEGIN PRIVATE KEY")) {
    try { PRIVATE_KEY = Buffer.from(PRIVATE_KEY, "base64").toString("utf8"); } catch {}
  }
  if (PRIVATE_KEY.includes("\\n")) PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n");

  if (!TEAM_ID || !KEY_ID || !PRIVATE_KEY) {
    throw new Error("Missing MAPKIT_TEAM_ID/KEY_ID or MAPKIT_PRIVATE_KEY env.");
  }
  return { TEAM_ID, KEY_ID, PRIVATE_KEY };
}

export async function GET(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!isAllowed(origin)) {
      return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
    }

    const { TEAM_ID, KEY_ID, PRIVATE_KEY } = getAppleCreds();

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 20; // 20 minutes

    const token = sign(
      { iss: TEAM_ID, iat: now, exp, origin: allowedOrigins().join(",") },
      PRIVATE_KEY,
      { algorithm: "ES256", keyid: KEY_ID }
    );

    return new NextResponse(token, {
      status: 200,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

