// lib/mapkitToken.ts
import jwt, { JwtHeader, SignOptions } from "jsonwebtoken";

/** Normalize PEM that may be stored with \n escapes in env vars */
function normalizePemStrict(pemRaw: string): string {
  // Always return a string (prevents TS picking the null/none overload)
  return pemRaw.includes("\\n") ? pemRaw.replace(/\\n/g, "\n") : pemRaw;
}

function assertEnvs() {
  const teamId = process.env.MAPKIT_TEAM_ID;
  const keyId = process.env.MAPKIT_KEY_ID;
  const pemRaw = process.env.MAPKIT_PRIVATE_KEY;

  if (!teamId) throw new Error("Missing MAPKIT_TEAM_ID");
  if (!keyId) throw new Error("Missing MAPKIT_KEY_ID");
  if (!pemRaw) throw new Error("Missing MAPKIT_PRIVATE_KEY");

  const pem = normalizePemStrict(pemRaw);
  if (!pem.includes("BEGIN PRIVATE KEY")) {
    throw new Error("MAPKIT_PRIVATE_KEY is not a valid PKCS#8 PEM (missing BEGIN PRIVATE KEY)");
  }

  return { teamId, keyId, pem };
}

/** Shared ES256 signer with kid + explicit header to satisfy TS defs */
function sign(payload: Record<string, any>): string {
  const { teamId, keyId, pem } = assertEnvs();

  const now = Math.floor(Date.now() / 1000);
  const base = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 5, // 5 minutes (safe for JS tokens and /v1/token exchange)
    ...payload,
  };

  // Strict types: if we include header, TS requires 'alg' in it.
  const header: JwtHeader = { alg: "ES256", typ: "JWT", kid: keyId };
  const options: SignOptions & { header: JwtHeader } = {
    algorithm: "ES256",
    keyid: keyId,
    header,
  };

  return jwt.sign(base, pem, options);
}

/** JS token (browser). Origin restriction optional but recommended. */
export function makeJsToken(origin?: string) {
  return origin ? sign({ origin }) : sign({});
}

/** Developer token (server) used to exchange at /v1/token for a Maps access token */
export function makeServerToken() {
  return sign({});
}

/** Optional: decode for diagnostics (does not verify signature) */
export function debugDecode(token: string) {
  return jwt.decode(token, { complete: true });
}

