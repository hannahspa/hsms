-- ============================================================
-- MIGRATION 069: Migrate view income chính sang tien_hoa_hong (P3 - giai đoạn 2)
-- Ngày: 03/06/2026
-- Recreate v_nhan_vien_thu_nhap + v_myspa_legacy_overview để đọc tien_hoa_hong.
-- GIỮ cột tien_commission làm shadow đồng bộ (trigger) — KHÔNG drop vì còn view
-- báo cáo legacy phụ thuộc. Concept "commission" đã sạch ở code/UI/spec/RPC.
-- View def trích nguyên văn từ 057 (v_nhan_vien_thu_nhap) + 049 (v_myspa_legacy_overview).
-- ============================================================

-- 1) Recreate v_nhan_vien_thu_nhap (đọc tien_hoa_hong)
DROP VIEW IF EXISTS v_nhan_vien_thu_nhap;

CREATE VIEW v_nhan_vien_thu_nhap AS
SELECT
  (
    substr(src.md5_key, 1, 8) || '-' ||
    substr(src.md5_key, 9, 4) || '-' ||
    substr(src.md5_key, 13, 4) || '-' ||
    substr(src.md5_key, 17, 4) || '-' ||
    substr(src.md5_key, 21, 12)
  )::uuid                                                AS id,
  src.don_hang_id,
  src.don_hang_chi_tiet_id,
  src.nhan_vien_id,
  src.loai,
  src.nguon,
  src.ngay,
  src.doanh_so_tinh,
  src.ti_le,
  src.so_tien,
  src.trang_thai,
  src.is_test,
  src.ghi_chu,
  src.created_at,
  src.updated_at
FROM (
  -- Tien Tour: dich vu thuong
  SELECT
    md5(dhct.id::text || ':tour-dich-vu')                AS md5_key,
    dhct.don_hang_id                                     AS don_hang_id,
    dhct.id                                              AS don_hang_chi_tiet_id,
    dhct.nhan_vien_id                                    AS nhan_vien_id,
    'tour'::text                                         AS loai,
    CASE WHEN dh.created_at::date >= '2026-05-28'
      THEN 'pos'
      ELSE 'myspa_commission'
    END                                                  AS nguon,
    dh.ngay                                              AS ngay,
    COALESCE(dhct.thanh_tien, 0)                         AS doanh_so_tinh,
    dhct.ti_le_hoa_hong                                  AS ti_le,
    dhct.tien_tour                                       AS so_tien,
    'da_chot'::text                                      AS trang_thai,
    COALESCE(dh.is_test, false)                          AS is_test,
    dhct.ghi_chu                                         AS ghi_chu,
    dhct.created_at                                      AS created_at,
    dhct.created_at                                      AS updated_at
  FROM don_hang_chi_tiet dhct
  JOIN don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dhct.loai_item = 'dich_vu'
    AND dhct.tien_tour IS NOT NULL
    AND dhct.tien_tour > 0
    AND dh.trang_thai <> 'huy'

  UNION ALL

  -- Tien Tour: KTV thuc hien buoi tu the lieu trinh cu
  SELECT
    md5(dhct.id::text || ':tour-the-lieu-trinh')         AS md5_key,
    dhct.don_hang_id                                     AS don_hang_id,
    dhct.id                                              AS don_hang_chi_tiet_id,
    dhct.nhan_vien_id                                    AS nhan_vien_id,
    'tour'::text                                         AS loai,
    CASE WHEN dh.created_at::date >= '2026-05-28'
      THEN 'pos'
      ELSE 'myspa_commission'
    END                                                  AS nguon,
    dh.ngay                                              AS ngay,
    COALESCE(dhct.thanh_tien, 0)                         AS doanh_so_tinh,
    dhct.ti_le_hoa_hong                                  AS ti_le,
    dhct.tien_tour                                       AS so_tien,
    'da_chot'::text                                      AS trang_thai,
    COALESCE(dh.is_test, false)                          AS is_test,
    COALESCE(dhct.ghi_chu, 'Dung the lieu trinh')         AS ghi_chu,
    dhct.created_at                                      AS created_at,
    dhct.created_at                                      AS updated_at
  FROM don_hang_chi_tiet dhct
  JOIN don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dhct.loai_item = 'the_lieu_trinh'
    AND dhct.tien_tour IS NOT NULL
    AND dhct.tien_tour > 0
    AND dh.trang_thai <> 'huy'

  UNION ALL

  -- Hoa hong: ban the moi va ban san pham
  SELECT
    md5(dhct.id::text || ':hoa-hong-ban')                AS md5_key,
    dhct.don_hang_id                                     AS don_hang_id,
    dhct.id                                              AS don_hang_chi_tiet_id,
    dhct.nhan_vien_id                                    AS nhan_vien_id,
    'hoa_hong'::text                                     AS loai,
    CASE WHEN dh.created_at::date >= '2026-05-28'
      THEN 'pos'
      ELSE 'myspa_commission'
    END                                                  AS nguon,
    dh.ngay                                              AS ngay,
    COALESCE(dhct.thanh_tien, 0)                         AS doanh_so_tinh,
    dhct.ti_le_hoa_hong                                  AS ti_le,
    dhct.tien_hoa_hong                                 AS so_tien,
    'da_chot'::text                                      AS trang_thai,
    COALESCE(dh.is_test, false)                          AS is_test,
    COALESCE(
      dhct.ghi_chu,
      CASE dhct.loai_item
        WHEN 'the_moi' THEN 'Ban the lieu trinh'
        WHEN 'san_pham' THEN 'Ban san pham'
      END
    )                                                    AS ghi_chu,
    dhct.created_at                                      AS created_at,
    dhct.created_at                                      AS updated_at
  FROM don_hang_chi_tiet dhct
  JOIN don_hang dh ON dh.id = dhct.don_hang_id
  WHERE dhct.loai_item IN ('the_moi', 'san_pham')
    AND dhct.tien_hoa_hong IS NOT NULL
    AND dhct.tien_hoa_hong > 0
    AND dh.trang_thai <> 'huy'
) src;

GRANT SELECT ON v_nhan_vien_thu_nhap TO authenticated;
GRANT SELECT ON v_nhan_vien_thu_nhap TO anon;

COMMENT ON VIEW v_nhan_vien_thu_nhap IS
  'VIEW realtime thu nhap nhan vien: tour=dich_vu+the_lieu_trinh, hoa_hong=the_moi+san_pham. the_lieu_trinh khong phai phuong thuc thanh toan.';

-- 2) Recreate v_myspa_legacy_overview (đọc tien_hoa_hong)
DROP VIEW IF EXISTS v_myspa_legacy_overview;

-- (Đã bỏ câu DROP COLUMN tien_hoa_hong trích thừa từ 049 — KHÔNG drop cột mới)
CREATE OR REPLACE VIEW v_myspa_legacy_overview AS
WITH old_orders AS (
  SELECT dh.id, dh.ma_don, dh.khach_hang_id, dh.nguoi_tao,
         dh.tong_tien_hang, dh.giam_gia, dh.thuc_thu, dh.con_no,
         dh.trang_thai, dh.ghi_chu, dh.tien_tour, dh.ngay,
         dh.created_at, dh.updated_at, dh.is_test, dh.vat
  FROM don_hang dh
  WHERE dh.ngay <= '2026-04-30'
),
old_lines AS (
  SELECT dhct.id, dhct.don_hang_id, dhct.loai_item,
         dhct.dich_vu_id, dhct.san_pham_id, dhct.the_lieu_trinh_id,
         dhct.nhan_vien_id, dhct.so_luong, dhct.don_gia, dhct.thanh_tien,
         dhct.ti_le_hoa_hong, dhct.ghi_chu, dhct.created_at, dhct.meta,
         dhct.tien_tour, dhct.tien_hoa_hong
  FROM don_hang_chi_tiet dhct
  JOIN old_orders dh ON dh.id = dhct.don_hang_id
),
synced AS (
  SELECT ma_don, line_no, ngay, ten_dich_vu, staff_name, staff_display,
         staff_status, matched_nhan_vien_id, commission_amount, raw_commission,
         cutoff_date, synced_at
  FROM myspa_legacy_staff_sync
)
SELECT 'old_orders'::text AS metric,
       COUNT(*)::numeric AS value, NULL::numeric AS amount FROM old_orders
UNION ALL
SELECT 'old_lines'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(thanh_tien), 0)::numeric AS amount FROM old_lines
UNION ALL
SELECT 'synced_staff_lines'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(commission_amount), 0)::numeric AS amount FROM synced
UNION ALL
SELECT 'matched_active_staff'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(commission_amount), 0)::numeric AS amount FROM synced WHERE staff_status = 'dang_lam'
UNION ALL
SELECT 'legacy_resigned_staff'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(commission_amount), 0)::numeric AS amount FROM synced WHERE staff_status = 'nghi_viec'
UNION ALL
SELECT 'missing_staff_name'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(commission_amount), 0)::numeric AS amount FROM synced WHERE staff_status = 'chua_co_ten'
UNION ALL
SELECT 'old_orders_without_payment_rows'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(dh.thuc_thu), 0)::numeric AS amount
FROM old_orders dh
LEFT JOIN (SELECT DISTINCT don_hang_id FROM thanh_toan) tt ON tt.don_hang_id = dh.id
WHERE tt.don_hang_id IS NULL
UNION ALL
SELECT 'old_orders_without_pos_revenue'::text AS metric,
       COUNT(*)::numeric AS value,
       COALESCE(SUM(dh.thuc_thu), 0)::numeric AS amount
FROM old_orders dh
LEFT JOIN (SELECT DISTINCT don_hang_id FROM doanh_thu WHERE nguon = 'pos') dt ON dt.don_hang_id = dh.id
WHERE dt.don_hang_id IS NULL AND COALESCE(dh.thuc_thu, 0) > 0;


-- 3) GIỮ tien_commission làm cột shadow đồng bộ (trigger trg_sync_hoa_hong_commission).
--    KHÔNG drop vì còn nhiều view báo cáo legacy đọc nó (lich_su_dich_vu_kh,
--    v_cong_no_tong_hop, v_myspa_legacy_staff_audit, v_combo_lieu_trinh_backfill_summary).
--    Concept "commission" đã sạch ở code/UI/spec/RPC + cột income chính = tien_hoa_hong.
--    Drop hoàn toàn = việc bảo trì riêng: recreate 4 view đó sang tien_hoa_hong rồi mới drop.

-- VERIFY: SELECT loai, COUNT(*) FROM v_nhan_vien_thu_nhap GROUP BY loai;  -- tour/hoa_hong
