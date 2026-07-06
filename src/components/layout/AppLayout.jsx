import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Home, ShoppingCart, User, LayoutGrid, Package, Wallet, Store, Globe, X, ChevronRight, Heart, Gift, MessageCircle, Bell
} from 'lucide-react'
import { useAuthStore, useNotificationsStore, useCartStore } from '@/store'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { icon: Home,          label: 'Accueil',      path: '/marketplace'   },
  { icon: LayoutGrid,    label: 'Catégories',   path: '/marketplace'   },
  { icon: ShoppingCart,  label: 'Panier',       path: '/panier'        },
  { icon: User,          label: 'Profil',       path: '/profil'        },
]

const CENTER_MENU = [
  {
    icon: Store, label: 'Espace Vendeur', sub: 'Mes boutiques',
    path: '/vendeur', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700',
    border: 'border-emerald-100',
  },
  {
    icon: Package, label: 'Commandes', sub: 'Achats & ventes',
    path: '/commandes', iconBg: 'bg-orange-100', iconColor: 'text-orange-600',
    border: 'border-orange-100',
  },
  {
    icon: Wallet, label: 'Mon Wallet', sub: 'Portefeuille MANG',
    path: '/portefeuille', iconBg: 'bg-dark-800', iconColor: 'text-white',
    border: 'border-dark-200',
  },
  {
    icon: Heart, label: 'Mes Favoris', sub: 'Boutiques & produits',
    path: '/favoris', iconBg: 'bg-red-100', iconColor: 'text-red-500',
    border: 'border-red-100',
  },
  {
    icon: Globe, label: 'Communauté', sub: 'Publications & feed',
    path: '/communaute', iconBg: 'bg-violet-100', iconColor: 'text-violet-600',
    border: 'border-violet-100',
  },
  {
    icon: Gift, label: 'Parrainage', sub: 'Gagner des pièces',
    path: '/parrainage', iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
    border: 'border-amber-100',
  },
]

export default function AppLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuthStore()
  const { unreadCount, fetchNotifications, subscribeToNotifications } = useNotificationsStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const cartItems = useCartStore(state => state.items)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    if (!user) return
    fetchNotifications(user.id)
    const unsub = subscribeToNotifications(user.id)
    return unsub
  }, [user])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const handleNav = (path) => {
    if (!path) return
    navigate(path)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-50">
      <main className="flex-1 safe-pb">
        <div className="mx-auto w-full max-w-[var(--content-max-width)]">
          <Outlet />
        </div>
      </main>

      {/* ── OVERLAY + MENU GRILLE ── */}
      {menuOpen && (
        <>
          {/* Fond flou */}
          <div
            className="fixed inset-0 bg-black/55 z-40 backdrop-blur-sm"
            style={{ animation: 'fadeIn 0.2s ease' }}
            onClick={() => setMenuOpen(false)}
          />

          {/* Panel centré au dessus de la nav */}
          <div
            className="fixed left-4 right-4 z-50"
            style={{
              bottom: 'calc(72px + env(safe-area-inset-bottom) + 10px)',
              animation: 'slideUp 0.25s cubic-bezier(.32,.72,0,1)',
            }}
          >
            <div className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)' }}>

              {/* Titre */}
              <p className="text-center text-[10px] font-black text-dark-400/60 uppercase tracking-[0.2em] pt-4 pb-3">
                Accès rapide
              </p>

              {/* GRILLE 2 COLONNES */}
              <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                {CENTER_MENU.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={i}
                      onClick={() => handleNav(item.path)}
                      className={clsx(
                        'flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left',
                        'active:scale-95 transition-all duration-150 bg-surface-50',
                        item.border
                      )}
                    >
                      {/* Icône */}
                      <div className={clsx(
                        'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0',
                        item.iconBg
                      )}>
                        <Icon size={20} className={item.iconColor} strokeWidth={2}/>
                      </div>

                      {/* Texte */}
                      <div className="min-w-0 w-full">
                        <p className="font-black text-dark-800 text-sm leading-tight">{item.label}</p>
                        <p className="text-dark-400 text-[10px] font-medium mt-0.5">{item.sub}</p>
                      </div>

                      {/* Flèche */}
                      <ChevronRight
                        size={13}
                        className="text-dark-300 absolute top-3 right-3"
                        style={{ position: 'absolute', top: 12, right: 12 }}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Petite flèche vers le bas pointant vers le bouton + */}
            <div className="flex justify-center mt-1.5">
              <div className="w-4 h-4 bg-white rotate-45 rounded-sm shadow-md"/>
            </div>
          </div>
        </>
      )}

      {/* ── BARRE NAV BAS ── */}
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

            /* Bouton central + */
            if (item.isCenter) {
              return (
                <button
                  key={idx}
                  onClick={() => setMenuOpen(v => !v)}
                  className="flex justify-center items-center relative -top-3 focus:outline-none"
                  aria-label="Ouvrir le menu d'accès rapide"
                >
                  <div
                    className={clsx(
                      'w-14 h-14 rounded-2xl flex items-center justify-center',
                      'transition-all duration-300 ease-out active:scale-90',
                      menuOpen
                        ? 'bg-dark-900 rotate-[135deg] shadow-xl scale-95'
                        : 'bg-gradient-to-tr from-primary-600 to-primary-500 shadow-green hover:shadow-lg'
                    )}
                    style={!menuOpen ? { boxShadow: '0 8px 24px rgba(22,163,74,0.35)' } : {}}
                  >
                    {menuOpen
                      ? <X size={22} className="text-white" strokeWidth={2.5} />
                      : <Plus size={26} className="text-white" strokeWidth={2.5} />
                    }
                  </div>
                </button>
              )
            }

            return (
              <button
                key={idx}
                onClick={() => handleNav(item.path)}
                className="flex-1 flex flex-col items-center justify-center py-1 relative focus:outline-none"
              >
                {/* Icône avec fond actif de type capsule (Material style) */}
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
                  
                  {/* Badge notifications */}
                  {item.path === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1 border-2 border-white shadow-sm animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  
                  {/* Badge panier */}
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

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
