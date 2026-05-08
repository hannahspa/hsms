import { HERO_BG, IMMERSION_SECTIONS } from '../../../constants/galleryImages'

// 6 ảnh ghép cặp (2/hàng) + 1 banner full-width
const PAIRS = [
  // Cặp 1
  [
    { src: IMMERSION_SECTIONS[0].images[0], alt: 'Sảnh đón Hannah Beauty & Spa' },
    { src: IMMERSION_SECTIONS[1].images[0], alt: 'Phòng chăm sóc da mặt' },
  ],
  // Cặp 2
  [
    { src: IMMERSION_SECTIONS[2].images[0], alt: 'Phòng gội đầu 5 giường' },
    { src: IMMERSION_SECTIONS[1].images[1], alt: 'Phòng điều trị da chuyên sâu' },
  ],
  // Cặp 3
  [
    { src: IMMERSION_SECTIONS[3].images[0], alt: 'Phòng triệt lông công nghệ cao' },
    { src: IMMERSION_SECTIONS[4].images[0], alt: 'Khu sấy tóc chuyên nghiệp' },
  ],
]

const BANNER = { src: HERO_BG, alt: 'Mặt tiền Hannah Beauty & Spa — 39 Nam Kỳ Khởi Nghĩa' }

export default function GallerySection() {
  return (
    <section id="thu-vien" className="lp-gallery">
      <div className="lp-container">
        {/* Header */}
        <div className="lp-section-head lp-reveal">
          <div>
            <div className="lp-eyebrow"><span className="lp-dot"></span>Thư viện · Gallery</div>
            <h2 className="lp-h-section" style={{ marginTop: 24 }}>
              Một thoáng <em>Hannah,</em><br />qua không gian và ánh sáng.
            </h2>
          </div>
          <p className="lp-lede">
            Ba tầng, mỗi tầng là một thế giới riêng — thiết kế tinh tế,
            vật liệu cao cấp, ánh sáng ấm áp và sự bình yên tuyệt đối.
          </p>
        </div>

        {/* 3 cặp ảnh, mỗi cặp 2 ảnh/hàng */}
        <div className="lp-gal-pairs lp-reveal">
          {PAIRS.map((pair, pi) => (
            <div key={pi} className="lp-gal-pair">
              {pair.map((img, ii) => (
                <div key={ii} className={`lp-gal-cell ${pi === 0 && ii === 0 ? 'lp-gal-tall' : ''}`}>
                  <img src={img.src} alt={img.alt} loading="lazy" />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Banner full-width */}
        <div className="lp-gal-banner lp-reveal">
          <img src={BANNER.src} alt={BANNER.alt} loading="lazy" />
          <div className="lp-gal-banner-caption">
            <span className="lp-label" style={{ color: 'rgba(250,246,238,0.75)' }}>
              39 Nam Kỳ Khởi Nghĩa · Ninh Kiều · Cần Thơ
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .lp-gallery { background: var(--bg-alt); }

        /* Các cặp ảnh */
        .lp-gal-pairs { display: flex; flex-direction: column; gap: 14px; }
        .lp-gal-pair {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 14px; align-items: stretch;
        }
        .lp-gal-cell {
          border-radius: 20px; overflow: hidden;
          aspect-ratio: 4/3;
          position: relative;
        }
        .lp-gal-tall { aspect-ratio: 3/4; }
        .lp-gal-cell img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform .55s cubic-bezier(.2,.8,.2,1);
          display: block;
        }
        .lp-gal-cell:hover img { transform: scale(1.05); }

        /* Banner panoramic */
        .lp-gal-banner {
          margin-top: 14px;
          border-radius: 20px; overflow: hidden;
          aspect-ratio: 21/8; position: relative;
        }
        .lp-gal-banner img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform .55s cubic-bezier(.2,.8,.2,1);
          display: block;
        }
        .lp-gal-banner:hover img { transform: scale(1.03); }
        .lp-gal-banner-caption {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 18px 28px;
          background: linear-gradient(transparent, rgba(31,27,23,0.5));
        }

        @media (max-width: 900px) {
          .lp-gal-cell { border-radius: 14px; aspect-ratio: 1/1; }
          .lp-gal-tall { aspect-ratio: 1/1; }
          .lp-gal-pair { gap: 10px; }
          .lp-gal-pairs { gap: 10px; }
          .lp-gal-banner { border-radius: 14px; aspect-ratio: 4/3; margin-top: 10px; }
        }
      `}</style>
    </section>
  )
}
