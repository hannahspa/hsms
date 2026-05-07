import { useState, useRef, useEffect } from 'react'

/**
 * Chỉ mount <img> khi element vào viewport (cách rootMargin).
 * Giảm tải băng thông: tránh load 29 ảnh gốc cùng lúc.
 */
export default function LazyImage({
  src, alt = '', aspectRatio = '4/3',
  objectFit = 'cover', objectPosition,
  rootMargin = '300px',           // load trước 300px khi sắp vào viewport
  priority = false,               // true = load ngay, không đợi observer
  onLoad,
  style: styleProp,
  ...rest
}) {
  const [inView, setInView] = useState(priority)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (priority || inView) return
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { rootMargin }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [priority, inView, rootMargin])

  const handleLoad = () => {
    setLoaded(true)
    onLoad?.()
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        aspectRatio,
        background: 'rgba(0,0,0,0.06)',
        overflow: 'hidden',
        ...styleProp,
      }}
      {...rest}
    >
      {/* Skeleton placeholder */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.03), rgba(0,0,0,0.08))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 22, opacity: 0.18 }}>🖼️</span>
        </div>
      )}

      {inView && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          style={{
            width: '100%', height: '100%',
            objectFit, objectPosition,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.5s ease',
            position: 'absolute', inset: 0,
          }}
        />
      )}
    </div>
  )
}
