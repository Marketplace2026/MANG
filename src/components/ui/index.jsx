import { clsx } from 'clsx'
import { X, Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { getOptimizedImageUrl } from '@/utils/image'

// ============================================================
// AVATAR
// ============================================================

export function Avatar({ src, name, size = 'md', online = false, className = '' }) {
  const sizes = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
    '2xl': 'w-32 h-32 text-4xl',
  }
  const dotSizes = {
    xs: 'w-2 h-2 border',
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-4 h-4 border-2',
    xl: 'w-5 h-5 border-2',
    '2xl': 'w-6 h-6 border-2',
  }

  const widthMap = { xs: 60, sm: 80, md: 100, lg: 150, xl: 200, '2xl': 250 }

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=16a34a&color=fff&size=${widthMap[size] || 100}`

  // FIX: Si pas de src, on utilise direct le fallback.
  // Sinon on tente l'URL optimisée, mais on garde l'URL brute sous le coude :
  // si getOptimizedImageUrl renvoie une URL cassée (mauvais domaine, service down, etc.),
  // on ne veut PAS tomber direct sur les initiales alors que la vraie photo existe.
  let finalSrc = fallbackUrl
  if (src) {
    try {
      finalSrc = getOptimizedImageUrl(src, { width: widthMap[size] || 100, format: 'webp', quality: 80 }) || src
    } catch {
      finalSrc = src // si getOptimizedImageUrl crash, on prend l'url brute
    }
  }

  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      <img
        src={finalSrc}
        alt={name || 'Avatar'}
        className={clsx(sizes[size], 'rounded-2xl object-cover bg-surface-100')}
        onError={(e) => {
          // 1) Si l'URL optimisée a échoué, on retente avec l'URL brute (src d'origine)
          if (src && e.target.src !== src && e.target.src !== fallbackUrl) {
            e.target.src = src
            return
          }
          // 2) Si l'URL brute échoue aussi (ou qu'il n'y avait pas de src), initiales
          if (e.target.src !== fallbackUrl) {
            e.target.src = fallbackUrl
          }
        }}
      />
      {online && (
        <span className={clsx(
          dotSizes[size],
          'absolute bottom-0 right-0 rounded-full bg-emerald-400 border-white'
        )} />
      )}
    </div>
  )
}
// ============================================================
// BUTTON
// ============================================================
export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  className = '', ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const variants = {
    primary:   'bg-primary-600 hover:bg-primary-700 text-white shadow-green',
    secondary: 'bg-surface-100 hover:bg-surface-200 text-dark-700',
    gold:      'bg-gold-500 hover:bg-gold-600 text-white shadow-gold',
    danger:    'bg-red-500 hover:bg-red-600 text-white',
    ghost:     'text-primary-600 hover:bg-primary-50',
    outline:   'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
    'outline-white': 'border-2 border-white/30 text-white hover:bg-white/10',
  }

  const sizes = {
    sm:   'px-3.5 py-2 text-sm',
    md:   'px-5 py-3 text-sm',
    lg:   'px-6 py-3.5 text-base',
    xl:   'px-8 py-4 text-base',
    icon: 'p-2.5',
  }

  return (
    <button
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  )
}

// ============================================================
// INPUT FIELD
// ============================================================
export function InputField({
  label, icon: Icon, error, hint,
  className = '', containerClass = '', ...props
}) {
  return (
    <div className={clsx('space-y-1.5', containerClass)}>
      {label && (
        <label className="block text-sm font-semibold text-dark-700 pl-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none" />
        )}
        <input
          className={clsx(
            'input-field',
            Icon && 'pl-10',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 pl-1 font-medium">{error}</p>}
      {hint && !error && <p className="text-xs text-dark-600/50 pl-1">{hint}</p>}
    </div>
  )
}

// ============================================================
// TEXTAREA
// ============================================================
export function TextArea({ label, error, className = '', containerClass = '', ...props }) {
  return (
    <div className={clsx('space-y-1.5', containerClass)}>
      {label && (
        <label className="block text-sm font-semibold text-dark-700 pl-1">{label}</label>
      )}
      <textarea
        className={clsx(
          'input-field resize-none',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 pl-1 font-medium">{error}</p>}
    </div>
  )
}

// ============================================================
// BOTTOM SHEET
// ============================================================
export function BottomSheet({ open, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className={clsx('bottom-sheet dark:bg-dark-900 z-50 max-w-[480px] mx-auto left-0 right-0', className)}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-300 dark:bg-dark-700" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100 dark:border-dark-800">
            <h3 className="font-display text-lg font-bold text-dark-800 dark:text-white">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-dark-800 flex items-center justify-center active:scale-95">
              <X size={16} className="text-dark-600 dark:text-dark-300" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[85vh]">
          {children}
        </div>
      </div>
    </>
  )
}

// ============================================================
// MODAL
// ============================================================
export function Modal({ open, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={clsx(
          'bg-white rounded-3xl shadow-modal w-full max-w-sm animate-scale-in',
          className
        )}>
          {title && (
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <h3 className="font-display text-lg font-bold text-dark-800">{title}</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center active:scale-95">
                <X size={16} className="text-dark-600" />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  )
}

// ============================================================
// SKELETON
// ============================================================
export function Skeleton({ className = '' }) {
  return <div className={clsx('skeleton', className)} />
}

export function SkeletonAvatar({ size = 'md' }) {
  const sizes = { sm: 'w-9 h-9', md: 'w-11 h-11', lg: 'w-16 h-16', xl: 'w-24 h-24' }
  return <div className={clsx('skeleton rounded-2xl', sizes[size])} />
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={clsx('skeleton h-4 rounded-lg', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

// ============================================================
// BADGE PREMIUM
// ============================================================
export function PremiumBadge({ level }) {
  if (!level || level === 0) return null
  const config = {
    1: { label: 'Bronze', emoji: '🥉', class: 'bg-amber-700/15 text-amber-700 border border-amber-700/30' },
    2: { label: 'Argent', emoji: '🥈', class: 'bg-slate-400/15 text-slate-600 border border-slate-400/30' },
    3: { label: 'Or',     emoji: '🥇', class: 'bg-gold-500/15 text-gold-700 border border-gold-500/30 animate-badge-glow' },
  }
  const { label, emoji, class: cls } = config[level]
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold', cls)}>
      {emoji} {label}
    </span>
  )
}

// ============================================================
// STAT CARD
// ============================================================
export function StatCard({ icon: Icon, label, value, color = 'primary', className = '' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    gold:    'bg-gold-50 text-gold-600',
    blue:    'bg-blue-50 text-blue-600',
    purple:  'bg-violet-50 text-violet-600',
  }
  return (
    <div className={clsx('bg-white rounded-2xl p-4 shadow-card flex items-center gap-3', className)}>
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-dark-600/60 font-medium">{label}</p>
        <p className="font-bold text-dark-800 text-base leading-tight">{value}</p>
      </div>
    </div>
  )
}

// ============================================================
// SECTION HEADER
// ============================================================
export function SectionHeader({ title, action, actionLabel }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-lg font-bold text-dark-800">{title}</h2>
      {action && (
        <button onClick={action} className="text-sm text-primary-600 font-semibold">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================
export function EmptyState({ emoji, title, subtitle, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="font-display text-xl font-bold text-dark-800 mb-2">{title}</h3>
      {subtitle && <p className="text-dark-600/60 text-sm mb-6 max-w-xs">{subtitle}</p>}
      {action && (
        <Button onClick={action} variant="primary">{actionLabel}</Button>
      )}
    </div>
  )
}

// ============================================================
// PIN INPUT
// ============================================================
export function PinInput({ value, onChange, length = 4, error = false }) {
  const inputs = useRef([])

  const handleChange = (i, val) => {
    const digits = val.replace(/\D/g, '')
    if (!digits) return
    const newVal = value.split('')
    newVal[i] = digits[digits.length - 1]
    onChange(newVal.join(''))
    if (i < length - 1) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (value[i]) {
        const newVal = value.split('')
        newVal[i] = ''
        onChange(newVal.join(''))
      } else if (i > 0) {
        inputs.current[i - 1]?.focus()
      }
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className={clsx(
            'w-14 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all duration-200',
            'bg-surface-50 focus:bg-white',
            error
              ? 'border-red-400 text-red-500 focus:border-red-500'
              : value[i]
                ? 'border-primary-500 text-primary-700 bg-primary-50'
                : 'border-surface-200 focus:border-primary-400'
          )}
        />
      ))}
    </div>
  )
}

// ============================================================
// DIVIDER
// ============================================================
export function Divider({ label, className = '' }) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div className="flex-1 h-px bg-surface-200" />
      {label && <span className="text-xs text-dark-600/40 font-medium whitespace-nowrap">{label}</span>}
      <div className="flex-1 h-px bg-surface-200" />
    </div>
  )
}

// ============================================================
// TOAST NOTIFICATION (style Facebook)
// ============================================================
export function NotificationToast({ notification, onClose }) {
  const icons = {
    shop_follow:    '👥',
    product_favorite: '❤️',
    new_message:    '💬',
    order_new:      '📦',
    order_accepted: '✅',
    order_refused:  '❌',
    order_paid:     '💰',
    wallet_credit:  '💵',
    wallet_debit:   '💸',
    post_like:      '❤️',
    shop_like:      '❤️',
    shop_comment:   '💬',
    comment_reply:  '↩️',
    user_follow:    '👤',
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-dark-800 rounded-2xl shadow-modal animate-toast-in max-w-sm">
      <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center flex-shrink-0 text-xl">
        {icons[notification.type] || '🔔'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-tight">{notification.title}</p>
        {notification.body && (
          <p className="text-white/60 text-xs mt-0.5 truncate">{notification.body}</p>
        )}
      </div>
      <button onClick={onClose} className="text-white/30 hover:text-white/60 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}
