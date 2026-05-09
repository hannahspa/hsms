import { useState, useRef, useEffect } from 'react'
import { posService } from '../../services/posService'
import { LUX } from '../../constants/lux'
import { COLORS } from '../../constants/colors'

const S = {
  container: {
    padding: '10px 16px', borderBottom: `1px solid ${LUX.line}`,
    background: LUX.surface2,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  inputWrap: {
    flex: 1, position: 'relative',
  },
  input: {
    width: '100%', padding: '8px 12px', borderRadius: LUX.radiusSm,
    border: `1.5px solid ${LUX.line2}`, fontSize: '13px',
    outline: 'none', background: LUX.bg, color: LUX.ink,
    boxSizing: 'border-box',
  },
  selectedBadge: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '6px 12px', background: LUX.line, borderRadius: LUX.radiusSm,
  },
  selectedName: {
    fontWeight: 600, fontSize: '13px', color: LUX.ink,
  },
  selectedPhone: {
    fontSize: '12px', color: LUX.ink3,
  },
  clearBtn: {
    background: 'transparent', border: 'none', color: LUX.ink3,
    cursor: 'pointer', fontSize: '14px', padding: '2px',
  },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
    background: LUX.surface2, borderRadius: LUX.radiusSm,
    boxShadow: LUX.shadow, border: `1px solid ${LUX.line}`,
    maxHeight: '200px', overflowY: 'auto', marginTop: '4px',
  },
  dropdownItem: {
    padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${LUX.line}`,
  },
  dropdownName: {
    fontWeight: 600, fontSize: '13px', color: LUX.ink,
  },
  dropdownPhone: {
    fontSize: '12px', color: LUX.ink3,
  },
  addNewBtn: {
    padding: '8px 14px', background: COLORS.primary, color: '#fff',
    border: 'none', borderRadius: LUX.radiusSm, fontSize: '12px',
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
}

export default function PosCustomerSelect({ selected, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const ref = useRef(null)
  const debounce = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (val) => {
    setQuery(val)
    if (!val.trim()) { setResults([]); setShowDropdown(false); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try {
        const r = await posService.searchCustomers(val)
        setResults(r)
        setShowDropdown(true)
      } catch (_) {}
    }, 300)
  }

  const handleSelect = (kh) => {
    onChange(kh)
    setQuery('')
    setShowDropdown(false)
  }

  const handleClear = () => {
    onChange(null)
    setQuery('')
  }

  const handleQuickAdd = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      alert('Vui lòng nhập tên và số điện thoại')
      return
    }
    try {
      const kh = await posService.quickCreateCustomer({
        hoTen: newName.trim(),
        soDienThoai: newPhone.trim(),
      })
      onChange(kh)
      setShowQuickAdd(false)
      setNewName('')
      setNewPhone('')
    } catch (err) {
      alert('Lỗi tạo KH: ' + err.message)
    }
  }

  if (selected) {
    return (
      <div style={S.container}>
        <div style={S.row}>
          <span style={{ fontSize: '14px' }}>👤</span>
          <div style={S.selectedBadge}>
            <div>
              <div style={S.selectedName}>{selected.ho_ten}</div>
              <div style={S.selectedPhone}>{selected.so_dien_thoai}</div>
            </div>
            {selected.hang && (
              <span style={{
                padding: '2px 8px', borderRadius: '10px', fontSize: '10px',
                fontWeight: 700, background: selected.hang === 'gold' ? '#C9A96E' : selected.hang === 'silver' ? '#A8A9AD' : '#CD7F32',
                color: '#fff',
              }}>
                {selected.hang === 'gold' ? 'Vàng' : selected.hang === 'silver' ? 'Bạc' : 'Đồng'}
              </span>
            )}
            <button style={S.clearBtn} onClick={handleClear}>✕</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.container} ref={ref}>
      <div style={S.row}>
        <div style={S.inputWrap}>
          <input
            style={S.input}
            placeholder="Tìm khách hàng (tên/SĐT)..."
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
          />
          {showDropdown && (
            <div style={S.dropdown}>
              {results.map(kh => (
                <div key={kh.id} style={S.dropdownItem} onClick={() => handleSelect(kh)}>
                  <div style={S.dropdownName}>{kh.ho_ten}</div>
                  <div style={S.dropdownPhone}>{kh.so_dien_thoai}</div>
                </div>
              ))}
              <div style={{ ...S.dropdownItem, color: COLORS.primary, fontWeight: 600, fontSize: '13px' }}
                   onClick={() => { setShowDropdown(false); setShowQuickAdd(true) }}>
                + Thêm khách hàng mới
              </div>
            </div>
          )}
        </div>
        <button style={S.addNewBtn} onClick={() => setShowQuickAdd(!showQuickAdd)}>
          + KH Mới
        </button>
      </div>

      {showQuickAdd && (
        <div style={{ marginTop: '8px', padding: '10px', background: LUX.bg, borderRadius: LUX.radiusSm }}>
          <input
            style={{ ...S.input, marginBottom: '6px' }}
            placeholder="Họ tên khách hàng"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input
            style={{ ...S.input, marginBottom: '8px' }}
            placeholder="Số điện thoại"
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{ flex: 1, padding: '8px', borderRadius: LUX.radiusSm, border: `1.5px solid ${LUX.line2}`, background: 'transparent', color: LUX.ink2, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setShowQuickAdd(false)}
            >
              Hủy
            </button>
            <button
              style={{ flex: 1, padding: '8px', borderRadius: LUX.radiusSm, border: 'none', background: COLORS.grad, color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              onClick={handleQuickAdd}
            >
              Tạo KH
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
