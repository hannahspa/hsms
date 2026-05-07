import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX } from '../../../constants/lux'
import { formatCurrency, todayISO, formatDateInput } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import DoiSoatNgay from './DoiSoatNgay'

const HINH_THUC_LABEL = {
  tien_mat: 'Tiền Mặt',
  chuyen_khoan: 'Chuyển Khoản',
  quet_the: 'Quẹt Thẻ',
  the_tra_truoc: 'Thẻ Trả Trước',
}

function getItemLabel(item) {
  if (item.loai === 'thu') return `Doanh Thu ${HINH_THUC_LABEL[item.hinh_thuc] || item.hinh_thuc || ''}`
  if (item.loai === 'chi') return item.ten_danh_muc || 'Chi Phí'
  if (item.loai === 'chuyen_khoan') return `CK: ${item.ten_vi_tu || '?'} → ${item.ten_vi_den || '?'}`
  return item.mo_ta || 'Giao dịch'
}

export default function DoiSoatPage({ user, onOpenForm }) {
  const [ngay, setNgay] = useState(todayISO())
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLich, setShowLich] = useState(false)
  const [showDoiSoat, setShowDoiSoat] = useState(false)

  const fetchData = async (date) => {
    setLoading(true)
    const { data } = await supabase
      .from('lich_su_giao_dich_tong_hop')
      .select('*')
      .eq('ngay', date)
      .order('created_at', { ascending: false })
    setHistory(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData(ngay) }, [ngay])

  const stats = useMemo(() => {
    const thu = history.filter(h => h.loai === 'thu').length
    const chi = history.filter(h => h.loai === 'chi').length
    const ck = history.filter(h => h.loai === 'chuyen_khoan').length
    return { thu, chi, ck }
  }, [history])

  const isToday = ngay === todayISO()
  const todayLabel = isToday ? 'Hôm nay' : formatDateInput(ngay)

  return (
    <div style={{ background: LUX.bg, minHeight: '100vh', paddingBottom: '100px' }}>

      {/* ── Header Compact ── */}
      <div style={{ padding: '20px 20px 8px', background: LUX.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Xin chào,</div>
            <div style={{ fontWeight: '700', fontSize: '17px', color: LUX.ink, fontFamily: LUX.fontSerif }}>{user?.ho_ten || 'Lễ Tân'}</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: LUX.heroGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white' }}>💁</div>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { icon: '💰', label: 'Doanh Thu', action: 'thu', bg: '#F0FDF4', color: '#2D7A4F' },
            { icon: '💸', label: 'Chi Phí',   action: 'chi', bg: '#FEF2F2', color: '#C0392B' },
            { icon: '🔄', label: 'Chuyển Khoản', action: 'ck', bg: '#F5F3FF', color: '#6C3483' },
          ].map(btn => (
            <button key={btn.action} onClick={() => onOpenForm?.(btn.action)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 10px', borderRadius: '12px', border: `1px solid ${LUX.line}`, background: btn.bg, cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: btn.color, fontFamily: LUX.fontSans }}>
              <span style={{ fontSize: '18px' }}>{btn.icon}</span> {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* ── Date Selector ── */}
        <button
          onClick={() => setShowLich(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: LUX.surface2, borderRadius: '12px', padding: '12px 16px', marginTop: '12px', marginBottom: '10px', border: `1px solid ${LUX.line}`, cursor: 'pointer' }}
        >
          <span style={{ fontSize: '16px' }}>📅</span>
          <span style={{ fontWeight: '600', fontSize: '13px', color: LUX.ink, fontFamily: LUX.fontSans }}>{todayLabel}</span>
          {isToday && <span style={{ fontSize: '10px', color: '#2D7A4F', background: '#F0FDF4', padding: '2px 8px', borderRadius: '20px', fontWeight: '600', fontFamily: LUX.fontSans }}>HÔM NAY</span>}
          <span style={{ marginLeft: 'auto', color: LUX.ink3, fontSize: '14px' }}>›</span>
        </button>

        <DatePicker open={showLich} selectedDate={ngay}
          onClose={() => setShowLich(false)}
          onConfirm={d => { setNgay(d); setShowLich(false) }} />

        {/* ── Quick Stats ── */}
        {!loading && history.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {[
              { label: 'Thu', count: stats.thu, color: '#2D7A4F', bg: '#F0FDF4' },
              { label: 'Chi', count: stats.chi, color: '#C0392B', bg: '#FEF2F2' },
              { label: 'CK',  count: stats.ck,  color: '#6C3483', bg: '#F5F3FF' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: '10px', padding: '8px', textAlign: 'center', border: `1px solid ${LUX.line}` }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: s.color, fontFamily: LUX.fontMono }}>{s.count}</div>
                <div style={{ fontSize: '10px', color: LUX.ink3, fontWeight: '600', fontFamily: LUX.fontSans }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Transaction List ── */}
        <div style={{ background: LUX.surface2, borderRadius: '16px', border: `1px solid ${LUX.line}`, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: LUX.ink3, fontSize: '13px', fontFamily: LUX.fontSans }}>Đang tải...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📭</div>
              <div style={{ fontWeight: '600', color: LUX.ink, marginBottom: '4px', fontSize: '14px', fontFamily: LUX.fontSans }}>Chưa có giao dịch</div>
              <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{isToday ? 'Hôm nay chưa có dữ liệu thu chi' : 'Ngày này chưa có dữ liệu'}</div>
              {isToday && (
                <button onClick={() => onOpenForm?.('thu')}
                  style={{ marginTop: '12px', padding: '10px 24px', borderRadius: '20px', background: LUX.heroGrad, border: 'none', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                  + Nhập Giao Dịch Đầu Tiên
                </button>
              )}
            </div>
          ) : (
            history.map((item, i) => (
              <div key={item.id || i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      background: item.loai === 'thu' ? '#F0FDF4' : item.loai === 'chi' ? '#FEF2F2' : '#F5F3FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                      {item.loai === 'thu' ? '💰' : item.loai === 'chi' ? '💸' : '🔄'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: LUX.ink, fontFamily: LUX.fontSans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getItemLabel(item)}</div>
                      <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.dien_giai || ''}{item.nguoi_nhap ? ` • ${item.nguoi_nhap}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', fontFamily: LUX.fontMono,
                      color: item.loai === 'thu' ? '#2D7A4F' : item.loai === 'chi' ? '#C0392B' : '#6C3483' }}>
                      {item.loai === 'chi' ? '-' : item.loai === 'thu' ? '+' : ''}{formatCurrency(item.so_tien)}
                    </div>
                    {item.created_at && (
                      <div style={{ fontSize: '10px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                        {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
                {i < history.length - 1 && <div style={{ height: '1px', background: LUX.line, margin: '0 16px' }} />}
              </div>
            ))
          )}
        </div>

        {/* ── Bottom Actions ── */}
        <button
          onClick={() => setShowDoiSoat(true)}
          style={{ width: '100%', marginTop: '12px', padding: '14px', borderRadius: '14px', background: LUX.surface2, border: `1px solid ${LUX.line}`, color: LUX.ink, fontWeight: '600', fontSize: '14px', cursor: 'pointer', fontFamily: LUX.fontSans, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          ✅ Đối Soát Cuối Ngày
        </button>
      </div>

      {showDoiSoat && (
        <DoiSoatNgay user={user} onClose={() => setShowDoiSoat(false)} />
      )}
    </div>
  )
}
