/* Hannah Spa — Thu Chi & Báo Cáo + Đối Soát Ngày */
const If = window.HannahIcons;

// Reusable donut chart
function Donut({segments, size=140, ring=18}) {
  const r = (size - ring)/2;
  const cx = size/2, cy = size/2;
  const total = segments.reduce((s,e)=>s+e.v,0);
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="donut">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8dcc8" strokeWidth={ring}/>
      {segments.map((s,i)=>{
        const len = 2*Math.PI*r;
        const part = s.v/total*len;
        const off = acc;
        acc += part;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.c} strokeWidth={ring} strokeLinecap="butt"
            strokeDasharray={`${part} ${len-part}`}
            strokeDashoffset={-off}
            transform={`rotate(-90 ${cx} ${cy})`}/>
        );
      })}
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="11" fill="#8e7a68" fontFamily="Inter" fontWeight="600" letterSpacing="1.5">TỔNG</text>
      <text x={cx} y={cy+14} textAnchor="middle" fontSize="18" fill="#2a201a" fontFamily="Cormorant Garamond" fontWeight="700">{Math.round(total/1000)}M</text>
    </svg>
  );
}

function FinanceScreen() {
  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'auto'}}>
      <div className="mod-head" style={{marginBottom:16}}>
        <div>
          <div className="ttl">Thu Chi & Báo Cáo</div>
          <div className="sub">Tháng 5 / 2026 · Đối soát đến 23:59 ngày 10/05</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className="st">Hôm nay</div>
            <div className="st">7 ngày</div>
            <div className="st active">Tháng này</div>
            <div className="st">Quý II</div>
            <div className="st">Tuỳ chỉnh</div>
          </div>
          <button className="btn"><If.Receipt style={{width:13,height:13}}/> Xuất Excel</button>
          <button className="btn ink"><If.Plus style={{width:13,height:13}}/> Ghi nhận</button>
        </div>
      </div>

      {/* Wallet cards */}
      <div className="wallets" style={{marginBottom:16}}>
        <div className="wallet cash">
          <div>
            <div className="nm">Tiền Mặt · Két Quầy</div>
            <div className="vl">12.450.000<span className="cur">đ</span></div>
          </div>
          <div className="sb">Đối soát · 10/05 · 09:15</div>
        </div>
        <div className="wallet bank">
          <div>
            <div className="nm">Vietcombank · *9821</div>
            <div className="vl">68.200.000<span className="cur">đ</span></div>
          </div>
          <div className="sb">Số dư cập nhật 17:30</div>
        </div>
        <div className="wallet epay">
          <div>
            <div className="nm">MoMo + ZaloPay</div>
            <div className="vl">15.200.235<span className="cur">đ</span></div>
          </div>
          <div className="sb">12 giao dịch chờ đối soát</div>
        </div>
      </div>

      {/* Strip */}
      <div className="strip" style={{gridTemplateColumns:'repeat(4,1fr)', marginBottom:16}}>
        <div className="it"><div className="l">Tổng Thu Tháng</div><div className="v" style={{color:'#426a2c'}}>168.4<span className="cur">M</span></div><div className="d up">↑ 18% vs T4/2026</div></div>
        <div className="it"><div className="l">Tổng Chi Tháng</div><div className="v" style={{color:'#843a23'}}>74.2<span className="cur">M</span></div><div className="d dn">↑ 6% vs T4/2026</div></div>
        <div className="it"><div className="l">Lợi Nhuận Gộp</div><div className="v">94.2<span className="cur">M</span></div><div className="d up">Biên 56% · ↑ 4pt</div></div>
        <div className="it"><div className="l">Công Nợ Phải Thu</div><div className="v">8.6<span className="cur">M</span></div><div className="d">12 KH · 3 quá hạn</div></div>
      </div>

      {/* Charts row */}
      <div className="fin-grid" style={{marginBottom:16}}>
        <div className="card">
          <div className="card-h">
            <div className="card-t"><div className="arch-i"><If.TrendUp style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Thu & Chi 30 Ngày</h3></div>
            <div className="legend"><span><i style={{background:'#6e8a5e'}}/>Thu</span><span><i style={{background:'#b85a4a'}}/>Chi</span></div>
          </div>
          <div className="card-b">
            <BarsThuChi/>
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <div className="card-t"><div className="arch-i"><If.Tag style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Cơ Cấu Doanh Thu</h3></div>
            <span className="chip">Tháng</span>
          </div>
          <div className="card-b">
            <div className="donut-wrap">
              <Donut size={140} ring={20} segments={[
                {v:96, c:'#c9a96e', l:'Dịch vụ'},
                {v:42, c:'#a87366', l:'Sản phẩm'},
                {v:21, c:'#6e8a5e', l:'Thẻ liệu trình'},
                {v:9.4, c:'#8a6a6e', l:'Thẻ quà'},
              ]}/>
              <div className="donut-leg">
                <div className="row"><span className="sw" style={{background:'#c9a96e'}}/><span>Dịch vụ</span><b>96.0M</b><span className="pct">57%</span></div>
                <div className="row"><span className="sw" style={{background:'#a87366'}}/><span>Sản phẩm</span><b>42.0M</b><span className="pct">25%</span></div>
                <div className="row"><span className="sw" style={{background:'#6e8a5e'}}/><span>Thẻ LT</span><b>21.0M</b><span className="pct">12%</span></div>
                <div className="row"><span className="sw" style={{background:'#8a6a6e'}}/><span>Thẻ quà</span><b>9.4M</b><span className="pct">6%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="card">
        <div className="card-h">
          <div className="card-t"><div className="arch-i"><If.Wallet style={{width:13,height:13, color:'#8a6a52'}}/></div><h3>Sổ Quỹ — Giao Dịch</h3><span className="sub">128 giao dịch · 30 ngày</span></div>
          <div className="card-actions">
            <button className="chip active">Tất cả</button>
            <button className="chip">Thu</button>
            <button className="chip">Chi</button>
            <button className="chip">Chờ duyệt</button>
            <button className="icon-btn" style={{width:30,height:30}}><If.Filter style={{width:14,height:14}}/></button>
          </div>
        </div>
        <div style={{padding:0}}>
          <table className="ledger">
            <thead><tr>
              <th>Thời Gian</th>
              <th>Loại</th>
              <th>Mô Tả</th>
              <th>Đối Tượng</th>
              <th>Ví / Phương Thức</th>
              <th className="r">Số Tiền</th>
              <th className="r" style={{width:50}}></th>
            </tr></thead>
            <tbody>
              {[
                ['10/05 14:30','sv','Dịch Vụ','RF Trẻ Hóa Bắp Tay · Buổi 3/8','Cô Phương Anh · VIP','Vietcombank · CK', '+1.000.000', 'in'],
                ['10/05 13:15','sv','Dịch Vụ','Massage Cổ Vai Gáy','Khách lẻ','Tiền Mặt', '+350.000', 'in'],
                ['10/05 12:00','ut','Chi Phí','Tiền điện tháng 4','EVN','Vietcombank · CK', '−2.450.000', 'out'],
                ['10/05 11:00','pr','Sản Phẩm','Kem dưỡng Hannah XYZ × 2','Cô Thu Hồng','MoMo', '+640.000', 'in'],
                ['10/05 10:20','sv','Dịch Vụ','Gội Đầu Dưỡng Sinh','Khách lẻ','Tiền Mặt', '+80.000', 'in'],
                ['10/05 09:45','sl','Thẻ LT','AQUA SKIN — Buổi 5/10','Cô Mai Trang','Thẻ Liệu Trình', '+400.000', 'in'],
                ['09/05 18:00','cm','Hoa Hồng','Hoa hồng tuần 19 · KTV Linh','Linh Đào','Tiền Mặt', '−1.800.000', 'out'],
                ['09/05 16:30','rt','Hàng Hoá','Nhập serum Hannah Glow × 30','NCC Hannah HCM','Vietcombank · CK', '−6.000.000', 'out'],
                ['09/05 14:00','sv','Dịch Vụ','Combo Detox VIP','Chị Bích Vân · VIP','Quẹt Thẻ', '+1.250.000', 'in'],
                ['09/05 09:00','ut','Chi Phí','Lương tháng 4 nhân sự','7 nhân sự','Vietcombank · CK', '−42.000.000', 'out'],
              ].map((r,i)=>(
                <tr key={i}>
                  <td style={{whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums', color:'var(--ink3)', fontSize:12}}>{r[0]}</td>
                  <td><span className={"tag "+r[1]}>{r[2]}</span></td>
                  <td className="nm">{r[3]}</td>
                  <td>{r[4]}</td>
                  <td>{r[5]}</td>
                  <td className={"amt "+r[7]}>{r[6]}đ</td>
                  <td className="r"><button className="icon-btn" style={{width:26,height:26}}><If.More style={{width:13,height:13}}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BarsThuChi() {
  const days = 30;
  // generate semi-deterministic data
  const data = Array.from({length:days},(_,i)=>{
    const inV = 3 + Math.abs(Math.sin(i*0.7))*4 + (i%7===5?2:0) + (i%7===6?1.5:0);
    const outV = 1 + Math.abs(Math.cos(i*0.4))*2;
    return {in:inV, out:outV};
  });
  const max = 8;
  const W=620, H=180, padL=30, padR=10, padT=10, padB=24;
  const innerW = W-padL-padR, innerH = H-padT-padB;
  const bw = innerW/days * .6;
  const cw = innerW/days;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:180,display:'block'}}>
      {[0,2,4,6,8].map(g=>(
        <g key={g}>
          <line x1={padL} x2={W-padR} y1={padT+innerH-g/max*innerH} y2={padT+innerH-g/max*innerH} stroke="#e8dcc8" strokeDasharray={g===0?'':'2 3'}/>
          <text x={padL-6} y={padT+innerH-g/max*innerH+3} textAnchor="end" fontSize="9.5" fill="#8e7a68" fontFamily="Inter">{g}M</text>
        </g>
      ))}
      {data.map((d,i)=>{
        const x = padL + i*cw;
        const hi = d.in/max*innerH;
        const ho = d.out/max*innerH;
        return (
          <g key={i}>
            <rect x={x+cw/2-bw/2} y={padT+innerH-hi} width={bw*.45} height={hi} fill="#6e8a5e" rx="1"/>
            <rect x={x+cw/2+1} y={padT+innerH-ho} width={bw*.45} height={ho} fill="#b85a4a" rx="1"/>
            {i%5===4 && <text x={x+cw/2} y={H-8} textAnchor="middle" fontSize="9" fill="#8e7a68" fontFamily="Inter">{i+1}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ─── ĐỐI SOÁT NGÀY ───
function ReconcileScreen() {
  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'auto'}}>
      <div className="mod-head" style={{marginBottom:16}}>
        <div>
          <div className="ttl">Đối Soát Cuối Ngày</div>
          <div className="sub">Ca chiều · 10/05/2026 · Thu ngân: Bích Phượng · Bắt đầu lúc 13:00</div>
        </div>
        <div className="acts">
          <button className="btn"><If.Receipt style={{width:13,height:13}}/> In Phiếu</button>
          <button className="btn gold"><If.Plus style={{width:13,height:13}}/> Khoá Sổ Ca</button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="strip" style={{gridTemplateColumns:'repeat(5,1fr)', marginBottom:16}}>
        <div className="it"><div className="l">Hoá Đơn Ca</div><div className="v">14</div><div className="d">8 dịch vụ + 6 sản phẩm</div></div>
        <div className="it"><div className="l">Tổng Thu Ca</div><div className="v" style={{color:'#426a2c'}}>8.450<span className="cur">k</span></div><div className="d">3 PT thanh toán</div></div>
        <div className="it"><div className="l">Tổng Chi Ca</div><div className="v" style={{color:'#843a23'}}>540<span className="cur">k</span></div><div className="d">2 phiếu chi vặt</div></div>
        <div className="it"><div className="l">Voucher Đã Dùng</div><div className="v">3</div><div className="d">Trị giá 350.000đ</div></div>
        <div className="it"><div className="l">Chênh Lệch</div><div className="v" style={{color:'#426a2c'}}>+0<span className="cur">đ</span></div><div className="d up">Khớp 3/3 ví</div></div>
      </div>

      {/* 3 reconcile boxes */}
      <div className="rec-grid" style={{marginBottom:16}}>
        {/* Tiền Mặt */}
        <div className="rec-box">
          <h4>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="ic-pill" style={{background:'linear-gradient(180deg,#e0eedd,#bfd5b8)'}}><If.Coin style={{width:14,height:14,color:'#3e5a32'}}/></div>
              Tiền Mặt
            </div>
            <span style={{fontSize:11,fontWeight:600,color:'var(--ink3)'}}>Két quầy lễ tân</span>
          </h4>
          <div className="rec-row"><span>Mở ca (13:00)</span><span>5.000.000đ</span></div>
          <div className="rec-row"><span>+ Thu trong ca</span><span style={{color:'#426a2c'}}>+ 2.340.000đ</span></div>
          <div className="rec-row"><span>− Chi vặt</span><span style={{color:'#843a23'}}>− 240.000đ</span></div>
          <div className="rec-row"><span>− Hoa hồng đã ứng</span><span style={{color:'#843a23'}}>− 800.000đ</span></div>
          <div className="rec-row tot"><span>Số dư theo hệ thống</span><span>6.300.000đ</span></div>

          <div style={{marginTop:14}}>
            <div style={{fontSize:10.5,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--ink3)'}}>Thực tế đếm (kiểm két)</div>
            <input className="rec-input" defaultValue="6.300.000" readOnly />
            <div className="diff ok">
              <span>Chênh lệch</span>
              <span>0đ · Khớp ✓</span>
            </div>
          </div>
        </div>

        {/* Chuyển Khoản */}
        <div className="rec-box">
          <h4>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="ic-pill" style={{background:'linear-gradient(180deg,#dde9f3,#a8c5dc)'}}><If.Bank style={{width:14,height:14,color:'#1a4f70'}}/></div>
              Vietcombank
            </div>
            <span style={{fontSize:11,fontWeight:600,color:'var(--ink3)'}}>*9821 · 8 GD</span>
          </h4>
          <div className="rec-row"><span>+ Khách CK</span><span style={{color:'#426a2c'}}>+ 4.860.000đ</span></div>
          <div className="rec-row"><span>− Chi tự động (điện)</span><span style={{color:'#843a23'}}>− 2.450.000đ</span></div>
          <div className="rec-row"><span>+ Nạp tiền MoMo</span><span style={{color:'#426a2c'}}>+ 1.200.000đ</span></div>
          <div className="rec-row tot"><span>Theo sao kê SMS</span><span>+ 3.610.000đ</span></div>

          <div style={{marginTop:14}}>
            <div style={{fontSize:10.5,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--ink3)'}}>Đối chiếu app ngân hàng</div>
            <input className="rec-input" defaultValue="3.610.000" readOnly/>
            <div className="diff ok">
              <span>Chênh lệch</span>
              <span>0đ · Khớp ✓</span>
            </div>
          </div>
        </div>

        {/* MoMo/ZaloPay */}
        <div className="rec-box">
          <h4>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="ic-pill" style={{background:'linear-gradient(180deg,#f0dcc0,#d4a574)'}}><If.Wallet style={{width:14,height:14,color:'#5a3e22'}}/></div>
              Ví Điện Tử
            </div>
            <span style={{fontSize:11,fontWeight:600,color:'var(--ink3)'}}>MoMo + ZaloPay</span>
          </h4>
          <div className="rec-row"><span>+ Khách quét MoMo</span><span style={{color:'#426a2c'}}>+ 980.000đ</span></div>
          <div className="rec-row"><span>+ Khách quét ZaloPay</span><span style={{color:'#426a2c'}}>+ 270.000đ</span></div>
          <div className="rec-row"><span>− Phí giao dịch (1.1%)</span><span style={{color:'#843a23'}}>− 13.750đ</span></div>
          <div className="rec-row"><span>− Rút về Vietcombank</span><span style={{color:'#843a23'}}>− 1.200.000đ</span></div>
          <div className="rec-row tot"><span>Số dư còn lại</span><span>36.250đ</span></div>

          <div style={{marginTop:14}}>
            <div style={{fontSize:10.5,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--ink3)'}}>Đối chiếu cổng thanh toán</div>
            <input className="rec-input" defaultValue="35.000" readOnly/>
            <div className="diff warn">
              <span>Chênh lệch</span>
              <span>− 1.250đ · Phí làm tròn ⚠</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail per shift */}
      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <div className="card-t"><div className="arch-i"><If.Receipt style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Hoá Đơn Ca (14)</h3></div>
          </div>
          <div className="card-b" style={{padding:0}}>
            <table className="tbl">
              <thead><tr><th style={{paddingLeft:20}}>#</th><th>Giờ</th><th>Mô Tả</th><th>PT</th><th style={{paddingRight:20}}>Số Tiền</th></tr></thead>
              <tbody>
                {[
                  ['HN-2058','15:45','RF Trẻ Hóa + Massage CV', 'transfer','Chuyển khoản','1.210.000'],
                  ['HN-2057','15:20','Aqua Skin Facial · LT 5/10','pkg','Thẻ LT','400.000'],
                  ['HN-2056','14:30','Combo Detox VIP','card','Quẹt thẻ','1.250.000'],
                  ['HN-2055','14:00','Gội Dưỡng Sinh + Serum','cash','Tiền mặt','260.000'],
                  ['HN-2054','13:45','Massage 90p','cash','Tiền mặt','500.000'],
                  ['HN-2053','13:20','Kem dưỡng Hannah XYZ × 2','transfer','MoMo','640.000'],
                ].map((r,i)=>(
                  <tr key={i}>
                    <td style={{paddingLeft:20, fontVariantNumeric:'tabular-nums', fontWeight:700, fontSize:11.5, color:'var(--ink3)'}}>{r[0]}</td>
                    <td className="time">{r[1]}</td>
                    <td className="desc">{r[2]}</td>
                    <td><span className={"method "+r[3]}>{r[4]}</span></td>
                    <td className="amount" style={{paddingRight:20}}>{r[5]}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-h">
            <div className="card-t"><div className="arch-i"><If.Bell style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Ghi Chú Bàn Giao</h3></div>
          </div>
          <div className="card-b">
            <textarea style={{
              width:'100%', minHeight:120, resize:'none',
              padding:'12px 14px', borderRadius:12,
              border:'1px solid var(--line)', background:'var(--bg2)',
              fontFamily:'var(--sans)', fontSize:13, color:'var(--ink)', lineHeight:1.5,
            }} defaultValue={`• Phòng 04 — máy RF hơi nóng, chuyển kỹ thuật xem trước ca tối.
• Khách cô Tâm hẹn 17h chuyển sang 18h vì đi trễ — đã nhắc KTV Mai.
• Kem dưỡng Hannah XYZ chỉ còn 2 hộp — đã đặt thêm với NCC HCM.
• Két còn 6.300k, đã niêm phong và bàn giao cho ca tối lúc 18:00.`}></textarea>
            <div style={{display:'flex',gap:8,marginTop:14,alignItems:'center'}}>
              <div className="avatar" style={{width:34,height:34, background:'linear-gradient(135deg,#c4998a,#a87366)'}}>BP</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--ink)'}}>Bàn giao cho: <b style={{color:'var(--ink)'}}>Nhân Thu (ca tối)</b></div>
                <div style={{fontSize:11,color:'var(--ink3)'}}>Ký xác nhận trên tablet · Hiệu lực 18:00 — 22:00</div>
              </div>
              <button className="btn ink">Ký bàn giao</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HannahFinance = { FinanceScreen, ReconcileScreen };
