import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { formatCurrency } from '../../../lib/utils'
import { getMyspaCommissionRule } from '../../../lib/serviceCommission'
import I from '../../../components/shared/Icons'
import { notify } from '../../../components/ui/notify'

const PAGE_SIZE = 20

function moneyInput(n) {
  return n > 0 ? new Intl.NumberFormat('vi-VN').format(n) : ''
}

function parseMoney(v) {
  return parseInt(String(v || '').replace(/\D/g, ''), 10) || 0
}

function ServiceStatus({ active }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      whiteSpace: 'nowrap',
      padding: '3px 9px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 900,
      color: active ? '#426a2c' : '#8B7355',
      background: active ? '#eef2e7' : '#f5f0e8',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: active ? '#426a2c' : '#8B7355' }} />
      {active ? 'Active' : 'Tạm ngưng'}
    </span>
  )
}

function MenuStatus({ visible }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      padding: '3px 8px',
      borderRadius: 999,
      fontSize: 10.5,
      fontWeight: 900,
      color: visible ? '#426a2c' : '#8B7355',
      background: visible ? '#eef2e7' : '#f5f0e8',
    }}>
      {visible ? 'Hiện POS' : 'Ẩn POS'}
    </span>
  )
}

function ServiceModal({ service, categories, onClose, onSaved }) {
  const isNew = !service?.id
  const [form, setForm] = useState({
    ma_dv: service?.ma_dv || '',
    ten: service?.ten || '',
    danh_muc: service?.danh_muc || '',
    gia_co_ban: service?.gia_co_ban || 0,
    ti_le_hoa_hong: service?.ti_le_hoa_hong ?? 0,
    thoi_gian_phut: service?.thoi_gian_phut || 0,
    thu_tu: service?.thu_tu || 999,
    is_active: service?.is_active ?? true,
    hien_tren_menu: service?.hien_tren_menu ?? true,
    la_hot: service?.la_hot ?? false,
    la_phu_thu: service?.la_phu_thu ?? false,
    mo_ta_ngan: service?.mo_ta_ngan || '',
    mo_ta: service?.mo_ta || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!form.ten.trim()) { setErr('Tên dịch vụ không được để trống.'); return }
    if (!form.danh_muc.trim()) { setErr('Danh mục không được để trống.'); return }
    setSaving(true)
    setErr('')
    try {
      const payload = {
        ma_dv: form.ma_dv.trim() || null,
        ten: form.ten.trim(),
        danh_muc: form.danh_muc.trim(),
        gia_co_ban: Number(form.gia_co_ban || 0),
        ti_le_hoa_hong: Math.round(Number(form.ti_le_hoa_hong || 0) * 100) / 100,
        thoi_gian_phut: Number(form.thoi_gian_phut || 0),
        thu_tu: Number(form.thu_tu || 999),
        is_active: !!form.is_active,
        hien_tren_menu: !!form.hien_tren_menu,
        la_hot: !!form.la_hot,
        la_phu_thu: !!form.la_phu_thu,
        mo_ta_ngan: form.mo_ta_ngan || '',
        mo_ta: form.mo_ta || '',
      }
      const query = isNew
        ? supabase.from('dich_vu').insert(payload)
        : supabase.from('dich_vu').update(payload).eq('id', service.id)
      const { error } = await query
      if (error) throw error
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e.message || 'Không lưu được dịch vụ.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,.46)', zIndex: 940 }} />
      <div style={{
        position: 'fixed',
        zIndex: 941,
        top: 0,
        right: 0,
        bottom: 0,
        width: 'calc(100vw - var(--side-w, 248px))',
        maxWidth: '100vw',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--bord)',
        boxShadow: '-6px 0 40px rgba(0,0,0,.32)',
        animation: 'rpSlideIn .22s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 900, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
              {isNew ? 'Thêm dịch vụ' : 'Sửa dịch vụ'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>Đồng bộ danh mục dịch vụ cho POS, CRM và thẻ liệu trình</div>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto' }}>
          {err && <div style={{ marginBottom: 14, color: 'var(--danger)', fontWeight: 800, fontSize: 13 }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Mã dịch vụ</span>
              <input value={form.ma_dv} onChange={e => set('ma_dv', e.target.value)} style={inputStyle} placeholder="DV-00301" />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Tên dịch vụ</span>
              <input value={form.ten} onChange={e => set('ten', e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.5fr 0.9fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Danh mục</span>
              <input list="service-categories" value={form.danh_muc} onChange={e => set('danh_muc', e.target.value)} style={inputStyle} />
              <datalist id="service-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Giá bán</span>
              <input value={moneyInput(form.gia_co_ban)} onChange={e => set('gia_co_ban', parseMoney(e.target.value))} style={{ ...inputStyle, textAlign: 'right', fontWeight: 800 }} />
            </label>
            {/* Tour: nhập TIỀN (đ) hoặc % — nhập 1 ô tự tính ô kia theo giá bán */}
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Tour (đ / %)</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={moneyInput(Math.round(Number(form.gia_co_ban || 0) * Number(form.ti_le_hoa_hong || 0) / 100))}
                  onChange={e => {
                    const tien = parseMoney(e.target.value)
                    const gia = Number(form.gia_co_ban || 0)
                    // KHÔNG làm tròn ở đây (gõ dở bị tròn về 0 → reset ô). Tròn 2 chữ số khi LƯU.
                    set('ti_le_hoa_hong', gia > 0 ? tien / gia * 100 : 0)
                  }}
                  style={{ ...inputStyle, textAlign: 'right', fontWeight: 800, flex: 1 }}
                  title="Tiền tour mỗi lần (đ) — tự tính từ giá bán × %" placeholder="đ" />
                <input type="number" step="0.1" value={form.ti_le_hoa_hong}
                  onChange={e => set('ti_le_hoa_hong', e.target.value)}
                  style={{ ...inputStyle, textAlign: 'center', fontWeight: 800, width: 62, flexShrink: 0 }}
                  title="Tour %" placeholder="%" />
              </div>
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Thời gian</span>
              <input type="number" value={form.thoi_gian_phut} onChange={e => set('thoi_gian_phut', e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontWeight: 800 }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
            <label style={checkStyle}><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> Active</label>
            <label style={checkStyle}><input type="checkbox" checked={form.hien_tren_menu} onChange={e => set('hien_tren_menu', e.target.checked)} /> Hiện menu</label>
            <label style={checkStyle}><input type="checkbox" checked={form.la_hot} onChange={e => set('la_hot', e.target.checked)} /> Hot</label>
            <label style={checkStyle}><input type="checkbox" checked={form.la_phu_thu} onChange={e => set('la_phu_thu', e.target.checked)} /> Phụ thu</label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Thứ tự</span>
              <input type="number" value={form.thu_tu} onChange={e => set('thu_tu', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Mô tả ngắn</span>
              <textarea rows={4} value={form.mo_ta_ngan} onChange={e => set('mo_ta_ngan', e.target.value)} style={textareaStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={labelStyle}>Mô tả đầy đủ</span>
              <textarea rows={4} value={form.mo_ta} onChange={e => set('mo_ta', e.target.value)} style={textareaStyle} />
            </label>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', background: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
          <button className="btn gold" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu dịch vụ'}</button>
        </div>
      </div>
    </>
  )
}

const labelStyle = { fontSize: 11, fontWeight: 900, color: 'var(--ink3)', textTransform: 'uppercase' }
const inputStyle = { height: 38, border: '1px solid var(--bord)', borderRadius: 8, padding: '0 12px', outline: 'none', fontFamily: 'var(--sans)' }
const textareaStyle = { border: '1px solid var(--bord)', borderRadius: 8, padding: 12, outline: 'none', resize: 'vertical', fontFamily: 'var(--sans)' }
const checkStyle = { display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg)', fontSize: 12, fontWeight: 800, color: 'var(--ink)' }

export default function AdminDichVuPage() {
  const path = window.location.pathname
  const tab = path.endsWith('/danh-muc') ? 'categories' : 'services'
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('active')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const [newName, setNewName] = useState('')

  useEffect(() => { loadServices() }, [])
  useEffect(() => { setPage(1) }, [search, category, status, tab])

  const loadServices = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dich_vu')
      .select('*')
      .order('ma_dv', { ascending: false, nullsFirst: false })
      .order('thu_tu', { ascending: true })
      .order('ten', { ascending: true })
    if (!error) setServices(data || [])
    setLoading(false)
  }

  const categories = useMemo(() => {
    return [...new Set(services.map(s => s.danh_muc).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [services])

  const filtered = services.filter(s => {
    if (status === 'active' && !s.is_active) return false
    if (status === 'paused' && s.is_active) return false
    if (category && s.danh_muc !== category) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [s.ma_dv, s.ten, s.danh_muc].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const categoryRows = categories.map(name => {
    const rows = services.filter(s => s.danh_muc === name)
    return {
      name,
      total: rows.length,
      active: rows.filter(s => s.is_active).length,
      visible: rows.filter(s => s.hien_tren_menu).length,
      isVisible: rows.some(s => s.hien_tren_menu),
      avgPrice: rows.reduce((sum, s) => sum + (s.gia_co_ban || 0), 0) / Math.max(1, rows.length),
    }
  })

  const renameCategory = async () => {
    if (!renaming || !newName.trim()) return
    const { error } = await supabase
      .from('dich_vu')
      .update({ danh_muc: newName.trim() })
      .eq('danh_muc', renaming)
    if (!error) {
      setRenaming(null)
      setNewName('')
      await loadServices()
    } else {
      notify(error.message, 'error')
    }
  }

  const toggleService = async (service) => {
    const { error } = await supabase
      .from('dich_vu')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)
    if (!error) await loadServices()
  }

  const toggleCategoryMenu = async (row) => {
    const { error } = await supabase
      .from('dich_vu')
      .update({ hien_tren_menu: !row.isVisible })
      .eq('danh_muc', row.name)
    if (!error) await loadServices()
    else notify(error.message, 'error')
  }

  const tourLabel = (service) => {
    const rule = getMyspaCommissionRule(service, 'ktv')
    if (rule?.type === 'absolute' && rule.amount > 0) return formatCurrency(rule.amount)
    if (rule?.percent > 0) return `${rule.percent}%`
    return Number(service.ti_le_hoa_hong || 0) > 0 ? `${Number(service.ti_le_hoa_hong || 0)}%` : '-'
  }

  return (
    <div>
      <div className="mod-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="ttl">{tab === 'categories' ? 'Danh Mục Dịch Vụ' : 'Danh Sách Dịch Vụ'}</div>
          <div className="sub">{services.length.toLocaleString('vi-VN')} dịch vụ · {categories.length} danh mục · đồng bộ trực tiếp POS</div>
        </div>
        <div className="acts">
          <button className="btn ghost" onClick={() => window.location.href = tab === 'categories' ? '/admin/dich-vu' : '/admin/dich-vu/danh-muc'}>
            {tab === 'categories' ? 'Danh sách dịch vụ' : 'Danh mục dịch vụ'}
          </button>
          <button className="btn gold" onClick={() => setEditing({})}>+ Thêm dịch vụ</button>
        </div>
      </div>

      <div className="strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 18 }}>
        <div className="it"><div className="l">Tổng dịch vụ</div><div className="v">{services.length}</div><div className="d">từ MySpa/HSMS</div></div>
        <div className="it"><div className="l">Active</div><div className="v" style={{ color: '#426a2c' }}>{services.filter(s => s.is_active).length}</div><div className="d">POS được bán</div></div>
        <div className="it"><div className="l">Danh mục</div><div className="v" style={{ color: 'var(--champagne)' }}>{categories.length}</div><div className="d">nhóm dịch vụ</div></div>
        <div className="it"><div className="l">Hiện trên menu</div><div className="v">{services.filter(s => s.hien_tren_menu).length}</div><div className="d">menu khách/iPad</div></div>
      </div>

      {tab === 'services' ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
            <div className="search" style={{ flex: 1, margin: 0 }}>
              <I.Search />
              <input placeholder="Mã DV hoặc tên DV" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, width: 220, background: '#fff' }}>
              <option value="">Tất cả danh mục</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, width: 140, background: '#fff' }}>
              <option value="active">Active</option>
              <option value="paused">Tạm ngưng</option>
              <option value="all">Tất cả</option>
            </select>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 10 }}>
            <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 18, width: 96 }}>Mã DV</th>
                  <th style={{ width: '30%' }}>Tên dịch vụ</th>
                  <th style={{ width: '18%' }}>Danh mục</th>
                  <th style={{ width: 72 }}>Phút</th>
                  <th className="amount" style={{ width: 116 }}>Giá bán</th>
                  <th className="amount" style={{ width: 96 }}>Tour</th>
                  <th style={{ width: 118 }}>Trạng thái</th>
                  <th style={{ width: 142, textAlign: 'right', paddingRight: 18 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải dịch vụ...</td></tr>
                ) : paged.map(s => (
                  <tr key={s.id}>
                    <td style={{ paddingLeft: 18, whiteSpace: 'nowrap', fontWeight: 900, color: 'var(--champagne)', fontSize: 12 }}>{s.ma_dv || '-'}</td>
                    <td>
                      <div style={{ fontWeight: 850, color: 'var(--ink)', fontSize: 13, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.ten}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--ink3)', fontSize: 11, marginTop: 4 }}>
                        <MenuStatus visible={!!s.hien_tren_menu} />
                        {s.la_hot && <span style={{ color: '#A0714F', fontWeight: 800 }}>Hot</span>}
                        {s.la_phu_thu && <span style={{ color: 'var(--ink3)', fontWeight: 800 }}>Phụ thu</span>}
                      </div>
                    </td>
                    <td><span style={{ display: 'inline-flex', maxWidth: '100%', borderRadius: 999, padding: '4px 9px', background: 'var(--bg)', color: 'var(--ink2)', fontSize: 11.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.danh_muc || '-'}</span></td>
                    <td style={{ color: 'var(--ink2)', fontWeight: 700 }}>{s.thoi_gian_phut || 0}</td>
                    <td className="amount" style={{ fontWeight: 800 }}>{formatCurrency(s.gia_co_ban || 0)}</td>
                    <td className="amount">
                      <div style={{ fontWeight: 800 }}>{tourLabel(s)}</div>
                      {getMyspaCommissionRule(s, 'ktv')?.type === 'absolute' && (
                        <div style={{ fontSize: 10, color: 'var(--ink3)' }}>{Number(s.ti_le_hoa_hong || 0).toFixed(2)}%</div>
                      )}
                    </td>
                    <td><ServiceStatus active={s.is_active} /></td>
                    <td style={{ paddingRight: 18, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn ghost" style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={() => setEditing(s)}>Sửa</button>
                      <button className="btn ghost" style={{ height: 30, padding: '0 10px', fontSize: 12, marginLeft: 6 }} onClick={() => toggleService(s)}>
                        {s.is_active ? 'Tạm ngưng' : 'Active'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)' }}>Không có dịch vụ phù hợp.</td></tr>
                )}
              </tbody>
            </table>
            {filtered.length > PAGE_SIZE && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink3)', fontWeight: 800 }}>
                <span>Hiển thị {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length} dịch vụ</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn ghost" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Trước</button>
                  <span>Trang {safePage}/{totalPages}</span>
                  <button className="btn ghost" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Sau</button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 10 }}>
          <table className="tbl" style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 18 }}>Danh mục</th>
                <th className="amount">Tổng DV</th>
                <th className="amount">Active</th>
                <th className="amount">Hiện POS</th>
                <th className="amount">Giá TB</th>
                <th style={{ paddingRight: 18, textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map(row => (
                <tr key={row.name}>
                  <td style={{ paddingLeft: 18, fontWeight: 900, color: 'var(--ink)' }}>{row.name}</td>
                  <td className="amount">{row.total}</td>
                  <td className="amount" style={{ color: '#426a2c', fontWeight: 800 }}>{row.active}</td>
                  <td className="amount" style={{ color: row.visible > 0 ? '#426a2c' : '#8B7355', fontWeight: 900 }}>{row.visible}</td>
                  <td className="amount">{formatCurrency(Math.round(row.avgPrice || 0))}</td>
                  <td style={{ paddingRight: 18, textAlign: 'center' }}>
                    <button className="btn ghost" style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={() => { setRenaming(row.name); setNewName(row.name) }}>
                      Đổi tên
                    </button>
                    <button className="btn ghost" style={{ height: 30, padding: '0 10px', fontSize: 12, marginLeft: 6, color: row.isVisible ? '#8B7355' : '#426a2c' }} onClick={() => toggleCategoryMenu(row)}>
                      {row.isVisible ? 'Ẩn POS' : 'Hiện POS'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ServiceModal
          service={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={loadServices}
        />
      )}

      {renaming && (
        <>
          <div onClick={() => setRenaming(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,.46)', zIndex: 950 }} />
          <div style={{ position: 'fixed', zIndex: 951, top: 120, left: '50%', transform: 'translateX(-50%)', width: 'min(460px, 92vw)', background: 'var(--surface)', border: '1px solid var(--bord)', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,.28)', padding: 20 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 900, color: 'var(--ink)', marginBottom: 14 }}>Đổi tên danh mục</div>
            <input value={newName} onChange={e => setNewName(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: 14 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn ghost" onClick={() => setRenaming(null)}>Đóng</button>
              <button className="btn gold" onClick={renameCategory}>Lưu</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
