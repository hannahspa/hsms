import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { LUX } from '../../../constants/lux'
import { formatCurrency, formatCurrencyHide, todayISO, getNowVN, formatDateInput } from '../../../lib/utils'
import ChiTietGiaoDich from '../tai-khoan/ChiTietGiaoDich'

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

function getItemDesc(item) {
  if (item.loai === 'thu') return item.dien_giai || 'Doanh thu'
  if (item.loai === 'chi') return item.dien_giai || 'Chi phí'
  if (item.loai === 'chuyen_khoan') return item.dien_giai || 'Chuyển khoản nội bộ'
  return item.dien_giai || ''
}

function getViDesc(vi) {
  if (vi.loai === 'tien_mat') return 'Tiền mặt tại quầy'
  if (vi.loai === 'ngan_hang') return 'Ngân hàng'
  return vi.loai || ''
}

function HeaderTongQuan({ user, viList = [], stats }) {
  const isAdmin = user?.vai_tro === 'admin'
  const tongTS  = (viList || []).reduce((s, v) => s + (v.so_du_hien_tai || 0), 0)
  const greeting = getNowVN().getHours() < 12 ? 'Chào buổi sáng' : getNowVN().getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div style={{ background: LUX.heroGrad, padding: '30px 22px 50px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '50%' }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', marginBottom: '18px' }}>
          <img src="/logo.png" alt="Hannah Spa" style={{ width: '180px', height: 'auto', filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.1))', objectFit: 'contain' }} />
          <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '17px', fontFamily: "'Dancing Script', cursive", marginTop: '4px', letterSpacing: '0.5px' }}>Giữ Mãi Nét Thanh Xuân Của Bạn</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '22px', position: 'relative' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{isAdmin ? '👑' : '💁'}</div>
          <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontFamily: LUX.fontSans }}>{greeting},</div>
              <div style={{ color: '#FFFBF5', fontWeight: '700', fontSize: '15px', fontFamily: LUX.fontSerif }}>{user?.ten || user?.ho_ten || 'Admin'}</div>
          </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '25px', position: 'relative' }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px', fontFamily: LUX.fontSans }}>Tổng Tài Sản Hiện Có</div>
        <div style={{ color: '#FFFBF5', fontSize: '38px', fontWeight: '700', letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.1)', fontFamily: LUX.fontSerif }}>{isAdmin ? formatCurrency(tongTS) : formatCurrencyHide()}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', position: 'relative' }}>
        {[ { label: 'Thực Thu', value: stats.thucThu, color: '#A3E635' }, { label: 'Doanh Thu', value: stats.tongDoanhThu, color: '#FDE047' }, { label: 'Lợi Nhuận', value: stats.thucThu - stats.chi, color: '#FFF' } ].map((item, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '14px', padding: '10px 4px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '9px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px', fontFamily: LUX.fontSans }}>{item.label}</div>
                <div style={{ color: item.color, fontWeight: '700', fontSize: '13px', fontFamily: LUX.fontMono }}>{formatCurrency(item.value)}</div>
            </div>
        ))}
      </div>
    </div>
  )
}

export default function TongQuanPage({ user, viList: extViList, onOpenForm, onOpenPheDuyet }) {
  const [viList, setViList] = useState([])
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({ thucThu: 0, chi: 0, tongDoanhThu: 0, pendingCount: 0, insights: null })
  const [loading, setLoading] = useState(true)
  const [selectedGD, setSelectedGD] = useState(null)
  const isAdmin = user?.vai_tro === 'admin';

  useEffect(() => {
    async function fetchData() {
      try {
        const today = todayISO();
        const now = getNowVN();
        const dayOfWeek = now.getDay(); // 0=CN, 1=T2...
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const monISO = startOfWeek.toISOString().split('T')[0];

        const [viRes, historyRes, dtTodayRes, cpTodayRes, ycRes, dtWeekRes, cpWeekRes] = await Promise.all([
          supabase.from('so_du_vi_thuc_te').select('*'),
          supabase.from('lich_su_giao_dich_tong_hop').select('*').limit(8),
          supabase.from('doanh_thu').select('so_tien, hinh_thuc').eq('ngay', today),
          supabase.from('chi_phi').select('so_tien').eq('ngay', today),
          supabase.from('yeu_cau_chinh_sua').select('id', { count: 'exact' }).eq('trang_thai', 'cho_duyet'),
          supabase.from('doanh_thu').select('so_tien, hinh_thuc').gte('ngay', monISO).lte('ngay', today),
          supabase.from('chi_phi').select('so_tien, danh_muc_id').gte('ngay', monISO).lte('ngay', today),
        ]);
        const { data: viData } = viRes;
        const { data: historyData } = historyRes;
        const { data: dtToday } = dtTodayRes;
        const { data: cpToday } = cpTodayRes;
        const pendingCount = ycRes.count || 0;

        const thucThu = (dtToday || []).filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + r.so_tien, 0) || 0;
        const totalDT = (dtToday || []).reduce((s, r) => s + r.so_tien, 0) || 0;
        const totalChi = (cpToday || []).reduce((s, r) => s + r.so_tien, 0) || 0;

        // Weekly insights
        const thuWeek = (dtWeekRes.data || []).filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + r.so_tien, 0) || 0;
        const totalDTWeek = (dtWeekRes.data || []).reduce((s, r) => s + r.so_tien, 0) || 0;
        const chiWeek = (cpWeekRes.data || []).reduce((s, r) => s + r.so_tien, 0) || 0;
        const loiNhuanWeek = thuWeek - chiWeek;

        let insights = null;
        if (isAdmin) {
          const soDuThapNhat = Math.min(...(viData || []).map(v => v.so_du_hien_tai || 0));
          const tenViThap = (viData || []).find(v => (v.so_du_hien_tai || 0) === soDuThapNhat);
          const chiNhieuNhat = cpWeekRes.data?.length > 0
            ? cpWeekRes.data.reduce((max, c) => c.so_tien > (max?.so_tien || 0) ? c : max, null)
            : null;

          if (chiWeek > thuWeek && thuWeek > 0) {
            insights = { type: 'warning', icon: '⚠️', title: 'Chi tiêu vượt thu nhập tuần này',
              detail: `Tuần này: Thu ${formatCurrency(thuWeek)} vs Chi ${formatCurrency(chiWeek)}. Lợi nhuận âm ${formatCurrency(loiNhuanWeek)}. Cần kiểm soát chi tiêu ngay!` };
          } else if (soDuThapNhat < 1000000 && soDuThapNhat >= 0) {
            insights = { type: 'warning', icon: '⚠️', title: `Số dư ${tenViThap?.ten || 'ví'} đang rất thấp`,
              detail: `Chỉ còn ${formatCurrency(soDuThapNhat)}. Cân nhắc hạn chế chi tiêu từ ví này.` };
          } else if (chiWeek > thuWeek * 0.7 && thuWeek > 0) {
            insights = { type: 'info', icon: '💡', title: 'Chi tiêu đang ở mức cao',
              detail: `Chiếm ${Math.round(chiWeek / thuWeek * 100)}% thu nhập tuần. Nên xem lại các khoản chi không cần thiết.` };
          } else if (chiNhieuNhat && chiWeek > 0) {
            insights = { type: 'success', icon: '✅', title: 'Tài chính tuần này ổn định',
              detail: `Thu ${formatCurrency(thuWeek)} — Lời ${formatCurrency(loiNhuanWeek)}. Tiếp tục duy trì!` };
          }
        }

        setViList(viData || []);
        setHistory(historyData || []);
        setStats({ thucThu, chi: totalChi, tongDoanhThu: totalDT, pendingCount, insights });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: LUX.ink3, fontSize: '13px', fontFamily: LUX.fontSans }}>✨ Chào mừng bạn đến với Hannah Spa...</div>

  return (
    <div style={{ background: LUX.bg, minHeight: '100vh' }}>
      <HeaderTongQuan user={user} viList={viList} stats={stats} />

      <div style={{ padding: '0 16px', marginTop: '-20px', position: 'relative', zIndex: 2 }}>
        {/* Ví tiền */}
        <div style={{ background: LUX.surface2, borderRadius: LUX.radiusLg, padding: '18px 18px', marginBottom: '16px', boxShadow: LUX.shadow, border: `1px solid ${LUX.line}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSerif }}>Ví Tiền & Ngân Hàng</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#86EFAC', boxShadow: '0 0 8px #86EFAC' }} />
          </div>
          <div className="hsms-stagger">
            {(viList || []).map((vi, i) => (
              <div key={vi.id || i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: LUX.radiusSm, background: `linear-gradient(135deg, ${LUX.surface}, ${LUX.line})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{vi.icon}</div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSans }}>{vi.ten}</div>
                      <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{getViDesc(vi)}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: isAdmin ? LUX.taupe : LUX.ink3, fontFamily: LUX.fontMono }}>
                    {isAdmin ? formatCurrency(vi.so_du_hien_tai) : formatCurrencyHide()}
                  </div>
                </div>
                {i < (viList.length - 1) && <div style={{ height: '1px', background: LUX.line }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Phân tích tài chính thông minh */}
        {isAdmin && stats.insights && (
          <div style={{ background: stats.insights.type === 'warning' ? '#FFF9F0' : stats.insights.type === 'info' ? '#F0F4FF' : '#F0FDF4', borderRadius: LUX.radiusLg, padding: '16px 18px', marginBottom: '16px', boxShadow: LUX.shadow, border: `1px solid ${stats.insights.type === 'warning' ? '#F0C080' : stats.insights.type === 'info' ? '#B8C8E8' : '#86D0A8'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>{stats.insights.icon}</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSans, marginBottom: '4px' }}>{stats.insights.title}</div>
                <div style={{ fontSize: '12px', color: LUX.ink2, fontFamily: LUX.fontSans, lineHeight: '1.5' }}>{stats.insights.detail}</div>
              </div>
            </div>
          </div>
        )}

        {/* Thông báo yêu cầu chờ duyệt */}
        {isAdmin && stats.pendingCount > 0 && (
          <div onClick={onOpenPheDuyet} style={{ background: 'linear-gradient(135deg,#FFF9F0,#FFF3E0)', borderRadius: LUX.radiusLg, padding: '16px 18px', marginBottom: '16px', boxShadow: LUX.shadow, border: '2px solid #F0C080', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F0C080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
              🔔
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#8B6914', fontFamily: LUX.fontSans }}>
                {stats.pendingCount} yêu cầu chờ duyệt
              </div>
              <div style={{ fontSize: '12px', color: '#A68A3C', fontFamily: LUX.fontSans }}>
                Nhân viên gửi yêu cầu sửa/xóa giao dịch — vào Admin để duyệt
              </div>
            </div>
            <span style={{ color: '#8B6914', fontSize: '20px' }}>›</span>
          </div>
        )}

        {/* Hoạt động gần đây */}
        <div style={{ background: LUX.surface2, borderRadius: LUX.radiusLg, padding: '18px 18px', marginBottom: '110px', boxShadow: LUX.shadow, border: `1px solid ${LUX.line}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSerif }}>Hoạt Động Gần Đây</span>
            <span style={{ color: LUX.taupe, fontSize: '11px', fontWeight: '600', fontFamily: LUX.fontSans }}>XEM TẤT CẢ</span>
          </div>

          {(history || []).map((item, i) => (
                <div key={item.id || i}>
                    <div onClick={() => setSelectedGD(item)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: LUX.radiusSm, background: item.loai === 'thu' ? '#F0FDF4' : item.loai === 'chi' ? '#FEF2F2' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                {item.loai === 'thu' ? '💰' : item.loai === 'chi' ? '💸' : '🔄'}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '13px', color: LUX.ink, fontFamily: LUX.fontSans }}>{getItemLabel(item)}</div>
                                <div style={{ fontSize: '10px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{getItemDesc(item)}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', fontSize: '13px', color: item.loai === 'thu' ? '#2D7A4F' : item.loai === 'chi' ? '#C0392B' : '#6C3483', fontFamily: LUX.fontMono }}>
                                {item.loai === 'chi' ? '-' : item.loai === 'thu' ? '+' : ''} {formatCurrency(item.so_tien)}
                            </div>
                            <div style={{ fontSize: '9px', color: LUX.ink3, fontFamily: LUX.fontSans }}>
                                {item.created_at ? new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                        </div>
                    </div>
                    {i < (history.length - 1) && <div style={{ height: '1px', background: LUX.line }} />}
                </div>
            ))}
        </div>
      </div>

      {selectedGD && (
        <ChiTietGiaoDich
          giaoDich={selectedGD}
          user={user}
          onBack={() => setSelectedGD(null)}
          onUpdated={() => { setSelectedGD(null); window.location.reload() }}
        />
      )}
    </div>
  )
}
