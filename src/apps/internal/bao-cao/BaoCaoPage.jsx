import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, getNowVN, todayISO, formatDateInput } from '../../../lib/utils'
import DatePicker from '../../../components/shared/DatePicker'
import I from '../../../components/shared/Icons'

const DAYS = ['CN','T2','T3','T4','T5','T6','T7']
const MONTHS = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

const REPORT_GROUPS = [
  { id: 'core', label: 'Tổng quan' },
  { id: 'period', label: 'Kỳ báo cáo' },
  { id: 'control', label: 'Kiểm soát' },
  { id: 'analysis', label: 'Phân tích' },
]

const TABS = [
  { id: 'tongquan',   label: 'Tổng Quan', group: 'core' },
  { id: 'lailo',      label: 'Lãi Lỗ', group: 'core' },
  { id: 'ngay',       label: 'Ngày', group: 'period' },
  { id: 'tuan',       label: 'Tuần', group: 'period' },
  { id: 'thang',      label: 'Tháng', group: 'period' },
  { id: 'nam',        label: 'Năm', group: 'period' },
  { id: 'dongtien',   label: 'Dòng Tiền', group: 'control' },
  { id: 'noptienmat', label: 'Nộp TM', group: 'control' },
  { id: 'congno',     label: 'Công Nợ', group: 'control' },
  { id: 'nghiavu',    label: 'Nghĩa Vụ', group: 'control' },
  { id: 'chiphi',     label: 'Chi Phí', group: 'analysis' },
  { id: 'doanhthu',   label: 'Doanh Thu', group: 'analysis' },
]

const TAB_META = {
  tongquan:   { icon: I.Dashboard, short: 'Tổng Quan' },
  lailo:      { icon: I.TrendUp,   short: 'Lãi Lỗ' },
  ngay:       { icon: I.Calendar,  short: 'Ngày' },
  tuan:       { icon: I.Calendar,  short: 'Tuần' },
  thang:      { icon: I.Calendar,  short: 'Tháng' },
  nam:        { icon: I.Calendar,  short: 'Năm' },
  dongtien:   { icon: I.Wallet,    short: 'Dòng Tiền' },
  noptienmat: { icon: I.Bank,      short: 'Nộp TM' },
  congno:     { icon: I.Users,     short: 'Công Nợ' },
  nghiavu:    { icon: I.Tag,       short: 'Nghĩa Vụ' },
  chiphi:     { icon: I.TrendDown, short: 'Chi Phí' },
  doanhthu:   { icon: I.TrendUp,   short: 'Doanh Thu' },
}

// ════════════════ DONUT CHART ════════════════
function DonutChart({segments,total,size=140,ring=18}){
  const r=(size-ring)/2,cx=size/2,cy=size/2;let acc=0
  return(<svg viewBox={`0 0 ${size} ${size}`} style={{width:size,height:size,flexShrink:0}}>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8dcc8" strokeWidth={ring}/>
    {segments.map((s,i)=>{const len=2*Math.PI*r;const part=(s.v/total)*len;const off=acc;acc+=part;return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={ring} strokeDasharray={`${part} ${len-part}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`}/>})}
    <text x={cx} y={cy-2} textAnchor="middle" fontSize="10" fill="#8e7a68" fontFamily="Inter" fontWeight="600">TỔNG</text>
    <text x={cx} y={cy+14} textAnchor="middle" fontSize="16" fill="#2a201a" fontFamily="var(--serif)" fontWeight="700">{total>=1000000?(total/1000000).toFixed(1)+'M':(total/1000).toFixed(0)+'K'}</text>
  </svg>)
}

// ════════════════ SHARED: DATE NAV BAR ════════════════
function DateNavBar({ label, onPrev, onNext, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--line)' }}>
      <div style={{ fontSize:13, color:'var(--ink2)', fontWeight:600 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--surface2)', border:'1px solid var(--line)', borderRadius:14, padding:4 }}>
        <button onClick={onPrev} className="icon-btn" style={{ width:32,height:32,border:'none',background:'var(--bg2)' }}>‹</button>
        {children}
        <button onClick={onNext} className="icon-btn" style={{ width:32,height:32,border:'none',background:'var(--bg2)' }}>›</button>
      </div>
    </div>
  )
}

const moneyStyle = {
  fontFamily: 'var(--sans)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-.01em',
}

function CockpitMetric({ label, value, note, tone = 'ink', icon }) {
  const colors = {
    ink: 'var(--ink)',
    gold: 'var(--espresso)',
    good: '#426a2c',
    bad: '#843a23',
    blue: '#1a4f70',
  }
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 12, padding: '15px 16px', minHeight: 112 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ink3)', fontWeight: 750 }}>{label}</div>
        {icon && <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg2)', display: 'grid', placeItems: 'center', fontSize: 15 }}>{icon}</div>}
      </div>
      <div style={{ ...moneyStyle, marginTop: 10, color: colors[tone] || colors.ink, fontSize: 23, fontWeight: 800, lineHeight: 1.05 }}>{formatCurrency(value || 0)}</div>
      <div style={{ marginTop: 7, color: 'var(--ink3)', fontSize: 11.5, lineHeight: 1.35 }}>{note}</div>
    </div>
  )
}

function FinancialCockpit({ data, loading }) {
  if (loading || !data) {
    return (
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-b" style={{ textAlign: 'center', padding: 34, color: 'var(--ink3)' }}>Đang tải trung tâm tài chính...</div>
      </div>
    )
  }

  const margin = data.thucThu > 0 ? Math.round((data.loiNhuanTamTinh / data.thucThu) * 100) : 0
  const obligationNote = `${data.activeCards} thẻ active · ${data.remainingSessions} buổi còn phục vụ`
  const staffNote = `Tour ${formatCurrency(data.tour)} · Hoa Hồng ${formatCurrency(data.commission)}`

  return (
    <div className="card" style={{ marginBottom: 18, overflow: 'hidden' }}>
      <div className="card-b" style={{ padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 0 }}>
          <div style={{ background: 'linear-gradient(135deg,#3d2c20,#8a6a52)', color: '#f8efe1', padding: 22 }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.16em', fontWeight: 750, opacity: .72 }}>Financial Cockpit</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 27, fontWeight: 700, lineHeight: 1.1, marginTop: 10 }}>Trung Tâm Tài Chính</div>
            <div style={{ fontSize: 12, lineHeight: 1.55, opacity: .78, marginTop: 10 }}>
              Kiểm soát thực thu, chi phí, nghĩa vụ thẻ, công nợ và tiền phải trả nhân sự trong tháng hiện tại.
            </div>
            <div style={{ marginTop: 16, display: 'inline-flex', border: '1px solid rgba(248,239,225,.24)', borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 700 }}>
              Biên tạm tính {margin}%
            </div>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            <CockpitMetric label="Thực Thu" value={data.thucThu} note="Tiền thật vào quỹ/MB/TP" tone="good" icon="↗" />
            <CockpitMetric label="Tổng Chi" value={data.tongChi} note="Chi phí đã ghi nhận" tone="bad" icon="↘" />
            <CockpitMetric label="Lợi Nhuận Tạm" value={data.loiNhuanTamTinh} note="Thực thu trừ chi phí" tone={data.loiNhuanTamTinh >= 0 ? 'good' : 'bad'} icon="≈" />
            <CockpitMetric label="Tài Sản Ví" value={data.totalAsset} note="Tiền mặt + MB + TP" tone="gold" icon="◆" />
            <CockpitMetric label="Công Nợ KH" value={data.congNo} note={`${data.debtCustomers} khách còn nợ`} tone="bad" icon="!" />
            <CockpitMetric label="Nghĩa Vụ Thẻ" value={data.cardObligation} note={obligationNote} tone="blue" icon="▣" />
            <CockpitMetric label="Phải Trả NS" value={data.staffPayable} note={staffNote} tone="gold" icon="♛" />
            <CockpitMetric label="Tiền Mặt Cần Nộp" value={data.cashToBank} note="Thu TM trừ chi TM tháng này" tone={data.cashToBank >= 0 ? 'ink' : 'bad'} icon="→" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SubLaiLo({ data, loading }) {
  if (loading || !data) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải báo cáo lãi lỗ...</div>
  const loiNhuanSauNhanSu = data.loiNhuanTamTinh - data.staffPayable
  const marginBefore = data.thucThu > 0 ? Math.round(data.loiNhuanTamTinh / data.thucThu * 100) : 0
  const marginAfter = data.thucThu > 0 ? Math.round(loiNhuanSauNhanSu / data.thucThu * 100) : 0
  const rows = [
    ['Thực thu', data.thucThu, 'Tiền thật thu trong tháng, không gồm thẻ trả trước', 'good'],
    ['Chi phí vận hành', -data.tongChi, 'Chi phí đã nhập vào Sổ Thu Chi', 'bad'],
    ['Lợi nhuận trước nhân sự', data.loiNhuanTamTinh, `Biên tạm tính ${marginBefore}%`, data.loiNhuanTamTinh >= 0 ? 'good' : 'bad'],
    ['Tiền tour nhân viên', -data.tour, 'Tour phát sinh từ dịch vụ đã thực hiện', 'bad'],
    ['Hoa hồng bán hàng', -data.commission, 'Hoa hồng bán thẻ/combo/sản phẩm', 'bad'],
    ['Lợi nhuận sau tour/hoa hồng', loiNhuanSauNhanSu, `Biên sau nhân sự ${marginAfter}%`, loiNhuanSauNhanSu >= 0 ? 'good' : 'bad'],
  ]
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t"><div className="arch-i"><I.TrendUp style={{ width:13,height:13,color:'#8a6a52' }}/></div><h3 style={{ fontFamily: 'var(--sans)', fontSize: 16 }}>Báo Cáo Lãi Lỗ Tạm Tính</h3><span className="sub">Tháng hiện tại</span></div>
      </div>
      <div className="card-b" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th style={{ paddingLeft: 20 }}>Khoản Mục</th><th>Ghi Chú</th><th className="amount" style={{ paddingRight: 20 }}>Số Tiền</th></tr></thead>
          <tbody>
            {rows.map(([label, value, note, tone]) => (
              <tr key={label}>
                <td style={{ paddingLeft: 20, fontWeight: 700, color: 'var(--ink)' }}>{label}</td>
                <td style={{ color: 'var(--ink3)' }}>{note}</td>
                <td className="amount" style={{ paddingRight: 20, color: tone === 'good' ? '#426a2c' : tone === 'bad' ? '#843a23' : 'var(--ink)', fontFamily: 'var(--sans)', fontVariantNumeric: 'tabular-nums' }}>
                  {value > 0 && label !== 'Thực thu' ? '+' : ''}{formatCurrency(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SubNghiaVu({ data, loading }) {
  if (loading || !data) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink3)' }}>Đang tải nghĩa vụ tài chính...</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card">
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Tag style={{ width:13,height:13,color:'#8a6a52' }}/></div><h3 style={{ fontFamily: 'var(--sans)', fontSize: 16 }}>Nghĩa Vụ Khách Hàng</h3></div></div>
        <div className="card-b" style={{ display: 'grid', gap: 10 }}>
          <CockpitMetric label="Giá trị còn phục vụ" value={data.cardObligation} note={`${data.activeCards} thẻ active`} tone="blue" icon="▣" />
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 12, padding: '15px 16px', minHeight: 112 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ink3)', fontWeight: 750 }}>Buổi còn lại</div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg2)', display: 'grid', placeItems: 'center', fontSize: 15 }}>◎</div>
            </div>
            <div style={{ ...moneyStyle, marginTop: 10, color: 'var(--espresso)', fontSize: 23, fontWeight: 800, lineHeight: 1.05 }}>{Number(data.remainingSessions || 0).toLocaleString('vi-VN')} buổi</div>
            <div style={{ marginTop: 7, color: 'var(--ink3)', fontSize: 11.5, lineHeight: 1.35 }}>Tổng số buổi còn phải phục vụ</div>
          </div>
          <CockpitMetric label="Công nợ khách hàng" value={data.congNo} note={`${data.debtCustomers} khách còn nợ`} tone="bad" icon="!" />
        </div>
      </div>
      <div className="card">
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Users style={{ width:13,height:13,color:'#8a6a52' }}/></div><h3 style={{ fontFamily: 'var(--sans)', fontSize: 16 }}>Nghĩa Vụ Nhân Sự</h3></div></div>
        <div className="card-b" style={{ display: 'grid', gap: 10 }}>
          <CockpitMetric label="Tiền tour" value={data.tour} note="Phải trả theo dịch vụ đã thực hiện" tone="gold" icon="T" />
          <CockpitMetric label="Hoa hồng" value={data.commission} note="Phải trả theo bán hàng/thẻ/combo" tone="gold" icon="%" />
          <CockpitMetric label="Tổng phải trả" value={data.staffPayable} note="Tour + hoa hồng trong tháng" tone="bad" icon="∑" />
        </div>
      </div>
    </div>
  )
}

// ════════════════ SUB: TỔNG QUAN ════════════════
function SubTongQuan({ chartData, viList, loading }) {
  const totalAsset = viList.reduce((s, v) => s + (v.so_du_hien_tai || 0), 0)
  const maxVal = Math.max(...chartData.map(d => Math.max(d.thu, d.chi)), 1)
  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div className="card-t"><div className="arch-i"><I.TrendUp style={{ width:13,height:13,color:'#8a6a52' }}/></div><h3>Tình Hình Thu Chi</h3><span className="sub">5 tháng gần nhất</span></div>
          <div className="card-actions"><div className="legend"><span><i style={{ background:'#6e8a5e' }}/>Thu</span><span><i style={{ background:'#b85a4a' }}/>Chi</span></div></div>
        </div>
        <div className="card-b">
          {loading ? <div style={{ textAlign:'center', padding:40, color:'var(--ink3)' }}>Đang tải...</div> : (
            <div style={{ display:'flex', alignItems:'flex-end', gap:20, height:200, padding:'0 20px' }}>
              {chartData.map((d, i) => {
                const hThu=(d.thu/maxVal)*170; const hChi=(d.chi/maxVal)*170; const isLast=i===chartData.length-1
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%' }}>
                    <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:170 }}>
                      <div style={{ width:22, height:Math.max(hThu,2), borderRadius:'6px 6px 0 0', background:isLast?'var(--grad-gold)':'#6e8a5e', opacity:isLast?1:0.6 }} title={`Thu: ${formatCurrency(d.thu)}`}/>
                      <div style={{ width:22, height:Math.max(hChi,2), borderRadius:'6px 6px 0 0', background:'#b85a4a', opacity:0.6 }} title={`Chi: ${formatCurrency(d.chi)}`}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:isLast?700:500, color:isLast?'var(--espresso)':'var(--ink3)', marginTop:8 }}>{d.label}</span>
                    <span style={{ fontSize:10, color:'#426a2c', fontWeight:600 }}>{d.thu>0?(d.thu/1000000).toFixed(1)+'M':''}</span>
                  </div>
                )
              })}
            </div>
          )}
          {!loading && (
            <div style={{ display:'flex', gap:14, marginTop:20 }}>
              {chartData.map((m, i) => (
                <div key={i} style={{ flex:1, textAlign:'center', padding:'10px 8px', background:'var(--bg2)', borderRadius:10, border:i===chartData.length-1?'2px solid var(--champagne)':'1px solid var(--line)' }}>
                  <div style={{ fontSize:10, color:'var(--ink3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>{m.label}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#426a2c' }}>Thu {m.thu>0?(m.thu/1000000).toFixed(1)+'M':'0'}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#843a23' }}>Chi {m.chi>0?(m.chi/1000000).toFixed(1)+'M':'0'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Wallet style={{ width:13,height:13,color:'#8a6a52' }}/></div><h3>Số Dư Tài Khoản</h3></div></div>
        <div className="card-b">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {viList.map(vi => {
              const ig={tien_mat:'linear-gradient(180deg,#e0eedd,#bfd5b8)',chuyen_khoan:'linear-gradient(180deg,#dde9f3,#a8c5dc)',quet_the:'linear-gradient(180deg,#f0dcc0,#d4a574)'}
              return (
                <div key={vi.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--line)' }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:ig[vi.loai]||'', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                    {vi.loai==='tien_mat'?'💵':vi.loai==='chuyen_khoan'?'🏦':'💳'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{vi.ten}</div>
                    <div style={{ fontSize:11, color:'var(--ink3)' }}>{vi.loai==='tien_mat'?'Tiền mặt tại quầy':vi.loai==='chuyen_khoan'?'Tài khoản ngân hàng':'Quẹt thẻ'}</div>
                  </div>
                  <div style={{ fontFamily:'var(--serif)', fontSize:18, fontWeight:700 }}>{formatCurrency(vi.so_du_hien_tai||0)}</div>
                </div>
              )
            })}
          </div>
          <div className="rec-row tot" style={{ marginTop:12 }}><span>Tổng Tài Sản</span><span>{formatCurrency(totalAsset)}</span></div>
        </div>
      </div>
    </div>
  )
}

// ════════════════ SUB: BÁO CÁO NGÀY ════════════════
function SubBaoCaoNgay() {
  const [ngay,setNgay]=useState(todayISO())
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(true)
  const [showLich,setShowLich]=useState(false)
  useEffect(()=>{setLoading(true);Promise.all([supabase.from('doanh_thu').select('*').eq('ngay',ngay).order('created_at'),supabase.from('chi_phi').select('*').eq('ngay',ngay).order('created_at'),supabase.from('so_du_vi_thuc_te').select('*')]).then(([rDT,rCP,rVi])=>{const dt=rDT.data||[],cp=rCP.data||[];const byHT={};['tien_mat','chuyen_khoan','quet_the','the_tra_truoc'].forEach(h=>{byHT[h]=dt.filter(r=>r.hinh_thuc===h).reduce((s,r)=>s+(r.so_tien||0),0)});const thucThu=byHT.tien_mat+byHT.chuyen_khoan+byHT.quet_the;const tongChi=cp.reduce((s,r)=>s+(r.so_tien||0),0);setData({dt,cp,byHT,thucThu,tongChi,viList:rVi.data||[]});setLoading(false)}).catch(()=>setLoading(false))},[ngay])
  const d=new Date(ngay+'T00:00:00')
  const change=(delta)=>{const nd=new Date(d);nd.setDate(nd.getDate()+delta);setNgay(nd.toISOString().slice(0,10))}
  const isToday=ngay===todayISO()
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  return (
    <div>
      <DatePicker open={showLich} selectedDate={ngay} onClose={()=>setShowLich(false)} onConfirm={d=>{setNgay(d);setShowLich(false)}}/>
      <DateNavBar
        label={<>{DAYS[d.getDay()]}, {formatDateInput(ngay)}{isToday&&<span style={{color:'var(--champagne)',marginLeft:8,fontWeight:700}}>· Hôm nay</span>}</>}
        onPrev={()=>change(-1)} onNext={()=>change(1)}
      >
        <button onClick={()=>setShowLich(true)} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px',borderRadius:10,border:'none',background:'transparent',cursor:'pointer',fontFamily:'var(--sans)'}}>
          <I.Calendar style={{width:15,height:15,color:'var(--espresso)'}}/>
          <span style={{fontSize:13,fontWeight:600,color:'var(--ink)'}}>{formatDateInput(ngay)}</span>
        </button>
      </DateNavBar>
      <div className="strip" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
        <div className="it"><div className="l">THỰC THU</div><div className="v" style={{color:'#426a2c'}}>{formatCurrency(data.thucThu)}</div><div className="d">Không tính thẻ TT</div></div>
        <div className="it"><div className="l">TỔNG CHI</div><div className="v" style={{color:'#843a23'}}>{formatCurrency(data.tongChi)}</div><div className="d">{data.cp.length} khoản</div></div>
        <div className="it"><div className="l">LỢI NHUẬN</div><div className="v" style={{color:data.thucThu-data.tongChi>=0?'#426a2c':'#843a23'}}>{formatCurrency(data.thucThu-data.tongChi)}</div><div className="d">{data.thucThu-data.tongChi>=0?'✅ Có lãi':'⚠️ Lỗ'}</div></div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendUp style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>DOANH THU</h3></div></div>
        <div className="card-b">
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
            {[{icon:'💵',l:'Tiền Mặt',v:data.byHT.tien_mat,c:'#3e5a32',bg:'#e8f1de'},{icon:'🏦',l:'Chuyển Khoản',v:data.byHT.chuyen_khoan,c:'#1a4f70',bg:'#ddeaf3'},{icon:'💳',l:'Quẹt Thẻ',v:data.byHT.quet_the,c:'#5e2f74',bg:'#ecdcef'},{icon:'🎫',l:'Thẻ Trả Trước',v:data.byHT.the_tra_truoc,c:'#6e4a1f',bg:'#f0e2cd',note:'Không tính Thực Thu'}].map((x,i)=>(
              <div key={i} style={{background:x.bg,borderRadius:12,padding:14,textAlign:'center',border:`1px solid ${x.c}20`}}>
                <div style={{fontSize:24,marginBottom:4}}>{x.icon}</div><div style={{fontSize:10,fontWeight:600,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.08em'}}>{x.l}</div>
                <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:700,color:x.c,marginTop:4}}>{formatCurrency(x.v)}</div>
                {x.note&&<div style={{fontSize:9,color:'var(--ink3)',marginTop:3}}>{x.note}</div>}
              </div>))}
          </div>
          <div className="rec-row tot"><span>Tổng Doanh Thu</span><span>{formatCurrency(data.byHT.tien_mat+data.byHT.chuyen_khoan+data.byHT.quet_the+data.byHT.the_tra_truoc)}</span></div>
        </div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendDown style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>CHI PHÍ CHI TIẾT</h3><span className="sub">{data.cp.length} khoản</span></div></div>
        <div className="card-b" style={{padding:0}}>
          {data.cp.length===0?<div style={{textAlign:'center',padding:30,color:'var(--ink3)'}}>Không có khoản chi nào</div>:
          <table className="tbl"><thead><tr><th style={{paddingLeft:20}}>Giờ</th><th>Diễn Giải</th><th>Nguồn</th><th className="amount" style={{paddingRight:20}}>Số Tiền</th></tr></thead><tbody>{data.cp.map((cp,i)=>{const mk=cp.hinh_thuc_thanh_toan||'tien_mat';return(<tr key={i}><td className="time" style={{paddingLeft:20}}>{cp.created_at?new Date(cp.created_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'--:--'}</td><td className="desc">{cp.dien_giai||'Chi phí'}</td><td><span className={`method ${mk==='tien_mat'?'cash':mk==='chuyen_khoan'?'transfer':'card'}`}>{mk==='tien_mat'?'TM':mk==='chuyen_khoan'?'CK':'QT'}</span></td><td className="amount" style={{paddingRight:20,color:'var(--danger)'}}>−{formatCurrency(cp.so_tien)}</td></tr>)})}</tbody></table>}
          <div className="rec-row tot" style={{margin:'0 20px'}}><span>Tổng Chi Phí</span><span style={{color:'var(--danger)'}}>{formatCurrency(data.tongChi)}</span></div>
        </div>
      </div>
      <div className="card">
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Wallet style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>SỐ DƯ TÀI KHOẢN</h3></div></div>
        <div className="card-b">
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {data.viList.map(vi=>{const ig={tien_mat:'linear-gradient(180deg,#e0eedd,#bfd5b8)',chuyen_khoan:'linear-gradient(180deg,#dde9f3,#a8c5dc)',quet_the:'linear-gradient(180deg,#f0dcc0,#d4a574)'};return(<div key={vi.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:12,background:'var(--bg2)',border:'1px solid var(--line)'}}><div style={{width:40,height:40,borderRadius:11,background:ig[vi.loai]||'',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{vi.loai==='tien_mat'?'💵':vi.loai==='chuyen_khoan'?'🏦':'💳'}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{vi.ten}</div><div style={{fontSize:11,color:'var(--ink3)'}}>{vi.loai==='tien_mat'?'Tiền mặt tại quầy':vi.loai==='chuyen_khoan'?'Tài khoản ngân hàng':'Quẹt thẻ'}</div></div><div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:700}}>{formatCurrency(vi.so_du_hien_tai||0)}</div></div>)})}
          </div>
          <div className="rec-row tot" style={{marginTop:12}}><span>Tổng Tài Sản</span><span>{formatCurrency(data.viList.reduce((s,v)=>s+(v.so_du_hien_tai||0),0))}</span></div>
        </div>
      </div>
    </div>
  )
}

// ════════════════ SUB: BÁO CÁO TUẦN ════════════════
function SubBaoCaoTuan() {
  const today=todayISO()
  const getWeek=(date)=>{const d=new Date(date);const day=d.getDay();const diff=day===0?-6:1-day;const mon=new Date(d);mon.setDate(d.getDate()+diff);const sun=new Date(mon);sun.setDate(mon.getDate()+6);return {start:mon.toISOString().slice(0,10),end:sun.toISOString().slice(0,10),mon}}
  const [week,setWeek]=useState(getWeek(today))
  const [data,setData]=useState(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{setLoading(true);Promise.all([supabase.from('doanh_thu').select('so_tien,hinh_thuc,dien_giai,ngay,created_at').gte('ngay',week.start).lte('ngay',week.end).order('ngay'),supabase.from('chi_phi').select('so_tien,hinh_thuc_thanh_toan,dien_giai,ngay,created_at').gte('ngay',week.start).lte('ngay',week.end).order('ngay')]).then(([rDT,rCP])=>{const dt=rDT.data||[],cp=rCP.data||[];const thucThu=dt.filter(r=>r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+(r.so_tien||0),0);const tongChi=cp.reduce((s,r)=>s+(r.so_tien||0),0);const byDay={};for(let i=0;i<7;i++){const d=new Date(week.mon);d.setDate(d.getDate()+i);const iso=d.toISOString().slice(0,10);byDay[iso]={thu:0,chi:0,label:`T${i+2>7?(i+2)%7:i+2}`,date:iso,dtItems:[],cpItems:[]}};dt.forEach(r=>{if(byDay[r.ngay]){if(r.hinh_thuc!=='the_tra_truoc')byDay[r.ngay].thu+=(r.so_tien||0);byDay[r.ngay].dtItems.push(r)}});cp.forEach(r=>{if(byDay[r.ngay]){byDay[r.ngay].chi+=(r.so_tien||0);byDay[r.ngay].cpItems.push(r)}});setData({thucThu,tongChi,days:Object.values(byDay)});setLoading(false)}).catch(()=>setLoading(false))},[week.start])
  const changeWeek=(d)=>{const nd=new Date(week.mon);nd.setDate(nd.getDate()+d*7);setWeek(getWeek(nd.toISOString().slice(0,10)))}
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  const maxV=Math.max(...data.days.map(d=>Math.max(d.thu,d.chi)),1)
  return (
    <div>
      <DateNavBar label={`${formatDateInput(week.start)} – ${formatDateInput(week.end)}`} onPrev={()=>changeWeek(-1)} onNext={()=>changeWeek(1)}>
        <span style={{fontSize:13,fontWeight:600,padding:'0 8px'}}>Tuần này</span>
      </DateNavBar>
      <div className="strip" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
        <div className="it"><div className="l">THỰC THU</div><div className="v" style={{color:'#426a2c'}}>{formatCurrency(data.thucThu)}</div><div className="d">7 ngày</div></div>
        <div className="it"><div className="l">TỔNG CHI</div><div className="v" style={{color:'#843a23'}}>{formatCurrency(data.tongChi)}</div><div className="d">7 ngày</div></div>
        <div className="it"><div className="l">LỢI NHUẬN</div><div className="v" style={{color:data.thucThu-data.tongChi>=0?'#426a2c':'#843a23'}}>{formatCurrency(data.thucThu-data.tongChi)}</div><div className="d">Thu - Chi</div></div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendUp style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Thu Chi 7 Ngày</h3></div><div className="legend"><span><i style={{background:'#6e8a5e'}}/>Thu</span><span><i style={{background:'#b85a4a'}}/>Chi</span></div></div>
        <div className="card-b"><div style={{display:'flex',alignItems:'flex-end',gap:12,height:180,padding:'0 8px'}}>{data.days.map((d,i)=>{const hThu=(d.thu/maxV)*150;const hChi=(d.chi/maxV)*150;const isToday=d.date===today;return(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%',justifyContent:'flex-end'}}><div style={{display:'flex',gap:3,alignItems:'flex-end',height:150}}><div style={{width:14,height:Math.max(hThu,2),borderRadius:'3px 3px 0 0',background:isToday?'var(--grad-gold)':'#6e8a5e',opacity:isToday?1:.65}}/><div style={{width:14,height:Math.max(hChi,2),borderRadius:'3px 3px 0 0',background:'#b85a4a',opacity:.65}}/></div><span style={{fontSize:9,color:isToday?'var(--espresso)':'var(--ink3)',fontWeight:isToday?700:400}}>{d.label}</span><span style={{fontSize:8,color:'var(--ink3)',fontWeight:600}}>{d.thu>0?(d.thu/1000).toFixed(0)+'k':''}</span></div>)})}</div></div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendUp style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Chi Tiết Doanh Thu</h3><span className="sub">{data.days.reduce((s,d)=>s+d.dtItems.length,0)} giao dịch</span></div></div>
        <div className="card-b" style={{padding:0}}>
          {data.days.filter(d=>d.dtItems.length>0).length===0?<div style={{textAlign:'center',padding:20,color:'var(--ink3)'}}>Không có doanh thu</div>:
          data.days.filter(d=>d.dtItems.length>0).map((d,i)=>(<div key={i}><div style={{padding:'8px 20px',background:'var(--bg2)',fontSize:11,fontWeight:700,color:'var(--ink2)'}}>{DAYS[new Date(d.date+'T00:00:00').getDay()]} {formatDateInput(d.date)} — {formatCurrency(d.thu)}</div>{d.dtItems.map((r,j)=>{const mk=r.hinh_thuc;return(<div key={j} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 20px',borderBottom:'1px solid var(--line)',fontSize:12}}><span className={`method ${mk==='tien_mat'?'cash':mk==='chuyen_khoan'?'transfer':mk==='quet_the'?'card':'pkg'}`}>{mk==='tien_mat'?'TM':mk==='chuyen_khoan'?'CK':mk==='quet_the'?'QT':'TT'}</span><span style={{flex:1,color:'var(--ink2)'}}>{r.dien_giai||'Doanh thu'}</span><span style={{fontWeight:700,color:'#426a2c'}}>+{formatCurrency(r.so_tien)}</span></div>)})}</div>))}
        </div>
      </div>
      <div className="card">
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendDown style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Chi Tiết Chi Phí</h3><span className="sub">{data.days.reduce((s,d)=>s+d.cpItems.length,0)} khoản</span></div></div>
        <div className="card-b" style={{padding:0}}>
          {data.days.filter(d=>d.cpItems.length>0).length===0?<div style={{textAlign:'center',padding:20,color:'var(--ink3)'}}>Không có chi phí</div>:
          data.days.filter(d=>d.cpItems.length>0).map((d,i)=>(<div key={i}><div style={{padding:'8px 20px',background:'var(--bg2)',fontSize:11,fontWeight:700,color:'var(--ink2)'}}>{DAYS[new Date(d.date+'T00:00:00').getDay()]} {formatDateInput(d.date)} — {formatCurrency(d.chi)}</div>{d.cpItems.map((r,j)=>{const mk=r.hinh_thuc_thanh_toan||'tien_mat';return(<div key={j} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 20px',borderBottom:'1px solid var(--line)',fontSize:12}}><span className={`method ${mk==='tien_mat'?'cash':mk==='chuyen_khoan'?'transfer':'card'}`}>{mk==='tien_mat'?'TM':mk==='chuyen_khoan'?'CK':'QT'}</span><span style={{flex:1,color:'var(--ink2)'}}>{r.dien_giai||'Chi phí'}</span><span style={{fontWeight:700,color:'var(--danger)'}}>−{formatCurrency(r.so_tien)}</span></div>)})}</div>))}
        </div>
      </div>
    </div>
  )
}

// ════════════════ SUB: BÁO CÁO THÁNG ════════════════
function SubBaoCaoThang() {
  const now=getNowVN();const [thang,setThang]=useState(now.getMonth()+1);const [nam,setNam]=useState(now.getFullYear())
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true)
  useEffect(()=>{setLoading(true);const start=`${nam}-${String(thang).padStart(2,'0')}-01`;const last=new Date(nam,thang,0).getDate();const end=`${nam}-${String(thang).padStart(2,'0')}-${String(last).padStart(2,'0')}`;let ps,pe;if(thang===1){ps=`${nam-1}-12-01`;pe=`${nam-1}-12-31`}else{const pm=thang-1;const pld=new Date(nam,pm,0).getDate();ps=`${nam}-${String(pm).padStart(2,'0')}-01`;pe=`${nam}-${String(pm).padStart(2,'0')}-${String(pld).padStart(2,'0')}`}Promise.all([supabase.from('doanh_thu').select('so_tien,hinh_thuc,ngay').gte('ngay',start).lte('ngay',end).order('ngay'),supabase.from('chi_phi').select('so_tien,danh_muc_id,ngay').gte('ngay',start).lte('ngay',end),supabase.from('danh_muc_chi_phi').select('*').eq('is_active',true).order('thu_tu'),supabase.from('doanh_thu').select('so_tien').gte('ngay',ps).lte('ngay',pe),supabase.from('chi_phi').select('so_tien').gte('ngay',ps).lte('ngay',pe)]).then(([rDT,rCP,rDM,rPDT,rPCP])=>{const dt=rDT.data||[],cp=rCP.data||[];const thucThu=dt.filter(r=>r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+(r.so_tien||0),0);const tongChi=cp.reduce((s,r)=>s+(r.so_tien||0),0);const prevThu=(rPDT.data||[]).reduce((s,r)=>s+(r.so_tien||0),0);const prevChi=(rPCP.data||[]).reduce((s,r)=>s+(r.so_tien||0),0);const pctThu=prevThu>0?Math.round((thucThu-prevThu)/prevThu*100):0;const pctChi=prevChi>0?Math.round((tongChi-prevChi)/prevChi*100):0;const byDay={};for(let d=1;d<=last;d++){const iso=`${nam}-${String(thang).padStart(2,'0')}-${String(d).padStart(2,'0')}`;byDay[iso]={thu:0,chi:0,day:d}};dt.forEach(r=>{if(byDay[r.ngay]&&r.hinh_thuc!=='the_tra_truoc')byDay[r.ngay].thu+=(r.so_tien||0)});cp.forEach(r=>{if(byDay[r.ngay])byDay[r.ngay].chi+=(r.so_tien||0)});const days=Object.values(byDay);const tienMat=dt.filter(r=>r.hinh_thuc==='tien_mat').reduce((s,r)=>s+(r.so_tien||0),0);const ck=dt.filter(r=>r.hinh_thuc==='chuyen_khoan').reduce((s,r)=>s+(r.so_tien||0),0);const qt=dt.filter(r=>r.hinh_thuc==='quet_the').reduce((s,r)=>s+(r.so_tien||0),0);const tt=dt.filter(r=>r.hinh_thuc==='the_tra_truoc').reduce((s,r)=>s+(r.so_tien||0),0);const dmList=rDM.data||[];const nhomCha=dmList.filter(d=>!d.parent_id);const hangMuc=dmList.filter(d=>d.parent_id);const cpByNhom=nhomCha.map(n=>{const hmIds=hangMuc.filter(h=>h.parent_id===n.id).map(h=>h.id);const total=cp.filter(r=>hmIds.includes(r.danh_muc_id)).reduce((s,r)=>s+(r.so_tien||0),0);return{ten:n.ten,icon:n.icon,total}}).filter(n=>n.total>0).sort((a,b)=>b.total-a.total);setData({thucThu,tongChi,days,tienMat,ck,qt,tt,lastDay:last,cpByNhom,prevThu,prevChi,pctThu,pctChi});setLoading(false)}).catch(()=>setLoading(false))},[thang,nam])
  const chg=(d)=>{let m=thang+d;let y=nam;if(m>12){m=1;y++}if(m<1){m=12;y--};setThang(m);setNam(y)}
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  const maxV=Math.max(...data.days.map(d=>Math.max(d.thu,d.chi)),1)
  const loiNhuan=data.thucThu-data.tongChi
  const bienLN=data.thucThu>0?Math.round(loiNhuan/data.thucThu*100):0
  const ngayCoDT=data.days.filter(d=>d.thu>0).length
  const dtBinhQuan=ngayCoDT>0?Math.round(data.thucThu/ngayCoDT):0
  return (
    <div>
      <DateNavBar label={`${MONTHS[thang]} ${nam}`} onPrev={()=>chg(-1)} onNext={()=>chg(1)}>
        <span style={{fontSize:14,fontWeight:700,fontFamily:'var(--serif)',minWidth:140,textAlign:'center',padding:'0 8px'}}>{MONTHS[thang]} {nam}</span>
      </DateNavBar>
      <div className="strip" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:16}}>
        <div className="it"><div className="l">THỰC THU</div><div className="v" style={{color:'#426a2c'}}>{formatCurrency(data.thucThu)}</div><div className="d">{ngayCoDT} ngày · TB {formatCurrency(dtBinhQuan)}/ngày{data.prevThu>0?<span style={{color:data.pctThu>=0?'#426a2c':'#843a23',marginLeft:4}}>· {data.pctThu>=0?'↑':'↓'}{Math.abs(data.pctThu)}% vs TT</span>:''}</div></div>
        <div className="it"><div className="l">TỔNG CHI</div><div className="v" style={{color:'#843a23'}}>{formatCurrency(data.tongChi)}</div><div className="d">{data.days.filter(d=>d.chi>0).length} ngày có CP{data.prevChi>0?<span style={{color:data.pctChi<=0?'#426a2c':'#843a23',marginLeft:4}}>· {data.pctChi>=0?'↑':'↓'}{Math.abs(data.pctChi)}% vs TT</span>:''}</div></div>
        <div className="it"><div className="l">LỢI NHUẬN</div><div className="v" style={{color:loiNhuan>=0?'#426a2c':'#843a23'}}>{formatCurrency(loiNhuan)}</div><div className="d">Biên LN {bienLN}%</div></div>
        <div className="it"><div className="l">ĐÁNH GIÁ</div><div className="v" style={{color:bienLN>=30?'#426a2c':bienLN>=15?'#b08a55':'#843a23'}}>{bienLN>=30?'⭐ Tốt':bienLN>=15?'👍 Ổn':'⚠️ Thấp'}</div><div className="d">{data.prevThu>0?<span>TT: {formatCurrency(data.prevThu)}</span>:''}</div></div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendUp style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Thu Chi {data.lastDay} Ngày</h3></div><div className="legend"><span><i style={{background:'#6e8a5e'}}/>Thu</span><span><i style={{background:'#b85a4a'}}/>Chi</span></div></div>
        <div className="card-b">
          <div style={{display:'flex',alignItems:'flex-end',gap:1,height:160,padding:'0 4px'}}>
            {data.days.map((d,i)=>{const hThu=(d.thu/maxV)*140;const hChi=(d.chi/maxV)*140;return(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%',position:'relative'}}>{d.thu>0&&<div title={`${d.day}: Thu ${formatCurrency(d.thu)}`} style={{width:'100%',maxWidth:7,height:Math.max(hThu,1),background:'#6e8a5e',borderRadius:'2px 2px 0 0',opacity:.6,cursor:'pointer'}}/>}{d.chi>0&&<div title={`${d.day}: Chi ${formatCurrency(d.chi)}`} style={{width:'100%',maxWidth:7,height:Math.max(hChi,1),background:'#b85a4a',borderRadius:'2px 2px 0 0',opacity:.6,cursor:'pointer',marginTop:1}}/>}{i%3===0&&<span style={{fontSize:7,color:'var(--ink3)',marginTop:2}}>{d.day}</span>}{d.thu>maxV*0.7&&<span style={{position:'absolute',bottom:hThu+4,fontSize:8,fontWeight:700,color:'#426a2c',whiteSpace:'nowrap'}}>{(d.thu/1000000).toFixed(1)}M</span>}</div>)})}
          </div>
        </div>
      </div>
      <div className="fin-grid" style={{marginBottom:16,gridTemplateColumns:'1fr 1fr'}}>
        <div className="card">
          <div className="card-h"><div className="card-t"><div className="arch-i"><I.Tag style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Doanh Thu Theo Hình Thức</h3></div></div>
          <div className="card-b"><div className="donut-wrap"><DonutChart segments={[{v:data.tienMat,c:'#c9a96e'},{v:data.ck,c:'#a87366'},{v:data.qt,c:'#6e8a5e'},{v:data.tt,c:'#8a6a6e'}]} total={data.thucThu+data.tt||1}/><div className="donut-leg">{[{l:'Tiền Mặt',v:data.tienMat,c:'#c9a96e'},{l:'Chuyển Khoản',v:data.ck,c:'#a87366'},{l:'Quẹt Thẻ',v:data.qt,c:'#6e8a5e'},{l:'Thẻ Trả Trước',v:data.tt,c:'#8a6a6e'}].map((s,i)=>(<div className="row" key={i}><span className="sw" style={{background:s.c}}/><span>{s.l}</span><b>{formatCurrency(s.v)}</b><span className="pct">{Math.round(s.v/((data.thucThu+data.tt)||1)*100)}%</span></div>))}</div></div></div>
        </div>
        <div className="card">
          <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendDown style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Chi Phí Trong Tháng</h3></div><span className="chip">{MONTHS[thang]}</span></div>
          <div className="card-b">{data.cpByNhom.length===0?<div style={{textAlign:'center',padding:30,color:'var(--ink3)'}}>Không có chi phí</div>:<div className="donut-wrap"><DonutChart segments={data.cpByNhom.map((n,i)=>({v:n.total,c:['#c9a96e','#a87366','#6e8a5e','#8a6a6e','#5a8db8','#b85a4a'][i%6],l:n.ten}))} total={data.tongChi||1}/><div className="donut-leg">{data.cpByNhom.map((n,i)=>(<div className="row" key={i}><span className="sw" style={{background:['#c9a96e','#a87366','#6e8a5e','#8a6a6e','#5a8db8','#b85a4a'][i%6]}}/><span>{n.icon} {n.ten}</span><b>{formatCurrency(n.total)}</b><span className="pct">{Math.round(n.total/(data.tongChi||1)*100)}%</span></div>))}</div></div>}</div>
        </div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Receipt style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Phân Tích Lợi Nhuận</h3></div></div>
        <div className="card-b">
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            <div style={{textAlign:'center',padding:12}}><div style={{fontSize:10,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:600}}>Tổng DT</div><div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:700,marginTop:4}}>{formatCurrency(data.thucThu+data.tt)}</div></div>
            <div style={{textAlign:'center',padding:12}}><div style={{fontSize:10,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:600}}>Thực Thu</div><div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:700,color:'#426a2c',marginTop:4}}>{formatCurrency(data.thucThu)}</div></div>
            <div style={{textAlign:'center',padding:12}}><div style={{fontSize:10,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:600}}>Tổng Chi</div><div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:700,color:'#843a23',marginTop:4}}>{formatCurrency(data.tongChi)}</div></div>
            <div style={{textAlign:'center',padding:12}}><div style={{fontSize:10,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:600}}>Lợi Nhuận</div><div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:700,color:loiNhuan>=0?'#426a2c':'#843a23',marginTop:4}}>{formatCurrency(loiNhuan)}</div></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginTop:12}}>
            <div className="rec-row"><span>Biên lợi nhuận</span><span style={{fontWeight:700}}>{bienLN}%</span></div>
            <div className="rec-row"><span>DT bình quân/ngày</span><span style={{fontWeight:700}}>{formatCurrency(dtBinhQuan)}</span></div>
            <div className="rec-row"><span>Ngày có doanh thu</span><span style={{fontWeight:700}}>{ngayCoDT}/{data.lastDay}</span></div>
            <div className="rec-row"><span>Tỉ lệ chi/phí</span><span style={{fontWeight:700,color:data.tongChi>data.thucThu*0.7?'#843a23':'#426a2c'}}>{data.thucThu>0?Math.round(data.tongChi/data.thucThu*100):0}%</span></div>
          </div>
        </div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.Bell style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Cảnh Báo & Lời Khuyên Tháng {thang}</h3></div></div>
        <div className="card-b">
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {bienLN<15&&(<div className="alert warn"><div className="ai"><I.Bell style={{width:15,height:15}}/></div><div style={{flex:1}}><b>Biên lợi nhuận thấp ({bienLN}%)</b> — Cân nhắc giảm chi phí hoặc đẩy mạnh khuyến mãi để tăng doanh thu.</div></div>)}
            {data.tienMat>data.thucThu*0.6&&(<div className="alert info"><div className="ai"><I.Coin style={{width:15,height:15}}/></div><div style={{flex:1}}><b>Tiền mặt chiếm {Math.round(data.tienMat/(data.thucThu||1)*100)}%</b> — Nên nộp MB Bank thường xuyên để an toàn.</div></div>)}
            {data.ck<data.thucThu*0.2&&(<div className="alert info"><div className="ai"><I.Bank style={{width:15,height:15}}/></div><div style={{flex:1}}><b>Chuyển khoản thấp ({Math.round(data.ck/(data.thucThu||1)*100)}%)</b> — Khuyến khích khách CK để dễ quản lý.</div></div>)}
            {bienLN>=30&&(<div className="alert ok" style={{background:'#e8f1de',borderLeft:'3px solid #6e8a5e',color:'#2c4a30'}}><div className="ai"><I.Star style={{width:15,height:15}}/></div><div style={{flex:1}}><b>Tháng kinh doanh tốt!</b> Biên lợi nhuận {bienLN}% — Cân nhắc thưởng nhân viên để tạo động lực.</div></div>)}
            {loiNhuan<0&&(<div className="alert danger"><div className="ai"><I.TrendDown style={{width:15,height:15}}/></div><div style={{flex:1}}><b>Lỗ {formatCurrency(Math.abs(loiNhuan))}!</b> Cần xem xét cắt giảm chi phí khẩn cấp và đẩy mạnh marketing.</div></div>)}
            {data.tongChi>data.thucThu*0.8&&(<div className="alert warn"><div className="ai"><I.Receipt style={{width:15,height:15}}/></div><div style={{flex:1}}><b>Chi phí cao ({Math.round(data.tongChi/(data.thucThu||1)*100)}% doanh thu)</b> — Rà soát các khoản chi không cần thiết.</div></div>)}
            <div className="alert info"><div className="ai"><I.Speaker style={{width:15,height:15}}/></div><div style={{flex:1}}><b>Gợi ý:</b> Đẩy mạnh dịch vụ có hoa hồng cao, gửi tin nhắn chăm sóc khách hàng cũ, đăng bài Facebook/Zalo đều đặn để thu hút khách mới.</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════ SUB: BÁO CÁO NĂM ════════════════
function SubBaoCaoNam() {
  const now=getNowVN();const [nam,setNam]=useState(now.getFullYear())
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true)
  useEffect(()=>{setLoading(true);const promises=[];for(let m=1;m<=12;m++){const start=`${nam}-${String(m).padStart(2,'0')}-01`;const lastDay=new Date(nam,m,0).getDate();const end=`${nam}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;promises.push(supabase.from('doanh_thu').select('so_tien,hinh_thuc').gte('ngay',start).lte('ngay',end));promises.push(supabase.from('chi_phi').select('so_tien').gte('ngay',start).lte('ngay',end))}
  for(let m=1;m<=12;m++){const start=`${nam-1}-${String(m).padStart(2,'0')}-01`;const lastDay=new Date(nam-1,m,0).getDate();const end=`${nam-1}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;promises.push(supabase.from('doanh_thu').select('so_tien').gte('ngay',start).lte('ngay',end))}
  Promise.all(promises).then(results=>{const months=[];let tongThuNam=0,tongChiNam=0,tongThuNamTruoc=0;for(let m=0;m<12;m++){const dtRes=results[m*2];const cpRes=results[m*2+1];const prevRes=results[24+m];const thucThu=(dtRes.data||[]).filter(r=>r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+(r.so_tien||0),0);const tongChi=(cpRes.data||[]).reduce((s,r)=>s+(r.so_tien||0),0);const prevThu=(prevRes.data||[]).reduce((s,r)=>s+(r.so_tien||0),0);months.push({thang:m+1,thucThu,tongChi,loiNhuan:thucThu-tongChi,prevThu});tongThuNam+=thucThu;tongChiNam+=tongChi;tongThuNamTruoc+=prevThu}
  const top5=[...months].sort((a,b)=>b.thucThu-a.thucThu).slice(0,5);setData({months,tongThuNam,tongChiNam,tongThuNamTruoc,top5});setLoading(false)}).catch(()=>setLoading(false))},[nam])
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  const maxV=Math.max(...data.months.map(m=>Math.max(m.thucThu,m.tongChi)),1)
  const loiNhuanNam=data.tongThuNam-data.tongChiNam
  const pctChange=data.tongThuNamTruoc>0?Math.round((data.tongThuNam-data.tongThuNamTruoc)/data.tongThuNamTruoc*100):0
  return (
    <div>
      <DateNavBar label={`Năm ${nam}`} onPrev={()=>setNam(n=>n-1)} onNext={()=>setNam(n=>n+1)}>
        <span style={{fontSize:16,fontWeight:700,fontFamily:'var(--serif)',minWidth:70,textAlign:'center'}}>{nam}</span>
      </DateNavBar>
      <div className="strip" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:16}}>
        <div className="it"><div className="l">TỔNG THU NĂM</div><div className="v" style={{color:'#426a2c'}}>{data.tongThuNam>=1000000?(data.tongThuNam/1000000).toFixed(1)+'M':formatCurrency(data.tongThuNam)}</div><div className="d">12 tháng {pctChange!==0?<span style={{color:pctChange>=0?'#426a2c':'#843a23'}}>· {pctChange>=0?'↑':'↓'}{Math.abs(pctChange)}% vs {nam-1}</span>:''}</div></div>
        <div className="it"><div className="l">TỔNG CHI NĂM</div><div className="v" style={{color:'#843a23'}}>{data.tongChiNam>=1000000?(data.tongChiNam/1000000).toFixed(1)+'M':formatCurrency(data.tongChiNam)}</div><div className="d">12 tháng</div></div>
        <div className="it"><div className="l">LỢI NHUẬN</div><div className="v" style={{color:loiNhuanNam>=0?'#426a2c':'#843a23'}}>{Math.abs(loiNhuanNam)>=1000000?(Math.abs(loiNhuanNam)/1000000).toFixed(1)+'M':formatCurrency(Math.abs(loiNhuanNam))}</div><div className="d">Biên {data.tongThuNam>0?Math.round(loiNhuanNam/data.tongThuNam*100):0}%</div></div>
        <div className="it"><div className="l">SO NĂM TRƯỚC</div><div className="v" style={{color:pctChange>=0?'#426a2c':'#843a23'}}>{pctChange>=0?'↑':'↓'}{Math.abs(pctChange)}%</div><div className="d">Thực thu {nam-1}: {(data.tongThuNamTruoc/1000000).toFixed(1)}M</div></div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div className="card-h"><div className="card-t"><div className="arch-i"><I.TrendUp style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Thu Chi 12 Tháng</h3></div><div className="legend"><span><i style={{background:'#6e8a5e'}}/>Thu</span><span><i style={{background:'#b85a4a'}}/>Chi</span></div></div>
        <div className="card-b"><div style={{display:'flex',alignItems:'flex-end',gap:8,height:200}}>{data.months.map((m,i)=>{const hThu=(m.thucThu/maxV)*180;const hChi=(m.tongChi/maxV)*180;const isNow=m.thang===now.getMonth()+1&&nam===now.getFullYear();return(<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%'}}><div style={{display:'flex',gap:4,alignItems:'flex-end',height:180}}><div style={{width:12,height:Math.max(hThu,1),borderRadius:'4px 4px 0 0',background:isNow?'var(--grad-gold)':'#6e8a5e',opacity:isNow?1:.6}}/><div style={{width:12,height:Math.max(hChi,1),borderRadius:'4px 4px 0 0',background:'#b85a4a',opacity:.6}}/></div><span style={{fontSize:10,fontWeight:isNow?700:500,color:isNow?'var(--espresso)':'var(--ink3)',marginTop:6}}>T{m.thang}</span><span style={{fontSize:9,color:'#426a2c',fontWeight:600}}>{m.thucThu>0?(m.thucThu/1000000).toFixed(1)+'M':''}</span></div>)})}</div></div>
      </div>
      <div className="card"><div className="card-h"><div className="card-t"><div className="arch-i"><I.Star style={{width:13,height:13,color:'#c9a96e'}}/></div><h3>Top 5 Tháng Doanh Thu Cao Nhất {nam}</h3></div></div>
        <div className="card-b" style={{padding:0}}><table className="tbl"><thead><tr><th style={{paddingLeft:20}}>#</th><th>Tháng</th><th>Doanh Thu</th><th>Chi Phí</th><th className="amount" style={{paddingRight:20}}>Lợi Nhuận</th></tr></thead><tbody>{data.top5.map((m,i)=>(<tr key={i}><td style={{paddingLeft:20,fontWeight:700,color:i===0?'var(--champagne)':'var(--ink3)'}}>#{i+1}</td><td style={{fontWeight:600}}>{MONTHS[m.thang]}</td><td style={{color:'#426a2c',fontWeight:600}}>{formatCurrency(m.thucThu)}</td><td style={{color:'#843a23',fontWeight:600}}>{formatCurrency(m.tongChi)}</td><td className="amount" style={{paddingRight:20,color:m.loiNhuan>=0?'#426a2c':'#843a23',fontWeight:700}}>{formatCurrency(m.loiNhuan)}</td></tr>))}</tbody></table></div>
      </div>
    </div>
  )
}

// ════════════════ SUB: BÁO CÁO DÒNG TIỀN ════════════════
function SubBaoCaoDongTien() {
  const now=getNowVN();const [thang,setThang]=useState(now.getMonth()+1);const [nam,setNam]=useState(now.getFullYear())
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true)
  useEffect(()=>{setLoading(true);const start=`${nam}-${String(thang).padStart(2,'0')}-01`;const last=new Date(nam,thang,0).getDate();const end=`${nam}-${String(thang).padStart(2,'0')}-${String(last).padStart(2,'0')}`;Promise.all([supabase.from('so_du_vi_thuc_te').select('*').order('thu_tu'),supabase.from('doanh_thu').select('so_tien,hinh_thuc').gte('ngay',start).lte('ngay',end),supabase.from('chi_phi').select('so_tien,hinh_thuc_thanh_toan').gte('ngay',start).lte('ngay',end),supabase.from('chuyen_khoan_noi_bo').select('so_tien,tu_vi_id,den_vi_id').gte('ngay',start).lte('ngay',end)]).then(([rVi,rDT,rCP,rCK])=>{const viList=rVi.data||[];const dtList=rDT.data||[];const cpList=rCP.data||[];const ckList=rCK.data||[];const cashflow=viList.map(vi=>{const thuVao=dtList.filter(r=>r.hinh_thuc===vi.loai).reduce((s,r)=>s+(r.so_tien||0),0);const chiRa=cpList.filter(r=>r.hinh_thuc_thanh_toan===vi.loai).reduce((s,r)=>s+(r.so_tien||0),0);const ckDi=ckList.filter(r=>r.tu_vi_id===vi.id).reduce((s,r)=>s+(r.so_tien||0),0);const ckDen=ckList.filter(r=>r.den_vi_id===vi.id).reduce((s,r)=>s+(r.so_tien||0),0);const soDuHienTai=vi.so_du_hien_tai||0;const soDuDau=soDuHienTai-thuVao+chiRa+ckDi-ckDen;return{ten:vi.ten,loai:vi.loai,soDuDau,thuVao,chiRa,ckDi,ckDen,soDuCuoi:soDuHienTai}});const tong={soDuDau:cashflow.reduce((s,c)=>s+c.soDuDau,0),thuVao:cashflow.reduce((s,c)=>s+c.thuVao,0),chiRa:cashflow.reduce((s,c)=>s+c.chiRa,0),ckDi:cashflow.reduce((s,c)=>s+c.ckDi,0),ckDen:cashflow.reduce((s,c)=>s+c.ckDen,0),soDuCuoi:cashflow.reduce((s,c)=>s+c.soDuCuoi,0)};setData({cashflow,tong});setLoading(false)}).catch(()=>setLoading(false))},[thang,nam])
  const chg=(d)=>{let m=thang+d;let y=nam;if(m>12){m=1;y++}if(m<1){m=12;y--};setThang(m);setNam(y)}
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  const ig={tien_mat:'linear-gradient(180deg,#e0eedd,#bfd5b8)',chuyen_khoan:'linear-gradient(180deg,#dde9f3,#a8c5dc)',quet_the:'linear-gradient(180deg,#f0dcc0,#d4a574)'}
  return (
    <div>
      <DateNavBar label={`Lưu chuyển tiền tệ — ${MONTHS[thang]} ${nam}`} onPrev={()=>chg(-1)} onNext={()=>chg(1)}>
        <span style={{fontSize:14,fontWeight:700,fontFamily:'var(--serif)',minWidth:140,textAlign:'center'}}>{MONTHS[thang]} {nam}</span>
      </DateNavBar>
      <div className="card" style={{marginBottom:16}}><div className="card-h"><div className="card-t"><div className="arch-i"><I.Wallet style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Lưu Chuyển Tiền Tệ</h3></div></div><div className="card-b" style={{padding:0}}>
        <table className="tbl"><thead><tr><th style={{paddingLeft:20}}>Chỉ Tiêu</th><th>Tiền Mặt</th><th>MB Bank</th><th>TP Bank</th><th className="amount" style={{paddingRight:20}}>Tổng</th></tr></thead><tbody>
          <tr><td style={{paddingLeft:20,fontWeight:600}}>Số dư đầu kỳ</td>{data.cashflow.map((c,i)=><td key={i}>{formatCurrency(c.soDuDau)}</td>)}<td className="amount" style={{paddingRight:20,fontWeight:700}}>{formatCurrency(data.tong.soDuDau)}</td></tr>
          <tr><td style={{paddingLeft:20,fontWeight:600,color:'#426a2c'}}>➕ Thu vào</td>{data.cashflow.map((c,i)=><td key={i} style={{color:'#426a2c'}}>+{formatCurrency(c.thuVao)}</td>)}<td className="amount" style={{paddingRight:20,color:'#426a2c',fontWeight:700}}>+{formatCurrency(data.tong.thuVao)}</td></tr>
          <tr><td style={{paddingLeft:20,fontWeight:600,color:'#843a23'}}>➖ Chi ra</td>{data.cashflow.map((c,i)=><td key={i} style={{color:'#843a23'}}>−{formatCurrency(c.chiRa)}</td>)}<td className="amount" style={{paddingRight:20,color:'#843a23',fontWeight:700}}>−{formatCurrency(data.tong.chiRa)}</td></tr>
          <tr><td style={{paddingLeft:20,fontWeight:600,color:'#6C3483'}}>🔄 CK đi</td>{data.cashflow.map((c,i)=><td key={i} style={{color:'#6C3483'}}>−{formatCurrency(c.ckDi)}</td>)}<td className="amount" style={{paddingRight:20,color:'#6C3483',fontWeight:700}}>−{formatCurrency(data.tong.ckDi)}</td></tr>
          <tr><td style={{paddingLeft:20,fontWeight:600,color:'#6C3483'}}>🔄 CK đến</td>{data.cashflow.map((c,i)=><td key={i} style={{color:'#6C3483'}}>+{formatCurrency(c.ckDen)}</td>)}<td className="amount" style={{paddingRight:20,color:'#6C3483',fontWeight:700}}>+{formatCurrency(data.tong.ckDen)}</td></tr>
          <tr style={{background:'var(--bg2)'}}><td style={{paddingLeft:20,fontWeight:700,fontSize:13}}>Số dư cuối kỳ</td>{data.cashflow.map((c,i)=><td key={i} style={{fontWeight:700}}>{formatCurrency(c.soDuCuoi)}</td>)}<td className="amount" style={{paddingRight:20,fontWeight:700,fontSize:14}}>{formatCurrency(data.tong.soDuCuoi)}</td></tr>
        </tbody></table></div></div>
      <div className="rec-grid">{data.cashflow.map((c,i)=>(<div className="rec-box" key={i}><h4><div style={{display:'flex',alignItems:'center',gap:10}}><div className="ic-pill" style={{background:ig[c.loai]||''}}>{c.loai==='tien_mat'?'💵':c.loai==='chuyen_khoan'?'🏦':'💳'}</div>{c.ten}</div></h4><div className="rec-row"><span>Đầu kỳ</span><span>{formatCurrency(c.soDuDau)}</span></div><div className="rec-row"><span>➕ Thu</span><span style={{color:'#426a2c'}}>+{formatCurrency(c.thuVao)}</span></div><div className="rec-row"><span>➖ Chi</span><span style={{color:'#843a23'}}>−{formatCurrency(c.chiRa)}</span></div><div className="rec-row"><span>🔄 CK ròng</span><span style={{color:'#6C3483'}}>{c.ckDen-c.ckDi>=0?'+':''}{formatCurrency(c.ckDen-c.ckDi)}</span></div><div className="rec-row tot"><span>Cuối kỳ</span><span>{formatCurrency(c.soDuCuoi)}</span></div></div>))}</div>
    </div>
  )
}

// ════════════════ SUB: PHÂN TÍCH CHI PHÍ ════════════════
function SubPhanTichChiPhi() {
  const now=getNowVN();const [thang,setThang]=useState(now.getMonth()+1);const [nam,setNam]=useState(now.getFullYear())
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true);const [expanded,setExpanded]=useState({})
  useEffect(()=>{setLoading(true);const start=`${nam}-${String(thang).padStart(2,'0')}-01`;const last=new Date(nam,thang,0).getDate();const end=`${nam}-${String(thang).padStart(2,'0')}-${String(last).padStart(2,'0')}`;Promise.all([supabase.from('chi_phi').select('so_tien,danh_muc_id').gte('ngay',start).lte('ngay',end),supabase.from('danh_muc_chi_phi').select('*').eq('is_active',true).order('thu_tu')]).then(([rCP,rDM])=>{const cpList=rCP.data||[];const dmList=rDM.data||[];const nhomCha=dmList.filter(d=>!d.parent_id);const hangMuc=dmList.filter(d=>d.parent_id);const tongChi=cpList.reduce((s,r)=>s+(r.so_tien||0),0);const nhomData=nhomCha.map(n=>{const _hmIds=hangMuc.filter(h=>h.parent_id===n.id).map(h=>h.id);const items=hangMuc.filter(h=>h.parent_id===n.id).map(hm=>{const total=cpList.filter(r=>r.danh_muc_id===hm.id).reduce((s,r)=>s+(r.so_tien||0),0);return{...hm,total}}).filter(hm=>hm.total>0).sort((a,b)=>b.total-a.total);const total=items.reduce((s,hm)=>s+hm.total,0);return{id:n.id,ten:n.ten,icon:n.icon,total,items}}).filter(n=>n.total>0).sort((a,b)=>b.total-a.total);setData({nhomData,tongChi});setLoading(false)}).catch(()=>setLoading(false))},[thang,nam])
  const chg=(d)=>{let m=thang+d;let y=nam;if(m>12){m=1;y++}if(m<1){m=12;y--};setThang(m);setNam(y)}
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  const colors=['#c9a96e','#a87366','#6e8a5e','#8a6a6e','#5a8db8','#b85a4a']
  return (
    <div>
      <DateNavBar label={`Theo nhóm & hạng mục — ${MONTHS[thang]} ${nam}`} onPrev={()=>chg(-1)} onNext={()=>chg(1)}>
        <span style={{fontSize:14,fontWeight:700,fontFamily:'var(--serif)',minWidth:140,textAlign:'center'}}>{MONTHS[thang]} {nam}</span>
      </DateNavBar>
      <div className="fin-grid" style={{marginBottom:16,gridTemplateColumns:'1fr 1fr'}}>
        <div className="card"><div className="card-h"><div className="card-t"><div className="arch-i"><I.Tag style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Tổng Chi: {formatCurrency(data.tongChi)}</h3></div></div>
          <div className="card-b">{data.nhomData.length===0?<div style={{textAlign:'center',padding:30,color:'var(--ink3)'}}>Không có chi phí</div>:data.nhomData.map((n,i)=>{const pct=Math.round(n.total/(data.tongChi||1)*100);return(<div key={i} style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><span style={{fontSize:12.5,fontWeight:600,color:'var(--ink)'}}>{n.icon} {n.ten}</span><span style={{fontSize:12.5,fontWeight:700}}>{formatCurrency(n.total)} <span style={{color:'var(--ink3)',fontWeight:400}}>({pct}%)</span></span></div><div className="bar-h"><i style={{width:pct+'%',background:colors[i%6]}}/></div></div>)})}</div>
        </div>
        <div className="card"><div className="card-h"><div className="card-t"><div className="arch-i"><I.Tag style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Cơ Cấu Chi Phí</h3></div></div>
          <div className="card-b">{data.nhomData.length===0?<div style={{textAlign:'center',padding:30,color:'var(--ink3)'}}>Chưa có dữ liệu</div>:<div className="donut-wrap"><DonutChart segments={data.nhomData.map((n,i)=>({v:n.total,c:colors[i%6]}))} total={data.tongChi||1}/><div className="donut-leg">{data.nhomData.map((n,i)=>(<div className="row" key={i}><span className="sw" style={{background:colors[i%6]}}/><span>{n.ten}</span><b>{formatCurrency(n.total)}</b></div>))}</div></div>}</div>
        </div>
      </div>
      {data.nhomData.map((n,i)=>(<div className="card" key={i} style={{marginBottom:12}}><div className="card-h" style={{cursor:'pointer'}} onClick={()=>setExpanded(p=>({...p,[n.id]:!p[n.id]}))}><div className="card-t"><div className="arch-i"><I.Tag style={{width:13,height:13,color:colors[i%6]}}/></div><h3>{n.icon} {n.ten} — {formatCurrency(n.total)}</h3><span className="sub">{n.items.length} hạng mục · {Math.round(n.total/(data.tongChi||1)*100)}%</span></div><span style={{color:'var(--ink3)',fontSize:12}}>{expanded[n.id]?'▾':'▸'}</span></div>{expanded[n.id]&&<div className="card-b" style={{padding:0}}><table className="tbl"><thead><tr><th style={{paddingLeft:20}}>Hạng Mục</th><th className="amount" style={{paddingRight:20}}>Số Tiền</th><th className="amount" style={{paddingRight:20}}>% Nhóm</th></tr></thead><tbody>{n.items.map((hm,j)=>(<tr key={j}><td style={{paddingLeft:20,fontWeight:500}}>{hm.ten}</td><td className="amount" style={{paddingRight:20}}>{formatCurrency(hm.total)}</td><td className="amount" style={{paddingRight:20}}>{Math.round(hm.total/(n.total||1)*100)}%</td></tr>))}</tbody></table></div>}</div>))}
    </div>
  )
}

// ════════════════ SUB: PHÂN TÍCH DOANH THU ════════════════
function SubPhanTichDoanhThu() {
  const now=getNowVN();const [thang,setThang]=useState(now.getMonth()+1);const [nam,setNam]=useState(now.getFullYear())
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true)
  useEffect(()=>{setLoading(true);const start=`${nam}-${String(thang).padStart(2,'0')}-01`;const last=new Date(nam,thang,0).getDate();const end=`${nam}-${String(thang).padStart(2,'0')}-${String(last).padStart(2,'0')}`;let prevS,prevE;if(thang===1){prevS=`${nam-1}-12-01`;prevE=`${nam-1}-12-31`}else{const pm=thang-1;const pld=new Date(nam,pm,0).getDate();prevS=`${nam}-${String(pm).padStart(2,'0')}-01`;prevE=`${nam}-${String(pm).padStart(2,'0')}-${String(pld).padStart(2,'0')}`}Promise.all([supabase.from('doanh_thu').select('so_tien,hinh_thuc,ngay,dien_giai').gte('ngay',start).lte('ngay',end).order('ngay',{ascending:false}),supabase.from('doanh_thu').select('so_tien,hinh_thuc').gte('ngay',prevS).lte('ngay',prevE)]).then(([rDT,rPrev])=>{const dtList=rDT.data||[];const prevList=rPrev.data||[];const byHT={};['tien_mat','chuyen_khoan','quet_the','the_tra_truoc'].forEach(h=>{byHT[h]={total:dtList.filter(r=>r.hinh_thuc===h).reduce((s,r)=>s+(r.so_tien||0),0),count:dtList.filter(r=>r.hinh_thuc===h).length,prev:prevList.filter(r=>r.hinh_thuc===h).reduce((s,r)=>s+(r.so_tien||0),0)}});const tongDT=dtList.reduce((s,r)=>s+(r.so_tien||0),0);const thucThu=dtList.filter(r=>r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+(r.so_tien||0),0);const prevTT=prevList.filter(r=>r.hinh_thuc!=='the_tra_truoc').reduce((s,r)=>s+(r.so_tien||0),0);setData({dtList,byHT,tongDT,thucThu,prevTT});setLoading(false)}).catch(()=>setLoading(false))},[thang,nam])
  const chg=(d)=>{let m=thang+d;let y=nam;if(m>12){m=1;y++}if(m<1){m=12;y--};setThang(m);setNam(y)}
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  const pctChg=data.prevTT>0?Math.round((data.thucThu-data.prevTT)/data.prevTT*100):0
  const htLabels={tien_mat:'Tiền Mặt',chuyen_khoan:'Chuyển Khoản',quet_the:'Quẹt Thẻ',the_tra_truoc:'Thẻ Trả Trước'}
  const htIcons={tien_mat:'💵',chuyen_khoan:'🏦',quet_the:'💳',the_tra_truoc:'🎫'}
  const htColors={tien_mat:'#3e5a32',chuyen_khoan:'#1a4f70',quet_the:'#5e2f74',the_tra_truoc:'#6e4a1f'}
  const donutColors=['#c9a96e','#a87366','#6e8a5e','#8a6a6e']
  return (
    <div>
      <DateNavBar label={`Theo hình thức thu — ${MONTHS[thang]} ${nam}`} onPrev={()=>chg(-1)} onNext={()=>chg(1)}>
        <span style={{fontSize:14,fontWeight:700,fontFamily:'var(--serif)',minWidth:140,textAlign:'center'}}>{MONTHS[thang]} {nam}</span>
      </DateNavBar>
      <div className="strip" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
        <div className="it"><div className="l">TỔNG DOANH THU</div><div className="v" style={{color:'#426a2c'}}>{formatCurrency(data.tongDT)}</div><div className="d">{data.dtList.length} giao dịch</div></div>
        <div className="it"><div className="l">THỰC THU</div><div className="v" style={{color:'#426a2c'}}>{formatCurrency(data.thucThu)}</div><div className="d">Không tính thẻ TT</div></div>
        <div className="it"><div className="l">SO THÁNG TRƯỚC</div><div className="v" style={{color:pctChg>=0?'#426a2c':'#843a23'}}>{pctChg>=0?'↑':'↓'}{Math.abs(pctChg)}%</div><div className="d">Thực thu tháng trước: {formatCurrency(data.prevTT)}</div></div>
      </div>
      <div className="fin-grid" style={{marginBottom:16,gridTemplateColumns:'1fr 1fr'}}>
        <div className="card"><div className="card-h"><div className="card-t"><div className="arch-i"><I.Tag style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Cơ Cấu Doanh Thu</h3></div></div>
          <div className="card-b"><div className="donut-wrap"><DonutChart segments={['tien_mat','chuyen_khoan','quet_the','the_tra_truoc'].map((h,i)=>({v:data.byHT[h].total,c:donutColors[i]}))} total={data.tongDT||1}/><div className="donut-leg">{['tien_mat','chuyen_khoan','quet_the','the_tra_truoc'].map((h,i)=>(<div className="row" key={i}><span className="sw" style={{background:donutColors[i]}}/><span>{htLabels[h]}</span><b>{formatCurrency(data.byHT[h].total)}</b></div>))}</div></div></div>
        </div>
        <div className="card"><div className="card-h"><div className="card-t"><div className="arch-i"><I.Receipt style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Chi Tiết Từng Hình Thức</h3></div></div>
          <div className="card-b">{['tien_mat','chuyen_khoan','quet_the','the_tra_truoc'].map((h,i)=>{const info=data.byHT[h];const pct=data.tongDT>0?Math.round(info.total/data.tongDT*100):0;const prevPct=info.prev>0?Math.round((info.total-info.prev)/info.prev*100):0;return(<div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'var(--bg2)',border:'1px solid var(--line)',marginBottom:i<3?8:0}}><div style={{fontSize:22}}>{htIcons[h]}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{htLabels[h]}</div><div style={{fontSize:11,color:'var(--ink3)'}}>{info.count} giao dịch · {pct}%{info.prev>0?<span style={{color:prevPct>=0?'#426a2c':'#843a23',marginLeft:4}}>· {prevPct>=0?'↑':'↓'}{Math.abs(prevPct)}% vs TT</span>:''}</div></div><div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:700,color:htColors[h]}}>{formatCurrency(info.total)}</div></div>)})}</div>
        </div>
      </div>
    </div>
  )
}

// ════════════════ NOP TIEN MAT TABLE ════════════════
function NopTienMatTable({ data }) {
  const sorted = [...data.history].sort((a, b) => a.ngay.localeCompare(b.ngay))
  return (
    <table className="tbl">
      <thead><tr>
        <th style={{ paddingLeft: 20 }}>Ngày</th>
        <th>Thu TM</th><th>Chi TM</th><th>Phải Nộp</th><th>Đã Nộp MB</th>
        <th>Luỹ Kế Phải Nộp</th><th>Luỹ Kế Đã Nộp</th>
        <th className="amount" style={{ paddingRight: 20 }}>Trạng Thái</th>
      </tr></thead>
      <tbody>
        {sorted.map((d, i) => {
          const p = d.dtTm - d.cpTm
          const isAm = p < 0
          const lkp = sorted.slice(0, i + 1).reduce((s, x) => s + (x.dtTm - x.cpTm), 0)
          const lkd = sorted.slice(0, i + 1).reduce((s, x) => s + (x.daNop || 0), 0)
          const thieu = lkp - lkd
          const ok = thieu <= 0 || lkp <= 0
          let status, bg, color
          if (isAm) { status = `🔴 Âm ${formatCurrency(Math.abs(p))}`; bg = '#fae0d8'; color = '#6e2818' }
          else if (p === 0 && d.dtTm === 0 && d.cpTm === 0) { status = '—'; bg = 'var(--bg2)'; color = 'var(--ink3)' }
          else if (ok) { status = '🟢 Đã nộp'; bg = '#e8f1de'; color = '#426a2c' }
          else { status = `🟡 Thiếu ${formatCurrency(thieu)}`; bg = '#fbf3df'; color = '#5e441b' }
          return (
            <tr key={i}>
              <td style={{ paddingLeft: 20, fontWeight: 600 }}>{formatDateInput(d.ngay)}</td>
              <td style={{ color: '#426a2c', fontWeight: 600 }}>{d.dtTm > 0 ? formatCurrency(d.dtTm) : '—'}</td>
              <td style={{ color: '#843a23', fontWeight: 600 }}>
                {d.cpTm > 0 ? formatCurrency(d.cpTm) : '—'}
                {isAm && <span style={{ fontSize: 9, color: '#843a23', display: 'block' }}>Âm {formatCurrency(Math.abs(p))}</span>}
              </td>
              <td style={{ fontWeight: 600, color: isAm ? '#843a23' : p > 0 ? 'var(--ink)' : 'var(--ink3)' }}>
                {isAm ? formatCurrency(p) : p > 0 ? formatCurrency(p) : '—'}
              </td>
              <td>{d.daNop > 0 ? formatCurrency(d.daNop) : '—'}</td>
              <td style={{ fontWeight: 600, color: lkp >= 0 ? '#426a2c' : '#843a23' }}>{lkp !== 0 ? formatCurrency(lkp) : '—'}</td>
              <td style={{ fontWeight: 600, color: '#1a4f70' }}>{lkd > 0 ? formatCurrency(lkd) : '—'}</td>
              <td className="amount" style={{ paddingRight: 20 }}>
                <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 600, background: bg, color: color }}>{status}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ════════════════ SUB: LỊCH SỬ NỘP TIỀN MẶT ════════════════
function SubLichSuNopTienMat() {
  const now=getNowVN();const [thang,setThang]=useState(now.getMonth()+1);const [nam,setNam]=useState(now.getFullYear())
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true)
  useEffect(()=>{setLoading(true);const start=`${nam}-${String(thang).padStart(2,'0')}-01`;const last=new Date(nam,thang,0).getDate();const end=`${nam}-${String(thang).padStart(2,'0')}-${String(last).padStart(2,'0')}`;supabase.from('so_du_vi_thuc_te').select('*').then(rVi=>{const viList=rVi.data||[];const tmVi=viList.find(v=>v.loai==='tien_mat');const mbVi=viList.find(v=>v.loai==='chuyen_khoan');if(!tmVi||!mbVi){setData({history:[],tongNop:0,tongPhaiNop:0});setLoading(false);return};Promise.all([supabase.from('chuyen_khoan_noi_bo').select('*').eq('tu_vi_id',tmVi.id).eq('den_vi_id',mbVi.id).gte('ngay',start).lte('ngay',end).order('ngay',{ascending:false}),supabase.from('doanh_thu').select('so_tien,ngay').eq('hinh_thuc','tien_mat').gte('ngay',start).lte('ngay',end),supabase.from('chi_phi').select('so_tien,ngay').eq('hinh_thuc_thanh_toan','tien_mat').gte('ngay',start).lte('ngay',end)]).then(([rCK,rDT,rCP])=>{const ckList=rCK.data||[];const dtByDay={};(rDT.data||[]).forEach(r=>{dtByDay[r.ngay]=(dtByDay[r.ngay]||0)+(r.so_tien||0)});const cpByDay={};(rCP.data||[]).forEach(r=>{cpByDay[r.ngay]=(cpByDay[r.ngay]||0)+(r.so_tien||0)});const dayMap={};for(let d=1;d<=last;d++){const iso=`${nam}-${String(thang).padStart(2,'0')}-${String(d).padStart(2,'0')}`;dayMap[iso]={ngay:iso,dtTm:dtByDay[iso]||0,cpTm:cpByDay[iso]||0,daNop:0}};ckList.forEach(ck=>{if(dayMap[ck.ngay])dayMap[ck.ngay].daNop+=(ck.so_tien||0)});const history=Object.values(dayMap).filter(d=>d.dtTm>0||d.cpTm>0||d.daNop>0).sort((a,b)=>b.ngay.localeCompare(a.ngay));const tongNop=ckList.reduce((s,r)=>s+(r.so_tien||0),0);const tongPhaiNop=history.reduce((s,d)=>s+d.dtTm-d.cpTm,0);setData({history,tongNop,tongPhaiNop});setLoading(false)})}).catch(()=>setLoading(false))},[thang,nam])
  const chg=(d)=>{let m=thang+d;let y=nam;if(m>12){m=1;y++}if(m<1){m=12;y--};setThang(m);setNam(y)}
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  return (
    <div>
      <DateNavBar label={`Tiền Mặt → MB Bank từng ngày — ${MONTHS[thang]} ${nam}`} onPrev={()=>chg(-1)} onNext={()=>chg(1)}>
        <span style={{fontSize:14,fontWeight:700,fontFamily:'var(--serif)',minWidth:140,textAlign:'center'}}>{MONTHS[thang]} {nam}</span>
      </DateNavBar>
      <div className="strip" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
        <div className="it"><div className="l">ĐÃ NỘP MB</div><div className="v" style={{color:'#1a4f70'}}>{formatCurrency(data.tongNop)}</div><div className="d">{data.history.filter(d=>d.daNop>0).length} lần nộp</div></div>
        <div className="it"><div className="l">PHẢI NỘP</div><div className="v" style={{color:'#426a2c'}}>{formatCurrency(data.tongPhaiNop)}</div><div className="d">Thu TM − Chi TM</div></div>
        <div className="it"><div className="l">CHÊNH LỆCH</div><div className="v" style={{color:data.tongNop>=data.tongPhaiNop?'#426a2c':'#843a23'}}>{formatCurrency(data.tongNop-data.tongPhaiNop)}</div><div className="d">{data.tongNop>=data.tongPhaiNop?'✅ Đã nộp đủ':'⚠️ Chưa nộp đủ'}</div></div>
      </div>
      <div className="card"><div className="card-h"><div className="card-t"><div className="arch-i"><I.Receipt style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Chi Tiết Từng Ngày</h3><span className="sub">{data.history.length} ngày</span></div></div>
        <div className="card-b" style={{padding:0}}>{data.history.length===0?<div style={{textAlign:'center',padding:30,color:'var(--ink3)'}}>Không có dữ liệu</div>:
        <NopTienMatTable data={data} />}</div>
      </div>
    </div>
  )
}

// ════════════════ SUB: CÔNG NỢ KHÁCH HÀNG ════════════════
const debtDelta = r => r.loai === 'phat_sinh' ? (r.so_tien || 0) : (r.loai === 'thanh_toan' || r.loai === 'xoa_no') ? -(r.so_tien || 0) : 0

function SubCongNoKhachHang() {
  const [data,setData]=useState(null);const [loading,setLoading]=useState(true)
  useEffect(()=>{setLoading(true);Promise.all([supabase.from('cong_no_khach_hang').select('*').order('ngay',{ascending:false}).limit(50),supabase.from('khach_hang').select('id,ho_ten,so_dien_thoai')]).then(([rCN,rKH])=>{const cnList=rCN.data||[];const khMap={};(rKH.data||[]).forEach(k=>{khMap[k.id]=k});const khNo={};cnList.forEach(cn=>{const khId=cn.khach_hang_id;if(!khNo[khId])khNo[khId]={kh:khMap[khId]||{ho_ten:'?',so_dien_thoai:''},no:0};khNo[khId].no+=debtDelta(cn)});const list=Object.values(khNo).filter(x=>x.no>0).sort((a,b)=>b.no-a.no);const tongNo=list.reduce((s,x)=>s+x.no,0);setData({list,tongNo});setLoading(false)}).catch(()=>setLoading(false))},[])
  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--ink3)'}}>Đang tải...</div>
  return (
    <div>
      <div className="strip" style={{gridTemplateColumns:'repeat(2,1fr)',marginBottom:16}}>
        <div className="it"><div className="l">TỔNG CÔNG NỢ</div><div className="v" style={{color:'#843a23'}}>{formatCurrency(data.tongNo)}</div><div className="d">{data.list.length} khách hàng</div></div>
        <div className="it"><div className="l">NỢ TRUNG BÌNH</div><div className="v">{data.list.length>0?formatCurrency(Math.round(data.tongNo/data.list.length)):'0₫'}</div><div className="d">Trên mỗi khách hàng</div></div>
      </div>
      <div className="card"><div className="card-h"><div className="card-t"><div className="arch-i"><I.Users style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Chi Tiết Công Nợ</h3><span className="sub">{data.list.length} khách</span></div></div>
        <div className="card-b" style={{padding:0}}>{data.list.length===0?<div style={{textAlign:'center',padding:30,color:'var(--ink3)'}}>Không có công nợ</div>:
        <table className="tbl"><thead><tr><th style={{paddingLeft:20}}>Khách Hàng</th><th>SĐT</th><th className="amount">Số Tiền Nợ</th><th className="amount" style={{paddingRight:20}}>Tỉ Trọng</th></tr></thead><tbody>{data.list.map((x,i)=>(<tr key={i}><td style={{paddingLeft:20,fontWeight:600}}>{x.kh.ho_ten||'Không tên'}</td><td style={{color:'var(--ink3)',fontSize:12}}>{x.kh.so_dien_thoai||'—'}</td><td className="amount" style={{color:'#843a23',fontWeight:700}}>{formatCurrency(x.no)}</td><td className="amount" style={{paddingRight:20}}><div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end'}}><div className="bar-h" style={{width:60}}><i style={{width:Math.round(x.no/(data.tongNo||1)*100)+'%',background:'#b85a4a'}}/></div><span style={{fontSize:11}}>{Math.round(x.no/(data.tongNo||1)*100)}%</span></div></td></tr>))}</tbody></table>}</div>
      </div>
    </div>
  )
}

// ════════════════ MAIN ════════════════
export default function BaoCaoPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('tongquan')
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [viList, setViList] = useState([])
  const [financeData, setFinanceData] = useState(null)
  const now = getNowVN()

  useEffect(() => {
    const months = []
    for (let i = 4; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0)
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
      months.push({ label: MONTHS[m.getMonth() + 1]?.replace('Tháng ', 'T'), start, end: endStr })
    }
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const monthEnd = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`

    Promise.all([
      ...months.flatMap(m => [
        supabase.from('doanh_thu').select('so_tien,hinh_thuc').gte('ngay', m.start).lte('ngay', m.end),
        supabase.from('chi_phi').select('so_tien').gte('ngay', m.start).lte('ngay', m.end),
      ]),
      supabase.from('so_du_vi_thuc_te').select('*'),
      supabase.from('doanh_thu').select('so_tien,hinh_thuc').gte('ngay', monthStart).lte('ngay', monthEnd),
      supabase.from('chi_phi').select('so_tien,hinh_thuc_thanh_toan').gte('ngay', monthStart).lte('ngay', monthEnd),
      supabase.from('cong_no_khach_hang').select('*').lte('ngay', monthEnd),
      supabase.from('the_lieu_trinh').select('*'),
      supabase.from('nhan_vien_thu_nhap').select('*').gte('ngay', monthStart).lte('ngay', monthEnd),
    ]).then(results => {
      setChartData(months.map((m, i) => {
        const thu = (results[i * 2].data || []).filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
        const chi = (results[i * 2 + 1].data || []).reduce((s, r) => s + (r.so_tien || 0), 0)
        return { label: m.label, thu, chi }
      }))
      const vi = results[months.length * 2].data || []
      const monthThu = results[months.length * 2 + 1].data || []
      const monthChi = results[months.length * 2 + 2].data || []
      const congNoRows = results[months.length * 2 + 3].data || []
      const cards = results[months.length * 2 + 4].data || []
      const incomeRows = results[months.length * 2 + 5].data || []
      const thucThu = monthThu.filter(r => r.hinh_thuc !== 'the_tra_truoc').reduce((s, r) => s + (r.so_tien || 0), 0)
      const tongChi = monthChi.reduce((s, r) => s + (r.so_tien || 0), 0)
      const cashThu = monthThu.filter(r => r.hinh_thuc === 'tien_mat').reduce((s, r) => s + (r.so_tien || 0), 0)
      const cashChi = monthChi.filter(r => (r.hinh_thuc_thanh_toan || 'tien_mat') === 'tien_mat').reduce((s, r) => s + (r.so_tien || 0), 0)
      const debtByCustomer = {}
      congNoRows.forEach(r => {
        const key = r.khach_hang_id || 'unknown'
        debtByCustomer[key] = (debtByCustomer[key] || 0) + debtDelta(r)
      })
      const debtValues = Object.values(debtByCustomer).filter(v => v > 0)
      const activeCards = cards.filter(c => (c.trang_thai || '').toLowerCase() === 'active' || c.is_active === true)
      const remainingSessions = activeCards.reduce((s, c) => s + Math.max(0, Number(c.so_buoi_con_lai ?? ((c.so_buoi_tong || 0) - (c.so_buoi_da_dung || 0))) || 0), 0)
      const cardObligation = activeCards.reduce((s, c) => {
        const total = Number(c.so_buoi_tong || 0)
        const remain = Math.max(0, Number(c.so_buoi_con_lai ?? (total - (c.so_buoi_da_dung || 0))) || 0)
        const value = Number(c.gia_tri_the || c.gia_ban || c.tong_tien || 0)
        return s + (total > 0 ? Math.round(value * remain / total) : 0)
      }, 0)
      const tour = incomeRows.filter(r => r.loai === 'tour').reduce((s, r) => s + (r.so_tien || 0), 0)
      const commission = incomeRows.filter(r => r.loai === 'hoa_hong').reduce((s, r) => s + (r.so_tien || 0), 0)
      const totalAsset = vi.reduce((s, v) => s + (v.so_du_hien_tai || 0), 0)
      setViList(vi)
      setFinanceData({
        thucThu,
        tongChi,
        loiNhuanTamTinh: thucThu - tongChi,
        totalAsset,
        congNo: debtValues.reduce((s, v) => s + v, 0),
        debtCustomers: debtValues.length,
        activeCards: activeCards.length,
        remainingSessions,
        cardObligation,
        tour,
        commission,
        staffPayable: tour + commission,
        cashToBank: cashThu - cashChi,
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalAsset = viList.reduce((s, v) => s + (v.so_du_hien_tai || 0), 0)

  return (
    <div style={{ padding: '22px 24px', flex: 1, overflow: 'auto' }}>
      {/* ── MOD-HEAD ── */}
      <div className="mod-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="ttl">Báo Cáo</div>
          <div className="sub">{user?.ho_ten || 'Admin'} · Trung tâm kiểm soát tài chính HSMS · Tổng tài sản: {loading ? '...' : formatCurrency(totalAsset)}</div>
        </div>
      </div>

      <FinancialCockpit data={financeData} loading={loading} />

      <div className="card" style={{ marginBottom: 18, borderRadius: 12 }}>
        <div className="card-b" style={{ padding: 12 }}>
          <div style={{ display: 'grid', gap: 9 }}>
            {REPORT_GROUPS.map(group => (
              <div
                key={group.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '112px minmax(0, 1fr)',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{
                  fontSize: 10.5,
                  color: 'var(--ink3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.12em',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}>
                  {group.label}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                  padding: 4,
                  borderRadius: 999,
                  background: 'var(--bg2)',
                  border: '1px solid var(--line)',
                }}>
                  {TABS.filter(t => t.group === group.id).map(t => {
                    const active = tab === t.id
                    const meta = TAB_META[t.id] || {}
                    const Icon = meta.icon
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        title={t.label}
                        style={{
                          height: 32,
                          minWidth: 86,
                          padding: '0 12px',
                          border: active ? '1px solid rgba(160,113,79,.35)' : '1px solid transparent',
                          borderRadius: 999,
                          background: active ? 'linear-gradient(135deg,#C9A96E 0%,#A0714F 100%)' : 'transparent',
                          color: active ? '#2a1d14' : 'var(--ink2)',
                          boxShadow: active ? '0 6px 18px rgba(160,113,79,.22)' : 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          fontFamily: 'var(--sans)',
                          fontSize: 12,
                          fontWeight: active ? 800 : 650,
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          transition: 'all .16s ease',
                        }}
                      >
                        {Icon && <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />}
                        <span>{meta.short || t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      {tab === 'tongquan'   && <SubTongQuan chartData={chartData} viList={viList} loading={loading} />}
      {tab === 'lailo'      && <SubLaiLo data={financeData} loading={loading} />}
      {tab === 'ngay'       && <SubBaoCaoNgay />}
      {tab === 'tuan'       && <SubBaoCaoTuan />}
      {tab === 'thang'      && <SubBaoCaoThang />}
      {tab === 'nam'        && <SubBaoCaoNam />}
      {tab === 'dongtien'   && <SubBaoCaoDongTien />}
      {tab === 'chiphi'     && <SubPhanTichChiPhi />}
      {tab === 'doanhthu'   && <SubPhanTichDoanhThu />}
      {tab === 'noptienmat' && <SubLichSuNopTienMat />}
      {tab === 'congno'     && <SubCongNoKhachHang />}
      {tab === 'nghiavu'    && <SubNghiaVu data={financeData} loading={loading} />}
    </div>
  )
}
