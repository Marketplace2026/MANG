import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Home, MessageCircle, Plus, Bell, User,
  Package, Wallet, Store, Globe, X, ChevronRight, Heart, Gift
} from 'lucide-react'
import { useAuthStore, useNotificationsStore } from '@/store'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { icon: Home,          label: 'Accueil',      path: '/marketplace' },
  { icon: MessageCircle, label: 'Messages',      path: '/messages'    },
  { icon: Plus,          label: 'Menu',          path: null, isCenter: true },
  { icon: Bell,          label: 'Notifications', path: '/notifications' },
  { icon: User,          label: 'Profil',        path: '/profil'      },
]

const CENTER_MENU = [
  { icon: Store,   label: 'Espace Vendeur', path: '/vendeur',       color: 'bg-primary-600' },
  { icon: Package, label: 'Commandes',      path: '/commandes',     color: 'bg-orange-500'  },
  { icon: Wallet,  label: 'Mon Wallet',     path: '/portefeuille',  color: 'bg-dark-800'    },
  { icon: Heart,   label: 'Mes Favoris',    path: '/favoris',       color: 'bg-red-500'     },
  { icon: Globe,   label: 'Communauté',     path: '/communaute',    color: 'bg-violet-500'  },
  { icon: Gift,    label: 'Parrainage',     path: '/parrainage',    color: 'bg-gold-500'    },
]

export default function AppLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuthStore()
  const { unreadCount, fetchNotifications, subscribeToNotifications } = useNotificationsStore()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchNotifications(user.id)
    const unsub = subscribeToNotifications(user.id)
    return unsub
  }, [user])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const handleNav = (path) => { navigate(path); setMenuOpen(false) }

  return (
    <div className="min-h-dvh flex flex-col bg-surface-50">
      <main className="flex-1 safe-pb">
        <div className="mx-auto w-full max-w-[var(--content-max-width)]">
          <Outlet />
        </div>
      </main>

      {/* Overlay menu + */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-dark-900/50 z-40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-72 animate-scale-in">
            <div className="bg-white rounded-3xl shadow-modal p-4 space-y-2">
              <p className="text-xs font-bold text-dark-600/40 uppercase tracking-wider text-center mb-3">
                Accès rapide
              </p>
              {CENTER_MENU.map((item, i) => {
                const Icon = item.icon
                return (
                  <button key={i} onClick={() => handleNav(item.path)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface-50 active:bg-surface-100 transition-colors">
                    <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', item.color)}>
                      <Icon size={17} className="text-white"/>
                    </div>
                    <span className="font-semibold text-dark-800 text-sm flex-1 text-left">{item.label}</span>
                    <ChevronRight size={15} className="text-dark-600/30"/>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-center mt-1">
              <div className="w-4 h-4 bg-white rotate-45 shadow-md rounded-sm"/>
            </div>
          </div>
        </>
      )}

      {/* BARRE NAV BAS */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-surface-200 shadow-bottom-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-[var(--content-max-width)] flex items-center h-16">
          {NAV_ITEMS.map((item, idx) => {
            const Icon     = item.icon
            const isActive = item.path && location.pathname === item.path

            if (item.isCenter) {
              return (
                <button key={idx} onClick={() => setMenuOpen(v => !v)} className="flex-1 flex justify-center">
                  <div className={clsx(
                    'w-14 h-14 -mt-5 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90 relative',
                    menuOpen ? 'bg-dark-800 shadow-modal rotate-45' : 'bg-primary-600 shadow-green'
                  )}>
                    {menuOpen
                      ? <X size={24} className="text-white"/>
                      : <Icon size={26} className="text-white" strokeWidth={2.5}/>
                    }
                  </div>
                </button>
              )
            }

            return (
              <button key={idx} onClick={() => handleNav(item.path)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative active:scale-95 transition-transform duration-150">
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={clsx('transition-colors duration-200', isActive ? 'text-primary-600' : 'text-dark-600/60')}
                  />
                  {item.path === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className={clsx(
                  'text-[10px] font-semibold transition-colors duration-200',
                  isActive ? 'text-primary-600' : 'text-dark-600/50'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary-600"/>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
