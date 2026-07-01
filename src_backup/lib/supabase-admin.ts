import { createClient } from '@supabase/supabase-js';
// 서버 전용: service_role 키로 RLS 우회 (크론/일괄 생성 등)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
