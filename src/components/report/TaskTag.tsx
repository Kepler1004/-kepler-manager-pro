// src/components/report/TaskTag.tsx
import { TAG_STYLE, type TaskTag as TT } from '@/lib/report/types';

export function TaskTag({ tag }: { tag: TT }) {
  const s = TAG_STYLE[tag];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
