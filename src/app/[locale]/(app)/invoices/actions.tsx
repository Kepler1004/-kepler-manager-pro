'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function InvoiceActions({ invoiceId, sendOnly }: { invoiceId?: string; sendOnly?: boolean }) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await fetch('/api/invoices/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: next.getFullYear(), month: next.getMonth() + 1 }),
    });
    setBusy(false); location.reload();
  }
  async function send() {
    setBusy(true);
    await fetch('/api/invoices/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId }),
    });
    setBusy(false); location.reload();
  }

  if (sendOnly) {
    return (
      <button disabled={busy} onClick={send}
        className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white disabled:opacity-50">
        {t('invoice.send_email')}
      </button>
    );
  }
  return (
    <button disabled={busy} onClick={generate}
      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
      {t('invoice.generate_next_month')}
    </button>
  );
}
