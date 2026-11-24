-- ============================================================================
-- 0012_student_nationality.sql — 학생 국적(한국인/비한국인) + 모집 담당 상담실장 자동 배정
-- Supabase SQL Editor 에 전체를 붙여넣고 Run. 여러 번 실행해도 안전(idempotent).
-- 기존 데이터 영향 없음: 새 컬럼은 전부 nullable.
-- ============================================================================

-- ── 1) 학생(students): 국적 구분 ──────────────────────────────────────────
alter table students add column if not exists nationality text;

do $$ begin
  alter table students add constraint students_nationality_chk
    check (nationality is null or nationality in ('korean','non_korean'));
exception when duplicate_object then null; end $$;

comment on column students.nationality is
  'korean(한국인) / non_korean(비한국인) — 학생 등록 화면에서 선택하면 profiles.recruit_group 이 일치하는 상담실장이 counselor_id 에 자동 배정됨(수동 변경 가능)';

-- ── 2) 직원(profiles): 이 상담실장이 모집을 담당하는 국적군 ────────────────────
alter table profiles add column if not exists recruit_group text;

do $$ begin
  alter table profiles add constraint profiles_recruit_group_chk
    check (recruit_group is null or recruit_group in ('korean','non_korean'));
exception when duplicate_object then null; end $$;

comment on column profiles.recruit_group is
  'korean / non_korean — 이 값이 설정된 상담실장은 학생 등록 화면에서 해당 국적 선택 시 담당 상담실장으로 자동 제안됨. 예: 정선옥=korean, Rajesh=non_korean';

-- 완료. 다음 단계(수동): /admins 화면에서 정선옥 선생님은 "한국인 담당",
-- Rajesh 선생님은 "비한국인 담당"으로 설정하세요 (두 분 모두 "상담실장" 체크 필요).
