-- ============================================================================
-- kepler-manager-pro :: 0009_daily_reports.sql
-- 스마트 일일 업무 보고 시스템 (WhatsApp 연동은 후속 단계)
-- 기존 profiles(id) = auth.users(id), role: master/admin/admin_b/teacher 에 연동
-- Supabase SQL Editor 에서 전체를 그대로 실행하세요.
-- ============================================================================

-- ── enum 타입 ────────────────────────────────────────────────────────────────
do $$ begin create type task_bucket   as enum ('done','added','hold','plan');
exception when duplicate_object then null; end $$;

do $$ begin create type task_tag      as enum ('urgent','planning','dev','ops','etc');
exception when duplicate_object then null; end $$;

do $$ begin create type report_status as enum ('pending','submitted');
exception when duplicate_object then null; end $$;

-- ── 일일 보고서 (직원 1명 × 하루 = 1행) ─────────────────────────────────────
create table if not exists daily_reports (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid not null references profiles(id) on delete cascade,
  report_date  date not null,
  status       report_status not null default 'pending',
  raw_text     text,
  submitted_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (staff_id, report_date)
);
create index if not exists idx_daily_reports_date on daily_reports (report_date);

-- ── 업무 항목 (핵심 라이프사이클 엔티티) ────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid not null references profiles(id) on delete cascade,
  report_id    uuid references daily_reports(id) on delete set null,
  task_date    date not null,
  bucket       task_bucket not null,
  title        text not null,
  tag          task_tag not null default 'etc',
  hold_reason  text,
  deadline     date,
  carried_from uuid references tasks(id),
  source       text not null default 'manual',   -- manual | meeting | whatsapp
  created_at   timestamptz not null default now()
);
create index if not exists idx_tasks_staff_date on tasks (staff_id, task_date);
create index if not exists idx_tasks_deadline    on tasks (deadline);

-- ── 회의/업무 할당 (kepler 내부 → 담당자 리스트로 편입) ─────────────────────
create table if not exists meeting_action_items (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  assignee_id    uuid not null references profiles(id) on delete cascade,
  created_by     uuid references profiles(id) on delete set null,
  deadline       date,
  target_bucket  task_bucket not null default 'plan',   -- added | plan
  linked_task_id uuid references tasks(id) on delete set null,
  pushed_at      timestamptz,
  status         text not null default 'assigned',       -- assigned | acknowledged | done
  created_at     timestamptz not null default now()
);
create index if not exists idx_action_items_assignee on meeting_action_items (assignee_id);

-- ============================================================================
-- RLS  (기존 4단계 권한 재사용: master/admin/admin_b = 스태프, teacher = 본인만)
-- ============================================================================
alter table daily_reports        enable row level security;
alter table tasks                enable row level security;
alter table meeting_action_items enable row level security;

-- 헬퍼: 현재 사용자가 스태프(관리자급)인지
create or replace function is_report_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('master','admin','admin_b')
  );
$$;

-- daily_reports ------------------------------------------------------------
drop policy if exists dr_select on daily_reports;
create policy dr_select on daily_reports for select
  using ( staff_id = auth.uid() or is_report_staff() );

drop policy if exists dr_write on daily_reports;
create policy dr_write on daily_reports for all
  using ( staff_id = auth.uid() or is_report_staff() )
  with check ( staff_id = auth.uid() or is_report_staff() );

-- tasks --------------------------------------------------------------------
drop policy if exists tk_select on tasks;
create policy tk_select on tasks for select
  using ( staff_id = auth.uid() or is_report_staff() );

drop policy if exists tk_write on tasks;
create policy tk_write on tasks for all
  using ( staff_id = auth.uid() or is_report_staff() )
  with check ( staff_id = auth.uid() or is_report_staff() );

-- meeting_action_items (관리자만 생성/조회, 담당자는 자기 것 조회) -----------
drop policy if exists ai_select on meeting_action_items;
create policy ai_select on meeting_action_items for select
  using ( assignee_id = auth.uid() or is_report_staff() );

drop policy if exists ai_write on meeting_action_items;
create policy ai_write on meeting_action_items for all
  using ( is_report_staff() )
  with check ( is_report_staff() );

-- 완료.
