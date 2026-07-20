// src/lib/report/types.ts
export type TaskBucket = 'done' | 'added' | 'hold' | 'plan';
export type TaskTag = 'urgent' | 'planning' | 'dev' | 'ops' | 'etc';
export type ReportStatus = 'pending' | 'submitted';

export interface Task {
  id: string;
  staff_id: string;
  report_id: string | null;
  task_date: string;
  bucket: TaskBucket;
  title: string;
  tag: TaskTag;
  hold_reason: string | null;
  deadline: string | null;
  carried_from: string | null;
  source: 'manual' | 'meeting' | 'whatsapp';
  created_at: string;
}

export interface StaffLite { id: string; full_name: string; role: string; }
export interface StaffReport { staff: StaffLite; tasks: Task[]; }

// 색상만 여기서 관리 (라벨 텍스트는 i18n key 로 분리)
export const TAG_STYLE: Record<TaskTag, { dot: string; chip: string }> = {
  urgent:   { dot: 'bg-red-500',   chip: 'bg-red-50 text-red-700 ring-red-200' },
  planning: { dot: 'bg-blue-500',  chip: 'bg-blue-50 text-blue-700 ring-blue-200' },
  dev:      { dot: 'bg-green-500', chip: 'bg-green-50 text-green-700 ring-green-200' },
  ops:      { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
  etc:      { dot: 'bg-gray-400',  chip: 'bg-gray-50 text-gray-600 ring-gray-200' },
};

// i18n key 매핑 (t('report.xxx') 로 사용)
export const TAG_KEY: Record<TaskTag, string> = {
  urgent: 'tag_urgent', planning: 'tag_planning', dev: 'tag_dev', ops: 'tag_ops', etc: 'tag_etc',
};
export const BUCKET_KEY: Record<TaskBucket, string> = {
  done: 'done', added: 'added', hold: 'hold', plan: 'plan',
};
export const ROLE_KEY: Record<string, string> = {
  master: 'role_master', admin: 'role_admin', admin_b: 'role_admin_b', teacher: 'role_teacher',
};

// 현지(브라우저) 기준 오늘 날짜 YYYY-MM-DD (UTC slice 로 인한 하루 밀림 방지)
export function localToday(d = new Date()): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export function daysUntil(deadline: string | null, today = new Date()): number | null {
  if (!deadline) return null;
  const d = new Date(deadline + 'T00:00:00');
  const t = new Date(localToday(today) + 'T00:00:00');
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}
