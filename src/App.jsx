import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store'

import AppLayout          from '@/components/layout/AppLayout'
import AuthLayout         from '@/components/layout/AuthLayout'
import LoginPage          from '@/pages/LoginPage'
import RegisterPage       from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage  from '@/pages/ResetPasswordPage'
import MarketplacePage    from '@/pages/MarketplacePage'
import ShopPublicPage     from '@/pages/ShopPublicPage'
import ProfilePage        from '@/pages/ProfilePage'
import OrdersPage         from '@/pages/OrdersPage'
import WalletPage         from '@/pages/WalletPage'
import CommunityPage      from '@/pages/CommunityPage'
import VendorPage         from '@/pages/VendorPage'
import MessagesPage       from '@/pages/MessagesPage'
import NotificationsPage  from '@/pages/NotificationsPage'

function SplashScreen() {
  return (
    <div className="min-h-screen bg-primary-900 flex flex-col items-center justify-center gap-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gold-400 flex items-center justify-center mb-4 mx-auto shadow-gold animate-pulse">
          <span className="text-4xl">🌿</span>
        </div>
        <h1 className="font-display text-3xl text-white font-bold">MANG</h1>
        <p className="text-primary-300 text-sm mt-1">Marché Agricole Nouvelle Génération</p>
      </div>
      <div className="flex gap-1 mt-4">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-gold-400 animate-bounce"
            style={{animationDelay:`${i*0.15}s`}}/>
        ))}
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <SplashScreen />
  if (!user)   return <Navigate to="/connexion" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <SplashScreen />
  if (user)    return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { initialize, loading } = useAuthStore()
  useEffect(() => { initialize() }, [])
  if (loading) return <SplashScreen />

  return (
    <BrowserRouter>
      <Routes>
        {/* Boutique publique (sans auth) */}
        <Route path="/boutique/:slug" element={<ShopPublicPage />} />

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/connexion"                  element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/inscription"                element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/mot-de-passe-oublie"        element={<ForgotPasswordPage />} />
          <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
        </Route>

        {/* App protégée */}
        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index                      element={<MarketplacePage />} />
          <Route path="/commandes"          element={<OrdersPage />} />
          <Route path="/portefeuille"       element={<WalletPage />} />
          <Route path="/profil"             element={<ProfilePage />} />
          <Route path="/vendeur"            element={<VendorPage />} />
          <Route path="/messages"           element={<MessagesPage />} />
          <Route path="/communaute"         element={<CommunityPage />} />
          <Route path="/notifications"      element={<NotificationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster position="top-center" toastOptions={{
        duration: 3500,
        style: {
          background: '#1f2937', color: '#f9fafb', borderRadius: '14px',
          fontSize: '14px', fontFamily: 'Nunito, sans-serif',
          fontWeight: '600', padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        },
        success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}/>
    </BrowserRouter>
  )
}
