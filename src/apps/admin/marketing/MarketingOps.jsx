// ═══════════════════════════════════════════════════════════════════════════
// MarketingOps — 5 cụm chức năng VẬN HÀNH port từ AdminMarketingPage (bản cũ):
//   1. CampaignOpsPanel  — CRUD chiến dịch marketing (chien_dich_marketing)
//   2. LeadOpsPage       — Khách tiềm năng: thêm/bổ sung SĐT/đã liên hệ (marketing_leads)
//   3. FormDatHenLead    — ĐẶT HẸN từ lead → tạo/nối khach_hang + lich_hen
//   4. FormContentIdea   — Ý tưởng nội dung (marketing_content_calendar)
//   5. AiActionsPanel    — Duyệt/từ chối hành động AI (marketing_ai_actions)
// UI chuẩn GĐ0-B: RightPanel + DatePicker (không overlay/input date tự vẽ).
// Port 03/07/2026 — xong là xóa được AdminMarketingPage + route /ban-cu.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { todayISO, formatCurrency } from '../../../lib/utils'
import RightPanel from '../../../components/shared/RightPanel'
import DatePicker from '../../../components/shared/DatePicker'
import { notify, confirmDialog } from '../../../components/ui/notify'

// ── Hằng số dùng chung (port nguyên từ bản cũ) ───────────────────────────────
export const KENH = {
  facebook: { label: 'Facebook', icon: '📘', color: '#1877F2', bg: '#E8F0FE' },
  zalo:     { label: 'Zalo',     icon: '💬', color: '#0068FF', bg: '#E6F0FF' },
  tiktok:   { label: 'TikTok',   icon: '🎵', color: '#010101', bg: '#F0F0F0' },
  google:   { label: 'Google',   icon: '🔍', color: '#EA4335', bg: '#FDECEA' },
  in_an:    { label: 'In Ấn',    icon: '🖨️', color: '#8E44AD', bg: '#F5F0FF' },
  khac:     { label: 'Khác',     icon: '📢', color: '#7F8C8D', bg: '#F0F4F8' },
}
const CD_TRANG_THAI = {
  draft:  { label: 'Nháp',        color: '#B8A898', bg: '#F5F2EF' },
  active: { label: 'Đang chạy',   color: '#2D7A4F', bg: '#E8F5E9' },
  ended:  { label: 'Đã kết thúc', color: '#1A5276', bg: '#EBF5FB' },
}
const GIO_HEN = Array.from({ length: 40 }, (_, i) => {
  const total = 9 * 60 + 30 + i * 15
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}).filter(g => g <= '19:30')

export function intentLabel(intent) {
  const map = {
    dat_lich: 'Đặt lịch', hoi_gia: 'Hỏi giá', tu_van_da: 'Tư vấn da',
    hoi_the_lieu_trinh: 'Hỏi thẻ liệu trình', khieu_nai: 'Khiếu nại/cần xử lý',
    spam: 'Nhiễu/spam', remarketing: 'Chăm lại khách cũ', hoi_thong_tin: 'Hỏi thông tin',
    page_owned_content: 'Bài/tin của Hannah Spa',
  }
  return map[intent] || intent || 'Chưa phân loại'
}
const isActiveLead = (l) => l?.trang_thai !== 'spam' && l?.ai_intent !== 'page_owned_content'

// ── Style form ────────────────────────────────────────────────────────────────
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }
const inp = { width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--line)', fontSize: 13.5, fontFamily: 'var(--sans)', background: 'var(--surface2)', color: 'var(--ink)', boxSizing: 'border-box' }
const btnSave = (saving) => ({ width: '100%', padding: 13, background: 'linear-gradient(135deg,#C9A96E 0%,#A0714F 45%,#7D5A3C 100%)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: saving ? .7 : 1, fontFamily: 'var(--sans)' })
const errBox = { background: '#FDECEA', color: '#C0392B', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700 }
const fmtD = (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : ''

function DateField({ label, value, onChange, allowClear = false }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={{ ...inp, cursor: 'pointer', textAlign: 'left' }} onClick={() => setOpen(true)}>
          {fmtD(value) || 'Chọn ngày'}
        </button>
        {allowClear && value && (
          <button type="button" onClick={() => onChange('')} title="Bỏ ngày"
            style={{ border: '1px solid var(--line)', background: 'var(--surface2)', borderRadius: 10, padding: '0 12px', cursor: 'pointer', color: 'var(--ink3)' }}>✕</button>
        )}
      </div>
      <DatePicker open={open} selectedDate={value || todayISO()} onClose={() => setOpen(false)}
        onConfirm={(d) => { onChange(d); setOpen(false) }} />
    </div>
  )
}

// ═══════════ 1. FORM CHIẾN DỊCH (CRUD chien_dich_marketing) ═══════════════════
function FormChienDich({ initial, khuyenMaiList, onSave, onClose }) {
  const isEdit = !!initial?.id
  const [f, setF] = useState({
    ten: initial?.ten || '', kenh: initial?.kenh || 'facebook',
    ngan_sach: initial?.ngan_sach || '', ngay_bat_dau: initial?.ngay_bat_dau || todayISO(),
    ngay_ket_thuc: initial?.ngay_ket_thuc || '', trang_thai: initial?.trang_thai || 'active',
    mo_ta: initial?.mo_ta || '', khuyen_mai_id: initial?.khuyen_mai_id || '',
    so_luot_tiep_can: initial?.so_luot_tiep_can || '', so_kh_moi: initial?.so_kh_moi || '',
    doanh_thu_uoc_tinh: initial?.doanh_thu_uoc_tinh || '', ghi_chu: initial?.ghi_chu || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.ten.trim()) return setErr('Nhập tên chiến dịch')
    setSaving(true); setErr('')
    const payload = {
      ten: f.ten.trim(), kenh: f.kenh, ngan_sach: +f.ngan_sach || 0,
      ngay_bat_dau: f.ngay_bat_dau, ngay_ket_thuc: f.ngay_ket_thuc || null,
      trang_thai: f.trang_thai, mo_ta: f.mo_ta.trim(),
      khuyen_mai_id: f.khuyen_mai_id || null,
      so_luot_tiep_can: +f.so_luot_tiep_can || 0, so_kh_moi: +f.so_kh_moi || 0,
      doanh_thu_uoc_tinh: +f.doanh_thu_uoc_tinh || 0, ghi_chu: f.ghi_chu.trim(),
    }
    const { error } = isEdit
      ? await supabase.from('chien_dich_marketing').update(payload).eq('id', initial.id)
      : await supabase.from('chien_dich_marketing').insert(payload)
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  return (
    <RightPanel open onClose={onClose}
      title={isEdit ? 'Sửa chiến dịch' : 'Tạo chiến dịch'}
      subtitle="Chiến dịch marketing theo kênh"
      footer={<button onClick={handleSave} disabled={saving} style={btnSave(saving)}>{saving ? 'Đang lưu…' : (isEdit ? 'Cập nhật chiến dịch' : 'Lưu chiến dịch')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 24px' }}>
        <div>
          <label style={lbl}>Kênh marketing</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {Object.entries(KENH).map(([k, v]) => (
              <button key={k} onClick={() => set('kenh', k)}
                style={{ padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  background: f.kenh === k ? v.color : v.bg, color: f.kenh === k ? '#fff' : v.color }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={lbl}>Tên chiến dịch *</label>
          <input style={inp} value={f.ten} onChange={e => set('ten', e.target.value)} placeholder={`VD: ${KENH[f.kenh].label} Ads tháng ${new Date().getMonth() + 1}`} autoFocus />
        </div>
        <div>
          <label style={lbl}>Trạng thái</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(CD_TRANG_THAI).map(([k, v]) => (
              <button key={k} onClick={() => set('trang_thai', k)}
                style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  background: f.trang_thai === k ? v.color : v.bg, color: f.trang_thai === k ? '#fff' : v.color }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Ngân sách (đ)</label>
            <input style={inp} type="number" value={f.ngan_sach} onChange={e => set('ngan_sach', e.target.value)} placeholder="2000000" />
          </div>
          <div>
            <label style={lbl}>Link khuyến mãi</label>
            <select style={inp} value={f.khuyen_mai_id} onChange={e => set('khuyen_mai_id', e.target.value)}>
              <option value="">— Không link —</option>
              {khuyenMaiList.map(km => <option key={km.id} value={km.id}>{km.ten}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <DateField label="Ngày bắt đầu" value={f.ngay_bat_dau} onChange={v => set('ngay_bat_dau', v)} />
          <DateField label="Ngày kết thúc" value={f.ngay_ket_thuc} onChange={v => set('ngay_ket_thuc', v)} allowClear />
        </div>
        <div>
          <label style={lbl}>Mô tả / mục tiêu</label>
          <textarea style={{ ...inp, height: 60, resize: 'vertical' }} value={f.mo_ta} onChange={e => set('mo_ta', e.target.value)} placeholder="Mục tiêu, nội dung quảng cáo, đối tượng…" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Lượt tiếp cận</label>
            <input style={inp} type="number" value={f.so_luot_tiep_can} onChange={e => set('so_luot_tiep_can', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={lbl}>KH mới</label>
            <input style={inp} type="number" value={f.so_kh_moi} onChange={e => set('so_kh_moi', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={lbl}>DT ước tính (đ)</label>
            <input style={inp} type="number" value={f.doanh_thu_uoc_tinh} onChange={e => set('doanh_thu_uoc_tinh', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <label style={lbl}>Ghi chú</label>
          <input style={inp} value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} placeholder="Ghi chú nội bộ…" />
        </div>
        {err && <div style={errBox}>{err}</div>}
      </div>
    </RightPanel>
  )
}

// ═══════════ 4. FORM Ý TƯỞNG NỘI DUNG (marketing_content_calendar) ════════════
function FormContentIdea({ campaigns, khuyenMaiList, onSave, onClose }) {
  const [f, setF] = useState({ tieu_de: '', kenh: 'facebook', loai_noi_dung: 'bai_viet', chien_dich_id: '', khuyen_mai_id: '', chu_de: '', noi_dung: '', ai_prompt: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.tieu_de.trim()) return setErr('Nhập tiêu đề nội dung')
    setSaving(true); setErr('')
    const { error } = await supabase.from('marketing_content_calendar').insert({
      tieu_de: f.tieu_de.trim(), kenh: f.kenh, loai_noi_dung: f.loai_noi_dung,
      chien_dich_id: f.chien_dich_id || null, khuyen_mai_id: f.khuyen_mai_id || null,
      chu_de: f.chu_de.trim() || null, noi_dung: f.noi_dung.trim() || null,
      ai_prompt: f.ai_prompt.trim() || null, trang_thai: 'y_tuong',
    })
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  return (
    <RightPanel open onClose={onClose} title="Tạo ý tưởng nội dung" subtitle="Lịch nội dung Fanpage / kênh"
      footer={<button onClick={handleSave} disabled={saving} style={btnSave(saving)}>{saving ? 'Đang lưu…' : 'Lưu ý tưởng'}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 24px' }}>
        <div>
          <label style={lbl}>Tiêu đề *</label>
          <input style={inp} value={f.tieu_de} onChange={e => set('tieu_de', e.target.value)} placeholder="VD: Combo chăm da sau nắng tháng 7" autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Kênh</label>
            <select style={inp} value={f.kenh} onChange={e => set('kenh', e.target.value)}>
              {['facebook', 'zalo', 'tiktok', 'website', 'khac'].map(k => <option key={k} value={k}>{KENH[k]?.label || 'Khác'}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Loại nội dung</label>
            <select style={inp} value={f.loai_noi_dung} onChange={e => set('loai_noi_dung', e.target.value)}>
              <option value="bai_viet">Bài viết</option><option value="hinh_anh">Hình ảnh</option>
              <option value="video">Video</option><option value="story">Story</option>
              <option value="reel">Reel</option><option value="quang_cao">Quảng cáo</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Chiến dịch</label>
            <select style={inp} value={f.chien_dich_id} onChange={e => set('chien_dich_id', e.target.value)}>
              <option value="">— Chưa gắn —</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.ten}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Khuyến mãi</label>
            <select style={inp} value={f.khuyen_mai_id} onChange={e => set('khuyen_mai_id', e.target.value)}>
              <option value="">— Không gắn —</option>
              {khuyenMaiList.map(k => <option key={k.id} value={k.id}>{k.ten}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={lbl}>Chủ đề</label>
          <input style={inp} value={f.chu_de} onChange={e => set('chu_de', e.target.value)} placeholder="VD: phục hồi da, mụn, thư giãn, quà tặng…" />
        </div>
        <div>
          <label style={lbl}>Nội dung nháp</label>
          <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={f.noi_dung} onChange={e => set('noi_dung', e.target.value)} placeholder="Caption hoặc ý chính…" />
        </div>
        <div>
          <label style={lbl}>Yêu cầu cho AI</label>
          <textarea style={{ ...inp, minHeight: 74, resize: 'vertical' }} value={f.ai_prompt} onChange={e => set('ai_prompt', e.target.value)} placeholder="VD: Giọng sang, ấm, không cam kết điều trị, CTA đặt lịch Zalo" />
        </div>
        {err && <div style={errBox}>{err}</div>}
      </div>
    </RightPanel>
  )
}

// ═══════════ 1b. PANEL CRUD CHIẾN DỊCH (nhúng vào CampaignsPage) ══════════════
export function CampaignOpsPanel() {
  const [campaigns, setCampaigns] = useState([])
  const [khuyenMaiList, setKhuyenMaiList] = useState([])
  const [form, setForm] = useState(null)         // null | {} (mới) | campaign (sửa)
  const [showIdea, setShowIdea] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cd, km] = await Promise.all([
        supabase.from('chien_dich_marketing').select('*').order('ngay_bat_dau', { ascending: false }).limit(100),
        supabase.from('khuyen_mai').select('id, ten').order('created_at', { ascending: false }).limit(100),
      ])
      setCampaigns(cd.data || [])
      setKhuyenMaiList(km.data || [])
    } catch (e) { notify('Lỗi tải chiến dịch: ' + e.message, 'error') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const handleDelete = async (cd) => {
    if (!(await confirmDialog({ title: 'Xóa chiến dịch', message: `Xóa chiến dịch "${cd.ten}"? Chi phí + lead đã gắn sẽ mất liên kết.`, danger: true, confirmLabel: 'Xóa' }))) return
    const { error } = await supabase.from('chien_dich_marketing').delete().eq('id', cd.id)
    if (error) return notify('Lỗi xóa: ' + error.message, 'error')
    notify('Đã xóa chiến dịch')
    load()
  }

  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 'var(--r, 14px)', padding: 18, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Quản lý chiến dịch</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>Tạo / sửa / xóa chiến dịch · gắn khuyến mãi · nhập số liệu</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowIdea(true)} style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid var(--line2)', background: 'var(--bg2, #f6efe4)', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: 'var(--ink2)' }}>＋ Ý tưởng nội dung</button>
          <button onClick={() => setForm({})} style={{ padding: '8px 14px', borderRadius: 999, border: 'none', background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>＋ Chiến dịch</button>
        </div>
      </div>
      {loading ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>Đang tải…</div> : campaigns.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>Chưa có chiến dịch — bấm "＋ Chiến dịch" để tạo</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {campaigns.map(cd => {
            const k = KENH[cd.kenh] || KENH.khac
            const tt = CD_TRANG_THAI[cd.trang_thai] || CD_TRANG_THAI.draft
            return (
              <div key={cd.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface, #fff)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{k.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cd.ten}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 1 }}>
                    {fmtD(cd.ngay_bat_dau)} → {cd.ngay_ket_thuc ? fmtD(cd.ngay_ket_thuc) : 'đang chạy'}
                    {cd.ngan_sach > 0 && <> · NS {formatCurrency(cd.ngan_sach)}</>}
                    {cd.so_kh_moi > 0 && <> · {cd.so_kh_moi} KH mới</>}
                  </div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: tt.bg, color: tt.color, flexShrink: 0 }}>{tt.label}</span>
                <button onClick={() => setForm(cd)} title="Sửa" style={{ border: '1px solid var(--line)', background: 'var(--surface2)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>✏️</button>
                <button onClick={() => handleDelete(cd)} title="Xóa" style={{ border: '1px solid rgba(192,57,43,.3)', background: '#FDECEA', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>🗑️</button>
              </div>
            )
          })}
        </div>
      )}
      {form !== null && (
        <FormChienDich initial={form.id ? form : null} khuyenMaiList={khuyenMaiList}
          onClose={() => setForm(null)}
          onSave={() => { setForm(null); notify('✓ Đã lưu chiến dịch'); load() }} />
      )}
      {showIdea && (
        <FormContentIdea campaigns={campaigns} khuyenMaiList={khuyenMaiList}
          onClose={() => setShowIdea(false)}
          onSave={() => { setShowIdea(false); notify('✓ Đã lưu ý tưởng nội dung') }} />
      )}
    </div>
  )
}

// ═══════════ 3. ĐẶT HẸN TỪ LEAD (tạo/nối khach_hang + lich_hen) ═══════════════
function FormDatHenLead({ lead, dichVuList, ktvList, onSave, onClose }) {
  const [f, setF] = useState({
    ten_khach: lead.ho_ten || '', sdt_khach: lead.so_dien_thoai || '',
    ngay_hen: todayISO(), gio_hen: '10:00',
    dich_vu_id: '', ten_dich_vu: lead.nhu_cau || '',
    nhan_vien_id: '', ghi_chu: lead.ai_next_best_action || lead.ghi_chu || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const findOrCreateCustomer = async () => {
    const phone = f.sdt_khach.trim()
    if (!phone) return null
    const { data: existing } = await supabase.from('khach_hang').select('id').eq('so_dien_thoai', phone).maybeSingle()
    const payload = {
      ho_ten: f.ten_khach.trim() || lead.ho_ten || 'Khách marketing',
      so_dien_thoai: phone, nguon: lead.kenh || 'marketing',
      marketing_lead_id: lead.id, chien_dich_marketing_id: lead.chien_dich_id || null,
    }
    if (existing?.id) {
      await supabase.from('khach_hang').update(payload).eq('id', existing.id)
      return existing.id
    }
    const { data, error } = await supabase.from('khach_hang').insert(payload).select('id').single()
    if (error) throw error
    return data.id
  }

  const handleSave = async () => {
    if (!f.ten_khach.trim()) return setErr('Nhập tên khách')
    if (!f.ten_dich_vu.trim() && !f.dich_vu_id) return setErr('Chọn hoặc nhập dịch vụ khách quan tâm')
    setSaving(true); setErr('')
    try {
      const khachHangId = await findOrCreateCustomer()
      const { error } = await supabase.from('lich_hen').insert({
        ten_khach: f.ten_khach.trim(), sdt_khach: f.sdt_khach.trim() || null,
        khach_hang_id: khachHangId,
        dich_vu_id: f.dich_vu_id || null, ten_dich_vu: f.ten_dich_vu.trim() || null,
        nhan_vien_id: f.nhan_vien_id || null, thoi_luong_phut: 60,
        ngay_hen: f.ngay_hen, gio_hen: f.gio_hen,
        ghi_chu: [
          f.ghi_chu?.trim(),
          lead.ai_summary ? `AI: ${lead.ai_summary}` : '',
          lead.ai_intent ? `Phân loại: ${intentLabel(lead.ai_intent)}` : '',
        ].filter(Boolean).join('\n') || null,
        trang_thai: 'cho_xac_nhan', nguoi_nhap: 'Marketing AI',
        marketing_lead_id: lead.id, chien_dich_marketing_id: lead.chien_dich_id || null,
      })
      if (error) throw error
      await supabase.from('marketing_leads').update({
        khach_hang_id: khachHangId, trang_thai: 'da_dat_hen',
        ai_next_best_action: 'Theo dõi khách đến spa và chốt đơn POS',
      }).eq('id', lead.id)
      onSave()
    } catch (e) { setErr(e.message || String(e)) }
    finally { setSaving(false) }
  }

  return (
    <RightPanel open onClose={onClose} title="Đặt lịch từ khách tiềm năng" subtitle={lead.ho_ten || lead.so_dien_thoai || ''}
      footer={<button onClick={handleSave} disabled={saving} style={btnSave(saving)}>{saving ? 'Đang lưu…' : 'Đặt lịch hẹn'}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Tên khách *</label>
            <input style={inp} value={f.ten_khach} onChange={e => set('ten_khach', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Số điện thoại</label>
            <input style={inp} value={f.sdt_khach} onChange={e => set('sdt_khach', e.target.value)} placeholder="090…" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <DateField label="Ngày hẹn" value={f.ngay_hen} onChange={v => set('ngay_hen', v)} />
          <div>
            <label style={lbl}>Giờ hẹn</label>
            <select style={inp} value={f.gio_hen} onChange={e => set('gio_hen', e.target.value)}>
              {GIO_HEN.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={lbl}>Dịch vụ</label>
          <select style={inp} value={f.dich_vu_id} onChange={e => {
            const dv = dichVuList.find(d => d.id === e.target.value)
            setF(p => ({ ...p, dich_vu_id: e.target.value, ten_dich_vu: dv?.ten || p.ten_dich_vu }))
          }}>
            <option value="">— Nhập tay bên dưới —</option>
            {dichVuList.map(d => <option key={d.id} value={d.id}>{d.ten}</option>)}
          </select>
          <input style={{ ...inp, marginTop: 6 }} value={f.ten_dich_vu} onChange={e => set('ten_dich_vu', e.target.value)} placeholder="Hoặc mô tả dịch vụ khách quan tâm…" />
        </div>
        <div>
          <label style={lbl}>KTV (tuỳ chọn)</label>
          <select style={inp} value={f.nhan_vien_id} onChange={e => set('nhan_vien_id', e.target.value)}>
            <option value="">— Chọn sau —</option>
            {ktvList.map(k => <option key={k.id} value={k.id}>{k.ho_ten}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Ghi chú</label>
          <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} />
        </div>
        {err && <div style={errBox}>{err}</div>}
      </div>
    </RightPanel>
  )
}

// ═══════════ 2. FORM LEAD (thêm mới / bổ sung SĐT) ════════════════════════════
function FormLead({ initial, campaigns, onSave, onClose }) {
  const isEdit = !!initial?.id
  const [f, setF] = useState({
    ho_ten: initial?.ho_ten || '', so_dien_thoai: initial?.so_dien_thoai || '',
    kenh: initial?.kenh || 'facebook', chien_dich_id: initial?.chien_dich_id || '',
    nhu_cau: initial?.nhu_cau || '', ai_next_best_action: initial?.ai_next_best_action || '',
    ghi_chu: initial?.ghi_chu || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!f.ho_ten.trim() && !f.so_dien_thoai.trim()) return setErr('Nhập tên hoặc số điện thoại khách')
    if (isEdit && !f.so_dien_thoai.trim()) return setErr('Nhập số điện thoại để hệ thống nối khách hàng')
    setSaving(true); setErr('')
    const base = {
      ho_ten: f.ho_ten.trim() || null, so_dien_thoai: f.so_dien_thoai.trim() || null,
      nhu_cau: f.nhu_cau.trim() || null,
      ai_next_best_action: f.ai_next_best_action.trim() || (isEdit ? 'Quét Facebook để nối khách hàng và đo doanh thu' : null),
      ghi_chu: f.ghi_chu.trim() || null,
    }
    const { error } = isEdit
      ? await supabase.from('marketing_leads').update(base).eq('id', initial.id)
      : await supabase.from('marketing_leads').insert({ ...base, kenh: f.kenh, chien_dich_id: f.chien_dich_id || null, trang_thai: 'moi' })
    setSaving(false)
    if (error) return setErr(error.message)
    onSave()
  }

  return (
    <RightPanel open onClose={onClose}
      title={isEdit ? 'Bổ sung thông tin khách tiềm năng' : 'Thêm khách hàng tiềm năng'}
      subtitle={isEdit ? 'Có SĐT hệ thống mới nối được khách hàng, lịch hẹn và đơn hàng' : 'Lead từ quảng cáo / inbox / khách hỏi'}
      footer={<button onClick={handleSave} disabled={saving} style={btnSave(saving)}>{saving ? 'Đang lưu…' : (isEdit ? 'Lưu thông tin' : 'Lưu khách tiềm năng')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Tên khách</label>
            <input style={inp} value={f.ho_ten} onChange={e => set('ho_ten', e.target.value)} placeholder="VD: Chị Lan" autoFocus />
          </div>
          <div>
            <label style={lbl}>Số điện thoại{isEdit ? ' *' : ''}</label>
            <input style={inp} value={f.so_dien_thoai} onChange={e => set('so_dien_thoai', e.target.value)} placeholder="090…" />
          </div>
        </div>
        {!isEdit && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Kênh</label>
              <select style={inp} value={f.kenh} onChange={e => set('kenh', e.target.value)}>
                <option value="facebook">Facebook</option><option value="zalo">Zalo</option>
                <option value="tiktok">TikTok</option><option value="google">Google</option>
                <option value="website">Website</option><option value="walk_in">Khách tự đến</option>
                <option value="khac">Khác</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Chiến dịch</label>
              <select style={inp} value={f.chien_dich_id} onChange={e => set('chien_dich_id', e.target.value)}>
                <option value="">— Chưa gắn —</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.ten}</option>)}
              </select>
            </div>
          </div>
        )}
        <div>
          <label style={lbl}>Nhu cầu</label>
          <textarea style={{ ...inp, minHeight: 74, resize: 'vertical' }} value={f.nhu_cau} onChange={e => set('nhu_cau', e.target.value)} placeholder="Khách hỏi dịch vụ gì, tình trạng da, mong muốn…" />
        </div>
        <div>
          <label style={lbl}>Bước tiếp theo</label>
          <input style={inp} value={f.ai_next_best_action} onChange={e => set('ai_next_best_action', e.target.value)} placeholder="VD: Gọi tư vấn và chốt lịch soi da" />
        </div>
        <div>
          <label style={lbl}>Ghi chú</label>
          <input style={inp} value={f.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} placeholder="Ghi chú nội bộ…" />
        </div>
        {err && <div style={errBox}>{err}</div>}
      </div>
    </RightPanel>
  )
}

// ═══════════ 2b. TRANG KHÁCH TIỀM NĂNG (/admin/marketing/khach-tiem-nang) ═════
const LEAD_TT = {
  moi:         { label: 'Mới',          color: '#1A5276', bg: '#EBF5FB' },
  da_lien_he:  { label: 'Đã liên hệ',   color: '#8E44AD', bg: '#F5F0FF' },
  da_dat_hen:  { label: 'Đã đặt hẹn',   color: '#2D7A4F', bg: '#E8F5E9' },
  da_mua:      { label: 'Đã mua',       color: '#A0714F', bg: '#F5EFE7' },
  huy:         { label: 'Hủy',          color: '#7F8C8D', bg: '#F0F4F8' },
  spam:        { label: 'Spam',         color: '#C0392B', bg: '#FDECEA' },
}
export function LeadOpsPage() {
  const [leads, setLeads] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [dichVuList, setDichVuList] = useState([])
  const [ktvList, setKtvList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [bookingLead, setBookingLead] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ld, cd, dv, nv] = await Promise.all([
        supabase.from('marketing_leads').select('*').order('created_at', { ascending: false }).limit(300),
        supabase.from('chien_dich_marketing').select('id, ten').order('ngay_bat_dau', { ascending: false }).limit(100),
        supabase.from('dich_vu').select('id, ten').eq('is_active', true).order('ten').limit(300),
        supabase.from('nhan_vien').select('id, ho_ten').eq('trang_thai', 'dang_lam').order('ho_ten'),
      ])
      setLeads((ld.data || []).filter(isActiveLead))
      setCampaigns(cd.data || [])
      setDichVuList(dv.data || [])
      setKtvList(nv.data || [])
    } catch (e) { notify('Lỗi tải khách tiềm năng: ' + e.message, 'error') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const markContacted = async (lead) => {
    const { error } = await supabase.from('marketing_leads').update({ trang_thai: 'da_lien_he' }).eq('id', lead.id)
    if (error) return notify('Lỗi: ' + error.message, 'error')
    notify('✓ Đã đánh dấu đã liên hệ')
    load()
  }

  const cdName = (id) => campaigns.find(c => c.id === id)?.ten || '—'

  return (
    <>
      <div className="mod-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="ttl">Khách Tiềm Năng</div>
          <div className="sub">{leads.length} lead · từ quảng cáo, inbox, khách hỏi — chốt hẹn để nối vào CRM</div>
        </div>
        <div className="acts">
          <a href="/admin/marketing" className="btn">← Marketing</a>
          <button className="btn primary" onClick={() => setShowForm(true)}>＋ Thêm khách tiềm năng</button>
        </div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải…</div> : leads.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)', background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 14 }}>
          Chưa có khách tiềm năng nào — bấm "＋ Thêm khách tiềm năng"
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leads.map(l => {
            const tt = LEAD_TT[l.trang_thai] || LEAD_TT.moi
            const k = KENH[l.kenh] || KENH.khac
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{k.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
                    {l.ho_ten || '(chưa có tên)'}
                    <span style={{ fontWeight: 500, color: 'var(--ink3)', marginLeft: 8, fontSize: 12.5 }}>{l.so_dien_thoai || 'chưa có SĐT'}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {intentLabel(l.ai_intent)} · CD: {cdName(l.chien_dich_id)}
                    {l.nhu_cau && <> · {l.nhu_cau}</>}
                  </div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: tt.bg, color: tt.color, flexShrink: 0 }}>{tt.label}</span>
                {(l.trang_thai || 'moi') === 'moi' && (
                  <button onClick={() => markContacted(l)} title="Đánh dấu đã liên hệ"
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface, #fff)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', color: 'var(--ink2)' }}>✓ Đã liên hệ</button>
                )}
                <button onClick={() => setEditingLead(l)} title="Bổ sung thông tin / SĐT"
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface, #fff)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', color: 'var(--ink2)' }}>✏️ Bổ sung</button>
                <button onClick={() => setBookingLead(l)} title="Đặt lịch hẹn cho khách này"
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#C9A96E,#A0714F)', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>📅 Đặt hẹn</button>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <FormLead campaigns={campaigns} onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); notify('✓ Đã lưu khách tiềm năng'); load() }} />
      )}
      {editingLead && (
        <FormLead initial={editingLead} campaigns={campaigns} onClose={() => setEditingLead(null)}
          onSave={() => { setEditingLead(null); notify('✓ Đã cập nhật khách tiềm năng'); load() }} />
      )}
      {bookingLead && (
        <FormDatHenLead lead={bookingLead} dichVuList={dichVuList} ktvList={ktvList}
          onClose={() => setBookingLead(null)}
          onSave={() => { setBookingLead(null); notify('✓ Đã đặt lịch hẹn — xem tại Lịch Hẹn'); load() }} />
      )}
    </>
  )
}

// ═══════════ 5. PANEL DUYỆT HÀNH ĐỘNG AI (marketing_ai_actions) ═══════════════
export function AiActionsPanel() {
  const [actions, setActions] = useState([])
  const [running, setRunning] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('marketing_ai_actions')
        .select('*').eq('trang_thai', 'cho_duyet')
        .order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      setActions(data || [])
    } catch (e) { notify('Lỗi tải hành động AI: ' + e.message, 'error') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // Port nguyên logic bản cũ: duyệt/từ chối → đồng bộ approval_queue + content_calendar
  const updateAction = async (action, approved) => {
    setRunning(action.id)
    try {
      const { error } = await supabase.from('marketing_ai_actions')
        .update(approved ? { trang_thai: 'da_duyet', approved_at: new Date().toISOString() } : { trang_thai: 'tu_choi' })
        .eq('id', action.id)
      if (error) throw error
      await supabase.from('marketing_approval_queue')
        .update({ trang_thai: approved ? 'da_duyet' : 'tu_choi' }).eq('ai_action_id', action.id)
      if (action.content_id) {
        await supabase.from('marketing_content_calendar')
          .update({ trang_thai: approved ? 'da_duyet' : 'huy' }).eq('id', action.content_id)
      }
      notify(approved ? '✓ Đã duyệt hành động AI' : 'Đã từ chối hành động AI')
      load()
    } catch (e) { notify('Lỗi cập nhật AI: ' + e.message, 'error') }
    finally { setRunning('') }
  }

  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 'var(--r, 14px)', padding: 18, marginTop: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Hành động AI chờ duyệt {actions.length > 0 && <span style={{ color: '#C0392B' }}>({actions.length})</span>}</div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2 }}>AI đề xuất → anh duyệt thì cron mới thực thi · từ chối là hủy</div>
      </div>
      {loading ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>Đang tải…</div> : actions.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>Không có hành động nào chờ duyệt 🎉</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actions.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface, #fff)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                  {a.title || a.action_type || 'Hành động AI'}
                  {a.risk_level === 'cao' && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: '#C0392B' }}>RỦI RO CAO</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.recommendation || a.ly_do || ''}
                </div>
              </div>
              <button disabled={running === a.id} onClick={() => updateAction(a, false)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(192,57,43,.3)', background: '#FDECEA', color: '#C0392B', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>Từ chối</button>
              <button disabled={running === a.id} onClick={() => updateAction(a, true)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#2D7A4F,#1e5637)', color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>✓ Duyệt</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
