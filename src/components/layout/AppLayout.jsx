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
  { icon: LayoutGrid,    label: 'Catégories',   path: '/marketplace'   },
  { icon: MessageCircle, label: 'Messages',     path: '/messages'      },
  { icon: ShoppingCart,  label: 'Panier',       path: '/panier'        },
  { icon: User,          label: 'Profil',       path: '/profil'        },
]



export default function AppLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuthStore()
  const { unreadCount, fetchNotifications, subscribeToNotifications } = useNotificationsStore()
  const { unreadCount: unreadMessages, fetchUnreadCount, subscribeToUnread } = useMessagesStore()
  const cartItems = useCartStore(state => state.items)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
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

  const handleNav = (path) => {
    if (!path) return
    navigate(path)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-50">
      <main className="flex-1 safe-pb">
        <div className="mx-auto w-full max-w-[var(--content-max-width)]">
          <Outlet />
        </div>
      </main>



      {/* ── BARRE NAV BAS ── */}
      {!isProductPage && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-lg border-t border-surface-200/50"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.04), 0 -1px 0 rgba(0,0,0,0.02)',
          }}
        >
        <div className="mx-auto max-w-[var(--content-max-width)] flex items-center justify-around h-16 px-4">
          {NAV_ITEMS.map((item, idx) => {
            const Icon     = item.icon
            const isActive = item.path && location.pathname.startsWith(item.path)

            return (
              <button
                key={idx}
                onClick={() => handleNav(item.path)}
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
