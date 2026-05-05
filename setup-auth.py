"""
setup-auth.py - Tao tai khoan Supabase Auth cho Hannah Spa
Chay: python setup-auth.py
"""

import os
import sys
import json
import requests

# Fix encoding cho Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ──────────────────────────────────────────────
# LOAD .env.import
# ──────────────────────────────────────────────
env = {}
env_path = '.env.import'
if not os.path.exists(env_path):
    print(f"❌ Không tìm thấy {env_path}")
    exit(1)

with open(env_path, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

SUPABASE_URL = env.get('SUPABASE_URL', '')
SERVICE_KEY  = env.get('SUPABASE_KEY', '')

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong .env.import")
    exit(1)

HEADERS = {
    'apikey':        SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type':  'application/json',
}

print(f"\n{'='*55}")
print("  SETUP AUTH — HANNAH SPA MANAGEMENT SYSTEM")
print(f"{'='*55}")
print(f"  URL: {SUPABASE_URL}\n")


# ──────────────────────────────────────────────
# BƯỚC 1: TẠO SQL TRIGGER (profiles tự động)
# ──────────────────────────────────────────────
TRIGGER_SQL = """
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, ho_ten, email, vai_tro, trang_thai)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'ho_ten', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'vai_tro', 'le_tan'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    ho_ten    = EXCLUDED.ho_ten,
    email     = EXCLUDED.email,
    vai_tro   = EXCLUDED.vai_tro,
    trang_thai = EXCLUDED.trang_thai;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
"""

def run_sql(sql, label='SQL'):
    """Chạy SQL qua Supabase REST rpc hoặc pg meta — dùng Edge Function nếu cần"""
    # Supabase không expose raw SQL qua REST — dùng pg meta (nếu có) hoặc báo thủ công
    return None  # Xử lý thủ công bên dưới

print("━━━ BƯỚC 1: SQL TRIGGER ━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("⚠️  Copy SQL sau vào Supabase Dashboard → SQL Editor → Run:")
print()
print(TRIGGER_SQL)
print("━" * 55)
input("  Nhấn ENTER sau khi đã chạy SQL trigger xong...")


# ──────────────────────────────────────────────
# BƯỚC 2: LẤY DỮ LIỆU LỄ TÂN TỪ NHAN_VIEN
# ──────────────────────────────────────────────
print("\n━━━ BƯỚC 2: LẤY DANH SÁCH LỄ TÂN ━━━━━━━━━━━━━━━━━")

r = requests.get(
    f"{SUPABASE_URL}/rest/v1/nhan_vien",
    params={'vi_tri': 'eq.le_tan', 'trang_thai': 'neq.nghi_viec',
            'select': 'id,ho_ten,so_dien_thoai'},
    headers=HEADERS
)

le_tan_list = r.json() if r.status_code == 200 else []
if not le_tan_list:
    print("  ⚠️  Không tìm thấy lễ tân trong DB — kiểm tra bảng nhan_vien")
else:
    for nv in le_tan_list:
        print(f"  👤 {nv['ho_ten']} — SĐT: {nv.get('so_dien_thoai','(trống)')}")


# ──────────────────────────────────────────────
# DANH SÁCH USER SẼ TẠO
# ──────────────────────────────────────────────
# Admin dùng email thật, lễ tân dùng SĐT@hannahspa.vn
DEFAULT_PASSWORD_ADMIN  = 'HannahAdmin@2026'
DEFAULT_PASSWORD_LETHAN = 'Hannah@2026'

USERS_TO_CREATE = [
    {
        'email':   'quocnam2201@gmail.com',
        'password': DEFAULT_PASSWORD_ADMIN,
        'ho_ten':  'Cao Quốc Nam',
        'vai_tro': 'admin',
        'sdt':     '',
    }
]

for nv in le_tan_list:
    sdt = (nv.get('so_dien_thoai') or '').strip()
    if not sdt:
        print(f"  ⚠️  {nv['ho_ten']} chưa có SĐT — bỏ qua, thêm thủ công sau")
        continue
    # Supabase API từ chối email bắt đầu bằng số → thêm prefix nv
    USERS_TO_CREATE.append({
        'email':   f"nv{sdt}@hannahspa.vn",
        'password': DEFAULT_PASSWORD_LETHAN,
        'ho_ten':  nv['ho_ten'],
        'vai_tro': 'le_tan',
        'sdt':     sdt,
    })

print(f"\n  Sẽ tạo {len(USERS_TO_CREATE)} tài khoản:")
for u in USERS_TO_CREATE:
    print(f"  • {u['ho_ten']} [{u['vai_tro']}] — {u['email']}")


# ──────────────────────────────────────────────
# BƯỚC 3: TẠO AUTH USERS
# ──────────────────────────────────────────────
print("\n━━━ BƯỚC 3: TẠO SUPABASE AUTH USERS ━━━━━━━━━━━━━━━")

def create_auth_user(email, password, ho_ten, vai_tro):
    """Tạo user trong Supabase Auth (Admin API)"""
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    payload = {
        'email':         email,
        'password':      password,
        'email_confirm': True,
        'user_metadata': {'ho_ten': ho_ten, 'vai_tro': vai_tro},
    }
    r = requests.post(url, json=payload, headers=HEADERS)
    data = r.json()

    if r.status_code in (200, 201):
        print(f"  ✅ {ho_ten} ({email}) — ID: {data['id'][:8]}...")
        return data['id']
    elif 'already been registered' in str(data) or 'already exists' in str(data):
        # User đã tồn tại → lấy ID
        print(f"  ℹ️  {ho_ten} ({email}) — đã tồn tại, bỏ qua")
        return None
    else:
        print(f"  ❌ Lỗi tạo {email}: {data}")
        return None

created_ids = []
for u in USERS_TO_CREATE:
    uid = create_auth_user(u['email'], u['password'], u['ho_ten'], u['vai_tro'])
    if uid:
        created_ids.append({'id': uid, **u})


# ──────────────────────────────────────────────
# BƯỚC 4: UPSERT PROFILES (an toàn kể cả khi trigger đã chạy)
# ──────────────────────────────────────────────
print("\n━━━ BƯỚC 4: UPSERT PROFILES ━━━━━━━━━━━━━━━━━━━━━━━")

def upsert_profile(uid, ho_ten, email, vai_tro, so_dien_thoai=''):
    url = f"{SUPABASE_URL}/rest/v1/profiles"
    payload = {
        'id':             uid,
        'ho_ten':         ho_ten,
        'email':          email,
        'vai_tro':        vai_tro,
        'so_dien_thoai':  so_dien_thoai,
        'trang_thai':     'active',
    }
    headers = {**HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal'}
    r = requests.post(url, json=payload, headers=headers)
    if r.status_code in (200, 201):
        print(f"  ✅ Profile: {ho_ten} [{vai_tro}]")
    else:
        print(f"  ❌ Lỗi profile {ho_ten}: {r.text}")

for u in created_ids:
    upsert_profile(u['id'], u['ho_ten'], u['email'], u['vai_tro'], u.get('sdt',''))


# ──────────────────────────────────────────────
# KẾT QUẢ
# ──────────────────────────────────────────────
print(f"\n{'='*55}")
print("  🎉 SETUP AUTH HOÀN TẤT!")
print(f"{'='*55}")
print()
print("  THÔNG TIN ĐĂNG NHẬP:")
print()
print(f"  👑 Admin (anh Nam):")
print(f"     URL:       /admin")
print(f"     Email:     quocnam2201@gmail.com")
print(f"     Mật khẩu: {DEFAULT_PASSWORD_ADMIN}")
print()
print(f"  💁 Lễ Tân:")
for u in USERS_TO_CREATE:
    if u['vai_tro'] == 'le_tan':
        login_hint = u['sdt'] if u['sdt'] else u['email']
        print(f"     {u['ho_ten']}: nhập SĐT {login_hint}")
        print(f"     Mật khẩu: {DEFAULT_PASSWORD_LETHAN}")
print()
print("  ⚠️  YÊU CẦU ĐỔI MẬT KHẨU SAU KHI ĐĂNG NHẬP LẦN ĐẦU!")
print()
print("  📝 GHI NHỚ:")
print("  - KTV/Tạp Vụ dùng /checkin (PIN), KHÔNG dùng /app")
print("  - Admin có thể đăng nhập bằng email thật")
print("     hoặc thêm SĐT@hannahspa.vn như lễ tân")
print(f"{'='*55}\n")
