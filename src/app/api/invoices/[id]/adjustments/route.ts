import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentProfile } from '@/lib/guards';
import { recomputeInvoiceTotal } from '@/lib/invoice/adjustments';

async function guard() {
  const profile = await getCurrentProfile();
  if (!profile || !['master', 'admin'].includes(profile.role)) return null;
  return profile;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoice_adjustments').select('*')
    .eq('invoice_id', params.id).order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ adjustments: data });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await guard();
  if (!profile) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  const { kind, subject_id, session_delta, unit_fee, reason } = body;
  if (!reason || !String(reason).trim())
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });

  let amount = body.amount;
  if (amount == null && session_delta != null && unit_fee != null) {
    amount = Number(session_delta) * Number(unit_fee);
  }
  if (amount == null)
    return NextResponse.json({ error: 'amount_required' }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from('invoice_adjustments').insert({
    invoice_id: params.id,
    kind: kind ?? 'other',
    subject_id: subject_id ?? null,
    session_delta: session_delta ?? null,
    unit_fee: unit_fee ?? null,
    amount,
    reason: String(reason).trim(),
    created_by: profile.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const total = await recomputeInvoiceTotal(supabase, params.id);
  return NextResponse.json({ adjustment: data, total });
}
