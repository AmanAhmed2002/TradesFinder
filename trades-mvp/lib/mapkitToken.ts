// lib/mapkitToken.ts
import { SignJWT, importPKCS8 } from 'jose';

/**
 * Normalizes PEM that may be stored with \n escapes in env.
 */
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
  // Apple MapKit requires ES256 (EC P-256)
  // jose.importPKCS8 expects full PKCS#8 PEM string
  const pem = normalizePem(RAW_PEM);
  return importPKCS8(pem, 'ES256');
}

/**
 * Create a short-lived token for MapKit **JS** usage.
 * We include an origin restriction (recommended) using a comma-separated string.
 * Note: Apple sources/documentation show ES256 and optional origin restriction.
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

  // Per Apple guidance: ES256 + iss/teamId; origin restriction recommended for JS
  // Many implementations use a single "origin" claim with comma-separated origins.
  const token = await new SignJWT({ origin: allowed.join(',') })
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60) // 1 hour
    .sign(privateKey);

  return token;
}

/**
 * Create a token for **server-to-server** Maps Server API calls.
 * No origin restriction needed here.
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

