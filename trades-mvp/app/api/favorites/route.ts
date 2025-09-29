// app/api/favorites/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db"; // must expose db.execute({ sql, args }) or similar
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const user = await requireUser(); // should throw if not logged in
    const p = await req.json();

    if (!p?.id || !p?.name) {
      return NextResponse.json(
        { ok: false, error: "Missing provider id or name" },
        { status: 400 }
      );
    }

    // Upsert provider (keep null-safe updates)
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

    // Favor new schema (user_id + snapshot_json) if columns exist; fallback to legacy user_email
    const favoriteId = randomUUID();
    const snapshot = JSON.stringify(p);

    // Try user_id path first
    try {
      await db.execute({
        sql: `
          INSERT INTO favorites (id, provider_id, user_id, user_email, snapshot_json)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [favoriteId, p.id, user.id ?? null, user.email ?? null, snapshot],
      });
    } catch (e: any) {
      // If this failed because user_id column doesn't exist (older DB), use legacy schema
      if (String(e?.message || "").includes("no such column: user_id")) {
        await db.execute({
          sql: `
            INSERT INTO favorites (id, provider_id, user_email)
            VALUES (?, ?, ?)
          `,
          args: [favoriteId, p.id, user.email],
        });
      } else if (String(e?.message || "").includes("NOT NULL constraint failed: favorites.user_email")) {
        // DB is in mixed state: expects user_email but none provided — use user's email
        await db.execute({
          sql: `
            INSERT INTO favorites (id, provider_id, user_email)
            VALUES (?, ?, ?)
          `,
          args: [favoriteId, p.id, user.email],
        });
      } else {
        throw e;
      }
    }

    return NextResponse.json({ ok: true, id: favoriteId }, { status: 200 });
  } catch (err: any) {
    // Duplicate save? Treat as success (idempotent UX)
    const msg = String(err?.message || err);
    if (msg.includes("UNIQUE") || msg.includes("constraint")) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// (Optional) Keep your existing GET; 405 happens when POST is missing in this file.

