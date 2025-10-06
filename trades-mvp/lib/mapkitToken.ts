// lib/mapkitToken.ts
import jwt from "jsonwebtoken";

/** Normalize PEM that may be stored with \n escapes in env vars */
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

/** Shared signer for ES256 with kid header (required by Apple) */
function sign(payload: Record<string, any>) {
  const { teamId, keyId, pem } = assertEnvs();

  const now = Math.floor(Date.now() / 1000);
  const base = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 5, // 5 minutes; works for JS and exchange step
    ...payload,
  };

  return jwt.sign(base, pem, {
    algorithm: "ES256",
    keyid: keyId,
    header: { typ: "JWT" },
  });
}

/** JS token (browser). Origin restriction is optional but recommended. */
export function makeJsToken(origin?: string) {
  return origin ? sign({ origin }) : sign({});
}

/** Developer token (server) used to exchange at /v1/token */
export function makeServerToken() {
  return sign({});
}

/** Optional: decode for diagnostics */
export function debugDecode(token: string) {
  return jwt.decode(token, { complete: true });
}

