import React from 'react';
import { useCartStore } from '@/store/cartStore';
import { ShoppingCartIcon } from '@heroicons/react/outline';

export default function CartIcon() {
  const totalQty = useCartStore(state => state.totalQty);

  const handleClick = () => {
    const event = new CustomEvent('open-mini-cart');
    window.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
    >
      <ShoppingCartIcon className="h-6 w-6" />
      {totalQty > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {totalQty}
        </span>
      )}
    </button>
  );
}
