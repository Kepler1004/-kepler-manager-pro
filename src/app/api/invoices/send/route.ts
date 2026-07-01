import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { renderInvoicePdf } from '@/lib/pdf';
import { sendPdfEmail } from '@/lib/email';

export const runtime = 'nodejs';

// POST /api/invoices/send  { invoiceId }
export async function POST(req: NextRequest) {
  const { invoiceId } = await req.json();
  if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });

  const db = createAdminClient();
  const { data: inv, error } = await db
    .from('invoices')
    .select('*, students(name, guardian_name, guardian_email), invoice_items(*)')
    .eq('id', invoiceId).single();
  if (error || !inv) return NextResponse.json({ error: 'invoice not found' }, { status: 404 });

  const student: any = inv.students;
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

  await db.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoiceId);
  return NextResponse.json({ ok: true });
}
