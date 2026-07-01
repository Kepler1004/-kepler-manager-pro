import { createClient } from './supabase-server';

export type Role = 'master' | 'admin' | 'teacher';

export async function getCurrentProfile() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from('profiles').select('id, role, full_name, email').eq('id', user.id).single();
  return data ?? null;
}

export function isStaff(role?: string | null) {
  return role === 'master' || role === 'admin';
}
