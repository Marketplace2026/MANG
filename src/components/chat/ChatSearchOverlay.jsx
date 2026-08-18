import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'

export default function ChatSearchOverlay({
  searchQuery,
  onSearchChange,
  matchCount,
  onClose
}) {
  return (
    <div className="bg-surface-100 dark:bg-dark-800 border-b border-surface-200 dark:border-dark-700 px-4 py-2 flex items-center justify-between gap-3 animate-slide-down sticky top-[57px] z-20">
      <div className="flex-1 relative flex items-center">
        <Search size={15} className="absolute left-3 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher dans cette discussion..."
          className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none font-medium"
          autoFocus
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className="absolute right-3 text-gray-400">
            <X size={13} />
          </button>
        )}
      </div>

      {searchQuery && (
        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          {matchCount} résultat{matchCount > 1 ? 's' : ''}
        </span>
      )}

      <button
        onClick={onClose}
        className="w-8 h-8 rounded-xl bg-white dark:bg-dark-900 border border-surface-200 dark:border-dark-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white"
      >
        <X size={15} />
      </button>
    </div>
  )
}
