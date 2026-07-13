import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import { useCartStore } from '@/store';
import { Button } from '@/components/ui';

function PageVide() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface-50">
      <ShoppingCart size={40} className="text-primary-600 mb-4" />
      <h2 className="font-black text-lg mb-2">Votre panier est vide</h2>
      <p className="text-sm text-surface-600 mb-4">Découvrez nos produits</p>
      <Button onClick={() => navigate('/marketplace')} className="mt-6 px-6 bg-primary-600 text-white font-bold rounded-2xl">
        Découvrir les produits
      </Button>
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, subTotal, totalQty } = useCartStore();
  const navigate = useNavigate();

  if (items.length === 0) return <PageVide />;

  return (
    <div className="p-4 pb-36 bg-surface-50 min-h-screen">
      <h1 className="font-black text-2xl mb-4">Mon Panier ({totalQty})</h1>
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 py-3 border-b bg-white p-3 rounded-xl mb-2">
          {item.image && <img src={item.image} className="w-16 h-16 object-cover rounded"/>}
          <div className="flex-1">
            <span className="font-bold">{item.name}</span>
            <span className="block text-sm">{item.price.toLocaleString('fr-FR')} FCFA</span>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => updateQuantity(item.id, item.qty - 1)}><Minus size={16}/></button>
              <span>{item.qty}</span>
              <button onClick={() => updateQuantity(item.id, item.qty + 1)}><Plus size={16}/></button>
            </div>
          </div>
          <button onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
        </div>
      ))}
      <div className="font-bold text-lg mt-4">Total: {subTotal.toLocaleString('fr-FR')} FCFA</div>
      <button onClick={() => navigate('/checkout')} className="w-full mt-4 py-4 rounded-2xl bg-primary-600 text-white font-black">
        Commander
      </button>
    </div>
  );
}
