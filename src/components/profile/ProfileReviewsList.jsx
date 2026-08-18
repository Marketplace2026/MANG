import { Star, ShieldCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { UserLink } from '@/components/ui'

export default function ProfileReviewsList({ reviews = [], avgRating = 5.0 }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-3 border border-amber-200/50">
          ⭐
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-1">
          Aucun avis pour le moment
        </h3>
        <p className="text-gray-500 text-xs max-w-xs mx-auto">
          Les avis certifiés des clients ayant commandé apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-[var(--content-max-width)] mx-auto space-y-3">
      {/* Résumé Note */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-3xl border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
        <div>
          <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">Note globale</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-display font-black text-3xl text-gray-900 dark:text-white">
              {Number(avgRating).toFixed(1)}
            </span>
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16} className="fill-amber-400" />
              ))}
            </div>
          </div>
        </div>
        <span className="px-3 py-1 bg-white dark:bg-dark-800 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-full shadow-xs">
          {reviews.length} avis certifiés
        </span>
      </div>

      {/* Liste des Avis */}
      <div className="space-y-3">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="p-4 bg-white dark:bg-dark-900 rounded-3xl border border-surface-200 dark:border-dark-800 space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <UserLink user={rev.user} size="sm" showUsername={false} />
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className={s <= (rev.rating || 5) ? 'fill-amber-400' : 'text-gray-300'}
                  />
                ))}
              </div>
            </div>

            {rev.comment && (
              <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                "{rev.comment}"
              </p>
            )}

            <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <ShieldCheck size={12} /> Achat vérifié MANG Pay
              </span>
              {rev.created_at && (
                <span>
                  {formatDistanceToNow(new Date(rev.created_at), { addSuffix: true, locale: fr })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
