import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Home, ShoppingCart, User, LayoutGrid, Package, Wallet, Store, Globe, X, ChevronRight, Heart, Gift, MessageCircle, Bell
} from 'lucide-react'
import { useAuthStore, useNotificationsStore, useMessagesStore } from '@/store'
import { useCartStore } from '@/store/useCartStore'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { icon: Home,          label: 'Accueil',      path: '/marketplace'   },
  { icon: LayoutGrid,    label: 'Catégories',   path: '/marketplace',  state: { openCategories: true } },
  { icon: MessageCircle, label: 'Messages',     path: '/messages'      },
  { icon: ShoppingCart,  label: 'Panier',       path: '/panier'        },
  { icon: User,          label: 'Mon MANG',     path: '/profil'        },
]



export default function AppLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, profile }  = useAuthStore()
  const { unreadCount, fetchNotifications, subscribeToNotifications } = useNotificationsStore()
  const { unreadCount: unreadMessages, fetchUnreadCount, subscribeToUnread } = useMessagesStore()
  const cartItems = useCartStore(state => state.items)
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const isProductPage = location.pathname.startsWith('/produit/')

  useEffect(() => {
    if (!user) return
    fetchNotifications(user.id)
    fetchUnreadCount(user.id)
    const unsubNotif = subscribeToNotifications(user.id)
    const unsubMsg = subscribeToUnread(user.id)
    return () => {
      if (typeof unsubNotif === 'function') unsubNotif()
      if (typeof unsubMsg === 'function') unsubMsg()
    }
  }, [user])

  const handleNav = (item) => {
    if (!item.path) return
    navigate(item.path, { state: item.state })
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-50">
      {/* HEADER DESKTOP */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-surface-200 z-30 hidden md:flex items-center justify-between px-6">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/marketplace')}>
          <img src="/logo-mang.png" className="w-9 h-9 hover:scale-110 active:scale-95 transition-transform duration-200" />
          <span className="font-display font-bold text-primary-700 text-lg">MANG</span>
        </div>

        {/* Barre d'outils droite */}
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/messages')} className="relative p-2 text-dark-600 hover:text-primary-600 transition-colors">
            <MessageCircle size={20}/>
            {unreadMessages > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center px-1">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </button>
          
          <button onClick={() => navigate('/panier')} className="relative p-2 text-dark-600 hover:text-primary-600 transition-colors">
            <ShoppingCart size={20}/>
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center px-1">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          <button onClick={() => navigate('/favoris')} className="p-2 text-dark-600 hover:text-primary-600 transition-colors">
            <Heart size={20}/>
          </button>

          <button
            onClick={() => navigate('/vendeur')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Store size={16}/>
            <span>Espace Vendeur</span>
          </button>

          <button onClick={() => navigate('/profil')} className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm border border-primary-200">
            {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
          </button>
        </div>
      </header>

      <main className="flex-1 safe-pb md:pt-16">
        <div className="mx-auto w-full max-w-[var(--content-max-width)]">
          <Outlet />
        </div>
      </main>

      {/* ── BARRE NAV BAS ── */}
      {!isProductPage && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-lg border-t border-surface-200/50 md:hidden"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.04), 0 -1px 0 rgba(0,0,0,0.02)',
          }}
        >
        <div className="mx-auto max-w-[var(--content-max-width)] flex items-center justify-around h-16 px-4">
          {NAV_ITEMS.map((item, idx) => {
            let isActive = false
            if (item.label === 'Catégories') {
              isActive = location.pathname === '/marketplace' && (!!location.state?.openCategories || location.search.includes('cat=true'))
            } else if (item.label === 'Accueil') {
              isActive = location.pathname === '/marketplace' && !location.state?.openCategories && !location.search.includes('cat=true')
            } else {
              isActive = item.path && location.pathname.startsWith(item.path)
            }

            const Icon     = item.icon

            return (
              <button
                key={idx}
                onClick={() => {
                  if (item.label === 'Catégories') {
                    navigate('/marketplace', { state: { openCategories: true } })
                  } else {
                    handleNav(item)
                  }
                }}
                className="flex-1 flex flex-col items-center justify-center py-1 relative focus:outline-none"
              >
                {/* Icône avec fond actif de type capsule */}
                <div className="relative flex items-center justify-center px-4 py-1.5 rounded-full transition-all duration-300">
                  <div
                    className={clsx(
                      'absolute inset-0 rounded-full transition-all duration-300 ease-out -z-10',
                      isActive ? 'bg-primary-50 scale-100 opacity-100' : 'bg-transparent scale-50 opacity-0'
                    )}
                  />
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={clsx(
                      'transition-transform duration-300',
                      isActive ? 'text-primary-600 scale-110' : 'text-dark-500/60 hover:text-dark-900'
                    )}
                  />
                  
                  {/* Badge Messages */}
                  {item.path === '/messages' && unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1 border-2 border-white shadow-sm animate-pulse">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                  
                  {/* Badge Panier */}
                  {item.path === '/panier' && cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1 border-2 border-white shadow-sm animate-pulse">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={clsx(
                    'text-[10px] font-bold tracking-wide mt-1 transition-all duration-300',
                    isActive ? 'text-primary-700 scale-105' : 'text-dark-500/50'
                  )}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
