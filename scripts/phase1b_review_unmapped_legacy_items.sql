-- Phase 1B: build a review table for legacy order lines that still do not
-- have a standard service id after exact-name mapping.
--
-- This script does not modify order data. It creates a review table so we can
-- decide safely which rows are old services, products, vouchers, or combo cards.

drop table if exists public.legacy_unmapped_item_review_20260527;

create table public.legacy_unmapped_item_review_20260527 as
with remaining as (
  select
    dhct.id as line_id,
    dhct.don_hang_id,
    dh.ma_don,
    dh.ngay,
    dhct.loai_item,
    dhct.thanh_tien,
    trim(
      coalesce(
        nullif(dhct.meta->>'tenDichVu', ''),
        nullif(tlt.ten_dich_vu, ''),
        regexp_replace(coalesce(dhct.ghi_chu, ''), '^(Dịch vụ|Liệu trình):\s*', '', 'i')
      )
    ) as legacy_item_name
  from public.don_hang_chi_tiet dhct
  join public.don_hang dh on dh.id = dhct.don_hang_id
  left join public.the_lieu_trinh tlt on tlt.id = dhct.the_lieu_trinh_id
  where dh.ngay <= date '2026-04-30'
    and dhct.dich_vu_id is null
    and dhct.loai_item in ('dich_vu', 'the_lieu_trinh', 'the_moi')
),
grouped as (
  select
    legacy_item_name,
    loai_item,
    count(*) as so_dong,
    sum(thanh_tien) as tong_tien,
    min(ngay) as tu_ngay,
    max(ngay) as den_ngay
  from remaining
  where nullif(legacy_item_name, '') is not null
  group by legacy_item_name, loai_item
),
classified as (
  select
    *,
    case
      when legacy_item_name ilike 'Thẻ hội viên%' or legacy_item_name ilike 'Thẻ Quà Tặng%'
        then 'the_hoi_vien_voucher'
      when legacy_item_name ilike '%Bảo hành%'
        then 'combo_bao_hanh'
      when legacy_item_name ~* '(cream|serum|kem|nạ|mask|xịt|dầu|lotion|toner|vitamin|collagen|gsc|avene|gel|sữa|tẩy trang|dầu gội|khẩu trang|lăn khử|nước dưỡng|tinh chất|powder|enzyme|hyaluronic)'
        then 'san_pham_kho'
      else 'dich_vu_cu_can_alias'
    end as nhom_du_lieu,
    case
      when legacy_item_name ilike '%Cổ Vai Gáy Trị Liệu%'
        then 'Massage Cổ Vai Gáy Trị Liệu Gói 60p'
      when legacy_item_name ilike '%Tắm dưỡng%rganic%'
        then 'Tắm dưỡng Organic'
      when legacy_item_name ilike '%Silk%Skin%Mụn thâm lưng%' or legacy_item_name ilike '%Silky Skin%Mụn thâm lưng%'
        then 'Silk Skin  Mụn thâm lưng'
      when legacy_item_name ilike '%Triệt Lông Full Bikini%'
        then 'Triệt Lông Full Bikini'
      when legacy_item_name ilike '%Triệt Lông Dưới Cánh Tay%'
        then 'Triệt Lông Dưới Cánh Tay'
      when legacy_item_name ilike '%Triệt Lông Nửa Đôi Chân%'
        then 'Triệt Lông Nửa Đôi Chân'
      when legacy_item_name ilike '%Triệt Lông Nguyên Đôi Chân%' or legacy_item_name ilike '%TRiệt Lông Nguyên Đôi Chân%'
        then 'Triệt Lông Nguyên Đôi Chân'
      when legacy_item_name ilike '%Triệt Lông Nửa Đôi Cánh Tay%'
        then 'Triệt Lông Nửa Đôi Cánh Tay'
      when legacy_item_name ilike '%Triệt Lông Bikini Gọn%'
        then 'Triệt Lông Bikini Gọn'
      else null
    end as suggested_service_name
  from grouped
)
select
  c.*,
  dv.id as suggested_dich_vu_id,
  dv.ma_dv as suggested_ma_dv,
  dv.gia_co_ban as suggested_gia_co_ban,
  case
    when c.nhom_du_lieu = 'san_pham_kho'
      then 'Cho qua module Kho/Sản phẩm sau khi chốt kho 31/05/2026; chưa gán vào dịch vụ.'
    when c.nhom_du_lieu = 'the_hoi_vien_voucher'
      then 'Giữ nhóm thẻ hội viên/voucher lịch sử; cần chính sách riêng, không gán vào dịch vụ làm.'
    when c.nhom_du_lieu = 'combo_bao_hanh' and dv.id is not null
      then 'Có thể gán về dịch vụ nền và giữ ghi chú bảo hành/combo trong meta.'
    when c.nhom_du_lieu = 'dich_vu_cu_can_alias' and dv.id is not null
      then 'Có thể gán alias về dịch vụ hiện tại sau khi duyệt.'
    else 'Cần rà soát thủ công trước khi cập nhật.'
  end as suggested_action
from classified c
left join public.dich_vu dv on dv.ten = c.suggested_service_name
order by c.nhom_du_lieu, c.so_dong desc, c.legacy_item_name;

create index legacy_unmapped_item_review_20260527_group_idx
  on public.legacy_unmapped_item_review_20260527 (nhom_du_lieu, loai_item);

create index legacy_unmapped_item_review_20260527_service_idx
  on public.legacy_unmapped_item_review_20260527 (suggested_dich_vu_id)
  where suggested_dich_vu_id is not null;

select
  nhom_du_lieu,
  count(*) as so_ten,
  sum(so_dong) as so_dong,
  sum(tong_tien) as tong_tien,
  count(*) filter (where suggested_dich_vu_id is not null) as so_ten_co_goi_y_dich_vu
from public.legacy_unmapped_item_review_20260527
group by nhom_du_lieu
order by so_dong desc;
