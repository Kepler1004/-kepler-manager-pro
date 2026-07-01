/**
 * calendar-service.ts — 결석 → 캘린더 자동등록 (Supabase). 요구사항 6.
 * 순수 로직(calendar-logic.ts)으로 대상(선생님/관리자) 결정 후 저장.
 */
import { createAdminClient } from './supabase-admin';
import { planCalendarEvents, type ClassOccurrence, type AbsenceRecord } from './calendar-logic';

export async function syncCalendarForPeriod(year: number, month: number) {
  const db = createAdminClient();
  const mm = String(month).padStart(2, '0');
  const start = `${year}-${mm}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const end = `${year}-${mm}-${String(endDay).padStart(2, '0')}`;

  const { data: absRows, error: e1 } = await db
    .from('planned_absences').select('class_id, student_id, absence_date')
    .gte('absence_date', start).lte('absence_date', end);
  if (e1) throw e1;
  const absences: AbsenceRecord[] = (absRows ?? []).map((a: any) => ({ classId: a.class_id, studentId: a.student_id, date: a.absence_date }));
  if (absences.length === 0) return [];

  const classIds = [...new Set(absences.map((a) => a.classId))];
  const { data: classes, error: e2 } = await db
    .from('classes').select('id, name, teacher_id, start_time, end_time').in('id', classIds);
  if (e2) throw e2;
  const classMap = new Map((classes ?? []).map((c: any) => [c.id, c]));

  const { data: enrolls, error: e3 } = await db
    .from('enrollments').select('class_id, student_id').in('class_id', classIds).eq('status', 'active');
  if (e3) throw e3;
  const enrolledByClass = new Map<string, string[]>();
  for (const r of enrolls ?? []) {
    const arr = enrolledByClass.get(r.class_id) ?? []; arr.push(r.student_id); enrolledByClass.set(r.class_id, arr);
  }

  const seen = new Set<string>();
  const occurrences: ClassOccurrence[] = [];
  for (const a of absences) {
    const key = `${a.classId}|${a.date}`; if (seen.has(key)) continue; seen.add(key);
    const c: any = classMap.get(a.classId); if (!c) continue;
    occurrences.push({
      classId: c.id, className: c.name, teacherId: c.teacher_id ?? '',
      date: a.date, startTime: String(c.start_time).slice(0, 5), endTime: String(c.end_time).slice(0, 5),
      enrolledStudentIds: enrolledByClass.get(c.id) ?? [],
    });
  }

  const plans = planCalendarEvents(occurrences, absences);
  await db.from('calendar_events').delete().gte('event_date', start).lte('event_date', end);
  const rows = plans.flatMap((p) => p.targets.map((target) => ({
    kind: p.kind, class_id: p.classId, teacher_id: p.teacherId || null, target,
    event_date: p.date, start_time: p.startTime, end_time: p.endTime, title: p.title,
    absent_student_ids: p.absentStudentIds, attending_student_ids: p.attendingStudentIds, pushed_to_google: false,
  })));
  if (rows.length) { const { error: e4 } = await db.from('calendar_events').insert(rows); if (e4) throw e4; }

  await pushToGoogle(year, month);
  return plans;
}

async function pushToGoogle(_year: number, _month: number) {
  if (!process.env.GOOGLE_CALENDAR_CLIENT_EMAIL) return;
  // TODO: googleapis calendar.events.insert
}
