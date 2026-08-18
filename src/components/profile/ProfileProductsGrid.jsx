import { ShoppingBag, Truck, Phone, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store'

const formatFCFA = (val) => Math.round(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'

export default function ProfileProductsGrid({ products = [], shop, profile }) {
  const navigate = useNavigate()
  const addItem = useCartStore(state => state.addItem)

  const handleAddToCart = (e, prod) => {
    e.stopPropagation()
    addItem({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      image_url: prod.images?.[0] || prod.image_url,
      shop_id: prod.shop_id,
      shop_name: shop?.name || 'Boutique MANG',
      unit: prod.unit || 'unité',
    })
    toast.success(`${prod.name} ajouté au panier 🛒`)
  }

  if (!products || products.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-3 border border-emerald-200/50">
          🌿
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-1">
          Aucun produit en catalogue
        </h3>
        <p className="text-gray-500 text-xs max-w-xs mx-auto mb-4">
          Ce vendeur n'a pas encore publié d'articles disponibles dans sa boutique.
        </p>
        {profile?.phone && (
          <a
            href={`https://wa.me/229${profile.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform"
          >
            <Phone size={14} /> Demander par WhatsApp
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 grid grid-cols-2 gap-3 max-w-[var(--content-max-width)] mx-auto">
      {products.map((prod) => {
        const image = prod.images?.[0] || prod.image_url || '/logo-mang.png'

        return (
          <div
            key={prod.id}
            onClick={() => navigate(`/produit/${prod.id}`)}
            className="bg-white dark:bg-dark-900 rounded-3xl border border-surface-200 dark:border-dark-800 overflow-hidden shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Image Produit */}
              <div className="relative aspect-square bg-surface-100 dark:bg-dark-800 overflow-hidden">
                <img
                  src={image}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {prod.is_organic && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                    🌿 BIO
                  </span>
                )}
              </div>

              {/* Détails Produit */}
              <div className="p-3">
                <h4 className="font-bold text-gray-900 dark:text-white text-xs line-clamp-2 leading-snug mb-1">
                  {prod.name}
                </h4>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                    {formatFCFA(prod.price)}
                  </span>
                  {prod.unit && (
                    <span className="text-[10px] text-gray-400 font-medium">/{prod.unit}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bouton Ajouter au Panier */}
            <div className="px-3 pb-3 pt-0">
              <button
                onClick={(e) => handleAddToCart(e, prod)}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <ShoppingBag size={13} />
                <span>Ajouter</span>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
