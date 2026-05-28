-- Phase 2A: attach legacy MySpa staff names stored in line meta to HSMS staff ids.
--
-- Scope:
-- - Only historical orders up to 2026-04-30.
-- - Only lines that already have myspaStaffDisplay in meta.
-- - Does not infer staff for lines with missing MySpa staff data.
-- - Backs up affected rows before updating.

insert into public.nhan_vien (ho_ten, vi_tri, luong_cung, trang_thai, ngay_bat_dau)
select 'Nguyen Thi Phuong Duy (Nghỉ Việc)', 'Kỹ thuật viên', 0, 'nghi_viec', date '2019-01-01'
where not exists (
  select 1
  from public.nhan_vien
  where lower(unaccent(ho_ten)) = lower(unaccent('Nguyen Thi Phuong Duy (Nghỉ Việc)'))
);

create table if not exists public.don_hang_chi_tiet_staff_backup_20260527 (
  line_id uuid primary key,
  old_nhan_vien_id uuid,
  old_tien_tour integer,
  old_tien_commission integer,
  old_tien_hoa_hong integer,
  old_meta jsonb,
  backed_up_at timestamptz default now()
);

with candidate_lines as (
  select
    dhct.id,
    dhct.nhan_vien_id,
    dhct.tien_tour,
    dhct.tien_commission,
    dhct.tien_hoa_hong,
    dhct.meta
  from public.don_hang_chi_tiet dhct
  join public.don_hang dh on dh.id = dhct.don_hang_id
  where dh.ngay <= date '2026-04-30'
    and dhct.loai_item in ('dich_vu', 'the_lieu_trinh', 'the_moi')
    and dhct.nhan_vien_id is null
    and nullif(dhct.meta->>'myspaStaffDisplay', '') is not null
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
  id,
  nhan_vien_id,
  tien_tour,
  tien_commission,
  tien_hoa_hong,
  meta
from candidate_lines
on conflict (line_id) do nothing;

with line_staff as (
  select
    dhct.id as line_id,
    dhct.loai_item,
    coalesce((dhct.meta->>'myspaStaffCommission')::integer, 0) as staff_money,
    lower(unaccent(trim(regexp_replace(
      replace(
        replace(
          replace(dhct.meta->>'myspaStaffDisplay', '(Nghỉ Việc)', ''),
          '( Boss )',
          ''
        ),
        '(Boss)',
        ''
      ),
      '\s+',
      ' ',
      'g'
    )))) as staff_key
  from public.don_hang_chi_tiet dhct
  join public.don_hang dh on dh.id = dhct.don_hang_id
  where dh.ngay <= date '2026-04-30'
    and dhct.loai_item in ('dich_vu', 'the_lieu_trinh', 'the_moi')
    and dhct.nhan_vien_id is null
    and nullif(dhct.meta->>'myspaStaffDisplay', '') is not null
),
staff_norm as (
  select
    id as nhan_vien_id,
    lower(unaccent(trim(regexp_replace(
      replace(ho_ten, '(Nghỉ Việc)', ''),
      '\s+',
      ' ',
      'g'
    )))) as staff_key
  from public.nhan_vien
),
matched as (
  select
    ls.line_id,
    ls.loai_item,
    ls.staff_money,
    sn.nhan_vien_id
  from line_staff ls
  join staff_norm sn on sn.staff_key = ls.staff_key
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
      'staffMapPhase', 'phase2a_meta_staff',
      'staffMapAt', now(),
      'staffMapConfidence', 'exact_unaccent_meta_display'
    )
from matched
where dhct.id = matched.line_id;

select
  count(*) as backed_up_rows
from public.don_hang_chi_tiet_staff_backup_20260527;

select
  count(*) as remaining_null_staff_with_meta_display
from public.don_hang_chi_tiet dhct
join public.don_hang dh on dh.id = dhct.don_hang_id
where dh.ngay <= date '2026-04-30'
  and dhct.loai_item in ('dich_vu', 'the_lieu_trinh', 'the_moi')
  and dhct.nhan_vien_id is null
  and nullif(dhct.meta->>'myspaStaffDisplay', '') is not null;

select
  count(*) as remaining_null_staff_no_meta_display
from public.don_hang_chi_tiet dhct
join public.don_hang dh on dh.id = dhct.don_hang_id
where dh.ngay <= date '2026-04-30'
  and dhct.loai_item in ('dich_vu', 'the_lieu_trinh', 'the_moi')
  and dhct.nhan_vien_id is null
  and nullif(dhct.meta->>'myspaStaffDisplay', '') is null;
