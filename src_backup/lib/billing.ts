/**
 * billing.ts — Kepler-Manager-Pro 원비 계산 엔진 (순수 함수)
 * ------------------------------------------------------------------
 * 요구사항 6·7·8 구현:
 *  - 매월 20일에 "다음 달" 고지서를 만든다.
 *  - 수업 요일을 기준으로 그 달의 회차를 자동 계산한다.
 *  - 학생별로 미리 등록한 결석(planned absence)은 회차에서 뺀다.
 *  - 수업별 1회차 금액(unit_price)은 편집 가능하며 그대로 합산한다.
 *
 * 이 파일은 DB/네트워크에 의존하지 않는 순수 함수만 둔다 → 단위 테스트로 검증.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = 일요일 ... 6 = 토요일

export interface BillableClass {
  classId: string;
  className: string;
  dayOfWeek: Weekday;       // 수업 요일
  startTime: string;        // "16:00"
  endTime: string;          // "17:00"
  unitPrice: number;        // 1회차 금액 (RM) — 수업별로 편집됨
}

export interface PlannedAbsence {
  classId: string;
  date: string; // "YYYY-MM-DD" (해당 수업의 결석 날짜)
}

export interface InvoiceItem {
  classId: string;
  className: string;
  dayOfWeek: Weekday;
  timeLabel: string;       // "16:00–17:00"
  scheduledSessions: number; // 결석 차감 전 그 달 회차
  absentSessions: number;    // 차감된 회차
  sessions: number;          // 청구 회차 (scheduled - absent)
  unitPrice: number;
  amount: number;            // sessions * unitPrice
}

export interface Adjustment {
  label: string;   // "지난달 이월", "카드 수수료" 등
  amount: number;  // 가산(+) / 차감(-)
}

export interface ComputedInvoice {
  year: number;
  month: number; // 1-12
  items: InvoiceItem[];
  subtotal: number;
  adjustments: Adjustment[];
  total: number;
}

/** 청구 대상 월 = 발송 기준일의 "다음 달". 매월 20일 발송 규칙용. */
export function nextBillingPeriod(sendDate: Date): { year: number; month: number } {
  const y = sendDate.getFullYear();
  const m = sendDate.getMonth(); // 0-11
  const next = new Date(y, m + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

/** 특정 연/월에 주어진 요일이 몇 번 등장하는지 계산 (그 달의 총 회차). */
export function countWeekdayInMonth(year: number, month: number, weekday: Weekday): number {
  const last = new Date(year, month, 0).getDate(); // month는 1-12 → 0번째 날 = 이전달 마지막날 트릭
  let count = 0;
  for (let d = 1; d <= last; d++) {
    if (new Date(year, month - 1, d).getDay() === weekday) count++;
  }
  return count;
}

/** "YYYY-MM-DD" → {year, month} 추출 */
function ym(dateStr: string): { year: number; month: number } {
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y, month: m };
}

function timeLabel(start: string, end: string): string {
  return `${start}–${end}`;
}

/**
 * 한 학생의 한 달 고지서를 계산한다.
 * @param classes      그 학생이 수강 중인 수업 목록
 * @param absences     그 학생이 미리 등록한 결석들
 * @param period       청구 연/월
 * @param adjustments  이월/수수료 등 조정 항목
 */
export function computeStudentInvoice(
  classes: BillableClass[],
  absences: PlannedAbsence[],
  period: { year: number; month: number },
  adjustments: Adjustment[] = []
): ComputedInvoice {
  const items: InvoiceItem[] = classes.map((c) => {
    const scheduled = countWeekdayInMonth(period.year, period.month, c.dayOfWeek);

    // 이 수업에 대해, 청구 월에 해당하는 결석만 카운트
    const absent = absences.filter((a) => {
      if (a.classId !== c.classId) return false;
      const p = ym(a.date);
      return p.year === period.year && p.month === period.month;
    }).length;

    const sessions = Math.max(0, scheduled - absent);
    const amount = round2(sessions * c.unitPrice);

    return {
      classId: c.classId,
      className: c.className,
      dayOfWeek: c.dayOfWeek,
      timeLabel: timeLabel(c.startTime, c.endTime),
      scheduledSessions: scheduled,
      absentSessions: absent,
      sessions,
      unitPrice: c.unitPrice,
      amount,
    };
  });

  const subtotal = round2(items.reduce((s, it) => s + it.amount, 0));
  const adjTotal = round2(adjustments.reduce((s, a) => s + a.amount, 0));
  const total = round2(subtotal + adjTotal);

  return { year: period.year, month: period.month, items, subtotal, adjustments, total };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
