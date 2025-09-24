// lib/mapkitToken.ts
import jwt from "jsonwebtoken";

// Normalize PEM newlines
function normalizePem(pem?: string) {
  if (!pem) return pem;
  return pem.replace(/\\n/g, "\n");
}

function assertEnvs() {
  const teamId = process.env.MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  const pemRaw = process.env.MAPKIT_PRIVATE_KEY;
  const pem = normalizePem(pemRaw);

  if (!teamId) throw new Error("Missing MAPKIT_TEAM_ID");
  if (!keyId) throw new Error("Missing MAPKIT_KEY_ID");
  if (!pem) throw new Error("Missing MAPKIT_PRIVATE_KEY");
  if (!pem.includes("BEGIN PRIVATE KEY")) throw new Error("MAPKIT_PRIVATE_KEY is not a PEM");

  return { teamId, keyId, pem };
}

/** Shared signer for ES256 with kid header */
function sign(payload: Record<string, any>) {
  const { teamId, keyId, pem } = assertEnvs();

  const now = Math.floor(Date.now() / 1000);
  const base = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 5, // 5 min; safe for both JS and server tokens
    ...payload,
  };

  // IMPORTANT: ES256 and kid header
  return jwt.sign(base, pem, {
    algorithm: "ES256",
    keyid: keyId,
    header: { typ: "JWT" },
  });
}

/** Token for MapKit JS (browser). If origin not provided, omit the claim. */
export function makeJsToken(origin?: string) {
  if (origin) return sign({ origin });
  return sign({});
}

/** Token for Apple Maps Server API (no origin claim) */
export function makeServerToken() {
  return sign({});
}

/** Optional: decode locally to verify header/payload during debugging (not sent to Apple) */
export function debugDecode(token: string) {
  return jwt.decode(token, { complete: true });
}

