/* Hannah Spa — Desktop Dashboard scene */
const { useState, useEffect } = React;
const I = window.HannahIcons;

const fmtVND = (n) => n.toLocaleString('vi-VN');

function Sidebar() {
  const nav = [
    { sec: 'Tổng Quan' },
    { ic: 'Dashboard', l: 'Dashboard', active: true },
    { sec: 'Vận Hành' },
    { ic: 'Cart', l: 'POS Bán Hàng', pill: 'Mới' },
    { ic: 'Calendar', l: 'Lịch Hẹn', dot: '4' },
    { ic: 'Wallet', l: 'Thu Chi & Báo Cáo' },
    { ic: 'Receipt', l: 'Đối Soát Ngày' },
    { sec: 'Quản Lý' },
    { ic: 'Users', l: 'Nhân Sự' },
    { ic: 'Heart', l: 'CRM Khách Hàng' },
    { ic: 'Box', l: 'Kho Hàng' },
    { ic: 'Tag', l: 'Khuyến Mãi' },
    { ic: 'Speaker', l: 'Marketing' },
    { ic: 'Globe', l: 'Nội Dung Web' },
    { sec: 'Hệ Thống' },
    { ic: 'Cog', l: 'Cài Đặt' },
  ];
  return (
    <aside className="side">
      <div className="brand">
        <div className="brand-mark">H</div>
        <div className="brand-text">
          <h1>Hannah <em style={{fontStyle:'italic',fontWeight:500,opacity:.85}}>spa</em></h1>
          <span>Spa & Beauty · Admin</span>
        </div>
      </div>
      <nav className="side-nav">
        {nav.map((n,i)=> n.sec ? (
          <div className="nav-section" key={i}>{n.sec}</div>
        ) : (
          <a key={i} href="#" className={"nav-item"+(n.active?' active':'')}>
            {React.createElement(I[n.ic], {className:'ico'})}
            <span>{n.l}</span>
            {n.pill && <span className="pill">{n.pill}</span>}
            {n.dot && <span className="pill dot">{n.dot}</span>}
          </a>
        ))}
      </nav>
      <div className="side-foot">
        <div className="avatar">CN</div>
        <div className="info" style={{flex:1, minWidth:0}}>
          <div className="user-name">Cao Quốc Nam</div>
          <div className="user-role">Quản Trị Viên</div>
        </div>
        <I.Cog style={{width:16,height:16, color:'rgba(243,230,210,.5)'}}/>
      </div>
    </aside>
  );
}

function Topbar() {
  const [now, setNow] = useState(new Date('2026-05-09T14:32:18'));
  useEffect(()=>{ const t = setInterval(()=>setNow(new Date(Date.now())),1000); return ()=>clearInterval(t);},[]);
  const days = ['CN','T2','T3','T4','T5','T6','T7'];
  return (
    <header className="topbar">
      <div className="crumbs">
        <div>
          <div className="h">Dashboard</div>
          <div className="path">Tổng Quan · <b>Thứ Bảy, 09 tháng 05</b></div>
        </div>
      </div>
      <div className="search">
        <I.Search/>
        <input placeholder="Tìm khách hàng, dịch vụ, hoá đơn…" />
        <kbd>⌘K</kbd>
      </div>
      <div className="top-actions">
        <button className="icon-btn"><I.Filter style={{width:16,height:16}}/></button>
        <button className="icon-btn"><I.Bell style={{width:17,height:17}}/><span className="dot"/></button>
        <button className="btn gold"><I.Plus style={{width:14,height:14}}/> Tạo Đơn</button>
        <div className="now-clock">
          <div className="t">{now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</div>
          <div className="d">{days[now.getDay()]} · 09/05/2026</div>
        </div>
      </div>
    </header>
  );
}

function HeroStrip() {
  return (
    <div className="hero">
      <div className="hero-text">
        <div className="hero-eyebrow">Lời chào buổi chiều</div>
        <h2>Chào chị Hannah, <em>hôm nay đẹp lắm.</em></h2>
        <p>Spa đang hoạt động tốt — 6 lượt khách đã hoàn tất, 4 lượt đang phục vụ, doanh thu vượt 12% so với hôm qua.</p>
      </div>
      <div className="hero-stats">
        <div className="hero-stat"><div className="v">94%</div><div className="l">Phòng Lấp Đầy</div></div>
        <div className="hero-stat"><div className="v">4.92</div><div className="l">Đánh Giá TB</div></div>
        <div className="hero-stat"><div className="v">28</div><div className="l">Khách Hôm Nay</div></div>
      </div>
    </div>
  );
}

function Sparkline({ data, color='#A0714F', fill='rgba(201,169,110,.18)' }) {
  const w = 100, h = 28;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d,i)=>[i/(data.length-1)*w, h - ((d-min)/(max-min || 1))*h]);
  const path = 'M ' + pts.map(p=>p.join(',')).join(' L ');
  const area = path + ` L ${w},${h} L 0,${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} fill={fill} stroke="none"/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function KPIs() {
  const cards = [
    { k:'revenue', icon:<I.Coin style={{width:18,height:18}}/>, label:'Doanh Thu Hôm Nay', val:'5.200.000', cur:'đ',
      trend:'up', trendV:'+12%', sub:<>So với <b>hôm qua</b> · 8 hoá đơn</>,
      data:[3,4,3.5,5,4,6,5.5,7,6,8,7,9] },
    { k:'expense', icon:<I.Receipt style={{width:18,height:18}}/>, label:'Chi Phí Hôm Nay', val:'1.850.000', cur:'đ',
      trend:'down', trendV:'-4%', sub:<><b>3 khoản chi</b> · 2 hoá đơn</>,
      data:[5,4,3,4,3.5,3,2.8,3,2.5,2,2.2,1.85] },
    { k:'orders', icon:<I.Cart style={{width:17,height:17}}/>, label:'Đơn Hàng Hôm Nay', val:'8',
      trend:'up', trendV:'+2', sub:<>6 khách lẻ + <b>2 thẻ liệu trình</b></>,
      data:[2,3,2,4,3,5,6,5,7,6,8,8] },
    { k:'assets', icon:<I.Bank style={{width:18,height:18}}/>, label:'Tổng Tài Sản', val:'95.850.235', cur:'đ',
      trend:'flat', trendV:'Đối soát', sub:<><b>3 ví</b> · Đối soát hôm qua</>,
      data:[88,89,90,91,90.5,92,93,94,93.5,95,95.5,95.85] },
  ];
  return (
    <div className="kpi-grid">
      {cards.map(c=>(
        <div className={"kpi "+c.k} key={c.k}>
          <div className="kpi-top">
            <div className="kpi-icon">{c.icon}</div>
            <span className={"kpi-trend "+c.trend}>
              {c.trend==='up' && <I.TrendUp style={{width:11,height:11}}/>}
              {c.trend==='down' && <I.TrendDown style={{width:11,height:11}}/>}
              {c.trendV}
            </span>
          </div>
          <div>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value" style={{marginTop:4}}>{c.val}{c.cur && <span className="cur">{c.cur}</span>}</div>
          </div>
          <div className="kpi-sub">{c.sub}</div>
          <Sparkline data={c.data} color={c.k==='expense'?'#b85a4a':c.k==='revenue'?'#6e8a5e':'#b08a55'} />
        </div>
      ))}
    </div>
  );
}

window.HannahDashHeader = { Sidebar, Topbar, HeroStrip, KPIs };
