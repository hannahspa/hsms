// In hóa đơn nhiệt khổ 80mm qua window.print() của trình duyệt.
// Không cần phần mềm ngoài. Để in im lặng (không hộp thoại): chạy Chrome
// với cờ --kiosk-printing + đặt máy in nhiệt làm máy in mặc định.

const SPA = {
  ten: 'Hannah Beauty & Spa',
  diaChi: '39 Nam Kỳ Khởi Nghĩa, Ninh Kiều, TP. Cần Thơ',
  dienThoai: '0379080909',
  website: 'hannahspa.vn',
  logo: '/logo.png',
}

const PTTT_LABEL = {
  tien_mat: 'Tiền Mặt',
  chuyen_khoan: 'Khách Hàng Chuyển Khoản',
  quet_the: 'Khách Quẹt Thẻ',
  the_tra_truoc: 'Thẻ Trả Trước',
  the_lieu_trinh: 'Thẻ Liệu Trình',
}

const fmt = n => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0))
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function dt(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) } catch { return '' }
}

// data: { order, items, payments, customer, thuNgan }
export function printReceipt({ order, items = [], payments = [], customer = null, thuNgan = '', spa = SPA }) {
  const tamTinh = items.reduce((s, it) => s + (it.don_gia || 0) * (it.so_luong || 1), 0)
  const giamGia = order?.giam_gia || 0
  const vat = order?.vat || 0
  const tongCong = order?.thuc_thu ?? (tamTinh - giamGia + vat)
  const daThu = payments.reduce((s, p) => s + (p.so_tien || 0), 0)
  const conLai = Math.max(0, tongCong - daThu)
  const giamPct = tamTinh > 0 ? Math.round(giamGia / tamTinh * 100) : 0

  const itemsRows = items.map(it => {
    const ten = it.ten || it.dich_vu?.ten || it.san_pham?.ten || it.the_lieu_trinh?.ten_dich_vu || it.meta?.tenDichVu || 'Dịch vụ'
    const sl = it.so_luong || 1
    const disc = Math.max(0, (it.don_gia || 0) * sl - (it.thanh_tien || 0))
    const nvth = it.staffName || it.nhan_vien?.ho_ten || ''
    return `
      <tr class="item">
        <td class="l">${esc(ten)}</td>
        <td class="c">${sl}</td>
        <td class="r">${disc > 0 ? fmt(disc) + 'đ' : '0đ'}</td>
        <td class="r">${fmt(it.thanh_tien || 0)}</td>
      </tr>
      <tr class="sub"><td colspan="4">${fmt(it.don_gia || 0)}${nvth ? ` · NVTH: ${esc(nvth)}` : ''}</td></tr>`
  }).join('')

  const payRows = payments.map(p => `
      <tr><td class="l">${esc(PTTT_LABEL[p.hinh_thuc] || p.hinh_thuc)}</td><td class="r">${fmt(p.so_tien)}</td></tr>`).join('')

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hóa đơn ${esc(order?.ma_don || '')}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { width: 100%; padding: 2.5mm 2.5mm; font-family: Arial, 'Segoe UI', Roboto, sans-serif; color: #000; font-size: 12px; line-height: 1.32; font-weight: 600; }
    .center { text-align: center; }
    .b { font-weight: 800; }
    .logo { width: auto; max-width: 58%; height: auto; max-height: 58px; margin: 0 auto 4px; display: block; filter: brightness(0); }
    .spa-name { font-size: 15px; font-weight: 800; }
    .small { font-size: 11.5px; }
    .title { font-size: 16px; font-weight: 800; margin: 5px 0 2px; }
    .hr { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 1px 0; }
    .l { text-align: left; } .c { text-align: center; } .r { text-align: right; }
    /* Bảng dịch vụ — cố định độ rộng cột để phân bố đều */
    table.items { table-layout: fixed; }
    table.items .l { word-break: break-word; padding-right: 4px; }
    table.items td.c, table.items td.r { padding-left: 5px; }
    table.items thead td { font-weight: 800; border-bottom: 1px solid #000; padding-bottom: 3px; }
    /* Bảng 2 cột (tổng tiền, thanh toán) — nhãn trái, số phải */
    table.kv td.l { width: 64%; }
    table.kv td.r { width: 36%; white-space: nowrap; }
    tr.item td { padding-top: 3px; }
    tr.sub td { font-size: 11px; color: #000; font-weight: 500; padding-bottom: 2px; }
    .tot td { font-weight: 800; font-size: 13.5px; }
    .info td { padding: 1px 0; }
    .sign { display: flex; justify-content: space-between; margin-top: 14px; font-size: 11px; }
    .sign div { text-align: center; width: 48%; }
  </style></head>
  <body>
    <div class="center">
      <img class="logo" src="${spa.logo}" onerror="this.style.display='none'"/>
      <div class="small">${esc(spa.diaChi)}</div>
      <div class="small">Điện thoại: ${esc(spa.dienThoai)}</div>
      <div class="small">Website: ${esc(spa.website)}</div>
      <div class="title">HÓA ĐƠN BÁN HÀNG</div>
      <div class="small">Ngày in: ${dt(new Date().toISOString())}</div>
      <div class="small">Mã ĐH: ${esc(order?.ma_don || '')} — Ngày: ${dt(order?.created_at)}</div>
    </div>

    <div class="hr"></div>
    <table class="info">
      <tr><td class="l">KH: ${esc(customer?.ho_ten || 'Khách lẻ')}</td></tr>
      ${customer?.ma_kh ? `<tr><td class="l">${esc(customer.ma_kh)}</td></tr>` : ''}
      ${customer?.so_dien_thoai ? `<tr><td class="l">SĐT: ${esc(customer.so_dien_thoai)}</td></tr>` : ''}
    </table>

    <div class="hr"></div>
    <table class="items">
      <colgroup><col style="width:44%"><col style="width:10%"><col style="width:22%"><col style="width:24%"></colgroup>
      <thead><tr><td class="l">DV/SP</td><td class="c">SL</td><td class="r">Giảm</td><td class="r">Thành tiền</td></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="hr"></div>
    <table class="kv">
      <tr><td class="l">Tạm tính</td><td class="r">${fmt(tamTinh)}</td></tr>
      <tr><td class="l">Giảm giá dịch vụ (-${giamPct}%)</td><td class="r">${giamGia > 0 ? '-' + fmt(giamGia) : '0'}</td></tr>
      <tr><td class="l">VAT</td><td class="r">${vat > 0 ? fmt(vat) : '0'}</td></tr>
      <tr class="tot"><td class="l">Tổng cộng</td><td class="r">${fmt(tongCong)}</td></tr>
    </table>

    <div class="hr"></div>
    <table class="kv">
      <tr><td class="l b">Phương thức thanh toán</td><td></td></tr>
      ${payRows || '<tr><td class="l">Chưa thanh toán</td><td class="r">0</td></tr>'}
      <tr class="tot"><td class="l">Còn lại</td><td class="r">${fmt(conLai)}</td></tr>
    </table>

    ${order?.ghi_chu ? `<div class="hr"></div><div class="small"><b>Ghi chú:</b> ${esc(order.ghi_chu)}</div>` : ''}

    <div class="hr"></div>
    <div class="sign">
      <div>Chữ ký KH</div>
      <div>Thu ngân<br>${esc(thuNgan || '')}</div>
    </div>
    <div class="center small" style="margin-top:10px">Cảm ơn quý khách & hẹn gặp lại!</div>
  </body></html>`

  // In qua iframe ẩn (không bị popup blocker)
  let iframe = document.getElementById('hsms-print-receipt')
  if (iframe) iframe.remove()
  iframe = document.createElement('iframe')
  iframe.id = 'hsms-print-receipt'
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html); doc.close()
  iframe.contentWindow.focus()
  setTimeout(() => { try { iframe.contentWindow.print() } catch (e) { console.error('Print error', e) } }, 350)
}
