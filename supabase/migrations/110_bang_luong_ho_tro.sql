-- 110: Thêm cột ho_tro vào bang_luong
-- Dùng cho khoản "Hỗ trợ làm tròn" lương Kinh Doanh (hiện chỉ áp dụng Khánh Duy:
-- nếu Lương Cứng + Lương KD < 9.000.000đ thì bù phần thiếu lên đúng 9.000.000đ).
-- Tách cột riêng để minh bạch (không lẫn vào tien_tour/hoa_hong).

ALTER TABLE public.bang_luong
  ADD COLUMN IF NOT EXISTS ho_tro integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bang_luong.ho_tro IS 'Khoản hỗ trợ làm tròn lương KD (vd bù Khánh Duy lên 9tr). Cộng vào tổng lĩnh kỳ 2.';
