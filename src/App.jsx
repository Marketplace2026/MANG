import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store'
import { useGoogleReferral } from '@/hooks/useGoogleReferral'

import AppLayout          from '@/components/layout/AppLayout'
import AuthLayout         from '@/components/layout/AuthLayout'

import MarketplacePage from '@/pages/MarketplacePage'
import MessagesPage    from '@/pages/MessagesPage'
import WalletPage      from '@/pages/WalletPage'
import VendorPage      from '@/pages/VendorPage'
import CommunityPage   from '@/pages/CommunityPage'

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

// ── ErrorBoundary pour capturer les erreurs de rendu React ─────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL REACT RENDER ERROR:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Erreur d'Affichage Détectée</h1>
          <p className="text-gray-300 text-sm max-w-md mb-4">
            {this.state.error?.toString() || 'Une erreur inattendue est survenue.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl active:scale-95"
            >
              Recharger la Page
            </button>
            <a
              href="/test-blank"
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-amber-400 font-bold rounded-xl"
            >
              Test OK Page
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Page d'isolation TestBlank.jsx (Mission 3) ──────────────────────────
function TestBlankPage() {
  return (
    <div className="min-h-screen bg-[#004D00] text-white p-8 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl mb-4 border border-white/20">
        🌿
      </div>
      <h1 className="font-display font-black text-4xl text-amber-400 mb-2">TEST OK</h1>
      <p className="text-emerald-100 text-sm max-w-sm mb-6">
        Le framework de rendu core MANG v2.3.4 est 100% opérationnel !
      </p>
      <a
        href="/marketplace"
        className="px-6 py-3 bg-amber-400 text-emerald-950 font-black rounded-2xl shadow-lg active:scale-95 transition-transform"
      >
        Aller au Marketplace →
      </a>
    </div>
  )
}

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

// ── Loader discret pour navigation secondaire ──────────────
function PageLoader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-orange-500 animate-pulse" />
  )
}

// ── Route racine intelligente ─────────────────────────────
function RootRoute() {
  const { user, loading } = useAuthStore()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/marketplace" replace />
  return <Navigate to="/accueil" replace />
}

// ── Route privée ──────────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/accueil" replace />
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
  const { initialize, loading } = useAuthStore()
  const [splashDone, setSplashDone] = useState(false)

  useGoogleReferral() // Traite le parrainage après retour OAuth Google

  useEffect(() => { initialize() }, [])

  // Montrer le splash au moins 2.5s avant de router
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 2500)
    return () => clearTimeout(t)
  }, [])

  // Pendant le chargement initial OU splash pas fini → splash
  if (loading || !splashDone) return <SplashScreen />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* Page d'isolation TestBlank */}
            <Route path="/test-blank" element={<TestBlankPage />} />

            {/* Racine → logique splash */}
            <Route path="/" element={<RootRoute />} />

            {/* Onboarding — non connecté seulement */}
            <Route path="/accueil" element={
              <PublicRoute><OnboardingPage /></PublicRoute>
            } />

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

            {/* App protégée */}
            <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
              <Route path="/marketplace"   element={<MarketplacePage />} />
              <Route path="/commandes"     element={<OrdersPage />} />
              <Route path="/portefeuille"  element={<WalletPage />} />
              <Route path="/favoris"       element={<FavoritesPage />} />
              <Route path="/profil"        element={<ProfilePage />} />
              <Route path="/vendeur"       element={<VendorPage />} />
              <Route path="/messages"      element={<MessagesPage />} />
              <Route path="/communaute"    element={<CommunityPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/parrainage"         element={<ReferralPage />} />
              <Route path="/profil/:username" element={<PublicProfilePage />} />
              <Route path="/admin/verifications" element={<AdminVerificationPage />} />
              <Route path="/produit/:id"   element={<ProductDetailPage />} />
              <Route path="/panier"        element={<CartPage />} />
              <Route path="/checkout"      element={<CheckoutPage />} />
              <Route path="/parametres"    element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Suspense>

        <Toaster position="top-center" toastOptions={{
          duration: 3500,
          style: {
            background: '#1f2937', color: '#f9fafb', borderRadius: '14px',
            fontSize: '14px', fontFamily: 'Nunito, sans-serif',
            fontWeight: '600', padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          },
          success: { iconTheme: { primary: '#004D00', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}/>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
