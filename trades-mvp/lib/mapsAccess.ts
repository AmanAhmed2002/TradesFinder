// lib/mapsAccess.ts  (FULL FILE — replace)
import jwt from "jsonwebtoken";

let cached: { token: string; exp: number } | null = null;

function signDeveloperToken() {
  const teamId = process.env.MAPKIT_TEAM_ID!;
  const keyId = process.env.MAPKIT_KEY_ID!;
  let pem = process.env.MAPKIT_PRIVATE_KEY!;
  pem = pem.replace(/\\n/g, "\n");

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 5 * 60; // 5 minutes

  return jwt.sign({ iss: teamId, iat, exp }, pem, {
    algorithm: "ES256",
    keyid: keyId,
    header: { typ: "JWT" },
  });
}

export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;

  const authToken = signDeveloperToken();

  const rsp = await fetch("https://maps-api.apple.com/v1/token", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!rsp.ok) {
    const text = await rsp.text();
    throw new Error(`/v1/token ${rsp.status}: ${text}`);
  }

  const json = await rsp.json();
  const accessToken = json?.accessToken as string;
  if (!accessToken) throw new Error("No accessToken in /v1/token response");

  // Cache ~25 minutes (Apple’s lifetime ≈ 30m)
  const exp = now + 25 * 60;
  cached = { token: accessToken, exp };
  return accessToken;
}

