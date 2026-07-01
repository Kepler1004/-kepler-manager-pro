/**
 * invoice-service.ts — 고지서 생성 (Supabase). 순수 엔진(billing.ts) 호출 후 저장.
 * 요구사항 5,6,7,8 + 매월 20일 자동 생성.
 */
import { createAdminClient } from './supabase-admin';
import { computeStudentInvoice, type BillableClass, type PlannedAbsence, type Weekday } from './billing';

export interface GenerateResult { studentId: string; invoiceId: string; total: number; }

export async function generateInvoiceForStudent(studentId: string, year: number, month: number): Promise<GenerateResult | null> {
  const db = createAdminClient();

  const { data: enrolls, error: e1 } = await db
    .from('enrollments')
    .select('class_id, classes(id, name, day_of_week, start_time, end_time, session_price, is_active)')
    .eq('student_id', studentId).eq('status', 'active');
  if (e1) throw e1;

  const classes: BillableClass[] = (enrolls ?? [])
    .map((r: any) => r.classes).filter((c: any) => c && c.is_active)
    .map((c: any) => ({
      classId: c.id, className: c.name, dayOfWeek: c.day_of_week as Weekday,
      startTime: String(c.start_time).slice(0, 5), endTime: String(c.end_time).slice(0, 5),
      unitPrice: Number(c.session_price),
    }));
  if (classes.length === 0) return null;

  const { data: abs, error: e2 } = await db
    .from('planned_absences').select('class_id, absence_date').eq('student_id', studentId);
  if (e2) throw e2;
  const absences: PlannedAbsence[] = (abs ?? []).map((a: any) => ({ classId: a.class_id, date: a.absence_date }));

  const computed = computeStudentInvoice(classes, absences, { year, month });

  const { data: inv, error: e3 } = await db
    .from('invoices')
    .upsert({
      student_id: studentId, period_year: year, period_month: month, status: 'draft',
      subtotal: computed.subtotal, adjustments: computed.adjustments, total: computed.total,
    }, { onConflict: 'student_id,period_year,period_month' })
    .select('id').single();
  if (e3) throw e3;

  await db.from('invoice_items').delete().eq('invoice_id', inv.id);
  if (computed.items.length) {
    const rows = computed.items.map((it) => ({
      invoice_id: inv.id, class_id: it.classId, class_name: it.className,
      day_of_week: it.dayOfWeek, time_label: it.timeLabel,
      scheduled_sessions: it.scheduledSessions, absent_sessions: it.absentSessions,
      sessions: it.sessions, unit_price: it.unitPrice, amount: it.amount,
    }));
    const { error: e4 } = await db.from('invoice_items').insert(rows);
    if (e4) throw e4;
  }
  return { studentId, invoiceId: inv.id, total: computed.total };
}

export async function generateInvoicesForPeriod(year: number, month: number) {
  const db = createAdminClient();
  const { data: students, error } = await db.from('students').select('id').eq('status', 'active');
  if (error) throw error;
  const results: GenerateResult[] = [];
  for (const s of students ?? []) {
    const r = await generateInvoiceForStudent(s.id, year, month);
    if (r) results.push(r);
  }
  return results;
}
