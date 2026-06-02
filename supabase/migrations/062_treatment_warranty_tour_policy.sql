-- 062_treatment_warranty_tour_policy.sql
-- Khoa logic tien tour cho combo the lieu trinh Triet Long Bao Hanh.

create or replace function public.is_warranty_hair_removal_card(p_the_lieu_trinh_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.the_lieu_trinh t
    left join public.combo_lieu_trinh c on c.id = t.combo_id
    where t.id = p_the_lieu_trinh_id
      and (
        t.combo_id is not null
        or t.loai_the = 'combo_lieu_trinh'
        or t.meta->>'loai' = 'combo_lieu_trinh'
      )
      and concat_ws(' ', t.ten_dich_vu, c.ten_combo, c.nhom_dich_vu, t.meta->>'combo_name') ilike '%Triệt Lông%'
      and concat_ws(' ', t.ten_dich_vu, c.ten_combo, c.nhom_dich_vu, t.meta->>'combo_name') ilike '%Bảo hành%'
  );
$$;

create or replace function public.enforce_warranty_hair_removal_tour_policy()
returns trigger
language plpgsql
as $$
declare
  v_order_date date;
  v_last_use_date date;
  v_used_count integer := 0;
  v_paid_sessions integer := 0;
  v_paid_staff_ids uuid[] := array[]::uuid[];
begin
  if new.loai_item <> 'the_lieu_trinh' or new.the_lieu_trinh_id is null then
    return new;
  end if;

  if not public.is_warranty_hair_removal_card(new.the_lieu_trinh_id) then
    return new;
  end if;

  select coalesce(so_buoi_da_dung, 0)
    into v_used_count
  from public.the_lieu_trinh
  where id = new.the_lieu_trinh_id;

  select ngay
    into v_order_date
  from public.don_hang
  where id = new.don_hang_id;

  select max(dh.ngay)
    into v_last_use_date
  from public.don_hang_chi_tiet dct
  join public.don_hang dh on dh.id = dct.don_hang_id
  where dct.the_lieu_trinh_id = new.the_lieu_trinh_id
    and dct.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and dct.loai_item = 'the_lieu_trinh'
    and coalesce(dh.trang_thai, '') not in ('draft', 'huy');

  if v_order_date is not null
     and v_last_use_date is not null
     and v_order_date < (v_last_use_date + interval '14 days')::date then
    raise exception 'GOI_BAO_HANH_TRIET_LONG_CAN_CACH_14_NGAY';
  end if;

  select
      coalesce(sum(greatest(coalesce(dct.so_luong, 1), 1)), 0)::integer,
      coalesce(array_agg(distinct dct.nhan_vien_id) filter (where dct.nhan_vien_id is not null), array[]::uuid[])
    into v_paid_sessions, v_paid_staff_ids
  from public.don_hang_chi_tiet dct
  join public.don_hang dh on dh.id = dct.don_hang_id
  where dct.the_lieu_trinh_id = new.the_lieu_trinh_id
    and dct.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and dct.loai_item = 'the_lieu_trinh'
    and coalesce(dct.tien_tour, 0) > 0
    and coalesce(dh.trang_thai, '') not in ('draft', 'huy');

  if greatest(v_used_count, v_paid_sessions) >= 10 then
    new.tien_tour := 0;
    new.ti_le_hoa_hong := 0;

    if new.nhan_vien_id is not null
       and array_length(v_paid_staff_ids, 1) is not null
       and not (new.nhan_vien_id = any(v_paid_staff_ids)) then
      raise exception 'GOI_BAO_HANH_TRIET_LONG_CHI_NV_DA_NHAN_TOUR_10_BUOI_DAU';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_warranty_hair_removal_tour_policy on public.don_hang_chi_tiet;

create trigger trg_warranty_hair_removal_tour_policy
before insert or update of the_lieu_trinh_id, loai_item, nhan_vien_id, tien_tour, ti_le_hoa_hong, so_luong
on public.don_hang_chi_tiet
for each row
execute function public.enforce_warranty_hair_removal_tour_policy();
