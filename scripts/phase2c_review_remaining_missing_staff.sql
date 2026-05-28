-- Phase 2C: summarize historical order lines that still have no staff id.
-- Most of these are cases where the MySpa exported data itself has no staff.

drop table if exists public.legacy_missing_staff_review_20260527;

create table public.legacy_missing_staff_review_20260527 as
with missing as (
  select
    dhct.id as line_id,
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
    ) as item_name
  from public.don_hang_chi_tiet dhct
  join public.don_hang dh on dh.id = dhct.don_hang_id
  left join public.the_lieu_trinh tlt on tlt.id = dhct.the_lieu_trinh_id
  where dh.ngay <= date '2026-04-30'
    and dhct.loai_item in ('dich_vu', 'the_lieu_trinh', 'the_moi')
    and dhct.nhan_vien_id is null
),
candidate as (
  select
    m.line_id,
    count(*) as sync_rows,
    count(*) filter (where nullif(s.staff_display, '') is not null) as staff_rows,
    count(distinct s.staff_display) filter (where nullif(s.staff_display, '') is not null) as staff_count,
    string_agg(distinct s.staff_display, ', ' order by s.staff_display)
      filter (where nullif(s.staff_display, '') is not null) as staff_names,
    sum(coalesce(s.commission_amount, 0)) filter (where nullif(s.staff_display, '') is not null) as staff_money
  from missing m
  left join public.myspa_legacy_staff_sync s
    on s.ma_don = m.ma_don
   and lower(unaccent(trim(s.ten_dich_vu))) = lower(unaccent(trim(m.item_name)))
  group by m.line_id
)
select
  m.*,
  coalesce(c.sync_rows, 0) as sync_rows,
  coalesce(c.staff_rows, 0) as staff_rows,
  coalesce(c.staff_count, 0) as staff_count,
  c.staff_names,
  coalesce(c.staff_money, 0) as staff_money,
  case
    when coalesce(c.staff_rows, 0) = 0
      then 'myspa_export_khong_co_ten_nhan_vien'
    when c.staff_count > 1
      then 'nhieu_nhan_vien_can_tach_dong_thu_cong'
    else 'can_kiem_tra_lai'
  end as ly_do_con_lai
from missing m
left join candidate c on c.line_id = m.line_id
order by m.ngay desc, m.ma_don desc, m.item_name;

select
  ly_do_con_lai,
  count(*) as so_dong,
  count(distinct ma_don) as so_don,
  sum(thanh_tien) as tong_tien,
  min(ngay) as tu_ngay,
  max(ngay) as den_ngay
from public.legacy_missing_staff_review_20260527
group by ly_do_con_lai
order by so_dong desc;
