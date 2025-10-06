// lib/mapkitToken.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sign } from "jsonwebtoken";

// Support either set of env names you’ve used
const TEAM_ID = process.env.MAPKIT_TEAM_ID || process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.MAPKIT_KEY_ID || process.env.APPLE_MAPKIT_KEY_ID;
const PRIVATE_KEY_PATH = process.env.MAPKIT_PRIVATE_KEY_PATH || "keys/AuthKey_MapKit.p8";

// Allow multiple origins (comma-separated). Keep localhost + Vercel domains here.
const ORIGINS = (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Load the PEM once
const PRIVATE_KEY = readFileSync(resolve(process.cwd(), PRIVATE_KEY_PATH), "utf8");

/**
 * Mint a short-lived MapKit JS token.
 * Required: iss, iat, exp.  Recommended: origin (CSV for multiple sites).
 * Must be signed with ES256; `kid` comes from the `keyid` sign option.
 * jsonwebtoken sets header.alg and header.kid from options; no custom header needed.
 */
export function mintMapkitToken(): string {
  if (!TEAM_ID || !KEY_ID) throw new Error("Missing MAPKIT_TEAM_ID/KEY_ID envs.");

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 20; // 20 minutes

  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp,
    origin: ORIGINS.join(","), // multiple origins via CSV
  };

  return sign(payload, PRIVATE_KEY, {
    algorithm: "ES256",
    keyid: KEY_ID,
  });
}

// ✅ Alias to preserve existing imports in /app/api/providers/route.ts
export function makeServerToken(): string {
  return mintMapkitToken();
}

// Keep your default export too, so both import styles work
export default mintMapkitToken;

