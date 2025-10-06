// lib/mapsAccess.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sign } from "jsonwebtoken";

// Support either env naming you may have used elsewhere
const TEAM_ID = process.env.MAPKIT_TEAM_ID || process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.MAPKIT_KEY_ID || process.env.APPLE_MAPKIT_KEY_ID;
const PRIVATE_KEY_PATH = process.env.MAPKIT_PRIVATE_KEY_PATH || "keys/AuthKey_MapKit.p8";

// Comma-separated list of allowed origins (keep localhost + Vercel + any custom domains)
const ORIGINS = (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Load the PEM once
const PRIVATE_KEY = readFileSync(resolve(process.cwd(), PRIVATE_KEY_PATH), "utf8");

/**
 * Mint a short-lived MapKit JS token (ES256).
 * Required claims: iss, iat, exp. Recommended: origin (CSV for multiple sites).
 * jsonwebtoken sets header.alg and header.kid from the options, so no custom header is needed.
 */
export function makeServerToken(): string {
  if (!TEAM_ID || !KEY_ID) throw new Error("Missing MAPKIT_TEAM_ID/KEY_ID envs.");

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 20; // 20 minutes

  const payload = {
    iss: TEAM_ID,
    iat,
    exp,
    origin: ORIGINS.join(","), // multiple origins via CSV
  };

  // DO NOT pass a custom `header` — it triggers TS overload issues and is unnecessary.
  return sign(payload, PRIVATE_KEY, {
    algorithm: "ES256",
    keyid: KEY_ID,
  });
}

// Keep a default export if other files import it that way
export default makeServerToken;

