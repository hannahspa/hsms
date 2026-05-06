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

  return (
    <div style={{ background: LUX.bg, minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ background: LUX.heroGrad, padding: '30px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '50%' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💁</div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontFamily: LUX.fontSans }}>Xin chào,</div>
              <div style={{ color: '#FFFBF5', fontWeight: '700', fontSize: '15px', fontFamily: LUX.fontSerif }}>{user?.ho_ten || 'Lễ Tân'}</div>
            </div>
          </div>

          <h2 style={{ color: '#FFFBF5', fontSize: '20px', fontWeight: '700', fontFamily: LUX.fontSerif, marginBottom: '4px' }}>Đối Soát Giao Dịch</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontFamily: LUX.fontSans }}>Kiểm tra giao dịch từng ngày</p>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: '-16px', position: 'relative', zIndex: 2 }}>
        {/* Date selector */}
        <button
          onClick={() => setShowLich(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', background: LUX.surface2, borderRadius: LUX.radius, padding: '16px 20px', marginBottom: '12px', border: `1px solid ${LUX.line}`, boxShadow: LUX.shadowSm, cursor: 'pointer' }}
        >
          <span style={{ fontSize: '20px' }}>📅</span>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Ngày đối soát</div>
            <div style={{ fontWeight: '700', color: LUX.ink, fontSize: '15px', fontFamily: LUX.fontSans }}>{formatDateInput(ngay)}</div>
          </div>
          <span style={{ color: LUX.gold, fontSize: '18px' }}>›</span>
        </button>

        <DatePicker open={showLich} selectedDate={ngay}
          onClose={() => setShowLich(false)}
          onConfirm={d => { setNgay(d); setShowLich(false) }} />

        {/* Quick stats (count only — no money) */}
        {!loading && history.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: 'Doanh Thu', count: stats.thu, bg: '#F0FDF4', color: '#2D7A4F' },
              { label: 'Chi Phí',   count: stats.chi, bg: '#FEF2F2', color: '#C0392B' },
              { label: 'Chuyển Khoản', count: stats.ck, bg: '#F5F3FF', color: '#6C3483' },
            ].map(item => (
              <div key={item.label} style={{ flex: 1, background: item.bg, borderRadius: '12px', padding: '10px', textAlign: 'center', border: `1px solid ${LUX.line}` }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: item.color, fontFamily: LUX.fontMono }}>{item.count}</div>
                <div style={{ fontSize: '10px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Transaction list */}
        <div style={{ background: LUX.surface2, borderRadius: LUX.radiusLg, padding: '18px', border: `1px solid ${LUX.line}`, boxShadow: LUX.shadowSm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSerif }}>
              Giao dịch {formatDateInput(ngay)}
            </span>
            <span style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{history.length} giao dịch</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: LUX.ink3, fontSize: '13px', fontFamily: LUX.fontSans }}>Đang tải...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
              <div style={{ fontWeight: '600', color: LUX.ink, marginBottom: '4px', fontFamily: LUX.fontSans }}>Chưa có giao dịch</div>
              <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans }}>Ngày này chưa có dữ liệu thu chi nào</div>
            </div>
          ) : (
            history.map((item, i) => (
              <div key={item.id || i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: item.loai === 'thu' ? '#F0FDF4' : item.loai === 'chi' ? '#FEF2F2' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                      {item.loai === 'thu' ? '💰' : item.loai === 'chi' ? '💸' : '🔄'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: LUX.ink, fontFamily: LUX.fontSans }}>{getItemLabel(item)}</div>
                      <div style={{ fontSize: '10px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                        {item.dien_giai || ''}{item.nguoi_nhap ? ` • ${item.nguoi_nhap}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: item.loai === 'thu' ? '#2D7A4F' : item.loai === 'chi' ? '#C0392B' : '#6C3483', fontFamily: LUX.fontMono }}>
                      {item.loai === 'chi' ? '-' : item.loai === 'thu' ? '+' : ''}{formatCurrency(item.so_tien)}
                    </div>
                    {item.created_at && (
                      <div style={{ fontSize: '9px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                        {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
                {i < history.length - 1 && <div style={{ height: '1px', background: LUX.line }} />}
              </div>
            ))
          )}
        </div>

        {/* Nhập liệu button */}
        <button
          onClick={() => onOpenForm?.('thu')}
          style={{ width: '100%', marginTop: '16px', padding: '16px', borderRadius: LUX.radius, background: LUX.heroGrad, border: 'none', color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer', boxShadow: LUX.shadow, fontFamily: LUX.fontSans }}
        >
          ✏️ Nhập Giao Dịch Mới
        </button>

        {/* Đối soát cuối ngày */}
        <button
          onClick={() => setShowDoiSoat(true)}
          style={{ width: '100%', marginTop: '10px', padding: '14px', borderRadius: LUX.radius, background: LUX.surface2, border: `1px solid ${LUX.line}`, color: LUX.ink, fontWeight: '600', fontSize: '14px', cursor: 'pointer', boxShadow: LUX.shadowSm, fontFamily: LUX.fontSans }}
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
