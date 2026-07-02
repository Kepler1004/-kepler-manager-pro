'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { addVacation, deleteVacation, setAnnualLeave } from './actions';

type P = { id: string; full_name: string; email: string; role: string; annual_leave_total: number };
type V = { id: string; profile_id: string; start_date: string; end_date: string; days: number; reason: string|null };

export default function VacationsClient({ people, vacations, year }:
  { people: P[]; vacations: V[]; year: number }) {
  const t = useTranslations('vacation');
  const tr = useTranslations('roles');
  const tc = useTranslations('common');
  const [err, setErr] = useState('');
  const nameOf = (id: string) => { const p = people.find((x) => x.id === id); return p ? (p.full_name || p.email) : id; };
  const usedOf = (id: string) => vacations.filter((v) => v.profile_id === id).reduce((s, v) => s + Number(v.days), 0);

  async function add(formData: FormData) {
    setErr('');
    try { await addVacation(formData); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      {/* 사람별 현황 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">{t('person')}</th><th className="px-4 py-2">{t('role')}</th>
            <th className="px-4 py-2 text-right">{t('used')}</th><th className="px-4 py-2 text-right">{t('total')}</th>
            <th className="px-4 py-2 text-right">{t('remaining')}</th><th className="px-4 py-2">{t('set_total')}</th></tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const used = usedOf(p.id); const total = Number(p.annual_leave_total); const remain = total - used;
              return (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{p.full_name || p.email}</td>
                  <td className="px-4 py-2">{tr(p.role as any)}</td>
                  <td className="px-4 py-2 text-right">{used}</td>
                  <td className="px-4 py-2 text-right">{total}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${remain < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{remain}</td>
                  <td className="px-4 py-2">
                    <form action={setAnnualLeave} className="flex items-center gap-1">
                      <input type="hidden" name="profile_id" value={p.id} />
                      <input name="total" type="number" step="0.5" defaultValue={total}
                        className="w-16 rounded-md border border-slate-300 px-2 py-1" />
                      <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white">{tc('save')}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 휴가 추가 */}
      <form action={add} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('person')} *</span>
          <select name="profile_id" required className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('start')} *</span>
          <input name="start_date" type="date" required className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('end')}</span>
          <input name="end_date" type="date" className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('days')} *</span>
          <input name="days" type="number" step="0.5" defaultValue={1} className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <label className="block flex-1"><span className="mb-1 block text-xs text-slate-500">{t('reason')}</span>
          <input name="reason" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{tc('add')}</button>
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </form>

      {/* 휴가 목록 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">{t('person')}</th><th className="px-4 py-2">{t('period')}</th>
            <th className="px-4 py-2 text-right">{t('days')}</th><th className="px-4 py-2">{t('reason')}</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {vacations.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t('empty')}</td></tr>}
            {vacations.map((v) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{nameOf(v.profile_id)}</td>
                <td className="px-4 py-2">{v.start_date}{v.end_date !== v.start_date ? ` ~ ${v.end_date}` : ''}</td>
                <td className="px-4 py-2 text-right">{v.days}</td>
                <td className="px-4 py-2">{v.reason}</td>
                <td className="px-4 py-2 text-right">
                  <form action={deleteVacation} className="inline">
                    <input type="hidden" name="id" value={v.id} />
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
