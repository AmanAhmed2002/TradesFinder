// app/api/mapkit-token/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Env you must set in Vercel:
 * - APPLE_TEAM_ID
 * - APPLE_MAPKIT_KEY_ID
 * - MAPKIT_PRIVATE_KEY_PATH (path inside the repo or a mounted secret file)
 * - MAPKIT_ALLOWED_ORIGINS (comma-separated list: http://localhost:3000,https://your-app.vercel.app,https://www.yourdomain.com)
 */

const TEAM_ID = process.env.APPLE_TEAM_ID!;
const KEY_ID = process.env.APPLE_MAPKIT_KEY_ID!;
const PRIVATE_KEY_PATH = process.env.MAPKIT_PRIVATE_KEY_PATH || "keys/AuthKey_MapKit.p8";

const ORIGINS = (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PRIVATE_KEY = readFileSync(resolve(process.cwd(), PRIVATE_KEY_PATH), "utf8");

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  return ORIGINS.includes(origin);
}

export async function GET(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ ok: false, error: "Origin not allowed" }, { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 20; // 20 minutes

    // Sign a MapKit JS token. Include all allowed origins so a single token works for dev + prod.
    // Apple docs cover token creation and origin matching. :contentReference[oaicite:3]{index=3}
    const token = jwt.sign(
      {
        iss: TEAM_ID,
        iat: now,
        exp,
        origin: ORIGINS.join(","), // multiple origins supported
      },
      PRIVATE_KEY,
      {
        algorithm: "ES256",
        keyid: KEY_ID, // a.k.a. 'kid'
      }
    );

    return new NextResponse(token, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

