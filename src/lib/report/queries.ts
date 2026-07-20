import { reportServerClient } from './supabase';
import { localToday } from './types';
import type { StaffReport, Task } from './types';

const STAFF_ROLES = ['master', 'admin', 'admin_b', 'teacher'];

export async function getReportsByDate(date: string): Promise<StaffReport[]> {
  const sb = await reportServerClient();

  const { data: staff } = await sb
    .from('profiles')
    .select('id, full_name, role')
    .in('role', STAFF_ROLES)
    .eq('is_active', true)
    .eq('report_enabled', true)
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
    staff: { id: s.id, full_name: s.full_name || '', role: s.role },
    tasks: byStaff.get(s.id) ?? [],
  }));
}

export async function getImminentTasks(): Promise<Task[]> {
  const sb = await reportServerClient();
  const tomorrow = localToday(new Date(Date.now() + 86400000));

  const { data } = await sb
    .from('tasks')
    .select('*')
    .neq('bucket', 'done')
    .not('deadline', 'is', null)
    .lte('deadline', tomorrow)
    .order('deadline', { ascending: true });

  return (data ?? []).filter((t) => t.deadline && t.deadline >= '1900-01-01') as Task[];
}
