-- 114 — Nhật ký chăm sóc sau dịch vụ (giai đoạn 1: lễ tân gửi tay, hệ thống không quên ai đã chăm)
create table if not exists marketing_aftercare_log (
  id            uuid primary key default gen_random_uuid(),
  don_hang_id   uuid unique,                 -- mỗi đơn chăm 1 lần
  khach_hang_id uuid,
  ngay_den      date,
  da_cham       boolean default true,
  kenh          text,                        -- zalo | facebook | dien_thoai | khac
  noi_dung      text,
  nguoi_cham    text,
  created_at    timestamptz default now()
);
create index if not exists idx_aftercare_ngay on marketing_aftercare_log(ngay_den);

alter table marketing_aftercare_log enable row level security;
do $$ begin
  create policy mal_auth_all on marketing_aftercare_log for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
grant all on marketing_aftercare_log to authenticated, service_role;
notify pgrst, 'reload schema';
