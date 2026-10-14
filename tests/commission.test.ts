import assert from 'node:assert/strict';
import {
  computeCommission, addMonthsStr, normalizeConfig, DEFAULT_COMMISSION_CONFIG,
  type CounselorStudent,
} from '../src/lib/commission.ts';
import { computePayroll } from '../src/lib/payroll.ts';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log('  ✓', name);
}

console.log('\nCOUNSELOR COMMISSION');

const C = DEFAULT_COMMISSION_CONFIG;
const st = (id: string, programType: 'international' | 'local' | null, enrolledDate: string, withdrawnDate: string | null = null): CounselorStudent =>
  ({ id, name: id, programType, enrolledDate, withdrawnDate });
const base = { year: 2026, month: 10, hireDate: '2026-01-05', probationMonths: 3, config: C };

test('월말 보정: 1/31 + 1개월 = 2/28, 8/31 + 6개월 = 2/28, 윤년 2/29', () => {
  assert.equal(addMonthsStr('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonthsStr('2026-08-31', 6), '2027-02-28');
  assert.equal(addMonthsStr('2027-08-31', 6), '2028-02-29');
  assert.equal(addMonthsStr('2026-11-15', 3), '2027-02-15');
});

test('신규 등록 건당: 국제반 50 / 로컬반 25, 다른 달은 제외', () => {
  const r = computeCommission({ ...base, students: [
    st('a', 'international', '2026-10-01'), st('b', 'local', '2026-10-31'), st('c', 'local', '2026-09-30'),
  ] });
  assert.equal(r.newIntl.length, 1); assert.equal(r.newLocal.length, 1);
  assert.equal(r.newPay, 75); assert.equal(r.goalPay, 0); assert.equal(r.total, 75);
});

test('수습 3개월: 입사 2026-07-15 → 10-15 부터 적용 (10-14 등록은 제외)', () => {
  const r = computeCommission({ ...base, hireDate: '2026-07-15', students: [
    st('a', 'international', '2026-10-14'), st('b', 'international', '2026-10-15'),
  ] });
  assert.equal(r.probationEnd, '2026-10-15');
  assert.equal(r.newIntl.length, 1); assert.equal(r.excludedProbation, 1); assert.equal(r.total, 50);
});

test('해당 월 전체가 수습이면 성과급 0', () => {
  const r = computeCommission({ ...base, hireDate: '2026-08-01', students: [st('a', 'international', '2026-10-03')] });
  assert.equal(r.inProbationWholeMonth, true); assert.equal(r.total, 0);
});

test('목표(각각 모드): 국제반 10명 → +300, 로컬반 9명 → 보너스 없음', () => {
  const s: CounselorStudent[] = [];
  for (let i = 0; i < 10; i++) s.push(st(`i${i}`, 'international', '2026-10-10'));
  for (let i = 0; i < 9; i++) s.push(st(`l${i}`, 'local', '2026-10-11'));
  const r = computeCommission({ ...base, students: s });
  assert.equal(r.goalIntl, 300); assert.equal(r.goalLocal, 0);
  assert.equal(r.total, 10 * 50 + 9 * 25 + 300);
});

test('목표(합계 모드): 국제 4 + 로컬 6 = 10명 → 로컬 기준 +150', () => {
  const s: CounselorStudent[] = [];
  for (let i = 0; i < 4; i++) s.push(st(`i${i}`, 'international', '2026-10-10'));
  for (let i = 0; i < 6; i++) s.push(st(`l${i}`, 'local', '2026-10-10'));
  const r = computeCommission({ ...base, config: { ...C, goalMode: 'combined' }, students: s });
  assert.equal(r.goalIntl, 0); assert.equal(r.goalLocal, 150);
  assert.equal(r.total, 4 * 50 + 6 * 25 + 150);
});

test('장기 유지 6개월: 04-20 등록 → 10월 지급(1회), 9월/11월은 지급 없음', () => {
  const s = [st('a', 'international', '2026-04-20'), st('b', 'local', '2026-04-01')];
  const oct = computeCommission({ ...base, students: s });
  assert.equal(oct.retention.length, 2); assert.equal(oct.retentionPay, 150);
  assert.equal(computeCommission({ ...base, month: 9, students: s }).retention.length, 0);
  assert.equal(computeCommission({ ...base, month: 11, students: s }).retention.length, 0);
});

test('장기 유지: 6개월 도달 전 퇴원하면 제외, 도달일 이후 퇴원은 지급', () => {
  const r = computeCommission({ ...base, students: [
    st('a', 'international', '2026-04-20', '2026-10-19'),
    st('b', 'international', '2026-04-20', '2026-10-20'),
  ] });
  assert.deepEqual(r.retention.map((x) => x.id), ['b']);
});

test('장기 유지: 수습 중 등록했어도 도달일이 수습 후면 지급', () => {
  const r = computeCommission({ ...base, hireDate: '2026-03-01', students: [st('a', 'local', '2026-04-10')] });
  assert.equal(r.retentionPay, 50);
});

test('반 구분(국제/로컬) 미입력 학생은 지급하지 않고 경고 목록에 표시', () => {
  const r = computeCommission({ ...base, students: [st('x', null, '2026-10-02')] });
  assert.equal(r.total, 0); assert.deepEqual(r.missingProgramType.map((x) => x.id), ['x']);
});

test('설정 정규화: 빈 값/음수 → 기본값, 문자열 숫자 허용', () => {
  const c = normalizeConfig({ intlNew: '70', localNew: -5, goalMode: 'combined', goalThreshold: 0 });
  assert.equal(c.intlNew, 70); assert.equal(c.localNew, 25); assert.equal(c.goalMode, 'combined'); assert.equal(c.goalThreshold, 1);
  assert.deepEqual(normalizeConfig(null), C);
});

test('급여 합산: 기본급 4000 + 주유비 300 + 성과급 575, 공제는 기본급+성과급 기준', () => {
  const p = computePayroll({ employmentType: 'salaried_fixed', sessionPay: 0, fixedBaseSalary: 4000,
    allowance: 300, commission: 575, config: { epfEmployee: { type: 'percent', value: 11 } } });
  assert.equal(p.commission, 575);
  assert.equal(p.totalEmployeeDeduction, 503.25);           // 11% × 4575
  assert.equal(p.netPay, 4000 + 300 + 575 - 503.25);         // 4371.75
});

test('성과급 없으면 기존 급여 계산과 동일', () => {
  const p = computePayroll({ employmentType: 'salaried_fixed', sessionPay: 0, fixedBaseSalary: 4000,
    allowance: 300, config: { epfEmployee: { type: 'percent', value: 11 } } });
  assert.equal(p.totalEmployeeDeduction, 440); assert.equal(p.netPay, 3860);
});

console.log(`\nALL ${passed} COMMISSION TESTS PASSED ✅`);
