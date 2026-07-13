'use client' // <- IMPORTANT POUR NEXT.JS

import Link from 'next/link'; // <- REMPLACE useNavigate
import { useRouter } from 'next/navigation'; // <- POUR NAVIGUER
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui';
import Image from 'next/image'; // <- Mieux pour Next

// Empty cart view
function PageVide() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface-50">
      <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-4">
        <ShoppingCart size={40} className="text-primary-600" />
      </div>
      <h2 className="font-display font-black text-dark-800 text-lg mb-2">Votre panier est vide</h2>
      <p className="text-dark-600/50 text-xs max-w-xs">
        Explorez la marketplace pour ajouter des produits.
      </p>
      <Button onClick={() => router.push('/marketplace')} className="mt-6 px-6 bg-primary-600 text-white font-bold rounded-2xl shadow-green">
        Découvrir les produits
      </Button>
    </div>
  );
}

// List of cart items
function ListeDesItems({ items }) {
  const router = useRouter();
  const { removeItem, subTotal, totalQty } = useCartStore();

  return (
    <div className="min-h-screen bg-surface-50 pb-36">
      <div className="px-4 mt-4 max-w-[var(--content-max-width)] mx-auto space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-center py-2 border-b">
            {item.image && <Image src={item.image} width={64} height={64} className="w-16 h-16 object-cover rounded" alt={item.name}/>}
            <div className="flex-1 px-4">
              <span className="font-bold">{item.name}</span>
              <span className="block text-sm">{item.qty} × {item.price.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <button onClick={() => removeItem(item.id)} className="text-red-500">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <div className="flex justify-between items-center font-bold text-lg mt-4">
          <span>Total ({totalQty} articles)</span>
          <span>{subTotal.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <button
          onClick={() => router.push('/checkout')}
          className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-sm tracking-wide shadow-green"
        >
          Commander
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  const { items } = useCartStore();

  if (!items || items.length === 0) {
    return <PageVide />;
  }

  return <ListeDesItems items={items} />;
}
