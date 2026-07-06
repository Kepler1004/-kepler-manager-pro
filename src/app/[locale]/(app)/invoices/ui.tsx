'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { deleteInvoice } from './[id]/actions';

type Inv = { id: string; period_year: number; period_month: number; total: number; status: string; currency: string; students: any };

export default function InvoicesClient({ invoices }: { invoices: Inv[] }) {
  const t = useTranslations();
  const now = new Date();
  const def = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [year, setYear] = useState(def.getFullYear());
  const [month, setMonth] = useState(def.getMonth() + 1);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allChecked = invoices.length > 0 && sel.size === invoices.length;
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(invoices.map((i) => i.id)));

  async function generate() {
    setBusy(true); setMsg('');
    await fetch('/api/invoices/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year, month }) });
    setBusy(false); location.reload();
  }
  async function send(body: any, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true); setMsg('...');
    const r = await fetch('/api/invoices/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? t('payslip.sent_result', { sent: j.sent ?? 0, failed: j.failed ?? 0 }) : (j.error || 'error'));
    if (r.ok) setTimeout(() => location.reload(), 800);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 rounded-md border border-slate-300 px-2 py-2 text-sm" />
        <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-16 rounded-md border border-slate-300 px-2 py-2 text-sm" />
        <button disabled={busy} onClick={generate} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{t('invoice.generate_next_month')}</button>
        <div className="flex-1" />
        <button disabled={busy || sel.size === 0} onClick={() => send({ invoiceIds: [...sel] }, t('invoice.confirm_send_selected', { n: sel.size }))}
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{t('invoice.send_selected')} ({sel.size})</button>
        <button disabled={busy} onClick={() => send({ year, month }, t('invoice.confirm_send_all'))}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{t('invoice.send_all')}</button>
      </div>
      {msg && <div className="text-sm text-slate-500">{msg}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
              <th className="px-4 py-2">{t('common.student')}</th><th className="px-4 py-2">{t('common.period_label')}</th>
              <th className="px-4 py-2 text-right">{t('common.total')}</th><th className="px-4 py-2">{t('common.status')}</th><th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t('invoice.empty')}</td></tr>}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td className="px-4 py-2"><input type="checkbox" checked={sel.has(inv.id)} onChange={() => toggle(inv.id)} /></td>
                <td className="px-4 py-2"><Link href={`/invoices/${inv.id}`} className="text-indigo-600">{inv.students?.name}</Link></td>
                <td className="px-4 py-2">{inv.period_year}.{inv.period_month}</td>
                <td className="px-4 py-2 text-right">{inv.currency} {Number(inv.total).toFixed(2)}</td>
                <td className="px-4 py-2">{inv.status}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button disabled={busy} onClick={() => send({ invoiceId: inv.id })} className="mr-2 rounded-md bg-slate-900 px-3 py-1 text-xs text-white disabled:opacity-50">{t('invoice.send_email')}</button>
                  <form action={deleteInvoice} className="inline" onSubmit={(e) => { if (!confirm(t('invoice.confirm_delete'))) e.preventDefault(); }}>
                    <input type="hidden" name="invoice_id" value={inv.id} />
                    <button className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-600">{t('common.delete')}</button>
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
