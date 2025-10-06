// lib/mapkitToken.ts
import { SignJWT, importPKCS8 } from 'jose';

/** Normalize PEM that may be stored with \n escapes in env vars */
function normalizePem(pem: string) {
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
}

const TEAM_ID = process.env.MAPKIT_TEAM_ID!;
const KEY_ID = process.env.MAPKIT_KEY_ID!;
const RAW_PEM = process.env.MAPKIT_PRIVATE_KEY!;

if (!TEAM_ID) throw new Error('Missing MAPKIT_TEAM_ID');
if (!KEY_ID) throw new Error('Missing MAPKIT_KEY_ID');
if (!RAW_PEM) throw new Error('Missing MAPKIT_PRIVATE_KEY');

async function importKeyES256() {
  // Apple MapKit tokens must be ES256 (EC P-256). (Apple docs) :contentReference[oaicite:0]{index=0}
  const pem = normalizePem(RAW_PEM);
  return importPKCS8(pem, 'ES256');
}

/**
 * Token for MapKit **JS** usage (front-end). Includes origin restriction.
 * Claims required: iss (team id), iat, exp; optional origin restriction (Apple docs). :contentReference[oaicite:1]{index=1}
 */
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

  // Many implementations use a single "origin" claim (comma-separated).
  const token = await new SignJWT({ origin: allowed.join(',') })
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60) // 1 hour
    .sign(privateKey);

  return token;
}

/**
 * Token for **Apple Maps Server API** (backend). No origin restriction; send as Bearer auth. :contentReference[oaicite:2]{index=2}
 */
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

/* ---- Back-compat aliases so existing imports keep working ---- */
export const makeServerToken = createServerMapsToken;
export const makeJsToken = createJsMapsToken;

