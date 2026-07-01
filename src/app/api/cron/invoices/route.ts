import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicesForPeriod } from '@/lib/invoice-service';
import { syncCalendarForPeriod } from '@/lib/calendar-service';
import { nextBillingPeriod } from '@/lib/billing';

export const runtime = 'nodejs';

// 매월 20일 실행 (vercel.json cron). 보안: Authorization: Bearer CRON_SECRET
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { year, month } = nextBillingPeriod(new Date()); // 다음 달
  const results = await generateInvoicesForPeriod(year, month);
  await syncCalendarForPeriod(year, month);
  // 생성만 자동, 발송은 관리자 검토 후 버튼으로(또는 여기서 자동발송도 가능).
  return NextResponse.json({ ok: true, period: { year, month }, generated: results.length });
}
