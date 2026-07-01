/**
 * pdf.tsx — 고지서/급여명세서 PDF 생성 (서버 전용, @react-pdf/renderer)
 * 한국어/중국어 출력을 위해 Noto Sans CJK 폰트를 등록한다.
 */
import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font, renderToBuffer,
} from '@react-pdf/renderer';

// CJK 폰트 등록 (배포 시 /public/fonts 에 두고 경로를 교체하는 것을 권장)
Font.register({
  family: 'NotoSansKR',
  src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Regular.ttf',
});

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'NotoSansKR', color: '#0f172a' },
  h1: { fontSize: 18, marginBottom: 4 },
  meta: { color: '#64748b', marginBottom: 16 },
  row: { flexDirection: 'row', borderBottom: '1 solid #e2e8f0', paddingVertical: 5 },
  head: { backgroundColor: '#f1f5f9', fontWeight: 700 },
  c_name: { flex: 3 }, c_day: { flex: 1 }, c_time: { flex: 2 },
  c_ses: { flex: 1, textAlign: 'right' }, c_price: { flex: 1.5, textAlign: 'right' },
  c_amt: { flex: 1.5, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalLabel: { width: 120, textAlign: 'right', paddingRight: 8 },
  totalVal: { width: 90, textAlign: 'right', fontWeight: 700 },
});

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export interface InvoicePdfData {
  centerName: string;
  studentName: string;
  guardianName?: string;
  year: number; month: number;
  currency: string;
  items: {
    className: string; dayOfWeek: number; timeLabel: string;
    scheduledSessions: number; absentSessions: number; sessions: number;
    unitPrice: number; amount: number;
  }[];
  subtotal: number;
  adjustments: { label: string; amount: number }[];
  total: number;
}

function InvoiceDoc({ d }: { d: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>{d.centerName} · 원비 납부 고지서</Text>
        <Text style={s.meta}>
          {d.year}년 {d.month}월 · {d.studentName}
          {d.guardianName ? ` (보호자: ${d.guardianName})` : ''}
        </Text>

        <View style={[s.row, s.head]}>
          <Text style={s.c_name}>수업</Text>
          <Text style={s.c_day}>요일</Text>
          <Text style={s.c_time}>시간</Text>
          <Text style={s.c_ses}>회차</Text>
          <Text style={s.c_price}>1회 단가</Text>
          <Text style={s.c_amt}>금액</Text>
        </View>

        {d.items.map((it, i) => (
          <View style={s.row} key={i}>
            <Text style={s.c_name}>{it.className}</Text>
            <Text style={s.c_day}>{DOW[it.dayOfWeek]}</Text>
            <Text style={s.c_time}>{it.timeLabel}</Text>
            <Text style={s.c_ses}>
              {it.sessions}{it.absentSessions ? ` (-${it.absentSessions})` : ''}
            </Text>
            <Text style={s.c_price}>{it.unitPrice.toFixed(2)}</Text>
            <Text style={s.c_amt}>{it.amount.toFixed(2)}</Text>
          </View>
        ))}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>소계</Text>
          <Text style={s.totalVal}>{d.currency} {d.subtotal.toFixed(2)}</Text>
        </View>
        {d.adjustments.map((a, i) => (
          <View style={s.totalRow} key={i}>
            <Text style={s.totalLabel}>{a.label}</Text>
            <Text style={s.totalVal}>{d.currency} {a.amount.toFixed(2)}</Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>합계</Text>
          <Text style={s.totalVal}>{d.currency} {d.total.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(d: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDoc d={d} />);
}

export interface PayslipPdfData {
  centerName: string; teacherName: string;
  year: number; month: number; currency: string;
  items: { className: string; sessions: number; ratePerSession: number; amount: number }[];
  totalSessions: number; basePay: number;
  allowance: number; manualAdjust: number;
  employeeDeductions: { label: string; amount: number }[];
  employerContributions: { label: string; amount: number }[];
  netPay: number;
  taxNo?: string; icNo?: string; epfNo?: string; employmentType?: string;
}

function PayslipDoc({ d }: { d: PayslipPdfData }) {
  const ti = (label: string, val?: string) => val ? `${label}: ${val}` : '';
  const idLine = [ti('Tax', d.taxNo), ti('IC', d.icNo), ti('EPF', d.epfNo)].filter(Boolean).join('   ');
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>{d.centerName} · 급여 명세서</Text>
        <Text style={s.meta}>
          {d.year}년 {d.month}월 · {d.teacherName} 선생님
          {d.employmentType ? `  (${d.employmentType === 'freelancer' ? '프리랜서' : '정규직'})` : ''}
        </Text>
        {idLine ? <Text style={[s.meta, { marginTop: -10 }]}>{idLine}</Text> : null}

        <View style={[s.row, s.head]}>
          <Text style={s.c_name}>수업</Text>
          <Text style={s.c_ses}>회차</Text>
          <Text style={s.c_price}>1회 급여</Text>
          <Text style={s.c_amt}>금액</Text>
        </View>
        {d.items.map((it, i) => (
          <View style={s.row} key={i}>
            <Text style={s.c_name}>{it.className}</Text>
            <Text style={s.c_ses}>{it.sessions}</Text>
            <Text style={s.c_price}>{it.ratePerSession.toFixed(2)}</Text>
            <Text style={s.c_amt}>{it.amount.toFixed(2)}</Text>
          </View>
        ))}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>기본급</Text>
          <Text style={s.totalVal}>{d.currency} {d.basePay.toFixed(2)}</Text>
        </View>
        {d.allowance ? (
          <View style={s.totalRow}><Text style={s.totalLabel}>지원금</Text>
            <Text style={s.totalVal}>{d.currency} {d.allowance.toFixed(2)}</Text></View>
        ) : null}
        {d.manualAdjust ? (
          <View style={s.totalRow}><Text style={s.totalLabel}>보정</Text>
            <Text style={s.totalVal}>{d.currency} {d.manualAdjust.toFixed(2)}</Text></View>
        ) : null}

        {d.employeeDeductions.map((dd, i) => (
          <View style={s.totalRow} key={`ed${i}`}>
            <Text style={[s.totalLabel, { color: '#b91c1c' }]}>{dd.label}</Text>
            <Text style={[s.totalVal, { color: '#b91c1c' }]}>{d.currency} {dd.amount.toFixed(2)}</Text>
          </View>
        ))}

        <View style={[s.totalRow, { marginTop: 8 }]}>
          <Text style={[s.totalLabel, { fontSize: 12 }]}>실수령액</Text>
          <Text style={[s.totalVal, { fontSize: 12 }]}>{d.currency} {d.netPay.toFixed(2)}</Text>
        </View>

        {d.employerContributions.length ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: '#64748b', marginBottom: 4 }}>회사 부담금 (참고)</Text>
            {d.employerContributions.map((ec, i) => (
              <View style={s.totalRow} key={`er${i}`}>
                <Text style={s.totalLabel}>{ec.label}</Text>
                <Text style={s.totalVal}>{d.currency} {ec.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderPayslipPdf(d: PayslipPdfData): Promise<Buffer> {
  return renderToBuffer(<PayslipDoc d={d} />);
}
