// lib/mapkitToken.ts
import { SignJWT, importPKCS8, decodeJwt } from 'jose';

/** Normalize PEM that may be stored with \n escapes in env vars */
function normalizePem(pem: string) {
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
}

const TEAM_ID = process.env.MAPKIT_TEAM_ID!;
const KEY_ID  = process.env.MAPKIT_KEY_ID!;
const RAW_PEM = process.env.MAPKIT_PRIVATE_KEY!;

if (!TEAM_ID) throw new Error('Missing MAPKIT_TEAM_ID');
if (!KEY_ID)  throw new Error('Missing MAPKIT_KEY_ID');
if (!RAW_PEM) throw new Error('Missing MAPKIT_PRIVATE_KEY');

async function importKeyES256() {
  // Apple Maps tokens must be ES256 (EC P-256).
  const pem = normalizePem(RAW_PEM);
  return importPKCS8(pem, 'ES256');
}

/** Token for MapKit JS usage (front-end). Optional origin restriction. */
export async function createJsMapsToken(): Promise<string> {
  const allowed = (process.env.MAPKIT_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) {
    throw new Error('MAPKIT_ALLOWED_ORIGINS is empty');
  }

  const privateKey = await importKeyES256();
  const now = Math.floor(Date.now() / 1000);

  // iss, iat, exp are required; JS token may restrict by origin (optional).
  const token = await new SignJWT({ origin: allowed.join(',') })
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60) // 1 hour
    .sign(privateKey);

  return token;
}

/** Token for Apple Maps Server API (backend). No origin restriction; use as Bearer. */
export async function createServerMapsToken(): Promise<string> {
  const privateKey = await importKeyES256();
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60) // 1 hour
    .sign(privateKey);

  return token;
}

/** Non-secret diagnostics to help verify what you’re signing (no private key exposed). */
export function inspectMapsToken(token: string) {
  const decoded = decodeJwt(token);
  return {
    headerAlg: (() => { try { return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()).alg; } catch { return undefined; } })(),
    headerKid: (() => { try { return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()).kid; } catch { return undefined; } })(),
    iss: decoded.iss,
    iat: decoded.iat,
    exp: decoded.exp,
    origin: (decoded as any).origin,
  };
}

/* Back-compat aliases so existing imports keep working */
export const makeServerToken = createServerMapsToken;
export const makeJsToken     = createJsMapsToken;

