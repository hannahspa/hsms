-- 055_fix_duplicate_finalize_order.sql
-- Lỗi: "Could not choose the best candidate function between pos_finalize_order(...)"
-- Nguyên nhân: DB tồn tại 2 hàm pos_finalize_order cùng tên:
--   - Bản 6 tham số (migration 046, KHÔNG p_vat)
--   - Bản 7 tham số (migration 049, CÓ p_vat) — bản mới nhất
-- Frontend gọi 5 params (default cho phần còn lại) → khớp cả 2 → PostgREST không chọn được.
-- Fix: XÓA bản cũ 6 tham số, GIỮ bản mới nhất 049 (có p_vat).

DROP FUNCTION IF EXISTS pos_finalize_order(uuid, text, integer, integer, text, boolean);

-- Verify (sau khi chạy, kết quả phải còn ĐÚNG 1 dòng):
-- SELECT oid::regprocedure FROM pg_proc WHERE proname = 'pos_finalize_order';
