import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster, ToastBar, toast } from 'react-hot-toast'
import { useAuthStore, useNotificationsStore } from '@/store'
import { useGoogleReferral } from '@/hooks/useGoogleReferral'
import { useVendorCopilotResponder } from '@/hooks/useVendorCopilotResponder'

import AppLayout          from '@/components/layout/AppLayout'
import AuthLayout         from '@/components/layout/AuthLayout'
import PWAInstallBanner   from '@/components/ui/PWAInstallBanner'

import MarketplacePage from '@/pages/MarketplacePage'
const MessagesPage    = lazy(() => import('@/pages/MessagesPage'))
const VendorPage      = lazy(() => import('@/pages/VendorPage'))
const WalletPage      = lazy(() => import('@/pages/WalletPage'))
const CommunityPage   = lazy(() => import('@/pages/CommunityPage'))

const OnboardingPage     = lazy(() => import('@/pages/OnboardingPage'))
const LoginPage          = lazy(() => import('@/pages/LoginPage'))
const RegisterPage       = lazy(() => import('@/pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('@/pages/ResetPasswordPage'))
const CheckoutPage       = lazy(() => import('@/pages/CheckoutPage'))
const ShopPublicPage     = lazy(() => import('@/pages/ShopPublicPage'))
const ProfilePage        = lazy(() => import('@/pages/ProfilePage'))
const OrdersPage         = lazy(() => import('@/pages/OrdersPage'))
const NotificationsPage  = lazy(() => import('@/pages/NotificationsPage'))
const FavoritesPage      = lazy(() => import('@/pages/FavoritesPage'))
const PublicProfilePage  = lazy(() => import('@/pages/PublicProfilePage'))
const ReferralPage       = lazy(() => import('@/pages/ReferralPage'))
const AdminVerificationPage = lazy(() => import('@/pages/AdminVerificationPage'))
const ProductDetailPage  = lazy(() => import('@/pages/ProductDetailPage'))
const CartPage           = lazy(() => import('@/pages/CartPage'))
const SettingsPage       = lazy(() => import('@/pages/SettingsPage'))


// ── Splash screen (photo existante - initial boot uniquement) ──
function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-primary-900 flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <img src="/logo-mang.png" className="w-40 h-40 mx-auto mb-4" />
        <h1 className="font-display text-3xl text-white font-bold">MANG</h1>
        <p className="text-primary-300 text-sm mt-1">Marché Agricole Nouvelle Génération</p>
      </div>
      <div className="flex gap-1 mt-4">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-gold-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}/>
        ))}
      </div>
    </div>
  )
}

// ── Écran de verrouillage pour utilisateur banni ──────────
function BannedScreen({ profile }) {
  const { signOut } = useAuthStore()
  return (
    <div className="fixed inset-0 z-50 bg-dark-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-6 shadow-2xl">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      </div>
      <h1 className="text-2xl font-black text-white tracking-tight">Compte Suspendu</h1>
      <p className="text-sm text-red-200/80 mt-2 max-w-sm">
        Votre compte MANG a été suspendu par l'administration pour non-respect des règles de la plateforme.
      </p>

      {profile?.ban_reason && (
        <div className="p-3.5 bg-red-950/60 border border-red-800/40 rounded-2xl text-xs text-red-300 mt-4 max-w-sm text-left">
          <strong>Motif :</strong> {profile.ban_reason}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        <a
          href="https://wa.me/22997000000?text=Bonjour%20Support%20MANG%2C%20mon%20compte%20a%20%C3%A9t%C3%A9%20suspendu."
          target="_blank"
          rel="noreferrer"
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
        >
          Contacter le support MANG
        </a>
        <button
          onClick={() => signOut()}
          className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs transition-transform active:scale-95"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

// ── Loader discret pour navigation secondaire ──────────────
function PageLoader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-orange-500 animate-pulse" />
  )
}

// ── Route racine intelligente ─────────────────────────────
function RootRoute() {
  const { user, loading, isGuest } = useAuthStore()
  if (loading) return <PageLoader />
  if (user || isGuest) return <Navigate to="/marketplace" replace />
  return <Navigate to="/accueil" replace />
}

// ── Route privée (autorisée aux connectés et invités en lecture) ─
function PrivateRoute({ children }) {
  const { user, loading, isGuest } = useAuthStore()
  if (loading) return <PageLoader />
  if (!user && !isGuest) return <Navigate to="/accueil" replace />
  return children
}

// ── Route strictement connectée (Interdite aux invités) ───
function StrictAuthRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/connexion" replace />
  return children
}

// ── Route publique (login/register) ──────────────────────
function PublicRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/marketplace" replace />
  return children
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const { initialize, loading, profile, user } = useAuthStore()
  const [splashDone, setSplashDone] = useState(false)

  useGoogleReferral() // Traite le parrainage après retour OAuth Google
  useVendorCopilotResponder() // Répondeur Copilote IA Vendeur 24/7 en arrière-plan

  useEffect(() => {
    initialize()
    const safetyTimer = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        console.warn('[App] Timeout d\'initialisation d\'auth, déblocage')
        useAuthStore.setState({ loading: false })
      }
    }, 3500)
    return () => clearTimeout(safetyTimer)
  }, [])

  useEffect(() => {
    if (profile?.language) {
      import('@/i18n').then(m => m.default.changeLanguage(profile.language))
    }
  }, [profile?.language])

  // Synchronisation temps réel des notifications pour l'utilisateur connecté
  useEffect(() => {
    if (!user?.id) return
    const notifStore = useNotificationsStore.getState()
    notifStore.fetchNotifications(user.id)
    const unsubscribe = notifStore.subscribeToNotifications(user.id)
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [user?.id])

  // Dissoudre le splash screen dès que l'auth est prête (cold-start instantané)
  useEffect(() => {
    if (!loading) setSplashDone(true)
  }, [loading])

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1000)
    return () => clearTimeout(t)
  }, [])

  // Pendant le chargement initial OU splash pas fini → splash
  if (loading || !splashDone) return <SplashScreen />

  // Si le compte de l'utilisateur est banni / suspendu par l'administration
  if (user && profile?.is_banned) {
    return <BannedScreen profile={profile} />
  }

  return (
    <BrowserRouter>
      {/* Bannière de notification d'installation PWA persistante en haut */}
      <PWAInstallBanner />

      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* Racine → logique splash */}
          <Route path="/" element={<RootRoute />} />

          {/* Onboarding — non connecté seulement */}
          <Route path="/accueil" element={<PublicRoute><OnboardingPage /></PublicRoute>} />

          {/* Boutique publique (sans auth) */}
          <Route path="/boutique/:slug" element={<ShopPublicPage />} />

          {/* Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/connexion"
              element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/inscription"
              element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/mot-de-passe-oublie"
              element={<ForgotPasswordPage />} />
            <Route path="/reinitialiser-mot-de-passe"
              element={<ResetPasswordPage />} />
          </Route>

          {/* App principale (Accessible aux connectés et invités en lecture seule) */}
          <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route path="/marketplace"   element={<MarketplacePage />} />
            <Route path="/communaute"    element={<CommunityPage />} />
            <Route path="/produit/:id"   element={<ProductDetailPage />} />
            <Route path="/profil/:username" element={<PublicProfilePage />} />
            <Route path="/profile/:username" element={<PublicProfilePage />} />

            {/* Routes exigeant une connexion stricte (non accessibles aux invités) */}
            <Route path="/commandes"     element={<StrictAuthRoute><OrdersPage /></StrictAuthRoute>} />
            <Route path="/portefeuille"  element={<StrictAuthRoute><WalletPage /></StrictAuthRoute>} />
            <Route path="/favoris"       element={<StrictAuthRoute><FavoritesPage /></StrictAuthRoute>} />
            <Route path="/profil"        element={<StrictAuthRoute><ProfilePage /></StrictAuthRoute>} />
            <Route path="/vendeur"       element={<StrictAuthRoute><VendorPage /></StrictAuthRoute>} />
            <Route path="/messages"      element={<StrictAuthRoute><MessagesPage /></StrictAuthRoute>} />
            <Route path="/notifications" element={<StrictAuthRoute><NotificationsPage /></StrictAuthRoute>} />
            <Route path="/parrainage"    element={<StrictAuthRoute><ReferralPage /></StrictAuthRoute>} />
            <Route path="/admin"         element={<Navigate to="/admin/verifications" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/admin/verifications" replace />} />
            <Route path="/admin/verifications" element={<StrictAuthRoute><AdminVerificationPage /></StrictAuthRoute>} />
            <Route path="/panier"        element={<StrictAuthRoute><CartPage /></StrictAuthRoute>} />
            <Route path="/checkout"      element={<StrictAuthRoute><CheckoutPage /></StrictAuthRoute>} />
            <Route path="/parametres"    element={<StrictAuthRoute><SettingsPage /></StrictAuthRoute>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>

      <Toaster 
        position="top-center" 
        gutter={8} 
        containerStyle={{ top: 56 }} 
        toastOptions={{
          duration: 2500,
          style: {
            background: '#111827',
            color: '#f9fafb',
            borderRadius: '16px',
            fontSize: '13.5px',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: '600',
            padding: '10px 16px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '390px',
            cursor: 'pointer',
          },
          success: { 
            duration: 2200, 
            iconTheme: { primary: '#10b981', secondary: '#ffffff' } 
          },
          error: { 
            duration: 3500, 
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' } 
          },
        }}
      >
        {(t) => (
          <div 
            onClick={() => toast.dismiss(t.id)} 
            className="cursor-pointer active:scale-95 transition-transform"
            title="Cliquer pour fermer"
          >
            <ToastBar toast={t} />
          </div>
        )}
      </Toaster>
    </BrowserRouter>
  )
}
