'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { addAbsence, deleteAbsence } from './actions';

type Opt = { id: string; name: string };
type Enr = { class_id: string; student_id: string };
type Abs = { id: string; student_id: string; class_id: string; absence_date: string; reason: string | null };

export default function AbsencesClient({ students, classes, enrollments, absences }:
  { students: Opt[]; classes: Opt[]; enrollments: Enr[]; absences: Abs[] }) {
  const t = useTranslations('absence');
  const tc = useTranslations('common');
  const [studentId, setStudentId] = useState('');
  const [err, setErr] = useState('');

  // 선택한 학생이 수강 중인 수업만 노출
  const classOptions = useMemo(() => {
    if (!studentId) return [];
    const cids = enrollments.filter((e) => e.student_id === studentId).map((e) => e.class_id);
    return classes.filter((c) => cids.includes(c.id));
  }, [studentId, enrollments, classes]);

  const nm = (arr: Opt[], id: string) => arr.find((x) => x.id === id)?.name ?? id;

  async function action(formData: FormData) {
    setErr('');
    try { await addAbsence(formData); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block"><span className="mb-1 block text-xs text-slate-500">{tc('student')} *</span>
          <select name="student_id" value={studentId} onChange={(e) => setStudentId(e.target.value)} required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-xs text-slate-500">{tc('class')} *</span>
          <select name="class_id" required className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('date')} *</span>
          <input name="absence_date" type="date" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="block flex-1"><span className="mb-1 block text-xs text-slate-500">{t('reason')}</span>
          <input name="reason" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{tc('add')}</button>
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">{t('date')}</th><th className="px-4 py-2">{tc('student')}</th>
            <th className="px-4 py-2">{tc('class')}</th><th className="px-4 py-2">{t('reason')}</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {absences.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('empty')}</td></tr>}
            {absences.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{a.absence_date}</td>
                <td className="px-4 py-2">{nm(students, a.student_id)}</td>
                <td className="px-4 py-2">{nm(classes, a.class_id)}</td>
                <td className="px-4 py-2">{a.reason}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteAbsence} className="inline">
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-rose-600">{tc('delete')}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
