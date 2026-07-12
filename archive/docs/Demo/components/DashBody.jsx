/* Hannah Spa — Charts, Tables, Cards section */
const I2 = window.HannahIcons;

function RevenueChart() {
  // Stacked area-ish line chart for last 7 days
  const days = ['T2','T3','T4','T5','T6','T7','CN'];
  const services = [3.2, 3.8, 4.1, 3.5, 4.6, 5.5, 5.2]; // M VND
  const products = [0.8, 1.0, 1.2, 0.9, 1.4, 1.6, 1.5];
  const max = 8; // M VND axis
  const W = 600, H = 200, padL=42, padR=16, padT=12, padB=28;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const x = i => padL + (i/(days.length-1))*innerW;
  const y = v => padT + innerH - (v/max)*innerH;
  const ptsS = services.map((v,i)=>[x(i), y(v)]);
  const ptsT = services.map((v,i)=>[x(i), y(v + products[i])]);
  const lineS = 'M ' + ptsS.map(p=>p.join(',')).join(' L ');
  const lineT = 'M ' + ptsT.map(p=>p.join(',')).join(' L ');
  const areaT = lineT + ` L ${x(days.length-1)},${y(0)} L ${x(0)},${y(0)} Z`;
  const areaS = lineS + ` L ${x(days.length-1)},${y(0)} L ${x(0)},${y(0)} Z`;
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i" aria-hidden="true">
            <svg width="10" height="12" viewBox="0 0 10 12"><path d="M5 1a4 4 0 0 1 4 4v6H1V5a4 4 0 0 1 4-4z" fill="none" stroke="#8a6a52" strokeWidth="1.2"/></svg>
          </div>
          <h3>Doanh Thu 7 Ngày</h3>
          <span className="sub">Từ 03/05 → 09/05</span>
        </div>
        <div className="card-actions">
          <button className="chip">7 ngày</button>
          <button className="chip active">Tháng 5</button>
          <button className="chip">Quý II</button>
        </div>
      </div>
      <div className="card-b">
        <div className="rev-summary">
          <div>
            <div className="rev-now">31.480.000<span className="cur">đ</span></div>
            <div className="rev-meta"><b>↑ 18,4%</b> · so với 7 ngày trước · TB 4.500.000đ/ngày</div>
          </div>
          <div className="legend">
            <span><i style={{background:'linear-gradient(180deg,#c9a96e,#a87f4f)'}}/>Dịch Vụ</span>
            <span><i style={{background:'linear-gradient(180deg,#c4998a,#a87366)'}}/>Sản Phẩm</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
          {/* Grid */}
          {[0,2,4,6,8].map(g=>(
            <g key={g}>
              <line x1={padL} x2={W-padR} y1={y(g)} y2={y(g)} stroke="#e8dcc8" strokeWidth="1" strokeDasharray={g===0?'':'2 4'}/>
              <text x={padL-8} y={y(g)+3} textAnchor="end" fontSize="10" fill="#8e7a68" fontFamily="Inter">{g}M</text>
            </g>
          ))}
          {/* X labels */}
          {days.map((d,i)=>(
            <text key={d} x={x(i)} y={H-8} textAnchor="middle" fontSize="11" fill="#8e7a68" fontFamily="Inter" fontWeight={i===6?700:500}>{d}</text>
          ))}
          {/* Areas */}
          <path d={areaT} fill="rgba(196,153,138,.18)"/>
          <path d={areaS} fill="rgba(201,169,110,.32)"/>
          {/* Lines */}
          <path d={lineT} fill="none" stroke="#a87366" strokeWidth="1.6" strokeLinecap="round"/>
          <path d={lineS} fill="none" stroke="#a87f4f" strokeWidth="2" strokeLinecap="round"/>
          {/* Points */}
          {ptsS.map((p,i)=>(
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r="3.2" fill="#fff" stroke="#a87f4f" strokeWidth="1.6"/>
            </g>
          ))}
          {/* Today highlight */}
          <line x1={x(6)} x2={x(6)} y1={padT} y2={H-padB} stroke="#a87f4f" strokeDasharray="3 3" strokeWidth="1" opacity=".5"/>
          <g transform={`translate(${x(6)},${y(services[6]+products[6])-8})`}>
            <rect x="-44" y="-26" width="88" height="22" rx="11" fill="#2a201a"/>
            <text x="0" y="-11" textAnchor="middle" fontSize="11" fontWeight="700" fill="#f3e6d2" fontFamily="Inter">5.200.000đ</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

function RecentRevenue() {
  const rows = [
    { t:'14:30', d:'RF Trẻ Hóa Bắp Tay', s:'Liệu trình · Buổi 3/8', m:'transfer', mL:'Chuyển Khoản', a:'1.000.000' },
    { t:'13:15', d:'Massage Cổ Vai Gáy', s:'Khách lẻ · 60 phút', m:'cash', mL:'Tiền Mặt', a:'350.000' },
    { t:'11:00', d:'Combo Body Thư Giãn', s:'Khách lẻ · 90 phút', m:'card', mL:'Quẹt Thẻ', a:'500.000' },
    { t:'10:20', d:'Gội Đầu Dưỡng Sinh', s:'Khách lẻ · 45 phút', m:'cash', mL:'Tiền Mặt', a:'80.000' },
    { t:'09:45', d:'AQUA SKIN — Cấp Ẩm', s:'Liệu trình · Buổi 5/10', m:'pkg', mL:'Thẻ LT', a:'400.000' },
  ];
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i" aria-hidden="true"><I2.Receipt style={{width:13,height:13, color:'#8a6a52'}}/></div>
          <h3>Giao Dịch Gần Đây</h3>
          <span className="sub">5 mới nhất hôm nay</span>
        </div>
        <button className="btn ghost" style={{padding:'6px 10px'}}>Xem tất cả →</button>
      </div>
      <div className="card-b" style={{padding:0}}>
        <table className="tbl">
          <thead><tr>
            <th style={{paddingLeft:20}}>Giờ</th>
            <th>Dịch Vụ</th>
            <th>Phương Thức</th>
            <th style={{paddingRight:20}}>Số Tiền</th>
          </tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                <td className="time" style={{paddingLeft:20}}>{r.t}</td>
                <td className="desc">{r.d}<small>{r.s}</small></td>
                <td><span className={"method "+r.m}>{r.mL}</span></td>
                <td className="amount" style={{paddingRight:20}}>{r.a}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Alerts() {
  const items = [
    { k:'warn', i:'Box', t:'45m', txt:<><b>Kem Dưỡng Da Hannah XYZ</b> sắp hết — còn 2 hộp trong kho.</>},
    { k:'info', i:'Heart', t:'2h', txt:<><b>12 khách</b> chưa quay lại trên 30 ngày — gợi ý gửi voucher.</>},
    { k:'warn', i:'Tag', t:'4h', txt:<><b>3 thẻ liệu trình</b> sắp hết hạn trong 7 ngày tới.</>},
    { k:'danger', i:'Receipt', t:'18h', txt:<><b>Chưa đối soát</b> ngày 08/05 — cần xác nhận trước 17:00.</>},
  ];
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I2.Bell style={{width:13,height:13, color:'#8a6a52'}}/></div>
          <h3>Cảnh Báo</h3>
          <span className="sub">4 mục cần xử lý</span>
        </div>
        <button className="chip">Tất cả</button>
      </div>
      <div className="card-b">
        <div className="alerts">
          {items.map((a,i)=>(
            <div className={"alert "+a.k} key={i}>
              <div className="ai">{React.createElement(I2[a.i],{style:{width:15,height:15}})}</div>
              <div style={{flex:1}}>{a.txt}</div>
              <span className="alert-time">{a.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StaffToday() {
  const staff = [
    { n:'Linh Đào', r:'KTV Senior', cnt:6, rev:'2.4M', pct:92 },
    { n:'Mai Trang', r:'KTV', cnt:5, rev:'1.8M', pct:75 },
    { n:'Thu Hà', r:'KTV', cnt:4, rev:'1.2M', pct:60 },
    { n:'Bích Phượng', r:'Lễ Tân', cnt:8, rev:'—', pct:88 },
  ];
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I2.Users style={{width:13,height:13, color:'#8a6a52'}}/></div>
          <h3>Nhân Sự Hôm Nay</h3>
        </div>
        <button className="chip">Chi tiết →</button>
      </div>
      <div className="card-b" style={{paddingTop:6}}>
        <div className="staff-list">
          {staff.map((s,i)=>(
            <div className="staff" key={i}>
              <div className="avatar" style={{background: i%2?'linear-gradient(135deg,#c4998a,#a87366)':'var(--grad-gold)'}}>{s.n.split(' ').map(w=>w[0]).slice(-2).join('')}</div>
              <div className="info">
                <div className="n">{s.n}</div>
                <div className="r">{s.r} · {s.cnt} khách</div>
                <div className="bar"><i style={{width: s.pct+'%'}}/></div>
              </div>
              <div className="stat">
                <div className="v">{s.rev}</div>
                <div className="l">Doanh thu</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingsToday() {
  const list = [
    { t:'15:00', p:'Phòng 02', n:'Cô Phương Anh', s:'RF Trẻ Hoá Bắp Tay · 60p', tags:['VIP','LT 3/8'], stat:'ok', sL:'Đã check-in' },
    { t:'15:30', p:'Phòng 04', n:'Chị Hồng Nhung', s:'Massage Body Thư Giãn · 90p', tags:[], stat:'wait', sL:'Đang chờ' },
    { t:'16:00', p:'Phòng 01', n:'Em Linh Chi', s:'Aqua Skin Cấp Ẩm · 75p', tags:['Mới'], stat:'ok', sL:'Xác nhận' },
    { t:'16:30', p:'Phòng 03', n:'Cô Thu Hằng', s:'Gội Đầu Dưỡng Sinh · 45p', tags:['VIP'], stat:'wait', sL:'Đang chờ' },
    { t:'17:00', p:'Phòng 02', n:'Chị Bích Vân', s:'Combo Detox Mặt + Vai · 120p', tags:['LT 1/5'], stat:'wait', sL:'Đang chờ' },
  ];
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I2.Calendar style={{width:13,height:13, color:'#8a6a52'}}/></div>
          <h3>Lịch Hẹn Sắp Tới</h3>
          <span className="sub">Còn lại trong ca chiều</span>
        </div>
        <div className="card-actions">
          <button className="chip">Hôm nay</button>
          <button className="chip">Tuần</button>
          <button className="btn gold" style={{padding:'6px 12px'}}><I2.Plus style={{width:12,height:12}}/> Đặt lịch</button>
        </div>
      </div>
      <div className="card-b">
        <div className="book-list">
          {list.map((b,i)=>(
            <div className="book" key={i}>
              <div className="when">
                <div className="t">{b.t}</div>
                <div className="p">{b.p}</div>
              </div>
              <div className="who">
                <div className="n">{b.n}</div>
                <div className="s">{b.s}</div>
                {b.tags.length>0 && (
                  <div className="tags">
                    {b.tags.map(t=>(
                      <span key={t} className={"tg "+(t==='VIP'?'vip':t==='Mới'?'new':'')}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className={"stat "+b.stat}>{b.sL}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopServices() {
  const svcs = [
    { n:'RF Trẻ Hoá Bắp Tay', meta:'Liệu trình · 60p', price:'1.000.000', cnt:'24 lần / tuần', k:'s1' },
    { n:'Aqua Skin Cấp Ẩm', meta:'Khách lẻ · 75p', price:'400.000', cnt:'18 lần / tuần', k:'s2' },
    { n:'Massage Body Thư Giãn', meta:'Khách lẻ · 90p', price:'500.000', cnt:'15 lần / tuần', k:'s3' },
    { n:'Combo Detox Mặt + Vai', meta:'Liệu trình · 120p', price:'1.250.000', cnt:'9 lần / tuần', k:'s4' },
  ];
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          <div className="arch-i"><I2.Star style={{width:12,height:12, color:'#c9a96e'}}/></div>
          <h3>Dịch Vụ Bán Chạy</h3>
        </div>
        <button className="chip">Tuần</button>
      </div>
      <div className="card-b">
        <div className="svc-grid">
          {svcs.map((s,i)=>(
            <div className={"svc "+s.k} key={i}>
              <div className="arch-thumb"/>
              <div className="n">{s.n}</div>
              <div className="meta">{s.meta}</div>
              <div className="row">
                <div className="price">{s.price}đ</div>
                <div className="cnt">{s.cnt}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.HannahDashBody = { RevenueChart, RecentRevenue, Alerts, StaffToday, BookingsToday, TopServices };
