//app/api/places/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/mapsAccess";

// GTA bbox (north,east,south,west)
const GTA = { north: 44.45, east: -78.40, south: 43.35, west: -80.10 };

// City centers (lat, lon)
const CITY_CENTERS: Record<string, [number, number]> = {
  toronto: [43.651, -79.347],
  mississauga: [43.589, -79.644],
  brampton: [43.731, -79.762],
  oakville: [43.450, -79.682],
  burlington: [43.325, -79.799],
  milton: [43.518, -79.877],
  vaughan: [43.837, -79.508],
  markham: [43.856, -79.337],
  "richmond hill": [43.882, -79.439],
  newmarket: [44.059, -79.461],
  pickering: [43.838, -79.086],
  ajax: [43.852, -79.020],
  whitby: [43.884, -78.942],
  oshawa: [43.897, -78.865],
  clarington: [43.935, -78.607],
};

// Region bounding boxes (north,east,south,west)
const REGION_BBOX: Record<string, [number, number, number, number]> = {
  toronto: [43.90, -79.12, 43.56, -79.65], // rough TO bbox
  peel:    [43.86, -79.45, 43.45, -80.10], // Mississauga + Brampton
  york:    [44.25, -79.12, 43.70, -79.78],
  halton:  [43.65, -79.45, 43.30, -80.33],
  durham:  [44.10, -78.40, 43.75, -79.20],
};

function gtaRegionParam() {
  const { north, east, south, west } = GTA;
  return `${north},${east},${south},${west}`;
}
function regionParamFor(name: string) {
  const bbox = REGION_BBOX[name.toLowerCase()];
  if (!bbox) return gtaRegionParam();
  const [n, e, s, w] = bbox;
  return `${n},${e},${s},${w}`;
}
function centerForCity(name?: string | null) {
  if (!name) return null;
  const key = name.toLowerCase();
  const hit = CITY_CENTERS[key];
  return hit ? `${hit[0]},${hit[1]}` : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "plumber").trim();
    const city = (url.searchParams.get("city") || "").trim();
    const region = (url.searchParams.get("region") || "").trim();
    const page = Number(url.searchParams.get("page") || "1");
    const limit = 25;
    const offset = (page - 1) * limit;

    const access = await getAccessToken();

    // 👇 Build params: include EITHER searchLocation OR searchRegion
    const params = new URLSearchParams({
      q,
      limit: String(limit),
      lang: "en-CA",
      resultTypeFilter: "Poi",
    });

    const cityCenter = centerForCity(city);
    if (cityCenter) {
      // If a city is chosen, prefer point-based ranking & omit bbox
      params.set("searchLocation", cityCenter);
    } else if (region) {
      // If only region is chosen, constrain by that region's bbox
      params.set("searchRegion", regionParamFor(region));
    } else {
      // Default: GTA-wide bbox
      params.set("searchRegion", gtaRegionParam());
    }

    const rsp = await fetch(`https://maps-api.apple.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${access}` },
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

    const all = (data.results ?? []).map((r: any) => {
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

    // Simple client-side paging
    const results = all.slice(offset, offset + limit);
    const hasMore = offset + limit < all.length;

    return NextResponse.json({ ok: true, results, page, hasMore, total: all.length });
  } catch (e: any) {
    console.error("[/api/places exception]", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

