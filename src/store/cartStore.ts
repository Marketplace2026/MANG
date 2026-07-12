import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { checkoutWithWallet as supabaseCheckout } from '@/lib/supabaseCart';

// Simple cart item shape matching the UI expectations
export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
};

export type CartState = {
  items: CartItem[];
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  // derived values
  totalQty: number;
  subTotal: number;
  // actions
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  checkoutWithWallet: (userId: string, walletBalance: number) => Promise<void>;
  syncWithSupabase: (userId: string) => Promise<void>;
};

const calculateTotals = (items: CartItem[]) => {
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const subTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return { totalQty, subTotal };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      status: 'idle',
      error: null,
      totalQty: 0,
      subTotal: 0,
      addItem: (item, qty = 1) => {
        set({ status: 'loading' });
        try {
          const existing = get().items.find(i => i.id === item.id);
          const newItems = existing
            ? get().items.map(i => i.id === item.id ? { ...i, qty: i.qty + qty } : i)
            : [...get().items, { ...item, qty }];
          const { totalQty, subTotal } = calculateTotals(newItems);
          set({ items: newItems, totalQty, subTotal, status: 'idle' });
          toast.success('Produit ajouté au panier');
        } catch (e: any) {
          console.error(e);
          set({ error: e.message, status: 'error' });
          toast.error('Erreur lors de l\'ajout au panier');
        }
      },
      removeItem: (itemId) => {
        const newItems = get().items.filter(i => i.id !== itemId);
        const { totalQty, subTotal } = calculateTotals(newItems);
        set({ items: newItems, totalQty, subTotal });
      },
      updateQuantity: (itemId, qty) => {
        const newItems = get().items.map(i => i.id === itemId ? { ...i, qty: Math.max(1, qty) } : i);
        const { totalQty, subTotal } = calculateTotals(newItems);
        set({ items: newItems, totalQty, subTotal });
      },
      clearCart: () => {
        set({ items: [], totalQty: 0, subTotal: 0 });
      },
      checkoutWithWallet: async (userId: string, walletBalance: number) => {
        set({ status: 'loading' });
        try {
          const { subTotal } = get();
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
          const { error } = await supabase.from('carts').upsert([
            { user_id: userId, items: get().items },
          ]);
          if (error) throw error;
          set({ status: 'idle' });
        } catch (e: any) {
          console.error(e);
          set({ error: e.message, status: 'error' });
        }
      },
    }),
    { name: 'cart-storage' }
  )
);
