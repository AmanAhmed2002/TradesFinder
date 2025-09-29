"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global { interface Window { mapkit: any; } }

type Result = {
  id: string; name: string; trade?: string; address?: string; city?: string;
  phone?: string; website?: string; lat: number; lng: number; rating?: number;
  review_count?: number; source: "apple";
};
const TRADES = ["plumber","electrician","hvac","roofer","painter"] as const;
const CITIES = ["Toronto","Mississauga","Brampton","Oakville","Burlington","Milton","Vaughan","Markham","Richmond Hill","Newmarket","Pickering","Ajax","Whitby","Oshawa","Clarington"] as const;
const REGIONS = ["Toronto","Peel","York","Halton","Durham"] as const;

export default function AppleMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [map, setMap] = useState<any>(null);

  const [trade, setTrade] = useState<string>("plumber");
  const [city, setCity] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<{id:string;email:string}|null>(null);
  const [authMode, setAuthMode] = useState<"login"|"register"|null>(null);
  const [authEmail, setAuthEmail] = useState(""); const [authPw, setAuthPw] = useState("");

  const initMapkit = useCallback(async () => {
    if (!window.mapkit) return;
    window.mapkit.init({
      authorizationCallback: (done: (token: string) => void) => {
        fetch("/api/mapkit-token").then(r=>r.text()).then(t=>done(t)).catch(console.error);
      },
      language: "en",
    });

    const m = new window.mapkit.Map(mapRef.current!, {
      showsCompass: window.mapkit.FeatureVisibility.Visible,
      showsZoomControl: true,
      isRotationEnabled: false,
      isZoomEnabled: true,
    });

    // GTA-wide region (center + span)
    const gta = new window.mapkit.CoordinateRegion(
      new window.mapkit.Coordinate(43.75, -79.5),
      new window.mapkit.CoordinateSpan(0.9, 1.6)
    );
    m.region = gta;

    setMap(m); setReady(true);
  }, []);

  useEffect(() => { if (window.mapkit) initMapkit(); }, [initMapkit]);

  useEffect(() => {
    // fetch current user
    fetch("/api/auth/me").then(r=>r.json()).then(d=>setUser(d.user || null)).catch(()=>{});
  }, []);

  async function load(pageNum = 1) {
    if (!map) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("q", trade || "plumber");
      if (city.trim()) params.set("city", city.trim());
      if (region) params.set("region", region);
      if (pageNum > 1) params.set("page", String(pageNum));

      const res = await fetch(`/api/places?${params.toString()}`);
      const json = await res.json();
      if (!json.ok) { alert("Search error"); setLoading(false); return; }

      const items: Result[] = json.results;

      if (pageNum === 1) {
        // clear pins
        if (map.annotations?.length) { try { map.removeAnnotations(map.annotations); } catch {} }
        setResults(items);
      } else {
        setResults(prev => [...prev, ...items]);
      }

      // drop pins (append)
      const annotations = items.map((r) =>
        new window.mapkit.MarkerAnnotation(new window.mapkit.Coordinate(r.lat, r.lng), {
          title: r.name, subtitle: r.address || r.city || "",
        })
      );
      if (annotations.length) map.showItems(annotations);

      setPage(pageNum);
      setHasMore(!!json.hasMore);
    } catch (e) {
      console.error(e); alert("Unexpected error");
    } finally { setLoading(false); }
  }

  const doSearch = () => load(1);
  const loadMore = () => load(page + 1);

  async function saveProvider(p: Result) {
    if (!user) { setAuthMode("login"); return; }
    const r = await fetch("/api/favorites", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p)
    });
    const j = await r.json();
    if (!j.ok) { alert(j.error || "Save failed"); return; }
    alert("Saved!");
  }

  async function authSubmit() {
    const body = JSON.stringify({ email: authEmail, password: authPw });
    const route = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const r = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    const j = await r.json();
    if (!j.ok) { alert(j.error || "Auth failed"); return; }
    setAuthMode(null); setAuthEmail(""); setAuthPw("");
    const me = await fetch("/api/auth/me").then(r=>r.json());
    setUser(me.user || null);
  }

  return (
    <>
      <Script src="https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js" strategy="afterInteractive" onLoad={initMapkit} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className="rounded-xl bg-neutral-800 px-3 py-2" value={trade} onChange={(e)=>setTrade(e.target.value)}>
          {TRADES.map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="rounded-xl bg-neutral-800 px-3 py-2" value={city} onChange={(e)=>setCity(e.target.value)}>
          <option value="">All GTA</option>
          {CITIES.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="rounded-xl bg-neutral-800 px-3 py-2" value={region} onChange={(e)=>setRegion(e.target.value)}>
          <option value="">All Regions</option>
          {REGIONS.map(r=> <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={doSearch} disabled={!ready || loading}
          className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-neutral-900 disabled:opacity-50">
          {loading ? "Searching..." : "Search"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-neutral-400">Signed in as {user.email}</span>
              <a className="rounded-xl bg-neutral-800 px-3 py-2 text-sm" href="#saves" onClick={(e)=>{e.preventDefault(); document.getElementById("saves")?.scrollIntoView({behavior:"smooth"});}}>My Saves</a>
              <button className="rounded-xl bg-neutral-800 px-3 py-2 text-sm" onClick={async ()=>{
                await fetch("/api/auth/logout", { method:"POST" }); setUser(null);
              }}>Logout</button>
            </>
          ) : (
            <>
              <button className="rounded-xl bg-neutral-800 px-3 py-2 text-sm" onClick={()=>{setAuthMode("login");}}>Login</button>
              <button className="rounded-xl bg-neutral-800 px-3 py-2 text-sm" onClick={()=>{setAuthMode("register");}}>Register</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div ref={mapRef} className="h-[60vh] w-full rounded-2xl bg-neutral-800" />
          {hasMore && (
            <div className="mt-3">
              <button onClick={loadMore} disabled={loading} className="rounded-xl bg-neutral-800 px-4 py-2">
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <h2 className="mb-2 text-xl font-semibold">Results</h2>
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="rounded-2xl border border-neutral-800 p-3">
                <div className="text-lg font-semibold">{r.name}</div>
                {r.address && <div className="text-sm text-neutral-400">{r.address}</div>}
                <div className="mt-2 flex gap-2">
                  <button className="rounded-xl bg-neutral-800 px-3 py-1 text-sm" onClick={()=> saveProvider(r)}>
                    Save
                  </button>
                  {r.website && (
                    <a className="rounded-xl bg-neutral-800 px-3 py-1 text-sm" href={r.website} target="_blank" rel="noreferrer">
                      Visit
                    </a>
                  )}
                </div>
              </div>
            ))}
            {results.length === 0 && <div className="text-neutral-400">No results yet.</div>}
          </div>
        </div>
      </div>

      {/* Auth modal */}
      {authMode && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 p-4">
            <h3 className="mb-2 text-lg font-semibold">{authMode === "login" ? "Login" : "Register"}</h3>
            <input className="mb-2 w-full rounded-xl bg-neutral-800 px-3 py-2" placeholder="Email"
                   value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} />
            <input className="mb-3 w-full rounded-xl bg-neutral-800 px-3 py-2" placeholder="Password" type="password"
                   value={authPw} onChange={(e)=>setAuthPw(e.target.value)} />
            <div className="flex items-center justify-end gap-2">
              <button className="rounded-xl bg-neutral-800 px-3 py-2" onClick={()=>setAuthMode(null)}>Cancel</button>
              <button className="rounded-xl bg-sky-500 px-3 py-2 text-neutral-900" onClick={authSubmit}>
                {authMode === "login" ? "Login" : "Create account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Saves */}
      <div id="saves" className="mt-8">
        <h2 className="mb-2 text-xl font-semibold">My Saves</h2>
        <MySaves />
      </div>
    </>
  );
}

function MySaves() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/favorites");
    const j = await r.json();
    if (j.ok) setItems(j.items); else setItems([]);
    setLoading(false);
  }
  useEffect(()=>{ load(); }, []);

  async function remove(id: string) {
    await fetch(`/api/favorites?provider_id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }


  if (loading) return <div className="text-neutral-400">Loading...</div>;
  if (!items.length) return <div className="text-neutral-400">No saved providers yet.</div>;
  return (
    <div className="space-y-3">
      {items.map((r)=>(
        <div key={r.id} className="rounded-2xl border border-neutral-800 p-3">
          <div className="text-lg font-semibold">{r.name}</div>
          {r.address && <div className="text-sm text-neutral-400">{r.address}</div>}
          <div className="mt-2 flex gap-2">
            {r.website && <a className="rounded-xl bg-neutral-800 px-3 py-1 text-sm" href={r.website} target="_blank">Visit</a>}
            <button className="rounded-xl bg-neutral-800 px-3 py-1 text-sm" onClick={()=>remove(r.id)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

