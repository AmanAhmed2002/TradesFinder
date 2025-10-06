// lib/mapkitToken.ts
import { sign } from "jsonwebtoken";

/** Resolve allowed origins once per call */
function allowedOrigins(): string[] {
  return (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

/** Load credentials/key from env at call time. */
function getAppleCreds() {
  const TEAM_ID = process.env.MAPKIT_TEAM_ID || process.env.APPLE_TEAM_ID;
  const KEY_ID  = process.env.MAPKIT_KEY_ID  || process.env.APPLE_MAPKIT_KEY_ID;

  let PRIVATE_KEY = process.env.MAPKIT_PRIVATE_KEY || process.env.MAPKIT_PRIVATE_KEY_BASE64 || "";

  if (PRIVATE_KEY && !PRIVATE_KEY.includes("BEGIN PRIVATE KEY")) {
    try { PRIVATE_KEY = Buffer.from(PRIVATE_KEY, "base64").toString("utf8"); } catch {}
  }
  if (PRIVATE_KEY.includes("\\n")) PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n");

  if (!TEAM_ID || !KEY_ID || !PRIVATE_KEY) {
    throw new Error("Missing MAPKIT_TEAM_ID/KEY_ID or MAPKIT_PRIVATE_KEY env.");
  }
  return { TEAM_ID, KEY_ID, PRIVATE_KEY };
}

export function mintMapkitToken(): string {
  const { TEAM_ID, KEY_ID, PRIVATE_KEY } = getAppleCreds();

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 20;

  return sign(
    { iss: TEAM_ID, iat: now, exp, origin: allowedOrigins().join(",") },
    PRIVATE_KEY,
    { algorithm: "ES256", keyid: KEY_ID }
  );
}

// Backward-compat named alias for callers expecting this name
export function makeServerToken(): string { return mintMapkitToken(); }

export default mintMapkitToken;

