import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { checkoutWithWallet as supabaseCheckout } from '@/lib/supabaseCart';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  // actions
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  checkoutWithWallet: (userId: string, walletBalance: number) => Promise<void>;
  syncWithSupabase: (userId: string) => Promise<void>;
  // derived values en GETTER pour ne pas les sauvegarder
  get totalQty(): number;
  get subTotal(): number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      status: 'idle',
      error: null,
      
      addItem: (item, qty = 1) => {
        set({ status: 'loading' });
        try {
          const existing = get().items.find(i => i.id === item.id);
          const newItems = existing
            ? get().items.map(i => i.id === item.id ? { ...i, qty: i.qty + qty } : i)
            : [...get().items, { ...item, qty }];
          set({ items: newItems, status: 'idle' });
          toast.success('Produit ajouté au panier');
        } catch (e: any) {
          console.error(e);
          set({ error: e.message, status: 'error' });
          toast.error('Erreur lors de l\'ajout au panier');
        }
      },
      removeItem: (itemId) => {
        const newItems = get().items.filter(i => i.id !== itemId);
        set({ items: newItems });
      },
      updateQuantity: (itemId, qty) => {
        const newItems = get().items.map(i => i.id === itemId ? { ...i, qty: Math.max(1, qty) } : i);
        set({ items: newItems });
      },
      clearCart: () => {
        set({ items: [] });
      },
      checkoutWithWallet: async (userId: string, walletBalance: number) => {
        set({ status: 'loading' });
        try {
          const subTotal = get().subTotal;
          if (walletBalance < subTotal) {
            toast.error('Solde insuffisant');
            set({ status: 'idle' });
            return;
          }
          const success = await supabaseCheckout(userId, walletBalance, get().items);
          if (success) {
            get().clearCart();
            toast.success('Commande créée avec succès');
          }
          set({ status: 'idle' });
        } catch (e: any) {
          console.error(e);
          set({ error: e.message, status: 'error' });
          toast.error('Erreur lors du paiement');
        }
      },
      syncWithSupabase: async (userId) => {
        set({ status: 'loading' });
        try {
          const { error } = await supabase.from('carts').upsert([{ user_id: userId, items: get().items }]);
          if (error) throw error;
          set({ status: 'idle' });
        } catch (e: any) {
          console.error(e);
          set({ error: e.message, status: 'error' });
        }
      },

      // GETTERS : ne sont PAS sauvegardés dans localStorage
      get totalQty() { 
        return get().items.reduce((sum, i) => sum + i.qty, 0) 
      },
      get subTotal() { 
        return get().items.reduce((sum, i) => sum + i.price * i.qty, 0) 
      },
    }),
    { 
      name: 'mangafrica-cart-v2', // <- ON CHANGE LE NOM POUR OUBLIER L'ANCIEN
      partialize: (state) => ({ items: state.items }) // <- On sauvegarde SEULEMENT items
    }
  )
);
