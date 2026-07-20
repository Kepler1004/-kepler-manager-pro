// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/guards';
import { reportServerClient } from '@/lib/report/supabase';

export async function POST(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const staffId = body.staff_id ?? me.id;

  // 본인 것이 아니면 관리자만 대리 생성 가능
  if (staffId !== me.id && !['master', 'admin', 'admin_b'].includes(me.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const sb = await reportServerClient();
  const { data, error } = await sb
    .from('tasks')
    .insert({
      staff_id: staffId,
      task_date: body.task_date ?? new Date().toISOString().slice(0, 10),
      bucket: body.bucket ?? 'plan',
      title: body.title,
      tag: body.tag ?? 'etc',
      hold_reason: body.hold_reason ?? null,
      deadline: body.deadline ?? null,
      source: body.source ?? 'manual',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ task: data });
}
