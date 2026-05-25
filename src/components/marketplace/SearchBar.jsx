import { useState, useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal, Truck, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { BottomSheet } from '@/components/ui'
import { useCategories } from '@/hooks/useMarketplace'

export default function SearchBar({ value, onChange, onFilter, filters, onClearFilter }) {
  const [focused, setFocused] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const inputRef = useRef()
  const { groups } = useCategories()

  const activeFiltersCount = [filters.category, filters.hasDelivery].filter(Boolean).length

  return (
    <>
      <div className="flex gap-2 px-4 py-3">
        {/* Barre de recherche */}
        <div className={clsx(
          'flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all duration-200',
          focused
            ? 'bg-white ring-2 ring-primary-500 shadow-card'
            : 'bg-surface-100'
        )}>
          <Search size={16} className={clsx('flex-shrink-0 transition-colors', focused ? 'text-primary-600' : 'text-dark-600/40')}/>
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher boutiques, produits..."
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="flex-1 bg-transparent text-dark-800 text-sm font-medium placeholder-dark-600/40 outline-none"
          />
          {value && (
            <button onClick={() => { onChange(''); inputRef.current?.focus() }}
              className="flex-shrink-0 w-5 h-5 rounded-full bg-dark-600/20 flex items-center justify-center active:scale-90">
              <X size={11} className="text-dark-600"/>
            </button>
          )}
        </div>

        {/* Bouton filtre */}
        <button
          onClick={() => setFilterOpen(true)}
          className={clsx(
            'relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 flex-shrink-0',
            activeFiltersCount > 0
              ? 'bg-primary-600 shadow-green'
              : 'bg-surface-100'
          )}
        >
          <SlidersHorizontal size={18} className={activeFiltersCount > 0 ? 'text-white' : 'text-dark-600/60'}/>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 text-white text-[9px] font-black flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtres actifs chips */}
      {activeFiltersCount > 0 && (
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
          {filters.categoryName && (
            <FilterChip label={filters.categoryName} onRemove={() => onClearFilter('category')}/>
          )}
          {filters.hasDelivery && (
            <FilterChip label="Avec livraison" icon={<Truck size={11}/>} onRemove={() => onClearFilter('hasDelivery')}/>
          )}
        </div>
      )}

      {/* Bottom Sheet Filtres */}
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onFilter={(f) => { onFilter(f); setFilterOpen(false) }}
        groups={groups}
      />
    </>
  )
}

function FilterChip({ label, icon, onRemove }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-100 flex-shrink-0">
      {icon && <span className="text-primary-600">{icon}</span>}
      <span className="text-primary-700 text-xs font-semibold">{label}</span>
      <button onClick={onRemove} className="text-primary-500 hover:text-primary-700">
        <X size={12}/>
      </button>
    </div>
  )
}

function FilterSheet({ open, onClose, filters, onFilter, groups }) {
  const [localFilters, setLocalFilters] = useState(filters)
  const [expandedGroup, setExpandedGroup] = useState(null)

  useEffect(() => { setLocalFilters(filters) }, [filters, open])

  const applyFilters = () => onFilter(localFilters)

  const resetFilters = () => {
    const reset = { category: null, categoryName: null, hasDelivery: false }
    setLocalFilters(reset)
    onFilter(reset)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Filtrer">
      <div className="px-5 pt-2 pb-6 space-y-5">

        {/* Livraison */}
        <div>
          <p className="text-sm font-bold text-dark-700 mb-2">Options</p>
          <button
            onClick={() => setLocalFilters(p => ({ ...p, hasDelivery: !p.hasDelivery }))}
            className={clsx(
              'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-200',
              localFilters.hasDelivery
                ? 'border-primary-500 bg-primary-50'
                : 'border-surface-200 bg-surface-50'
            )}
          >
            <div className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              localFilters.hasDelivery ? 'bg-primary-500 text-white' : 'bg-surface-200 text-dark-600'
            )}>
              <Truck size={16}/>
            </div>
            <div className="flex-1 text-left">
              <p className={clsx('text-sm font-semibold', localFilters.hasDelivery ? 'text-primary-700' : 'text-dark-800')}>
                Avec livraison
              </p>
              <p className="text-xs text-dark-600/50">Boutiques qui livrent</p>
            </div>
            <div className={clsx(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
              localFilters.hasDelivery ? 'border-primary-500 bg-primary-500' : 'border-surface-300'
            )}>
              {localFilters.hasDelivery && (
                <div className="w-2 h-2 rounded-full bg-white"/>
              )}
            </div>
          </button>
        </div>

        {/* Catégories */}
        <div>
          <p className="text-sm font-bold text-dark-700 mb-2">Catégorie</p>
          <div className="space-y-2">
            {/* Toutes */}
            <button
              onClick={() => setLocalFilters(p => ({ ...p, category: null, categoryName: null }))}
              className={clsx(
                'w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all',
                !localFilters.category ? 'border-primary-500 bg-primary-50' : 'border-surface-200'
              )}
            >
              <span className="text-lg">🌾</span>
              <span className={clsx('text-sm font-semibold', !localFilters.category ? 'text-primary-700' : 'text-dark-800')}>
                Toutes les catégories
              </span>
            </button>

            {groups.map(group => (
              <div key={group.name} className="overflow-hidden rounded-2xl border-2 border-surface-200">
                <button
                  onClick={() => setExpandedGroup(expandedGroup === group.name ? null : group.name)}
                  className="w-full flex items-center justify-between p-3 bg-surface-50 active:bg-surface-100"
                >
                  <span className="text-sm font-bold text-dark-800">{group.name}</span>
                  <ChevronDown size={16} className={clsx(
                    'text-dark-600/40 transition-transform duration-200',
                    expandedGroup === group.name && 'rotate-180'
                  )}/>
                </button>

                {expandedGroup === group.name && (
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {group.items.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setLocalFilters(p => ({
                          ...p,
                          category: cat.id,
                          categoryName: `${cat.icon} ${cat.name}`
                        }))}
                        className={clsx(
                          'flex items-center gap-2 p-2.5 rounded-xl text-left transition-all',
                          localFilters.category === cat.id
                            ? 'bg-primary-100 text-primary-700'
                            : 'hover:bg-surface-100 text-dark-700'
                        )}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs font-semibold truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={resetFilters}
            className="flex-1 py-3.5 rounded-2xl border-2 border-surface-200 text-dark-600 font-bold text-sm active:scale-95 transition-transform">
            Réinitialiser
          </button>
          <button onClick={applyFilters}
            className="flex-1 py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-sm shadow-green active:scale-95 transition-transform">
            Appliquer
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
