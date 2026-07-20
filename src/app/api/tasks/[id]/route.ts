// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/guards';
import { reportServerClient } from '@/lib/report/supabase';

const EDITABLE = ['bucket', 'title', 'tag', 'hold_reason', 'deadline'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE) if (k in body) patch[k] = body[k];

  const sb = await reportServerClient();
  const { data, error } = await sb
    .from('tasks')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single(); // RLS 가 소유권/관리자 권한을 강제

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ task: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const sb = await reportServerClient();
  const { error } = await sb.from('tasks').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
