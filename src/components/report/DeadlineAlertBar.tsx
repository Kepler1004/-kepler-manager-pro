// src/components/report/DeadlineAlertBar.tsx
import type { Task } from '@/lib/report/types';

export function DeadlineAlertBar({ items }: { items: Task[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
        마감 임박 업무 {items.length}건
      </p>
      <ul className="mt-1 space-y-0.5 text-xs text-red-600">
        {items.slice(0, 6).map((t) => (
          <li key={t.id}>
            • {t.title} <span className="text-red-400">({t.deadline})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
