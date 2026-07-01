'use client';
import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import ClassForm, { type Opt, type ClassRow } from '@/components/ClassForm';
import { deleteClassRow, enrollStudent, unenrollStudent } from './actions';

type Cls = ClassRow & { id: string };
type Sal = { class_id: string; teacher_id: string; rate_per_session: number };
type Enr = { class_id: string; student_id: string };

export default function ClassesClient({ classes, subjects, teachers, students, salaries, enrollments }:
  { classes: Cls[]; subjects: Opt[]; teachers: Opt[]; students: Opt[]; salaries: Sal[]; enrollments: Enr[] }) {
  const t = useTranslations('klass');
  const tc = useTranslations('common');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [enrollId, setEnrollId] = useState<string | null>(null);
  const days = [tc('sun'), tc('mon'), tc('tue'), tc('wed'), tc('thu'), tc('fri'), tc('sat')];

  const subjName = (id?: string | null) => subjects.find((s) => s.id === id)?.name ?? '';
  const teacherName = (id?: string | null) => teachers.find((s) => s.id === id)?.name ?? '—';
  const rateFor = (c: Cls) => salaries.find((s) => s.class_id === c.id && s.teacher_id === c.teacher_id)?.rate_per_session ?? 0;
  const enrolledIn = (cid: string) => enrollments.filter((e) => e.class_id === cid).map((e) => e.student_id);
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      {!adding && (
        <button onClick={() => setAdding(true)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          + {t('add')}
        </button>
      )}
      {adding && <ClassForm subjects={subjects} teachers={teachers} onDone={() => setAdding(false)} />}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">{t('name')}</th><th className="px-4 py-2">{t('subject')}</th>
              <th className="px-4 py-2">{t('teacher')}</th><th className="px-4 py-2">{tc('day')}</th>
              <th className="px-4 py-2">{tc('time')}</th><th className="px-4 py-2 text-right">{t('session_price')}</th>
              <th className="px-4 py-2">{t('students')}</th><th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t('empty')}</td></tr>}
            {classes.map((c) => {
              const ids = enrolledIn(c.id);
              return (
                <Fragment key={c.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2">{subjName(c.subject_id)}</td>
                    <td className="px-4 py-2">{teacherName(c.teacher_id)}</td>
                    <td className="px-4 py-2">{((c.days && c.days.length ? c.days : [c.day_of_week ?? 0]) as number[]).slice().sort((a,b)=>a-b).map((d)=>days[d]).join('·')}</td>
                    <td className="px-4 py-2">{String(c.start_time).slice(0,5)}–{String(c.end_time).slice(0,5)}</td>
                    <td className="px-4 py-2 text-right">{Number(c.session_price).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => setEnrollId(enrollId === c.id ? null : c.id)} className="text-indigo-600">
                        {ids.length}{t('students_unit')}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setEditId(editId === c.id ? null : c.id)} className="mr-3 text-indigo-600">{tc('edit')}</button>
                      <form action={deleteClassRow} className="inline" onSubmit={(e) => { if (!confirm(t('confirm_delete'))) e.preventDefault(); }}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="text-rose-600">{tc('delete')}</button>
                      </form>
                    </td>
                  </tr>
                  {editId === c.id && (
                    <tr><td colSpan={8} className="bg-slate-50 px-4 py-3">
                      <ClassForm initial={{ ...c, rate_per_session: rateFor(c) }} subjects={subjects} teachers={teachers} onDone={() => setEditId(null)} />
                    </td></tr>
                  )}
                  {enrollId === c.id && (
                    <tr><td colSpan={8} className="bg-slate-50 px-4 py-3">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t('enrolled')}</div>
                        <div className="flex flex-wrap gap-2">
                          {ids.length === 0 && <span className="text-sm text-slate-400">{t('no_students')}</span>}
                          {ids.map((sid) => (
                            <form key={sid} action={unenrollStudent} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-300 px-3 py-1 text-sm">
                              <input type="hidden" name="class_id" value={c.id} />
                              <input type="hidden" name="student_id" value={sid} />
                              <span>{studentName(sid)}</span>
                              <button className="text-rose-500">×</button>
                            </form>
                          ))}
                        </div>
                        <form action={enrollStudent} className="flex items-center gap-2 pt-2">
                          <input type="hidden" name="class_id" value={c.id} />
                          <select name="student_id" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                            <option value="">{t('select_student')}</option>
                            {students.filter((s) => !ids.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <button className="rounded-md bg-slate-900 px-3 py-2 text-xs text-white">{t('enroll')}</button>
                        </form>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
