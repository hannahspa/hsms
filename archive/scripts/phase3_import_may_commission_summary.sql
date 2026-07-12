-- Phase 3: import MySpa commission summary for 2026-05-01 to 2026-05-26.
--
-- Source file:
-- D:\Hannah Spa\Database\Tu 01.05 den 26.05\danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx
--
-- The file is an employee-level summary, not per-order detail.
-- We import it into a source summary table and create staff income ledger rows.

create table if not exists public.myspa_commission_summary_import (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,
  period_from date not null,
  period_to date not null,
  staff_name text not null,
  staff_phone text,
  doanh_so_truoc_giam integer,
  doanh_so_sau_giam integer,
  commission_doanh_thu numeric,
  commission_ngay_tim_kiem numeric,
  commission_tong_don integer,
  tien_tour integer,
  nhan_vien_id uuid references public.nhan_vien(id),
  imported_at timestamptz default now(),
  unique (source_file, period_from, period_to, staff_name)
);

insert into public.myspa_commission_summary_import (
  source_file,
  period_from,
  period_to,
  staff_name,
  staff_phone,
  doanh_so_truoc_giam,
  doanh_so_sau_giam,
  commission_doanh_thu,
  commission_ngay_tim_kiem,
  commission_tong_don,
  tien_tour
)
values
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Hồ Ngọc Phương', '0768355953', 8175000, 8175000, 245250, 230250, 245250, 0),
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Đỗ Thị Khánh Duy', '03692526753', 12307000, 12307000, 345861.3725, 345861.3725, 345861, 0),
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Nguyễn Hoàng Anh Thư', '0796863685', 29669000, 27903000, 1230000.163, 1230000.163, 1230000, 2249400),
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Lê Hoàng Phương Linh', '0909067314', 15540000, 15480000, 745400.1566, 745400.1566, 745400, 2459000),
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Trương Thị Bé Thôn', '0977047650', 14963000, 14852000, 689999.9265, 689999.9265, 690000, 2394000),
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Nguyễn Thị Tường Uyên', '0783939850', 27015000, 26895000, 1542000.3918, 1542000.3918, 1542000, 2126800),
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Lê Thị Cẩm My', '0778187334', 14073000, 13998000, 691100, 691100, 691100, 2300400),
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Nguyễn Thị Thúy Hoanh', '0989903380', 23205000, 21934000, 1059449.81, 1059449.81, 1059450, 1967000),
  ('danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx', date '2026-05-01', date '2026-05-26', 'Nguyễn Hoa Đào', '0778145015', 17127000, 17007000, 966999.9265, 966999.9265, 967000, 2052800)
on conflict (source_file, period_from, period_to, staff_name)
do update set
  staff_phone = excluded.staff_phone,
  doanh_so_truoc_giam = excluded.doanh_so_truoc_giam,
  doanh_so_sau_giam = excluded.doanh_so_sau_giam,
  commission_doanh_thu = excluded.commission_doanh_thu,
  commission_ngay_tim_kiem = excluded.commission_ngay_tim_kiem,
  commission_tong_don = excluded.commission_tong_don,
  tien_tour = excluded.tien_tour,
  imported_at = now();

update public.myspa_commission_summary_import s
set nhan_vien_id = nv.id
from public.nhan_vien nv
where s.source_file = 'danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx'
  and s.period_from = date '2026-05-01'
  and s.period_to = date '2026-05-26'
  and lower(unaccent(nv.ho_ten)) = lower(unaccent(s.staff_name));

delete from public.nhan_vien_thu_nhap
where nguon = 'myspa_commission'
  and ngay = date '2026-05-26'
  and ghi_chu ilike 'MySpa 01/05/2026-26/05/2026%';

insert into public.nhan_vien_thu_nhap (
  nhan_vien_id,
  loai,
  nguon,
  ngay,
  doanh_so_tinh,
  ti_le,
  so_tien,
  trang_thai,
  ghi_chu
)
select
  nhan_vien_id,
  'commission',
  'myspa_commission',
  period_to,
  doanh_so_sau_giam,
  null,
  commission_tong_don,
  'doi_soat',
  'MySpa 01/05/2026-26/05/2026 - commission tổng theo nhân viên'
from public.myspa_commission_summary_import
where source_file = 'danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx'
  and period_from = date '2026-05-01'
  and period_to = date '2026-05-26'
  and nhan_vien_id is not null
  and coalesce(commission_tong_don, 0) <> 0;

insert into public.nhan_vien_thu_nhap (
  nhan_vien_id,
  loai,
  nguon,
  ngay,
  doanh_so_tinh,
  ti_le,
  so_tien,
  trang_thai,
  ghi_chu
)
select
  nhan_vien_id,
  'tour',
  'myspa_commission',
  period_to,
  doanh_so_sau_giam,
  null,
  tien_tour,
  'doi_soat',
  'MySpa 01/05/2026-26/05/2026 - tiền tour tổng theo nhân viên'
from public.myspa_commission_summary_import
where source_file = 'danh_sach_commission_tat_ca_chi_nhanh_1779852210.xlsx'
  and period_from = date '2026-05-01'
  and period_to = date '2026-05-26'
  and nhan_vien_id is not null
  and coalesce(tien_tour, 0) <> 0;

select
  loai,
  count(*) as so_dong,
  sum(so_tien) as so_tien
from public.nhan_vien_thu_nhap
where nguon = 'myspa_commission'
  and ngay = date '2026-05-26'
  and ghi_chu ilike 'MySpa 01/05/2026-26/05/2026%'
group by loai
order by loai;
