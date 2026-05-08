import { useEffect } from 'react'
import { useCMS } from '../../hooks/useCMS'
import NavBar from './sections/NavBar'
import HeroSection from './sections/HeroSection'
import MarqueeSection from './sections/MarqueeSection'
import AboutSection from './sections/AboutSection'
import ServicesSection from './sections/ServicesSection'
import GallerySection from './sections/GallerySection'
import TestimonialsSection from './sections/TestimonialsSection'
import ContactSection from './sections/ContactSection'
import FaqSection from './sections/FaqSection'
import LocationSection from './sections/LocationSection'
import FooterSection from './sections/FooterSection'
import StickyCTA from './sections/StickyCTA'

// Fonts loaded via index.html <link> tags — no @import needed here
const LP_CSS = `
  /* ══ DESIGN TOKENS trên :root để tất cả section dùng được ══ */
  :root {
    --bg:         #F5F0E8;
    --bg-alt:     #EAE2D3;
    --bg-deep:    #1F1B17;
    --ink:        #1F1B17;
    --ink-soft:   #4A413A;
    --ink-mute:   #8A7E72;
    --line:       #DCD2BF;
    --terracotta: #A87E5C;
    --champagne:  #D4B896;
    --cream:      #FAF6EE;
    --serif:      "Cormorant Garamond", "Georgia", serif;
    --display:    "Playfair Display", "Georgia", serif;
    --sans:       "Inter", system-ui, -apple-system, sans-serif;
    --mono:       "JetBrains Mono", ui-monospace, monospace;
  }

  /* ══ SMOOTH SCROLL ══ */
  html { scroll-behavior: smooth; }

  /* ══ RESET cho lp-root ══ */
  .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .lp-root {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--ink);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow-x: hidden;
  }
  .lp-root img { max-width: 100%; display: block; object-fit: cover; }
  .lp-root a { color: inherit; text-decoration: none; }
  .lp-root button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
  .lp-root section { position: relative; padding: 120px 0; }

  /* ══ CONTAINER ══ */
  .lp-container { max-width: 1400px; margin: 0 auto; padding: 0 56px; }
  @media (max-width: 720px) { .lp-container { padding: 0 24px; } }

  /* ══ TYPOGRAPHY ══ */
  .lp-eyebrow {
    font-family: var(--sans); font-size: 11px;
    letter-spacing: 0.30em; text-transform: uppercase;
    color: var(--ink-mute); font-weight: 500;
    display: flex; align-items: center; gap: 10px;
  }
  .lp-dot {
    display: inline-block; width: 5px; height: 5px; border-radius: 50%;
    background: var(--terracotta); flex-shrink: 0;
  }
  .lp-h-display {
    font-family: var(--serif); font-weight: 300;
    font-size: clamp(52px, 7.5vw, 120px);
    line-height: 0.95; letter-spacing: -0.02em;
  }
  .lp-h-display em { font-family: var(--display); font-style: normal; font-weight: 400; color: var(--terracotta); }
  .lp-h-section {
    font-family: var(--serif); font-weight: 300;
    font-size: clamp(38px, 5vw, 72px);
    line-height: 1.02; letter-spacing: -0.015em; color: var(--ink);
  }
  .lp-h-section em { font-family: var(--display); font-style: normal; }
  .lp-lede {
    font-family: var(--serif); font-size: clamp(18px, 1.5vw, 22px);
    line-height: 1.5; color: var(--ink-soft); font-weight: 400;
  }
  .lp-label {
    font-family: var(--mono); font-size: 10px;
    letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute);
    display: block;
  }
  .lp-bilingual {
    color: var(--ink-mute); font-style: italic;
    font-family: var(--serif); font-size: 0.82em;
  }

  /* ══ BUTTONS ══ */
  .lp-btn {
    display: inline-flex; align-items: center; gap: 14px;
    padding: 16px 28px; font-size: 12px;
    letter-spacing: 0.16em; text-transform: uppercase; font-weight: 500;
    border-radius: 999px; white-space: nowrap; font-family: var(--sans);
    transition: transform .35s cubic-bezier(.2,.8,.2,1), background .25s, color .25s, border-color .25s;
  }
  .lp-btn:hover { transform: translateY(-2px); }
  /* Dùng .lp-root prefix để đánh bại .lp-root a { color: inherit } (specificity 0,1,1) */
  .lp-root .lp-btn-primary { background: var(--ink); color: var(--cream); }
  .lp-root .lp-btn-primary:hover { background: var(--terracotta); color: var(--cream); }
  .lp-root .lp-btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
  .lp-root .lp-btn-ghost:hover { border-color: var(--ink); color: var(--ink); }
  .lp-arrow {
    display: inline-block; width: 18px; height: 1px;
    background: currentColor; position: relative;
    transition: width .3s; flex-shrink: 0;
  }
  .lp-arrow::after {
    content: ""; position: absolute; right: 0; top: -3px;
    width: 6px; height: 6px;
    border-top: 1px solid currentColor; border-right: 1px solid currentColor;
    transform: rotate(45deg);
  }
  .lp-btn:hover .lp-arrow { width: 26px; }

  /* ══ REVEAL ANIMATIONS ══ */
  .lp-reveal {
    opacity: 0; transform: translateY(28px);
    transition: opacity .9s ease, transform .9s cubic-bezier(.2,.8,.2,1);
  }
  .lp-reveal.lp-in { opacity: 1; transform: none; }
  .lp-stagger > * {
    opacity: 0; transform: translateY(20px);
    transition: opacity .8s ease, transform .8s cubic-bezier(.2,.8,.2,1);
  }
  .lp-stagger.lp-in > * { opacity: 1; transform: none; }
  .lp-stagger.lp-in > *:nth-child(1) { transition-delay: .06s; }
  .lp-stagger.lp-in > *:nth-child(2) { transition-delay: .13s; }
  .lp-stagger.lp-in > *:nth-child(3) { transition-delay: .20s; }
  .lp-stagger.lp-in > *:nth-child(4) { transition-delay: .27s; }
  .lp-stagger.lp-in > *:nth-child(5) { transition-delay: .34s; }
  .lp-stagger.lp-in > *:nth-child(6) { transition-delay: .41s; }

  /* ══ SHARED SECTION HEAD ══ */
  .lp-section-head {
    display: grid; grid-template-columns: 1.4fr 1fr;
    gap: 80px; align-items: end; margin-bottom: 72px;
  }
  @media (max-width: 900px) {
    .lp-section-head { grid-template-columns: 1fr; gap: 28px; margin-bottom: 48px; }
  }

  /* ══ MARQUEE KEYFRAME ══ */
  @keyframes lp-marquee { to { transform: translateX(-50%); } }
  .lp-marquee-track { animation: lp-marquee 40s linear infinite; }

  /* ══ STICKY CTA PULSE ══ */
  @keyframes lp-pulse-dot {
    0%, 100% { box-shadow: 0 0 0 4px rgba(111,207,142,.25); }
    50%       { box-shadow: 0 0 0 8px rgba(111,207,142,.05); }
  }
`

export default function LandingPage() {
  const { cms } = useCMS()
  const cmsContact      = cms.contact      || {}
  const cmsMarquee      = Array.isArray(cms.marquee)      ? cms.marquee      : null
  const cmsTestimonials = Array.isArray(cms.testimonials) ? cms.testimonials : null
  const cmsFaq          = Array.isArray(cms.faq)          ? cms.faq          : null

  useEffect(() => {
    // Inject global LP CSS
    if (!document.getElementById('lp-global')) {
      const style = document.createElement('style')
      style.id = 'lp-global'
      style.textContent = LP_CSS
      document.head.appendChild(style)
    }

    // Scroll reveal with requestAnimationFrame to ensure DOM is painted
    const setupReveal = () => {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('lp-in')
            obs.unobserve(e.target)
          }
        })
      }, { threshold: 0.06, rootMargin: '0px 0px -32px 0px' })

      document.querySelectorAll('.lp-reveal, .lp-stagger').forEach(t => obs.observe(t))
      return obs
    }

    const obs = setupReveal()

    return () => {
      document.getElementById('lp-global')?.remove()
      obs.disconnect()
    }
  }, [])

  return (
    <div className="lp-root">
      <NavBar cmsContact={cmsContact} />
      <HeroSection cmsContact={cmsContact} />
      <MarqueeSection items={cmsMarquee} />
      <AboutSection />
      <ServicesSection />
      <GallerySection />
      <TestimonialsSection items={cmsTestimonials} />
      <ContactSection cmsContact={cmsContact} />
      <FaqSection items={cmsFaq} />
      <LocationSection cmsContact={cmsContact} />
      <FooterSection cmsContact={cmsContact} />
      <StickyCTA cmsContact={cmsContact} />
    </div>
  )
}
