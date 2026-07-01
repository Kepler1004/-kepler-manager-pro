import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { renderPayslipPdf } from '@/lib/pdf';
import { sendPdfEmail } from '@/lib/email';
import { getCurrentProfile, isStaff } from '@/lib/guards';

export const runtime = 'nodejs';

async function sendOne(db: any, slip: any): Promise<boolean> {
  const teacher = slip.profiles;
  if (!teacher?.email) return false;
  const pdf = await renderPayslipPdf({
    centerName: 'Kepler', teacherName: teacher.full_name || teacher.email,
    year: slip.period_year, month: slip.period_month, currency: slip.currency,
    items: (slip.payslip_items ?? []).map((it: any) => ({
      className: it.class_name, sessions: it.sessions,
      ratePerSession: Number(it.rate_per_session), amount: Number(it.amount),
    })),
    basePay: Number(slip.base_pay), allowance: Number(slip.allowance),
    manualAdjust: Number(slip.manual_adjust),
    employeeDeductions: slip.employee_deductions ?? [],
    employerContributions: slip.employer_contributions ?? [],
    totalSessions: slip.total_sessions, netPay: Number(slip.net_pay),
  });
  await sendPdfEmail({
    to: teacher.email,
    subject: `[Kepler] ${slip.period_year}년 ${slip.period_month}월 급여 명세서`,
    html: `<p>${teacher.full_name || ''} 선생님, ${slip.period_month}월 급여 명세서를 첨부합니다.</p>`,
    filename: `payslip_${teacher.full_name || 'teacher'}_${slip.period_year}-${slip.period_month}.pdf`,
    pdf,
  });
  await db.from('payslips').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', slip.id);
  return true;
}

const SEL = '*, profiles(full_name, email), payslip_items(*)';

// POST { payslipId } (개별) 또는 { year, month } (일괄)
export async function POST(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!isStaff(me?.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const db = createAdminClient();

  if (body.payslipId) {
    const { data: slip, error } = await db.from('payslips').select(SEL).eq('id', body.payslipId).single();
    if (error || !slip) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const ok = await sendOne(db, slip);
    return NextResponse.json({ ok, sent: ok ? 1 : 0, failed: ok ? 0 : 1 });
  }

  if (body.year && body.month) {
    const { data: slips } = await db.from('payslips').select(SEL)
      .eq('period_year', body.year).eq('period_month', body.month);
    let sent = 0, failed = 0;
    for (const s of slips ?? []) {
      try { (await sendOne(db, s)) ? sent++ : failed++; } catch { failed++; }
    }
    return NextResponse.json({ ok: true, sent, failed });
  }

  return NextResponse.json({ error: 'payslipId or year/month required' }, { status: 400 });
}
