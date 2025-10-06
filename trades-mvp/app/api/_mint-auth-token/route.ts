// app/api/_mint-auth-token/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sign } from "jsonwebtoken"; // ✅ avoids default-import typing issues

const TEAM_ID = process.env.MAPKIT_TEAM_ID!;          // your Apple Team ID
const KEY_ID = process.env.MAPKIT_KEY_ID!;            // your MapKit key ID
const PRIVATE_KEY_PATH = process.env.MAPKIT_PRIVATE_KEY_PATH || "keys/AuthKey_MapKit.p8";
const ALLOWED = (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const PRIVATE_KEY = readFileSync(resolve(process.cwd(), PRIVATE_KEY_PATH), "utf8");

function isAllowed(origin: string | null) {
  return !!origin && ALLOWED.includes(origin);
}

export async function GET(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!isAllowed(origin)) {
      return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 20; // 20 minutes

    // Apple MapKit JS token; include all allowed origins in the claim
    const token = sign(
      { iss: TEAM_ID, iat: now, exp, origin: ALLOWED.join(",") },
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

