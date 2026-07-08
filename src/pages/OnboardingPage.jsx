import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { ShieldCheck, Truck, Percent, Star, Users, ArrowRight, Store, CheckCircle } from 'lucide-react'

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
      // Scroll to top of the screen
      window.scrollTo(0, 0)
    }, 250)
  }

  const handleStart = () => {
    localStorage.setItem('mang_slides_seen', '1')
    navigate('/inscription')
  }

  const testimonial = TESTIMONIALS[tIdx]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 max-w-[480px] mx-auto relative overflow-hidden font-sans shadow-2xl flex flex-col justify-between">
      
      {/* Éléments de fond decoratifs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 inset-x-0 h-[45vh] opacity-20"
          style={{ background: 'radial-gradient(ellipse at 50% -10%, #ffffff, transparent)' }}/>
        <div className="absolute bottom-0 inset-x-0 h-48 opacity-12"
          style={{ background: 'radial-gradient(ellipse at 50% 110%, #ffffff, transparent)' }}/>
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }}/>
      </div>

      {/* Contenu principal */}
      <div className={clsx(
        "flex-1 transition-all duration-200 z-10 pb-28",
        animating ? "opacity-0 translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
      )}>
        
        {/* ========================================== */}
        {/* PAGE 1 : DÉCOUVRIR LE MARCHÉ AGRICOLE */}
        {/* ========================================== */}
        {page === 1 && (
          <div className="flex flex-col">
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
                <p className="text-white text-sm leading-relaxed pl-4 mb-4 italic min-h-[3.5rem] font-medium">{testimonial.text}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">{testimonial.name}</p>
                    <p className="text-white/70 text-xs font-semibold">{testimonial.role}</p>
                  </div>
                  <div className="text-yellow-300 text-xs">{'⭐'.repeat(testimonial.stars)}</div>
                </div>
                <div className="flex justify-center gap-1.5 mt-4">
                  {TESTIMONIALS.map((_, i) => (
                    <div key={i} className="rounded-full transition-all duration-300"
                      style={{ width: i === tIdx ? 20 : 6, height: 6, background: i === tIdx ? '#ffffff' : 'rgba(255,255,255,0.3)' }}/>
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
          <div className="flex flex-col px-6 pt-12 space-y-6">
            
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <img src="/logo-mang.png" alt="MANG" className="w-20 h-20 object-contain drop-shadow-xl" />
              </div>
              <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Pourquoi choisir MANG ?
              </h2>
              <p className="text-white/90 text-sm leading-relaxed max-w-[300px] mx-auto">
                Découvrez comment nous réinventons le commerce agricole au Bénin.
              </p>
            </div>

            {/* Convincing Cards */}
            <div className="space-y-4 pt-4">
              
              {/* Card 1: Commission */}
              <div className="flex gap-4 p-5 rounded-2xl bg-white/10 border border-white/20">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Percent className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">0% Commission, Zéro Intermédiaires</h3>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">
                    Les acheteurs bénéficient du juste prix de la ferme et les agriculteurs récoltent 100% de leur gain de vente sans aucun frais intermédiaire.
                  </p>
                </div>
              </div>

              {/* Card 2: Escrow */}
              <div className="flex gap-4 p-5 rounded-2xl bg-white/10 border border-white/20">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Paiements Escrow MTN / Moov / Celtis</h3>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">
                    Achetez en toute confiance. L'argent est bloqué en toute sécurité et transféré au vendeur uniquement après confirmation de la livraison physique des marchandises.
                  </p>
                </div>
              </div>

              {/* Card 3: Logistics */}
              <div className="flex gap-4 p-5 rounded-2xl bg-white/10 border border-white/20">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Réseau de Transporteurs Partenaires</h3>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">
                    Une logistique optimisée et locale pour livrer vos sacs de maïs, paniers de tomates et fruits directement dans votre boutique ou chez vous.
                  </p>
                </div>
              </div>

              {/* Card 4: Community */}
              <div className="flex gap-4 p-5 rounded-2xl bg-white/10 border border-white/20">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Boutique & Avis Vérifiés</h3>
                  <p className="text-white/80 text-xs mt-1 leading-relaxed">
                    Consultez les évaluations d'autres acheteurs et trouvez les producteurs les plus sérieux et de confiance dans votre département.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Callout */}
            <div className="pt-2 pb-6 text-center">
              <p className="text-yellow-300 font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-yellow-300" /> Rejoignez des milliers d'agriculteurs béninois
              </p>
            </div>

          </div>
        )}

      </div>

      {/* Barre fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] px-6 py-4 flex flex-col justify-center max-w-[480px] mx-auto rounded-t-2xl">
        {page === 1 ? (
          <button 
            onClick={handleNextPage}
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black text-base rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
          >
            Continuer
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button 
            onClick={handleStart}
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black text-base rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
          >
            Commencer
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Témoin de progression */}
        <div className="flex justify-center gap-2 mt-3">
          <div className={clsx("h-1.5 rounded-full transition-all duration-300", page === 1 ? "w-8 bg-green-600" : "w-1.5 bg-slate-200")} />
          <div className={clsx("h-1.5 rounded-full transition-all duration-300", page === 2 ? "w-8 bg-green-600" : "w-1.5 bg-slate-200")} />
        </div>
      </div>

    </div>
  )
}
