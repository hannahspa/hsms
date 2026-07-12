-- Phase 2B: attach the remaining historical lines that have exactly one
-- staff candidate in myspa_legacy_staff_sync by order code + service name.
--
-- This script intentionally skips lines with zero staff or multiple staff.

with missing as (
  select
    dhct.id as line_id,
    dh.ma_don,
    dhct.loai_item,
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
    and nullif(dhct.meta->>'myspaStaffDisplay', '') is null
),
sync_candidates as (
  select
    m.line_id,
    m.loai_item,
    count(*) filter (where nullif(s.staff_display, '') is not null) as staff_rows,
    count(distinct s.staff_display) filter (where nullif(s.staff_display, '') is not null) as staff_count,
    (array_agg(s.matched_nhan_vien_id) filter (where nullif(s.staff_display, '') is not null))[1] as nhan_vien_id,
    max(s.staff_display) filter (where nullif(s.staff_display, '') is not null) as staff_display,
    sum(coalesce(s.commission_amount, 0)) filter (where nullif(s.staff_display, '') is not null) as staff_money
  from missing m
  join public.myspa_legacy_staff_sync s
    on s.ma_don = m.ma_don
   and lower(unaccent(trim(s.ten_dich_vu))) = lower(unaccent(trim(m.item_name)))
  group by m.line_id, m.loai_item
),
matched as (
  select *
  from sync_candidates
  where staff_count = 1
    and staff_rows = 1
    and nhan_vien_id is not null
)
insert into public.don_hang_chi_tiet_staff_backup_20260527 (
  line_id,
  old_nhan_vien_id,
  old_tien_tour,
  old_tien_commission,
  old_tien_hoa_hong,
  old_meta
)
select
  dhct.id,
  dhct.nhan_vien_id,
  dhct.tien_tour,
  dhct.tien_commission,
  dhct.tien_hoa_hong,
  dhct.meta
from public.don_hang_chi_tiet dhct
join matched on matched.line_id = dhct.id
on conflict (line_id) do nothing;

with missing as (
  select
    dhct.id as line_id,
    dh.ma_don,
    dhct.loai_item,
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
    and nullif(dhct.meta->>'myspaStaffDisplay', '') is null
),
sync_candidates as (
  select
    m.line_id,
    m.loai_item,
    count(*) filter (where nullif(s.staff_display, '') is not null) as staff_rows,
    count(distinct s.staff_display) filter (where nullif(s.staff_display, '') is not null) as staff_count,
    (array_agg(s.matched_nhan_vien_id) filter (where nullif(s.staff_display, '') is not null))[1] as nhan_vien_id,
    max(s.staff_display) filter (where nullif(s.staff_display, '') is not null) as staff_display,
    sum(coalesce(s.commission_amount, 0)) filter (where nullif(s.staff_display, '') is not null) as staff_money
  from missing m
  join public.myspa_legacy_staff_sync s
    on s.ma_don = m.ma_don
   and lower(unaccent(trim(s.ten_dich_vu))) = lower(unaccent(trim(m.item_name)))
  group by m.line_id, m.loai_item
),
matched as (
  select *
  from sync_candidates
  where staff_count = 1
    and staff_rows = 1
    and nhan_vien_id is not null
)
update public.don_hang_chi_tiet dhct
set
  nhan_vien_id = matched.nhan_vien_id,
  tien_tour = case
    when matched.loai_item in ('dich_vu', 'the_lieu_trinh') then matched.staff_money
    else coalesce(dhct.tien_tour, 0)
  end,
  tien_commission = case
    when matched.loai_item = 'the_moi' then matched.staff_money
    else coalesce(dhct.tien_commission, 0)
  end,
  tien_hoa_hong = matched.staff_money,
  meta = coalesce(dhct.meta, '{}'::jsonb)
    || jsonb_build_object(
      'myspaStaffDisplay', matched.staff_display,
      'staffMapPhase', 'phase2b_sync_unique',
      'staffMapAt', now(),
      'staffMapConfidence', 'unique_order_service_sync'
    )
from matched
where dhct.id = matched.line_id;

select
  count(*) as phase2b_mapped_rows
from public.don_hang_chi_tiet dhct
join public.don_hang dh on dh.id = dhct.don_hang_id
where dh.ngay <= date '2026-04-30'
  and dhct.meta->>'staffMapPhase' = 'phase2b_sync_unique';

select
  count(*) as remaining_null_staff
from public.don_hang_chi_tiet dhct
join public.don_hang dh on dh.id = dhct.don_hang_id
where dh.ngay <= date '2026-04-30'
  and dhct.loai_item in ('dich_vu', 'the_lieu_trinh', 'the_moi')
  and dhct.nhan_vien_id is null;
