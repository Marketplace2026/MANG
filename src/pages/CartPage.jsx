import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui';

// Page quand panier vide
function PageVide() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface-50">
      <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-4">
        <ShoppingCart size={40} className="text-primary-600" />
      </div>
      <h2 className="font-display font-black text-dark-800 text-lg mb-2">Votre panier est vide</h2>
      <p className="text-dark-600/50 text-xs max-w-xs mb-6">
        Explorez la marketplace pour ajouter des produits.
      </p>
      <Button 
        onClick={() => navigate('/marketplace')} 
        className="px-6 bg-primary-600 text-white font-bold rounded-2xl shadow-green"
      >
        Découvrir les produits
      </Button>
    </div>
  );
}

// Liste des produits dans le panier
function ListeDesItems({ items }) {
  const navigate = useNavigate();
  const { removeItem, updateQuantity, subTotal, totalQty } = useCartStore();

  return (
    <div className="min-h-screen bg-surface-50 pb-36">
      <div className="px-4 pt-4 max-w-[var(--content-max-width)] mx-auto">
        <h1 className="text-2xl font-black mb-4">Mon Panier ({totalQty})</h1>
        
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex gap-3 items-center p-3 bg-white rounded-2xl shadow-sm">
              {/* Image avec fallback si pas d'image */}
              {item.image ? (
                <img 
                  src={item.image} 
                  className="w-20 h-20 object-cover rounded-xl" 
                  alt={item.name}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={24} className="text-gray-400"/>
                </div>
              )}
              
              {/* Infos produit */}
              <div className="flex-1">
                <span className="font-bold text-dark-800 block">{item.name}</span>
                <span className="block text-sm text-primary-600 font-bold">
                  {item.price.toLocaleString('fr-FR')} FCFA
                </span>
                
                {/* Boutons + et - */}
                <div className="flex items-center gap-2 mt-2">
                  <button 
                    onClick={() => updateQuantity(item.id, item.qty - 1)}
                    className="p-1 border rounded-lg"
                  >
                    <Minus size={14}/>
                  </button>
                  <span className="font-bold">{item.qty}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.qty + 1)}
                    className="p-1 border rounded-lg"
                  >
                    <Plus size={14}/>
                  </button>
                </div>
              </div>

              {/* Bouton supprimer */}
              <button 
                onClick={() => removeItem(item.id)} 
                className="text-red-500 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* Total + Bouton Commander */}
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center font-black text-lg mb-3 max-w-[var(--content-max-width)] mx-auto">
            <span>Total ({totalQty} articles)</span>
            <span className="text-primary-600">{subTotal.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="w-full py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-sm tracking-wide shadow-green max-w-[var(--content-max-width)] mx-auto block"
          >
            Commander
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant principal
export default function CartPage() {
  const { items } = useCartStore();

  // Debug pour voir dans la console
  console.log("CART ITEMS:", items)

  if (!items || items.length === 0) {
    return <PageVide />;
  }

  return <ListeDesItems items={items} />;
}
