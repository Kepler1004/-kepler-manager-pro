// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/guards';
import { getReportsByDate } from '@/lib/report/queries';

const STAFF = ['master', 'admin', 'admin_b'];

export async function GET(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me || !STAFF.includes(me.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const date =
    req.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const reports = await getReportsByDate(date);
  return NextResponse.json({ date, reports });
}
