-- Allow staff income ledger rows that come from period-level imports.
-- POS-generated rows still keep don_hang_id; MySpa summary/payroll rows may not.

alter table public.nhan_vien_thu_nhap
  alter column don_hang_id drop not null;
