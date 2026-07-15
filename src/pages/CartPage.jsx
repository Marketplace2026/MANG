import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Store, ShieldCheck, ChevronRight } from 'lucide-react';
import { useCartStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui';
import { toast } from 'react-hot-toast';

// Empty cart view
function PageVide() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface-50">
      <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center mb-6 animate-bounce">
        <ShoppingCart size={48} className="text-primary-600" />
      </div>
      <h2 className="font-display font-black text-dark-800 text-xl mb-2">Votre panier est vide</h2>
      <p className="text-dark-600/60 text-xs max-w-xs mb-6">
        Explorez la marketplace pour y ajouter de délicieux produits locaux.
      </p>
      <Button onClick={() => navigate('/marketplace')} className="px-6 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-green">
        Découvrir les produits
      </Button>
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Dynamic selector-like local calculations
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  const subTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (!items || items.length === 0) {
    return <PageVide />;
  }

  // Group items by shop/seller
  const groupedItems = items.reduce((groups, item) => {
    const shopId = item.shop_id || 'other';
    if (!groups[shopId]) {
      groups[shopId] = {
        shopName: item.shop_name || 'Boutique',
        items: []
      };
    }
    groups[shopId].items.push(item);
    return groups;
  }, {});

  const handleCheckout = () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour commander');
      navigate('/connexion');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-36 text-dark-900 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-surface-200 px-4 py-4 z-20 flex items-center gap-3 max-w-[var(--content-max-width)] mx-auto">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center transition-colors">
          <ArrowLeft size={20} className="text-dark-800" />
        </button>
        <div>
          <h1 className="font-display font-black text-dark-900 text-base leading-tight">Mon Panier</h1>
          <p className="text-[10px] text-dark-600/60 font-semibold">{totalQty} article(s)</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="px-4 mt-4 max-w-[var(--content-max-width)] mx-auto space-y-4">
        
        {/* Banner Escrow Protection */}
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-300/30 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="text-emerald-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-emerald-800 text-xs">Protection Séquestre Active</p>
            <p className="text-[10px] text-emerald-700 leading-normal mt-0.5">
              Votre argent est conservé en toute sécurité par MANG jusqu'à la livraison conforme de vos commandes.
            </p>
          </div>
        </div>

        {/* Grouped Shop List */}
        {Object.entries(groupedItems).map(([shopId, group]) => {
          const shopSubtotal = group.items.reduce((sum, item) => sum + item.price * item.qty, 0);
          return (
            <div key={shopId} className="bg-white rounded-3xl p-4 shadow-card border border-surface-150 space-y-3.5">
              {/* Shop Header */}
              <div className="flex items-center justify-between pb-2 border-b border-surface-100">
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-primary-600" />
                  <span className="font-bold text-xs text-dark-800">{group.shopName}</span>
                </div>
                <button onClick={() => navigate(`/boutique/${shopId}`)} className="text-[10px] text-primary-600 font-bold flex items-center gap-0.5">
                  Visiter <ChevronRight size={12} />
                </button>
              </div>

              {/* Items in Shop */}
              <div className="divide-y divide-surface-100">
                {group.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group">
                    {/* Item Image */}
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-100 flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🌾</div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-dark-800 truncate">{item.name}</p>
                      {item.variant_name && (
                        <p className="text-[10px] text-primary-600 font-bold mt-0.5 bg-primary-50 px-2 py-0.5 rounded-lg inline-block">
                          {item.variant_name}
                        </p>
                      )}
                      <p className="font-black text-sm text-dark-900 mt-1">
                        {item.price.toLocaleString('fr-FR')} F
                        <span className="text-[10px] text-dark-400 font-normal ml-0.5">/ {item.unit || 'u'}</span>
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end justify-between self-stretch py-0.5">
                      <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>

                      {/* Quantity Controller */}
                      <div className="flex items-center bg-surface-100 rounded-xl p-0.5 border border-surface-200">
                        <button
                          onClick={() => updateQuantity(item.id, item.qty - 1)}
                          disabled={item.qty <= 1}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-600 hover:bg-white disabled:opacity-30 active:scale-95 transition-all"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-600 hover:bg-white active:scale-95 transition-all"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shop Subtotal Footer */}
              <div className="flex justify-between items-baseline pt-2 border-t border-surface-100 text-xs font-semibold text-dark-600">
                <span>Sous-total boutique :</span>
                <span className="text-sm font-black text-dark-800">
                  {shopSubtotal.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          );
        })}

        {/* Global summary card */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-surface-150 space-y-3">
          <h2 className="font-display font-black text-dark-800 text-xs uppercase tracking-wider">Récapitulatif Financier</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-dark-600">
              <span>Articles ({totalQty})</span>
              <span>{subTotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-dark-600">
              <span>Livraison</span>
              <span className="text-emerald-600 font-bold">Gratuit</span>
            </div>
            <div className="flex justify-between items-baseline font-black text-base border-t border-surface-100 pt-3 text-dark-900">
              <span>Montant total</span>
              <span className="text-primary-700 font-display">
                {subTotal.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Status Preview (if logged in) */}
        {user && user.wallet && (
          <div className="p-4 rounded-3xl bg-white border border-surface-150 flex items-center justify-between gap-3 shadow-card">
            <div>
              <p className="text-[10px] text-dark-600/40 font-black uppercase tracking-wider">Solde Wallet MANG</p>
              <p className="font-display font-black text-sm text-dark-800 mt-1">
                {(user.wallet.balance_available || 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            {(user.wallet.balance_available || 0) >= subTotal ? (
              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-black text-[9px] uppercase tracking-wider border border-emerald-200">
                Solde suffisant ✅
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-red-50 text-red-700 font-black text-[9px] uppercase tracking-wider border border-red-200 animate-pulse">
                Solde insuffisant ⚠️
              </span>
            )}
          </div>
        )}

      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-surface-200 px-4 py-4 flex items-center justify-between gap-3 shadow-2xl safe-pb max-w-[var(--content-max-width)] mx-auto">
        <div className="flex flex-col">
          <p className="text-dark-600/50 text-[9px] font-bold uppercase tracking-wider">Total à payer</p>
          <p className="font-display font-black text-primary-700 text-lg leading-none mt-1">
            {subTotal.toLocaleString('fr-FR')} F
          </p>
        </div>

        <button onClick={handleCheckout}
          className="flex-1 py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-md shadow-primary-100">
          Passer la commande (→)
        </button>
      </div>
    </div>
  );
}
