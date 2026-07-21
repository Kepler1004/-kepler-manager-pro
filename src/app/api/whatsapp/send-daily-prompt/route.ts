// 매시 정각 실행 → 현재 말레이시아 '시'와 report_send_hour 가 일치하는 직원에게만 발송
import { NextRequest, NextResponse } from 'next/server';
import { reportAdminClient } from '@/lib/report/supabase';
import { sendTemplate } from '@/lib/report/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // 말레이시아(UTC+8) 현재 시(hour) 계산
  const nowKL = new Date(Date.now() + 8 * 3600 * 1000);
  const hourKL = nowKL.getUTCHours();

  const sb = reportAdminClient();
  const { data: staff } = await sb
    .from('profiles')
    .select('id, full_name, whatsapp_number, report_send_hour')
    .in('role', ['master', 'admin', 'admin_b', 'teacher'])
    .eq('is_active', true)
    .eq('report_enabled', true)
    .eq('report_send_hour', hourKL);

  const template = process.env.WA_DAILY_TEMPLATE || 'hello_world';
  const lang = process.env.WA_DAILY_TEMPLATE_LANG || 'en_US';

  let sent = 0, skipped = 0;
  const errors: any[] = [];
  for (const s of staff ?? []) {
    if (!s.whatsapp_number) { skipped++; continue; }
    const r = await sendTemplate(s.whatsapp_number, template, lang);
    if (r.ok) sent++; else errors.push({ name: s.full_name, error: r.data });
  }

  return NextResponse.json({ ok: true, hourKL, targeted: staff?.length ?? 0, sent, skipped, errors });
}
