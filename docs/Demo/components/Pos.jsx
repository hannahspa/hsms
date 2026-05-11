/* Hannah Spa — POS scene (desktop) */
const Ip = window.HannahIcons;

function PosScreen() {
  const cats = ['Tất cả', 'Body & Massage', 'Facial', 'Gội Dưỡng Sinh', 'Liệu Trình Cao Cấp', 'Sản Phẩm', 'Thẻ Quà'];
  const items = [
    { k:'k1', n:'RF Trẻ Hoá Bắp Tay', meta:'60 phút · KTV Senior', price:'1.000.000' },
    { k:'k2', n:'Massage Cổ Vai Gáy', meta:'45 phút', price:'350.000' },
    { k:'k3', n:'Combo Body Thư Giãn', meta:'90 phút', price:'500.000' },
    { k:'k4', n:'Aqua Skin Cấp Ẩm', meta:'75 phút · Facial', price:'400.000' },
    { k:'k5', n:'Gội Đầu Dưỡng Sinh', meta:'45 phút', price:'80.000' },
    { k:'k6', n:'Detox Mặt + Vai', meta:'120 phút · Combo', price:'1.250.000' },
    { k:'k1', n:'Triệt Lông Diode', meta:'30 phút · Lần 1', price:'600.000' },
    { k:'k2', n:'Tắm Trắng Phyto', meta:'60 phút', price:'750.000' },
    { k:'k3', n:'Ủ Tóc Hannah Premium', meta:'40 phút', price:'180.000' },
  ];
  return (
    <div className="pos">
      <div className="pos-left">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:24,fontWeight:700, letterSpacing:'-.005em'}}>POS Bán Hàng</div>
            <div style={{fontSize:12,color:'var(--ink3)',marginTop:2}}>Ca chiều · Thu ngân: <b style={{color:'var(--ink2)'}}>Bích Phượng</b> · Hoá đơn #HN-2058</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn"><Ip.Filter style={{width:14,height:14}}/> Lọc</button>
            <button className="btn ink"><Ip.Plus style={{width:14,height:14}}/> Tạo Dịch Vụ</button>
          </div>
        </div>

        <div className="pos-cats">
          {cats.map((c,i)=>(
            <button key={c} className={"pos-cat"+(i===0?' active':'')}>{c}</button>
          ))}
        </div>

        <div className="pos-grid">
          {items.map((it,i)=>(
            <div className={"pos-item "+it.k} key={i}>
              <div className="arch-thumb"/>
              <div className="n">{it.n}</div>
              <div className="meta">{it.meta}</div>
              <div className="price">{it.price}đ</div>
            </div>
          ))}
        </div>
      </div>

      <aside className="pos-right">
        <div className="pos-cust">
          <div className="avatar" style={{background:'linear-gradient(135deg,#c4998a,#a87366)'}}>PA</div>
          <div className="info" style={{flex:1}}>
            <div className="n">Cô Phương Anh</div>
            <div className="m">0908 xxx 432 · 23 lần ghé · Tích luỹ 4.250.000đ</div>
            <div className="tags">
              <span className="tg">VIP</span>
              <span className="tg" style={{background:'#e1eee8',color:'#2c4a30'}}>LT 3/8</span>
            </div>
          </div>
        </div>

        <div className="pos-cart">
          <div style={{fontSize:11,color:'var(--ink3)',letterSpacing:'.14em',textTransform:'uppercase',fontWeight:600,padding:'8px 0'}}>Giỏ hàng (3)</div>
          <div className="cart-line">
            <div>
              <div className="nm">RF Trẻ Hoá Bắp Tay</div>
              <div className="sb">Buổi 3/8 · KTV Linh Đào · Phòng 02</div>
              <div className="qty">
                <button>−</button><span className="v">1</span><button>+</button>
                <span style={{fontSize:11,color:'var(--ink3)',marginLeft:8}}>· Trừ thẻ liệu trình</span>
              </div>
            </div>
            <div className="pr">1.000.000đ</div>
          </div>
          <div className="cart-line">
            <div>
              <div className="nm">Gội Đầu Dưỡng Sinh</div>
              <div className="sb">Phụ thêm sau buổi · KTV Mai Trang</div>
              <div className="qty"><button>−</button><span className="v">1</span><button>+</button></div>
            </div>
            <div className="pr">80.000đ</div>
          </div>
          <div className="cart-line">
            <div>
              <div className="nm">Kem Dưỡng Hannah XYZ 50ml</div>
              <div className="sb">Sản phẩm · Tồn 2</div>
              <div className="qty"><button>−</button><span className="v">1</span><button>+</button></div>
            </div>
            <div className="pr">320.000đ</div>
          </div>
        </div>

        <div className="pos-foot">
          <div className="row"><span>Tạm tính</span><b>1.400.000đ</b></div>
          <div className="row"><span>Giảm VIP 10%</span><b style={{color:'#843a23'}}>− 140.000đ</b></div>
          <div className="row"><span>Voucher tháng sinh nhật</span><b style={{color:'#843a23'}}>− 50.000đ</b></div>
          <div className="total">
            <span className="l">Tổng Cộng</span>
            <span className="v">1.210.000<span style={{fontSize:18,color:'var(--ink3)',marginLeft:2}}>đ</span></span>
          </div>
          <div className="pos-pays">
            <button className="pos-pay">Tiền Mặt</button>
            <button className="pos-pay active">Chuyển Khoản</button>
            <button className="pos-pay">Quẹt Thẻ</button>
          </div>
          <button className="btn gold" style={{width:'100%',justifyContent:'center',padding:'14px',fontSize:14,fontWeight:700, letterSpacing:'.04em'}}>
            <Ip.Receipt style={{width:16,height:16}}/> XÁC NHẬN THANH TOÁN
          </button>
        </div>
      </aside>
    </div>
  );
}

window.HannahPos = { PosScreen };
