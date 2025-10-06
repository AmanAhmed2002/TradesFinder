// lib/mapsAccess.ts
import { createServerMapsToken } from '@/lib/mapkitToken';

const MAPS_API_BASE = 'https://maps-api.apple.com';

type AppleSearchResponse = unknown; // keep flexible; your route will just pass through JSON

export async function appleSearch(q: string, near?: string): Promise<AppleSearchResponse> {
  if (!q || !q.trim()) {
    throw new Error('Missing query');
  }

  const token = await createServerMapsToken();
  const params = new URLSearchParams({ q: q.trim() });

  // If you pass a city or lat/lon, adapt here. Keeping your existing behavior:
  if (near && near.trim()) {
    params.set('near', near.trim());
  }

  const url = `${MAPS_API_BASE}/v1/search?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      // MapKit Server API requires a Bearer token
      // https://developer.apple.com/documentation/applemapsserverapi/
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // Bubble up a detailed error so your API route can turn it into 502
    throw new Error(`[Apple /v1/search error] ${res.status} ${text}`);
  }

  return res.json();
}

