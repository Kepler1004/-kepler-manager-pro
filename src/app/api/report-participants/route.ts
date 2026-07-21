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
    .select('id, full_name, role, report_enabled, whatsapp_number')
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
  const updates: { id: string; enabled: boolean; whatsapp_number?: string | null }[] = body.updates ?? [];
  const admin = reportAdminClient();
  for (const u of updates) {
    const patch: Record<string, unknown> = { report_enabled: u.enabled };
    if ('whatsapp_number' in u) {
      const n = (u.whatsapp_number ?? '').replace(/[^0-9]/g, '');
      patch.whatsapp_number = n || null;
    }
    await admin.from('profiles').update(patch).eq('id', u.id);
  }
  return NextResponse.json({ ok: true, count: updates.length });
}
