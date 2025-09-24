// app/api/mapkit-token/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { makeJsToken } from "@/lib/mapkitToken";

// Turn an Origin header (https://host:port) into host[:port] for MapKit 'origin' claim
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

    // Permissive: if there's no Origin, still mint a token without the 'origin' claim.
    // (Apple accepts JS tokens without origin; origin is recommended but optional.)
    const token = origin ? makeJsToken(origin) : makeJsToken(undefined as any);

    // TEMP: minimal debug header so you can verify envs are present without leaking secrets
    const dbg = [
      `TEAM:${process.env.MAPKIT_TEAM_ID ? "ok" : "missing"}`,
      `KID:${process.env.MAPKIT_KEY_ID ? "ok" : "missing"}`,
      `PEM:${process.env.MAPKIT_PRIVATE_KEY?.includes("BEGIN PRIVATE KEY") ? "ok" : "bad"}`,
      `ORIGIN:${origin ?? "none"}`
    ].join(";");

    return new NextResponse(token, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Mapkit-Debug": dbg, // view in network tab
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "token error" }, { status: 500 });
  }
}

