/**
 * payroll.ts — 급여 공제 계산 엔진 (순수 함수)
 * 말레이시아: fulltime/salaried_fixed → PCB/EPF/SOCSO/EIS 공제(기본급 기준). freelancer → 공제 없음.
 * 설정(payroll_config)은 항목별 { type:'percent'|'fixed', value }.
 */
export type EmploymentType = 'fulltime' | 'salaried_fixed' | 'freelancer';
export interface Setting { type: 'percent' | 'fixed'; value: number; }
export type PayrollConfig = Partial<Record<
  'pcb' | 'epfEmployee' | 'epfEmployer' | 'socsoEmployee' | 'socsoEmployer' | 'eisEmployee' | 'eisEmployer',
  Setting
>>;

export interface PayrollInput {
  employmentType: EmploymentType;
  sessionPay: number;        // 그 달 수업료 합계
  fixedBaseSalary?: number;  // salaried_fixed 기본급
  allowance?: number;        // 인센티브/지원금 (+), 공제 대상 아님
  manualAdjust?: number;     // 관리자 수동 보정 (+/-)
  config?: PayrollConfig;
}

export interface Labeled { label: string; amount: number; }
export interface PayrollResult {
  basePay: number;
  employeeDeductions: Labeled[];
  employerContributions: Labeled[];
  totalEmployeeDeduction: number;
  totalEmployerContribution: number;
  netPay: number;
}

const LABELS: Record<string, string> = {
  pcb: 'PCB', epfEmployee: 'EPF (본인)', epfEmployer: 'EPF (회사)',
  socsoEmployee: 'SOCSO (본인)', socsoEmployer: 'SOCSO (회사)',
  eisEmployee: 'EIS (본인)', eisEmployer: 'EIS (회사)',
};

function calc(base: number, s?: Setting): number {
  if (!s || !s.value) return 0;
  return round2(s.type === 'percent' ? base * s.value / 100 : s.value);
}

export function computePayroll(input: PayrollInput): PayrollResult {
  const { employmentType, sessionPay } = input;
  const allowance = input.allowance ?? 0;
  const manualAdjust = input.manualAdjust ?? 0;
  const cfg = input.config ?? {};

  const basePay = employmentType === 'salaried_fixed'
    ? round2(input.fixedBaseSalary ?? 0)
    : round2(sessionPay);

  if (employmentType === 'freelancer') {
    return {
      basePay, employeeDeductions: [], employerContributions: [],
      totalEmployeeDeduction: 0, totalEmployerContribution: 0,
      netPay: round2(basePay + allowance + manualAdjust),
    };
  }

  const empKeys: (keyof PayrollConfig)[] = ['pcb', 'epfEmployee', 'socsoEmployee', 'eisEmployee'];
  const erKeys: (keyof PayrollConfig)[] = ['epfEmployer', 'socsoEmployer', 'eisEmployer'];

  const employeeDeductions: Labeled[] = empKeys
    .map((k) => ({ label: LABELS[k], amount: calc(basePay, cfg[k]) }))
    .filter((x) => x.amount !== 0);
  const employerContributions: Labeled[] = erKeys
    .map((k) => ({ label: LABELS[k], amount: calc(basePay, cfg[k]) }))
    .filter((x) => x.amount !== 0);

  const totalEmployeeDeduction = round2(employeeDeductions.reduce((t, d) => t + d.amount, 0));
  const totalEmployerContribution = round2(employerContributions.reduce((t, d) => t + d.amount, 0));
  const netPay = round2(basePay + allowance + manualAdjust - totalEmployeeDeduction);

  return { basePay, employeeDeductions, employerContributions, totalEmployeeDeduction, totalEmployerContribution, netPay };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
