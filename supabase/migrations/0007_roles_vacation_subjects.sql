-- ============================================================================
-- 0007_roles_vacation_subjects.sql
-- 관리자B 역할 + 휴가관리 + 연차 + 과목 정리
-- ⚠ Supabase SQL Editor 에서 아래를 "한 줄씩" 이 아니라 전체 실행하면 됩니다.
--   (enum 추가는 자동 커밋되므로 그대로 Run 하세요.)
-- ============================================================================

-- 1) 관리자B 역할 추가 (admin_b)
alter type user_role add value if not exists 'admin_b';

-- 2) 연차(총 휴가일수) — 사람마다 다름
alter table profiles add column if not exists annual_leave_total numeric(5,1) not null default 0;

-- 3) 휴가 기록
create table if not exists vacations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days numeric(5,1) not null default 1,
  reason text,
  created_at timestamptz not null default now()
);
alter table vacations enable row level security;
drop policy if exists vacations_staff_all on vacations;
create policy vacations_staff_all on vacations for all using (is_staff()) with check (is_staff());
-- 본인 휴가는 본인도 조회
drop policy if exists vacations_self_read on vacations;
create policy vacations_self_read on vacations for select using (profile_id = auth.uid());
create index if not exists idx_vacations_profile on vacations(profile_id, start_date);

-- 4) 과목 정리: Math, English, Science, Korean, Chinese, Others 만 유지
insert into subjects (name)
select v.name from (values ('Math'),('English'),('Science'),('Korean'),('Chinese'),('Others')) as v(name)
where not exists (select 1 from subjects s where s.name = v.name);
-- 위 6개가 아니고, 어떤 수업에서도 안 쓰는 과목은 삭제
delete from subjects s
where s.name not in ('Math','English','Science','Korean','Chinese','Others')
  and not exists (select 1 from classes c where c.subject_id = s.id);

-- 5) is_staff 에 admin_b 포함 (관리자B도 대부분 기능 사용)
create or replace function is_staff() returns boolean
  language sql stable as $$
  select coalesce(kepler_current_role() in ('master','admin','admin_b'), false) $$;

-- 6) 선생님(로그인 사용자) 읽기 허용 — 주간시간표/사전결석/공휴일 화면용
drop policy if exists classes_auth_read on classes;
create policy classes_auth_read on classes for select using (auth.uid() is not null);
drop policy if exists subjects_auth_read on subjects;
create policy subjects_auth_read on subjects for select using (auth.uid() is not null);
drop policy if exists holidays_auth_read on holidays;
create policy holidays_auth_read on holidays for select using (auth.uid() is not null);
drop policy if exists enrollments_auth_read on enrollments;
create policy enrollments_auth_read on enrollments for select using (auth.uid() is not null);
drop policy if exists students_auth_read on students;
create policy students_auth_read on students for select using (auth.uid() is not null);
drop policy if exists profiles_auth_read on profiles;
create policy profiles_auth_read on profiles for select using (auth.uid() is not null);
drop policy if exists absences_auth_read on planned_absences;
create policy absences_auth_read on planned_absences for select using (auth.uid() is not null);
-- 선생님도 사전결석 입력 가능
drop policy if exists absences_auth_insert on planned_absences;
create policy absences_auth_insert on planned_absences for insert with check (auth.uid() is not null);
