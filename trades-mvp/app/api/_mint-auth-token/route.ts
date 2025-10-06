// app/api/_mint-auth-token/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sign } from "jsonwebtoken"; // named import plays nice with @types/jsonwebtoken

const TEAM_ID = process.env.MAPKIT_TEAM_ID!;           // Apple Team ID
const KEY_ID = process.env.MAPKIT_KEY_ID!;             // MapKit Key ID
const PRIVATE_KEY_PATH = process.env.MAPKIT_PRIVATE_KEY_PATH || "keys/AuthKey_MapKit.p8";

const ALLOWED_ORIGINS = (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const PRIVATE_KEY = readFileSync(resolve(process.cwd(), PRIVATE_KEY_PATH), "utf8");

function isAllowed(origin: string | null) {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

export async function GET(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!isAllowed(origin)) {
      return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 20; // 20 minutes

    // MapKit JS token: ES256, includes origin restriction for security
    const token = sign(
      { iss: TEAM_ID, iat: now, exp, origin: ALLOWED_ORIGINS.join(",") },
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

