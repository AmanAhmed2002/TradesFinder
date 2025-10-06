// app/api/mapkit-token/route.ts
import { NextResponse } from 'next/server';
import { createJsMapsToken } from '@/lib/mapkitToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = await createJsMapsToken();
    return new NextResponse(token, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (e) {
    console.error('[mapkit-token] error', e);
    // 403 if origin restriction/envs cause denial; 500 for other errors
    return NextResponse.json({ error: 'mapkit token error' }, { status: 403 });
  }
}

