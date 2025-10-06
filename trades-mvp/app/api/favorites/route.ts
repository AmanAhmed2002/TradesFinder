export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Ensure no caching of this API (helps avoid "stuck loading" on data changes).
//export const dynamic = "force-dynamic"; // next docs: caching config & force-dynamic. :contentReference[oaicite:0]{index=0}

type ProviderSnapshot = {
  id: string;
  name: string;
  trade?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  review_count?: number | null;
  source?: string | null;
  source_id?: string | null;
};

// Merge snapshot (if present) with the current providers row.
// Snapshot wins; row fills in gaps.
function mergeSnapshotWithRow(
  snap: ProviderSnapshot | null,
  row: any
): ProviderSnapshot {
  const base: ProviderSnapshot = {
    id: row?.id ?? snap?.id,
    name: row?.name ?? snap?.name,
    trade: row?.trade ?? snap?.trade ?? null,
    phone: row?.phone ?? snap?.phone ?? null,
    website: row?.website ?? snap?.website ?? null,
    address: row?.address ?? snap?.address ?? null,
    city: row?.city ?? snap?.city ?? null,
    lat: row?.lat ?? snap?.lat ?? null,
    lng: row?.lng ?? snap?.lng ?? null,
    rating: row?.rating ?? snap?.rating ?? null,
    review_count: row?.review_count ?? snap?.review_count ?? null,
    source: row?.source ?? snap?.source ?? "apple",
    source_id: row?.source_id ?? snap?.source_id ?? null,
  };
  return snap ? { ...base, ...snap } : base;
}

// --- GET /api/favorites ------------------------------------------------------
// Returns { ok: true, items: Provider[] } for the logged-in user.
export async function GET(req: Request) {
  try {
    const user = await requireUser();

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

    const { rows } = await db.execute({
      sql: `
        SELECT
          f.id            AS favorite_id,
          f.created_at    AS favorite_created_at,
          f.snapshot_json AS favorite_snapshot_json,
          p.id            AS id,
          p.name          AS name,
          p.trade         AS trade,
          p.phone         AS phone,
          p.website       AS website,
          p.address       AS address,
          p.city          AS city,
          p.lat           AS lat,
          p.lng           AS lng,
          p.rating        AS rating,
          p.review_count  AS review_count,
          p.source        AS source,
          p.source_id     AS source_id
        FROM favorites f
        LEFT JOIN providers p ON p.id = f.provider_id
        WHERE
          (COALESCE(f.user_id, '') = COALESCE(?, '')
             OR COALESCE(f.user_email, '') = COALESCE(?, ''))
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [user.id ?? "", user.email ?? "", limit, offset],
    });

    const items = rows.map((r: any) => {
      let snap: ProviderSnapshot | null = null;
      if (r.favorite_snapshot_json) {
        try { snap = JSON.parse(String(r.favorite_snapshot_json)); } catch { snap = null; }
      }
      // Return a flat provider the UI expects
      return mergeSnapshotWithRow(snap, r);
    });

    return NextResponse.json({ ok: true, items }, { status: 200 }); // NextResponse.json is the recommended pattern. :contentReference[oaicite:1]{index=1}
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

// --- POST /api/favorites -----------------------------------------------------
// Saves a provider for the logged-in user (kept functionally identical to your working flow).
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const p = await req.json();

    if (!p?.id || !p?.name) {
      return NextResponse.json(
        { ok: false, error: "Missing provider id or name" },
        { status: 400 }
      );
    }

    // Upsert provider
    await db.execute({
      sql: `
        INSERT INTO providers
          (id, name, trade, phone, website, address, city, lat, lng, rating, review_count, source, source_id)
        VALUES
          (?,  ?,    ?,     ?,    ?,      ?,      ?,    ?,   ?,   ?,      ?,           ?,      ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          trade = COALESCE(excluded.trade, providers.trade),
          phone = COALESCE(excluded.phone, providers.phone),
          website = COALESCE(excluded.website, providers.website),
          address = COALESCE(excluded.address, providers.address),
          city = COALESCE(excluded.city, providers.city),
          lat = COALESCE(excluded.lat, providers.lat),
          lng = COALESCE(excluded.lng, providers.lng),
          rating = COALESCE(excluded.rating, providers.rating),
          review_count = COALESCE(excluded.review_count, providers.review_count),
          source = COALESCE(excluded.source, providers.source),
          source_id = COALESCE(excluded.source_id, providers.source_id)
      `,
      args: [
        p.id, p.name, p.trade ?? null, p.phone ?? null, p.website ?? null,
        p.address ?? null, p.city ?? null, p.lat ?? null, p.lng ?? null,
        p.rating ?? null, p.review_count ?? null, p.source ?? "apple", p.source_id ?? null,
      ],
    });

    // Insert favorite (new schema first; fallback to legacy user_email)
    const favoriteId = randomUUID();
    const snapshot = JSON.stringify(p);

    try {
      await db.execute({
        sql: `INSERT INTO favorites (id, provider_id, user_id, user_email, snapshot_json) VALUES (?, ?, ?, ?, ?)`,
        args: [favoriteId, p.id, user.id ?? null, user.email ?? null, snapshot],
      });
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("no such column: user_id") || msg.includes("NOT NULL constraint failed: favorites.user_email")) {
        await db.execute({
          sql: `INSERT INTO favorites (id, provider_id, user_email) VALUES (?, ?, ?)`,
          args: [favoriteId, p.id, user.email],
        });
      } else {
        throw e;
      }
    }

    return NextResponse.json({ ok: true, id: favoriteId }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("UNIQUE") || msg.includes("constraint")) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// --- DELETE /api/favorites ---------------------------------------------------
// Removes the current user's favorite for a given provider_id.
// Called as: DELETE /api/favorites?provider_id=PROVIDER_ID
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const providerId = url.searchParams.get("provider_id");

    if (!providerId) {
      return NextResponse.json(
        { ok: false, error: "Missing provider_id in query" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `
        DELETE FROM favorites
        WHERE provider_id = ?
          AND (
            COALESCE(user_id, '') = COALESCE(?, '')
            OR COALESCE(user_email, '') = COALESCE(?, '')
          )
      `,
      args: [providerId, user.id ?? "", user.email ?? ""],
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

