import assert from 'node:assert/strict';
import {
  nextBillingPeriod,
  countWeekdayInMonth,
  computeStudentInvoice,
  type BillableClass,
  type PlannedAbsence,
} from '../src/lib/billing.ts';
import {
  planCalendarEvents,
  type ClassOccurrence,
  type AbsenceRecord,
} from '../src/lib/calendar-logic.ts';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log('  ✓', name);
}

console.log('BILLING ENGINE');

test('20일 발송 → 다음 달이 청구 대상', () => {
  // 2026-05-20 발송 → 2026년 6월 청구
  assert.deepEqual(nextBillingPeriod(new Date(2026, 4, 20)), { year: 2026, month: 6 });
  // 12월 20일 발송 → 다음해 1월
  assert.deepEqual(nextBillingPeriod(new Date(2026, 11, 20)), { year: 2027, month: 1 });
});

test('요일 회차 계산: 2026년 6월의 월요일 수', () => {
  // 2026-06: 월요일은 1,8,15,22,29 = 5회
  assert.equal(countWeekdayInMonth(2026, 6, 1), 5);
  // 2026-06의 수요일: 3,10,17,24 = 4회
  assert.equal(countWeekdayInMonth(2026, 6, 3), 4);
});

test('결석 차감 + 회차×단가 합산', () => {
  const classes: BillableClass[] = [
    { classId: 'eng', className: 'English 1', dayOfWeek: 1, startTime: '16:00', endTime: '17:00', unitPrice: 60 },
    { classId: 'math', className: 'Math', dayOfWeek: 3, startTime: '17:00', endTime: '18:00', unitPrice: 90 },
  ];
  const absences: PlannedAbsence[] = [
    { classId: 'eng', date: '2026-06-08' },  // 월요일 1회 결석
    { classId: 'eng', date: '2026-06-22' },  // 월요일 1회 결석
    { classId: 'math', date: '2026-07-01' }, // 다른 달 → 무시되어야 함
  ];
  const inv = computeStudentInvoice(classes, absences, { year: 2026, month: 6 });

  const eng = inv.items.find((i) => i.classId === 'eng')!;
  assert.equal(eng.scheduledSessions, 5);
  assert.equal(eng.absentSessions, 2);
  assert.equal(eng.sessions, 3);
  assert.equal(eng.amount, 180); // 3 * 60

  const math = inv.items.find((i) => i.classId === 'math')!;
  assert.equal(math.absentSessions, 0); // 7월 결석은 6월 고지서에 영향 없음
  assert.equal(math.sessions, 4);
  assert.equal(math.amount, 360); // 4 * 90

  assert.equal(inv.subtotal, 540);
  assert.equal(inv.total, 540);
});

test('조정 항목(이월/수수료) 반영', () => {
  const classes: BillableClass[] = [
    { classId: 'sci', className: 'Science', dayOfWeek: 5, startTime: '10:00', endTime: '11:30', unitPrice: 90 },
  ];
  const inv = computeStudentInvoice(classes, [], { year: 2026, month: 6 }, [
    { label: '지난달 이월', amount: -100 },
    { label: '카드 수수료', amount: 15 },
  ]);
  // 2026-06 금요일: 5,12,19,26 = 4회 * 90 = 360
  assert.equal(inv.subtotal, 360);
  assert.equal(inv.total, 275); // 360 - 100 + 15
});

console.log('\nCALENDAR LOGIC');

const occ = (over: Partial<ClassOccurrence>): ClassOccurrence => ({
  classId: 'c1', className: 'English 1', teacherId: 't1',
  date: '2026-06-15', startTime: '16:00', endTime: '17:00',
  enrolledStudentIds: ['s1', 's2', 's3'], ...over,
});

test('결석 없음 → 캘린더 등록 안 함', () => {
  const plans = planCalendarEvents([occ({})], []);
  assert.equal(plans.length, 0);
});

test('일부 결석 → 관리자 캘린더만 (선생님 제외)', () => {
  const abs: AbsenceRecord[] = [
    { classId: 'c1', studentId: 's1', date: '2026-06-15' },
    { classId: 'c1', studentId: 's2', date: '2026-06-15' },
  ];
  const plans = planCalendarEvents([occ({})], abs);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].kind, 'PARTIAL_ABSENCE');
  assert.deepEqual(plans[0].targets, ['admin']);          // 선생님 제외
  assert.deepEqual(plans[0].attendingStudentIds, ['s3']);  // s3 출석
});

test('전원 결석 → 선생님 + 관리자 모두 등록(휴강)', () => {
  const abs: AbsenceRecord[] = [
    { classId: 'c1', studentId: 's1', date: '2026-06-15' },
    { classId: 'c1', studentId: 's2', date: '2026-06-15' },
    { classId: 'c1', studentId: 's3', date: '2026-06-15' },
  ];
  const plans = planCalendarEvents([occ({})], abs);
  assert.equal(plans[0].kind, 'CLASS_CANCELLED');
  assert.deepEqual(plans[0].targets.sort(), ['admin', 'teacher']);
});

console.log(`\nALL ${passed} TESTS PASSED ✅`);
