import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'

// ── Données des slides ─────────────────────────────────────
const SLIDES = [
  {
    id: 1,
    emoji: '🌍',
    tag: 'La marketplace agricole du Bénin',
    title: 'Le marché agricole\nde demain,\naujourd\'hui.',
    sub: 'Connectez producteurs et acheteurs sans intermédiaires. Vendez vos récoltes au juste prix.',
    bg: 'from-[#0a2e16] via-[#1a5c2e] to-[#2d8a29]',
    accent: '#2ECC71',
    particle: '🌱',
  },
  {
    id: 2,
    emoji: '🏪',
    tag: 'Boutiques & Produits',
    title: 'Votre boutique\nen ligne en\n2 minutes.',
    sub: 'Créez votre vitrine agricole, ajoutez vos produits et commencez à vendre immédiatement.',
    bg: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
    accent: '#f5a623',
    particle: '🌽',
  },
  {
    id: 3,
    emoji: '💰',
    tag: 'MANG Wallet',
    title: 'Payez &\nrecevez en\ntoute sécurité.',
    sub: 'Wallet intégré, transferts Mobile Money, escrow sécurisé et historique complet.',
    bg: 'from-[#1a0a2e] via-[#2d1b69] to-[#4a2c7a]',
    accent: '#FFD700',
    particle: '💳',
  },
  {
    id: 4,
    emoji: '🤝',
    tag: 'Communauté',
    title: 'Une\ncommunauté\nde confiance.',
    sub: 'Rejoignez des milliers d\'agriculteurs et acheteurs. Messagerie, avis, et réseau solidaire.',
    bg: 'from-[#0d2818] via-[#1b4332] to-[#2d6a4f]',
    accent: '#52b788',
    particle: '👨‍🌾',
  },
]

const STATS = [
  { value: '10K+', label: 'Producteurs', icon: '👨‍🌾' },
  { value: '50K+', label: 'Produits', icon: '🌽' },
  { value: '24/7', label: 'Disponible', icon: '⚡' },
  { value: '100%', label: 'Sécurisé', icon: '🔒' },
]

const FEATURES = [
  { icon: '🏪', title: 'Boutique gratuite', desc: 'Créez votre vitrine en quelques minutes' },
  { icon: '🚀', title: 'Vente rapide', desc: 'Vos produits visibles instantanément' },
  { icon: '💬', title: 'Chat intégré', desc: 'Discutez directement avec les acheteurs' },
  { icon: '🛡️', title: 'Paiement sécurisé', desc: 'Escrow et Mobile Money protégés' },
  { icon: '📊', title: 'Dashboard vendeur', desc: 'Suivez vos ventes en temps réel' },
  { icon: '🌍', title: 'Livraison', desc: 'Option livraison à domicile intégrée' },
]

// ── Composant particule flottante ─────────────────────────
function FloatingParticle({ emoji, style }) {
  return (
    <span className="absolute text-2xl pointer-events-none select-none" style={{
      ...style,
      animation: `floatUp ${3 + Math.random() * 4}s ease-in-out infinite`,
      animationDelay: `${Math.random() * 3}s`,
    }}>
      {emoji}
    </span>
  )
}

// ── Page principale ────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0=splash, 1=slides, 2=features
  const [slideIdx, setSlideIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  // Splash screen → slides
  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setStep(1), 2800)
    return () => clearTimeout(t)
  }, [])

  // Auto-advance slides
  useEffect(() => {
    if (step !== 1) return
    timerRef.current = setInterval(() => {
      nextSlide()
    }, 4000)
    return () => clearInterval(timerRef.current)
  }, [step, slideIdx])

  const nextSlide = () => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setSlideIdx(i => (i + 1) % SLIDES.length)
      setAnimating(false)
    }, 400)
  }

  const goToSlide = (i) => {
    if (i === slideIdx || animating) return
    clearInterval(timerRef.current)
    setAnimating(true)
    setTimeout(() => { setSlideIdx(i); setAnimating(false) }, 300)
  }

  const slide = SLIDES[slideIdx]

  // ── SPLASH SCREEN ──────────────────────────────────────
  if (step === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a2e16 0%, #1a5c2e 50%, #0a2e16 100%)' }}>
        
        {/* Cercles lumineux de fond */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #2ECC71, transparent)', filter: 'blur(40px)' }}/>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #f5a623, transparent)', filter: 'blur(30px)' }}/>
        </div>

        {/* Logo animé */}
        <div className={clsx('flex flex-col items-center transition-all duration-1000', visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75')}>
          
          {/* Icône */}
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #2ECC71, #1B8F3A)', boxShadow: '0 0 60px rgba(46,204,113,0.4)' }}>
              <span className="text-6xl" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🌿</span>
            </div>
            {/* Anneau pulsant */}
            <div className="absolute inset-0 rounded-[2rem] border-2 border-green-400 opacity-60"
              style={{ animation: 'pingRing 2s ease-out infinite' }}/>
            <div className="absolute inset-0 rounded-[2rem] border border-green-300 opacity-30"
              style={{ animation: 'pingRing 2s ease-out infinite', animationDelay: '0.5s' }}/>
          </div>

          {/* Nom */}
          <h1 className="text-white font-black text-6xl tracking-tight mb-1"
            style={{ fontFamily: 'Georgia, serif', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <span style={{ color: '#2ECC71' }}>M</span>
            <span style={{ color: '#f5a623' }}>A</span>
            <span style={{ color: '#2ECC71' }}>N</span>
            <span style={{ color: '#f5a623' }}>G</span>
          </h1>
          <p className="text-green-300 text-sm font-medium tracking-[0.2em] uppercase opacity-80">
            Marché Agricole Nouvelle Génération
          </p>

          {/* Barre de chargement */}
          <div className="mt-10 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-yellow-400 rounded-full"
              style={{ animation: 'loadBar 2.5s ease-in-out forwards' }}/>
          </div>
          <p className="text-white/40 text-xs mt-3 tracking-widest">CHARGEMENT...</p>
        </div>

        <style>{`
          @keyframes pingRing {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.4); opacity: 0; }
          }
          @keyframes loadBar {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    )
  }

  // ── SLIDES ONBOARDING ──────────────────────────────────
  if (step === 1) {
    return (
      <div className="fixed inset-0 overflow-hidden" style={{ fontFamily: 'Nunito, sans-serif' }}>
        
        {/* Fond dégradé animé */}
        <div className={clsx('absolute inset-0 bg-gradient-to-br transition-all duration-700', slide.bg)}/>

        {/* Particules flottantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <FloatingParticle key={i} emoji={slide.particle} style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 20}%`,
              opacity: 0.1 + (i % 3) * 0.05,
              fontSize: `${1.5 + (i % 2) * 0.8}rem`,
            }} />
          ))}
        </div>

        {/* Cercle décoratif bas droite */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${slide.accent}, transparent)`, filter: 'blur(40px)' }}/>
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-8"
          style={{ background: `radial-gradient(circle, ${slide.accent}, transparent)`, filter: 'blur(60px)' }}/>

        {/* Contenu principal */}
        <div className="relative h-full flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-14 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${slide.accent}20`, border: `1px solid ${slide.accent}40` }}>
                <span className="text-base">🌿</span>
              </div>
              <span className="text-white font-black text-lg tracking-tight">MANG</span>
            </div>
            <button onClick={() => setStep(2)}
              className="text-white/50 text-sm font-semibold px-4 py-2 rounded-full hover:text-white/80 transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              Passer →
            </button>
          </div>

          {/* Emoji central */}
          <div className={clsx('flex justify-center mt-6 transition-all duration-400', animating ? 'opacity-0 scale-90' : 'opacity-100 scale-100')}>
            <div className="relative">
              <div className="w-36 h-36 rounded-[2.5rem] flex items-center justify-center shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${slide.accent}30, ${slide.accent}10)`, border: `2px solid ${slide.accent}40`, backdropFilter: 'blur(10px)' }}>
                <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}>
                  {slide.emoji}
                </span>
              </div>
              {/* Badge tag */}
              <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: slide.accent, color: '#000', boxShadow: `0 4px 15px ${slide.accent}60` }}>
                {slide.id}/4
              </div>
            </div>
          </div>

          {/* Texte */}
          <div className={clsx('px-8 mt-8 flex-1 transition-all duration-400', animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0')}>
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: `${slide.accent}20`, border: `1px solid ${slide.accent}30` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: slide.accent }}/>
              <span className="text-xs font-bold tracking-wider uppercase" style={{ color: slide.accent }}>
                {slide.tag}
              </span>
            </div>

            {/* Titre */}
            <h2 className="text-white font-black leading-tight mb-4"
              style={{ fontSize: '2.4rem', fontFamily: 'Georgia, serif', whiteSpace: 'pre-line', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
              {slide.title}
            </h2>

            {/* Description */}
            <p className="text-white/70 text-base leading-relaxed">
              {slide.sub}
            </p>
          </div>

          {/* Indicateurs + bouton */}
          <div className="px-8 pb-12">
            {/* Dots */}
            <div className="flex items-center gap-2 mb-8">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => goToSlide(i)}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: i === slideIdx ? 32 : 8,
                    height: 8,
                    background: i === slideIdx ? slide.accent : 'rgba(255,255,255,0.25)',
                  }}/>
              ))}
            </div>

            {/* Bouton suivant ou démarrer */}
            {slideIdx < SLIDES.length - 1 ? (
              <button onClick={nextSlide}
                className="w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all active:scale-95"
                style={{ background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}cc)`, color: '#000', boxShadow: `0 8px 30px ${slide.accent}50` }}>
                Suivant →
              </button>
            ) : (
              <button onClick={() => setStep(2)}
                className="w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all active:scale-95"
                style={{ background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}cc)`, color: '#000', boxShadow: `0 8px 30px ${slide.accent}50` }}>
                Découvrir MANG 🚀
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes floatUp {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(10deg); }
          }
        `}</style>
      </div>
    )
  }

  // ── PAGE FINALE — DÉMARRER ─────────────────────────────
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ fontFamily: 'Nunito, sans-serif', background: 'linear-gradient(180deg, #0a2e16 0%, #051a0c 100%)' }}>

      {/* Fond décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-96 opacity-30"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, #2ECC71, transparent)' }}/>
        <div className="absolute bottom-0 left-0 right-0 h-64 opacity-20"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, #f5a623, transparent)' }}/>
      </div>

      <div className="relative min-h-full flex flex-col pb-10">

        {/* ── HERO ── */}
        <div className="text-center px-6 pt-16 pb-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)' }}>
            <span className="text-green-400 text-xs font-bold tracking-widest uppercase">🌍 Marketplace Agricole #1</span>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-5">
            <div className="w-24 h-24 rounded-[1.8rem] flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #2ECC71, #1B8F3A)', boxShadow: '0 0 80px rgba(46,204,113,0.3)' }}>
              <span style={{ fontSize: '3.5rem' }}>🌿</span>
            </div>
          </div>

          <h1 className="font-black text-white mb-3"
            style={{ fontSize: '3.2rem', fontFamily: 'Georgia, serif', lineHeight: 1.1 }}>
            <span style={{ color: '#2ECC71' }}>M</span><span style={{ color: '#f5a623' }}>A</span><span style={{ color: '#2ECC71' }}>N</span><span style={{ color: '#f5a623' }}>G</span>
          </h1>
          <p className="text-white/60 text-sm tracking-[0.25em] uppercase mb-5">Marché Agricole Nouvelle Génération</p>

          <p className="text-white/80 text-base leading-relaxed max-w-xs mx-auto">
            La plateforme qui connecte <strong className="text-green-400">producteurs</strong> et <strong className="text-yellow-400">acheteurs</strong> agricoles directement, sans intermédiaires.
          </p>
        </div>

        {/* ── STATS ── */}
        <div className="px-5 mb-8">
          <div className="grid grid-cols-4 gap-2">
            {STATS.map((s, i) => (
              <div key={i} className="flex flex-col items-center py-4 rounded-2xl text-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xl mb-1">{s.icon}</span>
                <p className="text-white font-black text-lg leading-none">{s.value}</p>
                <p className="text-white/40 text-[10px] font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURES ── */}
        <div className="px-5 mb-8">
          <h2 className="text-white/50 text-xs font-bold tracking-widest uppercase mb-4 text-center">
            Tout ce dont vous avez besoin
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-2xl flex-shrink-0">{f.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{f.title}</p>
                  <p className="text-white/45 text-xs mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TÉMOIGNAGE ── */}
        <div className="px-5 mb-8">
          <div className="p-5 rounded-2xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(46,204,113,0.15), rgba(245,166,35,0.10))', border: '1px solid rgba(46,204,113,0.2)' }}>
            <div className="text-3xl mb-3 opacity-30 absolute top-3 left-4">"</div>
            <p className="text-white/80 text-sm leading-relaxed italic pl-4">
              Grâce à MANG, j'ai vendu toute ma récolte de maïs en 3 jours. Je gagne 40% de plus qu'avant.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ background: 'rgba(46,204,113,0.2)' }}>👨‍🌾</div>
              <div>
                <p className="text-green-400 font-bold text-sm">Kouassi Mensah</p>
                <p className="text-white/40 text-xs">Producteur · Parakou, Bénin</p>
              </div>
              <div className="ml-auto text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
            </div>
          </div>
        </div>

        {/* ── CTA FINAL ── */}
        <div className="px-5 mt-2">
          {/* Bouton principal */}
          <button
            onClick={() => navigate('/inscription')}
            className="w-full py-4 rounded-2xl text-base font-black tracking-wide mb-3 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #2ECC71, #1B8F3A)', color: 'white', boxShadow: '0 8px 40px rgba(46,204,113,0.4)' }}>
            🚀 Créer mon compte gratuitement
          </button>

          {/* Bouton secondaire */}
          <button
            onClick={() => navigate('/connexion')}
            className="w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
            J'ai déjà un compte → Se connecter
          </button>

          <p className="text-center text-white/25 text-xs mt-5">
            En continuant, vous acceptez nos Conditions d'utilisation
          </p>
        </div>
      </div>
    </div>
  )
}
