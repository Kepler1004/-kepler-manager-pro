'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TaskTag } from './TaskTag';
import { daysUntil, type Task } from '@/lib/report/types';

export function TaskCard({ task }: { task: Task }) {
  const t = useTranslations('report');
  const dleft = daysUntil(task.deadline);
  const urgent = dleft !== null && dleft <= 1 && task.bucket !== 'done';
  const [busy, setBusy] = useState(false);

  const isClickable = task.bucket === 'plan';

  async function handleClick() {
    if (!isClickable || busy) return;
    setBusy(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: 'done' }),
    });
    setBusy(false);
    if (res.ok) {
      location.reload();
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`rounded-lg border bg-white p-2.5 text-sm shadow-sm transition-all ${
        urgent ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'
      } ${isClickable ? 'cursor-pointer hover:shadow-md hover:bg-gray-50' : ''} ${
        busy ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-gray-800">{task.title}</p>
        <TaskTag tag={task.tag} />
      </div>
      {task.hold_reason && (
        <p className="mt-1 text-xs text-gray-500">
          {t('reason')}: {task.hold_reason}
        </p>
      )}
      {task.deadline && (
        <p
          className={`mt-1 text-xs ${
            urgent ? 'font-semibold text-red-600' : 'text-gray-400'
          }`}
        >
          {t('deadline')} {task.deadline}
          {dleft !== null &&
            (dleft < 0
              ? ` (${t('overdue')})`
              : dleft === 0
                ? ` (${t('due_today')})`
                : ` (D-${dleft})`)}
        </p>
      )}
      {isClickable && (
        <p className="mt-2 text-xs font-semibold text-indigo-600">
          {t('click_to_mark_done')}
        </p>
      )}
    </div>
  );
}
