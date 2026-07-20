// src/app/api/reports/rollover/route.ts
// Vercel Cron 전용. Authorization: Bearer <CRON_SECRET> 로 보호.
import { NextRequest, NextResponse } from 'next/server';
import { runRollover } from '@/lib/report/rollover';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const result = await runRollover();
  return NextResponse.json({ ok: true, ...result });
}
