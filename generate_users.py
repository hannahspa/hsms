users = [
    ('Cao Quốc Nam', 'admin', '0900000000'),
    ('Nguyễn Thị Thúy Hoanh', 'ktv', '0900000001'),
    ('Nguyễn Hoàng Anh Thư', 'ktv', '0900000002'),
    ('Đỗ Thị Khánh Duy', 'le_tan', '0900000003'),
    ('Nguyễn Thị Tường Uyên', 'ktv', '0900000004'),
    ('Lê Thị Cẩm My', 'ktv', '0900000005'),
    ('Trương Thị Bé Thôn', 'ktv', '0900000006'),
    ('Lê Hoàng Phương Linh', 'ktv', '0900000007'),
    ('Hồ Ngọc Phương', 'le_tan', '0900000008'),
    ('Nguyễn Hoa Đào', 'ktv', '0900000009'),
    ('Phạm Thị Nhỏ', 'tap_vu', '0900000010'),
]

sql = 'DO $$\\nDECLARE\\n  new_id UUID;\\nBEGIN\\n'
for name, role, phone in users:
    sql += f"""
  new_id := gen_random_uuid();
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user)
  VALUES (new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '{phone}@hannahspa.vn', crypt('123456', gen_salt('bf')), now(), now(), now(), '{{"provider":"email","providers":["email"]}}', '{{"ho_ten": "{name}", "vai_tro": "{role}"}}', false);
"""

sql += 'END $$;'
print(sql)
