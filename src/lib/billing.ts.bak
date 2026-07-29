/**
 * billing.ts — 원비 계산 엔진 (순수 함수)
 * 요구사항 6·7·8 + 복수 요일 + 공휴일 차감.
 *  - 수업 1개가 여러 요일을 가짐(daysOfWeek). 하루치 수업 = 1회차.
 *  - 그 달 회차 = 등록 요일들이 그 달에 등장하는 날 수.
 *  - 공휴일(holidays)과 겹치는 수업일은 회차에서 자동 제외 (전체 공통).
 *  - 학생별 사전 결석(absences)은 남은 수업일에서 추가 차감.
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=일 ... 6=토

export interface BillableClass {
  classId: string;
  className: string;
  daysOfWeek: Weekday[];   // 복수 요일
  startTime: string;
  endTime: string;
  unitPrice: number;       // 1회차(하루) 단가
  billingType?: 'per_session' | 'flat_monthly'; // 기본 회차제
  monthlyFee?: number;     // 월정액일 때 고정 금액
}

export interface PlannedAbsence { classId: string; date: string; } // 'YYYY-MM-DD'

export interface InvoiceItem {
  classId: string;
  className: string;
  daysOfWeek: Weekday[];
  timeLabel: string;
  scheduledSessions: number; // 공휴일/결석 차감 전
  holidaySessions: number;   // 공휴일로 빠진 수
  absentSessions: number;    // 사전 결석으로 빠진 수
  sessions: number;          // 청구 회차
  unitPrice: number;
  amount: number;
}

export interface Adjustment { label: string; amount: number; }

export interface ComputedInvoice {
  year: number; month: number;
  items: InvoiceItem[];
  subtotal: number;
  adjustments: Adjustment[];
  total: number;
}

export function nextBillingPeriod(sendDate: Date): { year: number; month: number } {
  const next = new Date(sendDate.getFullYear(), sendDate.getMonth() + 1, 1);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

function pad(n: number) { return String(n).padStart(2, '0'); }

/** 그 달에서 주어진 요일들에 해당하는 모든 날짜('YYYY-MM-DD') */
export function listClassDatesInMonth(year: number, month: number, days: Weekday[]): string[] {
  const set = new Set(days);
  const last = new Date(year, month, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    const wd = new Date(year, month - 1, d).getDay() as Weekday;
    if (set.has(wd)) out.push(`${year}-${pad(month)}-${pad(d)}`);
  }
  return out;
}

/** 단일 요일 등장 횟수(하위호환/유틸) */
export function countWeekdayInMonth(year: number, month: number, weekday: Weekday): number {
  return listClassDatesInMonth(year, month, [weekday]).length;
}

function timeLabel(s: string, e: string) { return `${s}–${e}`; }

export function computeStudentInvoice(
  classes: BillableClass[],
  absences: PlannedAbsence[],
  holidays: string[],                    // 공휴일 날짜 목록
  period: { year: number; month: number },
  adjustments: Adjustment[] = []
): ComputedInvoice {
  const holidaySet = new Set(holidays);

  const items: InvoiceItem[] = classes.map((c) => {
    if (c.billingType === 'flat_monthly') {
      const amount = round2(c.monthlyFee ?? 0);
      return {
        classId: c.classId, className: c.className, daysOfWeek: c.daysOfWeek,
        timeLabel: timeLabel(c.startTime, c.endTime),
        scheduledSessions: 0, holidaySessions: 0, absentSessions: 0,
        sessions: 0, unitPrice: amount, amount,
      };
    }
    const classDates = listClassDatesInMonth(period.year, period.month, c.daysOfWeek);
    const afterHolidays = classDates.filter((d) => !holidaySet.has(d));

    const absentDates = new Set(
      absences.filter((a) => a.classId === c.classId).map((a) => a.date)
    );
    // 결석은 "실제 수업이 있는 날(공휴일 제외 후)" 중에서만 차감
    const absent = afterHolidays.filter((d) => absentDates.has(d)).length;

    const scheduled = classDates.length;
    const holidayCnt = classDates.length - afterHolidays.length;
    const sessions = Math.max(0, afterHolidays.length - absent);
    const amount = round2(sessions * c.unitPrice);

    return {
      classId: c.classId, className: c.className, daysOfWeek: c.daysOfWeek,
      timeLabel: timeLabel(c.startTime, c.endTime),
      scheduledSessions: scheduled, holidaySessions: holidayCnt,
      absentSessions: absent, sessions, unitPrice: c.unitPrice, amount,
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
