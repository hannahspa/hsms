import { useState, useEffect } from 'react'
import { LUX } from '../../../constants/lux'
import { GALLERY_ROOMS, TOTAL_IMAGES } from '../../../constants/galleryImages'
import LazyImage from '../../../components/shared/LazyImage'

export default function GallerySection() {
  const [lightbox, setLightbox] = useState(null)

  const open = (roomIdx, imgIdx) => setLightbox({ roomIdx, imgIdx })
  const close = () => setLightbox(null)

  // Keyboard nav
  useEffect(() => {
    if (!lightbox) return
    const room = GALLERY_ROOMS[lightbox.roomIdx]
    const max = room.images.length
    const handler = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setLightbox(p => ({ ...p, imgIdx: (p.imgIdx + 1) % max }))
      if (e.key === 'ArrowLeft')  setLightbox(p => ({ ...p, imgIdx: (p.imgIdx - 1 + max) % max }))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  const currentImg = lightbox
    ? GALLERY_ROOMS[lightbox.roomIdx].images[lightbox.imgIdx]
    : null
  const currentName = lightbox ? GALLERY_ROOMS[lightbox.roomIdx].name : null

  return (
    <section style={{ background: '#2e1e14', padding: 'clamp(60px,10vw,100px) clamp(20px,5vw,60px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div className="lp-anim" style={{ textAlign: 'center', marginBottom: 'clamp(40px,6vw,60px)' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: LUX.fontSans, fontSize: 11, fontWeight: 700,
            color: 'rgba(212,165,116,0.65)', letterSpacing: '3px', textTransform: 'uppercase',
            border: '1px solid rgba(212,165,116,0.25)',
            padding: '6px 20px', borderRadius: 50, marginBottom: 16,
          }}>
            Không Gian Hannah Spa
          </div>
          <h2 style={{
            fontFamily: LUX.fontSerif, fontSize: 'clamp(28px,5vw,44px)',
            fontWeight: 600, color: 'rgba(255,255,255,0.92)',
            margin: '0 0 12px', lineHeight: 1.2,
          }}>
            Tham Quan Spa Của Chúng Tôi
          </h2>
          <p style={{
            fontFamily: LUX.fontSans, fontSize: 15,
            color: 'rgba(255,255,255,0.42)',
            maxWidth: 520, margin: '0 auto', lineHeight: 1.7,
          }}>
            {TOTAL_IMAGES} ảnh thực tế — 3 tầng, 6 khu vực chuyên biệt, trang thiết bị hiện đại
          </p>
        </div>

        {/* Gallery by room */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(48px,7vw,80px)' }}>
          {GALLERY_ROOMS.map((room, roomIdx) => (
            <div key={room.id} className="lp-anim">
              {/* Room header */}
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 16,
                marginBottom: 20, paddingBottom: 14,
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                <h3 style={{
                  fontFamily: LUX.fontSerif, fontSize: 'clamp(18px,2.5vw,24px)',
                  fontWeight: 600, color: 'rgba(255,255,255,0.88)',
                  margin: 0,
                }}>
                  {room.name}
                </h3>
                <span style={{
                  fontFamily: LUX.fontSans, fontSize: 12,
                  color: 'rgba(212,165,116,0.45)',
                }}>
                  {room.images.length} ảnh
                </span>
              </div>
              <p style={{
                fontFamily: LUX.fontSans, fontSize: 13,
                color: 'rgba(255,255,255,0.32)',
                margin: '0 0 18px',
              }}>
                {room.desc}
              </p>

              {/* Image grid — mỗi ảnh dùng LazyImage, chỉ load khi sắp vào viewport */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
              }}>
                {room.images.map((src, imgIdx) => (
                  <div
                    key={`${room.id}-${imgIdx}`}
                    onClick={() => open(roomIdx, imgIdx)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: LUX.radius,
                      overflow: 'hidden',
                      transition: 'transform 0.3s cubic-bezier(0.22,0.61,0.36,1)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <LazyImage
                      src={src}
                      alt={`${room.name} — ảnh ${imgIdx + 1}`}
                      aspectRatio="4/3"
                      rootMargin="200px"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox — chỉ load ảnh full khi mở */}
      {lightbox && currentImg && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          {/* Close */}
          <button onClick={close} style={{
            position: 'absolute', top: 16, right: 20,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'white', width: 40, height: 40, borderRadius: '50%',
            fontSize: 20, cursor: 'pointer', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ✕
          </button>

          {/* Prev */}
          {GALLERY_ROOMS[lightbox.roomIdx].images.length > 1 && (
            <button onClick={e => {
              e.stopPropagation()
              const max = GALLERY_ROOMS[lightbox.roomIdx].images.length
              setLightbox(p => ({ ...p, imgIdx: (p.imgIdx - 1 + max) % max }))
            }} style={{
              position: 'absolute', left: 'clamp(8px, 3vw, 24px)', top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', width: 44, height: 44, borderRadius: '50%',
              fontSize: 22, cursor: 'pointer', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              ‹
            </button>
          )}

          {/* Next */}
          {GALLERY_ROOMS[lightbox.roomIdx].images.length > 1 && (
            <button onClick={e => {
              e.stopPropagation()
              const max = GALLERY_ROOMS[lightbox.roomIdx].images.length
              setLightbox(p => ({ ...p, imgIdx: (p.imgIdx + 1) % max }))
            }} style={{
              position: 'absolute', right: 'clamp(8px, 3vw, 24px)', top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', width: 44, height: 44, borderRadius: '50%',
              fontSize: 22, cursor: 'pointer', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              ›
            </button>
          )}

          {/* Image — chỉ load khi lightbox mở */}
          <img
            src={currentImg}
            alt={currentName || ''}
            onClick={e => e.stopPropagation()}
            decoding="async"
            style={{
              maxWidth: '90vw', maxHeight: '75vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          />

          {/* Caption */}
          <div style={{
            marginTop: 16, textAlign: 'center',
            fontFamily: LUX.fontSans, fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
          }} onClick={e => e.stopPropagation()}>
            {currentName} — {lightbox.imgIdx + 1} / {GALLERY_ROOMS[lightbox.roomIdx].images.length}
          </div>
        </div>
      )}
    </section>
  )
}
