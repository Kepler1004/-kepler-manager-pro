'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

type Item = { id: string; class_id: string; class_name: string; sessions: number; rate_per_session: number; amount: number };
type Slip = {
  id: string; teacher_id: string; period_year: number; period_month: number; currency: string; status: string;
  base_pay: number; allowance: number; manual_adjust: number; net_pay: number;
  total_employee_deduction: number; total_employer_contribution: number;
  employee_deductions: { label: string; amount: number }[];
  employer_contributions: { label: string; amount: number }[];
  payslip_items: Item[];
  profiles: { full_name: string; email: string; employment_type: string; tax_no?: string; ic_no?: string; epf_no?: string } | null;
};
type Hist = { id: string; period_year: number; period_month: number; net_pay: number; status: string; currency: string };

export default function PayslipDetailClient({ slip, history }: { slip: Slip; history: Hist[] }) {
  const t = useTranslations('payslip');
  const tc = useTranslations('common');
  const locale = useLocale();
  const teacher = slip.profiles;

  const [items, setItems] = useState<Item[]>(slip.payslip_items ?? []);
  const [manualAdjust, setManualAdjust] = useState(Number(slip.manual_adjust ?? 0));
  const [busy, setBusy] = useState('');
  const [sendMsg, setSendMsg] = useState(slip.status);

  function setSessions(idx: number, v: number) {
    setItems((arr) => arr.map((it, i) => i === idx ? { ...it, sessions: v, amount: v * it.rate_per_session } : it));
  }

  async function save() {
    setBusy('save');
    await fetch('/api/payslips/recompute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payslipId: slip.id,
        items: items.map((it) => ({ class_id: it.class_id, class_name: it.class_name, sessions: Number(it.sessions), rate_per_session: it.rate_per_session })),
        manualAdjust,
      }),
    });
    setBusy(''); window.location.reload();
  }
  async function send() {
    setBusy('send');
    const r = await fetch('/api/payslips/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payslipId: slip.id }) });
    setBusy(''); setSendMsg(r.ok ? 'sent' : 'error');
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-4">
      {/* 좌: 히스토리 */}
      <div className="col-span-1">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-medium">{t('history_6m')}</div>
          <ul className="space-y-1">
            {history.map((h) => (
              <li key={h.id}>
                <Link href={`/payslips/${h.id}`}
                  className={`flex justify-between rounded px-2 py-1 text-sm ${h.id === slip.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'}`}>
                  <span>{h.period_year}.{h.period_month}</span>
                  <span>{h.currency} {Number(h.net_pay).toFixed(2)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <form className="mt-3 flex items-center gap-1" onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget as any;
            window.location.assign(`/${locale}/payslips?y=${f.hy.value}&m=${f.hm.value}`);
          }}>
            <input name="hy" type="number" defaultValue={slip.period_year} className="w-20 rounded border border-slate-300 px-2 py-1 text-xs" />
            <input name="hm" type="number" min={1} max={12} defaultValue={slip.period_month} className="w-14 rounded border border-slate-300 px-2 py-1 text-xs" />
            <button className="rounded bg-slate-200 px-2 py-1 text-xs">{t('go')}</button>
          </form>
        </div>
      </div>

      {/* 우: 명세서 본문 + 편집 */}
      <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-slate-500">{slip.period_year}.{slip.period_month} · {teacher?.full_name || teacher?.email}
              <span className="ml-2 text-xs text-slate-400">{teacher?.employment_type === 'freelancer' ? t('freelancer') : t('fulltime')}</span>
            </p>
          </div>
          <div className="text-right">
            <button disabled={!!busy} onClick={send} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {t('send_email')}
            </button>
            <div className="mt-1 text-xs text-slate-400">{sendMsg}</div>
          </div>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead className="border-b text-left text-slate-500">
            <tr><th className="py-2">{tc('class')}</th><th className="py-2 text-right">{t('rate')}</th>
            <th className="py-2 text-center">{tc('session')}</th><th className="py-2 text-right">{tc('amount')}</th></tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-2">{it.class_name}</td>
                <td className="py-2 text-right">{Number(it.rate_per_session).toFixed(2)}</td>
                <td className="py-2 text-center">
                  <input type="number" value={it.sessions} onChange={(e) => setSessions(idx, Number(e.target.value))}
                    className="w-16 rounded border border-slate-300 px-2 py-1 text-right" />
                </td>
                <td className="py-2 text-right">{(it.sessions * it.rate_per_session).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <span className="text-slate-500">{t('manual_adjust')}</span>
          <input type="number" step="0.01" value={manualAdjust} onChange={(e) => setManualAdjust(Number(e.target.value))}
            className="w-28 rounded border border-slate-300 px-2 py-1 text-right" />
          <button disabled={!!busy} onClick={save} className="rounded-md bg-indigo-600 px-4 py-1.5 text-white disabled:opacity-50">
            {busy === 'save' ? '...' : t('save_recompute')}
          </button>
        </div>

        <div className="mt-5 space-y-1 border-t pt-3 text-right text-sm">
          <div>{t('base_pay')}: {slip.currency} {Number(slip.base_pay).toFixed(2)}</div>
          {Number(slip.allowance) ? <div>{t('allowance')}: {slip.currency} {Number(slip.allowance).toFixed(2)}</div> : null}
          {Number(slip.manual_adjust) ? <div>{t('manual_adjust')}: {slip.currency} {Number(slip.manual_adjust).toFixed(2)}</div> : null}
          {(slip.employee_deductions ?? []).map((d, i) => (
            <div key={i} className="text-rose-600">{d.label}: {slip.currency} {Number(d.amount).toFixed(2)}</div>
          ))}
          <div className="text-lg font-bold">{t('net_pay')}: {slip.currency} {Number(slip.net_pay).toFixed(2)}</div>
        </div>

        {(slip.employer_contributions ?? []).length > 0 && (
          <div className="mt-4 border-t pt-3 text-right text-xs text-slate-500">
            <div className="mb-1 font-medium">{t('employer_contrib')}</div>
            {slip.employer_contributions.map((c, i) => (
              <div key={i}>{c.label}: {slip.currency} {Number(c.amount).toFixed(2)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
