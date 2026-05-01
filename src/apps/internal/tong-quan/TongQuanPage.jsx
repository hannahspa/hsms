import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { formatCurrency, formatCurrencyHide, todayISO } from '../../../lib/utils'

function HeaderTongQuan({ user, viList = [], stats }) {
  const isAdmin = user?.vai_tro === 'admin'
  const tongTS  = (viList || []).reduce((s, v) => s + (v.so_du_hien_tai || 0), 0)
  const greeting = new Date().getHours() < 12 ? 'Chào buổi sáng' : new Date().getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div style={{ background: COLORS.grad, padding: '30px 22px 50px', position: 'relative', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500&display=swap');`}</style>
      <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)', borderRadius: '50%' }} />
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', marginBottom: '18px' }}>
          <img src="/logo.png" alt="Hannah Spa" style={{ width: '180px', height: 'auto', filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.1))', objectFit: 'contain' }} />
          <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '17px', fontFamily: "'Dancing Script', cursive", marginTop: '4px', letterSpacing: '0.5px' }}>Giữ Mãi Nét Thanh Xuân Của Bạn</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '22px', position: 'relative' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{isAdmin ? '👑' : '💁'}</div>
          <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>{greeting},</div>
              <div style={{ color: '#FFFBF5', fontWeight: '700', fontSize: '15px' }}>{user?.ten || 'Admin'}</div>
          </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '25px', position: 'relative' }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Tổng Tài Sản Hiện Có</div>
        <div style={{ color: '#FFFBF5', fontSize: '38px', fontWeight: '700', letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>{isAdmin ? formatCurrency(tongTS) : formatCurrencyHide()}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', position: 'relative' }}>
        {[ { label: 'Thực Thu', value: stats.thucThu, color: '#A3E635' }, { label: 'Doanh Thu', value: stats.tongDoanhThu, color: '#FDE047' }, { label: 'Lợi Nhuận', value: stats.thucThu - stats.chi, color: '#FFF' } ].map((item, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '14px', padding: '10px 4px', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '9px', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>{item.label}</div>
                <div style={{ color: item.color, fontWeight: '700', fontSize: '13px' }}>{formatCurrency(item.value)}</div>
            </div>
        ))}
      </div>
    </div>
  )
}

export default function TongQuanPage({ user }) {
  const [viList, setViList] = useState([])
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({ thucThu: 0, chi: 0, tongDoanhThu: 0 })
  const [loading, setLoading] = useState(true)
  const isAdmin = user?.vai_tro === 'admin';

  useEffect(() => {
    async function fetchData() {
      try {
        const today = todayISO();
        const { data: viData } = await supabase.from('so_du_vi_thuc_te').select('*');
        const { data: historyData } = await supabase.from('lich_su_giao_dich_tong_hop').select('*').limit(8);
        const { data: dtToday } = await supabase.from('doanh_thu').select('so_tien, hinh_thuc').eq('ngay', today);
        const { data: cpToday } = await supabase.from('chi_phi').select('so_tien').eq('ngay', today);

        const thucThu = (dtToday || []).filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + r.so_tien, 0) || 0;
        const totalDT = (dtToday || []).reduce((s, r) => s + r.so_tien, 0) || 0; 
        const totalChi = (cpToday || []).reduce((s, r) => s + r.so_tien, 0) || 0;

        setViList(viData || []);
        setHistory(historyData || []);
        setStats({ thucThu, chi: totalChi, tongDoanhThu: totalDT });
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: COLORS.textMute, fontStyle: 'italic', fontSize: '13px' }}>✨ Chào mừng bạn đến với Hannah Spa...</div>

  return (
    <div style={{ background: '#FAF7F4', minHeight: '100vh' }}>
      <HeaderTongQuan user={user} viList={viList} stats={stats} />
      
      <div style={{ padding: '0 16px', marginTop: '-20px', position: 'relative', zIndex: 2 }}>
        <div style={{ background: COLORS.card, borderRadius: '20px', padding: '18px 18px', marginBottom: '16px', boxShadow: '0 8px 24px rgba(139,94,60,0.06)', border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>Ví Tiền & Ngân Hàng</span>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#86EFAC', boxShadow: '0 0 8px #86EFAC' }} />
          </div>
          {(viList || []).map((vi, i) => (
            <div key={vi.id || i}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #FDFBF9, #F5EDE6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{vi.icon}</div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: COLORS.text }}>{vi.ten}</div>
                    <div style={{ fontSize: '11px', color: COLORS.textMute }}>{vi.ten === 'Tiền Mặt' ? 'Tại quầy' : 'Ngân hàng'}</div>
                  </div>
                </div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: isAdmin ? COLORS.primary : COLORS.textMute }}>
                  {isAdmin ? formatCurrency(vi.so_du_hien_tai) : formatCurrencyHide()}
                </div>
              </div>
              {i < (viList.length - 1) && <div style={{ height: '1px', background: '#F0E6DD' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: COLORS.card, borderRadius: '20px', padding: '18px 18px', marginBottom: '110px', boxShadow: '0 8px 24px rgba(139,94,60,0.06)', border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>Hoạt Động Gần Đây</span>
            <span style={{ color: COLORS.primary, fontSize: '11px', fontWeight: '700' }}>XEM TẤT CẢ</span>
          </div>
          
          {(history || []).map((item, i) => (
                <div key={item.id || i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: item.loai === 'thu' ? '#F0FDF4' : item.loai === 'chi' ? '#FEF2F2' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                                {item.loai === 'thu' ? '💰' : item.loai === 'chi' ? '💸' : '🔄'}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '13px', color: COLORS.text }}>{item.danh_muc}</div>
                                <div style={{ fontSize: '10px', color: COLORS.textMute }}>{item.dien_giai || 'Giao dịch hệ thống'}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', fontSize: '13px', color: item.loai === 'thu' ? '#2D7A4F' : item.loai === 'chi' ? '#C0392B' : COLORS.chuyenKhoan }}>
                                {item.loai === 'chi' ? '-' : item.loai === 'thu' ? '+' : ''} {formatCurrency(item.so_tien)}
                            </div>
                            <div style={{ fontSize: '9px', color: '#B8A898' }}>
                                {item.created_at ? new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                        </div>
                    </div>
                    {i < (history.length - 1) && <div style={{ height: '1px', background: '#F8F3F0' }} />}
                </div>
            ))}
        </div>
      </div>
    </div>
  )
}