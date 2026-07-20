// src/lib/report/types.ts
// 일일 업무 보고 시스템 공용 타입 + 태그 색상 매핑

export type TaskBucket = 'done' | 'added' | 'hold' | 'plan';
export type TaskTag = 'urgent' | 'planning' | 'dev' | 'ops' | 'etc';
export type ReportStatus = 'pending' | 'submitted';

export interface Task {
  id: string;
  staff_id: string;
  report_id: string | null;
  task_date: string;        // 'YYYY-MM-DD'
  bucket: TaskBucket;
  title: string;
  tag: TaskTag;
  hold_reason: string | null;
  deadline: string | null;  // 'YYYY-MM-DD'
  carried_from: string | null;
  source: 'manual' | 'meeting' | 'whatsapp';
  created_at: string;
}

export interface StaffLite {
  id: string;
  full_name: string;
  role: string;
}

export interface StaffReport {
  staff: StaffLite;
  tasks: Task[];
}

// enum → Tailwind 클래스 (DB엔 값만 저장, 색은 여기서만 관리)
export const TAG_STYLE: Record<TaskTag, { dot: string; chip: string; label: string }> = {
  urgent:   { dot: 'bg-red-500',    chip: 'bg-red-50 text-red-700 ring-red-200',       label: '🔴 긴급' },
  planning: { dot: 'bg-blue-500',   chip: 'bg-blue-50 text-blue-700 ring-blue-200',    label: '🔵 기획' },
  dev:      { dot: 'bg-green-500',  chip: 'bg-green-50 text-green-700 ring-green-200',  label: '🟢 개발' },
  ops:      { dot: 'bg-amber-500',  chip: 'bg-amber-50 text-amber-700 ring-amber-200', label: '🟠 운영' },
  etc:      { dot: 'bg-gray-400',   chip: 'bg-gray-50 text-gray-600 ring-gray-200',    label: '⚪ 기타' },
};

export const BUCKET_LABEL: Record<TaskBucket, string> = {
  done:  '✅ 오늘 한 일',
  added: '➕ 오늘 추가된 업무',
  hold:  '⏳ 마무리 못한 일',
  plan:  '🎯 내일 할 일',
};

// deadline 이 오늘 기준 며칠 남았는지 (null이면 null)
export function daysUntil(deadline: string | null, today = new Date()): number | null {
  if (!deadline) return null;
  const d = new Date(deadline + 'T00:00:00');
  const t = new Date(today.toISOString().slice(0, 10) + 'T00:00:00');
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}
