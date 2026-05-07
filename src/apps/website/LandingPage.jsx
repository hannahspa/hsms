import { useEffect } from 'react'
import HeroSection from './sections/HeroSection'
import ServicesSection from './sections/ServicesSection'
import AboutSection from './sections/AboutSection'
import GallerySection from './sections/GallerySection'
import TestimonialsSection from './sections/TestimonialsSection'
import ContactSection from './sections/ContactSection'
import FooterSection from './sections/FooterSection'

const LP_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600;700&display=swap');

  .lp-anim {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.65s cubic-bezier(0.22, 0.61, 0.36, 1),
                transform 0.65s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  .lp-anim.lp-visible { opacity: 1; transform: translateY(0); }

  @keyframes lp-hero-in {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .hero-animate {
    opacity: 0;
    animation: lp-hero-in 0.75s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  }
  @keyframes lp-fade-pulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.75; }
  }
`

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('lp-visible')
      }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.lp-anim').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{LP_CSS}</style>
      <main style={{ width: '100%', overflowX: 'hidden' }}>
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <GallerySection />
        <TestimonialsSection />
        <ContactSection />
        <FooterSection />
      </main>
    </>
  )
}
