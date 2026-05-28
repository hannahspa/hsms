-- HSMS: Combo lieu trinh / goi bao hanh theo nam
-- Muc tieu:
-- 1. Tao danh muc combo ban san (giong MySpa service_card_value)
-- 2. Gan combo vao the_lieu_trinh da import neu ten the cu co dau hieu bao hanh 1/3 nam
-- 3. Ghi log backfill de kiem tra truoc khi van hanh thuc te

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION hsms_norm_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(unaccent(coalesce(input, '')));
$$;

CREATE TABLE IF NOT EXISTS combo_lieu_trinh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_combo text UNIQUE,
  ten_combo text NOT NULL,
  nhom_dich_vu text,
  menh_gia integer NOT NULL DEFAULT 0,
  gia_ban integer NOT NULL DEFAULT 0,
  chiet_khau integer NOT NULL DEFAULT 0,
  thoi_han_so integer NOT NULL DEFAULT 1,
  thoi_han_don_vi text NOT NULL DEFAULT 'year'
    CHECK (thoi_han_don_vi IN ('day', 'month', 'year')),
  ti_le_commission numeric(6,2) NOT NULL DEFAULT 0,
  tien_commission integer NOT NULL DEFAULT 0,
  trang_thai text NOT NULL DEFAULT 'active',
  ghi_chu text,
  source text NOT NULL DEFAULT 'hsms',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS combo_lieu_trinh_dich_vu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES combo_lieu_trinh(id) ON DELETE CASCADE,
  dich_vu_id uuid REFERENCES dich_vu(id) ON DELETE SET NULL,
  ten_dich_vu text NOT NULL,
  so_lan integer,
  khong_gioi_han boolean NOT NULL DEFAULT false,
  don_gia integer NOT NULL DEFAULT 0,
  thu_tu integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (combo_id, ten_dich_vu)
);

CREATE TABLE IF NOT EXISTS combo_lieu_trinh_backfill_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  the_lieu_trinh_id uuid NOT NULL REFERENCES the_lieu_trinh(id) ON DELETE CASCADE,
  combo_id uuid NOT NULL REFERENCES combo_lieu_trinh(id) ON DELETE CASCADE,
  khach_hang_id uuid REFERENCES khach_hang(id) ON DELETE SET NULL,
  ten_the_cu text,
  ten_combo text,
  ly_do text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (the_lieu_trinh_id, combo_id)
);

ALTER TABLE the_lieu_trinh
  ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES combo_lieu_trinh(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loai_the text NOT NULL DEFAULT 'lieu_trinh',
  ADD COLUMN IF NOT EXISTS is_khong_gioi_han boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_combo_lieu_trinh_trang_thai ON combo_lieu_trinh(trang_thai);
CREATE INDEX IF NOT EXISTS idx_combo_lieu_trinh_ten ON combo_lieu_trinh(ten_combo);
CREATE INDEX IF NOT EXISTS idx_combo_ltdv_combo ON combo_lieu_trinh_dich_vu(combo_id);
CREATE INDEX IF NOT EXISTS idx_the_lieu_trinh_combo ON the_lieu_trinh(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_backfill_the ON combo_lieu_trinh_backfill_log(the_lieu_trinh_id);

INSERT INTO combo_lieu_trinh (
  ma_combo, ten_combo, nhom_dich_vu, menh_gia, gia_ban, thoi_han_so, thoi_han_don_vi,
  trang_thai, source, ghi_chu
)
VALUES
  ('TL-DCT-1Y', 'Triệt Lông Dưới Cánh Tay (Bảo hành 1 năm)', 'Triệt Lông', 3000000, 3000000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Dưới Cánh Tay (Bảo hành 1 năm)'),
  ('TL-DCT-3Y', 'Triệt Lông Dưới Cánh Tay (Bảo hành 3 năm)', 'Triệt Lông', 3000000, 3000000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Dưới Cánh Tay (Bảo hành 3 năm)'),
  ('TL-FBI-1Y', 'Triệt Lông Full Bikini (Bảo hành 1 năm)', 'Triệt Lông', 5000000, 5000000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Full Bikini (Bảo hành 1 năm)'),
  ('TL-FBI-3Y', 'Triệt Lông Full Bikini (Bảo hành 3 năm)', 'Triệt Lông', 5000000, 5000000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Full Bikini (Bảo hành 3 năm)'),
  ('TL-BKG-1Y', 'Triệt Lông Bikini Gọn (Bảo hành 1 năm)', 'Triệt Lông', 4000000, 4000000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Bikini Gọn (Bảo hành 1 năm)'),
  ('TL-BKG-3Y', 'Triệt Lông Bikini Gọn (Bảo hành 3 năm)', 'Triệt Lông', 4000000, 4000000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Bikini Gọn (Bảo hành 3 năm)'),
  ('TL-TMC-1Y', 'Triệt Lông Trán/Mép/Cằm (Bảo hành 1 năm)', 'Triệt Lông', 1800000, 1800000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Trán/ Mép / Cằm (Bảo hành 1 năm)'),
  ('TL-TMC-3Y', 'Triệt Lông Trán/Mép/Cằm (Bảo hành 3 năm)', 'Triệt Lông', 1800000, 1800000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Trán/ Mép / Cằm (Bảo hành 3 năm)'),
  ('TL-MAT-1Y', 'Triệt Lông Mặt (Bảo hành 1 năm)', 'Triệt Lông', 6000000, 6000000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Mặt (Bảo hành 1 năm)'),
  ('TL-MAT-3Y', 'Triệt Lông Mặt (Bảo hành 3 năm)', 'Triệt Lông', 6000000, 6000000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Mặt (Bảo hành 3 năm)'),
  ('TL-NCT-1Y', 'Triệt Lông Nửa Đôi Cánh Tay (Bảo hành 1 năm)', 'Triệt Lông', 3600000, 3600000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Nửa Đôi Cánh Tay (Bảo hành 1 năm)'),
  ('TL-NCT-3Y', 'Triệt Lông Nửa Đôi Cánh Tay (Bảo hành 3 năm)', 'Triệt Lông', 3600000, 3600000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Nửa Đôi Cánh Tay (Bảo hành 3 năm)'),
  ('TL-NDT-1Y', 'Triệt Lông Nguyên Đôi Tay (Bảo hành 1 năm)', 'Triệt Lông', 4500000, 4500000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Nguyên Đôi Tay (Bảo hành 1 năm)'),
  ('TL-NDT-3Y', 'Triệt Lông Nguyên Đôi Tay (Bảo hành 3 năm)', 'Triệt Lông', 4500000, 4500000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Nguyên Đôi Tay (Bảo hành 3 năm)'),
  ('TL-NDC-1Y', 'Triệt Lông Nửa Đôi Chân (Bảo hành 1 năm)', 'Triệt Lông', 4500000, 4500000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Nửa Đôi Chân (Bảo hành 1 năm)'),
  ('TL-NDC-3Y', 'Triệt Lông Nửa Đôi Chân (Bảo hành 3 năm)', 'Triệt Lông', 4500000, 4500000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Nửa Đôi Chân (Bảo hành 3 năm)'),
  ('TL-NGC-1Y', 'Triệt Lông Nguyên Đôi Chân (Bảo hành 1 năm)', 'Triệt Lông', 6000000, 6000000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Nguyên Đôi Chân (Bảo hành 1 năm)'),
  ('TL-NGC-3Y', 'Triệt Lông Nguyên Đôi Chân (Bảo hành 3 năm)', 'Triệt Lông', 6000000, 6000000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Nguyên Đôi Chân (Bảo hành 3 năm)'),
  ('TL-LUNG-1Y', 'Triệt Lông Lưng (Bảo hành 1 năm)', 'Triệt Lông', 5000000, 5000000, 1, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Lưng (Bảo hành 1 năm)'),
  ('TL-LUNG-3Y', 'Triệt Lông Lưng (Bảo hành 3 năm)', 'Triệt Lông', 5000000, 5000000, 3, 'year', 'active', 'myspa_import', 'MySpa: Triệt Lông Lưng (Bảo hành 3 năm)')
ON CONFLICT (ma_combo) DO UPDATE SET
  ten_combo = EXCLUDED.ten_combo,
  nhom_dich_vu = EXCLUDED.nhom_dich_vu,
  menh_gia = EXCLUDED.menh_gia,
  gia_ban = EXCLUDED.gia_ban,
  thoi_han_so = EXCLUDED.thoi_han_so,
  thoi_han_don_vi = EXCLUDED.thoi_han_don_vi,
  trang_thai = EXCLUDED.trang_thai,
  ghi_chu = EXCLUDED.ghi_chu,
  updated_at = now();

WITH combo_service AS (
  SELECT *
  FROM (VALUES
    ('TL-DCT-1Y', 'Triệt Lông Dưới Cánh Tay', 24, false, 3000000, 1),
    ('TL-DCT-3Y', 'Triệt Lông Dưới Cánh Tay', 72, false, 3000000, 1),
    ('TL-FBI-1Y', 'Triệt Lông Full Bikini', 24, false, 5000000, 1),
    ('TL-FBI-3Y', 'Triệt Lông Full Bikini', 72, false, 5000000, 1),
    ('TL-BKG-1Y', 'Triệt Lông Bikini Gọn', 24, false, 4000000, 1),
    ('TL-BKG-3Y', 'Triệt Lông Bikini Gọn', 72, false, 4000000, 1),
    ('TL-TMC-1Y', 'Triệt Lông Trán/ Mép / Cằm', 24, false, 1800000, 1),
    ('TL-TMC-3Y', 'Triệt Lông Trán/ Mép / Cằm', 72, false, 1800000, 1),
    ('TL-MAT-1Y', 'Triệt Lông Mặt', 24, false, 6000000, 1),
    ('TL-MAT-3Y', 'Triệt Lông Mặt', 72, false, 6000000, 1),
    ('TL-NCT-1Y', 'Triệt Lông Nửa Đôi Cánh Tay', 24, false, 3600000, 1),
    ('TL-NCT-3Y', 'Triệt Lông Nửa Đôi Cánh Tay', 72, false, 3600000, 1),
    ('TL-NDT-1Y', 'Triệt Lông Nguyên Đôi Tay', 24, false, 4500000, 1),
    ('TL-NDT-3Y', 'Triệt Lông Nguyên Đôi Tay', 72, false, 4500000, 1),
    ('TL-NDC-1Y', 'Triệt Lông Nửa Đôi Chân', 24, false, 4500000, 1),
    ('TL-NDC-3Y', 'Triệt Lông Nửa Đôi Chân', 72, false, 4500000, 1),
    ('TL-NGC-1Y', 'Triệt Lông Nguyên Đôi Chân', 24, false, 6000000, 1),
    ('TL-NGC-3Y', 'Triệt Lông Nguyên Đôi Chân', 72, false, 6000000, 1),
    ('TL-LUNG-1Y', 'Triệt Lông Lưng', 24, false, 5000000, 1),
    ('TL-LUNG-3Y', 'Triệt Lông Lưng', 72, false, 5000000, 1)
  ) AS v(ma_combo, ten_dich_vu, so_lan, khong_gioi_han, don_gia, thu_tu)
)
INSERT INTO combo_lieu_trinh_dich_vu (
  combo_id, dich_vu_id, ten_dich_vu, so_lan, khong_gioi_han, don_gia, thu_tu
)
SELECT
  c.id,
  dv.id,
  cs.ten_dich_vu,
  cs.so_lan,
  cs.khong_gioi_han,
  cs.don_gia,
  cs.thu_tu
FROM combo_service cs
JOIN combo_lieu_trinh c ON c.ma_combo = cs.ma_combo
LEFT JOIN LATERAL (
  SELECT id
  FROM dich_vu
  WHERE is_active = true
    AND (
      hsms_norm_text(ten) = hsms_norm_text(cs.ten_dich_vu)
      OR hsms_norm_text(ten) LIKE hsms_norm_text(cs.ten_dich_vu) || '%'
      OR hsms_norm_text(cs.ten_dich_vu) LIKE hsms_norm_text(ten) || '%'
    )
  ORDER BY length(ten) DESC
  LIMIT 1
) dv ON true
ON CONFLICT (combo_id, ten_dich_vu) DO UPDATE SET
  dich_vu_id = EXCLUDED.dich_vu_id,
  so_lan = EXCLUDED.so_lan,
  khong_gioi_han = EXCLUDED.khong_gioi_han,
  don_gia = EXCLUDED.don_gia;

WITH candidates AS (
  SELECT
    t.id AS the_lieu_trinh_id,
    t.khach_hang_id,
    t.ten_dich_vu AS ten_the_cu,
    t.so_buoi_tong,
    t.so_buoi_da_dung,
    t.gia_tri_the,
    t.ngay_mua,
    t.ngay_het_han,
    t.trang_thai,
    c.id AS combo_id,
    c.ten_combo,
    c.gia_ban,
    c.thoi_han_so,
    cdv.so_lan,
    cdv.khong_gioi_han,
    cdv.ten_dich_vu AS ten_dich_vu_combo,
    CASE
      WHEN hsms_norm_text(t.ten_dich_vu) LIKE '%' || hsms_norm_text(cdv.ten_dich_vu) || '%'
        AND hsms_norm_text(t.ten_dich_vu) LIKE '%bao hanh%'
        THEN 'match ten dich vu + bao hanh khong dau'
      WHEN hsms_norm_text(t.ten_dich_vu) LIKE '%' || hsms_norm_text(cdv.ten_dich_vu) || '%'
        AND hsms_norm_text(t.ten_dich_vu) LIKE '%bao hanh%'
        THEN 'match ten dich vu + bao hanh co dau'
      WHEN t.gia_tri_the = c.gia_ban
        AND t.so_buoi_tong = cdv.so_lan
        AND hsms_norm_text(t.ten_dich_vu) LIKE '%' || hsms_norm_text(cdv.ten_dich_vu) || '%'
        THEN 'match ten dich vu + gia + so lan'
      ELSE 'match ten dich vu'
    END AS ly_do
  FROM the_lieu_trinh t
  JOIN combo_lieu_trinh c ON c.source = 'myspa_import'
  JOIN combo_lieu_trinh_dich_vu cdv ON cdv.combo_id = c.id
  WHERE t.combo_id IS NULL
    AND t.ten_dich_vu IS NOT NULL
    AND hsms_norm_text(t.ten_dich_vu) LIKE '%' || hsms_norm_text(cdv.ten_dich_vu) || '%'
    AND (
      hsms_norm_text(t.ten_dich_vu) LIKE '%bao hanh%'
      OR t.so_buoi_tong = cdv.so_lan
      OR t.gia_tri_the = c.gia_ban
    )
    AND (
      (c.thoi_han_so = 1 AND (
        hsms_norm_text(t.ten_dich_vu) LIKE '%1 nam%'
        OR t.so_buoi_tong = 24
      ))
      OR
      (c.thoi_han_so = 3 AND (
        hsms_norm_text(t.ten_dich_vu) LIKE '%3 nam%'
        OR t.so_buoi_tong = 72
      ))
    )
),
ranked AS (
  SELECT *,
    row_number() OVER (
      PARTITION BY the_lieu_trinh_id
      ORDER BY
        CASE WHEN gia_tri_the = gia_ban THEN 0 ELSE 1 END,
        CASE WHEN so_buoi_tong = so_lan THEN 0 ELSE 1 END,
        length(ten_dich_vu_combo) DESC
    ) AS rn
  FROM candidates
),
matched AS (
  SELECT * FROM ranked WHERE rn = 1
),
log_insert AS (
  INSERT INTO combo_lieu_trinh_backfill_log (
    the_lieu_trinh_id, combo_id, khach_hang_id, ten_the_cu, ten_combo, ly_do, before_data, after_data
  )
  SELECT
    m.the_lieu_trinh_id,
    m.combo_id,
    m.khach_hang_id,
    m.ten_the_cu,
    m.ten_combo,
    m.ly_do,
    jsonb_build_object(
      'ten_dich_vu', m.ten_the_cu,
      'so_buoi_tong', m.so_buoi_tong,
      'so_buoi_da_dung', m.so_buoi_da_dung,
      'gia_tri_the', m.gia_tri_the,
      'ngay_mua', m.ngay_mua,
      'ngay_het_han', m.ngay_het_han,
      'trang_thai', m.trang_thai
    ),
    jsonb_build_object(
      'combo_id', m.combo_id,
      'ten_combo', m.ten_combo,
      'loai_the', 'combo_lieu_trinh',
      'source', 'myspa_backfill',
      'so_lan_combo', m.so_lan,
      'khong_gioi_han', m.khong_gioi_han
    )
  FROM matched m
  ON CONFLICT (the_lieu_trinh_id, combo_id) DO NOTHING
  RETURNING the_lieu_trinh_id
)
UPDATE the_lieu_trinh t
SET
  combo_id = m.combo_id,
  loai_the = 'combo_lieu_trinh',
  is_khong_gioi_han = m.khong_gioi_han,
  source = COALESCE(t.source, 'myspa_backfill'),
  gia_tri_the = CASE WHEN COALESCE(t.gia_tri_the, 0) = 0 THEN m.gia_ban ELSE t.gia_tri_the END,
  ngay_het_han = CASE
    WHEN t.ngay_het_han IS NULL AND t.ngay_mua IS NOT NULL AND m.thoi_han_so = 1 THEN (t.ngay_mua + INTERVAL '1 year')::date
    WHEN t.ngay_het_han IS NULL AND t.ngay_mua IS NOT NULL AND m.thoi_han_so = 3 THEN (t.ngay_mua + INTERVAL '3 years')::date
    ELSE t.ngay_het_han
  END,
  meta = COALESCE(t.meta, '{}'::jsonb) || jsonb_build_object(
    'combo_backfill', true,
    'combo_backfill_reason', m.ly_do,
    'combo_name', m.ten_combo
  )
FROM matched m
WHERE t.id = m.the_lieu_trinh_id;

CREATE OR REPLACE VIEW v_combo_lieu_trinh_backfill_summary AS
SELECT
  c.ma_combo,
  c.ten_combo,
  COUNT(l.id) AS so_the_da_gan,
  COUNT(DISTINCT l.khach_hang_id) AS so_khach_da_gan
FROM combo_lieu_trinh c
LEFT JOIN combo_lieu_trinh_backfill_log l ON l.combo_id = c.id
GROUP BY c.ma_combo, c.ten_combo
ORDER BY c.ma_combo;

SELECT
  'combo_lieu_trinh' AS bang,
  COUNT(*) AS tong
FROM combo_lieu_trinh
UNION ALL
SELECT
  'combo_lieu_trinh_dich_vu',
  COUNT(*)
FROM combo_lieu_trinh_dich_vu
UNION ALL
SELECT
  'the_lieu_trinh_da_gan_combo',
  COUNT(*)
FROM the_lieu_trinh
WHERE combo_id IS NOT NULL;
