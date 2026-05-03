import os

REPLACEMENTS =[
    {
        "file": "src/apps/checkin/CheckinDangKyOff.jsx",
        "find": """            {(() => {
              const info = getNgayInfo(showInfo)
              return (
                <>
                  <div style={{ fontWeight:'800', fontSize:'16px', color:COLORS.text, marginBottom:'4px' }}>
                    📅 {fmt(showInfo)}
                  </div>
                  <div style={{ fontSize:'12px', color:COLORS.textMute, marginBottom:'16px' }}>
                    {nhanVien.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'} — Giới hạn: {gioiHan} người/ngày
                  </div>

                  {info.others.length === 0 ? (""",
        "replace": """            {(() => {
              const info = getNgayInfo(showInfo)
              const[y, m, d_val] = showInfo.split('-')
              const isWeekendPopup = new Date(y, m-1, d_val).getDay() === 0 || new Date(y, m-1, d_val).getDay() === 6

              return (
                <>
                  <div style={{ fontWeight:'800', fontSize:'16px', color:COLORS.text, marginBottom:'4px' }}>
                    📅 {fmt(showInfo)} {isWeekendPopup && <span style={{color: '#C0392B', fontSize: '13px', marginLeft: '6px'}}>(Cuối tuần)</span>}
                  </div>
                  <div style={{ fontSize:'12px', color:COLORS.textMute, marginBottom:'16px' }}>
                    {nhanVien.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV'} — Giới hạn: {gioiHan} người/ngày
                  </div>

                  {isWeekendPopup && (
                    <div style={{ background:'#FEF2F2', border:'1px dashed #FECACA', borderRadius:'12px', padding:'12px', textAlign:'center', color:'#C0392B', fontWeight:'700', marginBottom:'16px', fontSize:'13px', lineHeight:'1.4' }}>
                      ⚠️ Lưu ý: Đây là ngày T7/CN.<br/>Nếu bạn OFF sẽ bị trừ x2 ngày công!
                    </div>
                  )}

                  {info.others.length === 0 ? (""",
        "desc": "1. Thêm cảnh báo x2 ngày công vào Popup thông tin"
    },
    {
        "file": "src/apps/checkin/CheckinDangKyOff.jsx",
        "find": """            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {LOAI_OFF.map(item => (
                <button key={item.value} onClick={() => setLoaiOff(item.value)}
                  style={{ padding:'12px 16px', borderRadius:'12px', border:`2px solid ${loaiOff===item.value ? COLORS.primary : COLORS.border}`, background:loaiOff===item.value ? item.color : COLORS.card, cursor:'pointer', textAlign:'left', transition:'all 0.2s' }}>
                  <div style={{ fontWeight:'700', fontSize:'13px', color:loaiOff===item.value ? COLORS.primary : COLORS.text }}>{item.label}</div>
                  <div style={{ fontSize:'11px', color:COLORS.textMute, marginTop:'2px' }}>{item.desc}</div>
                </button>
              ))}
            </div>""",
        "replace": """            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {LOAI_OFF.map(item => {
                let isWeOff = false;
                if (ngayOff) {
                  const [y, m, d_val] = ngayOff.split('-');
                  const d = new Date(y, m-1, d_val).getDay();
                  isWeOff = (d === 0 || d === 6);
                }
                const isDisabled = isWeOff && item.value !== 'off_t7';

                return (
                  <button key={item.value} onClick={() => !isDisabled && setLoaiOff(item.value)}
                    disabled={isDisabled}
                    style={{ padding:'12px 16px', borderRadius:'12px', border:`2px solid ${loaiOff===item.value ? COLORS.primary : COLORS.border}`, background: isDisabled ? '#F9FAFB' : (loaiOff===item.value ? item.color : COLORS.card), cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.45 : 1, textAlign:'left', transition:'all 0.2s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontWeight:'700', fontSize:'13px', color: isDisabled ? COLORS.textMute : (loaiOff===item.value ? COLORS.primary : COLORS.text) }}>
                        {item.label}
                      </div>
                      {isDisabled && <span style={{ fontSize:'12px' }}>🔒</span>}
                    </div>
                    <div style={{ fontSize:'11px', color:COLORS.textMute, marginTop:'2px' }}>
                      {isDisabled ? 'Hệ thống đã khóa do bạn chọn T7/CN' : item.desc}
                    </div>
                  </button>
                )
              })}
            </div>""",
        "desc": "2. Khóa các tuỳ chọn OFF khác nếu là ngày cuối tuần"
    }
]

# ══════════════════════════════════════════════════════
# ENGINE CHUẨN — KHÔNG BAO GIỜ CHỈNH SỬA
# ══════════════════════════════════════════════════════
def doi_soat(filepath, find_text):
    fp = filepath.replace("/", os.sep)
    if not os.path.exists(fp):
        return ["   ❌ File không tồn tại"]
    with open(fp, "r", encoding="utf-8") as f:
        content = f.read()
        lines   = content.split('\n')
    reports =[]
    first_line = find_text.strip().split('\n')[0].strip()
    matches =[]
    for i, line in enumerate(lines):
        if first_line[:25] in line or line.strip()[:25] in first_line[:25]:
            matches.append((i+1, line))
    if not matches:
        reports.append(f"   → Không tìm thấy: '{first_line[:60]}'")
        return reports
    for line_num, _ in matches[:1]:
        start = max(0, line_num - 2)
        end   = min(len(lines), line_num + 5)
        reports.append(f"   → Nội dung thực tế (dòng {start+1}-{end}):")
        for i in range(start, end):
            marker = ">>>" if i == line_num - 1 else "   "
            reports.append(f"      {marker} {i+1}: {lines[i]}")
    return reports

def run():
    success = 0
    failed  = 0
    skipped = 0
    print(f"\n{'═'*55}")
    print(f"  HSMS FIX-CODE — {len(REPLACEMENTS)} thay thế")
    print(f"{'═'*55}\n")
    for idx, item in enumerate(REPLACEMENTS, 1):
        filepath = item["file"].replace("/", os.sep)
        desc     = item["desc"]
        print(f"[{idx}/{len(REPLACEMENTS)}] {desc}")
        if not os.path.exists(filepath):
            print(f"   ❌ File không tồn tại: {filepath}\n")
            failed += 1
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        if item["replace"] and item["replace"] in content:
            print(f"   ⏭️  Đã thay trước đó — bỏ qua\n")
            skipped += 1
            continue
        if item["find"] not in content:
            print(f"   ⚠️  Không tìm thấy!")
            for r in doi_soat(filepath, item["find"]):
                print(r)
            print()
            failed += 1
            continue
        new_content = content.replace(item["find"], item["replace"], 1)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"   ✅ Thành công!\n")
        success += 1
    print(f"{'═'*55}")
    print(f"  KẾT QUẢ:")
    print(f"  ✅ Thành công : {success}")
    print(f"  ⏭️  Bỏ qua    : {skipped}")
    print(f"  ❌ Thất bại   : {failed}")
    print(f"{'═'*55}")
    if failed > 0:
        print("  ⚠️  Có lỗi — xem chi tiết!\n")
    else:
        print("  🎉 Tất cả hoàn thành!\n")

if __name__ == "__main__":
    run()