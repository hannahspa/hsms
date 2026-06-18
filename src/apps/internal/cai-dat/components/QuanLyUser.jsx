import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { LUX } from '../../../../constants/lux'

const VAI_TRO_OPTS = [
  { value: 'admin',  label: 'Admin',       color: '#C9A96E', bg: '#FFF8F0' },
  { value: 'le_tan', label: 'Lễ Tân',      color: '#5a6a4a', bg: '#eef2e7' },
  { value: 'ktv',    label: 'KTV',         color: '#7D5A3C', bg: '#f5e8d4' },
  { value: 'tap_vu', label: 'Tạp Vụ',      color: '#8B7355', bg: '#F0EBE6' },
]

function getInitials(name) {
  const parts = (name || '').trim().split(' ')
  return parts[parts.length - 1]?.charAt(0)?.toUpperCase() || '?'
}

async function callAdminUsers(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  })
  if (error) throw new Error(data?.error || error.message || 'Khong goi duoc admin-users')
  if (!data?.ok) throw new Error(data?.error || 'Thao tac quan ly user that bai')
  return data
}

export default function QuanLyUser({ onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editSheet, setEditSheet] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('vai_tro').order('ho_ten')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const openAdd = () => setEditSheet({
    mode: 'add',
    user: { ho_ten: '', email: '', vai_tro: 'ktv', password: '' },
  })

  const openEdit = (user) => setEditSheet({ mode: 'edit', user: { ...user, password: '' } })

  const handleSave = async () => {
    const { mode, user } = editSheet
    if (!user.ho_ten?.trim()) { showToast('Vui lòng nhập họ tên', 'error'); return }
    if (mode === 'add' && !user.email?.trim()) { showToast('Vui lòng nhập email', 'error'); return }
    if (mode === 'add' && (!user.password || user.password.length < 6)) { showToast('Mật khẩu ít nhất 6 ký tự', 'error'); return }

    setSaving(true)
    try {
      if (mode === 'add') {
        await callAdminUsers('create', {
          email: user.email.trim(),
          password: user.password,
          ho_ten: user.ho_ten.trim(),
          vai_tro: user.vai_tro,
        })
        showToast('✓ Đã tạo user mới')
      } else {
        await callAdminUsers('update', {
          id: user.id,
          ho_ten: user.ho_ten.trim(),
          vai_tro: user.vai_tro,
          password: user.password || undefined,
        })
        showToast('✓ Đã cập nhật user')
      }
      setEditSheet(null)
      fetchUsers()
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setSaving(true)
    try {
      await callAdminUsers('delete', { id: confirmDelete.id })
      showToast('✓ Đã xoá user')
      setConfirmDelete(null)
      fetchUsers()
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const VaiTroBadge = ({ vt }) => {
    const cfg = VAI_TRO_OPTS.find(o => o.value === vt) || VAI_TRO_OPTS[2]
    return (
      <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: '7px', fontSize: '10px', fontWeight: 700, fontFamily: LUX.fontSans }}>
        {cfg.label}
      </span>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,32,26,0.55)', zIndex: 1000 }}
      onClick={() => { setEditSheet(null); setConfirmDelete(null); onClose?.() }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'calc(100vw - var(--side-w, 248px))', maxWidth: '100vw', background: LUX.bg, overflowY: 'auto', boxShadow: '-6px 0 40px rgba(42,32,26,0.28)', animation: 'rpSlideIn .22s ease' }}
        onClick={e => e.stopPropagation()}>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: toast.type === 'error' ? '#C0392B' : '#2D7A4F', color: 'white', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            {toast.msg}
          </div>
        )}

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: LUX.line }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px' }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: LUX.ink, fontFamily: LUX.fontSerif }}>Quản Lý User</div>
            <div style={{ fontSize: '12px', color: LUX.ink3, fontFamily: LUX.fontSans, marginTop: '2px' }}>Thêm / Sửa / Xoá user đăng nhập</div>
          </div>
          <button onClick={() => { setEditSheet(null); setConfirmDelete(null); onClose?.() }}
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${LUX.line}`, background: LUX.surface2, fontSize: '18px', cursor: 'pointer', color: LUX.ink3 }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* Add button */}
          <button onClick={openAdd}
            style={{ width: '100%', padding: '12px', borderRadius: LUX.radius, background: LUX.goldGrad, border: 'none', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer', fontFamily: LUX.fontSans, marginBottom: '16px' }}>
            + Thêm User Mới
          </button>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: LUX.ink3 }}>Đang tải...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: LUX.surface2, borderRadius: LUX.radius, border: `1px solid ${LUX.line}` }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#C9A96E,#A0714F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', color: 'white', fontFamily: LUX.fontSans, flexShrink: 0 }}>
                    {getInitials(u.ho_ten)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: LUX.ink, fontFamily: LUX.fontSans }}>{u.ho_ten}</div>
                    <div style={{ fontSize: '11px', color: LUX.ink3, fontFamily: LUX.fontSans }}>{u.email}</div>
                  </div>
                  <VaiTroBadge vt={u.vai_tro} />
                  <button onClick={() => openEdit(u)}
                    style={{ background: 'none', border: `1px solid ${LUX.line}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: LUX.fontSans, color: LUX.taupe, fontWeight: 600 }}>
                    Sửa
                  </button>
                  {u.vai_tro !== 'admin' && (
                    <button onClick={() => setConfirmDelete(u)}
                      style={{ background: 'none', border: 'none', color: '#C0392B', fontSize: '12px', cursor: 'pointer', fontWeight: 600, fontFamily: LUX.fontSans }}>
                      Xoá
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit/Add sheet */}
        {editSheet && (
          <div style={{ padding: '16px', borderTop: `1px solid ${LUX.line}`, marginTop: '16px' }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: LUX.ink, marginBottom: '16px', fontFamily: LUX.fontSerif }}>
              {editSheet.mode === 'add' ? 'Thêm User Mới' : 'Sửa User'}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '4px', fontFamily: LUX.fontSans }}>Họ Tên *</label>
              <input type="text" value={editSheet.user.ho_ten}
                onChange={e => setEditSheet(s => ({ ...s, user: { ...s.user, ho_ten: e.target.value } }))}
                placeholder="Đỗ Thị Khánh Duy"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${LUX.line}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }}
              />
            </div>

            {editSheet.mode === 'add' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '4px', fontFamily: LUX.fontSans }}>Email *</label>
                <input type="email" value={editSheet.user.email}
                  onChange={e => setEditSheet(s => ({ ...s, user: { ...s.user, email: e.target.value } }))}
                  placeholder="khanhduy@hannahspa.vn"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${LUX.line}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }}
                />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '4px', fontFamily: LUX.fontSans }}>Vai Trò</label>
              <select value={editSheet.user.vai_tro}
                onChange={e => setEditSheet(s => ({ ...s, user: { ...s.user, vai_tro: e.target.value } }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${LUX.line}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }}>
                {VAI_TRO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: LUX.ink3, fontWeight: 600, display: 'block', marginBottom: '4px', fontFamily: LUX.fontSans }}>
                {editSheet.mode === 'add' ? 'Mật Khẩu *' : 'Mật Khẩu Mới (bỏ trống = giữ nguyên)'}
              </label>
              <input type="password" value={editSheet.user.password}
                onChange={e => setEditSheet(s => ({ ...s, user: { ...s.user, password: e.target.value } }))}
                placeholder="Ít nhất 6 ký tự"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${LUX.line}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: LUX.fontSans }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditSheet(null)}
                style={{ flex: 1, padding: '12px', borderRadius: LUX.radius, background: LUX.surface2, border: `1px solid ${LUX.line}`, fontWeight: '600', fontSize: '14px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Huỷ
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '12px', borderRadius: LUX.radius, background: LUX.goldGrad, border: 'none', color: 'white', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: LUX.fontSans }}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        )}

        {/* Confirm delete */}
        {confirmDelete && (
          <div style={{ padding: '16px', borderTop: `1px solid ${LUX.line}`, marginTop: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: LUX.ink, marginBottom: '4px', fontFamily: LUX.fontSans }}>
              Xoá user "{confirmDelete.ho_ten}"?
            </div>
            <div style={{ fontSize: '12px', color: '#C0392B', marginBottom: '16px', fontFamily: LUX.fontSans }}>
              Hành động này không thể hoàn tác
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '12px', borderRadius: LUX.radius, background: LUX.surface2, border: `1px solid ${LUX.line}`, fontWeight: '600', fontSize: '14px', cursor: 'pointer', fontFamily: LUX.fontSans }}>
                Huỷ
              </button>
              <button onClick={handleDelete} disabled={saving}
                style={{ flex: 1, padding: '12px', borderRadius: LUX.radius, background: '#C0392B', border: 'none', color: 'white', fontWeight: '700', fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: LUX.fontSans }}>
                {saving ? 'Đang xoá...' : 'Xác Nhận Xoá'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
