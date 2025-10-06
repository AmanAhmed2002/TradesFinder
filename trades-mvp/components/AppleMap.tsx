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

/* Compact icons */
function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M10 3a7 7 0 105.29 12.29l4.2 4.2 1.42-1.42-4.2-4.2A7 7 0 0010 3zm0 2a5 5 0 110 10A5 5 0 0110 5z"/>
    </svg>
  );
}
function IconBookmark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z"/>
    </svg>
  );
}

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
  const [authEmail, setAuthEmail] = useState("");
  const [authPw, setAuthPw] = useState("");

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

    const gta = new window.mapkit.CoordinateRegion(
      new window.mapkit.Coordinate(43.75, -79.5),
      new window.mapkit.CoordinateSpan(0.9, 1.6)
    );
    m.region = gta;

    setMap(m); setReady(true);
  }, []);

  useEffect(() => { if (window.mapkit) initMapkit(); }, [initMapkit]);

  useEffect(() => {
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
        if (map.annotations?.length) { try { map.removeAnnotations(map.annotations); } catch {} }
        setResults(items);
      } else {
        setResults(prev => [...prev, ...items]);
      }

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

    if (authMode === "register" && j.requireVerification) {
      alert("Please verify your email. We sent you a link to complete registration.");
      setAuthMode(null);
      setAuthEmail("");
      setAuthPw("");
      return;
    }

    setAuthMode(null);
    setAuthEmail("");
    setAuthPw("");
    const me = await fetch("/api/auth/me").then(r=>r.json());
    setUser(me.user || null);
  }

  return (
    <>
      <Script src="https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js" strategy="afterInteractive" onLoad={initMapkit} />

      {/* Controls: larger text, compact inputs, small icons */}
      <section className="card card-hover">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="grow">
            <label className="mb-1 block text-[12px] font-medium muted">Trade</label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 muted" />
              <select className="input pl-8 text-[14px]" value={trade} onChange={(e)=>setTrade(e.target.value)}>
                {TRADES.map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grow">
            <label className="mb-1 block text-[12px] font-medium muted">City</label>
            <select className="input text-[14px]" value={city} onChange={(e)=>setCity(e.target.value)}>
              <option value="">All GTA</option>
              {CITIES.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grow">
            <label className="mb-1 block text-[12px] font-medium muted">Region</label>
            <select className="input text-[14px]" value={region} onChange={(e)=>setRegion(e.target.value)}>
              <option value="">All Regions</option>
              {REGIONS.map(r=> <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <button onClick={doSearch} disabled={!ready || loading} className="btn">
            <IconSearch className="h-3.5 w-3.5" />
            <span className="text-[14px]">{loading ? "Searching..." : "Search"}</span>
          </button>

          <div className="md:ml-auto flex items-center gap-2">
            {user ? (
              <>
                <span className="badge">Signed in: {user.email}</span>
                <a
                  className="btn-ghost"
                  href="#saves"
                  onClick={(e)=>{e.preventDefault(); document.getElementById("saves")?.scrollIntoView({behavior:"smooth"});}}
                >
                  <IconBookmark className="h-3.5 w-3.5" />
                  My Saves
                </a>
                <button
                  className="btn-ghost"
                  onClick={async ()=>{ await fetch("/api/auth/logout", { method:"POST" }); setUser(null); }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={()=>{setAuthMode("login");}}>Login</button>
                <button className="btn" onClick={()=>{setAuthMode("register");}}>Register</button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Map + Results */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Map */}
        <div className="lg:col-span-3">
          <div ref={mapRef} className="h-[56vh] w-full rounded-md border border-[--color-border] bg-[--color-panel]" />
          {hasMore && (
            <div className="mt-2">
              <button onClick={loadMore} disabled={loading} className="btn-ghost text-[14px]">
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>

        {/* Results list */}
        <div className="lg:col-span-2">
          <h2 className="title mb-1">Results</h2>
          <div className="grid gap-2">
            {results.map((r) => (
              <div key={r.id} className="card card-hover">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold leading-tight">{r.name}</div>
                    {r.address && <div className="mt-0.5 text-[12.5px] muted">{r.address}</div>}
                    <div className="mt-1 grid gap-0.5 text-[13px]">
                      {r.city && <div className="muted">City: <span className="text-[--color-text]">{r.city}</span></div>}
                      {r.trade && <div className="muted">Trade: <span className="text-[--color-text]">{r.trade}</span></div>}
                      {r.phone && <div className="muted">Phone: <span className="text-[--color-text]">{r.phone}</span></div>}
                      {r.website && (
                        <div className="truncate muted">
                          Website:{" "}
                          <a className="underline" href={r.website} target="_blank" rel="noreferrer">{r.website}</a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {r.website && (
                      <a className="btn-ghost text-[13px]" href={r.website} target="_blank" rel="noreferrer">
                        Visit
                      </a>
                    )}
                    <button className="btn text-[13px]" onClick={()=> saveProvider(r)} title="Save provider">
                      <IconBookmark className="h-3.5 w-3.5" />
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {results.length === 0 && <div className="card text-[14px]">No results yet.</div>}
          </div>
        </div>
      </div>

      {/* Auth modal — ONLY STYLING CHANGED: solid dark panel + darker/blurred backdrop */}
      {authMode && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm"
          aria-modal="true"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-md border border-[--color-border] bg-[--color-panel] p-4 shadow-lg">
            <h3 className="mb-2 text-[16px] font-semibold">
              {authMode === "login" ? "Login" : "Register"}
            </h3>
            <input
              className="input mb-2 text-[14px]"
              placeholder="Email"
              value={authEmail}
              onChange={(e)=>setAuthEmail(e.target.value)}
            />
            <input
              className="input mb-3 text-[14px]"
              placeholder="Password"
              type="password"
              value={authPw}
              onChange={(e)=>setAuthPw(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2">
              <button className="btn-ghost" onClick={()=>setAuthMode(null)}>Cancel</button>
              <button className="btn" onClick={authSubmit}>
                {authMode === "login" ? "Login" : "Create account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Saves */}
      <div id="saves" className="mt-6">
        <h2 className="title mb-1">My Saves</h2>
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

  if (loading) return <div className="muted text-[14px]">Loading...</div>;
  if (!items.length) return <div className="card text-[14px]">You haven’t saved any providers yet.</div>;

  return (
    <div className="grid gap-2">
      {items.map((r)=>(
        <div key={r.id} className="card card-hover">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold leading-tight">{r.name}</div>
              {r.address && <div className="mt-0.5 text-[12.5px] muted">{r.address}</div>}
              <div className="mt-1 grid gap-0.5 text-[13px]">
                {r.city && <div className="muted">City: <span className="text-[--color-text]">{r.city}</span></div>}
                {r.trade && <div className="muted">Trade: <span className="text-[--color-text]">{r.trade}</span></div>}
                {r.phone && <div className="muted">Phone: <span className="text-[--color-text]">{r.phone}</span></div>}
                {r.website && (
                  <div className="truncate muted">
                    Website:{" "}
                    <a className="underline" href={r.website} target="_blank" rel="noreferrer">{r.website}</a>
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {r.website && (
                <a className="btn-ghost text-[13px]" href={r.website} target="_blank" rel="noreferrer">
                  Visit
                </a>
              )}
              <button className="btn-ghost text-[13px]" onClick={()=>remove(r.id)} title="Remove">
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

