import React, { useState, useEffect } from 'react'
import { Crown, AlertTriangle, AlertCircle, Clock, Zap, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'

const PLAN_NAMES = {
  1: { name: 'Bronze', stars: '★', color: 'from-amber-600 to-amber-700', text: 'text-amber-500', badge: 'bg-amber-100 text-amber-800' },
  2: { name: 'Argent', stars: '★★', color: 'from-slate-400 to-slate-600', text: 'text-slate-400', badge: 'bg-slate-100 text-slate-800' },
  3: { name: 'Or', stars: '★★★', color: 'from-yellow-400 to-amber-500', text: 'text-yellow-400', badge: 'bg-yellow-100 text-yellow-800' }
}

export default function PremiumCountdownWidget({ shop, premiumStatus, onRenew }) {
  const expiresAtStr = shop?.premium_expires_at || premiumStatus?.expires_at
  const level = shop?.premium_level || premiumStatus?.level || 0

  const [timeLeft, setTimeLeft] = useState({
    totalMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  })

  useEffect(() => {
    if (!expiresAtStr || level === 0) return

    const calculateTime = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAtStr).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft({
          totalMs: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({
        totalMs: diff,
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      })
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [expiresAtStr, level])

  if (level === 0 && !timeLeft.isExpired) return null

  const planInfo = PLAN_NAMES[level] || PLAN_NAMES[3]

  // Détermination du signal d'alerte
  // - normal : > 5 jours
  // - warning : <= 5 jours et > 2 jours
  // - critical : <= 2 jours
  // - expired : <= 0
  const daysRemaining = timeLeft.days
  let signalType = 'normal'
  if (timeLeft.isExpired) {
    signalType = 'expired'
  } else if (daysRemaining <= 2) {
    signalType = 'critical'
  } else if (daysRemaining <= 5) {
    signalType = 'warning'
  }

  // Calcul du pourcentage restant (sur une base de 30 jours)
  const totalDurationMs = 30 * 24 * 60 * 60 * 1000
  const percentRemaining = Math.max(0, Math.min(100, (timeLeft.totalMs / totalDurationMs) * 100))

  return (
    <div className={clsx(
      'rounded-3xl p-4.5 mb-4 border transition-all duration-300 shadow-md relative overflow-hidden',
      signalType === 'critical' && 'bg-gradient-to-br from-red-500/15 via-rose-500/10 to-red-600/20 border-red-500/40 shadow-red-500/10 animate-pulse-gentle',
      signalType === 'warning' && 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-600/20 border-amber-400/40 shadow-amber-500/10',
      signalType === 'normal' && 'bg-gradient-to-br from-dark-900/90 via-dark-800 to-dark-900 border-gold-400/30 text-white',
      signalType === 'expired' && 'bg-gradient-to-br from-surface-800 via-surface-900 to-black border-surface-700 text-white'
    )}>
      {/* Halo décoratif d'arrière-plan */}
      <div className={clsx(
        'absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl pointer-events-none',
        signalType === 'critical' ? 'bg-red-500/20' :
        signalType === 'warning' ? 'bg-amber-400/20' : 'bg-gold-400/15'
      )} />

      {/* EN-TÊTE : Statut & Titre */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            'w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm',
            signalType === 'critical' ? 'bg-red-500 text-white animate-bounce-gentle' :
            signalType === 'warning' ? 'bg-amber-500 text-white' :
            'bg-gradient-to-br from-gold-400 to-amber-500 text-dark-900'
          )}>
            {signalType === 'critical' ? <AlertCircle size={22} /> :
             signalType === 'warning' ? <AlertTriangle size={22} /> :
             <Crown size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-sm tracking-wide text-white">
                Premium {planInfo.name}
              </span>
              <span className="text-gold-400 text-xs font-bold">{planInfo.stars}</span>
            </div>
            <p className={clsx(
              'text-[11px] font-medium',
              signalType === 'critical' ? 'text-red-300 font-bold' :
              signalType === 'warning' ? 'text-amber-300 font-bold' :
              signalType === 'expired' ? 'text-surface-400' : 'text-gold-300/80'
            )}>
              {signalType === 'critical' ? '🚨 Signal Critique : Expiration imminente !' :
               signalType === 'warning' ? '⚠️ Signal d\'Alerte : Se termine bientôt' :
               signalType === 'expired' ? '❌ Abonnement Expiré' : '🟢 Abonnement Actif & Prioritaire'}
            </p>
          </div>
        </div>

        {/* Bouton Renouveler */}
        <button
          onClick={onRenew}
          className={clsx(
            'px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all',
            signalType === 'critical' ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' :
            signalType === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
            'bg-gold-500 hover:bg-gold-400 text-dark-900 font-black'
          )}
        >
          <RefreshCw size={12} className="animate-spin-slow" />
          {timeLeft.isExpired ? 'Réactiver' : 'Prolonger'}
        </button>
      </div>

      {/* COMPTEUR VISUEL EN DIRECT (Jours, Heures, Min, Sec) */}
      {!timeLeft.isExpired ? (
        <div className="relative z-10 mb-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: timeLeft.days, unit: 'Jours' },
              { val: String(timeLeft.hours).padStart(2, '0'), unit: 'Heures' },
              { val: String(timeLeft.minutes).padStart(2, '0'), unit: 'Min' },
              { val: String(timeLeft.seconds).padStart(2, '0'), unit: 'Sec' }
            ].map((box, i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-2xl p-2 text-center border backdrop-blur-md transition-all',
                  signalType === 'critical' ? 'bg-red-950/40 border-red-500/30' :
                  signalType === 'warning' ? 'bg-amber-950/40 border-amber-400/30' :
                  'bg-white/10 border-white/15'
                )}
              >
                <p className={clsx(
                  'font-display font-black text-xl leading-none tracking-tight',
                  signalType === 'critical' ? 'text-red-300' :
                  signalType === 'warning' ? 'text-amber-300' : 'text-white'
                )}>
                  {box.val}
                </p>
                <p className="text-[9px] uppercase font-bold text-white/60 tracking-wider mt-1">
                  {box.unit}
                </p>
              </div>
            ))}
          </div>

          {/* Jauge de progression */}
          <div className="mt-3">
            <div className="flex justify-between items-center text-[10px] text-white/70 mb-1 font-medium">
              <span>Temps restant sur 30j</span>
              <span className="font-bold">{Math.round(percentRemaining)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/10 p-[1px]">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  signalType === 'critical' ? 'bg-gradient-to-r from-red-500 to-rose-400' :
                  signalType === 'warning' ? 'bg-gradient-to-r from-amber-400 to-yellow-300' :
                  'bg-gradient-to-r from-gold-500 to-emerald-400'
                )}
                style={{ width: `${percentRemaining}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl mb-3 text-center">
          <p className="text-red-300 text-xs font-bold">
            Votre boutique est actuellement repassée en mode gratuit (10 produits max).
          </p>
          <p className="text-white/60 text-[11px] mt-0.5">
            Réactivez votre abonnement pour retrouver votre visibilité prioritaire et vos produits illimités.
          </p>
        </div>
      )}

      {/* MESSAGE D'EXPLICATION ACTIONNABLE */}
      <div className={clsx(
        'p-2.5 rounded-2xl flex items-center gap-2 text-xs relative z-10 border',
        signalType === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-200' :
        signalType === 'warning' ? 'bg-amber-500/10 border-amber-400/30 text-amber-200' :
        signalType === 'expired' ? 'bg-surface-800/60 border-surface-700 text-surface-300' :
        'bg-white/5 border-white/10 text-white/80'
      )}>
        {signalType === 'critical' ? (
          <>
            <Zap size={14} className="text-red-400 flex-shrink-0 animate-bounce" />
            <p className="text-[11px] leading-tight">
              <strong>Action requise :</strong> Prolongez avant expiration pour conserver votre badge et votre priorité de recherche sans interruption.
            </p>
          </>
        ) : signalType === 'warning' ? (
          <>
            <Clock size={14} className="text-amber-300 flex-shrink-0" />
            <p className="text-[11px] leading-tight">
              <strong>Rappel :</strong> Vos avantages prennent fin dans {timeLeft.days} jour(s). Les 30 jours suivants s'ajouteront à votre temps restant !
            </p>
          </>
        ) : signalType === 'expired' ? (
          <>
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-[11px] leading-tight">
              Vos produits supplémentaires et votre mise en avant sont masqués jusqu'au réabonnement.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
            <p className="text-[11px] leading-tight">
              Votre boutique est mise en avant auprès de milliers d'acheteurs sur MANG.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
