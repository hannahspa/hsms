/* Hannah Spa — Mobile dashboard scene */
const Im = window.HannahIcons;

function MobileDash() {
  return (
    <div className="mob">
      <div className="mob-top">
        <div className="mob-greet">
          <div className="e">Chiều thứ Bảy · 09/05</div>
          <div className="h">Chào chị <em>Hannah</em></div>
        </div>
        <div className="mob-top-actions">
          <button className="mob-ic"><Im.Search style={{width:17,height:17}}/></button>
          <button className="mob-ic"><Im.Bell style={{width:17,height:17}}/><span className="dot"/></button>
        </div>
      </div>

      <div className="mob-scroll">

        {/* Hero */}
        <div className="mob-hero">
          <div className="e">Doanh Thu Hôm Nay</div>
          <div className="v">5.200.000<span className="cur">đ</span></div>
          <div className="l">↑ 12% so với hôm qua · 8 hoá đơn</div>
          <div className="row">
            <div className="it"><div className="iv">8</div><div className="il">Đơn</div></div>
            <div className="it"><div className="iv">28</div><div className="il">Khách</div></div>
            <div className="it"><div className="iv">94%</div><div className="l" style={{marginTop:3}}>Lấp đầy</div></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mob-quick">
          <div className="mob-qa pos"><div className="ic"><Im.Cart style={{width:16,height:16}}/></div><div className="lbl">POS</div></div>
          <div className="mob-qa book"><div className="ic"><Im.Calendar style={{width:16,height:16}}/></div><div className="lbl">Lịch Hẹn</div></div>
          <div className="mob-qa cust"><div className="ic"><Im.Heart style={{width:16,height:16}}/></div><div className="lbl">Khách</div></div>
          <div className="mob-qa cash"><div className="ic"><Im.Wallet style={{width:16,height:16}}/></div><div className="lbl">Thu Chi</div></div>
        </div>

        {/* Today's bookings */}
        <div className="mob-card">
          <div className="mob-card-h">
            <h4>Lịch Hẹn Sắp Tới</h4>
            <a href="#">Tất cả →</a>
          </div>
          <div>
            <div className="mob-book">
              <div className="ti"><div className="t">15:00</div><div className="p">P.02</div></div>
              <div className="info"><div className="n">Cô Phương Anh</div><div className="s">RF Trẻ Hoá Bắp Tay · 60p</div></div>
              <div className="stat vip">VIP</div>
            </div>
            <div className="mob-book">
              <div className="ti"><div className="t">15:30</div><div className="p">P.04</div></div>
              <div className="info"><div className="n">Chị Hồng Nhung</div><div className="s">Massage Body Thư Giãn · 90p</div></div>
              <div className="stat">Chờ</div>
            </div>
            <div className="mob-book">
              <div className="ti"><div className="t">16:00</div><div className="p">P.01</div></div>
              <div className="info"><div className="n">Em Linh Chi</div><div className="s">Aqua Skin · 75p</div></div>
              <div className="stat ok">OK</div>
            </div>
          </div>
        </div>

        {/* Mini KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div className="mob-card" style={{padding:'14px'}}>
            <div style={{fontSize:10.5,color:'var(--ink3)',letterSpacing:'.14em',textTransform:'uppercase',fontWeight:600}}>Chi Phí</div>
            <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:700,marginTop:4,color:'var(--ink)'}}>1.850.000<span style={{fontSize:13,color:'var(--ink3)',marginLeft:2}}>đ</span></div>
            <div style={{fontSize:11,color:'#843a23',marginTop:2,fontWeight:600}}>↓ 4% · 3 khoản</div>
          </div>
          <div className="mob-card" style={{padding:'14px'}}>
            <div style={{fontSize:10.5,color:'var(--ink3)',letterSpacing:'.14em',textTransform:'uppercase',fontWeight:600}}>Tài Sản</div>
            <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:700,marginTop:4,color:'var(--ink)'}}>95.85<span style={{fontSize:13,color:'var(--ink3)',marginLeft:2}}>M</span></div>
            <div style={{fontSize:11,color:'var(--ink3)',marginTop:2}}>3 ví · Đã đối soát</div>
          </div>
        </div>

        {/* Alerts */}
        <div className="mob-card">
          <div className="mob-card-h">
            <h4>Cảnh Báo</h4>
            <a href="#">Xem 4</a>
          </div>
          <div className="alerts">
            <div className="alert warn">
              <div className="ai"><Im.Box style={{width:14,height:14}}/></div>
              <div style={{flex:1, fontSize:12}}>Kem dưỡng <b>Hannah XYZ</b> sắp hết — còn 2 hộp.</div>
            </div>
            <div className="alert danger">
              <div className="ai"><Im.Receipt style={{width:14,height:14}}/></div>
              <div style={{flex:1, fontSize:12}}><b>Chưa đối soát</b> ngày 08/05 — hạn 17:00.</div>
            </div>
          </div>
        </div>

        {/* Top services scroll */}
        <div className="mob-card">
          <div className="mob-card-h">
            <h4>Dịch Vụ Bán Chạy</h4>
            <a href="#">Tuần</a>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div className="svc s1" style={{padding:12}}>
              <div className="arch-thumb" style={{width:32,height:38}}/>
              <div className="n" style={{fontSize:12.5}}>RF Trẻ Hoá</div>
              <div className="meta">60p · Liệu trình</div>
              <div className="row"><div className="price" style={{fontSize:14}}>1.0M</div><div className="cnt">24/tuần</div></div>
            </div>
            <div className="svc s2" style={{padding:12}}>
              <div className="arch-thumb" style={{width:32,height:38}}/>
              <div className="n" style={{fontSize:12.5}}>Aqua Skin</div>
              <div className="meta">75p · Khách lẻ</div>
              <div className="row"><div className="price" style={{fontSize:14}}>400k</div><div className="cnt">18/tuần</div></div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Tab */}
      <nav className="mob-tab">
        <div className="mt-i active"><div className="ic"><Im.Dashboard style={{width:18,height:18}}/></div>Dashboard</div>
        <div className="mt-i"><div className="ic"><Im.Calendar style={{width:18,height:18}}/></div>Lịch</div>
        <div className="mt-i fab"><div className="ic"><Im.Plus2 style={{width:24,height:24}}/></div></div>
        <div className="mt-i"><div className="ic"><Im.Heart style={{width:18,height:18}}/></div>Khách</div>
        <div className="mt-i"><div className="ic"><Im.User style={{width:18,height:18}}/></div>Tôi</div>
      </nav>
    </div>
  );
}

window.HannahMobile = { MobileDash };
