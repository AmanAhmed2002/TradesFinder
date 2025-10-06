// app/api/mapkit-token/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createJsMapsToken } from '@/lib/mapkitToken';

export async function GET() {
  try {
    const token = await createJsMapsToken();
    return new NextResponse(token, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (e) {
    console.error('[mapkit-token] error', e);
    return NextResponse.json({ error: 'mapkit token error' }, { status: 403 });
  }
}

