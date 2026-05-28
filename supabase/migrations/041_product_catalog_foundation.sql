-- Migration 041: Product catalog foundation for MySpa sync
-- Adds optional MySpa-like product fields without touching POS order/cashbook data.

ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS nhan_hieu text;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS danh_muc text;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS chi_nhanh text DEFAULT 'Hannah Spa';
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS gia_uu_dai integer DEFAULT 0;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS gia_uu_dai_ecommerce integer DEFAULT 0;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS hien_tren_pos boolean DEFAULT true;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS hoa_hong_kieu text DEFAULT 'none'
  CHECK (hoa_hong_kieu IN ('none', 'percent', 'fixed'));
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS ti_le_hoa_hong numeric DEFAULT 0;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS tien_hoa_hong integer DEFAULT 0;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS myspa_product_id text;
ALTER TABLE kho_san_pham ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_kho_sp_sku ON kho_san_pham(sku);
CREATE INDEX IF NOT EXISTS idx_kho_sp_barcode ON kho_san_pham(barcode);
CREATE INDEX IF NOT EXISTS idx_kho_sp_danh_muc ON kho_san_pham(danh_muc);
CREATE INDEX IF NOT EXISTS idx_kho_sp_hien_pos ON kho_san_pham(hien_tren_pos);
CREATE INDEX IF NOT EXISTS idx_kho_sp_created_desc ON kho_san_pham(created_at DESC);

CREATE OR REPLACE FUNCTION touch_kho_san_pham_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kho_san_pham_updated_at ON kho_san_pham;
CREATE TRIGGER trg_kho_san_pham_updated_at
BEFORE UPDATE ON kho_san_pham
FOR EACH ROW
EXECUTE FUNCTION touch_kho_san_pham_updated_at();
