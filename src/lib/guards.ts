import { redirect } from 'next/navigation';
import { createClient } from './supabase-server';

export type Role = 'master' | 'admin' | 'admin_b' | 'teacher';

// 섹션별 접근 가능한 역할
const ACCESS: Record<string, Role[]> = {
  dashboard: ['master', 'admin', 'admin_b'],
  students:  ['master', 'admin', 'admin_b'],
  classes:   ['master', 'admin', 'admin_b'],
  timetable: ['master', 'admin', 'admin_b', 'teacher'],
  absences:  ['master', 'admin', 'admin_b', 'teacher'],
  holidays:  ['master', 'admin', 'admin_b', 'teacher'],
  invoices:  ['master', 'admin', 'admin_b'],
  payslips:  ['master', 'admin'],                 // 관리자B 제외
  vacations: ['master', 'admin', 'admin_b'],
  admins:    ['master', 'admin', 'admin_b'],
  pricing:   ['master', 'admin', 'admin_b'],
  salaries:  ['master', 'admin', 'admin_b'],
};

export function canAccess(role: string | null | undefined, section: string): boolean {
  if (!role) return false;
  return (ACCESS[section] ?? []).includes(role as Role);
}

export function homeFor(role: string | null | undefined): string {
  return role === 'teacher' ? '/timetable' : '/dashboard';
}

export async function getCurrentProfile() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from('profiles').select('id, role, full_name, email').eq('id', user.id).single();
  return data ?? null;
}

// 페이지 상단에서 호출: 권한 없으면 각 역할의 홈으로 리다이렉트
export async function requireSection(section: string) {
  const me = await getCurrentProfile();
  if (!me) redirect('/login');
  if (!canAccess(me.role, section)) redirect(homeFor(me.role));
  return me;
}

export function isStaff(role?: string | null) {
  return role === 'master' || role === 'admin' || role === 'admin_b';
}
