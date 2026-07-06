import { create } from 'zustand'

const getSavedCart = () => {
  try {
    const saved = localStorage.getItem('mang_cart')
    return saved ? JSON.parse(saved) : []
  } catch (e) {
    return []
  }
}

// Store Zustand pour le panier d'achat avec persistance localStorage
export const useCartStore = create((set, get) => ({
  // Récupération initiale sécurisée des articles du panier
  items: getSavedCart(),

  // Ajouter un produit avec quantité et variante facultative
  addItem: (product, quantity = 1, variant = null) => {
    const items = get().items
    // Clé composite id_produit + nom_variante pour différencier les variantes
    const id = product.id + (variant ? '_' + variant.name : '')
    const existing = items.find(item => item.id === id)

    let newItems
    if (existing) {
      newItems = items.map(item =>
        item.id === id ? { ...item, quantity: item.quantity + quantity } : item
      )
    } else {
      newItems = [...items, { id, product, quantity, variant }]
    }

    localStorage.setItem('mang_cart', JSON.stringify(newItems))
    set({ items: newItems })
  },

  // Supprimer un article par son ID composite
  removeItem: (itemId) => {
    const newItems = get().items.filter(item => item.id !== itemId)
    localStorage.setItem('mang_cart', JSON.stringify(newItems))
    set({ items: newItems })
  },

  // Mettre à jour la quantité d'un article
  updateQuantity: (itemId, qty) => {
    const newItems = get().items.map(item =>
      item.id === itemId ? { ...item, quantity: Math.max(1, qty) } : item
    )
    localStorage.setItem('mang_cart', JSON.stringify(newItems))
    set({ items: newItems })
  },

  // Vider le panier
  clearCart: () => {
    localStorage.removeItem('mang_cart')
    set({ items: [] })
  }
}))
