"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    mapkit: any;
  }
}

type Result = {
  id: string;
  name: string;
  trade?: string;
  address?: string;
  city?: string;
  phone?: string;
  website?: string;
  lat: number;
  lng: number;
  rating?: number;
  review_count?: number;
  source: "apple";
};

 const TRADES = ["plumber", "electrician", "hvac", "roofer", "painter"] as const;

export default function AppleMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [trade, setTrade] = useState<string>("plumber");
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const initMapkit = useCallback(async () => {
    if (!window.mapkit) return;
    window.mapkit.init({
      authorizationCallback: (done: (token: string) => void) => {
        fetch("/api/mapkit-token")
          .then((r) => r.text())
          .then((t) => done(t))
          .catch((e) => console.error("Token error", e));
      },
      language: "en",
    });

    const m = new window.mapkit.Map(mapRef.current!, {
      showsCompass: window.mapkit.FeatureVisibility.Visible,
      showsZoomControl: true,
      isRotationEnabled: false,
      isZoomEnabled: true,
    });

    // Center on Durham Region, ON (approx)
    const durham = new window.mapkit.CoordinateRegion(
      new window.mapkit.Coordinate(43.95, -78.9),
      new window.mapkit.CoordinateSpan(0.35, 0.55)
    );
    m.region = durham;

    setMap(m);
    setReady(true);
  }, []);

  useEffect(() => {
    if (window.mapkit) initMapkit();
  }, [initMapkit]);

  const doSearch = async () => {
    if (!map || !window.mapkit) return;
    setLoading(true);

    try {
      // 1) Ask our server to search Apple Maps (deterministic)
      const params = new URLSearchParams();
      params.set("q", trade || "plumber");
      if (query.trim()) params.set("city", query.trim());
      const res = await fetch(`/api/places?${params.toString()}`);
      const json = await res.json();

      if (!json.ok) {
        console.error("[/api/places error]", json.error);
        alert("Apple search error. Open console for details.");
        setLoading(false);
        return;
      }

      const items = json.results as any[];

      // 2) Clear old pins
      if (map.annotations?.length) {
        try { map.removeAnnotations(map.annotations); } catch {}
      }

      // 3) Drop pins
      const annotations = items.map((r) => {
        const c = new window.mapkit.Coordinate(r.lat, r.lng);
        return new window.mapkit.MarkerAnnotation(c, {
          title: r.name,
          subtitle: r.address || r.city || "",
        });
      });
      if (annotations.length) map.showItems(annotations);

      setResults(items);
      setLoading(false);

      if (items.length === 0) {
        console.warn("[Apple /v1/search] no results", { trade, query });
        alert("No results returned. Try a nearby city like Ajax or Pickering.");
      }
    } catch (e) {
      console.error("[doSearch exception]", e);
      setLoading(false);
      alert("Unexpected search error. See console.");
    }
  };
              

  const saveProvider = async (p: Result) => {
    await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    alert("Saved to directory (MVP)!");
  };

  return (
    <>
      {/* MapKit JS script */}
      <Script
        src="https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js"
        strategy="afterInteractive"
        onLoad={initMapkit}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div ref={mapRef} className="h-[60vh] w-full rounded-2xl bg-neutral-800" />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              className="rounded-xl bg-neutral-800 px-3 py-2"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
            >
              {TRADES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              className="flex-1 rounded-xl bg-neutral-800 px-3 py-2"
              placeholder="Extra filter (e.g., 'Ajax' or '24/7')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={doSearch}
              disabled={!ready || loading}
              className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <h2 className="mb-2 text-xl font-semibold">Results</h2>
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="rounded-2xl border border-neutral-800 p-3">
                <div className="text-lg font-semibold">{r.name}</div>
                {r.address && <div className="text-sm text-neutral-400">{r.address}</div>}
                <div className="mt-2 flex gap-2">
                  <button
                    className="rounded-xl bg-neutral-800 px-3 py-1 text-sm"
                    onClick={() => saveProvider(r)}
                  >
                    Save
                  </button>
                  <button
                    className="rounded-xl bg-neutral-800 px-3 py-1 text-sm"
                    onClick={() => {
                      const msg = prompt("Message for a quote (we'll email admin in MVP):", "");
                      if (msg) {
                        fetch("/api/leads", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            provider_id: r.id,
                            name: "Site Visitor",
                            email: "visitor@example.com",
                            message: msg,
                          }),
                        }).then(() => alert("Lead submitted!"));
                      }
                    }}
                  >
                    Request Quote
                  </button>
                </div>
              </div>
            ))}
            {results.length === 0 && <div className="text-neutral-400">No results yet.</div>}
          </div>
        </div>
      </div>
    </>
  );
}

