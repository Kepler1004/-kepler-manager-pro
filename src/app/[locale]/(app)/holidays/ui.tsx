'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { addHoliday, deleteHoliday } from './actions';

type H = { id: string; holiday_date: string; name: string; source: string };

export default function HolidaysClient({ holidays }: { holidays: H[] }) {
  const t = useTranslations('holiday');
  const tc = useTranslations('common');
  const [err, setErr] = useState('');
  async function action(formData: FormData) {
    setErr('');
    try { await addHoliday(formData); } catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('date')} *</span>
          <input name="holiday_date" type="date" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="block flex-1"><span className="mb-1 block text-xs text-slate-500">{t('name')}</span>
          <input name="name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{tc('add')}</button>
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">{t('date')}</th><th className="px-4 py-2">{t('name')}</th>
            <th className="px-4 py-2">{t('source')}</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {holidays.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t('empty')}</td></tr>}
            {holidays.map((h) => (
              <tr key={h.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{h.holiday_date}</td>
                <td className="px-4 py-2">{h.name}</td>
                <td className="px-4 py-2">
                  <span className={h.source === 'johor' ? 'rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700' : 'rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600'}>
                    {h.source === 'johor' ? t('auto') : t('manual')}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteHoliday} className="inline">
                    <input type="hidden" name="id" value={h.id} />
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
