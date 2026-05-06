import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'

export default function TabXetDuyet({ onUpdate }) {
  const [danhSachCho, setDanhSachCho] = useState([])
  const [dungLeList,  setDungLeList]  = useState([])
  const [nvMap,       setNvMap]       = useState({})
  const [loading,     setLoading]     = useState(true)
  const [rejectModal, setRejectModal] = useState(null) // { type: 'off'|'le', id, defaultReason }

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: nvData } = await supabase.from('nhan_vien').select('id, ho_ten, vi_tri')
      const map = {}
      nvData?.forEach(nv => {
        const parts = nv.ho_ten.trim().split(' ')
        map[nv.id] = {
          ten: parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : nv.ho_ten,
          vi_tri: nv.vi_tri === 'le_tan' ? 'Lễ Tân' : 'KTV',
        }
      })
      setNvMap(map)

      const { data: offData } = await supabase
        .from('dang_ky_off').select('*')
        .eq('trang_thai', 'cho_duyet')
        .order('created_at', { ascending: false })

      setDanhSachCho(offData || [])

      // Fetch yêu cầu dùng ngày lễ bù OV
      const { data: dungLeData } = await supabase
        .from('yeu_cau_chinh_sua').select('*')
        .eq('loai_yeu_cau', 'dung_ngay_le')
        .eq('trang_thai', 'cho_duyet')
        .order('created_at', { ascending: false })

      setDungLeList(dungLeData || [])
    } catch (e) { console.error('TabXetDuyet:', e) }
    finally { setLoading(false) }
  }

  const executeRejectOff = async (id, lyDo) => {
    await supabase.from('dang_ky_off').update({ trang_thai: 'tu_choi', ghi_chu_duyet: lyDo }).eq('id', id)
    fetchData()
    onUpdate?.()
  }

  const executeRejectLe = async (yeuCauId, lyDo) => {
    await supabase.from('yeu_cau_chinh_sua').update({
      trang_thai: 'tu_choi', nguoi_duyet: 'Admin', ghi_chu_duyet: lyDo,
    }).eq('id', yeuCauId)
    fetchData()
    onUpdate?.()
  }

  const handleDuyet = async (id, trangThaiMoi) => {
    if (trangThaiMoi === 'tu_choi') {
      setRejectModal({ type: 'off', id, defaultReason: 'Không thể duyệt do thiếu người' })
    } else {
      await supabase.from('dang_ky_off').update({ trang_thai: 'duoc_duyet', ghi_chu_duyet: 'OK' }).eq('id', id)
      fetchData()
      onUpdate?.()
    }
  }

  const handleDuyetDungLe = async (yeuCauId, duyet) => {
    if (!duyet) {
      setRejectModal({ type: 'le', id: yeuCauId, defaultReason: 'Chưa đủ điều kiện' })
    } else {
      const yc = dungLeList.find(d => d.id === yeuCauId)
      if (!yc) return
      const { so_dung_thang_nay, thang, nam } = yc.du_lieu_moi || {}
      const nvId = yc.du_lieu_cu?.nhan_vien_id
      if (!nvId || !so_dung_thang_nay) return

      // Find quy_ngay_off record for this nhan_vien + year
      const { data: quyData } = await supabase.from('quy_ngay_off')
        .select('id, so_ngay_da_dung, so_dung_thang_nay')
        .eq('nhan_vien_id', nvId)
        .eq('nam', nam || new Date().getFullYear())
        .maybeSingle()

      if (quyData) {
        await supabase.from('quy_ngay_off').update({
          so_dung_thang_nay: (quyData.so_dung_thang_nay || 0) + so_dung_thang_nay,
          so_ngay_da_dung: (quyData.so_ngay_da_dung || 0) + so_dung_thang_nay,
        }).eq('id', quyData.id)
      }

      await supabase.from('yeu_cau_chinh_sua').update({
        trang_thai: 'da_duyet', nguoi_duyet: 'Admin',
      }).eq('id', yeuCauId)
    }
    fetchData()
    onUpdate?.()
  }

  const fmtDate = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const getLoaiCfg = (loai) => {
    switch (loai) {
      case 'off_phep': return { bg: '#eef2e7', color: '#5a6a4a', label: 'OFF Phép' }
      case 'off_ov':   return { bg: '#f5e0da', color: LUX.danger, label: 'OFF Ko Lương' }
      case 'off_t7':   return { bg: '#ede9f8', color: '#6a4a8a', label: 'OFF T7/CN (×2)' }
      case 'off_t7x':  return { bg: '#f5e0da', color: LUX.danger, label: 'Vi Phạm T7/CN' }
      default:         return { bg: LUX.surface, color: LUX.ink2, label: loai }
    }
  }

  const getInitial = (ten) => ten.trim().charAt(0).toUpperCase()
  const getAvatarColor = (ten) => {
    const p = [LUX.taupe, LUX.champagne, LUX.rose, LUX.sage, '#6a5a4a']
    let h = 0; for (const c of ten) h += c.charCodeAt(0)
    return p[h % p.length]
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: '22px', fontWeight: 600, color: LUX.espresso }}>Đơn Xin OFF</div>
          <div style={{ fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3, marginTop: '2px' }}>Cần anh Nam xem xét</div>
        </div>
        <div style={{ background: '#f5e0da', color: LUX.danger, padding: '5px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '13px', fontFamily: LUX.fontSans }}>
          {danhSachCho.length} đơn chờ
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Đang tải dữ liệu...</div>
      ) : danhSachCho.length === 0 ? (
        <div style={{
          background: LUX.surface, padding: '48px 24px', borderRadius: LUX.radiusLg,
          textAlign: 'center', border: `1px dashed ${LUX.line2}`,
        }}>
          <div style={{ fontFamily: LUX.fontSerif, fontSize: '20px', fontWeight: 600, color: LUX.espresso, marginTop: '12px' }}>Không có đơn nào chờ duyệt</div>
          <div style={{ fontFamily: LUX.fontSans, fontSize: '13px', color: LUX.ink3, marginTop: '6px' }}>Spa đang vận hành trơn tru</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {danhSachCho.map(don => {
            const nv     = nvMap[don.nhan_vien_id] || { ten: 'Không rõ', vi_tri: '' }
            const loaiCfg = getLoaiCfg(don.loai_off)
            const [y, m, d] = don.ngay_off.split('-')
            const dayOfWeek = new Date(y, m-1, d).getDay()
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
            const isBKK     = don.ly_do?.length > 20 && don.loai_off !== 'off_phep'

            return (
              <div key={don.id} style={{
                background: LUX.surface, borderRadius: LUX.radius,
                border: `1px solid ${LUX.line}`, boxShadow: LUX.shadow,
                overflow: 'hidden',
              }}>
                {/* Accent stripe */}
                <div style={{ height: '3px', background: loaiCfg.color, opacity: 0.5 }} />

                <div style={{ padding: '16px' }}>
                  {/* NV header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: getAvatarColor(nv.ten), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '17px', color: 'white', fontFamily: LUX.fontSans, flexShrink: 0 }}>
                        {getInitial(nv.ten)}
                      </div>
                      <div>
                        <div style={{ fontFamily: LUX.fontSerif, fontSize: '18px', fontWeight: 600, color: LUX.espresso }}>{nv.ten}</div>
                        <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, marginTop: '1px' }}>{nv.vi_tri}</div>
                      </div>
                    </div>
                    <div style={{ background: loaiCfg.bg, color: loaiCfg.color, padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, fontFamily: LUX.fontSans }}>
                      {loaiCfg.label}
                    </div>
                  </div>

                  {/* Ngày + lý do */}
                  <div style={{ background: LUX.bg, borderRadius: LUX.radiusSm, padding: '12px 14px', marginBottom: '14px', border: `1px solid ${LUX.line}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600 }}>Xin nghỉ ngày:</span>
                      <span style={{ fontFamily: LUX.fontMono, fontSize: '14px', color: LUX.taupe, fontWeight: 600 }}>{fmtDate(don.ngay_off)}</span>
                    </div>
                    <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.ink3, fontWeight: 600, marginBottom: '4px' }}>Lý do:</div>
                    <div style={{ fontFamily: LUX.fontSerif, fontSize: '15px', color: LUX.ink2, fontStyle: 'italic', lineHeight: 1.6 }}>
                      "{don.ly_do}"
                    </div>
                  </div>

                  {/* Cảnh báo */}
                  {isWeekend && (
                    <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.danger, background: '#f5e0da', padding: '7px 12px', borderRadius: '10px', marginBottom: '14px', fontWeight: 700, display: 'flex', gap: '6px', alignItems: 'center', border: `1px solid ${LUX.danger}30` }}>
                      ⚠ Rơi vào Thứ 7 / Chủ Nhật
                    </div>
                  )}
                  {isBKK && !isWeekend && (
                    <div style={{ fontFamily: LUX.fontSans, fontSize: '11px', color: LUX.champagne2, background: '#f5e8d4', padding: '7px 12px', borderRadius: '10px', marginBottom: '14px', fontWeight: 700, display: 'flex', gap: '6px', alignItems: 'center', border: `1px solid ${LUX.champagne}40` }}>
                      🔥 Bất khả kháng — đã đủ người OFF
                    </div>
                  )}

                  {/* Hành động */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleDuyet(don.id, 'tu_choi')}
                      style={{ flex: 1, padding: '12px', borderRadius: LUX.radiusSm, background: '#f5e0da', color: LUX.danger, border: `1px solid ${LUX.danger}30`, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                      Từ Chối
                    </button>
                    <button onClick={() => handleDuyet(don.id, 'duoc_duyet')}
                      style={{ flex: 1, padding: '12px', borderRadius: LUX.radiusSm, background: LUX.goldGrad, color: 'white', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: LUX.fontSans, boxShadow: `0 4px 14px ${LUX.gold}50` }}>
                      Duyệt Đơn
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* ── Yêu Cầu Dùng Ngày Lễ Bù OV ── */}
      {!loading && dungLeList.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: LUX.fontSerif, fontSize: 22, fontWeight: 600, color: LUX.espresso }}>Dùng Ngày Lễ Bù OV</div>
              <div style={{ fontFamily: LUX.fontSans, fontSize: 12, color: LUX.ink3, marginTop: 2 }}>Nhân viên xin dùng ngày lễ tích luỹ</div>
            </div>
            <div style={{ background: '#fdf3e0', color: LUX.taupe, padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13, fontFamily: LUX.fontSans }}>
              {dungLeList.length} yêu cầu
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {dungLeList.map(yc => {
              const nvId = yc.du_lieu_cu?.nhan_vien_id
              const nvTen = yc.du_lieu_cu?.nhan_vien_ten || yc.nguoi_yeu_cau || 'Không rõ'
              const nv = nvId && nvMap[nvId] ? nvMap[nvId] : { ten: nvTen, vi_tri: '' }

              return (
                <div key={yc.id} style={{
                  background: LUX.surface, borderRadius: LUX.radius,
                  border: `1px solid ${LUX.line}`, boxShadow: LUX.shadow,
                  overflow: 'hidden',
                }}>
                  <div style={{ height: 3, background: LUX.gold, opacity: 0.5 }} />

                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: getAvatarColor(nv.ten), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color: 'white', fontFamily: LUX.fontSans, flexShrink: 0 }}>
                          {getInitial(nv.ten)}
                        </div>
                        <div>
                          <div style={{ fontFamily: LUX.fontSerif, fontSize: 18, fontWeight: 600, color: LUX.espresso }}>{nv.ten}</div>
                          <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, marginTop: 1 }}>{nv.vi_tri}</div>
                        </div>
                      </div>
                      <div style={{ background: '#fdf3e0', color: LUX.taupe, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: LUX.fontSans }}>
                        {yc.du_lieu_moi?.so_dung_thang_nay || 0} ngày
                      </div>
                    </div>

                    <div style={{ background: LUX.bg, borderRadius: LUX.radiusSm, padding: '12px 14px', marginBottom: 14, border: `1px solid ${LUX.line}` }}>
                      <div style={{ fontFamily: LUX.fontSans, fontSize: 11, color: LUX.ink3, fontWeight: 600, marginBottom: 4 }}>Lý do:</div>
                      <div style={{ fontFamily: LUX.fontSerif, fontSize: 15, color: LUX.ink2, fontStyle: 'italic', lineHeight: 1.6 }}>
                        "{yc.ly_do}"
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => handleDuyetDungLe(yc.id, false)}
                        style={{ flex: 1, padding: 12, borderRadius: LUX.radiusSm, background: '#f5e0da', color: LUX.danger, border: `1px solid ${LUX.danger}30`, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: LUX.fontSans }}>
                        Từ Chối
                      </button>
                      <button onClick={() => handleDuyetDungLe(yc.id, true)}
                        style={{ flex: 1, padding: 12, borderRadius: LUX.radiusSm, background: LUX.goldGrad, color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: LUX.fontSans, boxShadow: `0 4px 14px ${LUX.gold}50` }}>
                        Duyệt
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setRejectModal(null)}>
          <div style={{ background: LUX.surface2, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '480px', margin: '0 auto', padding: '24px 20px 40px' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: LUX.fontSerif, fontSize: '17px', fontWeight: 700, color: LUX.ink, marginBottom: '4px' }}>Lý do từ chối</h3>
            <p style={{ fontFamily: LUX.fontSans, fontSize: '12px', color: LUX.ink3, marginBottom: '16px' }}>Nhân viên sẽ thấy lý do này</p>
            <textarea id="reject-reason" defaultValue={rejectModal.defaultReason}
              rows={3}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${LUX.line}`, fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans, marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setRejectModal(null)}
                style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, background: LUX.surface, border: `1px solid ${LUX.line}`, color: LUX.ink2, fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Hủy
              </button>
              <button onClick={() => {
                const lyDo = document.getElementById('reject-reason').value.trim() || rejectModal.defaultReason
                if (rejectModal.type === 'off') executeRejectOff(rejectModal.id, lyDo)
                else executeRejectLe(rejectModal.id, lyDo)
                setRejectModal(null)
              }}
                style={{ flex: 1, padding: '14px', borderRadius: LUX.radius, background: '#C0392B', border: 'none', color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
