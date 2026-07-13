import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { ShoppingCart } from 'lucide-react';

export default function CartPage() {
  const { items } = useCartStore();
  const [localStorageData, setLocalStorageData] = useState(null);
  const navigate = useNavigate();

  // SCANNER : On lit tout
  useEffect(() => {
    const brut = localStorage.getItem('cart-storage');
    setLocalStorageData(brut);
    console.log("1. CE QUE ZUSTAND VOIT:", items);
    console.log("2. CE QUE LOCALSTORAGE A:", brut);
  }, [items]);

  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-black mb-4">DEBUG PANIER MANGAFRICA</h1>
      
      {/* BLOC 1 : CE QUE LE STORE DIT */}
      <div className="bg-white p-4 rounded-xl mb-4 shadow">
        <h2 className="font-bold text-lg mb-2">1. Zustand Store `items`</h2>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(items, null, 2)}
        </pre>
        <p className="mt-2 font-bold">Nombre: {items.length}</p>
      </div>

      {/* BLOC 2 : CE QUE LOCALSTORAGE A */}
      <div className="bg-white p-4 rounded-xl mb-4 shadow">
        <h2 className="font-bold text-lg mb-2">2. LocalStorage `cart-storage` Brut</h2>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {localStorageData || "RIEN TROUVÉ"}
        </pre>
      </div>

      {/* BLOC 3 : RÉSULTAT */}
      {items.length === 0? (
        <div className="text-center py-10">
          <ShoppingCart size={40} className="mx-auto text-gray-400 mb-2"/>
          <h2 className="font-black text-lg">Votre panier est vide</h2>
          <button 
            onClick={() => navigate('/marketplace')} 
            className="mt-4 px-6 py-3 bg-primary-600 text-white font-bold rounded-2xl"
          >
            Découvrir les produits
          </button>
        </div>
      ) : (
        <div className="bg-green-100 p-4 rounded-xl">
          <p className="font-bold text-green-800">VICTOIRE! Le store a {items.length} articles</p>
        </div>
      )}
    </div>
  );
}
