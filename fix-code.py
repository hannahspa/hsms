import os

REPLACEMENTS = [
    {
        "file": "src/apps/checkin/CheckinLich.jsx",
        "find": """const LOAI_CONFIG = {
  di_lam:   { bg:'#DCFCE7', color:'#166534', icon:'✅' },
  off_phep: { bg:'#DBEAFE', color:'#1E40AF', icon:'💙' },
  off_ov:   { bg:'#FEE2E2', color:'#991B1B', icon:'🚫' },
  off_t7:   { bg:'#F3E8FF', color:'#6B21A8', icon:'🟣' },
  off_t7x:  { bg:'#FEE2E2', color:'#991B1B', icon:'❌' },
}""",
        "replace": """const LOAI_CONFIG = {
  di_lam:   { bg:'#F5EDE6', color:'#7D5A3C', icon:'✅' },
  off_phep: { bg:'#FDF6EE', color:'#A0714F', icon:'🌸' },
  off_ov:   { bg:'#FEF2F2', color:'#C0392B', icon:'🚫' },
  off_t7:   { bg:'#FAF0E6', color:'#8B6914', icon:'🌙' },
  off_t7x:  { bg:'#FEE2E2', color:'#991B1B', icon:'❌' },
}""",
        "desc": "Tone màu Hannah Luxury cho LOAI_CONFIG"
    },
    {
        "file": "src/apps/checkin/CheckinLich.jsx",
        "find": """    if (pct === 0) {
      bg = '#FEE2E2'; color = '#991B1B'; border = '1px solid #FCA5A5'
      label = '⚠️'; subLabel = '0%'
    } else if (pct >= 100 && treLate === 0 && veSomPhut === 0) {
      bg = '#DCFCE7'; color = '#166534'; border = '1px solid #BBF7D0'
      label = '✅'; subLabel = ''
    } else if (pct >= 100) {
      bg = '#FEF9E7'; color = '#8B6914'; border = '1px solid #FDE68A'
      label = '✅'
      subLabel = treLate > 0 ? `+${treLate}p` : `-${veSomPhut}p`
    } else if (pct >= 75) {
      bg = '#FEF9E7'; color = '#8B6914'; border = '1px solid #FDE68A'
      label = `${pct}%`
      subLabel = treLate > 0 ? `+${treLate}p` : veSomPhut > 0 ? `-${veSomPhut}p` : ''
    } else if (pct >= 50) {
      bg = '#FEF2F2'; color = '#C0392B'; border = '1px solid #FECACA'
      label = `${pct}%`
      subLabel = treLate > 0 ? `+${treLate}p` : veSomPhut > 0 ? `-${veSomPhut}p` : ''
    } else {
      bg = '#FEE2E2'; color = '#991B1B'; border = '1px solid #FCA5A5'
      label = `${pct}%`; subLabel = '⚠️'
    }""",
        "replace": """    if (pct === 0) {
      bg = '#FEF2F2'; color = '#C0392B'; border = '1px solid #FECACA'
      label = '⚠️'; subLabel = '0%'
    } else if (pct >= 100 && treLate === 0 && veSomPhut === 0) {
      bg = '#F5EDE6'; color = '#7D5A3C'; border = '1px solid #C4956A'
      label = '✅'; subLabel = ''
    } else if (pct >= 100) {
      bg = '#FDF6EE'; color = '#A0714F'; border = '1px solid #C9A96E'
      label = '✅'
      subLabel = treLate > 0 ? `+${treLate}p` : `-${veSomPhut}p`
    } else if (pct >= 75) {
      bg = '#FDF6EE'; color = '#A0714F'; border = '1px solid #C9A96E'
      label = `${pct}%`
      subLabel = treLate > 0 ? `+${treLate}p` : veSomPhut > 0 ? `-${veSomPhut}p` : ''
    } else if (pct >= 50) {
      bg = '#FEF9F0'; color = '#8B5E3C'; border = '1px solid #E8C4A0'
      label = `${pct}%`
      subLabel = treLate > 0 ? `+${treLate}p` : veSomPhut > 0 ? `-${veSomPhut}p` : ''
    } else {
      bg = '#FEF2F2'; color = '#C0392B'; border = '1px solid #FECACA'
      label = `${pct}%`; subLabel = '⚠️'
    }""",
        "desc": "Tone màu Hannah Luxury cho ngày đi làm"
    },
    {
        "file": "src/apps/checkin/CheckinLich.jsx",
        "find": """          {[
            { label:'Ngày Công', value: tongKet.ngayCong.toFixed(1), color:COLORS.thu, bg:'#F0FDF4', icon:'📅' },
            { label:'Tăng Ca',   value: `${tongKet.tangCa}h`,        color:'#8B6914',  bg:'#FEF9E7', icon:'⏰' },
            { label:'Vi Phạm',   value: tongKet.viPham, color: tongKet.viPham > 0 ? COLORS.chi : COLORS.textMute, bg: tongKet.viPham > 0 ? '#FEF2F2' : '#F8F3F0', icon:'⚠️' },
          ].map(item => (""",
        "replace": """          {[
            { label:'Ngày Công', value: tongKet.ngayCong.toFixed(1), color:'#7D5A3C', bg:'#F5EDE6', icon:'📅' },
            { label:'Tăng Ca',   value: `${tongKet.tangCa}h`,        color:'#A0714F', bg:'#FDF6EE', icon:'⏰' },
            { label:'Vi Phạm',   value: tongKet.viPham, color: tongKet.viPham > 0 ? '#C0392B' : COLORS.textMute, bg: tongKet.viPham > 0 ? '#FEF2F2' : '#FAF7F4', icon:'⚠️' },
          ].map(item => (""",
        "desc": "Tone màu Hannah Luxury cho hàng tổng kết 1"
    },
    {
        "file": "src/apps/checkin/CheckinLich.jsx",
        "find": """          {[
            { label:'OFF Có Lương',    value: tongKet.offPhep, color:'#1E40AF', bg:'#DBEAFE', icon:'💙' },
            { label:'OFF Không Lương', value: tongKet.offOV,   color:'#991B1B', bg:'#FEE2E2', icon:'🚫' },
            { label:'OFF T7/CN (x2)',  value: tongKet.offT7,   color:'#6B21A8', bg:'#F3E8FF', icon:'🟣' },
          ].map(item => (""",
        "replace": """          {[
            { label:'OFF Có Lương',    value: tongKet.offPhep, color:'#A0714F', bg:'#FDF6EE', icon:'🌸' },
            { label:'OFF Không Lương', value: tongKet.offOV,   color:'#C0392B', bg:'#FEF2F2', icon:'🚫' },
            { label:'OFF T7/CN (x2)',  value: tongKet.offT7,   color:'#8B6914', bg:'#FFF8ED', icon:'🌙' },
          ].map(item => (""",
        "desc": "Tone màu Hannah Luxury cho hàng tổng kết 2"
    },
    {
        "file": "src/apps/checkin/CheckinLich.jsx",
        "find": """            {[
              { icon:'✅', bg:'#DCFCE7', color:'#166534', text:'Đúng giờ 100%' },
              { icon:'⚠️', bg:'#FEF9E7', color:'#8B6914', text:'Trễ / về sớm' },
              { icon:'💙', bg:'#DBEAFE', color:'#1E40AF', text:'OFF Có Lương' },
              { icon:'🚫', bg:'#FEE2E2', color:'#991B1B', text:'OFF Không Lương' },
              { icon:'🟣', bg:'#F3E8FF', color:'#6B21A8', text:'OFF T7/CN (x2)' },
              { icon:'⏳', bg:'#FFF9F0', color:'#8B6914', text:'Chờ duyệt' },
              { icon:'🕐', bg:'#FFF9F0', color:'#8B6914', text:'Đang làm việc' },
              { icon:'❓', bg:'#FEF2F2', color:'#991B1B', text:'Chưa có data' },
            ].map((item, i) => (""",
        "replace": """            {[
              { icon:'✅', bg:'#F5EDE6', color:'#7D5A3C', text:'Đúng giờ 100%' },
              { icon:'⚠️', bg:'#FDF6EE', color:'#A0714F', text:'Trễ / về sớm' },
              { icon:'🌸', bg:'#FDF6EE', color:'#A0714F', text:'OFF Có Lương' },
              { icon:'🚫', bg:'#FEF2F2', color:'#C0392B', text:'OFF Không Lương' },
              { icon:'🌙', bg:'#FFF8ED', color:'#8B6914', text:'OFF T7/CN (x2)' },
              { icon:'⏳', bg:'#FFF8ED', color:'#8B6914', text:'Chờ duyệt' },
              { icon:'🕐', bg:'#FDF6EE', color:'#A0714F', text:'Đang làm việc' },
              { icon:'❓', bg:'#FEF2F2', color:'#C0392B', text:'Chưa có data' },
            ].map((item, i) => (""",
        "desc": "Tone màu Hannah Luxury cho chú thích"
    },
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
    reports = []
    first_line = find_text.strip().split('\n')[0].strip()
    matches = []
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