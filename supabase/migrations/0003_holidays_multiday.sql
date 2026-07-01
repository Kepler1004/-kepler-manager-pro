-- ============================================================================
-- 0003_holidays_multiday.sql
-- 수업 복수 요일(days) + 공휴일(holidays) + 고지서 항목 day_label
-- Supabase SQL Editor 에 붙여넣고 Run.
-- ============================================================================

-- 1) 수업: 복수 요일 배열 추가 (기존 day_of_week 는 첫 요일로 유지/호환)
alter table classes add column if not exists days smallint[] not null default '{}';
-- 기존 행 백필: day_of_week 하나를 배열로
update classes set days = array[day_of_week] where coalesce(array_length(days,1),0) = 0;

-- 2) 고지서 항목: 요일 라벨(예: "월·수·금")
alter table invoice_items add column if not exists day_label text not null default '';
alter table invoice_items add column if not exists holiday_sessions smallint not null default 0;

-- 3) 공휴일 테이블
create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  source text not null default 'manual',  -- 'johor' | 'manual'
  created_at timestamptz not null default now()
);

alter table holidays enable row level security;
drop policy if exists holidays_staff_all on holidays;
create policy holidays_staff_all on holidays for all using (is_staff()) with check (is_staff());

create index if not exists idx_holidays_date on holidays(holiday_date);

-- 4) 조호르(Johor) 2026 공휴일 시드 — 고정일자 + 확인된 날짜만.
--    ⚠ 이슬람 명절(하리라야 등) 등 음력 공휴일은 해마다 확정일이 달라
--    화면(공휴일 메뉴)에서 직접 추가/수정하세요. 아래도 운영 전 검증 권장.
insert into holidays (holiday_date, name, source) values
  ('2026-01-01', 'New Year''s Day', 'johor'),
  ('2026-02-01', 'Thaipusam', 'johor'),
  ('2026-02-17', 'Chinese New Year', 'johor'),
  ('2026-02-18', 'Chinese New Year (2nd Day)', 'johor'),
  ('2026-03-23', 'Sultan of Johor''s Birthday', 'johor'),
  ('2026-05-01', 'Labour Day', 'johor'),
  ('2026-06-01', 'Agong''s Birthday', 'johor'),
  ('2026-07-21', 'Hari Hol Almarhum Sultan Iskandar', 'johor'),
  ('2026-08-25', 'Maulidur Rasul', 'johor'),
  ('2026-08-31', 'National Day (Merdeka)', 'johor'),
  ('2026-09-16', 'Malaysia Day', 'johor'),
  ('2026-11-09', 'Deepavali', 'johor'),
  ('2026-12-25', 'Christmas Day', 'johor')
on conflict (holiday_date) do nothing;
