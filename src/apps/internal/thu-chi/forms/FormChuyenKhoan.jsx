// TODO: Code Form Chuyển Khoản Nội Bộ (bước tiếp theo)
export default function FormChuyenKhoan({ viList, onClose, onSaved }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 500 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '420px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1A1209' }}>Chuyển Khoản Nội Bộ</div>
        <div style={{ fontSize: '13px', color: '#B8A898', marginTop: '4px' }}>Đang phát triển...</div>
        <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '12px', border: 'none', background: '#A0714F', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Đóng</button>
      </div>
    </div>
  )
}
