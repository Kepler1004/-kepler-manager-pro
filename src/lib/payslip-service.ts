/**
 * payslip-service.ts — 급여 명세서 생성/재계산 (Supabase) + 공제(payroll).
 */
import { createAdminClient } from './supabase-admin';
import { round2 } from './billing';
import { computePayroll, type PayrollConfig, type EmploymentType } from './payroll';

interface LineItem { class_id: string; class_name: string; sessions: number; rate_per_session: number; amount: number; }

async function loadTeacherPayroll(db: any, teacherId: string) {
  const { data } = await db.from('profiles')
    .select('employment_type, fixed_base_salary, allowance, payroll_config').eq('id', teacherId).single();
  return {
    employmentType: (data?.employment_type ?? 'freelancer') as EmploymentType,
    fixedBaseSalary: Number(data?.fixed_base_salary ?? 0),
    allowance: Number(data?.allowance ?? 0),
    config: (data?.payroll_config ?? {}) as PayrollConfig,
  };
}

async function classSessionLines(db: any, teacherId: string, year: number, month: number): Promise<LineItem[]> {
  const { data: classes } = await db.from('classes').select('id, name').eq('teacher_id', teacherId);
  const classIds = (classes ?? []).map((c: any) => c.id);
  if (!classIds.length) return [];
  const nameById = new Map((classes ?? []).map((c: any) => [c.id, c.name]));

  const { data: salaries } = await db.from('teacher_salaries')
    .select('class_id, rate_per_session').eq('teacher_id', teacherId).in('class_id', classIds);
  const rateById = new Map((salaries ?? []).map((s: any) => [s.class_id, Number(s.rate_per_session)]));

  const { data: items } = await db.from('invoice_items')
    .select('class_id, sessions, invoices!inner(period_year, period_month)')
    .in('class_id', classIds).eq('invoices.period_year', year).eq('invoices.period_month', month);

  const byClass = new Map<string, number>();
  for (const it of items ?? []) byClass.set(it.class_id, (byClass.get(it.class_id) ?? 0) + Number(it.sessions));

  return classIds.map((cid: string) => {
    const sessions = byClass.get(cid) ?? 0;
    const rate = Number(rateById.get(cid) ?? 0);
    return { class_id: cid, class_name: nameById.get(cid) as string, sessions, rate_per_session: rate, amount: round2(sessions * rate) };
  }).filter((li: LineItem) => li.sessions > 0);
}

async function persist(db: any, teacherId: string, year: number, month: number,
  lineItems: LineItem[], pr: ReturnType<typeof computePayroll>,
  meta: { employmentType: string; allowance: number; manualAdjust: number; sessionPay: number }) {
  const totalSessions = lineItems.reduce((s, li) => s + li.sessions, 0);
  const { data: slip, error } = await db.from('payslips').upsert({
    teacher_id: teacherId, period_year: year, period_month: month, status: 'draft',
    total_sessions: totalSessions, total_amount: meta.sessionPay,
    employment_type: meta.employmentType, base_pay: pr.basePay,
    allowance: meta.allowance, manual_adjust: meta.manualAdjust,
    employee_deductions: pr.employeeDeductions, employer_contributions: pr.employerContributions,
    total_employee_deduction: pr.totalEmployeeDeduction,
    total_employer_contribution: pr.totalEmployerContribution, net_pay: pr.netPay,
  }, { onConflict: 'teacher_id,period_year,period_month' }).select('id').single();
  if (error) throw error;

  await db.from('payslip_items').delete().eq('payslip_id', slip.id);
  if (lineItems.length) await db.from('payslip_items').insert(lineItems.map((li) => ({ ...li, payslip_id: slip.id })));
  return slip.id as string;
}

export async function generatePayslipForTeacher(teacherId: string, year: number, month: number) {
  const db = createAdminClient();
  const pay = await loadTeacherPayroll(db, teacherId);
  const lineItems = await classSessionLines(db, teacherId, year, month);
  const sessionPay = round2(lineItems.reduce((s, li) => s + li.amount, 0));

  // 기존 명세서의 인센티브/보정 보존
  const { data: existing } = await db.from('payslips')
    .select('allowance, manual_adjust').eq('teacher_id', teacherId)
    .eq('period_year', year).eq('period_month', month).maybeSingle();
  const allowance = existing ? Number(existing.allowance) : pay.allowance;
  const manualAdjust = existing ? Number(existing.manual_adjust) : 0;

  // 고정급 아닌데 수업/지원금/보정 전부 0이면 스킵
  if (pay.employmentType !== 'salaried_fixed' && sessionPay === 0 && allowance === 0 && manualAdjust === 0) return null;

  const pr = computePayroll({
    employmentType: pay.employmentType, sessionPay, fixedBaseSalary: pay.fixedBaseSalary,
    allowance, manualAdjust, config: pay.config,
  });
  const id = await persist(db, teacherId, year, month, lineItems, pr,
    { employmentType: pay.employmentType, allowance, manualAdjust, sessionPay });
  return { teacherId, payslipId: id, netPay: pr.netPay };
}

export async function generatePayslipsForPeriod(year: number, month: number) {
  const db = createAdminClient();
  const { data: teachers, error } = await db.from('profiles').select('id').in('role', ['teacher', 'admin', 'admin_b']).eq('is_active', true);
  if (error) throw error;
  const results = [];
  for (const t of teachers ?? []) {
    const r = await generatePayslipForTeacher(t.id, year, month);
    if (r) results.push(r);
  }
  return results;
}

/** 관리자 수동 보정: 회차(items) + 보정액(manualAdjust) 반영 후 공제 재계산 */
export async function recomputePayslip(
  payslipId: string,
  opts: { items: { class_id: string; class_name: string; sessions: number; rate_per_session: number }[]; manualAdjust: number }
) {
  const db = createAdminClient();
  const { data: slip } = await db.from('payslips')
    .select('teacher_id, period_year, period_month, allowance').eq('id', payslipId).single();
  if (!slip) throw new Error('payslip not found');
  const pay = await loadTeacherPayroll(db, slip.teacher_id);

  const lineItems: LineItem[] = opts.items.map((it) => ({
    class_id: it.class_id, class_name: it.class_name,
    sessions: Number(it.sessions), rate_per_session: Number(it.rate_per_session),
    amount: round2(Number(it.sessions) * Number(it.rate_per_session)),
  }));
  const sessionPay = round2(lineItems.reduce((s, li) => s + li.amount, 0));
  const allowance = Number(slip.allowance);
  const manualAdjust = round2(opts.manualAdjust);

  const pr = computePayroll({
    employmentType: pay.employmentType, sessionPay, fixedBaseSalary: pay.fixedBaseSalary,
    allowance, manualAdjust, config: pay.config,
  });
  await persist(db, slip.teacher_id, slip.period_year, slip.period_month, lineItems, pr,
    { employmentType: pay.employmentType, allowance, manualAdjust, sessionPay });
  return { netPay: pr.netPay };
}
