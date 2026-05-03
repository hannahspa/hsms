import os

FILE_CONTENT = """import { AuthProvider } from '../../context/AuthContext'
import { AppProvider }  from '../../context/AppContext'
import AdminNhanSuPage from './nhan-su/AdminNhanSuPage'
import { COLORS } from '../../constants/colors'

export default function AdminApp() {
  const path = window.location.pathname

  return (
    <AuthProvider>
      <AppProvider>
        {path.startsWith('/admin/nhan-su') ? (
          <AdminNhanSuPage />
        ) : (
          <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '40px 20px', fontFamily: 'sans-serif' }}>
            <h2 style={{ color: COLORS.text, fontWeight: '800' }}>👑 Cổng Quản Trị • Cao Quốc Nam</h2>
            <div style={{ color: COLORS.textMute, fontSize: '14px', marginBottom: '32px' }}>
              Vui lòng chọn phân hệ muốn quản lý:
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button onClick={() => window.location.href = '/admin/nhan-su'} 
                style={{ padding: '20px', background: COLORS.grad, color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: COLORS.shadow }}>
                <span style={{ fontSize: '24px' }}>👥</span> Quản Lý Nhân Sự
              </button>
              
              <button onClick={() => window.location.href = '/app'} 
                style={{ padding: '20px', background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '16px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: COLORS.shadow }}>
                <span style={{ fontSize: '24px' }}>💰</span> Quản Lý Thu Chi (Lễ Tân Nhập)
              </button>
            </div>
          </div>
        )}
      </AppProvider>
    </AuthProvider>
  )
}
"""

def run():
    filepath = "src/apps/admin/AdminApp.jsx".replace("/", os.sep)
    
    # Ghi đè file với chuẩn UTF-8
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(FILE_CONTENT)
        
    print(f"\n{'═'*55}")
    print("  ✅ Đã sửa và cập nhật AdminApp.jsx chuẩn UTF-8!")
    print(f"{'═'*55}\n")

if __name__ == "__main__":
    run()