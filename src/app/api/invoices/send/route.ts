import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { renderInvoicePdf } from '@/lib/pdf';
import { sendPdfEmail } from '@/lib/email';
import { getCurrentProfile, isStaff } from '@/lib/guards';

export const runtime = 'nodejs';

const SEL = '*, students(name, guardian_name, guardian_email), invoice_items(*)';

async function sendOne(db: any, inv: any): Promise<boolean> {
  const student = inv.students;
  if (!student?.guardian_email) return false;
  const pdf = await renderInvoicePdf({
    centerName: 'Kepler', studentName: student.name, guardianName: student.guardian_name,
    year: inv.period_year, month: inv.period_month, currency: inv.currency,
    items: (inv.invoice_items ?? []).map((it: any) => ({
      className: it.class_name, dayOfWeek: it.day_of_week, timeLabel: it.time_label,
      scheduledSessions: it.scheduled_sessions, absentSessions: it.absent_sessions,
      sessions: it.sessions, unitPrice: Number(it.unit_price), amount: Number(it.amount),
    })),
    subtotal: Number(inv.subtotal), adjustments: inv.adjustments ?? [], total: Number(inv.total),
  });
  await sendPdfEmail({
    to: student.guardian_email,
    subject: `[Kepler] ${inv.period_year}년 ${inv.period_month}월 원비 고지서`,
    html: `<p>${student.name} 학생의 ${inv.period_month}월 원비 고지서를 첨부합니다.</p>`,
    filename: `invoice_${student.name}_${inv.period_year}-${inv.period_month}.pdf`, pdf,
  });
  await db.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', inv.id);
  return true;
}

// POST { invoiceId } (개별) | { invoiceIds:[...] } (선택) | { year, month } (전체)
export async function POST(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!isStaff(me?.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json();
  const db = createAdminClient();

  if (body.invoiceId) {
    const { data: inv, error } = await db.from('invoices').select(SEL).eq('id', body.invoiceId).single();
    if (error || !inv) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const ok = await sendOne(db, inv);
    return NextResponse.json({ ok, sent: ok ? 1 : 0, failed: ok ? 0 : 1 });
  }

  let list: any[] = [];
  if (Array.isArray(body.invoiceIds) && body.invoiceIds.length) {
    const { data } = await db.from('invoices').select(SEL).in('id', body.invoiceIds);
    list = data ?? [];
  } else if (body.year && body.month) {
    const { data } = await db.from('invoices').select(SEL).eq('period_year', body.year).eq('period_month', body.month);
    list = data ?? [];
  } else {
    return NextResponse.json({ error: 'invoiceId / invoiceIds / year+month required' }, { status: 400 });
  }

  let sent = 0, failed = 0;
  for (const inv of list) { try { (await sendOne(db, inv)) ? sent++ : failed++; } catch { failed++; } }
  return NextResponse.json({ ok: true, sent, failed });
}
