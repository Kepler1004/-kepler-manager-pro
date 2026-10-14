/**
 * commission.ts — 상담실장(Counseling Manager) 성과급 계산 엔진 (순수 함수, DB 무관)
 *
 * 고용 조건:
 *  - 신규 등록: 본인 상담 후 등록 시 건당  국제반 RM50 / 로컬반 RM25
 *  - 목표 달성: 월간 신규 등록 10명 달성 시 국제반 RM300 / 로컬반 RM150 추가
 *  - 장기 유지: 상담으로 등록한 학생이 6개월 이상 재원 시 1인당 국제반 RM100 / 로컬반 RM50
 *  - 지급 시기: 해당 월 급여에 합산
 *  - 수습 3개월: 성과급 없음 (기본급 + 주유비만)
 *
 * 판정 기준(모두 'YYYY-MM-DD' 문자열, 말레이시아 날짜 기준):
 *  - 신규 등록: 등록일(enrolledDate)이 해당 월 안 + 수습 종료일 이후
 *  - 장기 유지: 등록일 + 6개월(= 유지 도달일)이 해당 월 안 + 수습 종료일 이후
 *               + 유지 도달일 이전에 퇴원하지 않음 (withdrawnDate 없음 또는 도달일 이후)
 *    → 학생 1명당 도달일은 단 하루이므로 같은 학생에게 두 번 지급되지 않는다.
 */

export type ProgramType = 'international' | 'local';
export type GoalMode = 'separate' | 'combined';

export interface CommissionConfig {
  intlNew: number;          // 신규 등록 건당 (국제반)
  localNew: number;         // 신규 등록 건당 (로컬반)
  goalThreshold: number;    // 목표 인원 (기본 10명)
  goalMode: GoalMode;       // separate: 국제반/로컬반 각각 10명 / combined: 합계 10명
  intlGoal: number;         // 목표 달성 보너스 (국제반)
  localGoal: number;        // 목표 달성 보너스 (로컬반)
  retentionMonths: number;  // 장기 유지 기준 개월 (기본 6)
  intlRetention: number;    // 장기 유지 1인당 (국제반)
  localRetention: number;   // 장기 유지 1인당 (로컬반)
}

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  intlNew: 50, localNew: 25,
  goalThreshold: 10, goalMode: 'separate', intlGoal: 300, localGoal: 150,
  retentionMonths: 6, intlRetention: 100, localRetention: 50,
};

/** DB jsonb(부분 값 가능) → 완전한 설정. 숫자가 아니거나 음수면 기본값 사용. */
export function normalizeConfig(raw: unknown): CommissionConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = (k: keyof CommissionConfig) => {
    const v = r[k];
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN;
    return Number.isFinite(n) && n >= 0 ? n : (DEFAULT_COMMISSION_CONFIG[k] as number);
  };
  return {
    intlNew: num('intlNew'), localNew: num('localNew'),
    goalThreshold: Math.max(1, Math.floor(num('goalThreshold'))),
    goalMode: r.goalMode === 'combined' ? 'combined' : 'separate',
    intlGoal: num('intlGoal'), localGoal: num('localGoal'),
    retentionMonths: Math.max(1, Math.floor(num('retentionMonths'))),
    intlRetention: num('intlRetention'), localRetention: num('localRetention'),
  };
}

export interface CounselorStudent {
  id: string;
  name: string;
  programType: ProgramType | null;
  enrolledDate: string | null;   // YYYY-MM-DD
  withdrawnDate: string | null;  // YYYY-MM-DD
}

export interface CommissionInput {
  year: number;
  month: number;                 // 1-12
  hireDate: string | null;       // 입사일 (없으면 수습 없음으로 간주)
  probationMonths: number;       // 기본 3
  config: CommissionConfig;
  students: CounselorStudent[];
}

export interface CommissionStudentLine {
  id: string; name: string; programType: ProgramType; date: string; amount: number;
}

export interface CommissionResult {
  probationEnd: string | null;      // 이 날짜부터 성과급 적용
  inProbationWholeMonth: boolean;   // 해당 월 전체가 수습 기간
  newIntl: CommissionStudentLine[];
  newLocal: CommissionStudentLine[];
  newPay: number;
  goalIntl: number;
  goalLocal: number;
  goalPay: number;
  retention: CommissionStudentLine[];
  retentionPay: number;
  excludedProbation: number;        // 수습 중이라 제외된 건수 (참고)
  missingProgramType: { id: string; name: string }[]; // 반 구분 미입력 학생 (지급 불가 → 확인 필요)
  total: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, '0');

export function isDate(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 'YYYY-MM-DD' + n개월. 말일 보정(1/31 + 1개월 = 2/28 또는 2/29). 타임존 영향 없음. */
export function addMonthsStr(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const idx = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return `${ny}-${pad(nm)}-${pad(nd)}`;
}

export function monthRange(year: number, month: number): { start: string; end: string } {
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}` };
}

/** 말레이시아(UTC+8) 오늘 날짜 'YYYY-MM-DD' */
export function todayMY(now: Date = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeCommission(input: CommissionInput): CommissionResult {
  const { year, month, config: c } = input;
  const { start, end } = monthRange(year, month);
  const probationEnd = isDate(input.hireDate)
    ? addMonthsStr(input.hireDate, Math.max(0, Math.floor(input.probationMonths || 0)))
    : null;
  const eligible = (d: string) => probationEnd === null || d >= probationEnd;
  const inMonth = (d: string) => d >= start && d <= end;

  const newIntl: CommissionStudentLine[] = [];
  const newLocal: CommissionStudentLine[] = [];
  const retention: CommissionStudentLine[] = [];
  const missingProgramType: { id: string; name: string }[] = [];
  let excludedProbation = 0;

  for (const s of input.students) {
    if (!isDate(s.enrolledDate)) continue;
    const pt = s.programType === 'international' || s.programType === 'local' ? s.programType : null;
    const withdrawn = isDate(s.withdrawnDate) ? s.withdrawnDate : null;

    // ── 신규 등록 ──
    if (inMonth(s.enrolledDate)) {
      if (!pt) missingProgramType.push({ id: s.id, name: s.name });
      else if (!eligible(s.enrolledDate)) excludedProbation++;
      else {
        const line = { id: s.id, name: s.name, programType: pt, date: s.enrolledDate,
          amount: pt === 'international' ? c.intlNew : c.localNew };
        (pt === 'international' ? newIntl : newLocal).push(line);
      }
    }

    // ── 장기 유지 ──
    const milestone = addMonthsStr(s.enrolledDate, c.retentionMonths);
    if (inMonth(milestone) && (withdrawn === null || withdrawn >= milestone)) {
      if (!pt) { if (!missingProgramType.some((x) => x.id === s.id)) missingProgramType.push({ id: s.id, name: s.name }); }
      else if (!eligible(milestone)) excludedProbation++;
      else retention.push({ id: s.id, name: s.name, programType: pt, date: milestone,
        amount: pt === 'international' ? c.intlRetention : c.localRetention });
    }
  }

  const byDate = (a: CommissionStudentLine, b: CommissionStudentLine) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name);
  newIntl.sort(byDate); newLocal.sort(byDate); retention.sort(byDate);

  const newPay = r2(newIntl.reduce((t, x) => t + x.amount, 0) + newLocal.reduce((t, x) => t + x.amount, 0));

  // ── 목표 달성 ──
  let goalIntl = 0, goalLocal = 0;
  const ni = newIntl.length, nl = newLocal.length;
  if (c.goalMode === 'separate') {
    if (ni >= c.goalThreshold) goalIntl = c.intlGoal;
    if (nl >= c.goalThreshold) goalLocal = c.localGoal;
  } else if (ni + nl >= c.goalThreshold) {
    // 합계로 달성 → 그 달 더 많이 등록한 반 기준 (동수면 국제반)
    if (ni >= nl) goalIntl = c.intlGoal; else goalLocal = c.localGoal;
  }
  const goalPay = r2(goalIntl + goalLocal);
  const retentionPay = r2(retention.reduce((t, x) => t + x.amount, 0));

  return {
    probationEnd,
    inProbationWholeMonth: probationEnd !== null && probationEnd > end,
    newIntl, newLocal, newPay, goalIntl, goalLocal, goalPay,
    retention, retentionPay, excludedProbation, missingProgramType,
    total: r2(newPay + goalPay + retentionPay),
  };
}
