// app/api/providers/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { makeServerToken } from "@/lib/mapkitToken";

function centerForCity(city?: string | null) {
  // Default: Durham-ish center
  if (!city) return "43.95,-78.90";
  const c = city.toLowerCase();
  if (c.includes("ajax")) return "43.85,-79.02";
  if (c.includes("pickering")) return "43.84,-79.09";
  if (c.includes("whitby")) return "43.88,-78.94";
  if (c.includes("oshawa")) return "43.90,-78.86";
  // fallback
  return "43.95,-78.90";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "plumber";
    const city = url.searchParams.get("city") ?? undefined;
    const searchLocation = centerForCity(city);

    const token = makeServerToken();

    const params = new URLSearchParams({
      q,
      limit: "25",
      lang: "en-CA",
      searchLocation,               // Apple Maps hint
      resultTypeFilter: "Poi",
    });

    const rsp = await fetch(`https://maps-api.apple.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!rsp.ok) {
      const text = await rsp.text();
      console.error("[Apple /v1/search error]", rsp.status, text);
      return NextResponse.json(
        { ok: false, error: `Apple Maps: ${rsp.status} ${text}` },
        { status: 502 }
      );
    }

    const data = await rsp.json();

    const results = (data.results ?? []).map((r: any) => {
      const coord = r.coordinate ?? {};
      const addr = r.structuredAddress ?? {};
      const id = r.placeId ?? r.id ?? crypto.randomUUID();

      return {
        id,
        name: r.name ?? "Unknown",
        trade: q,
        address:
          r.formattedAddress ??
          [addr.fullThoroughfare, addr.locality, addr.administrativeArea]
            .filter(Boolean)
            .join(", "),
        city: addr.locality ?? undefined,
        phone: r.phoneNumber ?? undefined,
        website: r.website ?? undefined,
        lat: coord.latitude,
        lng: coord.longitude,
        rating: r.rating ?? undefined,
        review_count: r.reviewsCount ?? r.reviewCount ?? undefined,
        source: "apple" as const,
      };
    });

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error("[/api/providers exception]", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

