import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentProfile } from '@/lib/guards';
import { recomputeInvoiceTotal } from '@/lib/invoice/adjustments';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; adjId: string } }
) {
  const profile = await getCurrentProfile();
  if (!profile || !['master', 'admin'].includes(profile.role))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = await createClient();
  const { error } = await supabase.from('invoice_adjustments')
    .delete().eq('id', params.adjId).eq('invoice_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const total = await recomputeInvoiceTotal(supabase, params.id);
  return NextResponse.json({ ok: true, total });
}
