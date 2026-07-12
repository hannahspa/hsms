/* Hannah Spa — Nhân Sự + CRM */
const Is = window.HannahIcons;

function StaffScreen() {
  const team = [
    { n:'Linh Đào', i:'LĐ', r:'KTV Senior · Trưởng Nhóm', av:'linear-gradient(135deg,#c9a96e,#a87f4f)',
      cust:128, rev:'42.8M', rating:4.96, comm:'8.6M',
      shifts:['S','S','S','—','C','C','C'] },
    { n:'Mai Trang', i:'MT', r:'KTV Facial · 3 năm', av:'linear-gradient(135deg,#c4998a,#a87366)',
      cust:96, rev:'28.4M', rating:4.88, comm:'5.7M',
      shifts:['C','S','C','S','S','—','C'] },
    { n:'Thu Hà', i:'TH', r:'KTV Body · 2 năm', av:'linear-gradient(135deg,#94a085,#6e8a5e)',
      cust:74, rev:'18.6M', rating:4.81, comm:'3.7M',
      shifts:['S','C','S','C','—','S','C'] },
    { n:'Bích Phượng', i:'BP', r:'Lễ Tân · Thu Ngân', av:'linear-gradient(135deg,#8a6a6e,#634a4e)',
      cust:312, rev:'—', rating:4.92, comm:'4.2M',
      shifts:['S','S','S','S','S','—','—'] },
    { n:'Hồng Vân', i:'HV', r:'KTV Gội Dưỡng Sinh', av:'linear-gradient(135deg,#c9a96e,#a87f4f)',
      cust:58, rev:'12.4M', rating:4.78, comm:'2.5M',
      shifts:['—','S','C','C','S','S','C'] },
    { n:'Quốc Khánh', i:'QK', r:'Kỹ Thuật · Bảo Trì', av:'linear-gradient(135deg,#5a4030,#2e2018)',
      cust:0, rev:'—', rating:5.00, comm:'—',
      shifts:['S','—','S','—','S','—','—'] },
  ];

  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'auto'}}>
      <div className="mod-head" style={{marginBottom:16}}>
        <div>
          <div className="ttl">Nhân Sự</div>
          <div className="sub">6 nhân viên · 4 KTV + 1 Lễ tân + 1 Kỹ thuật · Tuần 19 / 2026</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className="st active">Danh Sách</div>
            <div className="st">Lịch Ca</div>
            <div className="st">Chấm Công</div>
            <div className="st">Hoa Hồng & Lương</div>
          </div>
          <button className="btn"><Is.Filter style={{width:13,height:13}}/> Lọc</button>
          <button className="btn gold"><Is.Plus style={{width:13,height:13}}/> Thêm Nhân Sự</button>
        </div>
      </div>

      <div className="strip" style={{gridTemplateColumns:'repeat(5,1fr)', marginBottom:16}}>
        <div className="it"><div className="l">Tổng Nhân Sự</div><div className="v">6</div><div className="d">1 đang nghỉ phép</div></div>
        <div className="it"><div className="l">Đang Trực</div><div className="v">4</div><div className="d">Ca chiều · 13–22h</div></div>
        <div className="it"><div className="l">Khách Phục Vụ Tuần</div><div className="v">312</div><div className="d up">↑ 18% so với T18</div></div>
        <div className="it"><div className="l">Quỹ Hoa Hồng Tuần</div><div className="v">24.7<span className="cur">M</span></div><div className="d">Chi thứ 2 / 2 tuần</div></div>
        <div className="it"><div className="l">Đánh Giá TB</div><div className="v">4.89<span className="cur">★</span></div><div className="d up">↑ 0.04 / tuần</div></div>
      </div>

      <div className="staff-grid">
        {team.map((s,i)=>(
          <div className="staff-card" key={i}>
            <div className="top">
              <div className="av" style={{background:s.av, color:'#fff'}}>{s.i}</div>
              <div className="info" style={{flex:1}}>
                <div className="nm">{s.n}</div>
                <div className="rl">{s.r}</div>
              </div>
              <button className="icon-btn" style={{width:28,height:28}}><Is.More style={{width:13,height:13}}/></button>
            </div>
            <div className="meta">
              <div><div className="l">Khách / Tháng</div><div className="v">{s.cust}</div></div>
              <div><div className="l">Doanh Thu</div><div className="v">{s.rev}</div></div>
              <div><div className="l">Đánh Giá</div><div className="v" style={{color:'#b08a55'}}>{s.rating} ★</div></div>
              <div><div className="l">Hoa Hồng</div><div className="v">{s.comm}</div></div>
            </div>
            <div style={{marginTop:14, paddingTop:12, borderTop:'1px solid var(--line)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div style={{fontSize:10,color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:600}}>Ca Tuần (T2 → CN)</div>
                <div style={{fontSize:10,color:'var(--ink3)'}}><span style={{display:'inline-block',width:8,height:8,background:'var(--gold)',borderRadius:2,marginRight:4,verticalAlign:'middle'}}/>Trực <span style={{display:'inline-block',width:8,height:8,background:'#f0e2dc',borderRadius:2,marginLeft:8,marginRight:4,verticalAlign:'middle'}}/>Nghỉ</div>
              </div>
              <div className="shift">
                {s.shifts.map((sh,si)=>(
                  <div key={si} className={"s "+(sh==='—'?'off':'on')}>{sh==='—'?'—':sh}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CRMScreen() {
  const list = [
    { n:'Cô Phương Anh', i:'PA', sub:'0908 ••• 432 · phuonganh@gmail.com', seg:'vip', segL:'VIP', visits:23, last:'10/05', spent:'42.8M', life:90, sub2:'Khách kim cương · 3 năm' },
    { n:'Chị Hồng Nhung', i:'HN', sub:'0907 ••• 218 · IG @hongnhung', seg:'vip', segL:'VIP', visits:18, last:'09/05', spent:'31.2M', life:78, sub2:'Mê combo body' },
    { n:'Cô Thu Hằng', i:'TH', sub:'0934 ••• 909', seg:'reg', segL:'THƯỜNG XUYÊN', visits:14, last:'08/05', spent:'18.6M', life:60, sub2:'Đến đều 2 tuần' },
    { n:'Em Linh Chi', i:'LC', sub:'0976 ••• 421 · Zalo', seg:'new', segL:'MỚI', visits:2, last:'07/05', spent:'1.4M', life:18, sub2:'Đến lần 2' },
    { n:'Chị Bích Vân', i:'BV', sub:'0908 ••• 770', seg:'vip', segL:'VIP', visits:21, last:'05/05', spent:'38.4M', life:84, sub2:'Sinh nhật 22/05' },
    { n:'Cô Tâm Như', i:'TN', sub:'0908 ••• 156', seg:'reg', segL:'THƯỜNG XUYÊN', visits:11, last:'02/05', spent:'14.2M', life:48, sub2:'—' },
    { n:'Chị Hà My', i:'HM', sub:'0905 ••• 882 · Zalo', seg:'slp', segL:'NGỦ ĐÔNG', visits:7, last:'15/03', spent:'8.6M', life:24, sub2:'Chưa quay lại 56 ngày' },
    { n:'Em Tú Linh', i:'TL', sub:'0938 ••• 044', seg:'new', segL:'MỚI', visits:1, last:'08/05', spent:'400k', life:8, sub2:'Khách giới thiệu từ Nhung' },
  ];

  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'auto'}}>
      <div className="mod-head" style={{marginBottom:16}}>
        <div>
          <div className="ttl">CRM Khách Hàng</div>
          <div className="sub">1.284 khách hàng · 312 active 30 ngày · 18 VIP · Cập nhật 14:32</div>
        </div>
        <div className="acts">
          <button className="btn"><Is.Filter style={{width:13,height:13}}/> Phân Loại</button>
          <button className="btn"><Is.Speaker style={{width:13,height:13}}/> Gửi Chiến Dịch</button>
          <button className="btn gold"><Is.Plus style={{width:13,height:13}}/> Khách Mới</button>
        </div>
      </div>

      {/* Segment chips */}
      <div style={{display:'flex',gap:10,marginBottom:14, flexWrap:'wrap'}}>
        {[
          { c:'#2a201a', l:'Tất cả · 1.284', a:true },
          { c:'#b08a55', l:'VIP · 18 (≥ 30M)', },
          { c:'#6e8a5e', l:'Thường xuyên · 142', },
          { c:'#1a4f70', l:'Khách mới · 64' , },
          { c:'#843a23', l:'Ngủ đông · 56', },
          { c:'#5a4030', l:'Sinh nhật tuần · 12', },
        ].map((x,i)=>(
          <button key={i} className={"chip"+(x.a?' active':'')} style={{
            padding:'7px 14px', fontSize:12.5,
            borderLeft: !x.a ? '3px solid '+x.c : ''
          }}>{x.l}</button>
        ))}
      </div>

      <div className="strip" style={{gridTemplateColumns:'repeat(4,1fr)', marginBottom:16}}>
        <div className="it"><div className="l">Khách Hôm Nay</div><div className="v">28</div><div className="d up">↑ 4 vs hôm qua</div></div>
        <div className="it"><div className="l">Khách Mới Tháng</div><div className="v">42</div><div className="d up">+ 18 từ giới thiệu</div></div>
        <div className="it"><div className="l">Tỉ Lệ Quay Lại</div><div className="v">68<span className="cur">%</span></div><div className="d up">↑ 6pt / tháng</div></div>
        <div className="it"><div className="l">LTV Trung Bình</div><div className="v">3.8<span className="cur">M</span></div><div className="d">Top 10% &gt; 25M</div></div>
      </div>

      <div className="crm-list">
        <div className="crm-row h">
          <div className="av"></div>
          <div>Khách Hàng</div>
          <div>Liên Hệ / Ghi Chú</div>
          <div>Phân Loại</div>
          <div>Lượt Ghé</div>
          <div>Lần Cuối</div>
          <div>Tổng Chi Tiêu</div>
          <div></div>
        </div>
        {list.map((c,i)=>(
          <div className="crm-row" key={i}>
            <div className="av">{c.i}</div>
            <div className="nm">{c.n}<small>{c.sub2}</small></div>
            <div style={{fontSize:11.5, color:'var(--ink3)'}}>{c.sub}</div>
            <div><span className={"seg "+c.seg}>{c.segL}</span></div>
            <div style={{fontFamily:'var(--serif)', fontSize:17, fontWeight:700, color:'var(--ink)'}}>{c.visits}</div>
            <div style={{fontSize:12, color:'var(--ink2)', fontVariantNumeric:'tabular-nums'}}>{c.last}</div>
            <div>
              <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:700,color:'var(--ink)'}}>{c.spent}</div>
              <div className="bar-h"><i style={{width:c.life+'%'}}/></div>
            </div>
            <div style={{display:'flex',gap:4}}>
              <button className="icon-btn" style={{width:28,height:28}}><Is.Phone style={{width:13,height:13}}/></button>
              <button className="icon-btn" style={{width:28,height:28}}><Is.More style={{width:13,height:13}}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.HannahStaffCRM = { StaffScreen, CRMScreen };
