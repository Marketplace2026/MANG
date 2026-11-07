import React from 'react'
import { Store, ShoppingCart, CheckCircle2, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * Composant officiel MANG pour afficher le rôle (Vendeur ou Acheteur)
 * @param {Object} props
 * @param {boolean} [props.isSeller] - Force le statut vendeur si true
 * @param {string} [props.role] - 'seller' | 'buyer'
 * @param {string} [props.shopName] - Nom de la boutique (optionnel)
 * @param {boolean} [props.isVerified] - Si le vendeur est vérifié
 * @param {'xs'|'sm'|'md'} [props.size] - Taille du badge
 * @param {string} [props.className] - Classes Tailwind additionnelles
 */
export default function UserRoleBadge({
  isSeller,
  role,
  shopName,
  isVerified = false,
  size = 'sm',
  className = ''
}) {
  const seller = isSeller || role === 'seller' || Boolean(shopName)

  const sizeClasses = {
    xs: 'text-[9.5px] px-1.5 py-0.5 gap-1 font-black',
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-bold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-extrabold'
  }

  const iconSizes = {
    xs: 10,
    sm: 12,
    md: 14
  }

  if (seller) {
    return (
      <span
        className={clsx(
          'inline-flex items-center rounded-full tracking-wide shadow-2xs select-none transition-all',
          'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/60',
          sizeClasses[size],
          className
        )}
        title={shopName ? `Vendeur MANG · Boutique : ${shopName}` : 'Vendeur officiel MANG'}
      >
        <Store size={iconSizes[size]} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="truncate max-w-[140px]">
          {shopName ? `Vendeur · ${shopName}` : 'Vendeur'}
        </span>
        {isVerified && (
          <CheckCircle2 size={iconSizes[size]} className="text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950 shrink-0" />
        )}
      </span>
    )
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full tracking-wide shadow-2xs select-none transition-all',
        'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300/50 dark:border-blue-700/60',
        sizeClasses[size],
        className
      )}
      title="Acheteur MANG"
    >
      <ShoppingCart size={iconSizes[size]} className="text-blue-600 dark:text-blue-400 shrink-0" />
      <span>Acheteur</span>
    </span>
  )
}
