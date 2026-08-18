'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Task } from '@/lib/report/types';

type Item = { title: string; reason?: string };
type Bucket = 'done' | 'added' | 'hold' | 'plan';

const BUCKETS: Bucket[] = ['done', 'added', 'hold', 'plan'];
const READONLY: Bucket[] = ['done', 'added', 'hold'];

export function DailyReportForm({ existingTasks }: { existingTasks?: Task[] }) {
  const t = useTranslations('report');
  const tasks = existingTasks ?? [];

  const [items, setItems] = useState<Record<Bucket, Item[]>>({
    done: tasks.filter((x) => x.bucket === 'done').map((x) => ({ title: x.title })),
    added: tasks.filter((x) => x.bucket === 'added').map((x) => ({ title: x.title })),
    hold: tasks.filter((x) => x.bucket === 'hold').map((x) => ({ title: x.title, reason: x.hold_reason || '' })),
    plan: tasks.filter((x) => x.bucket === 'plan' && x.source !== 'meeting').map((x) => ({ title: x.title })) || [{ title: '' }],
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function updateItem(b: Bucket, idx: number, field: 'title' | 'reason', value: string) {
    if (READONLY.includes(b)) return; // 읽기 전용 섹션은 수정 불가
    setItems((prev) => {
      const next = [...prev[b]];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, [b]: next };
    });
  }

  function addRow(b: Bucket) {
    if (READONLY.includes(b)) return; // 읽기 전용 섹션에는 행 추가 불가
    setItems((prev) => ({ ...prev, [b]: [...prev[b], { title: '', reason: '' }] }));
  }

  function removeRow(b: Bucket, idx: number) {
    if (READONLY.includes(b)) return; // 읽기 전용 섹션에는 행 삭제 불가
    setItems((prev) => ({ ...prev, [b]: prev[b].filter((_, i) => i !== idx) }));
  }

  async function submit() {
    setBusy(true);
    setError('');
    const payload: Record<Bucket, Item[]> = {
      done: [],
      added: [],
      hold: [],
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
      {BUCKETS.map((b) => {
        const isReadonly = READONLY.includes(b);
        const hasItems = items[b].length > 0;

        return (
          <div
            key={b}
            className={`rounded-xl border p-4 ${
              isReadonly
                ? 'border-gray-100 bg-gray-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">{t(b)}</h2>
              {isReadonly && (
                <span className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">
                  {t('readonly')}
                </span>
              )}
            </div>

            {!hasItems ? (
              <p className="text-xs text-gray-400">—</p>
            ) : (
              <div className="space-y-2">
                {items[b].map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={item.title}
                      onChange={(e) => updateItem(b, idx, 'title', e.target.value)}
                      placeholder={t('placeholder_item')}
                      disabled={isReadonly}
                      className={`flex-1 rounded border px-3 py-2 text-sm ${
                        isReadonly ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                      }`}
                    />
                    {b === 'hold' && (
                      <input
                        value={item.reason ?? ''}
                        onChange={(e) => updateItem(b, idx, 'reason', e.target.value)}
                        placeholder={t('reason')}
                        disabled={isReadonly}
                        className={`w-40 rounded border px-3 py-2 text-sm ${
                          isReadonly ? 'border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                        }`}
                      />
                    )}
                    {!isReadonly && items[b].length > 1 && (
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
            )}

            {!isReadonly && (
              <button
                type="button"
                onClick={() => addRow(b)}
                className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
              >
                {t('add_item')}
              </button>
            )}
          </div>
        );
      })}

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
