// app/api/favorites/[[...id]]/route.ts  (POST create, DELETE remove)
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const u: any = await requireUser();
  if (!u) return NextResponse.json({ ok:false, error:"Not signed in" }, { status:401 });

  const p = await req.json(); // provider object
  // upsert provider row
  await db.execute({
    sql:`INSERT OR REPLACE INTO providers (id,name,trade,phone,website,address,city,lat,lng,rating,review_count,source,source_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args:[p.id,p.name,p.trade,p.phone,p.website,p.address,p.city,p.lat,p.lng,p.rating,p.review_count,p.source,p.source_id||null],
  });

  const favId = crypto.randomUUID();
  await db.execute({
    sql:`INSERT INTO favorites (id,provider_id,user_id,snapshot_json) VALUES (?,?,?,?)`,
    args:[favId, p.id, u.id, JSON.stringify(p)],
  });

  return NextResponse.json({ ok:true, id: favId });
}

export async function DELETE(req: Request, { params }: any) {
  const u: any = await requireUser();
  if (!u) return NextResponse.json({ ok:false, error:"Not signed in" }, { status:401 });

  const id = params?.id?.[0];
  if (!id) return NextResponse.json({ ok:false, error:"Missing id" }, { status:400 });

  await db.execute({ sql:`DELETE FROM favorites WHERE id=? AND user_id=?`, args:[id,u.id] });
  return NextResponse.json({ ok:true });
}

