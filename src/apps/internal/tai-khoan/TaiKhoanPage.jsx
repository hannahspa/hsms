import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { formatCurrency, formatCurrencyHide, todayISO } from '../../../lib/utils'

export default function TaiKhoanPage({ user }) {
  const[viList, setViList] = useState([])
  const [history, setHistory] = useState([])
  const[selectedVi, setSelectedVi] = useState(null)
  
  // STATE CHO LỌC THỜI GIAN (TỪ NGÀY - ĐẾN NGÀY)
  const today = todayISO();
  const firstDayOfMonth = today.slice(0, 8) + '01'; // Lấy ngày mùng 1 của tháng hiện tại
  
  const [startDate, setStartDate] = useState(firstDayOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [showDatePicker, setShowDatePicker] = useState(false) // Trạng thái mở popup chọn ngày

  const [loading, setLoading] = useState(true)
  const isAdmin = user?.vai_tro === 'admin'

  useEffect(() => {
    async function loadData() {
      try {
        const { data: viData } = await supabase.from('so_du_vi_thuc_te').select('*');
        const { data: histData } = await supabase.from('lich_su_giao_dich_tong_hop').select('*').order('ngay', { ascending: false });
        if (viData) setViList(viData);
        if (histData) setHistory(histData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  },[])

  // LOGIC LỌC TỪ NGÀY - ĐẾN NGÀY CHÍNH XÁC
  const filteredHistory = useMemo(() => {
    let base = selectedVi 
        ? history.filter(h => h.danh_muc.includes(selectedVi.ten) || h.dien_giai?.includes(selectedVi.ten))
        : history;
    
    return base.filter(item => {
        return item.ngay >= startDate && item.ngay <= endDate;
    });
  }, [history, selectedVi, startDate, endDate]);

  const stats = useMemo(() => {
    return {
      thu: filteredHistory.filter(h => h.loai === 'thu' && !h.danh_muc.includes('Thẻ Trả Trước')).reduce((s, h) => s + h.so_tien, 0),
      chi: filteredHistory.filter(h => h.loai === 'chi').reduce((s, h) => s + h.so_tien, 0)
    }
  }, [filteredHistory]);

  // HÀM CHỌN NHANH THỜI GIAN
  const applyQuickDate = (type) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const isoToday = d.toISOString().split('T')[0];

    if (type === 'hom_nay') {
        setStartDate(isoToday); setEndDate(isoToday);
    } else if (type === 'hom_qua') {
        const yest = new Date(d); yest.setDate(yest.getDate() - 1);
        const isoYest = yest.toISOString().split('T')[0];
        setStartDate(isoYest); setEndDate(isoYest);
    } else if (type === 'thang_nay') {
        setStartDate(isoToday.slice(0,8) + '01'); setEndDate(isoToday);
    } else if (type === 'thang_truoc') {
        const lastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(d.getFullYear(), d.getMonth(), 0);
        lastMonth.setMinutes(lastMonth.getMinutes() - lastMonth.getTimezoneOffset());
        lastDayOfLastMonth.setMinutes(lastDayOfLastMonth.getMinutes() - lastDayOfLastMonth.getTimezoneOffset());
        
        setStartDate(lastMonth.toISOString().split('T')[0]);
        setEndDate(lastDayOfLastMonth.toISOString().split('T')[0]);
    }
    setShowDatePicker(false);
  }

  // HÀM MÔ PHỎNG BẤM NÚT SỬA
  const handleEditTransaction = (item) => {
      // Tạm thời báo Toast để anh biết nó đã nhận diện đúng Giao dịch
      alert(`Đang phát triển: Mở form sửa giao dịch [${item.danh_muc}] số tiền ${formatCurrency(item.so_tien)}. Lệnh này sẽ mở đè Form Nhập Liệu lên.`);
  }

  const formatDisplayDate = (iso) => {
      if(!iso) return '';
      const [y,m,d] = iso.split('-');
      return `${d}/${m}/${y}`;
  }

  // ==========================================
  // POPUP CHỌN THỜI GIAN (TỪ NGÀY - ĐẾN NGÀY)
  // ==========================================
  const DatePickerModal = () => {
      if (!showDatePicker) return null;
      return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 999 }} onClick={() => setShowDatePicker(false)}>
            <div style={{ background: COLORS.bg, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '24px 20px 40px', animation: 'slideUp 0.2s ease' }} onClick={e => e.stopPropagation()}>
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: COLORS.text }}>Chọn thời gian</h3>
                    <button onClick={() => setShowDatePicker(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: COLORS.textMute }}>✕</button>
                </div>
                
                {/* Các nút chọn nhanh */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                    <button onClick={() => applyQuickDate('hom_nay')} style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, background: COLORS.card, fontWeight: '600', color: COLORS.text }}>Hôm nay</button>
                    <button onClick={() => applyQuickDate('hom_qua')} style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, background: COLORS.card, fontWeight: '600', color: COLORS.text }}>Hôm qua</button>
                    <button onClick={() => applyQuickDate('thang_nay')} style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, background: COLORS.card, fontWeight: '600', color: COLORS.text }}>Tháng này</button>
                    <button onClick={() => applyQuickDate('thang_truoc')} style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, background: COLORS.card, fontWeight: '600', color: COLORS.text }}>Tháng trước</button>
                </div>

                {/* Chọn tùy chỉnh */}
                <div style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textMute, textTransform: 'uppercase', marginBottom: '12px' }}>Hoặc tùy chọn</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ flex: 1, background: COLORS.card, padding: '12px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
                        <div style={{ fontSize: '10px', color: COLORS.textMute, marginBottom: '4px' }}>Từ ngày</div>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: '700', color: COLORS.text }} />
                    </div>
                    <div style={{ color: COLORS.textMute }}>-</div>
                    <div style={{ flex: 1, background: COLORS.card, padding: '12px', borderRadius: '14px', border: `1px solid ${COLORS.border}` }}>
                        <div style={{ fontSize: '10px', color: COLORS.textMute, marginBottom: '4px' }}>Đến ngày</div>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontWeight: '700', color: COLORS.text }} />
                    </div>
                </div>

                <button onClick={() => setShowDatePicker(false)} style={{ width: '100%', padding: '16px', borderRadius: '16px', background: COLORS.grad, color: 'white', fontWeight: '800', border: 'none', fontSize: '15px', cursor: 'pointer' }}>
                    Áp dụng
                </button>
            </div>
        </div>
      )
  }

  // ==========================================
  // GIAO DIỆN 1: CHI TIẾT TÀI KHOẢN (MISA FLOW)
  // ==========================================
  if (selectedVi) return (
    <div style={{ padding: '24px 16px', background: '#FAF7F4', minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        <DatePickerModal />
        
        <button onClick={() => setSelectedVi(null)} style={{ background: 'none', border: 'none', color: COLORS.primary, fontWeight: '800', fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '20px' }}>‹</span> Quay lại
        </button>

        <div style={{ background: COLORS.grad, borderRadius: '24px', padding: '24px', color: 'white', marginBottom: '20px', boxShadow: '0 10px 30px rgba(139,94,60,0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '120px', opacity: '0.1' }}>{selectedVi.icon}</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', position: 'relative' }}>{selectedVi.ten}</h2>
            <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Số dư hiện tại</div>
            <div style={{ fontSize: '38px', fontWeight: '800', letterSpacing: '-1px' }}>{isAdmin ? formatCurrency(selectedVi.so_du_hien_tai) : formatCurrencyHide()}</div>
        </div>

        {/* NÚT MỞ POPUP LỌC THỜI GIAN */}
        <button onClick={() => setShowDatePicker(true)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: COLORS.card, borderRadius: '20px', border: `1px solid ${COLORS.border}`, marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>📅</span>
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', color: COLORS.textMute, fontWeight: '600' }}>Thời gian hiển thị</div>
                    <div style={{ fontWeight: '700', color: COLORS.text, fontSize: '14px' }}>{formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}</div>
                </div>
            </div>
            <span style={{ color: COLORS.primary, fontSize: '20px' }}>›</span>
        </button>

        {/* Thống kê kỳ này */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, background: COLORS.card, padding: '16px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '10px', color: COLORS.textMute, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontWeight: '700' }}>Tổng Thu</div>
                <div style={{ color: COLORS.thu, fontWeight: '800', fontSize: '16px' }}>{formatCurrency(stats.thu)}</div>
            </div>
            <div style={{ flex: 1, background: COLORS.card, padding: '16px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '10px', color: COLORS.textMute, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontWeight: '700' }}>Tổng Chi</div>
                <div style={{ color: COLORS.chi, fontWeight: '800', fontSize: '16px' }}>{formatCurrency(stats.chi)}</div>
            </div>
        </div>

        {/* Danh sách giao dịch chi tiết */}
        <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', border: `1px solid ${COLORS.border}`, boxShadow: '0 8px 24px rgba(139,94,60,0.04)', marginBottom: '100px' }}>
            <div style={{ fontWeight: '800', fontSize: '15px', color: COLORS.text, marginBottom: '16px' }}>Chi tiết giao dịch</div>
            {filteredHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: COLORS.textMute, fontSize: '13px' }}>Không có giao dịch trong khoảng thời gian này</div>
            ) : (
              filteredHistory.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < filteredHistory.length - 1 ? '1.5px solid #F8F3F0' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: item.loai === 'thu' ? '#F0FDF4' : item.loai === 'chi' ? '#FEF2F2' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                              {item.loai === 'thu' ? '💰' : item.loai === 'chi' ? '💸' : '🔄'}
                          </div>
                          <div>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>{item.danh_muc}</div>
                              <div style={{ fontSize: '11px', color: COLORS.textMute, marginTop: '2px' }}>{formatDisplayDate(item.ngay)} • {item.dien_giai || 'Giao dịch'}</div>
                          </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: item.loai === 'thu' ? COLORS.thu : item.loai === 'chi' ? COLORS.chi : COLORS.chuyenKhoan, textAlign: 'right' }}>
                              {item.loai === 'chi' ? '-' : item.loai === 'thu' ? '+' : ''} {formatCurrency(item.so_tien)}
                          </div>
                          {/* NÚT CHỈNH SỬA (EDIT) */}
                          <button onClick={() => handleEditTransaction(item)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#F5F5F5', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textSub, transition: 'background 0.2s' }}>
                              ✏️
                          </button>
                      </div>
                  </div>
              ))
            )}
        </div>
    </div>
  )

  // ==========================================
  // GIAO DIỆN 2: DANH SÁCH CÁC VÍ (MẶC ĐỊNH)
  // ==========================================
  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: COLORS.textMute, fontSize: '14px' }}>✨ Đang tải dữ liệu tài khoản...</div>

  return (
    <div style={{ padding: '24px 16px', background: '#FAF7F4', minHeight: '100vh', animation: 'fadeIn 0.3s ease' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: COLORS.text, marginBottom: '24px' }}>Tài Khoản</h2>
        <div style={{ display: 'grid', gap: '16px', paddingBottom: '100px' }}>
            {viList.map(vi => (
                <button key={vi.id} onClick={() => setSelectedVi(vi)} style={{ width: '100%', padding: '24px 20px', background: COLORS.card, borderRadius: '24px', border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 10px 30px rgba(139,94,60,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #FFF, #F5EDE6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>{vi.icon}</div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '800', fontSize: '16px', color: COLORS.text }}>{vi.ten}</div>
                            <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '4px' }}>Xem chi tiết giao dịch</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', fontSize: '16px', color: isAdmin ? COLORS.primary : COLORS.textMute }}>{isAdmin ? formatCurrency(vi.so_du_hien_tai) : formatCurrencyHide()}</div>
                        <div style={{ fontSize: '20px', color: COLORS.primary, marginTop: '2px' }}>›</div>
                    </div>
                </button>
            ))}
        </div>
    </div>
  )
}