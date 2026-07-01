/**
 * calendar-service.ts — 결석 → 캘린더 자동등록 (Supabase + Google Calendar). 요구사항 6.
 * 순수 로직(calendar-logic.ts)으로 대상(선생님/관리자) 결정 → calendar_events 저장 → 구글 등록.
 *
 * 구글 연동: 서비스 계정(JWT). 필요한 환경변수(.env.local):
 *   GOOGLE_CALENDAR_CLIENT_EMAIL   서비스 계정 이메일
 *   GOOGLE_CALENDAR_PRIVATE_KEY    서비스 계정 개인키 (\n 포함)
 *   GOOGLE_CALENDAR_ADMIN_ID       관리자 캘린더 ID
 * 각 선생님 캘린더 ID 는 profiles.google_calendar_id 에 저장.
 * (대상 캘린더는 서비스 계정 이메일에 "변경 권한"으로 공유되어 있어야 함)
 */
import { google } from 'googleapis';
import { createAdminClient } from './supabase-admin';
import { planCalendarEvents, type ClassOccurrence, type AbsenceRecord } from './calendar-logic';

const TZ = 'Asia/Kuala_Lumpur';

export async function syncCalendarForPeriod(year: number, month: number) {
  const db = createAdminClient();
  const mm = String(month).padStart(2, '0');
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

  const { data: absRows, error: e1 } = await db
    .from('planned_absences').select('class_id, student_id, absence_date')
    .gte('absence_date', start).lte('absence_date', end);
  if (e1) throw e1;
  const absences: AbsenceRecord[] = (absRows ?? []).map((a: any) => ({ classId: a.class_id, studentId: a.student_id, date: a.absence_date }));

  // 이 기간 이벤트 재생성 (중복 방지)
  await db.from('calendar_events').delete().gte('event_date', start).lte('event_date', end);
  if (absences.length === 0) return [];

  const classIds = [...new Set(absences.map((a) => a.classId))];
  const { data: classes } = await db.from('classes').select('id, name, teacher_id, start_time, end_time').in('id', classIds);
  const classMap = new Map((classes ?? []).map((c: any) => [c.id, c]));

  const { data: enrolls } = await db.from('enrollments').select('class_id, student_id').in('class_id', classIds).eq('status', 'active');
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
  const rows = plans.flatMap((p) => p.targets.map((target) => ({
    kind: p.kind, class_id: p.classId, teacher_id: p.teacherId || null, target,
    event_date: p.date, start_time: p.startTime, end_time: p.endTime, title: p.title,
    absent_student_ids: p.absentStudentIds, attending_student_ids: p.attendingStudentIds, pushed_to_google: false,
  })));
  if (rows.length) { const { error } = await db.from('calendar_events').insert(rows); if (error) throw error; }

  const pushed = await pushToGoogle(start, end);
  return { planned: plans.length, events: rows.length, pushed };
}

function getCalendarClient() {
  const email = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
  const key = process.env.GOOGLE_CALENDAR_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) return null;
  const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/calendar'] });
  return google.calendar({ version: 'v3', auth });
}

async function pushToGoogle(start: string, end: string): Promise<number> {
  const cal = getCalendarClient();
  if (!cal) return 0; // 미설정 → DB에는 기록됨, 구글 등록만 스킵
  const db = createAdminClient();
  const adminCalId = process.env.GOOGLE_CALENDAR_ADMIN_ID;

  const { data: events } = await db.from('calendar_events')
    .select('id, target, teacher_id, event_date, start_time, end_time, title')
    .eq('pushed_to_google', false).gte('event_date', start).lte('event_date', end);

  const teacherIds = [...new Set((events ?? []).filter((e: any) => e.target === 'teacher' && e.teacher_id).map((e: any) => e.teacher_id))];
  const { data: profs } = teacherIds.length
    ? await db.from('profiles').select('id, google_calendar_id').in('id', teacherIds as string[])
    : { data: [] as any[] };
  const calByTeacher = new Map((profs ?? []).map((p: any) => [p.id, p.google_calendar_id]));

  let pushed = 0;
  for (const ev of events ?? []) {
    const calendarId = ev.target === 'admin' ? adminCalId : calByTeacher.get(ev.teacher_id);
    if (!calendarId) continue; // 대상 캘린더 미설정 → 스킵
    try {
      const res = await cal.events.insert({
        calendarId,
        requestBody: {
          summary: ev.title,
          start: { dateTime: `${ev.event_date}T${String(ev.start_time).slice(0, 5)}:00`, timeZone: TZ },
          end: { dateTime: `${ev.event_date}T${String(ev.end_time).slice(0, 5)}:00`, timeZone: TZ },
        },
      });
      await db.from('calendar_events').update({ pushed_to_google: true, google_event_id: res.data.id }).eq('id', ev.id);
      pushed++;
    } catch { /* 실패 시 미등록 상태 유지 */ }
  }
  return pushed;
}
