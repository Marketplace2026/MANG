import { clsx } from 'clsx'

export default function NotificationFiltersNav({
  activeFilter,
  onFilterChange,
  unreadCount = 0,
  counts = {}
}) {
  const tabs = [
    { key: 'all',    label: 'Toutes', count: counts.all },
    { key: 'unread', label: '🔵 Non lues', count: unreadCount },
    { key: 'orders', label: '📦 Commandes', count: counts.orders },
    { key: 'social', label: '❤️ Social', count: counts.social },
    { key: 'wallet', label: '💰 Wallet', count: counts.wallet },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 pt-1 -mx-1 px-1">
      {tabs.map((t) => {
        const isActive = activeFilter === t.key
        return (
          <button
            key={t.key}
            onClick={() => onFilterChange(t.key)}
            className={clsx(
              'flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border flex items-center gap-1.5 active:scale-95 shadow-xs',
              isActive
                ? 'border-emerald-700 bg-emerald-700 text-white shadow-emerald-700/20'
                : 'border-surface-200 dark:border-dark-800 bg-white dark:bg-dark-900 text-gray-700 dark:text-gray-300 hover:border-gray-300'
            )}
          >
            <span>{t.label}</span>
            {typeof t.count === 'number' && t.count > 0 && (
              <span
                className={clsx(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
