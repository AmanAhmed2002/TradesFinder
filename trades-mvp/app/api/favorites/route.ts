// app/api/favorites/route.ts  (GET = list)
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";

export async function GET() {
  const u: any = await requireUser();
  if (!u) return NextResponse.json({ ok:false, error:"Not signed in" }, { status:401 });
  const rows = await all(`SELECT f.id, f.created_at, f.snapshot_json
                          FROM favorites f WHERE f.user_id = ?
                          ORDER BY f.created_at DESC`, [u.id]);
  const items = rows.map((r:any) => ({ id: r.id, ...JSON.parse(r.snapshot_json || "{}"), saved_at: r.created_at }));
  return NextResponse.json({ ok:true, items });
}

