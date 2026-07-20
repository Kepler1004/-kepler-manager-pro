'use client';
import { useTranslations } from 'next-intl';
import { TaskTag } from './TaskTag';
import { daysUntil, type Task } from '@/lib/report/types';

export function TaskCard({ task }: { task: Task }) {
  const t = useTranslations('report');
  const dleft = daysUntil(task.deadline);
  const urgent = dleft !== null && dleft <= 1 && task.bucket !== 'done';

  return (
    <div className={`rounded-lg border bg-white p-2.5 text-sm shadow-sm ${urgent ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-gray-800">{task.title}</p>
        <TaskTag tag={task.tag} />
      </div>
      {task.hold_reason && <p className="mt-1 text-xs text-gray-500">{t('reason')}: {task.hold_reason}</p>}
      {task.deadline && (
        <p className={`mt-1 text-xs ${urgent ? 'font-semibold text-red-600' : 'text-gray-400'}`}>
          {t('deadline')} {task.deadline}
          {dleft !== null && (dleft < 0 ? ` (${t('overdue')})` : dleft === 0 ? ` (${t('due_today')})` : ` (D-${dleft})`)}
        </p>
      )}
    </div>
  );
}
