import { NextRequest, NextResponse } from 'next/server';
import { generatePayslipsForPeriod } from '@/lib/payslip-service';

export const runtime = 'nodejs';

// 매월 1일 실행. 지난 달 급여 계산.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = prev.getMonth() + 1;
  const results = await generatePayslipsForPeriod(year, month);
  return NextResponse.json({ ok: true, period: { year, month }, generated: results.length });
}
