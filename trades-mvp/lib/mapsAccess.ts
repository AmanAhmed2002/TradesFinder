// lib/mapsAccess.ts
import { makeServerToken } from "@/lib/mapkitToken";

let cached: { token: string; exp: number } | null = null;

/** Exchange developer token for a Maps access token (≈30m), cache it. */
export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;

  const devToken = makeServerToken();

  const rsp = await fetch("https://maps-api.apple.com/v1/token", {
    method: "GET",
    headers: { Authorization: `Bearer ${devToken}` },
    // no cache; we want a fresh token when expired
  });

  if (!rsp.ok) {
    const text = await rsp.text().catch(() => "");
    throw new Error(`/v1/token ${rsp.status}: ${text}`);
  }

  const json = await rsp.json() as { accessToken?: string };
  const accessToken = json?.accessToken;
  if (!accessToken) throw new Error("No accessToken in /v1/token response");

  // Apple’s access token lifetime ≈ 30 minutes (WWDC docs). Cache ~25m.
  const exp = now + 25 * 60;
  cached = { token: accessToken, exp };
  return accessToken;
}

/** Helper to call Apple Maps Server API with the access token */
export async function appleSearch(q: string, params: Record<string, string>) {
  const access = await getAccessToken();
  const url = new URL("https://maps-api.apple.com/v1/search");
  url.search = new URLSearchParams({ q, ...params }).toString();

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[Apple /v1/search error] ${res.status} ${text}`);
  }

  return res.json();
}

