/* Hannah Spa — Kho Hàng + Khuyến Mãi */
const Iv = window.HannahIcons;

function InventoryScreen() {
  const items = [
    { sku:'SP-001', n:'Kem Dưỡng Hannah XYZ 50ml', cat:'Sản phẩm bán', cost:'180.000', sell:'320.000', stock:2, min:10, k:'k1', sold:42 },
    { sku:'SP-002', n:'Serum Hannah Glow 30ml', cat:'Sản phẩm bán', cost:'240.000', sell:'480.000', stock:18, min:8, k:'k2', sold:31 },
    { sku:'SP-003', n:'Mặt Nạ Vàng Hannah ×10', cat:'Sản phẩm bán', cost:'320.000', sell:'620.000', stock:24, min:15, k:'k3', sold:67 },
    { sku:'VT-101', n:'Tinh Dầu Lavender 100ml', cat:'Vật tư phòng', cost:'85.000', sell:'—', stock:6, min:10, k:'k4', sold:'8 chai/tuần' },
    { sku:'VT-102', n:'Khăn Bamboo Trắng 60×120', cat:'Vật tư phòng', cost:'42.000', sell:'—', stock:148, min:60, k:'k5', sold:'30 cái/tuần' },
    { sku:'VT-103', n:'Sáp Wax Triệt Lông Phyto', cat:'Vật tư phòng', cost:'120.000', sell:'—', stock:4, min:6, k:'k6', sold:'2/tuần' },
    { sku:'SP-004', n:'Hannah Body Lotion 250ml', cat:'Sản phẩm bán', cost:'140.000', sell:'280.000', stock:32, min:12, k:'k2', sold:24 },
  ];
  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'auto'}}>
      <div className="mod-head" style={{marginBottom:16}}>
        <div>
          <div className="ttl">Kho Hàng</div>
          <div className="sub">218 SKU · 7 cảnh báo tồn thấp · Tổng giá trị tồn 28.4M</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className="st active">Tất cả</div>
            <div className="st">Sản phẩm bán</div>
            <div className="st">Vật tư phòng</div>
            <div className="st">Sắp hết</div>
            <div className="st">Đã hết</div>
          </div>
          <button className="btn"><Iv.Receipt style={{width:13,height:13}}/> Nhập Kho</button>
          <button className="btn gold"><Iv.Plus style={{width:13,height:13}}/> Thêm SKU</button>
        </div>
      </div>

      <div className="strip" style={{gridTemplateColumns:'repeat(5,1fr)', marginBottom:16}}>
        <div className="it"><div className="l">Tổng SKU</div><div className="v">218</div><div className="d">84 bán · 134 vật tư</div></div>
        <div className="it"><div className="l">Giá Trị Tồn</div><div className="v">28.4<span className="cur">M</span></div><div className="d">Theo giá vốn</div></div>
        <div className="it"><div className="l">Cảnh Báo Tồn Thấp</div><div className="v" style={{color:'#843a23'}}>7</div><div className="d dn">3 SKU đã hết</div></div>
        <div className="it"><div className="l">PO Đang Chờ</div><div className="v">2</div><div className="d">Tổng 8.6M</div></div>
        <div className="it"><div className="l">Sản Phẩm Bán Chạy</div><div className="v">M.Nạ Vàng</div><div className="d">67 hộp / tháng</div></div>
      </div>

      <div className="inv-list">
        <div className="inv-row h">
          <div></div>
          <div>Sản Phẩm</div>
          <div>Phân Loại</div>
          <div>SKU</div>
          <div>Giá Vốn</div>
          <div>Giá Bán</div>
          <div>Tồn / Định Mức</div>
          <div></div>
        </div>
        {items.map((it,i)=>(
          <div className="inv-row" key={i}>
            <div className="inv-thumb" style={{background:
              it.k==='k1'?'linear-gradient(180deg,#dec5b6,#a87366)':
              it.k==='k2'?'linear-gradient(180deg,#dac4ad,#a58360)':
              it.k==='k3'?'linear-gradient(180deg,#e2c08a,#c9a86c)':
              it.k==='k4'?'linear-gradient(180deg,#cbd2c0,#7e8a6a)':
              it.k==='k5'?'linear-gradient(180deg,#ece4d4,#c0b09e)':
              'linear-gradient(180deg,#dccbc0,#9b7868)'
            }}/>
            <div className="nm">{it.n}<small>Bán: {it.sold===undefined?'—':typeof it.sold==='number'? it.sold+' hộp / tháng' : it.sold}</small></div>
            <div style={{fontSize:11.5, color:'var(--ink2)'}}>{it.cat}</div>
            <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink3)'}}>{it.sku}</div>
            <div style={{fontVariantNumeric:'tabular-nums', fontSize:12.5}}>{it.cost}đ</div>
            <div style={{fontVariantNumeric:'tabular-nums', fontSize:12.5, color: it.sell==='—'?'var(--ink3)':'var(--ink)', fontWeight:600}}>{it.sell==='—'?'—':it.sell+'đ'}</div>
            <div className="stock-bar">
              <div className={"v"+(it.stock < it.min ? ' lo':'')}>{it.stock} <span style={{fontSize:10.5,fontWeight:500,color:'var(--ink3)'}}>/ tối thiểu {it.min}</span></div>
              <div className="b"><i className={it.stock < it.min?'lo':'ok'} style={{width: Math.min(100, it.stock/it.min*100)+'%'}}/></div>
            </div>
            <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
              {it.stock < it.min && <button className="btn gold" style={{padding:'5px 10px', fontSize:11}}><Iv.Plus style={{width:11,height:11}}/> Đặt</button>}
              <button className="icon-btn" style={{width:26,height:26}}><Iv.More style={{width:13,height:13}}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PromoScreen() {
  const list = [
    { p:'30%', n:'Sinh Nhật Vàng', d:'Giảm 30% cho VIP có sinh nhật trong tháng', cov:'gold', uses:'12 / ∞', exp:'31/05', stat:'live', statL:'ĐANG CHẠY' },
    { p:'2+1', n:'Combo Body Đôi Bạn', d:'Đặt 2 buổi massage tặng 1 gội dưỡng sinh', cov:'', uses:'8 / 50', exp:'15/05', stat:'live', statL:'ĐANG CHẠY' },
    { p:'500K', n:'Voucher Khách Mới', d:'Quà chào khách mới giới thiệu từ VIP', cov:'sage', uses:'42 / 200', exp:'30/06', stat:'live', statL:'ĐANG CHẠY' },
    { p:'15%', n:'Thứ Ba Vàng', d:'Giảm 15% mọi liệu trình facial vào thứ Ba', cov:'espresso', uses:'24 / 100', exp:'30/05', stat:'live', statL:'ĐANG CHẠY' },
    { p:'1+1', n:'Mừng 8/3', d:'Mua 1 thẻ liệu trình tặng 1 buổi Aqua Skin', cov:'', uses:'68 / 68', exp:'10/03', stat:'end', statL:'ĐÃ KẾT THÚC' },
    { p:'20%', n:'Mùa Hè Trắng Sáng', d:'Tắm trắng phyto + cấp ẩm — combo mùa hè', cov:'gold', uses:'— / —', exp:'01/06', stat:'draft', statL:'BẢN NHÁP' },
  ];
  return (
    <div className="page" style={{padding:'22px 24px', flex:1, overflow:'auto'}}>
      <div className="mod-head" style={{marginBottom:16}}>
        <div>
          <div className="ttl">Khuyến Mãi</div>
          <div className="sub">4 chương trình đang chạy · 154 voucher đã phát hành · Doanh thu KM tháng: 28.6M</div>
        </div>
        <div className="acts">
          <div className="subtabs">
            <div className="st active">Tất cả</div>
            <div className="st">Đang chạy</div>
            <div className="st">Bản nháp</div>
            <div className="st">Đã kết thúc</div>
          </div>
          <button className="btn gold"><Iv.Plus style={{width:13,height:13}}/> Tạo Khuyến Mãi</button>
        </div>
      </div>

      <div className="strip" style={{gridTemplateColumns:'repeat(4,1fr)', marginBottom:16}}>
        <div className="it"><div className="l">Đang Chạy</div><div className="v">4</div><div className="d up">2 KM mới tuần này</div></div>
        <div className="it"><div className="l">Voucher Đã Phát</div><div className="v">154</div><div className="d">98 đã sử dụng (64%)</div></div>
        <div className="it"><div className="l">Doanh Thu KM</div><div className="v">28.6<span className="cur">M</span></div><div className="d up">17% tổng tháng</div></div>
        <div className="it"><div className="l">Chi Phí KM</div><div className="v" style={{color:'#843a23'}}>4.2<span className="cur">M</span></div><div className="d">ROI 6.8×</div></div>
      </div>

      <div className="promo-grid">
        {list.map((p,i)=>(
          <div className="promo" key={i}>
            <span className={"promo-stat "+p.stat}>● {p.statL}</span>
            <div className={"promo-cover "+(p.cov||'')}>
              <div className="pct">{p.p}</div>
            </div>
            <div className="promo-body">
              <div className="nm">{p.n}</div>
              <div className="ds">{p.d}</div>
              <div className="row">
                <span>Đã sử dụng <b>{p.uses}</b></span>
                <span>HSD <b>{p.exp}</b></span>
              </div>
              <div style={{display:'flex', gap:6, marginTop:12}}>
                <button className="btn" style={{flex:1, justifyContent:'center', padding:'7px', fontSize:11.5}}>Phân tích</button>
                <button className="btn ink" style={{flex:1, justifyContent:'center', padding:'7px', fontSize:11.5}}>Chia sẻ</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Promotion builder preview */}
      <div className="card" style={{marginTop:16}}>
        <div className="card-h">
          <div className="card-t">
            <div className="arch-i" style={{background:'#f5e8cf',borderColor:'#d9b87a'}}><Iv.Spark style={{width:13,height:13, color:'#8a6a52'}}/></div>
            <h3>Quy Tắc Khuyến Mãi</h3>
            <span className="sub">Sinh Nhật Vàng · 30%</span>
          </div>
          <span className="chip gold">Đang xem trước</span>
        </div>
        <div className="card-b" style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14}}>
          <div>
            <div style={{fontSize:10.5, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.12em', fontWeight:700}}>1 · Điều Kiện Khách</div>
            <div style={{marginTop:6, fontSize:13, color:'var(--ink2)', lineHeight:1.6}}>
              <div>• Phân loại = <b style={{color:'var(--ink)'}}>VIP</b></div>
              <div>• Ngày sinh trong <b style={{color:'var(--ink)'}}>tháng hiện tại</b></div>
              <div>• Đã đến ≥ <b style={{color:'var(--ink)'}}>3 lần</b> / 90 ngày</div>
            </div>
          </div>
          <div>
            <div style={{fontSize:10.5, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.12em', fontWeight:700}}>2 · Áp Dụng Cho</div>
            <div style={{marginTop:6, fontSize:13, color:'var(--ink2)', lineHeight:1.6}}>
              <div>• Tất cả liệu trình <b style={{color:'var(--ink)'}}>Facial + Body</b></div>
              <div>• Loại trừ: <span style={{color:'#843a23'}}>Combo VIP, Triệt lông</span></div>
              <div>• Tối thiểu hoá đơn <b style={{color:'var(--ink)'}}>500.000đ</b></div>
            </div>
          </div>
          <div>
            <div style={{fontSize:10.5, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.12em', fontWeight:700}}>3 · Ưu Đãi</div>
            <div style={{marginTop:6, fontSize:13, color:'var(--ink2)', lineHeight:1.6}}>
              <div>• Giảm <b style={{color:'var(--ink)'}}>30%</b> hoá đơn</div>
              <div>• Tặng kèm <b style={{color:'var(--ink)'}}>1 hũ mặt nạ vàng</b></div>
              <div>• Cộng dồn voucher: <span style={{color:'#843a23'}}>Không</span></div>
            </div>
          </div>
          <div>
            <div style={{fontSize:10.5, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.12em', fontWeight:700}}>4 · Tự Động Hoá</div>
            <div style={{marginTop:6, fontSize:13, color:'var(--ink2)', lineHeight:1.6}}>
              <div>• Auto gửi Zalo: <b style={{color:'var(--ink)'}}>Bật</b></div>
              <div>• Trước sinh nhật <b style={{color:'var(--ink)'}}>7 ngày</b></div>
              <div>• Nhắc lại nếu chưa đặt: <b style={{color:'var(--ink)'}}>Sau 3 ngày</b></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HannahInventoryPromo = { InventoryScreen, PromoScreen };
