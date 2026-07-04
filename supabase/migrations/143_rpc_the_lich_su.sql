-- ═══════════════════════════════════════════════════════════════════════════
-- 143 · RPC LỊCH SỬ THẺ LIỆU TRÌNH — 1 round-trip thay 7 (04/07/2026)
-- Anh Nam (xem từ Mỹ) mở chi tiết thẻ chậm vài giây: CardHistory chạy 6-7
-- query NỐI TIẾP (uses → manual → buy line → đơn → thanh toán → HH → seller),
-- mỗi query ~300-400ms độ trễ Mỹ↔VPS. Avatar base64 ~35KB/NV còn bị LẶP theo
-- từng dòng lịch sử.
-- RPC này trả TOÀN BỘ trong 1 JSON; avatar tách bảng `staff` — mỗi NV 1 lần.
-- SECURITY INVOKER (đi theo quyền RLS người gọi) + chặn anon.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.the_lieu_trinh_lich_su(p_the_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  v_card the_lieu_trinh%ROWTYPE;
  v_buy_order_id uuid;
  v_result jsonb;
BEGIN
  SELECT * INTO v_card FROM the_lieu_trinh WHERE id = p_the_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'The khong ton tai');
  END IF;

  -- Đơn mua: ưu tiên don_hang_id trên thẻ, fallback dòng bán thẻ (the_moi)
  v_buy_order_id := v_card.don_hang_id;
  IF v_buy_order_id IS NULL THEN
    SELECT ct.don_hang_id INTO v_buy_order_id
    FROM don_hang_chi_tiet ct
    WHERE ct.the_lieu_trinh_id = p_the_id AND ct.loai_item = 'the_moi'
    LIMIT 1;
  END IF;

  SELECT jsonb_build_object(
    -- 1. Lượt dùng buổi từ đơn (nhan_vien chỉ trỏ id — avatar nằm trong staff)
    'uses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ct.id, 'so_luong', ct.so_luong, 'tien_tour', ct.tien_tour,
        'created_at', ct.created_at, 'nhan_vien_id', ct.nhan_vien_id,
        'don_hang', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', d.id, 'ma_don', d.ma_don, 'ngay', d.ngay, 'trang_thai', d.trang_thai) END
      ) ORDER BY d.ngay DESC NULLS LAST)
      FROM don_hang_chi_tiet ct
      LEFT JOIN don_hang d ON d.id = ct.don_hang_id
      WHERE ct.the_lieu_trinh_id = p_the_id AND ct.loai_item = 'the_lieu_trinh'
    ), '[]'::jsonb),

    -- 2. Lượt dùng ghi tay
    'manual_uses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ls.id, 'ngay', ls.ngay, 'don_hang_id', ls.don_hang_id,
        'created_at', ls.created_at,
        'nguoi_thuc_hien', COALESCE(nv.ho_ten, ls.nguoi_thuc_hien::text)))
      FROM lich_su_dung_the ls
      LEFT JOIN nhan_vien nv ON nv.id::text = ls.nguoi_thuc_hien::text
      WHERE ls.the_lieu_trinh_id = p_the_id
    ), '[]'::jsonb),

    -- 3. Đơn mua
    'buy_order', (
      SELECT jsonb_build_object('id', d.id, 'ma_don', d.ma_don, 'ngay', d.ngay,
        'trang_thai', d.trang_thai, 'tong_tien_hang', d.tong_tien_hang,
        'thuc_thu', d.thuc_thu, 'con_no', d.con_no, 'giam_gia', d.giam_gia)
      FROM don_hang d WHERE d.id = v_buy_order_id
    ),

    -- 4. Các lần thanh toán của đơn mua
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', tt.id, 'hinh_thuc', tt.hinh_thuc,
        'so_tien', tt.so_tien, 'created_at', tt.created_at, 'ghi_chu', tt.ghi_chu)
        ORDER BY tt.created_at)
      FROM thanh_toan tt WHERE tt.don_hang_id = v_buy_order_id
    ), '[]'::jsonb),

    -- 5. Hoa hồng bán thẻ (từ đơn mua)
    'seller_income', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', tn.id, 'loai', tn.loai,
        'so_tien', tn.so_tien, 'ti_le', tn.ti_le, 'nhan_vien_id', tn.nhan_vien_id))
      FROM nhan_vien_thu_nhap tn
      WHERE tn.don_hang_id = v_buy_order_id AND tn.loai LIKE '%hoa_hong%'
    ), '[]'::jsonb),

    'seller_id', v_card.nhan_vien_ban_id,

    -- 6. Hồ sơ NV liên quan — MỖI NGƯỜI 1 LẦN (avatar không lặp theo dòng)
    'staff', COALESCE((
      SELECT jsonb_object_agg(nv.id::text, jsonb_build_object(
        'id', nv.id, 'ho_ten', nv.ho_ten, 'vi_tri', nv.vi_tri, 'avatar_url', nv.avatar_url))
      FROM nhan_vien nv
      WHERE nv.id IN (
        SELECT ct.nhan_vien_id FROM don_hang_chi_tiet ct
        WHERE ct.the_lieu_trinh_id = p_the_id AND ct.nhan_vien_id IS NOT NULL
        UNION
        SELECT tn.nhan_vien_id FROM nhan_vien_thu_nhap tn
        WHERE tn.don_hang_id = v_buy_order_id AND tn.nhan_vien_id IS NOT NULL
        UNION
        SELECT v_card.nhan_vien_ban_id WHERE v_card.nhan_vien_ban_id IS NOT NULL
      )
    ), '{}'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.the_lieu_trinh_lich_su(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.the_lieu_trinh_lich_su(uuid) TO authenticated, service_role;
