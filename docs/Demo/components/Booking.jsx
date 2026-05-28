/* Hannah Spa — Booking (Đặt Hẹn) module */
const Ib = window.HannahIcons;

function MiniCal() {
  const days = Array.from({length:35},(_,i)=>{
    const d = i-3; // start offset
    return { n: d<=0 ? 27+d : d>30 ? d-30 : d, mute: d<=0||d>31 };
  });
  const today = 9, selected = 9;
  const hasDays = [3,5,7,9,11,12,15,18,20,22,25,28];
  return (
    <div className="mini-cal">
      <div className="h">
        <h4>Tháng 5, 2026</h4>
        <div className="nav"><button>‹</button><button>›</button></div>
      </div>
      <div className="mini-cal-grid">
        {['CN','T2','T3','T4','T5','T6','T7'].map(d=><div key={d} className="dn">{d}</div>)}
        {days.map((d,i)=>(
          <div key={i} className={
            "d"
            + (d.mute?' mute':'')
            + (!d.mute && d.n===today?' today':'')
            + (!d.mute && d.n===selected && d.n!==today?' sel':'')
            + (!d.mute && hasDays.includes(d.n)?' has':'')
          }>{d.n}</div>
        ))}
      </div>
    </div>
  );
}

function BookingScreen() {
  const cats = [
    { c:'#a87366', l:'Facial · Trẻ Hóa' },
    { c:'#b08a55', l:'Body · Massage' },
    { c:'#6e8a5e', l:'Liệu Trình' },
    { c:'#8a6a6e', l:'Gội Dưỡng Sinh' },
    { c:'#5a4030', l:'Combo Cao Cấp' },
  ];
  const staff = [
    { c:'#c9a96e', l:'Linh Đào · Senior', on:true },
    { c:'#c4998a', l:'Mai Trang', on:true },
    { c:'#a87366', l:'Thu Hà', on:true },
    { c:'#7a8a6a', l:'Bích Phượng', on:false },
  ];
  const hours = Array.from({length:11}, (_,i)=>i+9);
  const days = ['T2','T3','T4','T5','T6','T7','CN'];
  const dates = [4,5,6,7,8,9,10];
  // events: [dayIdx, startHour(decimal), duration(decimal h), color, time, name, svc]
  const events = [
    [0, 9.5, 1.5, 'gold', '09:30', 'Cô Linh', 'Aqua Skin'],
    [0, 14, 1, 'rose', '14:00', 'Chị Hằng', 'RF Trẻ Hóa'],
    [1, 10, 2, 'sage', '10:00', 'Cô Nga', 'Combo Detox'],
    [1, 15, 1, 'mauve', '15:00', 'Em Thư', 'Gội Dưỡng Sinh'],
    [2, 9, 1.5, 'rose', '09:00', 'Chị Vy', 'RF Bắp Tay'],
    [2, 13.5, 2, 'espresso', '13:30', 'Cô Nhung', 'Combo VIP 120p'],
    [3, 11, 1, 'gold', '11:00', 'Em Anh', 'Facial Cấp Ẩm'],
    [3, 16, 1.5, 'sage', '16:00', 'Cô Tâm', 'Massage 90p'],
    [4, 10, 1.5, 'rose', '10:00', 'Chị Bích', 'Triệt Lông'],
    [4, 14.5, 1.5, 'gold', '14:30', 'Cô Phượng', 'Aqua Skin'],
    [4, 17, 1, 'mauve', '17:00', 'Em Linh', 'Gội Đầu'],
    [5, 9, 2, 'espresso', '09:00', 'Cô P. Anh', 'RF + Massage'],
    [5, 15, 1, 'rose', '15:00', 'Chị H. Nhung', 'Body Thư Giãn'],
    [5, 16, 1.25, 'gold', '16:00', 'Em L. Chi', 'Aqua Skin'],
    [6, 10, 1.5, 'sage', '10:00', 'Cô T. Hà', 'Combo Mặt Vai'],
  ];

  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'hidden', display:'flex',flexDirection:'column', gap:16}}>
      {/* Header */}
      <div className="mod-head">
        <div>
          <div className="ttl">Đặt Hẹn</div>
          <div className="sub">Tuần này · 04 → 10 / 05 / 2026 · 27 hẹn · 4 KTV trực</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className="st">Ngày</div>
            <div className="st active">Tuần</div>
            <div className="st">Tháng</div>
            <div className="st">Danh sách</div>
          </div>
          <button className="btn"><Ib.Filter style={{width:14,height:14}}/> Lọc</button>
          <button className="btn gold"><Ib.Plus style={{width:14,height:14}}/> Đặt Lịch Mới</button>
        </div>
      </div>

      {/* Strip */}
      <div className="strip" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        <div className="it"><div className="l">Hẹn Hôm Nay</div><div className="v">12</div><div className="d up">↑ 3 so với hôm qua</div></div>
        <div className="it"><div className="l">Đã Xác Nhận</div><div className="v">9</div><div className="d">3 chờ xác nhận</div></div>
        <div className="it"><div className="l">Tỉ Lệ Đến</div><div className="v">92<span className="cur">%</span></div><div className="d up">↑ 4% / tuần</div></div>
        <div className="it"><div className="l">Phòng Trống</div><div className="v">2/5</div><div className="d">Phòng 03, 05</div></div>
        <div className="it"><div className="l">Doanh Thu Dự Kiến</div><div className="v">8.4<span className="cur">M</span></div><div className="d">Theo lịch hẹn</div></div>
      </div>

      {/* 3-col body */}
      <div className="bk" style={{flex:1, minHeight:0}}>
        {/* Left side: mini cal + filters */}
        <div className="bk-side">
          <MiniCal/>
          <div className="card">
            <div className="card-h" style={{padding:'12px 16px 10px'}}>
              <div className="card-t"><h3 style={{fontSize:14}}>Bộ Lọc</h3></div>
            </div>
            <div className="card-b" style={{padding:'10px 16px 16px'}}>
              <div className="filters">
                <div className="filter-grp">
                  <div className="lab">Loại Dịch Vụ</div>
                  {cats.map((s,i)=>(
                    <div className="filter-row" key={i}>
                      <span className={"cbox"+(i<3?' on':'')}></span>
                      <span className="dotc" style={{background:s.c}}></span>
                      <span>{s.l}</span>
                    </div>
                  ))}
                </div>
                <div className="filter-grp">
                  <div className="lab">Kỹ Thuật Viên</div>
                  {staff.map((s,i)=>(
                    <div className="filter-row" key={i}>
                      <span className={"cbox"+(s.on?' on':'')}></span>
                      <span className="dotc" style={{background:s.c}}></span>
                      <span>{s.l}</span>
                    </div>
                  ))}
                </div>
                <div className="filter-grp">
                  <div className="lab">Phòng</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {['P.01','P.02','P.03','P.04','P.05','VIP'].map((p,i)=>(
                      <button key={p} className={"chip"+(i<3?' active':'')} style={{fontSize:11,padding:'4px 10px'}}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bk-main">
          <div className="bk-week-h">
            <div className="cell"></div>
            {days.map((d,i)=>(
              <div key={i} className={"cell"+(i===5?' tod':'')}>
                <div className="dn">{d}</div>
                <div className="dt">{dates[i]}</div>
              </div>
            ))}
          </div>
          <div className="bk-week-body">
            {/* time column */}
            <div style={{display:'flex',flexDirection:'column'}}>
              {hours.map(h=><div className="bk-hour" key={h}>{String(h).padStart(2,'0')}:00</div>)}
            </div>
            {/* day columns */}
            {days.map((d,di)=>(
              <div key={di} style={{position:'relative',display:'flex',flexDirection:'column'}}>
                {hours.map(h=><div className={"bk-cell"+(di===5?' tod':'')} key={h}/>)}
                {events.filter(e=>e[0]===di).map((e,ei)=>(
                  <div key={ei} className={"bk-ev "+e[3]} style={{
                    top: (e[1]-9)*70 + 'px',
                    height: e[2]*70 - 4 + 'px',
                  }}>
                    <div className="et">{e[4]}</div>
                    <div className="en">{e[5]}</div>
                    <div className="es">{e[6]}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="bk-detail">
          <div className="card">
            <div className="card-h" style={{padding:'14px 18px'}}>
              <div className="card-t">
                <div className="arch-i" style={{background:'#f5e2d8',borderColor:'#d4a098'}}></div>
                <h3 style={{fontSize:15}}>Chi Tiết Lịch Hẹn</h3>
              </div>
              <button className="icon-btn" style={{width:28,height:28}}><Ib.More style={{width:14,height:14}}/></button>
            </div>
            <div className="card-b" style={{padding:'16px 18px'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                <div className="avatar" style={{width:44,height:44,background:'linear-gradient(135deg,#c4998a,#a87366)',fontSize:14}}>PA</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:700,color:'var(--ink)'}}>Cô Phương Anh</div>
                  <div style={{fontSize:11.5, color:'var(--ink3)'}}>VIP · 23 lần ghé · 0908 432 ***</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12}}>
                <div>
                  <div style={{fontSize:10, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600}}>Thời Gian</div>
                  <div style={{fontFamily:'var(--serif)', fontSize:16, fontWeight:700, color:'var(--ink)', marginTop:2}}>09:00 — 11:00</div>
                </div>
                <div>
                  <div style={{fontSize:10, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600}}>Phòng</div>
                  <div style={{fontFamily:'var(--serif)', fontSize:16, fontWeight:700, color:'var(--ink)', marginTop:2}}>Phòng 02 · VIP</div>
                </div>
                <div>
                  <div style={{fontSize:10, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600}}>KTV</div>
                  <div style={{fontFamily:'var(--serif)', fontSize:16, fontWeight:700, color:'var(--ink)', marginTop:2}}>Linh Đào</div>
                </div>
                <div>
                  <div style={{fontSize:10, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600}}>Trạng Thái</div>
                  <div style={{marginTop:4}}><span className="seg vip" style={{padding:'4px 10px',borderRadius:999,fontSize:10.5,fontWeight:700,letterSpacing:'.04em',background:'#e1eee8',color:'#2c4a30'}}>ĐÃ XÁC NHẬN</span></div>
                </div>
              </div>
              <div style={{borderTop:'1px solid var(--line)', paddingTop:12}}>
                <div style={{fontSize:10, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600, marginBottom:6}}>Dịch Vụ (2)</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px dashed var(--line)'}}>
                    <div><div style={{fontSize:12.5,fontWeight:600,color:'var(--ink)'}}>RF Trẻ Hoá Bắp Tay</div><div style={{fontSize:10.5,color:'var(--ink3)'}}>Buổi 3/8 · 60p</div></div>
                    <div style={{fontFamily:'var(--serif)',fontWeight:700,color:'var(--ink)'}}>1.000.000đ</div>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
                    <div><div style={{fontSize:12.5,fontWeight:600,color:'var(--ink)'}}>Massage Cổ Vai Gáy</div><div style={{fontSize:10.5,color:'var(--ink3)'}}>Kèm theo · 30p</div></div>
                    <div style={{fontFamily:'var(--serif)',fontWeight:700,color:'var(--ink)'}}>200.000đ</div>
                  </div>
                </div>
              </div>
              <div style={{borderTop:'1px solid var(--line)', paddingTop:12, marginTop:12}}>
                <div style={{fontSize:10, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600, marginBottom:6}}>Ghi chú</div>
                <div style={{fontSize:12, color:'var(--ink2)', lineHeight:1.5, padding:'8px 10px', background:'var(--bg2)', borderRadius:8}}>
                  Khách dị ứng tinh dầu lavender. Ưa âm nhạc nhẹ. Trà gừng đường kiêng.
                </div>
              </div>
              <div style={{display:'flex',gap:6,marginTop:14}}>
                <button className="btn" style={{flex:1, justifyContent:'center'}}>Sửa</button>
                <button className="btn ink" style={{flex:1, justifyContent:'center'}}><Ib.Phone style={{width:13,height:13}}/> Gọi</button>
                <button className="btn gold" style={{flex:1, justifyContent:'center'}}>Check-in</button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h" style={{padding:'14px 18px'}}>
              <div className="card-t"><h3 style={{fontSize:14}}>Chờ Xác Nhận (3)</h3></div>
            </div>
            <div className="card-b" style={{padding:'10px 14px 14px'}}>
              {[
                { t:'15:00', n:'Cô Hồng Vân', s:'Aqua Skin · 75p · Online' },
                { t:'17:30', n:'Chị Tú Linh', s:'Combo Detox · 120p · Website' },
                { t:'19:00', n:'Em Hà My', s:'Gội Dưỡng Sinh · 45p · Zalo' },
              ].map((w,i)=>(
                <div key={i} style={{display:'flex',gap:10,padding:'8px 0',borderBottom: i<2?'1px dashed var(--line)':''}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:700,color:'var(--ink)',minWidth:40}}>{w.t}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:600,color:'var(--ink)'}}>{w.n}</div>
                    <div style={{fontSize:10.5,color:'var(--ink3)'}}>{w.s}</div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    <button className="icon-btn" style={{width:26,height:26,color:'#426a2c'}}>✓</button>
                    <button className="icon-btn" style={{width:26,height:26,color:'#843a23'}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HannahBooking = { BookingScreen };
