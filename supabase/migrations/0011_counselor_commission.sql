-- ============================================================================
-- 0011_counselor_commission.sql — 상담실장(Counseling Manager) 성과급
-- Supabase SQL Editor 에 전체를 붙여넣고 Run. 여러 번 실행해도 안전(idempotent).
-- 기존 데이터 영향 없음: 새 컬럼은 전부 nullable 또는 default.
-- ============================================================================

-- ── 1) 직원(profiles): 상담실장 여부 / 입사일 / 수습 개월 / 성과급 단가 ─────────
alter table profiles add column if not exists is_counselor      boolean not null default false;
alter table profiles add column if not exists hire_date         date;
alter table profiles add column if not exists probation_months  smallint not null default 3;
alter table profiles add column if not exists commission_config jsonb not null default '{}'::jsonb;

comment on column profiles.is_counselor      is '상담실장 여부 — true 면 급여 명세서에 성과급 자동 합산';
comment on column profiles.hire_date         is '입사일 — 입사일 + probation_months 개월부터 성과급 적용';
comment on column profiles.commission_config is '성과급 단가(비어 있으면 기본값: 신규 50/25, 목표 10명 300/150, 6개월 유지 100/50)';

-- ── 2) 학생(students): 담당 상담실장 / 국제반·로컬반 / 등록일 / 퇴원일 ─────────
alter table students add column if not exists counselor_id   uuid references profiles(id) on delete set null;
alter table students add column if not exists program_type   text;
alter table students add column if not exists enrolled_date  date;
alter table students add column if not exists withdrawn_date date;

do $$ begin
  alter table students add constraint students_program_type_chk
    check (program_type is null or program_type in ('international','local'));
exception when duplicate_object then null; end $$;

create index if not exists idx_students_counselor on students (counselor_id);

comment on column students.counselor_id   is '이 학생을 상담·등록시킨 상담실장 (성과급 귀속)';
comment on column students.program_type   is 'international(국제반) / local(로컬반) — 성과급 단가 구분';
comment on column students.enrolled_date  is '정식 등록일 — 신규 등록 성과급 월 / 6개월 유지 기준일';
comment on column students.withdrawn_date is '퇴원일 — status 가 inactive 로 바뀌면 자동 기록';

-- 기존 학생: 등록일이 비어 있으면 생성일(말레이시아 날짜)로 채움.
-- (counselor_id 가 비어 있으므로 기존 학생에게 성과급이 소급 지급되지는 않음)
update students
   set enrolled_date = (created_at at time zone 'Asia/Kuala_Lumpur')::date
 where enrolled_date is null and created_at is not null;

-- 이미 퇴원 상태인 학생: 퇴원일을 알 수 없으므로 등록일로 채워 장기유지 대상에서 제외
update students
   set withdrawn_date = enrolled_date
 where status = 'inactive' and withdrawn_date is null;

-- 퇴원일 자동 기록 트리거: active → inactive 시 오늘 날짜, inactive → active 시 해제
create or replace function students_track_withdrawn() returns trigger
language plpgsql as $$
begin
  if new.status = 'inactive' and coalesce(old.status, '') <> 'inactive' and new.withdrawn_date is null then
    new.withdrawn_date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  elsif new.status = 'active' and old.status = 'inactive' then
    new.withdrawn_date := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_students_track_withdrawn on students;
create trigger trg_students_track_withdrawn
  before update of status on students
  for each row execute function students_track_withdrawn();

-- ── 3) 급여 명세서(payslips): 성과급 금액 + 지급 근거 스냅샷 ───────────────────
alter table payslips add column if not exists commission        numeric not null default 0;
alter table payslips add column if not exists commission_detail jsonb;

comment on column payslips.commission        is '상담실장 성과급 합계 (실수령액에 포함)';
comment on column payslips.commission_detail is '성과급 근거: 신규등록/목표/장기유지 학생 목록 스냅샷';

-- 완료.
