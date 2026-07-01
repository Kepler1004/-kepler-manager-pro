import { NextRequest, NextResponse } from 'next/server';
import { generatePayslipsForPeriod } from '@/lib/payslip-service';
import { createAdminClient } from '@/lib/supabase-admin';
import { renderPayslipPdf } from '@/lib/pdf';
import { sendPdfEmail } from '@/lib/email';

export const runtime = 'nodejs';

// 매월 10일 실행 → 지난 달 급여 명세서 생성 + 선생님에게 발송.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = prev.getMonth() + 1;

  const results = await generatePayslipsForPeriod(year, month);

  // 생성된 명세서 발송
  const db = createAdminClient();
  const { data: slips } = await db.from('payslips')
    .select('*, profiles(full_name, email), payslip_items(*)')
    .eq('period_year', year).eq('period_month', month);
  let sent = 0, failed = 0;
  for (const slip of slips ?? []) {
    const teacher: any = slip.profiles;
    if (!teacher?.email) { failed++; continue; }
    try {
      const pdf = await renderPayslipPdf({
        centerName: 'Kepler', teacherName: teacher.full_name || teacher.email,
        year, month, currency: slip.currency,
        items: (slip.payslip_items ?? []).map((it: any) => ({
          className: it.class_name, sessions: it.sessions,
          ratePerSession: Number(it.rate_per_session), amount: Number(it.amount),
        })),
        basePay: Number(slip.base_pay), allowance: Number(slip.allowance), manualAdjust: Number(slip.manual_adjust),
        employeeDeductions: slip.employee_deductions ?? [], employerContributions: slip.employer_contributions ?? [],
        totalSessions: slip.total_sessions, netPay: Number(slip.net_pay),
      });
      await sendPdfEmail({
        to: teacher.email, subject: `[Kepler] ${year}년 ${month}월 급여 명세서`,
        html: `<p>${teacher.full_name || ''} 선생님, ${month}월 급여 명세서를 첨부합니다.</p>`,
        filename: `payslip_${teacher.full_name || 'teacher'}_${year}-${month}.pdf`, pdf,
      });
      await db.from('payslips').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', slip.id);
      sent++;
    } catch { failed++; }
  }
  return NextResponse.json({ ok: true, period: { year, month }, generated: results.length, sent, failed });
}
