-- 127 — Bảng đánh giá dịch vụ (khách gửi từ Zalo Mini App sau khi dùng dịch vụ).
CREATE TABLE IF NOT EXISTS public.danh_gia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  khach_hang_id uuid REFERENCES public.khach_hang(id) ON DELETE SET NULL,
  so_dien_thoai text,
  don_hang_id   uuid,
  so_sao        integer NOT NULL CHECK (so_sao BETWEEN 1 AND 5),
  noi_dung      text,
  nguon         text DEFAULT 'miniapp',
  da_phan_hoi   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_danh_gia_kh ON public.danh_gia(khach_hang_id);
CREATE INDEX IF NOT EXISTS idx_danh_gia_sao ON public.danh_gia(so_sao);

ALTER TABLE public.danh_gia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS danh_gia_all ON public.danh_gia;
CREATE POLICY danh_gia_all ON public.danh_gia FOR ALL TO authenticated USING (true) WITH CHECK (true);
