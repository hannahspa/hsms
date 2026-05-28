/* Hannah Spa — Marketing + Nội Dung Web (CMS) */
const Im2 = window.HannahIcons;

function MarketingScreen() {
  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'auto'}}>
      <div className="mod-head" style={{marginBottom:16}}>
        <div>
          <div className="ttl">Marketing</div>
          <div className="sub">6 chiến dịch active · 3 kênh · Tháng 5 / 2026 · Ngân sách 18.4M / 25M</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className="st active">Tất cả</div>
            <div className="st">Zalo OA</div>
            <div className="st">SMS</div>
            <div className="st">Email</div>
            <div className="st">Quảng Cáo</div>
          </div>
          <button className="btn"><Im2.Filter style={{width:13,height:13}}/> Đối tượng</button>
          <button className="btn gold"><Im2.Plus style={{width:13,height:13}}/> Chiến Dịch Mới</button>
        </div>
      </div>

      {/* Strip */}
      <div className="strip" style={{gridTemplateColumns:'repeat(5,1fr)', marginBottom:16}}>
        <div className="it"><div className="l">Tin Nhắn Đã Gửi</div><div className="v">4.860</div><div className="d up">↑ 12% so với tháng trước</div></div>
        <div className="it"><div className="l">Tỉ Lệ Mở</div><div className="v">42<span className="cur">%</span></div><div className="d up">Trên TB ngành (28%)</div></div>
        <div className="it"><div className="l">Tỉ Lệ Click</div><div className="v">8.4<span className="cur">%</span></div><div className="d up">↑ 1.2pt</div></div>
        <div className="it"><div className="l">Lịch Hẹn Từ MKT</div><div className="v">128</div><div className="d">Quy 18.4M doanh thu</div></div>
        <div className="it"><div className="l">CAC Trung Bình</div><div className="v">144<span className="cur">k</span></div><div className="d up">Tốt &lt; 200k</div></div>
      </div>

      {/* Funnel */}
      <div className="mkt-funnel" style={{marginBottom:16}}>
        <div className="fn"><div className="v">4.860</div><div className="l">Đã Gửi</div><div className="r">100%</div></div>
        <div className="fn-arrow">›</div>
        <div className="fn"><div className="v">2.041</div><div className="l">Đã Mở</div><div className="r">42%</div></div>
        <div className="fn-arrow">›</div>
        <div className="fn"><div className="v">408</div><div className="l">Đã Click</div><div className="r">20%</div></div>
        <div className="fn-arrow">›</div>
        <div className="fn"><div className="v">186</div><div className="l">Tương Tác</div><div className="r">46%</div></div>
        <div className="fn-arrow">›</div>
        <div className="fn"><div className="v">128</div><div className="l">Đặt Lịch</div><div className="r">69%</div></div>
        <div className="fn-arrow">›</div>
        <div className="fn"><div className="v">98</div><div className="l">Đến Spa</div><div className="r">77%</div></div>
      </div>

      {/* Campaign list */}
      <div className="card">
        <div className="card-h">
          <div className="card-t"><div className="arch-i"><Im2.Speaker style={{width:13,height:13,color:'#8a6a52'}}/></div><h3>Chiến Dịch Đang Chạy</h3></div>
          <div className="card-actions">
            <button className="chip">Mới nhất</button>
            <button className="chip active">Hiệu quả nhất</button>
          </div>
        </div>
        <div className="card-b" style={{padding:14, display:'flex', flexDirection:'column', gap:12}}>
          {[
            { ic:'zns', n:'Sinh Nhật Vàng — Tháng 5', sub:'Zalo OA · Gửi tự động theo ngày sinh', sent:'126', open:'82%', click:'34%', book:'12', rev:'8.4M' },
            { ic:'sms', n:'Nhắc Quay Lại — VIP 30 ngày', sub:'SMS Brandname · Gửi T2 hằng tuần', sent:'42', open:'94%', click:'14%', book:'8', rev:'6.2M' },
            { ic:'eml', n:'Email Tháng — Bản Tin Hannah', sub:'Email · Trang đẹp + lịch ưu đãi', sent:'1.284', open:'38%', click:'7%', book:'24', rev:'14.8M' },
            { ic:'ads', n:'Quảng Cáo Khách Mới — Local 3km', sub:'Facebook + IG Ads · Quận 7 HCM', sent:'3.408 imp', open:'CTR 4.2%', click:'142 click', book:'18', rev:'6.4M' },
            { ic:'zns', n:'Combo Hè — Tắm Trắng', sub:'Zalo OA · Khách body 90 ngày', sent:'318', open:'56%', click:'18%', book:'14', rev:'10.2M' },
            { ic:'sms', n:'Đánh Thức Khách Ngủ Đông', sub:'SMS + Voucher 200K · 60+ ngày', sent:'56', open:'80%', click:'24%', book:'9', rev:'5.8M' },
          ].map((c,i)=>(
            <div className="camp" key={i}>
              <div className={"ic-w "+c.ic}>
                {c.ic==='zns' && <Im2.Speaker style={{width:18,height:18}}/>}
                {c.ic==='sms' && <Im2.Phone style={{width:16,height:16}}/>}
                {c.ic==='eml' && <Im2.Receipt style={{width:16,height:16}}/>}
                {c.ic==='ads' && <Im2.Globe style={{width:18,height:18}}/>}
              </div>
              <div className="nm">{c.n}<small>{c.sub}</small></div>
              <div className="ms"><div className="l">Gửi / Tiếp Cận</div><div className="v">{c.sent}</div></div>
              <div className="ms"><div className="l">Mở</div><div className="v">{c.open}</div></div>
              <div className="ms"><div className="l">Click / CTR</div><div className="v">{c.click}</div></div>
              <div className="ms"><div className="l">Đặt Lịch</div><div className="v">{c.book}</div></div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:9.5, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--ink3)', fontWeight:600}}>Doanh Thu</div>
                <div style={{fontFamily:'var(--serif)', fontSize:18, fontWeight:700, color:'#426a2c', lineHeight:1, marginTop:2}}>{c.rev}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CMSScreen() {
  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'hidden', display:'flex', flexDirection:'column', gap:14}}>
      <div className="mod-head">
        <div>
          <div className="ttl">Nội Dung Web</div>
          <div className="sub">hannahspa.vn · Trang chủ · Đã xuất bản 09/05 lúc 14:32 · 12 trang</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className="st active">Trang</div>
            <div className="st">Blog</div>
            <div className="st">SEO</div>
            <div className="st">Hình ảnh</div>
            <div className="st">Form</div>
          </div>
          <button className="btn"><Im2.Globe style={{width:13,height:13}}/> Xem Trực Tiếp</button>
          <button className="btn ink">Lưu Bản Nháp</button>
          <button className="btn gold">Xuất Bản</button>
        </div>
      </div>

      <div className="cms-grid" style={{flex:1, minHeight:0}}>
        {/* Side: pages tree */}
        <div className="cms-side">
          <div style={{fontFamily:'var(--serif)', fontSize:14, fontWeight:700, color:'var(--ink)', padding:'4px 8px 8px'}}>Cấu Trúc Trang</div>
          <div className="grp">CHÍNH</div>
          <div className="cms-page active"><Im2.Globe className="ic"/><span>Trang Chủ</span><span className="pill">Đang sửa</span></div>
          <div className="cms-page"><Im2.Heart className="ic"/><span>Về Hannah</span></div>
          <div className="cms-page"><Im2.Spark className="ic"/><span>Dịch Vụ</span></div>
          <div className="cms-page"><Im2.Tag className="ic"/><span>Bảng Giá</span></div>
          <div className="cms-page"><Im2.Calendar className="ic"/><span>Đặt Lịch</span></div>
          <div className="cms-page"><Im2.Phone className="ic"/><span>Liên Hệ</span></div>

          <div className="grp">DỊCH VỤ</div>
          <div className="cms-page" style={{paddingLeft:24}}><span style={{fontSize:11.5}}>Facial · Trẻ Hoá</span></div>
          <div className="cms-page" style={{paddingLeft:24}}><span style={{fontSize:11.5}}>Body · Massage</span></div>
          <div className="cms-page" style={{paddingLeft:24}}><span style={{fontSize:11.5}}>Gội Dưỡng Sinh</span></div>
          <div className="cms-page" style={{paddingLeft:24}}><span style={{fontSize:11.5}}>Triệt Lông</span></div>

          <div className="grp">HỆ THỐNG</div>
          <div className="cms-page"><Im2.Cog className="ic"/><span>Header / Footer</span></div>
          <div className="cms-page"><Im2.Cog className="ic"/><span>SEO Toàn Site</span></div>
        </div>

        {/* Canvas */}
        <div className="cms-canvas">
          <div className="cms-toolbar">
            <button className="cms-tool active">Desktop</button>
            <button className="cms-tool">Tablet</button>
            <button className="cms-tool">Mobile</button>
            <div style={{flex:1}}/>
            <button className="cms-tool">↶ Hoàn tác</button>
            <button className="cms-tool">↷ Làm lại</button>
            <button className="cms-tool">+ Thêm Section</button>
          </div>
          <div className="cms-preview">
            <div className="cms-block sel">
              <span className="ttype">Section · Hero</span>
              <div className="cms-hero-mock">
                <div>
                  <div style={{fontSize:10.5, letterSpacing:'.24em', textTransform:'uppercase', color:'var(--rose2)', fontWeight:700}}>— SPA & BEAUTY HÀ NỘI</div>
                  <h2 style={{fontFamily:'var(--serif)', fontSize:34, fontWeight:700, color:'var(--ink)', marginTop:6, lineHeight:1.1, letterSpacing:'-.01em'}}>
                    Nghỉ ngơi đúng nghĩa — <em style={{color:'var(--rose2)', fontWeight:600}}>giữa lòng phố thị.</em>
                  </h2>
                  <p style={{fontSize:13, color:'var(--ink2)', lineHeight:1.55, marginTop:10}}>Không gian vòm cong cảm hứng Địa Trung Hải. Liệu trình cá nhân hoá. Đội ngũ KTV được đào tạo theo chuẩn Hannah.</p>
                  <div style={{display:'flex', gap:8, marginTop:14}}>
                    <button className="btn gold" style={{padding:'10px 16px'}}>Đặt Lịch Ngay</button>
                    <button className="btn">Xem Bảng Giá</button>
                  </div>
                </div>
                <div className="img"></div>
              </div>
            </div>

            <div className="cms-block">
              <span className="ttype">Section · Dịch Vụ</span>
              <h2 style={{fontFamily:'var(--serif)', fontSize:22, fontWeight:700, color:'var(--ink)'}}>Dịch vụ tiêu biểu</h2>
              <p style={{fontSize:12, color:'var(--ink3)', marginTop:2}}>3 nhóm dịch vụ được khách yêu thích nhất.</p>
              <div className="cms-svc-mock" style={{marginTop:12}}>
                <div className="it"><div className="th"/><div className="nm">RF Trẻ Hoá Bắp Tay</div><div className="pr">1.000.000đ</div></div>
                <div className="it"><div className="th" style={{background:'linear-gradient(180deg,#dac4ad,#a58360)'}}/><div className="nm">Massage Body 90 phút</div><div className="pr">500.000đ</div></div>
                <div className="it"><div className="th" style={{background:'linear-gradient(180deg,#cbd2c0,#7e8a6a)'}}/><div className="nm">Aqua Skin Cấp Ẩm</div><div className="pr">400.000đ</div></div>
              </div>
            </div>

            <div className="cms-block">
              <span className="ttype">Section · Đặt Lịch</span>
              <h2 style={{fontFamily:'var(--serif)', fontSize:22, fontWeight:700, color:'var(--ink)'}}>Đặt lịch trong 30 giây</h2>
              <p style={{fontSize:12, color:'var(--ink2)', marginTop:2}}>Chọn dịch vụ → chọn giờ → xác nhận qua Zalo.</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginTop:14}}>
                {['Dịch vụ','Ngày','Giờ','SĐT Zalo'].map(p=>(
                  <div key={p} style={{padding:'10px 12px', background:'var(--bg2)', borderRadius:8, fontSize:11.5, color:'var(--ink3)'}}>{p}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className="cms-insp">
          <div className="h">Thuộc Tính Block</div>
          <div className="insp-grp">
            <div className="l">Loại Section</div>
            <select className="insp-fld" defaultValue="hero">
              <option value="hero">Hero · Toàn cảnh</option>
              <option>Dịch vụ · Lưới 3 cột</option>
              <option>Testimonial · Đánh giá</option>
              <option>Đặt lịch · Form</option>
              <option>Bảng giá · Bảng</option>
            </select>
          </div>
          <div className="insp-grp">
            <div className="l">Tiêu Đề (H1)</div>
            <textarea className="insp-fld insp-tx">Nghỉ ngơi đúng nghĩa — giữa lòng phố thị.</textarea>
          </div>
          <div className="insp-grp">
            <div className="l">Eyebrow</div>
            <input className="insp-fld" defaultValue="— SPA & BEAUTY HÀ NỘI"/>
          </div>
          <div className="insp-grp">
            <div className="l">Mô Tả</div>
            <textarea className="insp-fld insp-tx">Không gian vòm cong cảm hứng Địa Trung Hải. Liệu trình cá nhân hoá.</textarea>
          </div>
          <div className="insp-grp">
            <div className="l">Tông Màu Section</div>
            <div className="insp-sw">
              <div className="s sel" style={{background:'linear-gradient(135deg,#efe2cf,#d8bfa1)'}}/>
              <div className="s" style={{background:'linear-gradient(135deg,#dec5b6,#a87366)'}}/>
              <div className="s" style={{background:'linear-gradient(135deg,#3d2c20,#2e2018)'}}/>
              <div className="s" style={{background:'linear-gradient(135deg,#cbd2c0,#7e8a6a)'}}/>
              <div className="s" style={{background:'linear-gradient(135deg,#e2c08a,#a87f4f)'}}/>
            </div>
          </div>
          <div className="insp-grp">
            <div className="l">CTA Chính · URL</div>
            <input className="insp-fld" defaultValue="/dat-lich"/>
          </div>
          <div className="insp-grp" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
            <div>
              <div style={{fontSize:12, fontWeight:600, color:'var(--ink)'}}>Hiện section này</div>
              <div style={{fontSize:10.5, color:'var(--ink3)'}}>Tắt để ẩn khỏi website</div>
            </div>
            <div className="toggle on"><div className="tr"/></div>
          </div>
          <div className="insp-grp" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:12, fontWeight:600, color:'var(--ink)'}}>SEO theo trang</div>
              <div style={{fontSize:10.5, color:'var(--ink3)'}}>Meta title + description</div>
            </div>
            <div className="toggle on"><div className="tr"/></div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HannahMktCMS = { MarketingScreen, CMSScreen };
