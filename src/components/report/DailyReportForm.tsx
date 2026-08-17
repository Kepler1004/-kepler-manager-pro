'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Item = { title: string; reason?: string };
type Bucket = 'done' | 'added' | 'hold' | 'plan';

const BUCKETS: Bucket[] = ['done', 'added', 'hold', 'plan'];

export function DailyReportForm() {
  const t = useTranslations('report');
  const [items, setItems] = useState<Record<Bucket, Item[]>>({
    done: [{ title: '' }],
    added: [{ title: '' }],
    hold: [{ title: '', reason: '' }],
    plan: [{ title: '' }],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function updateItem(b: Bucket, idx: number, field: 'title' | 'reason', value: string) {
    setItems((prev) => {
      const next = [...prev[b]];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, [b]: next };
    });
  }
  function addRow(b: Bucket) {
    setItems((prev) => ({ ...prev, [b]: [...prev[b], { title: '', reason: '' }] }));
  }
  function removeRow(b: Bucket, idx: number) {
    setItems((prev) => ({ ...prev, [b]: prev[b].filter((_, i) => i !== idx) }));
  }

  async function submit() {
    setBusy(true);
    setError('');
    const payload: Record<Bucket, Item[]> = {
      done: items.done.filter((x) => x.title.trim()),
      added: items.added.filter((x) => x.title.trim()),
      hold: items.hold.filter((x) => x.title.trim()),
      plan: items.plan.filter((x) => x.title.trim()),
    };

    const res = await fetch('/api/daily-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setBusy(false);
    if (res.ok) {
      location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error === 'ALREADY_SUBMITTED' ? t('already_submitted_title') : t('submit_fail'));
    }
  }

  return (
    <div className="space-y-6">
      {BUCKETS.map((b) => (
        <div key={b} className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">{t(b)}</h2>
          <div className="space-y-2">
            {items[b].map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={item.title}
                  onChange={(e) => updateItem(b, idx, 'title', e.target.value)}
                  placeholder={t('placeholder_item')}
                  className="flex-1 rounded border px-3 py-2 text-sm"
                />
                {b === 'hold' && (
                  <input
                    value={item.reason ?? ''}
                    onChange={(e) => updateItem(b, idx, 'reason', e.target.value)}
                    placeholder={t('reason')}
                    className="w-40 rounded border px-3 py-2 text-sm"
                  />
                )}
                {items[b].length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(b, idx)}
                    className="rounded border px-2 text-sm text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addRow(b)}
            className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
          >
            {t('add_item')}
          </button>
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? t('submitting') : t('submit')}
      </button>
    </div>
  );
}
