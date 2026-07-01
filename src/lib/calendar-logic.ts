/**
 * calendar-logic.ts — 결석 기반 캘린더 자동등록 결정 로직 (순수 함수)
 * ------------------------------------------------------------------
 * 요구사항 6의 핵심 규칙:
 *  - 미리 등록된 결석 날짜를 기준으로, 각 (수업, 날짜)에 대해 누가 결석/출석인지 판단.
 *  - 한 명이라도 출석하는 학생이 있으면 → 선생님은 와야 하므로 선생님 캘린더에 등록하지 않는다.
 *    대신 "일부 결석" 안내로 관리자 캘린더에만 등록.
 *  - 아무도 안 오면 → 선생님이 올 필요 없으므로 선생님 + 관리자 캘린더 모두에 "휴강" 등록.
 */

export type CalendarTarget = 'teacher' | 'admin';
export type CalendarEventKind = 'CLASS_CANCELLED' | 'PARTIAL_ABSENCE';

export interface ClassOccurrence {
  classId: string;
  className: string;
  teacherId: string;
  date: string;        // "YYYY-MM-DD"
  startTime: string;   // "16:00"
  endTime: string;     // "17:00"
  enrolledStudentIds: string[];
}

export interface AbsenceRecord {
  classId: string;
  studentId: string;
  date: string; // "YYYY-MM-DD"
}

export interface CalendarEventPlan {
  kind: CalendarEventKind;
  classId: string;
  className: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  targets: CalendarTarget[];   // 등록 대상 캘린더
  absentStudentIds: string[];
  attendingStudentIds: string[];
  title: string;
}

/**
 * 한 수업 발생(occurrence)에 대해 캘린더 등록 계획을 만든다.
 * 결석자가 한 명도 없으면 null (등록할 일 없음).
 */
export function planCalendarForOccurrence(
  occ: ClassOccurrence,
  absences: AbsenceRecord[]
): CalendarEventPlan | null {
  const absentSet = new Set(
    absences
      .filter((a) => a.classId === occ.classId && a.date === occ.date)
      .map((a) => a.studentId)
  );

  const absentStudentIds = occ.enrolledStudentIds.filter((id) => absentSet.has(id));
  const attendingStudentIds = occ.enrolledStudentIds.filter((id) => !absentSet.has(id));

  // 결석이 전혀 없으면 캘린더에 표시할 필요 없음
  if (absentStudentIds.length === 0) return null;

  const everyoneAbsent = attendingStudentIds.length === 0;

  if (everyoneAbsent) {
    // 아무도 안 옴 → 선생님 + 관리자 모두 등록 (선생님 휴강)
    return {
      kind: 'CLASS_CANCELLED',
      classId: occ.classId,
      className: occ.className,
      teacherId: occ.teacherId,
      date: occ.date,
      startTime: occ.startTime,
      endTime: occ.endTime,
      targets: ['teacher', 'admin'],
      absentStudentIds,
      attendingStudentIds,
      title: `[휴강] ${occ.className} — 전원 결석`,
    };
  }

  // 한 명이라도 출석 → 선생님은 와야 함 → 관리자만 등록
  return {
    kind: 'PARTIAL_ABSENCE',
    classId: occ.classId,
    className: occ.className,
    teacherId: occ.teacherId,
    date: occ.date,
    startTime: occ.startTime,
    endTime: occ.endTime,
    targets: ['admin'],
    absentStudentIds,
    attendingStudentIds,
    title: `[일부결석] ${occ.className} — 결석 ${absentStudentIds.length}명 / 출석 ${attendingStudentIds.length}명`,
  };
}

/** 여러 occurrence를 한 번에 처리 */
export function planCalendarEvents(
  occurrences: ClassOccurrence[],
  absences: AbsenceRecord[]
): CalendarEventPlan[] {
  const plans: CalendarEventPlan[] = [];
  for (const occ of occurrences) {
    const plan = planCalendarForOccurrence(occ, absences);
    if (plan) plans.push(plan);
  }
  return plans;
}
