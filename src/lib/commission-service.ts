/**
 * commission-service.ts — 상담실장 성과급: DB 조회 + commission.ts 엔진 호출
 * payslip-service(급여 명세서)와 /commissions(실적 화면)가 같은 함수를 써서 숫자가 항상 일치한다.
 */
import { computeCommission, normalizeConfig, type CommissionResult, type CounselorStudent } from './commission';

export interface CounselorProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  hire_date: string | null;
  probation_months: number | null;
  commission_config: unknown;
}

export const COUNSELOR_COLS = 'id, full_name, email, hire_date, probation_months, commission_config';

export async function loadCounselorStudents(db: any, counselorId: string): Promise<CounselorStudent[]> {
  const { data, error } = await db.from('students')
    .select('id, name, program_type, enrolled_date, withdrawn_date')
    .eq('counselor_id', counselorId);
  if (error) throw error;
  return (data ?? []).map((s: any) => ({
    id: s.id, name: s.name,
    programType: s.program_type ?? null,
    enrolledDate: s.enrolled_date ?? null,
    withdrawnDate: s.withdrawn_date ?? null,
  }));
}

export async function commissionForCounselor(db: any, p: CounselorProfile, year: number, month: number): Promise<CommissionResult> {
  const students = await loadCounselorStudents(db, p.id);
  return computeCommission({
    year, month,
    hireDate: p.hire_date ?? null,
    probationMonths: p.probation_months ?? 3,
    config: normalizeConfig(p.commission_config),
    students,
  });
}

/** 상담실장이면 성과급 결과, 아니면 null */
export async function commissionForProfileId(db: any, profileId: string, year: number, month: number): Promise<CommissionResult | null> {
  const { data, error } = await db.from('profiles')
    .select(`${COUNSELOR_COLS}, is_counselor`).eq('id', profileId).single();
  if (error) throw error;
  if (!data?.is_counselor) return null;
  return commissionForCounselor(db, data as CounselorProfile, year, month);
}

/** 명세서/PDF 에 저장할 요약 (학생 목록 포함 → 지급 근거 스냅샷) */
export function commissionSnapshot(r: CommissionResult) {
  return {
    probation_end: r.probationEnd,
    in_probation: r.inProbationWholeMonth,
    new_intl: r.newIntl.map((x) => ({ name: x.name, date: x.date, amount: x.amount })),
    new_local: r.newLocal.map((x) => ({ name: x.name, date: x.date, amount: x.amount })),
    new_pay: r.newPay,
    goal_intl: r.goalIntl,
    goal_local: r.goalLocal,
    goal_pay: r.goalPay,
    retention: r.retention.map((x) => ({ name: x.name, date: x.date, program_type: x.programType, amount: x.amount })),
    retention_pay: r.retentionPay,
    missing_program_type: r.missingProgramType.map((x) => x.name),
    total: r.total,
  };
}
export type CommissionSnapshot = ReturnType<typeof commissionSnapshot>;
