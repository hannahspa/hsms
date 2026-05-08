-- Migration 001: Hash PIN từ plaintext sang SHA-256
-- Ngày: 08/05/2026
-- Mô tả: Thêm cột pin_hash, hash tất cả PIN hiện có, xoá cột pin cũ

-- Bước 1: Thêm cột pin_hash (nếu chưa có)
ALTER TABLE nhan_vien ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Bước 2: Hash tất cả PIN hiện có từ cột pin sang pin_hash
-- Dùng pgcrypto extension (đã có sẵn trong Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE nhan_vien
SET pin_hash = encode(digest(pin, 'sha256'), 'hex')
WHERE pin IS NOT NULL AND pin != '' AND pin_hash IS NULL;

-- Bước 3: Đặt pin_hash mặc định cho NV chưa có PIN (dùng '1234' làm mặc định)
UPDATE nhan_vien
SET pin_hash = encode(digest('1234', 'sha256'), 'hex')
WHERE pin_hash IS NULL;

-- Bước 4: Xoá cột pin cũ
-- GIỮ LẠI cột pin tạm thời để rollback nếu cần. Sẽ xoá sau khi verify.
-- ALTER TABLE nhan_vien DROP COLUMN IF EXISTS pin;

-- Verify
-- SELECT id, ho_ten, length(pin_hash) as hash_len FROM nhan_vien;
