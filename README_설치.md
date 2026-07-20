# 일일 업무 보고 모듈 (kepler-update-20) — 설치 안내

이 패키지는 **기존 파일을 덮지 않는 "드롭인" 방식**입니다. `src` 전체 교체가 없으므로
`layout.tsx` 되돌아가는 문제는 발생하지 않습니다.

---

## 0) 압축 풀기 (프로젝트 폴더에서)

```
cd ~/kepler-manager-pro
rm -rf ~/kepler-report && unzip -o ~/kepler-update-20.zip -d ~/kepler-report
```

## 1) 새 파일 복사 (기존 파일 안 건드림)

```
cp    ~/kepler-report/supabase/migrations/0009_daily_reports.sql supabase/migrations/
cp -R ~/kepler-report/src/lib/report                              src/lib/
cp -R ~/kepler-report/src/components/report                       src/components/
mkdir -p "src/app/api/reports/rollover" "src/app/api/tasks/[id]" "src/app/api/action-items"
cp    ~/kepler-report/src/app/api/reports/route.ts               src/app/api/reports/route.ts
cp    ~/kepler-report/src/app/api/reports/rollover/route.ts      src/app/api/reports/rollover/route.ts
cp    ~/kepler-report/src/app/api/tasks/route.ts                 src/app/api/tasks/route.ts
cp    "~/kepler-report/src/app/api/tasks/[id]/route.ts"          "src/app/api/tasks/[id]/route.ts"
cp    ~/kepler-report/src/app/api/action-items/route.ts          src/app/api/action-items/route.ts
```

## 2) Supabase 마이그레이션 실행

Supabase 대시보드 → SQL Editor → `supabase/migrations/0009_daily_reports.sql` 내용을
전체 복사해 붙여넣고 **Run**. (데이터는 안전, 새 테이블만 추가됩니다.)

## 3) 대시보드에 두 줄 추가

`_snippets/dashboard-mount.txt` 참고 —
`src/app/[locale]/(app)/dashboard/page.tsx` 상단에 import 한 줄, "미납" 아래에
`<DailyReportBoard />` 한 줄.

## 4) i18n 키 추가

`_snippets/i18n-keys.json` 의 `report` 블록을 `src/messages/{ko,en,zh}.json`에 병합.

## 5) 크론 등록 (선택)

`_snippets/vercel-cron.json` 을 프로젝트 루트 `vercel.json`에 병합.
`CRON_SECRET` 환경변수는 이미 있으니 그대로 사용됩니다.

## 6) 확인 후 배포

```
npm run build      # 로컬 빌드 확인
git add -A && git commit -m "feat: daily work report module (update-20)" && git push
```

---

## ⚠️ 통합 체크포인트 (빌드 에러 시 여기부터)

1. **`@/lib/guards` 의 `getCurrentProfile`** — 이 헬퍼가 `{ id, role }`을 반환한다고 가정했습니다.
   이름이 다르면 `src/app/api/**/route.ts` 와 `DailyReportBoard.tsx` 상단 import만 바꾸면 됩니다.
2. **Supabase 서버 클라이언트** — `src/lib/report/supabase.ts` 는 `@supabase/ssr`로 자립 동작합니다.
   기존에 쓰던 서버 클라이언트 헬퍼가 있으면 `reportServerClient()` 내부를 그 호출로 교체해도 됩니다.
3. **`is_active` 컬럼** — `profiles.is_active` 를 사용합니다(초기 스키마에 존재). 없다면 쿼리에서 `.eq('is_active', true)` 를 빼세요.

WhatsApp 입력(챗봇), 회의록 자동연동 푸시, 선생님 대상 발송은 다음 단계에서
`source='whatsapp'`, `pushed_at` 필드를 채우며 이 스키마 위에 그대로 얹습니다.
