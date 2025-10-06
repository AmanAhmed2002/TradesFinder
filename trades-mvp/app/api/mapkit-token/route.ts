// app/api/mapkit-token/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { makeJsToken } from "@/lib/mapkitToken";

// Convert Origin to host[:port] string for 'origin' claim (optional)
function originHost(req: Request) {
  const o = req.headers.get("origin");
  try {
    if (!o) return undefined;
    const u = new URL(o);
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  try {
    const origin = originHost(req);
    const token = makeJsToken(origin); // include origin if present
    return new NextResponse(token, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "token error" }, { status: 500 });
  }
}

