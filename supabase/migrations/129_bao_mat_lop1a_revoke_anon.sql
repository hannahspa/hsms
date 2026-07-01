-- ============================================================================
-- 129_bao_mat_lop1a_revoke_anon.sql
-- GĐ0-A · LỚP 1a — ĐÓNG CỬA VỚI INTERNET (rủi ro thấp)
-- ----------------------------------------------------------------------------
-- BỐI CẢNH: audit 30/06/2026 phát hiện role `anon` (anon key LỘ công khai trong
-- bundle frontend) đang có TOÀN QUYỀN (SELECT/INSERT/UPDATE/DELETE) trên ~120
-- object public — gồm doanh_thu, chi_phi, thanh_toan, don_hang, cong_no, vi,
-- profiles, khach_hang, the_lieu_trinh... → bất kỳ ai trên internet đọc/xóa/sửa
-- được toàn bộ dữ liệu tiền + đổi vai_tro thành admin.
--
-- MỤC TIÊU LỚP 1a: THU HỒI mọi quyền của `anon` trên MỌI object, TRỪ whitelist
-- các object mà luồng CÔNG KHAI (landing/menu/vòng quay) và app KTV (/checkin)
-- thực sự cần. KHÔNG đụng role `authenticated` → app nội bộ (Lễ Tân/Admin đã
-- đăng nhập) chạy y nguyên.
--
-- AN TOÀN: `REVOKE ... FROM anon` không ảnh hưởng `authenticated`.
-- Whitelist xác định từ việc quét toàn bộ `.from()/.rpc()` trong:
--   src/apps/customer (menu)  → dich_vu, khuyen_mai
--   src/apps/wheel (vòng quay)→ chỉ 3 RPC (không đụng bảng)
--   src/hooks/useCMS.js (landing) → homepage_config
--   src/apps/checkin (KTV)    → nhan_vien, cham_cong, dang_ky_off,
--                               yeu_cau_chinh_sua, lich_hen, bang_luong,
--                               quy_ngay_off, don_hang_chi_tiet, v_nhan_vien_thu_nhap
--
-- ⚠️ Nhóm CHECKIN vẫn còn lộ (pin_hash, lương) — sẽ gỡ ở LỚP 1b bằng cách
-- RPC-hoá toàn bộ app KTV rồi REVOKE nốt. Lớp 1a chỉ đóng phần AN TOÀN NGAY.
--
-- TRƯỚC KHI CHẠY (anh Nam / Claude):
--   1) BACKUP: pg_dump toàn DB (xem lệnh cuối file).
--   2) Chạy phần VERIFY TRƯỚC để chụp trạng thái.
--   3) Chạy trong TRANSACTION — nếu app công khai lỗi thì ROLLBACK.
-- ============================================================================

-- ─── VERIFY TRƯỚC (đọc, không đổi gì) ───────────────────────────────────────
-- SELECT count(*) AS object_mo_anon
-- FROM information_schema.role_table_grants
-- WHERE table_schema='public' AND grantee='anon' AND privilege_type='SELECT';

BEGIN;

DO $$
DECLARE
  r record;
  -- Danh sách GIỮ quyền anon (công khai + checkin tạm thời cho tới Lớp 1b)
  keep text[] := ARRAY[
    -- Catalog công khai (SELECT-only, không nhạy cảm)
    'dich_vu', 'khuyen_mai', 'homepage_config', 'danh_gia',
    -- App KTV /checkin (đọc+ghi) — GỠ Ở LỚP 1b
    'nhan_vien', 'cham_cong', 'dang_ky_off', 'yeu_cau_chinh_sua',
    'lich_hen', 'bang_luong', 'quy_ngay_off', 'don_hang_chi_tiet',
    'v_nhan_vien_thu_nhap'
  ];
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'v', 'm')          -- bảng, view, materialized view
      AND NOT (c.relname = ANY(keep))
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.relname);
    RAISE NOTICE 'REVOKED anon on %', r.relname;
  END LOOP;
END $$;

-- Catalog công khai: chỉ cần ĐỌC → siết về SELECT-only (bỏ INSERT/UPDATE/DELETE)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dich_vu        FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.khuyen_mai     FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.homepage_config FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.danh_gia        FROM anon;

-- ─── VERIFY SAU (đọc) — chạy trước khi COMMIT ──────────────────────────────
-- Kỳ vọng: chỉ còn 13 object trong whitelist còn quyền anon.
-- SELECT table_name, string_agg(privilege_type,',' ORDER BY privilege_type) privs
-- FROM information_schema.role_table_grants
-- WHERE table_schema='public' AND grantee='anon'
-- GROUP BY table_name ORDER BY table_name;

-- Nếu OK → COMMIT; nếu app công khai lỗi → ROLLBACK;
COMMIT;

-- ============================================================================
-- BACKUP (chạy TRƯỚC, trên VPS — KHÔNG nằm trong transaction này):
--   docker exec supabase-db pg_dump -U postgres -d postgres -Fc \
--     -f /tmp/hsms_before_129_$(date +%Y%m%d_%H%M).dump
--   docker cp supabase-db:/tmp/hsms_before_129_*.dump ./
--
-- ROLLBACK KHẨN (nếu cần mở lại toàn bộ như cũ — CHỈ dùng khi app sập):
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
-- ============================================================================
