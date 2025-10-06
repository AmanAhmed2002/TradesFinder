// app/api/places/route.ts
import { NextResponse } from 'next/server';
import { appleSearch } from '@/lib/mapsAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const city = searchParams.get('city') ?? undefined;

    const data = await appleSearch(q, city);
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error(String(e));
    // When Apple rejects with 401, surface 502 (upstream error) like your current behavior
    return NextResponse.json({ error: 'Apple search error' }, { status: 502 });
  }
}

