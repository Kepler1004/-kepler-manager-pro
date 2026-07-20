// src/components/report/TaskCard.tsx
import { TaskTag } from './TaskTag';
import { daysUntil, type Task } from '@/lib/report/types';

export function TaskCard({ task }: { task: Task }) {
  const dleft = daysUntil(task.deadline);
  const urgent = dleft !== null && dleft <= 1 && task.bucket !== 'done';

  return (
    <div
      className={`rounded-lg border bg-white p-2.5 text-sm shadow-sm ${
        urgent ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-gray-800">{task.title}</p>
        <TaskTag tag={task.tag} />
      </div>

      {task.hold_reason && (
        <p className="mt-1 text-xs text-gray-500">사유: {task.hold_reason}</p>
      )}

      {task.deadline && (
        <p className={`mt-1 text-xs ${urgent ? 'font-semibold text-red-600' : 'text-gray-400'}`}>
          마감 {task.deadline}
          {dleft !== null && (dleft < 0 ? ' (지남)' : dleft === 0 ? ' (오늘)' : ` (D-${dleft})`)}
        </p>
      )}
    </div>
  );
}
