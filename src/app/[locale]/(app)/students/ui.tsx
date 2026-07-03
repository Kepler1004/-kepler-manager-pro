'use client';
import { Fragment, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import StudentForm, { type StudentRow } from '@/components/StudentForm';
import { Link } from '@/i18n/routing';
import { deleteStudent } from './actions';

export default function StudentsClient({ students, sort }: { students: StudentRow[]; sort: string }) {
  const t = useTranslations('student');
  const tc = useTranslations('common');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const sortKeys = ['name','grade','school','created'] as const;
  const setSort = (k: string) => router.push(`${pathname}?sort=${k}`);

  return (
    <div className="space-y-4">
      {!adding && (
        <button onClick={() => setAdding(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          + {t('add')}
        </button>
      )}
      {adding && <StudentForm onDone={() => setAdding(false)} />}

      <div className="flex items-center gap-1 text-sm">
        <span className="mr-1 text-slate-400">{t('sort_by')}:</span>
        {sortKeys.map((k) => (
          <button key={k} onClick={() => setSort(k)}
            className={`rounded-md px-3 py-1 ${sort === k ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {t(`sort_${k}`)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">{t('name')}</th>
              <th className="px-4 py-2">{t('school')}</th>
              <th className="px-4 py-2">{t('grade')}</th>
              <th className="px-4 py-2">{t('guardian_email')}</th>
              <th className="px-4 py-2">{t('status')}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t('empty')}</td></tr>
            )}
            {students.map((s) => (
              <Fragment key={s.id}>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-2"><Link href={`/students/${s.id}`} className="text-indigo-600 hover:underline">{s.name}</Link>{s.name_en ? ` (${s.name_en})` : ''}</td>
                  <td className="px-4 py-2">{s.school}</td>
                  <td className="px-4 py-2">{s.grade}</td>
                  <td className="px-4 py-2">{s.guardian_email}</td>
                  <td className="px-4 py-2">{s.status}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEditId(editId === s.id ? null : s.id!)}
                      className="mr-3 text-indigo-600">{tc('edit')}</button>
                    <form action={deleteStudent} className="inline"
                      onSubmit={(e) => { if (!confirm(t('confirm_delete'))) e.preventDefault(); }}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-rose-600">{tc('delete')}</button>
                    </form>
                  </td>
                </tr>
                {editId === s.id && (
                  <tr><td colSpan={6} className="bg-slate-50 px-4 py-3">
                    <StudentForm initial={s} onDone={() => setEditId(null)} />
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
