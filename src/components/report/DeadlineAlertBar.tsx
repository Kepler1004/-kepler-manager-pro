'use client';
import { useTranslations } from 'next-intl';
import type { Task } from '@/lib/report/types';

export function DeadlineAlertBar({ items }: { items: Task[] }) {
  const t = useTranslations('report');
  if (!items.length) return null;
  return (
    <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
        {t('imminent')} {items.length}
      </p>
      <ul className="mt-1 space-y-0.5 text-xs text-red-600">
        {items.slice(0, 6).map((x) => (
          <li key={x.id}>• {x.title} <span className="text-red-400">({x.deadline})</span></li>
        ))}
      </ul>
    </div>
  );
}
