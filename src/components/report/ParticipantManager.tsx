'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ROLE_KEY } from '@/lib/report/types';

type Row = { id: string; full_name: string; role: string; report_enabled: boolean };

export function ParticipantManager() {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/report-participants').then((r) => r.json()).then((d) => setRows(d.staff ?? []));
  }, [open]);

  function toggle(id: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, report_enabled: !r.report_enabled } : r)));
  }

  async function save() {
    setBusy(true);
    const res = await fetch('/api/report-participants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: rows.map((r) => ({ id: r.id, enabled: r.report_enabled })) }),
    });
    setBusy(false);
    if (res.ok) { setOpen(false); location.reload(); } else alert(t('save_fail'));
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
        {t('target_manage')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h3 className="mb-1 text-base font-semibold">{t('target_title')}</h3>
            <p className="mb-3 text-xs text-gray-500">{t('target_desc')}</p>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {rows.length === 0 ? (
                <p className="text-sm text-gray-400">{t('loading')}</p>
              ) : (
                rows.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
                    <input type="checkbox" checked={r.report_enabled} onChange={() => toggle(r.id)} className="h-4 w-4" />
                    <span className="text-sm text-gray-800">{r.full_name || t('no_name')}</span>
                    <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">{t(ROLE_KEY[r.role] ?? 'role_teacher')}</span>
                  </label>
                ))
              )}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded border px-3 py-1.5 text-sm">취소</button>
              <button onClick={save} disabled={busy} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
                {busy ? t('saving') : t('target_manage')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
