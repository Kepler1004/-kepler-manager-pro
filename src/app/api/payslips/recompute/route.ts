import { NextRequest, NextResponse } from 'next/server';
import { recomputePayslip } from '@/lib/payslip-service';
import { getCurrentProfile, isStaff } from '@/lib/guards';

export const runtime = 'nodejs';

// POST { payslipId, items:[{class_id,class_name,sessions,rate_per_session}], manualAdjust }
export async function POST(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!isStaff(me?.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { payslipId, items, manualAdjust } = await req.json();
  if (!payslipId || !Array.isArray(items)) return NextResponse.json({ error: 'bad input' }, { status: 400 });
  const r = await recomputePayslip(payslipId, { items, manualAdjust: Number(manualAdjust ?? 0) });
  return NextResponse.json({ ok: true, netPay: r.netPay });
}
