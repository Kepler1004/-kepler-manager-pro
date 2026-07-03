'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { updateTeacherPayroll } from '@/app/[locale]/(app)/admins/actions';

type Cfg = Record<string, { type: string; value: number } | undefined>;
export interface TeacherP {
  id: string; employment_type?: string; tax_no?: string | null; ic_no?: string | null;
  epf_no?: string | null; bank_account?: string | null; allowance?: number; fixed_base_salary?: number; google_calendar_id?: string | null; work_days?: number[] | null; payroll_config?: Cfg;
}

const DEDUCTIONS: [string, string][] = [
  ['pcb', 'PCB'], ['epfEmployee', 'EPF (본인)'], ['epfEmployer', 'EPF (회사)'],
  ['socsoEmployee', 'SOCSO (본인)'], ['socsoEmployer', 'SOCSO (회사)'],
  ['eisEmployee', 'EIS (본인)'], ['eisEmployer', 'EIS (회사)'],
];

export default function TeacherPayrollForm({ teacher, onDone }: { teacher: TeacherP; onDone?: () => void }) {
  const t = useTranslations('payroll');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cfg = teacher.payroll_config ?? {};

  async function action(formData: FormData) {
    setBusy(true); setErr('');
    try { await updateTeacherPayroll(formData); onDone?.(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="id" value={teacher.id} />

      <div className="grid grid-cols-3 gap-3">
        <label className="block"><span className="lbl">{t('employment_type')}</span>
          <select name="employment_type" defaultValue={teacher.employment_type ?? 'freelancer'} className="inp">
            <option value="freelancer">{t('freelancer')}</option>
            <option value="fulltime">{t('fulltime')}</option>
            <option value="salaried_fixed">{t('salaried_fixed')}</option>
          </select></label>
        <label className="block"><span className="lbl">{t('fixed_base_salary')}</span>
          <input name="fixed_base_salary" type="number" step="0.01" defaultValue={teacher.fixed_base_salary ?? 0} className="inp" /></label>
        <label className="block"><span className="lbl">{t('allowance')}</span>
          <input name="allowance" type="number" step="0.01" defaultValue={teacher.allowance ?? 0} className="inp" /></label>
        <label className="block"><span className="lbl">{t('bank_account')}</span>
          <input name="bank_account" defaultValue={teacher.bank_account ?? ''} className="inp" /></label>
        <label className="block"><span className="lbl">{t('tax_no')}</span>
          <input name="tax_no" defaultValue={teacher.tax_no ?? ''} className="inp" /></label>
        <label className="block"><span className="lbl">{t('ic_no')}</span>
          <input name="ic_no" defaultValue={teacher.ic_no ?? ''} className="inp" /></label>
        <label className="block"><span className="lbl">{t('epf_no')}</span>
          <input name="epf_no" defaultValue={teacher.epf_no ?? ''} className="inp" /></label>
        <label className="col-span-3 block"><span className="lbl">{t('google_calendar_id')}</span>
          <input name="google_calendar_id" defaultValue={teacher.google_calendar_id ?? ''} placeholder="예: abc123@group.calendar.google.com" className="inp w-full" /></label>
        <div className="col-span-3">
          <span className="lbl">{t('work_days')}</span>
          <div className="mt-1 flex flex-wrap gap-3">
            {[['0','일'],['1','월'],['2','화'],['3','수'],['4','목'],['5','금'],['6','토']].map(([v,label]) => (
              <label key={v} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="work_days" value={v}
                  defaultChecked={(teacher.work_days ?? [1,2,3,4,5]).includes(Number(v))} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="lbl mb-1">{t('deductions')} ({t('fulltime_only')})</div>
        <div className="grid grid-cols-2 gap-2">
          {DEDUCTIONS.map(([key, label]) => {
            const cur = cfg[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-28 text-xs text-slate-600">{label}</span>
                <select name={`${key}_type`} defaultValue={cur?.type ?? 'percent'} className="inp w-24">
                  <option value="percent">%</option>
                  <option value="fixed">RM</option>
                </select>
                <input name={`${key}_value`} type="number" step="0.01" placeholder="0"
                  defaultValue={cur?.value ?? ''} className="inp w-28" />
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-400">{t('percent_base')}</p>
      </div>

      <div className="flex items-center gap-3">
        <button disabled={busy} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{t('save')}</button>
        {onDone && <button type="button" onClick={onDone} className="text-sm text-slate-500">{t('cancel')}</button>}
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </div>
      <style>{`.lbl{display:block;margin-bottom:4px;font-size:11px;color:#64748b}.inp{border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;font-size:14px}`}</style>
    </form>
  );
}
