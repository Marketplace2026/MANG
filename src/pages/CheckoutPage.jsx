import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useAuthStore } from '@/store';
import { toast } from 'react-hot-toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clearCart, checkoutWithWallet } = useCartStore();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // CALCUL DU TOTAL DIRECT ICI
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handlePay = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      navigate('/connexion');
      return;
    }
    if (items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error('Le nom, le téléphone et l\'adresse sont requis.');
      return;
    }
    
    setLoading(true);
    try {
      const walletBalance = user.wallet?.balance_available || 0;
      const deliveryAddress = `${name.trim()} - ${address.trim()}`;
      const success = await checkoutWithWallet(user.id, walletBalance, deliveryAddress, phone.trim());
      if (success) {
        navigate('/commandes');
      }
    } catch (e) {
      console.error(e);
      toast.error('Échec du paiement');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        <p>Votre panier est vide</p>
        <button onClick={() => navigate('/marketplace')} className="mt-4 bg-primary-600 text-white px-6 py-3 rounded">
          Retour au shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      
      {/* Section Adresse */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Adresse (obligatoire)</h2>
        <input
          type="text"
          placeholder="Nom"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <input
          type="tel"
          placeholder="Téléphone"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <input
          type="text"
          placeholder="Adresse"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </section>
      
      {/* Section Résumé */}
      <section className="space-y-2 border-t pt-4">
        <h2 className="text-lg font-semibold">Résumé Commande</h2>
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item.id} className="flex justify-between">
              <span>{item.name} x{item.qty}</span>
              <span>{new Intl.NumberFormat('fr-FR').format(item.price * item.qty)} XOF</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between font-bold text-xl mt-2 border-t pt-2">
          <span>Total</span>
          <span>{new Intl.NumberFormat('fr-FR').format(total)} XOF</span>
        </div>
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 rounded hover:bg-primary-700 transition disabled:opacity-50 font-black"
        >
          {loading ? 'Processing…' : 'Payer avec mon Wallet'}
        </button>
      </section>
    </div>
  );
}
