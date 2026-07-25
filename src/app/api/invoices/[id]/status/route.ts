import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentProfile } from '@/lib/guards';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || !['master', 'admin'].includes(profile.role))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { status, paid_amount } = await req.json();
  const patch: Record<string, any> = {};
  if (status) patch.status = status;
  if (paid_amount != null) patch.paid_amount = Number(paid_amount);
  if (status === 'paid') patch.paid_at = new Date().toISOString();
  else if (status === 'unpaid') patch.paid_at = null;

  const supabase = await createClient();
  const { data, error } = await supabase.from('invoices')
    .update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ invoice: data });
}
