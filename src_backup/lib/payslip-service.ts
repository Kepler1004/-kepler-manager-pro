/**
 * payslip-service.ts — 선생님 급여 명세서 (Supabase). 요구사항 9,10.
 * 지난달 실제 청구 회차(invoice_items.sessions) × 선생님×수업 1회 급여.
 */
import { createAdminClient } from './supabase-admin';
import { round2 } from './billing';

export async function generatePayslipForTeacher(teacherId: string, year: number, month: number) {
  const db = createAdminClient();

  const { data: classes, error: e1 } = await db.from('classes').select('id, name').eq('teacher_id', teacherId);
  if (e1) throw e1;
  if (!classes || classes.length === 0) return null;
  const classIds = classes.map((c) => c.id);
  const nameById = new Map(classes.map((c) => [c.id, c.name]));

  const { data: salaries, error: e2 } = await db
    .from('teacher_salaries').select('class_id, rate_per_session')
    .eq('teacher_id', teacherId).in('class_id', classIds);
  if (e2) throw e2;
  const rateById = new Map((salaries ?? []).map((s) => [s.class_id, Number(s.rate_per_session)]));

  const { data: items, error: e3 } = await db
    .from('invoice_items')
    .select('class_id, sessions, invoices!inner(period_year, period_month)')
    .in('class_id', classIds)
    .eq('invoices.period_year', year).eq('invoices.period_month', month);
  if (e3) throw e3;

  const sessionsByClass = new Map<string, number>();
  for (const it of items ?? []) {
    sessionsByClass.set(it.class_id, (sessionsByClass.get(it.class_id) ?? 0) + Number(it.sessions));
  }

  const lineItems = classIds.map((cid) => {
    const sessions = sessionsByClass.get(cid) ?? 0;
    const rate = rateById.get(cid) ?? 0;
    return { class_id: cid, class_name: nameById.get(cid)!, sessions, rate_per_session: rate, amount: round2(sessions * rate) };
  }).filter((li) => li.sessions > 0);

  const totalSessions = lineItems.reduce((s, li) => s + li.sessions, 0);
  const totalAmount = round2(lineItems.reduce((s, li) => s + li.amount, 0));

  const { data: slip, error: e4 } = await db
    .from('payslips')
    .upsert({
      teacher_id: teacherId, period_year: year, period_month: month, status: 'draft',
      total_sessions: totalSessions, total_amount: totalAmount,
    }, { onConflict: 'teacher_id,period_year,period_month' })
    .select('id').single();
  if (e4) throw e4;

  await db.from('payslip_items').delete().eq('payslip_id', slip.id);
  if (lineItems.length) {
    const { error: e5 } = await db.from('payslip_items').insert(lineItems.map((li) => ({ ...li, payslip_id: slip.id })));
    if (e5) throw e5;
  }
  return { teacherId, payslipId: slip.id, totalAmount, totalSessions };
}

export async function generatePayslipsForPeriod(year: number, month: number) {
  const db = createAdminClient();
  const { data: teachers, error } = await db.from('profiles').select('id').eq('role', 'teacher').eq('is_active', true);
  if (error) throw error;
  const results = [];
  for (const t of teachers ?? []) {
    const r = await generatePayslipForTeacher(t.id, year, month);
    if (r) results.push(r);
  }
  return results;
}
