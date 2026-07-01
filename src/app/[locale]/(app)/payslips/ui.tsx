'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

type Slip = {
  id: string; total_sessions: number; base_pay: number; total_employee_deduction: number;
  net_pay: number; status: string; currency: string;
  profiles: { full_name: string; email: string; employment_type: string } | null;
};

export default function PayslipsClient({ year, month, slips }: { year: number; month: number; slips: Slip[] }) {
  const t = useTranslations('payslip');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);
  const [busy, setBusy] = useState('');

  function go() { window.location.assign(`/${locale}/payslips?y=${y}&m=${m}`); }

  async function generate() {
    setBusy('gen');
    await fetch('/api/payslips/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: y, month: m }) });
    setBusy(''); window.location.assign(`/${locale}/payslips?y=${y}&m=${m}`);
  }
  async function sendAll() {
    if (!confirm(t('confirm_send_all'))) return;
    setBusy('send');
    const r = await fetch('/api/payslips/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: y, month: m }) });
    const j = await r.json();
    setBusy('');
    alert(t('sent_result', { sent: j.sent ?? 0, failed: j.failed ?? 0 }));
    window.location.reload();
  }

  const totalNet = slips.reduce((s, x) => s + Number(x.net_pay), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} className="w-24 rounded-md border border-slate-300 px-2 py-2 text-sm" />
        <input type="number" min={1} max={12} value={m} onChange={(e) => setM(Number(e.target.value))} className="w-16 rounded-md border border-slate-300 px-2 py-2 text-sm" />
        <button onClick={go} className="rounded-md bg-slate-200 px-3 py-2 text-sm">{t('view_month')}</button>
        <div className="flex-1" />
        <button disabled={!!busy} onClick={generate} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy === 'gen' ? '...' : t('generate_period')}
        </button>
        <button disabled={!!busy || slips.length === 0} onClick={sendAll} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy === 'send' ? '...' : t('send_all')}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">{t('teacher')}</th>
              <th className="px-4 py-2">{t('type')}</th>
              <th className="px-4 py-2 text-right">{t('total_sessions')}</th>
              <th className="px-4 py-2 text-right">{t('base_pay')}</th>
              <th className="px-4 py-2 text-right">{t('deduction')}</th>
              <th className="px-4 py-2 text-right">{t('net_pay')}</th>
              <th className="px-4 py-2">{tc('status')}</th>
            </tr>
          </thead>
          <tbody>
            {slips.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t('empty_period')}</td></tr>}
            {slips.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2"><Link href={`/payslips/${s.id}`} className="text-indigo-600">{s.profiles?.full_name || s.profiles?.email}</Link></td>
                <td className="px-4 py-2 text-xs text-slate-500">{s.profiles?.employment_type === 'freelancer' ? t('freelancer') : t('fulltime')}</td>
                <td className="px-4 py-2 text-right">{s.total_sessions}</td>
                <td className="px-4 py-2 text-right">{Number(s.base_pay).toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-rose-600">{Number(s.total_employee_deduction).toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-medium">{s.currency} {Number(s.net_pay).toFixed(2)}</td>
                <td className="px-4 py-2">{s.status}</td>
              </tr>
            ))}
            {slips.length > 0 && (
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-medium">
                <td className="px-4 py-2" colSpan={5}>{t('net_total')}</td>
                <td className="px-4 py-2 text-right">RM {totalNet.toFixed(2)}</td><td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
