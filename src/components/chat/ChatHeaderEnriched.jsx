import { ArrowLeft, Search, Phone, Video, Info, Store } from 'lucide-react'
import { UserLink } from '@/components/ui'

export default function ChatHeaderEnriched({
  otherUser,
  shop,
  isOnline,
  onBack,
  onToggleSearch,
  onOpenInfo
}) {
  if (!otherUser) return null

  return (
    <div className="bg-white dark:bg-dark-900 border-b border-surface-200 dark:border-dark-800 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* 1. Bouton Retour + Profil Expéditeur UserLink */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="md:hidden w-8 h-8 rounded-xl bg-surface-100 dark:bg-dark-800 flex items-center justify-center text-gray-700 dark:text-gray-200 active:scale-90 transition-transform flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </button>

        <UserLink
          user={otherUser}
          size="md"
          showAvatar={true}
          showName={true}
          showUsername={true}
          subtext={
            isOnline ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En ligne
              </span>
            ) : (
              shop ? `Boutique ${shop.name}` : null
            )
          }
          className="min-w-0 flex-1"
        />
      </div>

      {/* 2. Actions Header (Recherche In-Chat, Info, Boutique) */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onToggleSearch}
          className="w-9 h-9 rounded-2xl bg-surface-100 dark:bg-dark-800 hover:bg-surface-200 dark:hover:bg-dark-700 text-gray-600 dark:text-gray-300 flex items-center justify-center active:scale-90 transition-transform"
          title="Rechercher dans le fil"
        >
          <Search size={17} />
        </button>

        {shop?.slug && (
          <a
            href={`/boutique/${shop.slug}`}
            className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center active:scale-90 transition-transform"
            title="Visiter la boutique"
          >
            <Store size={17} />
          </a>
        )}

        <button
          onClick={onOpenInfo}
          className="w-9 h-9 rounded-2xl bg-surface-100 dark:bg-dark-800 hover:bg-surface-200 dark:hover:bg-dark-700 text-gray-600 dark:text-gray-300 flex items-center justify-center active:scale-90 transition-transform"
          title="Infos contact"
        >
          <Info size={17} />
        </button>
      </div>
    </div>
  )
}
