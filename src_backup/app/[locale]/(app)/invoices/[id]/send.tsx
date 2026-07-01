'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function InvoiceSend({ invoiceId, status }: { invoiceId: string; status: string }) {
  const t = useTranslations('invoice');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(status);
  async function send() {
    setBusy(true);
    const r = await fetch('/api/invoices/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId }) });
    setBusy(false);
    setMsg(r.ok ? 'sent' : 'error');
  }
  return (
    <div className="text-right">
      <button disabled={busy} onClick={send}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {t('send_email')}
      </button>
      <div className="mt-1 text-xs text-slate-400">{msg}</div>
    </div>
  );
}
