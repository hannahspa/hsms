-- ============================================================================
-- SEED CTKM THÁNG 6/2026 — Hannah Spa   (ĐÃ CHẠY trên VPS 20/06/2026)
-- CHẠY SAU migration 118_khuyen_mai_loai.sql
-- Dùng ID dịch vụ chính xác (đã verify trên production), KHÔNG đoán ILIKE.
-- Thời gian: 01/06/2026 → 30/06/2026.
--
-- CHƯA seed ở đây:
--   • Triệt lông giảm 70% gói bảo hành 1 năm — đây là COMBO ở bảng combo_lieu_trinh
--     (gói theo thời gian, bán ở /admin/the-lieu-trinh/combo), KHÔNG phải dich_vu.
--     Module khuyen_mai chưa gắn được combo_id → chờ quyết định mở rộng.
-- ----------------------------------------------------------------------------
BEGIN;

INSERT INTO khuyen_mai
  (ten, mo_ta, loai_km, dich_vu_id, nhom_ap_dung, gia_goc, gia_km,
   mua_x, tang_y, pct_giam_lan, gioi_han_suat, ngay_bat_dau, ngay_ket_thuc, trang_thai)
VALUES
  -- 1-2. GỘI ĐẦU — Mua 10 tặng 4 / Mua 5 tặng 1 (cả nhóm 'Gội Đầu')
  ('Gội Dưỡng Sinh — Mua 10 Tặng 4', 'CTKM T6/2026 · cả nhóm Gội Đầu',
   'mua_x_tang_y', NULL, 'Gội Đầu', 100000, 71429, 10, 4, NULL, NULL, '2026-06-01','2026-06-30','active'),
  ('Gội Dưỡng Sinh — Mua 5 Tặng 1', 'CTKM T6/2026 · cả nhóm Gội Đầu',
   'mua_x_tang_y', NULL, 'Gội Đầu', 100000, 83333, 5, 1, NULL, NULL, '2026-06-01','2026-06-30','active'),

  -- 3-4. MASSAGE CỔ VAI GÁY GÓI 45P (ecd464a8) — Mua 10 tặng 4 / 5 tặng 1
  ('Massage Cổ Vai Gáy 45p — Mua 10 Tặng 4', 'CTKM T6/2026',
   'mua_x_tang_y', 'ecd464a8-43ae-4ba6-8864-97eb2823a9f1', NULL, 159000, 113571, 10, 4, NULL, NULL, '2026-06-01','2026-06-30','active'),
  ('Massage Cổ Vai Gáy 45p — Mua 5 Tặng 1', 'CTKM T6/2026',
   'mua_x_tang_y', 'ecd464a8-43ae-4ba6-8864-97eb2823a9f1', NULL, 159000, 132500, 5, 1, NULL, NULL, '2026-06-01','2026-06-30','active'),

  -- 5-6. MASSAGE CỔ VAI GÁY TRỊ LIỆU GÓI 60P (2e234b6b) — Mua 10 tặng 4 / 5 tặng 1
  ('Massage Cổ Vai Gáy 60p — Mua 10 Tặng 4', 'CTKM T6/2026',
   'mua_x_tang_y', '2e234b6b-90f5-4d64-a96d-6436c0f19012', NULL, 200000, 142857, 10, 4, NULL, NULL, '2026-06-01','2026-06-30','active'),
  ('Massage Cổ Vai Gáy 60p — Mua 5 Tặng 1', 'CTKM T6/2026',
   'mua_x_tang_y', '2e234b6b-90f5-4d64-a96d-6436c0f19012', NULL, 200000, 166667, 5, 1, NULL, NULL, '2026-06-01','2026-06-30','active'),

  -- 7-8. CHĂM SÓC DA MẶT — Mua 3 lần giảm 30% / Mua 5 lần giảm 50% (cả nhóm)
  ('Chăm Sóc Da — Mua 3 Lần Giảm 30%', 'CTKM T6/2026 · cả nhóm Chăm Sóc Da Mặt',
   'mua_n_giam_pct', NULL, 'Chăm Sóc Da Mặt', 500000, 350000, 3, NULL, 30, NULL, '2026-06-01','2026-06-30','active'),
  ('Chăm Sóc Da — Mua 5 Lần Giảm 50%', 'CTKM T6/2026 · cả nhóm Chăm Sóc Da Mặt',
   'mua_n_giam_pct', NULL, 'Chăm Sóc Da Mặt', 500000, 250000, 5, NULL, 50, NULL, '2026-06-01','2026-06-30','active'),

  -- 9. RF TRẺ HÓA VÙNG MẶT (bcf21689, gốc 1.5tr) — trải nghiệm 349k, tối đa 3 suất
  ('Chăm Sóc Da RF Nâng Cơ — Trải Nghiệm 349k', 'CTKM T6/2026 · giá gốc 1.500.000đ · mỗi khách tối đa 3 suất',
   'giam_gia', 'bcf21689-172b-4516-b1f1-81d4a9e57d93', NULL, 1500000, 349000, NULL, NULL, NULL, 3, '2026-06-01','2026-06-30','active'),

  -- 10. TRIỆT LÔNG NỬA ĐÔI CHÂN (2484f7d0, gốc 450k) — trải nghiệm 199k
  ('Triệt Nửa Chân — Trải Nghiệm 199k', 'CTKM T6/2026',
   'giam_gia', '2484f7d0-43c7-4b6c-a687-b1971be30418', NULL, 450000, 199000, NULL, NULL, NULL, NULL, '2026-06-01','2026-06-30','active'),

  -- 11. CỔ VAI GÁY 159k → 99k (Massage Cổ Vai Gáy Gói 45p, đang chạy tiếp)
  ('Cổ Vai Gáy — Ưu Đãi 99k', 'Đang tiếp tục chạy · 159.000đ → 99.000đ',
   'giam_gia', 'ecd464a8-43ae-4ba6-8864-97eb2823a9f1', NULL, 159000, 99000, NULL, NULL, NULL, NULL, '2026-06-01','2026-06-30','active'),

  -- 12. TRIỆT LÔNG DƯỚI CÁNH TAY (51062edc, gốc 300k) — trải nghiệm lẻ lần đầu 99k (tối đa 1 suất)
  ('Triệt Dưới Cánh Tay — Trải Nghiệm 99k', 'CTKM T6/2026 · triệt lẻ trải nghiệm lần đầu',
   'giam_gia', '51062edc-6b33-4e7c-86df-e473a8741e95', NULL, 300000, 99000, NULL, NULL, NULL, 1, '2026-06-01','2026-06-30','active');

SELECT ten, loai_km, COALESCE(nhom_ap_dung, '(dịch vụ riêng)') AS pham_vi,
       gia_goc, gia_km, mua_x, tang_y, pct_giam_lan, gioi_han_suat, phan_tram_giam
FROM khuyen_mai WHERE ngay_bat_dau='2026-06-01' AND ngay_ket_thuc='2026-06-30'
ORDER BY created_at;

COMMIT;
