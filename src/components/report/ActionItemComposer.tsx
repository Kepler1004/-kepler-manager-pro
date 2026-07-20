'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { StaffLite, TaskTag } from '@/lib/report/types';

export function ActionItemComposer({ staff }: { staff: StaffLite[] }) {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(staff[0]?.id ?? '');
  const [deadline, setDeadline] = useState('');
  const [tag, setTag] = useState<TaskTag>('planning');
  const [bucket, setBucket] = useState<'plan' | 'added'>('plan');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !assignee) return;
    setBusy(true);
    const res = await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, assignee_id: assignee, deadline: deadline || null, tag, target_bucket: bucket }),
    });
    setBusy(false);
    if (res.ok) { setOpen(false); setTitle(''); setDeadline(''); location.reload(); }
    else alert(t('submit_fail'));
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
        + {t('assign')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h3 className="mb-3 text-base font-semibold">{t('assign')}</h3>
            <label className="mb-2 block text-sm">{t('content')}
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
            </label>
            <label className="mb-2 block text-sm">{t('assignee')}
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm">
                {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name || t('no_name')}</option>)}
              </select>
            </label>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <label className="block text-sm">{t('deadline')}
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">{t('tag')}
                <select value={tag} onChange={(e) => setTag(e.target.value as TaskTag)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm">
                  <option value="urgent">{t('tag_urgent')}</option>
                  <option value="planning">{t('tag_planning')}</option>
                  <option value="dev">{t('tag_dev')}</option>
                  <option value="ops">{t('tag_ops')}</option>
                  <option value="etc">{t('tag_etc')}</option>
                </select>
              </label>
            </div>
            <label className="mb-3 block text-sm">{t('place')}
              <select value={bucket} onChange={(e) => setBucket(e.target.value as 'plan' | 'added')} className="mt-1 w-full rounded border px-2 py-1.5 text-sm">
                <option value="plan">{t('plan')}</option>
                <option value="added">{t('added')}</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded border px-3 py-1.5 text-sm">{t('loading') && ''}취소</button>
              <button onClick={submit} disabled={busy} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
                {busy ? t('submitting') : t('assign')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
