import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicesForPeriod } from '@/lib/invoice-service';
import { syncCalendarForPeriod } from '@/lib/calendar-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { year, month } = await req.json();
  if (!year || !month) return NextResponse.json({ error: 'year/month required' }, { status: 400 });
  const results = await generateInvoicesForPeriod(year, month);
  await syncCalendarForPeriod(year, month);
  return NextResponse.json({ ok: true, count: results.length });
}
