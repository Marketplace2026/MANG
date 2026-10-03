import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  ShieldCheck, Truck, Percent, CheckCircle, ArrowRight,
  Store, Users, Package, Clock, Wallet, MessageCircle,
  BarChart3, Star, LogIn, UserPlus
} from 'lucide-react'

const TESTIMONIALS = [
  { text: "Grâce à MANG, j'ai vendu toute ma récolte de maïs en 3 jours. Je gagne 40% de plus !", name: 'Kouassi Mensah', role: 'Producteur · Parakou', initial: 'K', stars: 5 },
  { text: "Je trouve tous les légumes frais directement des fermiers. Qualité incroyable, prix imbattables.", name: 'Aïcha Dossou', role: 'Restauratrice · Cotonou', initial: 'A', stars: 5 },
  { text: "MANG a transformé mon business. Ma boutique attire des clients de tout le Bénin !", name: 'Théodore Gbèdo', role: 'Éleveur · Abomey', initial: 'T', stars: 5 },
]

const STATS = [
  { v: '10K+', l: 'Producteurs', icon: Users },
  { v: '50K+', l: 'Produits',    icon: Package },
  { v: '24/7', l: 'Disponible',  icon: Clock },
  { v: '100%', l: 'Sécurisé',    icon: ShieldCheck },
]

const FEATURES = [
  { icon: Store,         title: 'Boutique gratuite', desc: 'Créez votre vitrine en 2 min' },
  { icon: Wallet,        title: 'MANG Wallet',       desc: 'Mobile Money intégré' },
  { icon: MessageCircle, title: 'Chat temps réel',   desc: 'Avec acheteurs et vendeurs' },
  { icon: ShieldCheck,   title: 'Escrow sécurisé',   desc: 'Argent protégé jusqu\'à livraison' },
  { icon: BarChart3,     title: 'Dashboard vendeur', desc: 'Suivez vos ventes en direct' },
  { icon: Truck,         title: 'Livraison intégrée',desc: 'Option livraison à domicile' },
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
      
      {/* Éléments de fond décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary-600/5 blur-3xl" />
      </div>

      {/* Barre supérieure avec accès direct Connexion / Inscription */}
      <header className="relative z-20 flex items-center justify-between px-6 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <img src="/logo-mang.png" alt="MANG" className="w-8 h-8 object-contain" />
          <span className="text-white font-bold text-base tracking-wide font-display">MANG</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/connexion')}
            className="text-xs font-bold text-white/90 hover:text-white px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 transition active:scale-95 flex items-center gap-1.5"
          >
            <LogIn size={13} />
            <span>Connexion</span>
          </button>
          <button
            onClick={() => navigate('/inscription')}
            className="text-xs font-bold text-dark-900 bg-gold-400 hover:bg-gold-300 px-3.5 py-1.5 rounded-full transition active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus size={13} />
            <span>S'inscrire</span>
          </button>
        </div>
      </header>

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
            <div className="text-center px-6 pt-6 pb-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-2 bg-white/10 border border-white/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="text-white text-xs font-bold tracking-widest uppercase">Marketplace Agricole Bénin</span>
              </div>

              {/* Logo panier carré */}
              <div className="flex justify-center my-6">
                <img 
                  src="/logo-mang.png" 
                  alt="MANG" 
                  className="object-contain drop-shadow-2xl mx-auto w-44 h-44 hover:scale-105 transition-transform duration-300"
                />
              </div>

              <h1 className="font-black text-white mb-2 text-4xl sm:text-5xl font-display tracking-tight">
                MANG
              </h1>
              <p className="text-white/80 text-xs tracking-[0.25em] uppercase mb-4 font-bold">
                Marché Agricole Nouvelle Génération
              </p>
              <p className="text-white/90 text-sm font-medium leading-relaxed max-w-xs mx-auto">
                La plateforme qui connecte <strong className="text-white underline">producteurs</strong> et{' '}
                <strong className="text-gold-300 underline">acheteurs</strong> agricoles directement, sans intermédiaires.
              </p>
            </div>

            {/* Stats */}
            <div className="px-5 mb-5">
              <div className="grid grid-cols-4 gap-2">
                {STATS.map((s, i) => (
                  <div key={i} className="flex flex-col items-center py-3 px-1 rounded-2xl bg-white/5 border border-white/10">
                    <s.icon size={16} className="text-gold-400 mb-1" />
                    <p className="text-white font-black text-sm leading-none">{s.v}</p>
                    <p className="text-white/70 text-[8px] font-extrabold uppercase tracking-wider mt-1 text-center">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="px-5 mb-5">
              <p className="text-white/80 text-[10px] font-black tracking-widest uppercase mb-3 text-center">
                Tout ce dont vous avez besoin
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-gold-400">
                      <f.icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs leading-tight">{f.title}</p>
                      <p className="text-white/70 text-[10px] mt-0.5 font-medium leading-tight">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Témoignage */}
            <div className="px-5 mb-4">
              <div className="p-4 rounded-2xl relative overflow-hidden bg-white/5 border border-white/15">
                <p className="text-white/90 text-xs leading-relaxed mb-3 italic min-h-[2.5rem] font-medium">"{testimonial.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gold-400 text-dark-900 font-black flex items-center justify-center text-xs flex-shrink-0">
                      {testimonial.initial}
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs">{testimonial.name}</p>
                      <p className="text-white/60 text-[10px] font-semibold">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-gold-400">
                    {Array.from({ length: testimonial.stars }).map((_, si) => (
                      <Star key={si} size={11} className="fill-gold-400 text-gold-400" />
                    ))}
                  </div>
                </div>
                <div className="flex justify-center gap-1 mt-3">
                  {TESTIMONIALS.map((_, i) => (
                    <div key={i} className="rounded-full transition-all duration-300"
                      style={{ width: i === tIdx ? 16 : 5, height: 4, background: i === tIdx ? '#facc15' : 'rgba(255,255,255,0.2)' }}/>
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
          <div className="flex flex-col px-6 pt-6 space-y-4">
            
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center my-4">
                <img 
                  src="/logo-mang.png" 
                  alt="MANG" 
                  className="object-contain drop-shadow-2xl mx-auto w-32 h-32" 
                />
              </div>
              <h2 className="text-2xl font-black text-white font-display">
                Pourquoi choisir MANG ?
              </h2>
              <p className="text-white/80 text-xs leading-relaxed max-w-[280px] mx-auto">
                Découvrez comment nous réinventons le commerce agricole au Bénin.
              </p>
            </div>

            {/* Convincing Cards */}
            <div className="space-y-2.5 pt-1">
              
              {/* Card 1: Commission */}
              <div className="flex gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Percent className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">0% Commission, Zéro Intermédiaires</h3>
                  <p className="text-white/70 text-[10px] mt-0.5 leading-relaxed">
                    Les acheteurs bénéficient du juste prix de la ferme et les agriculteurs récoltent 100% de leur gain de vente sans aucun frais intermédiaire.
                  </p>
                </div>
              </div>

              {/* Card 2: Escrow */}
              <div className="flex gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Paiements Escrow MTN / Moov / Celtis</h3>
                  <p className="text-white/70 text-[10px] mt-0.5 leading-relaxed">
                    Achetez en toute confiance. L'argent est bloqué en toute sécurité et transféré au vendeur uniquement après confirmation de la livraison physique des marchandises.
                  </p>
                </div>
              </div>

              {/* Card 3: Logistics */}
              <div className="flex gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Réseau de Transporteurs Partenaires</h3>
                  <p className="text-white/70 text-[10px] mt-0.5 leading-relaxed">
                    Une logistique optimisée et locale pour livrer vos sacs de maïs, paniers de tomates et fruits directement dans votre boutique ou chez vous.
                  </p>
                </div>
              </div>

              {/* Card 4: Community */}
              <div className="flex gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Boutique & Avis Vérifiés</h3>
                  <p className="text-white/70 text-[10px] mt-0.5 leading-relaxed">
                    Consultez les évaluations d'autres acheteurs et trouvez les producteurs les plus sérieux et de confiance dans votre département.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Callout */}
            <div className="pt-1 pb-2 text-center">
              <p className="text-gold-300 font-extrabold text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-gold-400" /> Rejoignez des milliers d'agriculteurs béninois
              </p>
            </div>

          </div>
        )}

      </div>

      {/* Barre fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-6px_25px_rgba(0,0,0,0.15)] max-w-[480px] mx-auto rounded-t-2xl flex flex-col items-center justify-center py-3 px-5">
        {/* Témoin de progression */}
        <div className="flex justify-center gap-1.5 mb-2.5">
          <div className={clsx("h-1 rounded-full transition-all duration-300", page === 1 ? "w-6 bg-primary-700" : "w-2 bg-slate-200")} />
          <div className={clsx("h-1 rounded-full transition-all duration-300", page === 2 ? "w-6 bg-primary-700" : "w-2 bg-slate-200")} />
        </div>

        {page === 1 ? (
          <div className="w-full flex flex-col items-center gap-2">
            <button 
              onClick={handleNextPage}
              className="w-full h-11 bg-primary-700 hover:bg-primary-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-green text-sm"
            >
              <span>Continuer</span>
              <ArrowRight size={16} />
            </button>
            <p className="text-xs text-dark-500 font-medium">
              Déjà un compte ?{' '}
              <button onClick={() => navigate('/connexion')} className="text-primary-700 font-bold hover:underline">
                Se connecter
              </button>
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-2">
            <button 
              onClick={handleStart}
              className="w-full h-11 bg-primary-700 hover:bg-primary-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-green text-sm"
            >
              <span>Commencer maintenant</span>
              <ArrowRight size={16} />
            </button>
            <p className="text-xs text-dark-500 font-medium">
              Vous avez déjà un compte ?{' '}
              <button onClick={() => navigate('/connexion')} className="text-primary-700 font-bold hover:underline">
                Se connecter
              </button>
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
