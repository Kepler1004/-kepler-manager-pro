import { NextRequest, NextResponse } from 'next/server';
import { syncCalendarForPeriod } from '@/lib/calendar-service';
import { getCurrentProfile, isStaff } from '@/lib/guards';

export const runtime = 'nodejs';

// POST { year, month }
export async function POST(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!isStaff(me?.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { year, month } = await req.json();
  if (!year || !month) return NextResponse.json({ error: 'year/month required' }, { status: 400 });
  const r = await syncCalendarForPeriod(year, month);
  return NextResponse.json({ ok: true, result: r });
}
