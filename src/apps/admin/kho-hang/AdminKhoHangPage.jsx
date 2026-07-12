// ═══════════════════════════════════════════════════════════════════════════
// Kho Hàng — trang chính: Tổng Quan + Kiểm Kho + router tab
// Tách từ AdminKhoHangPage.jsx (11/07/2026) — code giữ nguyên, chỉ chia file
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { COLORS } from '../../../constants/colors'
import { todayISO } from '../../../lib/utils'

import { TabSanPham } from './KhoSanPhamTab'
import { TabGiaoDich } from './KhoGiaoDichTab'
import { TabBaoCao } from './KhoBaoCaoTab'
import { LOAI_GD, LOAI_SP, donGiaCoSo, fmt, fmtSL, fmtTonQD, inp } from './khoShared'

// ══════════════════════════════════════════════════════════════════════════════
// KIỂM KHO MODAL
// ══════════════════════════════════════════════════════════════════════════════
function KiemKhoModal({ products, userId, onSave, onClose, showToast }) {
  const [counts, setCounts] = useState({})
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const active = products.filter(p => p.is_active)
  const filtered = active.filter(p =>
    !search || p.ten.toLowerCase().includes(search.toLowerCase())
  )

  const changed = active.filter(p =>
    counts[p.id] !== undefined && counts[p.id] !== '' &&
    +counts[p.id] !== Number(p.ton_kho)
  )

  const handleSubmit = async () => {
    if (changed.length === 0) { onClose(); return }
    setSaving(true)
    const kiemKhoId = crypto.randomUUID()

    const gds = changed.map(p => ({
      san_pham_id: p.id,
      loai: 'dieu_chinh',
      so_luong: Math.max(0.001, Math.abs(+counts[p.id] - Number(p.ton_kho))),
      gia_don_vi: 0,
      ghi_chu: `Kiểm kho ${todayISO()}: DB=${fmtSL(p.ton_kho, p.don_vi)} → Thực=${fmtSL(+counts[p.id], p.don_vi)}`,
      lien_quan_id: kiemKhoId,
      ngay: todayISO(),
      nguoi_thuc_hien: userId || null,
    }))

    const { error } = await supabase.from('kho_giao_dich').insert(gds)
    if (error) { setSaving(false); showToast('❌ ' + error.message); return }

    await Promise.all(changed.map(p =>
      supabase.from('kho_san_pham').update({ ton_kho: +counts[p.id] }).eq('id', p.id)
    ))
    setSaving(false)
    showToast(`✅ Đã cập nhật ${changed.length} sản phẩm`)
    onSave()
  }

  return createPortal((
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--side-w, 248px)', background: 'white', zIndex: 300,
      display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ background: COLORS.grad, padding: '44px 20px 16px',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>
          ←
        </button>
        <div>
          <div style={{ color: 'white', fontWeight: '800', fontSize: '18px' }}>🔍 Kiểm Kho</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            Nhập số thực tế → hệ thống tự điều chỉnh
          </div>
        </div>
        {changed.length > 0 && (
          <div style={{ marginLeft: 'auto', background: '#C0392B', color: 'white',
            padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '800' }}>
            {changed.length} thay đổi
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <input style={{ ...inp, padding: '9px 14px' }}
          placeholder="🔍 Tìm sản phẩm..." value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(p => {
          const loai = LOAI_SP[p.loai] || {}
          const newVal = counts[p.id]
          const hasVal = newVal !== undefined && newVal !== ''
          const delta = hasVal ? +newVal - Number(p.ton_kho) : 0
          const changed = hasVal && delta !== 0
          return (
            <div key={p.id} style={{ background: changed ? '#FFF8E1' : 'white',
              border: `1px solid ${changed ? '#FFE082' : COLORS.border}`,
              borderRadius: '12px', padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px',
                background: loai.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {loai.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: COLORS.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.ten}
                </div>
                <div style={{ fontSize: '11px', color: COLORS.textMute }}>
                  Hệ thống: <strong style={{ color: COLORS.primary }}>{fmtTonQD(p)}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {changed && (
                  <span style={{ fontSize: '12px', fontWeight: '800',
                    color: delta > 0 ? '#2D7A4F' : '#C0392B' }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </span>
                )}
                <input
                  type="number" step="0.1" min="0"
                  style={{ ...inp, width: '90px', padding: '8px 10px',
                    background: changed ? 'white' : COLORS.bg,
                    borderColor: changed ? '#FFE082' : COLORS.border }}
                  placeholder={String(Number(p.ton_kho))}
                  value={counts[p.id] ?? ''}
                  onChange={e => setCounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', background: 'white',
        borderTop: `1px solid ${COLORS.border}`, flexShrink: 0,
        display: 'flex', gap: '10px' }}>
        <button onClick={onClose}
          style={{ flex: 1, padding: '13px', background: 'white',
            border: `1px solid ${COLORS.border}`, borderRadius: '12px',
            fontWeight: '700', fontSize: '14px', cursor: 'pointer', color: COLORS.textSub }}>
          Hủy
        </button>
        <button onClick={handleSubmit} disabled={saving || changed.length === 0}
          style={{ flex: 2, padding: '13px', background: changed.length ? COLORS.grad : '#EEE',
            color: changed.length ? 'white' : COLORS.textMute, border: 'none',
            borderRadius: '12px', fontWeight: '800', fontSize: '14px',
            cursor: changed.length && !saving ? 'pointer' : 'default' }}>
          {saving ? 'Đang lưu...' : changed.length
            ? `✅ Cập nhật ${changed.length} sản phẩm`
            : 'Chưa có thay đổi'}
        </button>
      </div>
    </div>
  ), document.body)
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: TỔNG QUAN
// ══════════════════════════════════════════════════════════════════════════════
function TabTongQuan({ products, transactions, onNavigate, onKiemKho }) {
  const active = products.filter(p => p.is_active)
  const sapHet  = active.filter(p => Number(p.ton_kho) <= Number(p.canh_bao_ton) && Number(p.canh_bao_ton) > 0)
  const hetHang = active.filter(p => Number(p.ton_kho) <= 0)
  // Giá trị kho = toàn bộ SP (tồn cơ sở × giá nhập/đơn vị cơ sở) → tổng tiền quy đổi trong kho
  const giaTriKho = active
    .reduce((s, p) => s + Number(p.ton_kho) * donGiaCoSo(p), 0)
  const spMap = Object.fromEntries(products.map(p => [p.id, p]))
  const recent = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {[
          { label: 'Tổng sản phẩm', val: active.length, icon: '📦', color: COLORS.primary },
          { label: 'Giá trị kho',   val: fmt(giaTriKho), icon: '💰', color: '#2D7A4F' },
          { label: 'Sắp hết hàng',  val: sapHet.length,  icon: '⚠️', color: '#E67E22',
            action: sapHet.length > 0, onClick: () => onNavigate('san-pham') },
          { label: 'Hết hàng',      val: hetHang.length, icon: '🚨', color: '#C0392B',
            action: hetHang.length > 0, onClick: () => onNavigate('san-pham') },
        ].map(s => (
          <div key={s.label} onClick={s.action ? s.onClick : undefined}
            style={{ background: 'white', borderRadius: '14px', padding: '16px',
              border: `1px solid ${COLORS.border}`, boxShadow: COLORS.shadow,
              cursor: s.action ? 'pointer' : 'default' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '12px', color: COLORS.textMute, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Kiểm kho button */}
      <button onClick={onKiemKho}
        style={{ width: '100%', padding: '14px', background: 'white',
          border: `2px dashed ${COLORS.border}`, borderRadius: '14px',
          cursor: 'pointer', fontWeight: '800', fontSize: '14px', color: COLORS.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        🔍 Thực Hiện Kiểm Kho
        <span style={{ fontSize: '11px', fontWeight: '600', color: COLORS.textMute }}>
          Điều chỉnh số tồn thực tế
        </span>
      </button>

      {/* Cảnh báo sắp hết */}
      {sapHet.length > 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontWeight: '800', fontSize: '13px', color: '#7B5800', marginBottom: '10px' }}>
            ⚠️ {sapHet.length} sản phẩm cần nhập thêm
          </div>
          {sapHet.map(p => {
            const loai = LOAI_SP[p.loai] || {}
            const pct  = p.canh_bao_ton > 0
              ? Math.min(100, Math.max(0, (p.ton_kho / p.canh_bao_ton) * 100)) : 0
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px' }}>{loai.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>{p.ten}</div>
                  <div style={{ height: '4px', background: '#EEE', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{ height: '100%', borderRadius: '2px',
                      background: p.ton_kho <= 0 ? '#C0392B' : '#E67E22',
                      width: `${pct}%`, transition: 'width .3s' }} />
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700',
                  color: p.ton_kho <= 0 ? '#C0392B' : '#E67E22', whiteSpace: 'nowrap' }}>
                  {fmtSL(p.ton_kho, p.don_vi)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Giao dịch gần đây */}
      <div>
        <div style={{ fontWeight: '800', fontSize: '13px', color: COLORS.text, marginBottom: '10px' }}>
          Giao dịch gần đây
        </div>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', color: COLORS.textMute, padding: '20px', fontSize: '13px' }}>
            Chưa có giao dịch nào
          </div>
        ) : recent.map(gd => {
          const sp = spMap[gd.san_pham_id]
          const loaiGD = LOAI_GD[gd.loai] || {}
          return (
            <div key={gd.id} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px',
              border: `1px solid ${COLORS.border}`, display: 'flex', gap: '10px',
              alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{loaiGD.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text }}>{sp?.ten || '—'}</div>
                <div style={{ fontSize: '11px', color: COLORS.textMute }}>{loaiGD.label} · {gd.ngay}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', textAlign: 'right',
                color: loaiGD.sign > 0 ? '#2D7A4F' : loaiGD.sign < 0 ? '#C0392B' : '#1A5276' }}>
                {loaiGD.sign > 0 ? '+' : loaiGD.sign < 0 ? '-' : '±'}{fmtSL(gd.so_luong, sp?.don_vi)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const KHO_PATH_TAB = {
  '/admin/kho-hang':           'tong-quan',
  '/admin/kho-hang/san-pham':  'san-pham',
  '/admin/kho-hang/giao-dich': 'giao-dich',
  '/admin/kho-hang/bao-cao':   'bao-cao',
}

export default function AdminKhoHangPage() {
  const { user } = useAuth()
  const [tab, setTab]                   = useState(() => KHO_PATH_TAB[window.location.pathname] || 'tong-quan')
  const [products, setProducts]         = useState([])
  const [transactions, setTransactions] = useState([])
  const [danhMucKho, setDanhMucKho]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [toast, setToast]               = useState('')
  const [showKiemKho, setShowKiemKho]   = useState(() => window.location.pathname === '/admin/kho-hang/kiem-kho')

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(''), 2800)
  }, [])

  const load = useCallback(async () => {
    const [{ data: sp }, { data: gd }, { data: dm }] = await Promise.all([
      supabase.from('kho_san_pham').select('*').order('loai').order('ten'),
      supabase.from('kho_giao_dich').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('danh_muc_chi_phi').select('id,ten,parent_id')
        .eq('is_active', true).not('parent_id', 'is', null),
    ])
    setProducts(sp || [])
    setTransactions(gd || [])
    setDanhMucKho(dm || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])


  // Stats từ data đã tải
  const activeProducts = products.filter(p => p.is_active)
  const lowStockCount  = activeProducts.filter(p => p.ton_kho <= (p.canh_bao_ton || 0)).length
  const gtKho = activeProducts.reduce((s, p) => s + (p.ton_kho || 0) * (p.gia_nhap || 0), 0)

  return (
    <>
      {/* mod-head */}
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Kho Hàng</div>
          <div className="sub">
            {activeProducts.length} sản phẩm · Mỹ phẩm · Vật tư · Chiết rót
            {lowStockCount > 0 && <span style={{ color: 'var(--chi)', marginLeft: 8 }}>· {lowStockCount} cần nhập</span>}
          </div>
        </div>
      </div>

      {/* Strip KPIs */}
      <div className="strip" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="it">
          <div className="l">Sản Phẩm Active</div>
          <div className="v">{activeProducts.length}<span className="cur"> SP</span></div>
        </div>
        <div className="it">
          <div className="l">Cần Nhập Kho</div>
          <div className="v" style={{ color: lowStockCount > 0 ? 'var(--chi)' : 'var(--ink)' }}>
            {lowStockCount}
            <span className="cur"> SP</span>
          </div>
        </div>
        <div className="it">
          <div className="l">GT Hàng Trong Kho</div>
          <div className="v" style={{ fontSize: gtKho > 0 ? undefined : 'var(--ink3)' }}>
            {gtKho > 0
              ? <>{(gtKho / 1e6).toFixed(1)}<span className="cur"> tr</span></>
              : '—'
            }
          </div>
        </div>
        <div className="it">
          <div className="l">Giao Dịch Gần Đây</div>
          <div className="v">{transactions.length}<span className="cur"> GD</span></div>
        </div>
      </div>

      {/* Content tabs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ink3)' }}>
          <div style={{
            width: 44, height: 72, margin: '0 auto 16px',
            background: 'var(--grad-arch)', borderRadius: '999px 999px 12px 12px', opacity: .3,
            animation: 'floatGlow 2.5s ease-in-out infinite alternate',
          }} />
          Đang tải kho hàng...
        </div>
      ) : (
        <>
          {tab === 'tong-quan' && (
            <TabTongQuan products={products} transactions={transactions}
              onNavigate={setTab} onKiemKho={() => setShowKiemKho(true)} />
          )}
          {tab === 'san-pham' && (
            <TabSanPham products={products} onReload={load} showToast={showToast} />
          )}
          {tab === 'giao-dich' && (
            <TabGiaoDich products={products} transactions={transactions}
              userId={user?.id} danhMucKho={danhMucKho} onReload={load} showToast={showToast} />
          )}
          {tab === 'bao-cao' && (
            <TabBaoCao products={products} />
          )}
        </>
      )}

      {/* Kiểm kho modal */}
      {showKiemKho && (
        <KiemKhoModal
          products={products}
          userId={user?.id}
          onSave={() => { setShowKiemKho(false); load(); if (window.location.pathname === '/admin/kho-hang/kiem-kho') window.history.replaceState(null, '', '/admin/kho-hang') }}
          onClose={() => { setShowKiemKho(false); if (window.location.pathname === '/admin/kho-hang/kiem-kho') window.history.replaceState(null, '', '/admin/kho-hang') }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--espresso)', color: '#f5ede0', padding: '12px 24px',
          borderRadius: 999, fontWeight: 700, fontSize: 14, zIndex: 999,
          boxShadow: 'var(--sh-3)', whiteSpace: 'nowrap', maxWidth: '90vw',
          animation: 'fadeUp .3s var(--ease-out) both',
        }}>
          {toast}
        </div>
      )}
    </>
  )
}
