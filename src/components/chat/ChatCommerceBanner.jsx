import { ShoppingBag, ShieldCheck, ArrowRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const formatFCFA = (val) => Math.round(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'

export default function ChatCommerceBanner({ product, shop, onClose }) {
  const navigate = useNavigate()

  if (!product) return null

  return (
    <div className="bg-emerald-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md border-b border-emerald-800 animate-slide-down sticky top-[57px] z-20">
      <div className="flex items-center gap-3 min-w-0">
        {product.images?.[0] || product.image_url ? (
          <img
            src={product.images?.[0] || product.image_url}
            alt={product.name}
            className="w-10 h-10 rounded-xl object-cover border border-white/20 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-xl flex-shrink-0">
            🛍️
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs truncate">{product.name}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-emerald-200 text-[9px] font-black uppercase">
              En discussion
            </span>
          </div>
          <p className="text-amber-300 font-black text-xs">
            {formatFCFA(product.price)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate(`/produit/${product.id}`)}
          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-transform shadow-xs"
        >
          <ShoppingBag size={13} />
          <span>Acheter (MANG Pay)</span>
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
