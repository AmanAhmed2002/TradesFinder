// lib/mapkitToken.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sign } from "jsonwebtoken";

// Apple credentials (unchanged)
const TEAM_ID = process.env.MAPKIT_TEAM_ID || process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.MAPKIT_KEY_ID || process.env.APPLE_MAPKIT_KEY_ID;
const PRIVATE_KEY_PATH = process.env.MAPKIT_PRIVATE_KEY_PATH || "keys/AuthKey_MapKit.p8";

// Allowed origins (keep your existing comma-separated list, incl. localhost + Vercel)
const ORIGINS = (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Load the private key once
const PRIVATE_KEY = readFileSync(resolve(process.cwd(), PRIVATE_KEY_PATH), "utf8");

/**
 * Mint a short-lived MapKit JS token.
 * Required claims: iss, iat, exp; recommended: origin (comma-separated for multiple sites).
 * Must be signed with ES256 and include the key id (kid).  :contentReference[oaicite:2]{index=2}
 */
export function mintMapkitToken(): string {
  if (!TEAM_ID || !KEY_ID) {
    throw new Error("Missing MAPKIT_TEAM_ID/KEY_ID environment variables.");
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 20; // 20 minutes, common practice for MapKit tokens

  // Payload must be an object
  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp,
    origin: ORIGINS.join(","), // multiple origins are supported as a single CSV string. :contentReference[oaicite:3]{index=3}
  };

  // IMPORTANT: Do NOT pass a custom `header` object here.
  // jsonwebtoken sets `alg` from `algorithm` and `kid` from `keyid` automatically. :contentReference[oaicite:4]{index=4}
  const token = sign(payload, PRIVATE_KEY, {
    algorithm: "ES256",
    keyid: KEY_ID,
  });

  return token;
}

// Optional default export to avoid breaking existing imports
export default mintMapkitToken;

