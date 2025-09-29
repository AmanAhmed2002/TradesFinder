"use client";

import { useEffect, useState } from "react";

/* tiny inline icon (visual only) */
function IconBookmark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z" />
    </svg>
  );
}

type Provider = {
  id: string;
  name: string;
  trade?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  rating?: number | null;
  review_count?: number | null;
};

export default function SavedPage() {
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/favorites?limit=100", { cache: "no-store" });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`GET /api/favorites failed (${r.status}): ${txt}`);
      }
      const isJson = r.headers.get("content-type")?.includes("application/json");
      const j = isJson ? await r.json() : null;
      if (!j?.ok || !Array.isArray(j.items)) throw new Error("Invalid response.");
      setItems(j.items);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function remove(id: string) {
    try {
      await fetch(`/api/favorites?provider_id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } finally {
      await load();
    }
  }

  return (
    <main className="grid gap-6">
      {/* Header */}
      <section className="card card-hover">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 shadow">
              <IconBookmark className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Saved Providers</h1>
              <p className="text-sm text-[--color-text-dim]">
                Revisit services you’ve saved from search results.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => load()}>
              Refresh
            </button>
            <a href="/" className="btn-ghost">Back to Search</a>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="grid gap-3">
        {loading && (
          <div className="card">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-1/3 rounded bg-[--color-surface-200]" />
              <div className="h-3 w-2/3 rounded bg-[--color-surface-200]" />
              <div className="h-3 w-1/2 rounded bg-[--color-surface-200]" />
            </div>
          </div>
        )}

        {err && !loading && (
          <div className="card border-red-500/40">
            <div className="text-sm text-red-400">
              {err}
            </div>
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">No saved providers yet</h3>
                <p className="mt-1 text-sm text-[--color-text-dim]">
                  Use the <span className="font-medium text-brand-400">Save</span> button on any search result to add it here.
                </p>
              </div>
              <a href="/" className="btn">Search</a>
            </div>
          </div>
        )}

        {!loading && !err && items.length > 0 && (
          <div className="grid gap-3">
            {items.map((p) => (
              <div key={p.id} className="card card-hover">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{p.name}</h3>
                    {p.address && (
                      <div className="mt-0.5 text-sm text-[--color-text-dim]">
                        {p.address}
                      </div>
                    )}
                    <div className="mt-2 grid gap-1 text-sm">
                      {p.city && (
                        <div className="text-[--color-text-dim]">
                          City: <span className="text-[--color-text]">{p.city}</span>
                        </div>
                      )}
                      {p.trade && (
                        <div className="text-[--color-text-dim]">
                          Trade: <span className="text-[--color-text]">{p.trade}</span>
                        </div>
                      )}
                      {p.phone && (
                        <div className="text-[--color-text-dim]">
                          Phone: <span className="text-[--color-text]">{p.phone}</span>
                        </div>
                      )}
                      {typeof p.rating === "number" && (
                        <div className="text-[--color-text-dim]">
                          Rating: <span className="text-[--color-text]">{p.rating.toFixed(1)}</span>
                          {typeof p.review_count === "number" && (
                            <span className="ml-2 text-[--color-text-dim]">
                              ({p.review_count} reviews)
                            </span>
                          )}
                        </div>
                      )}
                      {p.website && (
                        <div className="truncate text-[--color-text-dim]">
                          Website:{" "}
                          <a className="underline" href={p.website} target="_blank" rel="noreferrer">
                            {p.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.website && (
                      <a
                        className="btn-ghost"
                        href={p.website}
                        target="_blank"
                        rel="noreferrer"
                        title="Visit"
                      >
                        Visit
                      </a>
                    )}
                    <button
                      className="btn-ghost"
                      onClick={() => remove(p.id)}
                      title="Remove from saved"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

