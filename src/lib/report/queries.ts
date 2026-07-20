// src/lib/report/queries.ts
import { reportServerClient } from './supabase';
import type { StaffReport, Task } from './types';

const STAFF_ROLES = ['master', 'admin', 'admin_b', 'teacher'];

// 특정 날짜의 전 직원 보고를 직원별로 묶어서 반환 (관리자 대시보드용)
export async function getReportsByDate(date: string): Promise<StaffReport[]> {
  const sb = await reportServerClient();

  const { data: staff } = await sb
    .from('profiles')
    .select('id, full_name, role')
    .in('role', STAFF_ROLES)
    .eq('is_active', true)
    .order('role', { ascending: true });

  const { data: tasks } = await sb
    .from('tasks')
    .select('*')
    .eq('task_date', date)
    .order('created_at', { ascending: true });

  const byStaff = new Map<string, Task[]>();
  (tasks ?? []).forEach((t) => {
    const arr = byStaff.get(t.staff_id) ?? [];
    arr.push(t as Task);
    byStaff.set(t.staff_id, arr);
  });

  return (staff ?? []).map((s) => ({
    staff: { id: s.id, full_name: s.full_name || '(이름 없음)', role: s.role },
    tasks: byStaff.get(s.id) ?? [],
  }));
}

// 데드라인 임박(오늘~내일) 미완료 업무 (상단 경고바용)
export async function getImminentTasks(): Promise<Task[]> {
  const sb = await reportServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const { data } = await sb
    .from('tasks')
    .select('*')
    .neq('bucket', 'done')
    .not('deadline', 'is', null)
    .lte('deadline', tomorrow)
    .order('deadline', { ascending: true });

  return (data ?? []).filter((t) => t.deadline && t.deadline >= '1900-01-01') as Task[];
}
