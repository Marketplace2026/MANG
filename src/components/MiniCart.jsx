import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store';
import { X, Plus, Minus, Trash2 } from 'lucide-react';

const formatFCFA = (val) => Math.round(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

export default function MiniCart() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem } = useCartStore();
  const [open, setOpen] = useState(false);

  // Dynamic selector-like local calculations
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  const subTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Listen for custom event to open/close mini cart
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-mini-cart', handler);
    return () => window.removeEventListener('open-mini-cart', handler);
  }, []);

  const handleClose = () => setOpen(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity" onClick={handleClose} />
      
      {/* Drawer */}
      <aside className="relative w-85 max-w-full bg-white shadow-2xl h-full flex flex-col p-5 overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-150">
          <h2 className="text-lg font-display font-black text-dark-800">Mon Panier ({totalQty})</h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors">
            <X size={18} className="text-dark-600" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 no-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
              <span className="text-4xl mb-2">🛒</span>
              <p className="text-sm font-semibold text-dark-600">Votre panier est vide.</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-surface-50 border border-surface-150">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">🌾</div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-dark-800 truncate">{item.name}</p>
                  {item.variant_name && (
                    <p className="text-[10px] text-primary-600 font-bold mt-0.5">{item.variant_name}</p>
                  )}
                  <p className="text-xs font-black text-primary-700 mt-1">
                    {formatFCFA(item.price)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between h-full gap-2">
                  <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-600 p-1">
                    <Trash2 size={14} />
                  </button>
                  
                  <div className="flex items-center gap-1.5 bg-white border border-gray-150 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, item.qty - 1)}
                      disabled={item.qty <= 1}
                      className="w-5 h-5 rounded flex items-center justify-center text-dark-600 hover:bg-surface-100 disabled:opacity-30"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.qty + 1)}
                      className="w-5 h-5 rounded flex items-center justify-center text-dark-600 hover:bg-surface-100"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="pt-4 border-t border-gray-150 space-y-3 bg-white">
            <div className="flex justify-between items-baseline font-bold text-sm">
              <span className="text-dark-600">Total :</span>
              <span className="text-lg text-primary-700 font-black">
                {formatFCFA(subTotal)}
              </span>
            </div>
            
            <button
              onClick={() => {
                handleClose();
                navigate('/panier');
              }}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-2xl font-black text-xs shadow-green active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              Voir le panier
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
