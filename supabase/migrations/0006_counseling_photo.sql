-- ============================================================================
-- 0006_counseling_photo.sql — 상담기록 + 학생사진
-- Supabase SQL Editor 에 붙여넣고 Run.
-- ============================================================================

-- 1) 학생 사진 URL
alter table students add column if not exists photo_url text;

-- 2) 상담 기록
create table if not exists counseling_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  note_date date not null default current_date,
  content text not null,
  author_id uuid references profiles(id),
  author_name text,
  created_at timestamptz not null default now()
);
alter table counseling_notes enable row level security;
drop policy if exists counseling_staff_all on counseling_notes;
create policy counseling_staff_all on counseling_notes for all using (is_staff()) with check (is_staff());
create index if not exists idx_counseling_student on counseling_notes(student_id, note_date desc);

-- 3) 학생 사진 저장소 (public 버킷) + 스태프 업로드 정책
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

drop policy if exists "student photos public read" on storage.objects;
create policy "student photos public read" on storage.objects
  for select using (bucket_id = 'student-photos');

drop policy if exists "student photos staff write" on storage.objects;
create policy "student photos staff write" on storage.objects
  for insert with check (bucket_id = 'student-photos' and is_staff());

drop policy if exists "student photos staff update" on storage.objects;
create policy "student photos staff update" on storage.objects
  for update using (bucket_id = 'student-photos' and is_staff());
