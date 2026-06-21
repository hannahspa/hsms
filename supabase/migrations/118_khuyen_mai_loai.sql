-- 118_khuyen_mai_loai.sql
-- Mở rộng bảng khuyen_mai: hỗ trợ thêm 2 dạng KM theo số lần
--   1. giam_gia        : giảm giá đơn (đã có sẵn — mặc định)
--   2. mua_x_tang_y    : Mua X tặng Y (VD: mua 10 tặng 4, mua 5 tặng 1)
--   3. mua_n_giam_pct  : Mua N lần giảm % (VD: mua 3 lần giảm 30%, mua 5 lần giảm 50%)
-- gia_goc / gia_km vẫn giữ NOT NULL: form tự tính gia_km hiệu dụng để
-- cột generated phan_tram_giam ra đúng % hiển thị badge.
-- Chỉ THÊM cột — không đụng cột/dữ liệu cũ. Mọi KM cũ tự nhận loai_km='giam_gia'.

ALTER TABLE public.khuyen_mai
  ADD COLUMN IF NOT EXISTS loai_km       text NOT NULL DEFAULT 'giam_gia'
    CHECK (loai_km IN ('giam_gia', 'mua_x_tang_y', 'mua_n_giam_pct')),
  ADD COLUMN IF NOT EXISTS mua_x         integer,   -- số buổi/lần KHÁCH MUA (mua_x_tang_y & mua_n_giam_pct)
  ADD COLUMN IF NOT EXISTS tang_y        integer,   -- số buổi TẶNG  (mua_x_tang_y)
  ADD COLUMN IF NOT EXISTS pct_giam_lan  numeric,   -- % giảm mỗi lần (mua_n_giam_pct)
  ADD COLUMN IF NOT EXISTS gioi_han_suat integer,   -- tối đa N suất/khách (tùy chọn, VD: RF tối đa 3 suất)
  ADD COLUMN IF NOT EXISTS nhom_ap_dung  text;      -- áp cho CẢ NHÓM dịch vụ (nhom_hien_thi). NULL = chỉ dich_vu_id

COMMENT ON COLUMN public.khuyen_mai.loai_km       IS 'giam_gia | mua_x_tang_y | mua_n_giam_pct';
COMMENT ON COLUMN public.khuyen_mai.mua_x         IS 'mua_x_tang_y: số buổi mua; mua_n_giam_pct: số lần N';
COMMENT ON COLUMN public.khuyen_mai.tang_y        IS 'mua_x_tang_y: số buổi tặng';
COMMENT ON COLUMN public.khuyen_mai.pct_giam_lan  IS 'mua_n_giam_pct: % giảm mỗi lần';
COMMENT ON COLUMN public.khuyen_mai.gioi_han_suat IS 'Giới hạn số suất/khách (NULL = không giới hạn)';
COMMENT ON COLUMN public.khuyen_mai.nhom_ap_dung  IS 'Tên nhom_hien_thi áp dụng cho cả nhóm (NULL = chỉ theo dich_vu_id)';
