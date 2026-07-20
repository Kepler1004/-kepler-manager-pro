import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/guards';
import { reportServerClient, reportAdminClient } from '@/lib/report/supabase';

const STAFF = ['master', 'admin', 'admin_b'];

export async function GET() {
  const me = await getCurrentProfile();
  if (!me || !STAFF.includes(me.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const sb = await reportServerClient();
  const { data } = await sb
    .from('profiles')
    .select('id, full_name, role, report_enabled')
    .in('role', ['master', 'admin', 'admin_b', 'teacher'])
    .eq('is_active', true)
    .order('role', { ascending: true });
  return NextResponse.json({ staff: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me || !STAFF.includes(me.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const body = await req.json();
  const updates: { id: string; enabled: boolean }[] = body.updates ?? [];
  const admin = reportAdminClient();
  for (const u of updates) {
    await admin.from('profiles').update({ report_enabled: u.enabled }).eq('id', u.id);
  }
  return NextResponse.json({ ok: true, count: updates.length });
}
