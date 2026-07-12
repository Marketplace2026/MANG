import React, { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/outline';

export default function MiniCart() {
  const { items, totalQty, subTotal, updateQuantity, removeItem, clearCart } = useCartStore();
  const [open, setOpen] = useState(false);

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
      <div className="absolute inset-0 bg-black opacity-30" onClick={handleClose} />
      <aside className="relative w-80 bg-white shadow-xl h-full p-4 overflow-y-auto">
        <button onClick={handleClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
          <XMarkIcon className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-semibold mb-4">Mon Panier ({totalQty})</h2>
        {items.length === 0 ? (
          <p className="text-gray-500">Votre panier est vide.</p>
        ) : (
          <ul className="space-y-3">
            {items.map(item => (
              <li key={item.id} className="flex items-center space-x-3">
                {item.product.image && (
                  <img src={item.product.image} alt={item.product.name} className="w-12 h-12 object-cover rounded" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-gray-500">{item.product.unit}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="p-1 text-gray-600 hover:text-gray-800"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="px-2">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 text-gray-600 hover:text-gray-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  X
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t pt-4">
          <p className="text-lg font-semibold">Total : {new Intl.NumberFormat('fr-FR').format(subTotal)} XOF</p>
          <button
            onClick={() => {
              // navigate to cart page
              window.location.href = '/panier';
            }}
            className="mt-2 w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition"
          >
            Voir le panier
          </button>
        </div>
      </aside>
    </div>
  );
}
