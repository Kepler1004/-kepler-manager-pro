'use server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase-admin';
import { getCurrentProfile, isStaff } from '@/lib/guards';

async function ensureMaster() {
  const me = await getCurrentProfile();
  if (me?.role !== 'master') throw new Error('마스터만 가능합니다.');
}
async function ensureStaff() {
  const me = await getCurrentProfile();
  if (!isStaff(me?.role)) throw new Error('권한이 없습니다.');
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

// 선생님 급여/공제 정보 저장 (마스터)
export async function updateTeacherPayroll(formData: FormData) {
  await ensureStaff();
  const admin = createAdminClient();
  const id = String(formData.get('id'));
  const g = (k: string) => { const v = formData.get(k); return v === null || v === '' ? null : String(v); };
  const setting = (k: string) => {
    const val = formData.get(`${k}_value`);
    if (val === null || val === '') return null;
    return { type: String(formData.get(`${k}_type`) ?? 'percent'), value: Number(val) };
  };
  const payroll_config: Record<string, unknown> = {};
  for (const k of ['pcb','epfEmployee','epfEmployer','socsoEmployee','socsoEmployer','eisEmployee','eisEmployer']) {
    const v = setting(k); if (v) payroll_config[k] = v;
  }
  const { error } = await admin.from('profiles').update({
    employment_type: g('employment_type') ?? 'freelancer',
    fixed_base_salary: Number(formData.get('fixed_base_salary') ?? 0),
    tax_no: g('tax_no'), ic_no: g('ic_no'), epf_no: g('epf_no'), bank_account: g('bank_account'),
    google_calendar_id: g('google_calendar_id'),
    allowance: Number(formData.get('allowance') ?? 0),
    payroll_config,
  }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admins');
}
