/**
 * invoice-service.ts — 고지서 생성 (Supabase) + 복수요일 + 공휴일.
 * 재생성 시 납부 상태(status / paid_at / paid_amount / sent_at)를 보존합니다.
 */
import { createAdminClient } from './supabase-admin';
import { computeStudentInvoice, type BillableClass, type PlannedAbsence, type Weekday } from './billing';

export interface GenerateResult { studentId: string; invoiceId: string; total: number; }

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
function dayLabel(days: number[]): string {
  return [...days].sort((a, b) => a - b).map((d) => DOW_KO[d]).join('·');
}

async function loadHolidays(db: any, year: number, month: number): Promise<string[]> {
  const mm = String(month).padStart(2, '0');
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  const { data } = await db.from('holidays').select('holiday_date').gte('holiday_date', start).lte('holiday_date', end);
  return (data ?? []).map((h: any) => h.holiday_date);
}

export async function generateInvoiceForStudent(
  studentId: string, year: number, month: number, holidays?: string[]
): Promise<GenerateResult | null> {
  const db = createAdminClient();

  const { data: enrolls, error: e1 } = await db
    .from('enrollments')
    .select('class_id, classes(id, name, day_of_week, days, start_time, end_time, session_price, billing_type, monthly_fee, is_active)')
    .eq('student_id', studentId).eq('status', 'active');
  if (e1) throw e1;

  const classes: BillableClass[] = (enrolls ?? [])
    .map((r: any) => r.classes).filter((c: any) => c && c.is_active)
    .map((c: any) => {
      const days: Weekday[] = (c.days && c.days.length ? c.days : [c.day_of_week]) as Weekday[];
      return {
        classId: c.id, className: c.name, daysOfWeek: days,
        startTime: String(c.start_time).slice(0, 5), endTime: String(c.end_time).slice(0, 5),
        unitPrice: Number(c.session_price),
        billingType: c.billing_type ?? 'per_session',
        monthlyFee: c.monthly_fee != null ? Number(c.monthly_fee) : undefined,
      };
    });
  if (classes.length === 0) return null;

  const { data: abs, error: e2 } = await db
    .from('planned_absences').select('class_id, absence_date').eq('student_id', studentId);
  if (e2) throw e2;
  const absences: PlannedAbsence[] = (abs ?? []).map((a: any) => ({ classId: a.class_id, date: a.absence_date }));

  const hol = holidays ?? (await loadHolidays(db, year, month));
  const computed = computeStudentInvoice(classes, absences, hol, { year, month });

  // 지난달 미납분 자동 이월
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const { data: prev } = await db
    .from('invoices')
    .select('total, status')
    .eq('student_id', studentId).eq('period_year', prevYear).eq('period_month', prevMonth)
    .maybeSingle();
  if (prev && prev.status !== 'paid') {
    const outstanding = Number(prev.total) || 0;
    if (outstanding > 0) {
      computed.adjustments = [
        ...computed.adjustments,
        { label: `${prevYear}.${prevMonth} 미납분 이월`, amount: outstanding },
      ];
      computed.total = computed.subtotal
        + computed.adjustments.reduce((sm, a) => sm + Number(a.amount), 0);
    }
  }

  // 납부 상태 보존: 기존 고지서가 있으면 계산값만 갱신, 없으면 draft 로 신규 생성
  const { data: existing } = await db
    .from('invoices')
    .select('id')
    .eq('student_id', studentId).eq('period_year', year).eq('period_month', month)
    .maybeSingle();

  let invoiceId: string;
  if (existing) {
    const { data: upd, error: e3 } = await db
      .from('invoices')
      .update({
        subtotal: computed.subtotal,
        adjustments: computed.adjustments,
        total: computed.total,
      })
      .eq('id', existing.id)
      .select('id').single();
    if (e3) throw e3;
    invoiceId = upd.id;
  } else {
    const { data: ins, error: e3 } = await db
      .from('invoices')
      .insert({
        student_id: studentId, period_year: year, period_month: month, status: 'draft',
        subtotal: computed.subtotal, adjustments: computed.adjustments, total: computed.total,
      })
      .select('id').single();
    if (e3) throw e3;
    invoiceId = ins.id;
  }

  await db.from('invoice_items').delete().eq('invoice_id', invoiceId);
  if (computed.items.length) {
    const rows = computed.items.map((it) => ({
      invoice_id: invoiceId, class_id: it.classId, class_name: it.className,
      day_of_week: it.daysOfWeek[0] ?? 0, day_label: dayLabel(it.daysOfWeek),
      time_label: it.timeLabel,
      scheduled_sessions: it.scheduledSessions, holiday_sessions: it.holidaySessions, absent_sessions: it.absentSessions,
      sessions: it.sessions, unit_price: it.unitPrice, amount: it.amount,
    }));
    const { error: e4 } = await db.from('invoice_items').insert(rows);
    if (e4) throw e4;
  }
  return { studentId, invoiceId, total: computed.total };
}

export async function generateInvoicesForPeriod(year: number, month: number) {
  const db = createAdminClient();
  const holidays = await loadHolidays(db, year, month);
  const { data: students, error } = await db.from('students').select('id').eq('status', 'active');
  if (error) throw error;
  const results: GenerateResult[] = [];
  for (const s of students ?? []) {
    const r = await generateInvoiceForStudent(s.id, year, month, holidays);
    if (r) results.push(r);
  }
  return results;
}


/** 해당 학생·연·월 고지서가 이미 있을 때만 재계산. 없으면 아무 것도 안 함. */
export async function regenerateInvoiceIfExists(
  studentId: string, year: number, month: number
): Promise<GenerateResult | null> {
  const db = createAdminClient();
  const { data: existing } = await db
    .from('invoices')
    .select('id')
    .eq('student_id', studentId).eq('period_year', year).eq('period_month', month)
    .maybeSingle();
  if (!existing) return null;
  return generateInvoiceForStudent(studentId, year, month);
}
