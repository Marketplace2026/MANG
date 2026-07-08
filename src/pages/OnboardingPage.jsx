import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'

const SLIDES = [
  {
    id: 1, emoji: '🌍',
    tag: 'Marketplace Agricole #1 au Bénin',
    title: 'Le marché agricole\nde demain,\naujourd\'hui.',
    sub: 'Connectez producteurs et acheteurs sans intermédiaires. Vendez vos récoltes au juste prix.',
    bg: ['#16a34a', '#15803d', '#166534'],
    accent: '#ffffff',
    particles: ['🌱', '🌿', '🍃'],
    stat: { v: '10K+', l: 'Producteurs' },
  },
  {
    id: 2, emoji: '🏪',
    tag: 'Boutique en ligne gratuite',
    title: 'Votre boutique\nen ligne en\n2 minutes.',
    sub: 'Créez votre vitrine agricole, ajoutez vos produits et vendez à des milliers d\'acheteurs.',
    bg: ['#16a34a', '#15803d', '#166534'],
    accent: '#f5a623',
    particles: ['🌽', '🥭', '🍅'],
    stat: { v: '50K+', l: 'Produits' },
  },
  {
    id: 3, emoji: '💰',
    tag: 'MANG Wallet sécurisé',
    title: 'Payez &\nrecevez en\ntoute sécurité.',
    sub: 'Wallet intégré, Mobile Money (MTN, Moov, Celtis), escrow intelligent et historique complet.',
    bg: ['#16a34a', '#15803d', '#166534'],
    accent: '#FFD700',
    particles: ['💳', '💵', '🪙'],
    stat: { v: '100%', l: 'Sécurisé' },
  },
  {
    id: 4, emoji: '🤝',
    tag: 'Communauté solidaire',
    title: 'Une communauté\nde confiance\nvous attend.',
    sub: 'Rejoignez des milliers d\'agriculteurs et acheteurs. Chat, avis vérifiés, réseau solidaire.',
    bg: ['#16a34a', '#15803d', '#166534'],
    accent: '#ffffff',
    particles: ['👨‍🌾', '🐄', '🐔'],
    stat: { v: '24/7', l: 'Support' },
  },
]

const TESTIMONIALS = [
  { text: 'Grâce à MANG, j\'ai vendu toute ma récolte de maïs en 3 jours. Je gagne 40% de plus !', name: 'Kouassi Mensah', role: 'Producteur · Parakou', avatar: '👨‍🌾', stars: 5 },
  { text: 'Je trouve tous les légumes frais directement des fermiers. Qualité incroyable, prix imbattables.', name: 'Aïcha Dossou', role: 'Restauratrice · Cotonou', avatar: '👩‍🍳', stars: 5 },
  { text: 'MANG a transformé mon business. Ma boutique attire des clients de tout le Bénin !', name: 'Théodore Gbèdo', role: 'Éleveur · Abomey', avatar: '🧑‍🌾', stars: 5 },
]

const FEATURES = [
  { icon: '🏪', title: 'Boutique gratuite', desc: 'Créez votre vitrine en 2 min' },
  { icon: '💰', title: 'MANG Wallet', desc: 'Mobile Money intégré' },
  { icon: '💬', title: 'Chat temps réel', desc: 'Avec acheteurs et vendeurs' },
  { icon: '🛡️', title: 'Escrow sécurisé', desc: 'Argent protégé jusqu\'à livraison' },
  { icon: '📊', title: 'Dashboard vendeur', desc: 'Suivez vos ventes en direct' },
  { icon: '🚚', title: 'Livraison intégrée', desc: 'Option livraison à domicile' },
]

function useSwipe(onLeft, onRight) {
  const sx = useRef(null)
  return {
    onTouchStart: e => { sx.current = e.touches[0].clientX },
    onTouchEnd: e => {
      if (!sx.current) return
      const d = sx.current - e.changedTouches[0].clientX
      if (Math.abs(d) > 50) d > 0 ? onLeft() : onRight()
      sx.current = null
    }
  }
}

// ── SLIDES ────────────────────────────────────────────────
function SlidesScreen({ onDone }) {
  const [idx, setIdx] = useState(0)
  const [anim, setAnim] = useState(false)
  const [dir, setDir] = useState(1)
  const timer = useRef(null)
  const slide = SLIDES[idx]

  const go = (next, d = 1) => {
    if (anim) return
    clearInterval(timer.current)
    setDir(d); setAnim(true)
    setTimeout(() => { setIdx(next); setAnim(false) }, 320)
  }

  const next = () => idx < SLIDES.length - 1 ? go(idx + 1, 1) : onDone()
  const prev = () => idx > 0 && go(idx - 1, -1)

  useEffect(() => {
    timer.current = setInterval(() => {
      if (idx < SLIDES.length - 1) go(idx + 1, 1)
      else onDone()
    }, 5000)
    return () => clearInterval(timer.current)
  }, [idx])

  const swipe = useSwipe(next, prev)

  return (
    <div className="fixed inset-0 overflow-hidden select-none" {...swipe}>
      {/* Fond Vert Premium */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800 transition-all duration-700" />

      {/* Grille */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }}/>

      {/* Lueurs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${slide.accent}20, transparent)`, filter: 'blur(60px)' }}/>
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${slide.accent}15, transparent)`, filter: 'blur(50px)' }}/>

      {/* Particules */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {slide.particles.map((p, i) => (
          <span key={`${idx}-${i}`} className="absolute"
            style={{
              left: `${12 + i * 32}%`, top: `${20 + (i % 2) * 22}%`,
              opacity: 0.07 + i * 0.02, fontSize: `${1.6 + i * 0.5}rem`,
              animation: `floatP ${4 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}>
            {p}
          </span>
        ))}
      </div>

      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-14 pb-2 z-10">
          <div className="flex items-center gap-2">
            <img src="/logo-mang.png" alt="MANG" className="w-9 h-9 object-contain drop-shadow" />
            <span className="text-white font-black text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>MANG</span>
          </div>
          <button onClick={onDone}
            className="text-white font-bold text-sm px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            Passer
          </button>
        </div>

        {/* Illustration */}
        <div className={clsx('flex justify-center mt-8 transition-all duration-320 z-10',
          anim ? (dir > 0 ? 'opacity-0 -translate-x-8 scale-90' : 'opacity-0 translate-x-8 scale-90') : 'opacity-100 translate-x-0 scale-100')}>
          <div className="relative">
            <div className="w-44 h-44 rounded-[3rem] flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))`,
                border: `1.5px solid rgba(255,255,255,0.25)`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 30px 80px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}>
              <span style={{ fontSize: '6rem', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))' }}>
                {slide.emoji}
              </span>
            </div>
            {/* Stat badge */}
            <div className="absolute -bottom-4 -right-4 px-4 py-2 rounded-2xl text-center bg-white"
              style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.15)` }}>
              <p className="text-green-700 font-black text-xl leading-none">{slide.stat.v}</p>
              <p className="text-green-900/60 text-[10px] font-bold mt-0.5">{slide.stat.l}</p>
            </div>
          </div>
        </div>

        {/* Texte */}
        <div className={clsx('px-7 mt-10 flex-1 transition-all duration-320 z-10',
          anim ? 'opacity-0 translate-y-5' : 'opacity-100 translate-y-0')}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: `rgba(255,255,255,0.15)`, border: `1px solid rgba(255,255,255,0.25)` }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white"/>
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-white">
              {slide.tag}
            </span>
          </div>
          <h2 className="text-white font-black leading-[1.08] mb-4"
            style={{ fontSize: '2.4rem', fontFamily: 'Poppins, sans-serif', whiteSpace: 'pre-line' }}>
            {slide.title}
          </h2>
          <p className="text-white/95 text-sm font-semibold leading-relaxed">{slide.sub}</p>
        </div>

        {/* Bottom */}
        <div className="px-7 pb-12 z-10">
          <div className="flex items-center gap-2 mb-7">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => i !== idx && go(i, i > idx ? 1 : -1)}
                className="rounded-full transition-all duration-300"
                style={{ width: i === idx ? 28 : 7, height: 7, background: i === idx ? '#ffffff' : 'rgba(255,255,255,0.3)' }}/>
            ))}
          </div>
          <button onClick={next}
            className="w-full py-4 rounded-2xl font-black text-base tracking-wide active:scale-95 transition-all bg-white text-green-700 shadow-lg shadow-black/10"
          >
            {idx < SLIDES.length - 1 ? 'Suivant →' : 'Découvrir MANG 🚀'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes floatP { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-18px) rotate(5deg); } }
      `}</style>
    </div>
  )
}

// ── LANDING ───────────────────────────────────────────────
function LandingScreen() {
  const navigate = useNavigate()
  const [tIdx, setTIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTIdx(i => (i + 1) % TESTIMONIALS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const t = TESTIMONIALS[tIdx]

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-br from-green-600 to-green-800">

      {/* Déco fond */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[45vh] opacity-20"
          style={{ background: 'radial-gradient(ellipse at 50% -10%, #ffffff, transparent)' }}/>
        <div className="absolute bottom-0 inset-x-0 h-48 opacity-12"
          style={{ background: 'radial-gradient(ellipse at 50% 110%, #ffffff, transparent)' }}/>
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }}/>
      </div>

      <div className="relative min-h-full flex flex-col pb-12 z-10">
        {/* Hero */}
        <div className="text-center px-6 pt-14 pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-7"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
            <span className="text-white text-xs font-bold tracking-widest uppercase">🌍 Marketplace Agricole Bénin</span>
          </div>

          <div className="flex justify-center mb-6">
            <img src="/logo-mang.png" alt="MANG" className="w-24 h-24 object-contain drop-shadow-2xl" />
          </div>

          <h1 className="font-black text-white mb-2"
            style={{ fontSize: '3.5rem', fontFamily: 'Poppins, sans-serif', lineHeight: 1, letterSpacing: '-2px' }}>
            MANG
          </h1>
          <p className="text-white/80 text-xs tracking-[0.3em] uppercase mb-6 font-bold">
            Marché Agricole Nouvelle Génération
          </p>
          <p className="text-white text-base font-semibold leading-relaxed max-w-xs mx-auto">
            La plateforme qui connecte{' '}
            <strong className="text-white underline">producteurs</strong> et{' '}
            <strong className="text-yellow-300 underline">acheteurs</strong>{' '}
            agricoles directement, sans intermédiaires.
          </p>
        </div>

        {/* Stats */}
        <div className="px-5 mb-7">
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: '10K+', l: 'Producteurs', e: '👨‍🌾' },
              { v: '50K+', l: 'Produits',    e: '🌽'   },
              { v: '24/7', l: 'Disponible',  e: '⚡'   },
              { v: '100%', l: 'Sécurisé',    e: '🔒'   },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center py-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span className="text-xl mb-1.5">{s.e}</span>
                <p className="text-white font-black text-lg leading-none">{s.v}</p>
                <p className="text-white/80 text-[9px] font-extrabold uppercase tracking-wider mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="px-5 mb-7">
          <p className="text-white/90 text-[10px] font-black tracking-widest uppercase mb-4 text-center">Tout ce dont vous avez besoin</p>
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span className="text-2xl flex-shrink-0">{f.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{f.title}</p>
                  <p className="text-white/80 text-xs mt-0.5 font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Témoignage */}
        <div className="px-5 mb-8">
          <div className="p-5 rounded-2xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div className="text-4xl font-black opacity-20 absolute top-2 left-4 text-white">"</div>
            <p className="text-white text-sm leading-relaxed pl-4 mb-4 italic min-h-[3.5rem] font-medium">{t.text}</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                {t.avatar}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">{t.name}</p>
                <p className="text-white/70 text-xs font-semibold">{t.role}</p>
              </div>
              <div className="text-yellow-300 text-xs">{'⭐'.repeat(t.stars)}</div>
            </div>
            <div className="flex justify-center gap-1.5 mt-4">
              {TESTIMONIALS.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{ width: i === tIdx ? 20 : 6, height: 6, background: i === tIdx ? '#ffffff' : 'rgba(255,255,255,0.3)' }}/>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5">
          <button onClick={() => navigate('/inscription')}
            className="w-full py-4 rounded-2xl font-black text-base tracking-wide mb-3 active:scale-95 transition-all text-green-700 bg-white shadow-lg shadow-black/10">
            🚀 Créer mon compte gratuitement
          </button>
          <button onClick={() => navigate('/connexion')}
            className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all text-white"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            J'ai déjà un compte → Se connecter
          </button>
          <div className="flex items-center justify-center gap-5 mt-6">
            {['🔒 Sécurisé', '🇧🇯 Made in Bénin', '⭐ Gratuit'].map((b, i) => (
              <span key={i} className="text-white/70 text-[10px] font-bold">{b}</span>
            ))}
          </div>
          <p className="text-center text-white/50 text-[11px] mt-3 font-semibold">
            En continuant, vous acceptez nos Conditions d'utilisation.
          </p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function OnboardingPage() {
  const [screen, setScreen] = useState('slides')

  // Si déjà vu les slides → aller directement au landing
  useEffect(() => {
    const seen = localStorage.getItem('mang_slides_seen')
    if (seen) setScreen('landing')
  }, [])

  const handleSlidesDone = () => {
    localStorage.setItem('mang_slides_seen', '1')
    setScreen('landing')
  }

  if (screen === 'slides') return <SlidesScreen onDone={handleSlidesDone}/>
  return <LandingScreen/>
}
