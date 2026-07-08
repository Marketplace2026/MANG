import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { ShieldCheck, Truck, Percent, CheckCircle, ArrowRight, Store } from 'lucide-react'

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

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1) // 1 or 2
  const [tIdx, setTIdx] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTIdx(i => (i + 1) % TESTIMONIALS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const handleNextPage = () => {
    setAnimating(true)
    setTimeout(() => {
      setPage(2)
      setAnimating(false)
      window.scrollTo(0, 0)
    }, 250)
  }

  const handleStart = () => {
    localStorage.setItem('mang_slides_seen', '1')
    navigate('/inscription')
  }

  const testimonial = TESTIMONIALS[tIdx]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-dark-900 max-w-[480px] mx-auto relative overflow-hidden font-sans shadow-2xl flex flex-col justify-between">
      
      {/* Éléments de fond décoratifs identiques à LoginPage/AuthLayout */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary-600/5 blur-3xl" />
      </div>

      {/* Contenu principal */}
      <div className={clsx(
        "flex-1 transition-all duration-200 z-10 pb-20",
        animating ? "opacity-0 translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
      )}>
        
        {/* ========================================== */}
        {/* PAGE 1 : DÉCOUVRIR LE MARCHÉ AGRICOLE */}
        {/* ========================================== */}
        {page === 1 && (
          <div className="flex flex-col">
            {/* Hero */}
            <div className="text-center px-6 pt-12 pb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}>
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                <span className="text-white text-xs font-bold tracking-widest uppercase">🌍 Marketplace Agricole Bénin</span>
              </div>

              {/* Logo panier carré parfait, agrandi de 40%, bien centré avec espace */}
              <div className="flex justify-center my-10">
                <img 
                  src="/logo-mang.png" 
                  alt="MANG" 
                  className="w-56 h-56 object-contain drop-shadow-2xl mx-auto p-4" 
                />
              </div>

              <h1 className="font-black text-white mb-2"
                style={{ fontSize: '3.2rem', fontFamily: 'Poppins, sans-serif', lineHeight: 1, letterSpacing: '-2px' }}>
                MANG
              </h1>
              <p className="text-white/80 text-xs tracking-[0.3em] uppercase mb-5 font-bold">
                Marché Agricole Nouvelle Génération
              </p>
              <p className="text-white text-sm font-semibold leading-relaxed max-w-xs mx-auto">
                La plateforme qui connecte{' '}
                <strong className="text-white underline">producteurs</strong> et{' '}
                <strong className="text-yellow-300 underline">acheteurs</strong>{' '}
                agricoles directement, sans intermédiaires.
              </p>
            </div>

            {/* Stats */}
            <div className="px-5 mb-6">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: '10K+', l: 'Producteurs', e: '👨‍🌾' },
                  { v: '50K+', l: 'Produits',    e: '🌽'   },
                  { v: '24/7', l: 'Disponible',  e: '⚡'   },
                  { v: '100%', l: 'Sécurisé',    e: '🔒'   },
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center py-3.5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-lg mb-1">{s.e}</span>
                    <p className="text-white font-black text-base leading-none">{s.v}</p>
                    <p className="text-white/85 text-[8px] font-extrabold uppercase tracking-wider mt-1">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="px-5 mb-6">
              <p className="text-white/90 text-[10px] font-black tracking-widest uppercase mb-3.5 text-center">Tout ce dont vous avez besoin</p>
              <div className="grid grid-cols-2 gap-2">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-xl flex-shrink-0">{f.icon}</span>
                    <div>
                      <p className="text-white font-bold text-xs leading-tight">{f.title}</p>
                      <p className="text-white/80 text-[10px] mt-0.5 font-medium leading-tight">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Témoignage */}
            <div className="px-5 mb-6">
              <div className="p-4 rounded-2xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="text-3xl font-black opacity-20 absolute top-1 left-3 text-white">"</div>
                <p className="text-white text-xs leading-relaxed pl-3 mb-3 italic min-h-[3rem] font-medium">{testimonial.text}</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-xs">{testimonial.name}</p>
                    <p className="text-white/70 text-[10px] font-semibold">{testimonial.role}</p>
                  </div>
                  <div className="text-yellow-300 text-[10px]">{'⭐'.repeat(testimonial.stars)}</div>
                </div>
                <div className="flex justify-center gap-1 mt-3">
                  {TESTIMONIALS.map((_, i) => (
                    <div key={i} className="rounded-full transition-all duration-300"
                      style={{ width: i === tIdx ? 16 : 5, height: 5, background: i === tIdx ? '#ffffff' : 'rgba(255,255,255,0.2)' }}/>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PAGE 2 : POURQUOI REJOINDRE LA RÉVOLUTION */}
        {/* ========================================== */}
        {page === 2 && (
          <div className="flex flex-col px-6 pt-10 space-y-5">
            
            {/* Header */}
            <div className="text-center space-y-3">
              {/* Logo panier carré parfait, agrandi de 40%, bien centré avec espace */}
              <div className="flex justify-center my-8">
                <img 
                  src="/logo-mang.png" 
                  alt="MANG" 
                  className="w-48 h-48 object-contain drop-shadow-2xl mx-auto p-3" 
                />
              </div>
              <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Pourquoi choisir MANG ?
              </h2>
              <p className="text-white/90 text-xs leading-relaxed max-w-[280px] mx-auto">
                Découvrez comment nous réinventons le commerce agricole au Bénin.
              </p>
            </div>

            {/* Convincing Cards */}
            <div className="space-y-3 pt-2">
              
              {/* Card 1: Commission */}
              <div className="flex gap-3.5 p-4 rounded-xl bg-white/5 border border-white/15">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Percent className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">0% Commission, Zéro Intermédiaires</h3>
                  <p className="text-white/80 text-[10px] mt-0.5 leading-relaxed">
                    Les acheteurs bénéficient du juste prix de la ferme et les agriculteurs récoltent 100% de leur gain de vente sans aucun frais intermédiaire.
                  </p>
                </div>
              </div>

              {/* Card 2: Escrow */}
              <div className="flex gap-3.5 p-4 rounded-xl bg-white/5 border border-white/15">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Paiements Escrow MTN / Moov / Celtis</h3>
                  <p className="text-white/80 text-[10px] mt-0.5 leading-relaxed">
                    Achetez en toute confiance. L'argent est bloqué en toute sécurité et transféré au vendeur uniquement après confirmation de la livraison physique des marchandises.
                  </p>
                </div>
              </div>

              {/* Card 3: Logistics */}
              <div className="flex gap-3.5 p-4 rounded-xl bg-white/5 border border-white/15">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Réseau de Transporteurs Partenaires</h3>
                  <p className="text-white/80 text-[10px] mt-0.5 leading-relaxed">
                    Une logistique optimisée et locale pour livrer vos sacs de maïs, paniers de tomates et fruits directement dans votre boutique ou chez vous.
                  </p>
                </div>
              </div>

              {/* Card 4: Community */}
              <div className="flex gap-3.5 p-4 rounded-xl bg-white/5 border border-white/15">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Boutique & Avis Vérifiés</h3>
                  <p className="text-white/80 text-[10px] mt-0.5 leading-relaxed">
                    Consultez les évaluations d'autres acheteurs et trouvez les producteurs les plus sérieux et de confiance dans votre département.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Callout */}
            <div className="pt-1 pb-4 text-center">
              <p className="text-yellow-300 font-extrabold text-[10px] tracking-wider uppercase flex items-center justify-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-yellow-300" /> Rejoignez des milliers d'agriculteurs béninois
              </p>
            </div>

          </div>
        )}

      </div>

      {/* Barre fixe en bas compactée de 50% */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-6px_25px_rgba(0,0,0,0.12)] px-6 py-2 flex flex-col justify-center max-w-[480px] mx-auto rounded-t-xl">
        {page === 1 ? (
          <button 
            onClick={handleNextPage}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-black rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
            style={{ height: '48px', fontSize: '16px' }}
          >
            Continuer
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        ) : (
          <button 
            onClick={handleStart}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-black rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
            style={{ height: '48px', fontSize: '16px' }}
          >
            Commencer
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Témoin de progression */}
        <div className="flex justify-center gap-1.5 mt-2">
          <div className={clsx("h-1 rounded-full transition-all duration-300", page === 1 ? "w-6 bg-green-700" : "w-1 bg-slate-200")} />
          <div className={clsx("h-1 rounded-full transition-all duration-300", page === 2 ? "w-6 bg-green-700" : "w-1 bg-slate-200")} />
        </div>
      </div>

    </div>
  )
}
