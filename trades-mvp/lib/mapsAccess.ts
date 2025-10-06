// lib/mapsAccess.ts
import { sign } from "jsonwebtoken";

function allowedOrigins(): string[] {
  return (process.env.MAPKIT_ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

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

export function makeServerToken(): string {
  const { TEAM_ID, KEY_ID, PRIVATE_KEY } = getAppleCreds();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 20;

  return sign(
    { iss: TEAM_ID, iat, exp, origin: allowedOrigins().join(",") },
    PRIVATE_KEY,
    { algorithm: "ES256", keyid: KEY_ID }
  );
}

// Keep existing name used by /app/api/places/route.ts
export function getAccessToken(): string { return makeServerToken(); }

// Default export if any caller used it
export default makeServerToken;

