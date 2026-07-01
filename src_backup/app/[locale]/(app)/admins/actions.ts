'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase-admin';
import { getCurrentProfile } from '@/lib/guards';

async function ensureMaster() {
  const me = await getCurrentProfile();
  if (me?.role !== 'master') throw new Error('마스터만 가능합니다.');
}

// 선생님(또는 관리자) 계정 생성: 로그인 가능한 auth 사용자 + profiles 역할 지정
export async function createUserAccount(formData: FormData) {
  await ensureMaster();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const role = String(formData.get('role') ?? 'teacher') as 'admin' | 'teacher';
  if (!email || password.length < 6) throw new Error('이메일/비밀번호(6자 이상)를 확인하세요.');

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw new Error(error.message);

  // 트리거가 만든 프로필을 역할/이름으로 갱신 (없으면 생성)
  const id = data.user!.id;
  const { error: e2 } = await admin.from('profiles')
    .upsert({ id, email, full_name: fullName, role }, { onConflict: 'id' });
  if (e2) throw new Error(e2.message);
  revalidatePath('/admins');
}

export async function updateUserRole(formData: FormData) {
  await ensureMaster();
  const id = String(formData.get('id'));
  const role = String(formData.get('role')) as 'master' | 'admin' | 'teacher';
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ role }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admins');
}

export async function toggleUserActive(formData: FormData) {
  await ensureMaster();
  const id = String(formData.get('id'));
  const active = String(formData.get('active')) === 'true';
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admins');
}
