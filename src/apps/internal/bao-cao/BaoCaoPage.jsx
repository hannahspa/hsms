import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../constants/colors'
import { formatCurrency, todayISO } from '../../../lib/utils'

export default function BaoCaoPage() {
  const[loading, setLoading] = useState(true)
  
  // Quản lý tháng đang xem (Mặc định là tháng hiện tại)
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Dữ liệu thô từ Database
  const [doanhThu, setDoanhThu] = useState([])
  const[chiPhi, setChiPhi] = useState([])
  const [danhMuc, setDanhMuc] = useState([])

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // getMonth() trả về 0-11

  // 1. TẢI DỮ LIỆU MỖI KHI ĐỔI THÁNG
  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);
      try {
        // Tính ngày đầu tháng và ngày cuối tháng
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        
        // Format ISO yyyy-mm-dd để query Supabase
        const startStr = firstDay.toISOString().split('T')[0];
        const endStr = lastDay.toISOString().split('T')[0];

        // Lấy Doanh Thu trong tháng
        const { data: dtData } = await supabase.from('doanh_thu')
            .select('*').gte('ngay', startStr).lte('ngay', endStr);
            
        // Lấy Chi Phí trong tháng
        const { data: cpData } = await supabase.from('chi_phi')
            .select('*').gte('ngay', startStr).lte('ngay', endStr);
            
        // Lấy Danh mục để map Tên nhóm
        const { data: dmData } = await supabase.from('danh_muc_chi_phi').select('*');

        setDoanhThu(dtData || []);
        setChiPhi(cpData ||[]);
        setDanhMuc(dmData ||[]);
      } catch (error) {
        console.error("Lỗi tải báo cáo:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReportData();
  }, [year, month]);

  // 2. XỬ LÝ SỐ LIỆU (TÍNH TOÁN)
  const stats = useMemo(() => {
    // Thực thu (Bỏ thẻ trả trước)
    const thucThu = doanhThu.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + r.so_tien, 0);
    // Tổng chi
    const tongChi = chiPhi.reduce((s, r) => s + r.so_tien, 0);
    // Lợi nhuận
    const loiNhuan = thucThu - tongChi;

    // Phân tích chi phí theo Nhóm (Tìm parent_id)
    const chiPhiTheoNhom = {};
    chiPhi.forEach(cp => {
        // Tìm hạng mục con
        const child = danhMuc.find(d => d.id === cp.danh_muc_id);
        // Tìm nhóm cha
        const parent = child ? danhMuc.find(d => d.id === child.parent_id) : null;
        const groupName = parent ? parent.ten : 'Khác';
        const groupIcon = parent ? parent.icon : '🏷️';
        
        if (!chiPhiTheoNhom[groupName]) {
            chiPhiTheoNhom[groupName] = { icon: groupIcon, tong: 0 };
        }
        chiPhiTheoNhom[groupName].tong += cp.so_tien;
    });

    // Sắp xếp nhóm chi phí từ cao xuống thấp
    const chiPhiSorted = Object.entries(chiPhiTheoNhom)
        .map(([name, data]) => ({ name, icon: data.icon, tong: data.tong }))
        .sort((a, b) => b.tong - a.tong);

    return { thucThu, tongChi, loiNhuan, chiPhiSorted };
  },[doanhThu, chiPhi, danhMuc]);

  // HÀM CHUYỂN THÁNG
  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month, 1));

  // TÍNH % CHO BIỂU ĐỒ BAR THU/CHI
  const totalMoney = stats.thucThu + stats.tongChi;
  const thuPercent = totalMoney > 0 ? (stats.thucThu / totalMoney) * 100 : 50;
  const chiPercent = totalMoney > 0 ? (stats.tongChi / totalMoney) * 100 : 50;

  return (
    <div style={{ padding: '24px 16px', background: '#FAF7F4', minHeight: '100vh', animation: 'fadeIn 0.3s ease', paddingBottom: '100px' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* HEADER & CHỌN THÁNG */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: COLORS.text }}>Báo Cáo</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', background: COLORS.card, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '4px' }}>
            <button onClick={prevMonth} style={{ width: '32px', height: '32px', borderRadius: '12px', border: 'none', background: 'transparent', color: COLORS.textSub, fontSize: '18px', cursor: 'pointer' }}>‹</button>
            <div style={{ padding: '0 12px', fontWeight: '700', fontSize: '14px', color: COLORS.primary }}>
                Tháng {month}/{year}
            </div>
            <button onClick={nextMonth} style={{ width: '32px', height: '32px', borderRadius: '12px', border: 'none', background: 'transparent', color: COLORS.textSub, fontSize: '18px', cursor: 'pointer' }}>›</button>
        </div>
      </div>

      {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: COLORS.textMute, fontSize: '14px' }}>📊 Đang tổng hợp số liệu...</div>
      ) : (
        <>
          {/* KHỐI TỔNG QUAN LỢI NHUẬN (THẺ TÍN DỤNG STYLE) */}
          <div style={{ background: COLORS.grad, borderRadius: '24px', padding: '24px', color: 'white', marginBottom: '24px', boxShadow: '0 10px 30px rgba(139,94,60,0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '100px', opacity: '0.1' }}>📈</div>
              
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8, marginBottom: '4px', fontWeight: '600' }}>Lợi Nhuận Gộp</div>
              <div style={{ fontSize: '38px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '20px' }}>
                  {formatCurrency(stats.loiNhuan)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '16px' }}>
                  <div>
                      <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '2px' }}>THỰC THU</div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: '#A3E635' }}>{formatCurrency(stats.thucThu)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '2px' }}>TỔNG CHI</div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: '#FCA5A5' }}>{formatCurrency(stats.tongChi)}</div>
                  </div>
              </div>
          </div>

          {/* BIỂU ĐỒ SỨC KHỎE TÀI CHÍNH (CSS THUẦN) */}
          <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', marginBottom: '24px', boxShadow: '0 8px 24px rgba(139,94,60,0.06)', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight: '800', fontSize: '15px', color: COLORS.text, marginBottom: '16px' }}>Tỉ trọng Thu / Chi</div>
              
              {/* Thanh Progress Bar */}
              <div style={{ height: '12px', width: '100%', borderRadius: '10px', display: 'flex', overflow: 'hidden', marginBottom: '12px', background: '#F5F5F5' }}>
                  <div style={{ width: `${thuPercent}%`, background: COLORS.thu, transition: 'width 0.5s ease' }} />
                  <div style={{ width: `${chiPercent}%`, background: COLORS.chi, transition: 'width 0.5s ease' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700' }}>
                  <span style={{ color: COLORS.thu }}>Thu ({thuPercent.toFixed(1)}%)</span>
                  <span style={{ color: COLORS.chi }}>Chi ({chiPercent.toFixed(1)}%)</span>
              </div>
          </div>

          {/* PHÂN TÍCH CHI TIẾT CÁC KHOẢN CHI (EXPENSE BREAKDOWN) */}
          <div style={{ background: COLORS.card, borderRadius: '24px', padding: '20px', boxShadow: '0 8px 24px rgba(139,94,60,0.06)', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight: '800', fontSize: '15px', color: COLORS.text, marginBottom: '16px' }}>Phân tích Chi phí</div>
              
              {stats.chiPhiSorted.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMute, fontSize: '13px' }}>Không có khoản chi nào trong tháng này</div>
              ) : (
                  stats.chiPhiSorted.map((item, i) => {
                      // Tính % của nhóm chi phí này so với tổng chi
                      const percent = (item.tong / stats.tongChi) * 100;
                      return (
                          <div key={i} style={{ marginBottom: i < stats.chiPhiSorted.length - 1 ? '16px' : '0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ fontSize: '16px' }}>{item.icon}</div>
                                      <div style={{ fontWeight: '700', fontSize: '14px', color: COLORS.text }}>{item.name}</div>
                                  </div>
                                  <div style={{ fontWeight: '700', fontSize: '14px', color: COLORS.chi }}>{formatCurrency(item.tong)}</div>
                              </div>
                              
                              {/* Thanh Progress bar mini cho từng khoản */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ flex: 1, height: '6px', background: '#F8F3F0', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${percent}%`, height: '100%', background: COLORS.primary, borderRadius: '4px' }} />
                                  </div>
                                  <div style={{ fontSize: '10px', color: COLORS.textMute, fontWeight: '700', width: '30px', textAlign: 'right' }}>
                                      {percent.toFixed(0)}%
                                  </div>
                              </div>
                          </div>
                      )
                  })
              )}
          </div>
        </>
      )}
    </div>
  )
}