-- 0010_invoice_discount_fees.sql
-- 고지서에 할인율/등록비/교재비 3개 항목 추가. 기존 데이터 영향 없음, 전부 default 0.

alter table invoices
  add column if not exists discount_rate numeric not null default 0;

alter table invoices
  add column if not exists registration_fee numeric not null default 0;

alter table invoices
  add column if not exists textbook_fee numeric not null default 0;

comment on column invoices.discount_rate is '할인율 percent 0-100, 수업료 소계에만 적용';
comment on column invoices.registration_fee is '등록비 정액';
comment on column invoices.textbook_fee is '교재비 정액';
