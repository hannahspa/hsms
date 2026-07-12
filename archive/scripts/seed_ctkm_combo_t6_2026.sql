-- ============================================================================
-- SEED CTKM COMBO T6/2026 — Triệt lông giảm 70% gói bảo hành 1 NĂM
-- CHẠY SAU migration 119_khuyen_mai_combo.sql
-- Áp cho mọi combo_lieu_trinh có thời hạn = 1 năm (gói bảo hành 1 năm).
-- gia_km = giá bán × 30% (giảm 70%). Giữ giá gốc, hết KM tự về giá cũ.
-- ----------------------------------------------------------------------------
BEGIN;

INSERT INTO khuyen_mai
  (ten, mo_ta, loai_km, combo_id, gia_goc, gia_km, ngay_bat_dau, ngay_ket_thuc, trang_thai)
SELECT
  c.ten_combo || ' — Giảm 70%',
  'CTKM T6/2026 · giảm 70% gói bảo hành 1 năm',
  'giam_gia', c.id, c.gia_ban, round(c.gia_ban * 0.30),
  '2026-06-01', '2026-06-30', 'active'
FROM combo_lieu_trinh c
WHERE c.trang_thai = 'active'
  AND c.thoi_han_so = 1 AND c.thoi_han_don_vi = 'year'
  AND NOT EXISTS (  -- tránh trùng nếu chạy lại
    SELECT 1 FROM khuyen_mai k
    WHERE k.combo_id = c.id AND k.ngay_bat_dau = '2026-06-01' AND k.ngay_ket_thuc = '2026-06-30'
  );

SELECT k.ten, c.thoi_han_so || ' ' || c.thoi_han_don_vi AS han, k.gia_goc, k.gia_km, k.phan_tram_giam
FROM khuyen_mai k JOIN combo_lieu_trinh c ON c.id = k.combo_id
WHERE k.mo_ta LIKE 'CTKM T6/2026 · giảm 70%%'
ORDER BY k.gia_goc;

COMMIT;
