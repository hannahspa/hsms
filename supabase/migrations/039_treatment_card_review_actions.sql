-- 039_treatment_card_review_actions.sql
-- Operational review actions for legacy treatment cards before parallel run.

CREATE TABLE IF NOT EXISTS the_lieu_trinh_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  the_lieu_trinh_id uuid NOT NULL REFERENCES the_lieu_trinh(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('close_expired', 'extend_expiry', 'adjust_sessions', 'keep_active')),
  reason text NOT NULL,
  before_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tlt_review_log_card ON the_lieu_trinh_review_log(the_lieu_trinh_id, created_at DESC);

CREATE OR REPLACE FUNCTION hsms_refresh_parallel_readiness_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE v_hsms_parallel_readiness_summary;
  TRUNCATE v_hsms_parallel_readiness_status;

  WITH card_audit AS (
    SELECT audit_status, so_the, gia_tri
    FROM v_myspa_legacy_card_audit
  ),
  history AS (
    SELECT COUNT(*) AS rows
    FROM lich_su_dich_vu_kh
  ),
  ledger_diff AS (
    SELECT COALESCE(SUM(ABS(chenh_lech)), 0) AS abs_diff
    FROM v_myspa_commission_vs_current_ledger_summary
    WHERE chenh_lech <> 0
  ),
  metrics AS (
    SELECT
      'customers_locked'::text AS metric,
      (SELECT COUNT(*)::numeric FROM khach_hang WHERE ma_kh IS NOT NULL) AS value,
      5965::numeric AS expected,
      5965::numeric - (SELECT COUNT(*)::numeric FROM khach_hang WHERE ma_kh IS NOT NULL) AS diff,
      'Khách hàng MySpa đã có trong HSMS'::text AS note
    UNION ALL
    SELECT
      'orders_locked',
      (SELECT COUNT(*)::numeric FROM don_hang WHERE ngay <= date '2026-04-30' AND COALESCE(is_test, false) = false),
      43864::numeric,
      43864::numeric - (SELECT COUNT(*)::numeric FROM don_hang WHERE ngay <= date '2026-04-30' AND COALESCE(is_test, false) = false),
      'Đơn hàng MySpa đến 30/04/2026'
    UNION ALL
    SELECT
      'order_lines_locked',
      (SELECT COUNT(*)::numeric FROM don_hang_chi_tiet dhct JOIN don_hang dh ON dh.id = dhct.don_hang_id WHERE dh.ngay <= date '2026-04-30' AND COALESCE(dh.is_test, false) = false),
      68956::numeric,
      68956::numeric - (SELECT COUNT(*)::numeric FROM don_hang_chi_tiet dhct JOIN don_hang dh ON dh.id = dhct.don_hang_id WHERE dh.ngay <= date '2026-04-30' AND COALESCE(dh.is_test, false) = false),
      'Dòng dịch vụ/sản phẩm trong đơn MySpa'
    UNION ALL
    SELECT
      'cards_locked',
      (SELECT COUNT(*)::numeric FROM the_lieu_trinh WHERE ngay_mua <= date '2026-04-30'),
      4684::numeric,
      4684::numeric - (SELECT COUNT(*)::numeric FROM the_lieu_trinh WHERE ngay_mua <= date '2026-04-30'),
      'Thẻ liệu trình MySpa đến 30/04/2026'
    UNION ALL
    SELECT 'commission_diff', 0::numeric, 0::numeric, (SELECT abs_diff::numeric FROM ledger_diff), 'Chênh lệch Tour/Hoa hồng MySpa vs HSMS'
    UNION ALL
    SELECT 'crm_history_rows', (SELECT rows::numeric FROM history), 68956::numeric, 68956::numeric - (SELECT rows::numeric FROM history), 'Lịch sử CRM từ chi tiết đơn hàng'
    UNION ALL
    SELECT 'card_review_needed', COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status <> 'ok'), 0), 0::numeric, COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status <> 'ok'), 0), 'Thẻ cần rà tay trước go-live'
    UNION ALL
    SELECT 'active_expired_cards', COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status = 'active_but_expired'), 0), 0::numeric, COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status = 'active_but_expired'), 0), 'Thẻ active nhưng đã hết hạn'
    UNION ALL
    SELECT 'overused_cards', COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status = 'used_more_than_total'), 0), 0::numeric, COALESCE((SELECT SUM(so_the)::numeric FROM card_audit WHERE audit_status = 'used_more_than_total'), 0), 'Thẻ dùng vượt số buổi'
  )
  INSERT INTO v_hsms_parallel_readiness_summary (metric, value, expected, diff, note)
  SELECT metric, value, expected, diff, note
  FROM metrics;

  INSERT INTO v_hsms_parallel_readiness_status (core_status, card_review_needed, active_expired_cards, overused_cards)
  SELECT
    CASE
      WHEN COALESCE(SUM(ABS(diff)) FILTER (WHERE metric IN ('customers_locked', 'orders_locked', 'order_lines_locked', 'cards_locked', 'commission_diff', 'crm_history_rows')), 0) = 0
      THEN 'core_locked'
      ELSE 'need_fix'
    END,
    COALESCE(SUM(value) FILTER (WHERE metric = 'card_review_needed'), 0),
    COALESCE(SUM(value) FILTER (WHERE metric = 'active_expired_cards'), 0),
    COALESCE(SUM(value) FILTER (WHERE metric = 'overused_cards'), 0)
  FROM v_hsms_parallel_readiness_summary;
END;
$$;

CREATE OR REPLACE FUNCTION hsms_review_treatment_card(
  p_card_id uuid,
  p_action text,
  p_reason text,
  p_new_expiry date DEFAULT NULL,
  p_total_sessions integer DEFAULT NULL,
  p_used_sessions integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before the_lieu_trinh%ROWTYPE;
  v_after the_lieu_trinh%ROWTYPE;
  v_reason text := btrim(COALESCE(p_reason, ''));
BEGIN
  IF v_reason = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cần nhập lý do xử lý thẻ');
  END IF;

  SELECT * INTO v_before
  FROM the_lieu_trinh
  WHERE id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy thẻ liệu trình');
  END IF;

  IF p_action = 'close_expired' THEN
    UPDATE the_lieu_trinh
    SET
      trang_thai = 'het_han',
      meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
        'review_status', 'closed_expired',
        'review_reason', v_reason,
        'reviewed_at', now()
      )
    WHERE id = p_card_id;
  ELSIF p_action = 'extend_expiry' THEN
    IF p_new_expiry IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cần chọn ngày hết hạn mới');
    END IF;
    UPDATE the_lieu_trinh
    SET
      ngay_het_han = p_new_expiry,
      trang_thai = CASE WHEN COALESCE(so_buoi_con_lai, so_buoi_tong - so_buoi_da_dung) > 0 OR COALESCE(is_khong_gioi_han, false) THEN 'active' ELSE trang_thai END,
      meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
        'review_status', 'extended',
        'review_reason', v_reason,
        'reviewed_at', now(),
        'old_expiry', v_before.ngay_het_han,
        'new_expiry', p_new_expiry
      )
    WHERE id = p_card_id;
  ELSIF p_action = 'adjust_sessions' THEN
    IF p_total_sessions IS NULL OR p_used_sessions IS NULL OR p_total_sessions <= 0 OR p_used_sessions < 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Số buổi không hợp lệ');
    END IF;
    UPDATE the_lieu_trinh
    SET
      so_buoi_tong = p_total_sessions,
      so_buoi_da_dung = p_used_sessions,
      trang_thai = CASE WHEN p_used_sessions >= p_total_sessions AND COALESCE(is_khong_gioi_han, false) = false THEN 'het_buoi' ELSE 'active' END,
      meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
        'review_status', 'sessions_adjusted',
        'review_reason', v_reason,
        'reviewed_at', now(),
        'old_total', v_before.so_buoi_tong,
        'old_used', v_before.so_buoi_da_dung,
        'new_total', p_total_sessions,
        'new_used', p_used_sessions
      )
    WHERE id = p_card_id;
  ELSIF p_action = 'keep_active' THEN
    UPDATE the_lieu_trinh
    SET
      trang_thai = 'active',
      meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
        'review_status', 'keep_active',
        'review_reason', v_reason,
        'reviewed_at', now()
      )
    WHERE id = p_card_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Thao tác không hợp lệ');
  END IF;

  SELECT * INTO v_after FROM the_lieu_trinh WHERE id = p_card_id;

  INSERT INTO the_lieu_trinh_review_log (
    the_lieu_trinh_id,
    action,
    reason,
    before_data,
    after_data,
    created_by
  )
  VALUES (
    p_card_id,
    p_action,
    v_reason,
    to_jsonb(v_before),
    to_jsonb(v_after),
    auth.uid()
  );

  PERFORM hsms_refresh_parallel_readiness_cache();

  RETURN jsonb_build_object('success', true, 'card_id', p_card_id, 'action', p_action);
END;
$$;

GRANT EXECUTE ON FUNCTION hsms_review_treatment_card(uuid, text, text, date, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hsms_refresh_parallel_readiness_cache() TO anon, authenticated;
GRANT SELECT ON the_lieu_trinh_review_log TO anon, authenticated;
