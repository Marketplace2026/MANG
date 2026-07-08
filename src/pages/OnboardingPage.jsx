import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ArrowRight, ArrowLeft, ShieldCheck, Check } from 'lucide-react'
import { clsx } from 'clsx'

const BENIN_CITIES = [
  'Cotonou (Littoral)',
  'Porto-Novo (Ouémé)',
  'Abomey-Calavi (Atlantique)',
  'Parakou (Borgou)',
  'Bohicon (Zou)',
  'Djougou (Donga)',
  'Natitingou (Atacora)',
  'Ouidah (Atlantique)',
  'Kandi (Alibori)',
  'Lokossa (Mono)',
  'Save (Collines)',
  'Grand-Popo (Mono)'
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1, 2, 3
  const [role, setRole] = useState('') // 'vendeur' | 'acheteur'
  const [location, setLocation] = useState('')
  const [animating, setAnimating] = useState(false)

  // Gérer les transitions d'écran fluides
  const handleNextStep = (nextStep) => {
    setAnimating(true)
    setTimeout(() => {
      setStep(nextStep)
      setAnimating(false)
    }, 250)
  }

  const handleFinish = () => {
    // Sauvegarder les choix dans localStorage
    localStorage.setItem('mang_onboarding_role', role)
    localStorage.setItem('mang_onboarding_location', location)
    localStorage.setItem('mang_slides_seen', '1')
    
    // Rediriger vers l'inscription en passant les choix d'onboarding
    navigate('/inscription', { state: { role, location } })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-[480px] mx-auto relative overflow-hidden font-sans shadow-2xl">
      {/* Arrière-plan stylé */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-20%] w-72 h-72 rounded-full bg-green-500/10 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 rounded-full bg-green-600/10 blur-[80px]" />
      </div>

      {/* Bouton retour (si étape > 1) */}
      <div className="h-16 px-4 flex items-center justify-between z-10 relative">
        {step > 1 ? (
          <button 
            onClick={() => handleNextStep(step - 1)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
        ) : <div />}
        
        {step < 3 && (
          <button 
            onClick={() => handleNextStep(3)}
            className="text-sm font-semibold text-slate-500 hover:text-green-600 px-3 py-1.5"
          >
            Passer
          </button>
        )}
      </div>

      {/* Contenu avec animations */}
      <div className={clsx(
        "flex-1 px-6 flex flex-col justify-center transition-all duration-200 z-10 relative",
        animating ? "opacity-0 translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
      )}>
        
        {/* ========================================== */}
        {/* ÉCRAN 1 : BIENVENUE MANG */}
        {/* ========================================== */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
              <img 
                src="/logo-mang.png" 
                alt="MANG" 
                className="w-36 h-36 relative z-10 drop-shadow-xl"
              />
            </div>
            
            <div className="space-y-3">
              <span className="text-[11px] font-black tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase">
                Plateforme Officielle Bénin 🇧🇯
              </span>
              <h1 className="text-2xl font-black text-slate-800 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                MARCHÉ AGRICOLE<br/>
                <span className="text-green-600">NOUVELLE GÉNÉRATION</span>
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto">
                Achetez et vendez des produits agricoles directement, sans aucun intermédiaire.
              </p>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* ÉCRAN 2 : POUR QUI ? */}
        {/* ========================================== */}
        {step === 2 && (
          <div className="flex flex-col space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Quel est votre profil ?
              </h2>
              <p className="text-slate-500 text-xs">
                Choisissez votre rôle principal sur l'application.
              </p>
            </div>

            <div className="space-y-4">
              {/* Carte Vendeur */}
              <button 
                onClick={() => setRole('vendeur')}
                className={clsx(
                  "w-full p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all duration-300 bg-white",
                  role === 'vendeur' 
                    ? "border-green-600 shadow-lg shadow-green-600/5 bg-green-50/10 translate-y-[-2px]" 
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl flex-shrink-0">
                  🌾
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 text-base">Je suis Vendeur</p>
                    {role === 'vendeur' && <Check className="w-5 h-5 text-green-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Je souhaite créer ma boutique gratuite en ligne pour vendre mes récoltes, élevages ou intrants directement aux acheteurs.
                  </p>
                </div>
              </button>

              {/* Carte Acheteur */}
              <button 
                onClick={() => setRole('acheteur')}
                className={clsx(
                  "w-full p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all duration-300 bg-white",
                  role === 'acheteur' 
                    ? "border-green-600 shadow-lg shadow-green-600/5 bg-green-50/10 translate-y-[-2px]" 
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">
                  🛒
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 text-base">Je suis Acheteur</p>
                    {role === 'acheteur' && <Check className="w-5 h-5 text-green-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Je souhaite commander des produits agricoles frais et locaux au meilleur prix directement auprès des producteurs.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* ÉCRAN 3 : LOCALISATION + FIN */}
        {/* ========================================== */}
        {step === 3 && (
          <div className="flex flex-col space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <MapPin className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Trouvez des produits près de chez vous
              </h2>
              <p className="text-slate-500 text-xs">
                Sélectionnez votre ville ou département de résidence au Bénin.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-xl focus:border-green-600 focus:outline-none transition-colors text-sm text-slate-700 font-medium appearance-none"
                >
                  <option value="" disabled>Sélectionner votre ville...</option>
                  {BENIN_CITIES.map((city, idx) => (
                    <option key={idx} value={city}>{city}</option>
                  ))}
                </select>
                <MapPin className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none border-l border-slate-200 pl-3">
                  <span className="text-[10px] text-slate-400">▼</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Barre d'action inférieure */}
      <div className="p-6 bg-white border-t border-slate-100 z-10 relative space-y-4">
        {step === 1 && (
          <button
            onClick={() => handleNextStep(2)}
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-600/20"
          >
            Commencer
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {step === 2 && (
          <button
            onClick={() => handleNextStep(3)}
            disabled={!role}
            className={clsx(
              "w-full h-14 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg",
              role 
                ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {step === 3 && (
          <button
            onClick={handleFinish}
            disabled={!location}
            className={clsx(
              "w-full h-14 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg",
              location 
                ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            Accéder au Marketplace
          </button>
        )}

        {/* Témoin de progression épuré */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={clsx(
                "h-1.5 rounded-full transition-all duration-300",
                s === step ? "w-8 bg-green-600" : "w-1.5 bg-slate-200"
              )}
            />
          ))}
        </div>

        {/* Mentions de confiance bas de page */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-50">
          <span className="flex items-center gap-0.5"><ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Sécurisé</span>
          <span>•</span>
          <span>Bénin 🇧🇯</span>
          <span>•</span>
          <span>100% Gratuit</span>
        </div>
      </div>
    </div>
  )
}
