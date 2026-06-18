-- 113 — Hạ tầng Training AI Marketing: cấu hình động (playbook) + kho mẫu vàng RAG
-- Chạy 18/06/2026 trực tiếp trên VPS qua psql.

-- 1) Cấu hình AI sửa được qua web (playbook, KM ghi chú, hotline...) — không cần deploy
create table if not exists marketing_ai_config (
  key        text primary key,
  value      text,
  mo_ta      text,
  updated_at timestamptz default now()
);

-- 2) Kho "mẫu vàng": cặp (khách hỏi → lễ tân trả lời) để AI học cách bán thật của Hannah
create table if not exists marketing_ai_examples (
  id                  uuid primary key default gen_random_uuid(),
  chu_de              text,                 -- triet_long | da_mat | massage | goi | tam_trang | phun_xam | gia | dat_lich | khac
  khach_hoi           text not null,
  le_tan_tra_loi      text not null,
  nguon_conversation_id text,
  diem                int default 0,        -- điểm chất lượng heuristic (cao = mẫu tốt)
  da_duyet            boolean default false,-- admin duyệt ở trang Huấn Luyện
  pair_hash           text,                 -- khoá chống trùng (đầu câu hỏi+trả lời)
  created_at          timestamptz default now()
);
create index if not exists idx_mae_chude on marketing_ai_examples(chu_de);
create index if not exists idx_mae_duyet on marketing_ai_examples(da_duyet, diem desc);
create unique index if not exists uq_mae_pair on marketing_ai_examples(pair_hash);

alter table marketing_ai_config   enable row level security;
alter table marketing_ai_examples enable row level security;

do $$ begin
  create policy mac_auth_all on marketing_ai_config   for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy mae_auth_all on marketing_ai_examples for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

grant all on marketing_ai_config, marketing_ai_examples to authenticated, service_role;

notify pgrst, 'reload schema';
