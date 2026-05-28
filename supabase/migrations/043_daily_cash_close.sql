-- Migration 043: Daily cash close for one-shift front desk reporting

CREATE TABLE IF NOT EXISTS so_thu_chi_chot_ngay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ngay date NOT NULL UNIQUE,
  trang_thai text NOT NULL DEFAULT 'submitted'
    CHECK (trang_thai IN ('draft', 'submitted', 'approved', 'rejected')),

  tien_mat_pos integer NOT NULL DEFAULT 0,
  mb_pos integer NOT NULL DEFAULT 0,
  tp_pos integer NOT NULL DEFAULT 0,
  the_tra_truoc_pos integer NOT NULL DEFAULT 0,
  doanh_thu_pos integer NOT NULL DEFAULT 0,
  doanh_thu_manual integer NOT NULL DEFAULT 0,

  chi_tien_mat integer NOT NULL DEFAULT 0,
  chi_mb integer NOT NULL DEFAULT 0,
  chi_tp integer NOT NULL DEFAULT 0,
  tong_chi integer NOT NULL DEFAULT 0,

  tien_mat_du_kien integer NOT NULL DEFAULT 0,
  mb_du_kien integer NOT NULL DEFAULT 0,
  tp_du_kien integer NOT NULL DEFAULT 0,
  am_treo_truoc integer NOT NULL DEFAULT 0,
  tien_mat_phai_nop integer NOT NULL DEFAULT 0,
  tien_mat_da_nop integer NOT NULL DEFAULT 0,
  am_treo_sau integer NOT NULL DEFAULT 0,

  tien_mat_thuc_dem integer NOT NULL DEFAULT 0,
  mb_thuc_nhan integer NOT NULL DEFAULT 0,
  tp_thuc_nhan integer NOT NULL DEFAULT 0,

  lech_tien_mat integer NOT NULL DEFAULT 0,
  lech_mb integer NOT NULL DEFAULT 0,
  lech_tp integer NOT NULL DEFAULT 0,

  so_don_pos integer NOT NULL DEFAULT 0,
  so_lenh_tien_mat integer NOT NULL DEFAULT 0,
  so_lenh_mb integer NOT NULL DEFAULT 0,
  so_lenh_tp integer NOT NULL DEFAULT 0,

  giai_trinh text,
  nguoi_chot text,
  chot_luc timestamptz DEFAULT now(),
  admin_ghi_chu text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chot_ngay_ngay ON so_thu_chi_chot_ngay(ngay DESC);
CREATE INDEX IF NOT EXISTS idx_chot_ngay_trang_thai ON so_thu_chi_chot_ngay(trang_thai);

ALTER TABLE so_thu_chi_chot_ngay ADD COLUMN IF NOT EXISTS am_treo_truoc integer NOT NULL DEFAULT 0;
ALTER TABLE so_thu_chi_chot_ngay ADD COLUMN IF NOT EXISTS tien_mat_phai_nop integer NOT NULL DEFAULT 0;
ALTER TABLE so_thu_chi_chot_ngay ADD COLUMN IF NOT EXISTS tien_mat_da_nop integer NOT NULL DEFAULT 0;
ALTER TABLE so_thu_chi_chot_ngay ADD COLUMN IF NOT EXISTS am_treo_sau integer NOT NULL DEFAULT 0;
