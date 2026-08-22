import React, { useState, useEffect } from 'react'
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  // Met à jour la variable CSS globale pour que tous les headers fixes se décalent sous la bannière
  const updateBannerOffset = (visible) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--pwa-banner-offset', visible ? '52px' : '0px')
    }
  }

  useEffect(() => {
    // 1. Vérifier si l'application est déjà en mode autonome (PWA installée / standalone)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      (document.referrer && document.referrer.includes('android-app://'))

    if (isStandalone) {
      setIsInstalled(true)
      setIsVisible(false)
      updateBannerOffset(false)
      return
    }

    // 2. Détecter si l'appareil est sous iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // 3. Gestion du rappel intelligent (24 heures après fermeture manuelle)
    const dismissedUntil = localStorage.getItem('mang_pwa_dismissed_until')
    const now = Date.now()
    if (dismissedUntil && now < parseInt(dismissedUntil, 10)) {
      setIsVisible(false)
      updateBannerOffset(false)
    } else {
      setIsVisible(true)
      updateBannerOffset(true)
    }

    // 4. Écouteur de l'événement PWA natif
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!dismissedUntil || now > parseInt(dismissedUntil, 10)) {
        setIsVisible(true)
        updateBannerOffset(true)
      }
    }

    // 5. Événement après installation réussie
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsVisible(false)
      updateBannerOffset(false)
      setDeferredPrompt(null)
      localStorage.removeItem('mang_pwa_dismissed_until')
      toast.success('MANG a été installé avec succès sur votre appareil ! 🌿', {
        duration: 10000,
        icon: '📲',
      })
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    if (window.__mangDeferredPrompt) {
      setDeferredPrompt(window.__mangDeferredPrompt)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Déclencher l'installation
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice
        if (choiceResult.outcome === 'accepted') {
          setIsVisible(false)
          updateBannerOffset(false)
          setDeferredPrompt(null)
        }
      } catch (err) {
        console.error('Erreur prompt PWA:', err)
      }
    } else {
      setShowIOSModal(true)
    }
  }

  // Fermeture manuelle par l'utilisateur
  const handleDismiss = () => {
    setIsVisible(false)
    updateBannerOffset(false)
    const expiry = Date.now() + 24 * 60 * 60 * 1000 // 24h
    localStorage.setItem('mang_pwa_dismissed_until', expiry.toString())
  }

  if (!isVisible || isInstalled) return null

  return (
    <>
      {/* ── BANNIÈRE EN HAUT (FIXÉE À TOP:0, Z-[99999], PERSISTANTE SANS DISPARITION) ── */}
      <aside
        role="region"
        aria-label="Installation de l'application MANG"
        className="pwa-install-top-banner fixed top-0 left-0 right-0 h-[52px] z-[99999] bg-[#003d00] text-white border-b-2 border-gold-400 shadow-2xl flex items-center"
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo animé & Textes */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <img
                src="/logo-mang.png"
                alt="MANG"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-0.5 shadow-md object-contain border border-gold-400"
              />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white shadow animate-pulse">
                1
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-white tracking-tight truncate">
                  Installer l'application MANG
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gold-400 text-primary-950 shadow-sm animate-pulse">
                  <Sparkles size={11} className="fill-primary-950" /> 100% GRATUIT
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200 truncate font-medium">
                Accès direct 1-clic, commandes & mode hors-ligne
              </p>
            </div>
          </div>

          {/* Bouton d'action Installer avec Glow Lumineux & Bouton Fermer */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="relative group inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 hover:from-gold-300 hover:to-gold-500 text-primary-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all duration-200 active:scale-95 cursor-pointer ring-2 ring-gold-300 ring-offset-1 ring-offset-primary-950"
            >
              <Download size={15} className="stroke-[3] text-primary-950 animate-bounce-gentle" />
              <span className="tracking-wider">INSTALLER</span>
            </button>

            <button
              onClick={handleDismiss}
              aria-label="Fermer la bannière"
              className="p-1.5 text-emerald-200/80 hover:text-white hover:bg-emerald-800/80 rounded-lg transition-colors cursor-pointer"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>

        </div>
      </aside>

      {/* ── MODAL D'INSTRUCTIONS (iOS Safari / Navigateurs) ── */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-dark-900 shadow-2xl relative border border-primary-100 animate-slideUp">
            
            {/* Bouton fermeture */}
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 text-dark-400 hover:text-dark-900 rounded-full hover:bg-surface-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* En-tête */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo-mang.png"
                alt="Logo MANG"
                className="w-12 h-12 rounded-2xl bg-primary-50 p-1.5 border border-primary-200 object-contain shadow-sm"
              />
              <div>
                <h3 className="font-display font-bold text-base text-primary-900 leading-tight">
                  Installer l'application MANG
                </h3>
                <p className="text-xs text-dark-500 font-semibold">Marché Agricole Nouvelle Génération</p>
              </div>
            </div>

            {/* Étapes */}
            <div className="space-y-3.5 my-5 bg-surface-50 p-4 rounded-2xl border border-surface-200">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3 text-xs text-dark-700">
                    <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5 shadow-sm">
                      1
                    </div>
                    <div>
                      Appuyez sur le bouton <strong>Partager</strong> <Share size={14} className="inline mx-1 text-primary-600" /> en bas de l'écran Safari.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs text-dark-700">
                    <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5 shadow-sm">
                      2
                    </div>
                    <div>
                      Faites défiler vers le bas et sélectionnez <strong>« Sur l'écran d'accueil »</strong> <PlusSquare size={14} className="inline mx-1 text-primary-600" />.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs text-dark-700">
                    <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5 shadow-sm">
                      3
                    </div>
                    <div>
                      Appuyez sur <strong>Ajouter</strong> en haut à droite. C'est fait ! ✨
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 text-xs text-dark-700">
                    <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5 shadow-sm">
                      1
                    </div>
                    <div>
                      Ouvrez le menu de votre navigateur <span className="font-bold text-sm">⋮</span> (en haut à droite).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs text-dark-700">
                    <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5 shadow-sm">
                      2
                    </div>
                    <div>
                      Appuyez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs text-dark-700">
                    <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5 shadow-sm">
                      3
                    </div>
                    <div>
                      Validez pour installer MANG instantanément sur votre appareil ! 🌿
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-98"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </>
  )
}
