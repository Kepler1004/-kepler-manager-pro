# Kepler-Manager-Pro (Supabase edition)

케플러 학원 학생 관리 시스템. **Next.js 14 · TypeScript · Supabase · Resend · next-intl**.

> 계산 두뇌(`billing.ts`/`calendar-logic.ts`)는 순수 함수로 분리·검증됨.
> `npm test` → 7개 테스트 통과. `npx tsc --noEmit` → 에러 0.

| # | 요구사항 | 구현 위치 |
|---|---------|-----------|
| 1 | 영어/한국어/중국어 | `src/i18n/*`, `src/messages/*`, `LanguageSwitcher` |
| 2 | 마스터가 관리자 추가 | `profiles.role` + RLS, `/admins` |
| 3 | 수납·수강·요일/시간 | `students` `classes` `enrollments` |
| 4 | English/Math Pro 버튼 | `(app)/layout.tsx` |
| 5 | PDF 고지서 이메일 발송 | `/api/invoices/send` |
| 6 | 20일 다음달·결석차감·캘린더 | `cron/invoices`, `billing.ts`, `calendar-*` |
| 7 | 회차 자동합산 고지서 | `billing.ts`, `pdf.tsx` |
| 8 | 수업별 1회 단가 편집 | `classes.session_price`, `/pricing` |
| 9 | 선생님×수업 1회 급여 | `teacher_salaries`, `/salaries` |
| 10 | 1일 지난달 급여 명세서 | `cron/payslips`, `payslip-service.ts` |

---

## 1. 설치
```bash
npm install
cp .env.local.example .env.local
```
(Node 20 이상)

## 2. Supabase
1. supabase.com → New Project (**Region: Singapore** 권장 — 말레이시아/한국에서 빠름).
2. **SQL Editor**에서 순서대로 붙여넣고 Run:
   - `supabase/migrations/0001_init.sql`  (테이블 + RLS + 회원가입 트리거)
   - `supabase/migrations/0002_seed.sql`  (과목 단가 시드)
3. **Project Settings → API**에서 `URL`, `anon key`, `service_role key` 복사 → `.env.local`.

> drizzle-kit 같은 CLI 푸시가 없어, `.env.local`을 CLI가 못 읽는 문제가 발생하지 않습니다.

## 3. 로그인 / 권한 (요구사항 2)
- **Authentication → Providers**에서 Email 활성화.
- 앱의 `/sign-in`은 Supabase Auth를 쓰도록 추가 구현하거나, 우선 Supabase 대시보드에서
  사용자를 만들어 테스트하세요.
- `0001_init.sql`의 트리거가 회원가입 시 `profiles`를 자동 생성하며 **첫 사용자를 master**로 지정합니다.
- 이후 master가 다른 사용자의 `profiles.role`을 admin/teacher로 변경 (RLS가 master 쓰기만 허용).

## 4. Resend (요구사항 5,10)
도메인 인증(SPF/DKIM) → API Key → `RESEND_API_KEY`, 인증 주소 → `RESEND_FROM`.

## 5. 실행
```bash
npm run dev      # http://localhost:3000 → /ko/dashboard
npm test         # 계산 엔진 테스트 (7 passed)
npm run build
```

## 6. GitHub & Vercel
```bash
git init && git add . && git commit -m "init: kepler-manager-pro (supabase)"
git remote add origin https://github.com/<you>/kepler-manager-pro.git
git push -u origin main
```
Vercel import → 환경변수 입력 → 배포. `vercel.json` 크론 자동 등록:
- 매월 20일 → `/api/cron/invoices` (다음달 고지서 + 캘린더 동기화)
- 매월 1일 → `/api/cron/payslips` (지난달 급여 명세서)

## 7. 핵심 로직
- 회차 = 그 달 수업요일 등장 횟수 − 사전결석. 고지서 = Σ(회차×단가) + 조정.
- 급여 = Σ(실제 청구 회차 × 선생님 1회 급여) → 결석분 자동 제외.
- 캘린더: 일부결석=관리자만, 전원결석=선생님+관리자.

## 8. 남은 CRUD 화면
`/students /classes /pricing /salaries /absences /admins /payslips` 는 스키마·서비스가 준비된 스텁입니다.
supabase 클라이언트로 폼만 연결하면 됩니다 (invoices 페이지가 예시).
