import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store';
import { toast } from 'react-hot-toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subTotal, clearCart, checkoutWithWallet } = useCartStore();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      navigate('/connexion');
      return;
    }
    setLoading(true);
    try {
      // Assume we have wallet balance in user.wallet?.balance_available
      const walletBalance = user.wallet?.balance_available || 0;
      await checkoutWithWallet(user.id, walletBalance);
      clearCart();
      navigate('/commandes');
    } catch (e) {
      console.error(e);
      toast.error('Échec du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {/* Section Adresse */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Adresse (optionnel)</h2>
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
              <span>{item.product.name} x{item.quantity}</span>
              <span>{new Intl.NumberFormat('fr-FR').format(item.product.price * item.quantity)} XOF</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between font-bold text-xl mt-2">
          <span>Total</span>
          <span>{new Intl.NumberFormat('fr-FR').format(subTotal)} XOF</span>
        </div>
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 rounded hover:bg-primary-700 transition disabled:opacity-50"
        >
          {loading ? 'Processing…' : 'Payer avec mon Wallet'}
        </button>
      </section>
    </div>
  );
}
