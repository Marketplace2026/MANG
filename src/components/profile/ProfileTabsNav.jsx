import { clsx } from 'clsx'

export default function ProfileTabsNav({ activeTab, onTabChange, counts = {} }) {
  const tabs = [
    { key: 'products', label: '🛒 Catalogue', count: counts.products },
    { key: 'posts',    label: '🔥 Publications', count: counts.posts },
    { key: 'reviews',  label: '⭐ Avis', count: counts.reviews },
    { key: 'about',    label: 'ℹ️ À propos' },
  ]

  return (
    <div className="sticky top-0 z-40 bg-white dark:bg-dark-900 border-b border-surface-200 dark:border-dark-800 shadow-xs">
      <div className="flex overflow-x-auto scrollbar-none px-2 max-w-[var(--content-max-width)] mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={clsx(
                'flex-1 min-w-[100px] py-3.5 px-3 text-center text-xs font-bold transition-all relative whitespace-nowrap',
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={clsx(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                    isActive ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-surface-100 dark:bg-dark-800 text-gray-400'
                  )}>
                    {tab.count}
                  </span>
                )}
              </div>

              {/* Indicateur d'onglet actif */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
