// 매일 18시(현지) 실행.
// - 오늘이 공휴일이면 전원 발송 안 함
// - 공휴일이 아니면, 오늘 요일이 직원의 work_days 에 포함된 사람에게만 발송
import { NextRequest, NextResponse } from 'next/server';
import { reportAdminClient } from '@/lib/report/supabase';
import { sendTemplate } from '@/lib/report/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const sb = reportAdminClient();

  // 말레이시아(UTC+8) 기준 오늘 날짜/요일
  const nowKL = new Date(Date.now() + 8 * 3600 * 1000);
  const todayKL = nowKL.toISOString().slice(0, 10);          // YYYY-MM-DD
  const weekday = nowKL.getUTCDay();                           // 0=일 .. 6=토

  // 1) 공휴일이면 전원 스킵
  const { data: holiday } = await sb
    .from('holidays')
    .select('holiday_date')
    .eq('holiday_date', todayKL)
    .maybeSingle();
  if (holiday) {
    return NextResponse.json({ ok: true, skippedReason: 'holiday', date: todayKL, sent: 0 });
  }

  // 2) 대상 직원 조회
  const { data: staff } = await sb
    .from('profiles')
    .select('id, full_name, whatsapp_number, work_days')
    .in('role', ['master', 'admin', 'admin_b', 'teacher'])
    .eq('is_active', true)
    .eq('report_enabled', true);

  const template = process.env.WA_DAILY_TEMPLATE || 'hello_world';
  const lang = process.env.WA_DAILY_TEMPLATE_LANG || 'en_US';

  let sent = 0, skippedNoNum = 0, skippedOffday = 0;
  const errors: any[] = [];

  for (const s of staff ?? []) {
    // 업무일 판정: work_days 비어있으면 기본 월~금
    const workDays: number[] = (s.work_days && s.work_days.length) ? s.work_days : [1, 2, 3, 4, 5];
    if (!workDays.includes(weekday)) { skippedOffday++; continue; }  // 오늘 근무일 아님
    if (!s.whatsapp_number) { skippedNoNum++; continue; }

    const r = await sendTemplate(s.whatsapp_number, template, lang);
    if (r.ok) sent++; else errors.push({ name: s.full_name, error: r.data });
  }

  return NextResponse.json({
    ok: true, date: todayKL, weekday,
    sent, skippedOffday, skippedNoNum, errors,
  });
}
