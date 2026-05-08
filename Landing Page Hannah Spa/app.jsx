/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle */
const { useEffect: useEffectApp } = React;

const PALETTES = {
  earth:    { bg: '#F5F0E8', bgAlt: '#EAE2D3', bgDeep: '#1F1B17', ink: '#1F1B17', accent: '#A87E5C', accent2: '#D4B896', cream: '#FAF6EE', line: '#DCD2BF', sage: '#6B7A5A' },
  sage:     { bg: '#F1F1EB', bgAlt: '#E2E5DA', bgDeep: '#1B201A', ink: '#1B201A', accent: '#6B7A5A', accent2: '#B8B49A', cream: '#F8F8F2', line: '#D6D7C8', sage: '#6B7A5A' },
  noir:     { bg: '#F4F1EA', bgAlt: '#E6E0D2', bgDeep: '#0E0B08', ink: '#0E0B08', accent: '#B5915F', accent2: '#E0C896', cream: '#F8F4EB', line: '#D6CFBC', sage: '#6B7A5A' },
  blush:    { bg: '#FAF1EC', bgAlt: '#F1E0D5', bgDeep: '#241A18', ink: '#241A18', accent: '#C28774', accent2: '#E5C2B0', cream: '#FFF7F1', line: '#E7D7CA', sage: '#7A8970' },
};

const FONTS = {
  classic:  { serif: '"Cormorant Garamond", serif', display: '"Italiana", serif', sans: '"Inter", sans-serif' },
  modern:   { serif: '"Fraunces", serif',           display: '"DM Serif Display", serif', sans: '"Inter", sans-serif' },
  clean:    { serif: '"Inter", sans-serif',         display: '"Italiana", serif', sans: '"Inter", sans-serif' },
};

function App() {
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "palette": "earth",
    "fonts": "classic",
    "dark": false,
    "accent": "#A87E5C"
  }/*EDITMODE-END*/);

  useEffectApp(() => {
    const root = document.documentElement;
    const p = PALETTES[tweaks.palette] || PALETTES.earth;
    root.style.setProperty('--bg', p.bg);
    root.style.setProperty('--bg-alt', p.bgAlt);
    root.style.setProperty('--bg-deep', p.bgDeep);
    root.style.setProperty('--ink', p.ink);
    root.style.setProperty('--terracotta', tweaks.accent || p.accent);
    root.style.setProperty('--champagne', p.accent2);
    root.style.setProperty('--cream', p.cream);
    root.style.setProperty('--line', p.line);
    root.style.setProperty('--sage', p.sage);

    const f = FONTS[tweaks.fonts] || FONTS.classic;
    root.style.setProperty('--serif', f.serif);
    root.style.setProperty('--display', f.display);
    root.style.setProperty('--sans', f.sans);

    root.setAttribute('data-theme', tweaks.dark ? 'dark' : 'light');
  }, [tweaks]);

  // Reveal on scroll
  useEffectApp(() => {
    const els = document.querySelectorAll('.reveal, .reveal-stagger');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Nav tweaks={tweaks} setTweak={setTweak} />
      <main>
        <Hero />
        <Marquee />
        <Story />
        <Services />
        <Process />
        <Pricing />
        <Team />
        <Gallery />
        <Testimonials />
        <Booking />
        <Faq />
        <Location />
        <Newsletter />
      </main>
      <Footer />
      <StickyCTA />

      <TweaksPanel title="Tweaks · Hannah Spa">
        <TweakSection title="Bảng màu">
          <TweakRadio
            label="Palette"
            value={tweaks.palette}
            onChange={(v) => setTweak('palette', v)}
            options={[
              { label: 'Earth', value: 'earth' },
              { label: 'Sage', value: 'sage' },
              { label: 'Noir', value: 'noir' },
              { label: 'Blush', value: 'blush' },
            ]}
          />
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={(v) => setTweak('accent', v)}
            options={['#A87E5C', '#6B7A5A', '#B5915F', '#C28774', '#8B6F47']}
          />
        </TweakSection>
        <TweakSection title="Typography">
          <TweakRadio
            label="Cặp font"
            value={tweaks.fonts}
            onChange={(v) => setTweak('fonts', v)}
            options={[
              { label: 'Classic', value: 'classic' },
              { label: 'Modern', value: 'modern' },
              { label: 'Clean', value: 'clean' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Chế độ">
          <TweakToggle label="Dark mode" value={tweaks.dark} onChange={(v) => setTweak('dark', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
