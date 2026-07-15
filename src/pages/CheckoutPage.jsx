import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCartStore, useAuthStore } from '@/store';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, ShieldCheck, Wallet, CheckCircle, 
  AlertTriangle, Phone, MapPin, User, ChevronRight, Store, Loader2
} from 'lucide-react';
import { BottomSheet, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const OPERATORS = [
  { id: 'MTN',    label: 'MTN Mobile Money', emoji: '🟡' },
  { id: 'Moov',   label: 'Moov Money',       emoji: '🔵' },
  { id: 'Celtis', label: 'Celtis Cash',      emoji: '🟢' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, clearCart, checkoutWithWallet } = useCartStore();
  const { user, wallet, refreshWallet } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Recharge State
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [operator, setOperator] = useState('');
  const [rechargePhone, setRechargePhone] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);

  // Form Validation states for visual indicators
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const walletBalance = wallet?.balance_available || 0;
  const isBalanceEnough = walletBalance >= total;

  // Refresh wallet on mount
  useEffect(() => {
    if (user) {
      refreshWallet();
    }
  }, [user]);

  // Handle redirect callback from FedaPay recharge
  useEffect(() => {
    const recharged = searchParams.get('recharged');
    if (recharged === 'true') {
      toast.success('Rechargement réussi ! Solde mis à jour.');
      if (user) {
        refreshWallet();
      }
    }
  }, [searchParams, user]);

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
      toast.error('Veuillez remplir tous les champs de livraison obligatoires.');
      setNameTouched(true);
      setPhoneTouched(true);
      setAddressTouched(true);
      return;
    }

    if (!isBalanceEnough) {
      toast.error('Votre solde Wallet est insuffisant pour finaliser cet achat.');
      return;
    }
    
    setLoading(true);
    try {
      const deliveryAddress = `${name.trim()} - ${address.trim()}`;
      const success = await checkoutWithWallet(user.id, walletBalance, deliveryAddress, phone.trim());
      if (success) {
        // Refresh profile / wallet state after successful deduction
        await refreshWallet();
        navigate('/commandes');
      }
    } catch (e) {
      console.error(e);
      toast.error('Échec du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!operator) return toast.error('Sélectionnez un opérateur');
    if (!rechargePhone.trim()) return toast.error('Entrez le numéro Mobile Money');
    const amt = parseInt(rechargeAmount);
    if (!amt || amt < 100) return toast.error('Montant minimum : 100 FCFA');

    setRechargeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const meta = user.user_metadata || {};
      const fname = meta.full_name?.split(' ')[0] || meta.username || 'Client';
      const lname = meta.full_name?.split(' ').slice(1).join(' ') || 'MANG';

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transaction`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({
          user_id: user.id, 
          type: 'deposit', 
          operator,
          phone: rechargePhone.trim(), 
          amount: amt, 
          currency: 'XOF',
          description: 'Recharge MANG Wallet via Checkout',
          email: user.email || `${user.id}@mang.app`,
          customer: {
            firstname: fname, 
            lastname: lname,
            email: user.email || `${user.id}@mang.app`,
            phone_number: { number: rechargePhone.trim(), country: 'BJ' },
          },
          redirect_url: `${window.location.origin}/checkout?recharged=true`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || JSON.stringify(data));
      
      const url = data?.transaction?.payment_url
             || data?.transaction?.['v1/transaction']?.payment_url
             || data?.payment_url;
             
      if (!url) throw new Error('Lien de paiement introuvable — vérifiez la config FedaPay');
      
      // Redirect to FedaPay checkout page
      window.location.href = url;
    } catch (err) {
      console.error('Recharge error:', err);
      toast.error(err.message || 'Erreur lors de la création de la transaction');
    } finally {
      setRechargeLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface-50">
        <ShoppingCart size={48} className="text-primary-600 mb-4 opacity-40 animate-pulse" />
        <h2 className="font-display font-black text-dark-800 text-lg mb-2">Votre panier est vide</h2>
        <Button onClick={() => navigate('/marketplace')} className="mt-4 bg-primary-600 text-white font-bold rounded-2xl">
          Retour au shop
        </Button>
      </div>
    );
  }

  // Group items by shop for mini review
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

  return (
    <div className="min-h-screen bg-surface-50 pb-36 text-dark-900 font-sans">
      
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-surface-200 px-4 py-4 z-20 flex items-center gap-3 max-w-[var(--content-max-width)] mx-auto">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl hover:bg-surface-100 flex items-center justify-center transition-colors">
          <ArrowLeft size={20} className="text-dark-800" />
        </button>
        <div>
          <h1 className="font-display font-black text-dark-900 text-base leading-tight">Validation de commande</h1>
          <p className="text-[10px] text-dark-600/60 font-semibold">Paiement unique via Wallet</p>
        </div>
      </div>

      <div className="px-4 mt-4 max-w-[var(--content-max-width)] mx-auto space-y-4">
        
        {/* Banner Rassurance Escrow */}
        <div className="p-3.5 bg-primary-600/10 border border-primary-500/20 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="text-primary-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold text-primary-800 text-xs">Achat 100% Sécurisé</p>
            <p className="text-[10px] text-primary-700 leading-normal mt-0.5">
              Vos fonds sont mis sous séquestre sécurisé. Le vendeur ne sera payé qu'après confirmation de votre livraison.
            </p>
          </div>
        </div>

        {/* Section 1: Informations de livraison */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-surface-150 space-y-4">
          <h2 className="font-display font-black text-dark-800 text-xs uppercase tracking-wider pl-0.5">
            👤 Informations de livraison
          </h2>
          
          <div className="space-y-3.5">
            {/* Input Nom */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
                <User size={16} />
              </div>
              <input
                type="text"
                placeholder="Nom complet du destinataire *"
                value={name}
                onBlur={() => setNameTouched(true)}
                onChange={e => setName(e.target.value)}
                className={`w-full bg-surface-50 border rounded-2xl pl-10 pr-4 py-3.5 text-xs font-semibold outline-none transition-all ${
                  nameTouched 
                    ? name.trim() 
                      ? 'border-emerald-500 focus:border-emerald-600' 
                      : 'border-red-500 focus:border-red-600'
                    : 'border-surface-200 focus:border-primary-500'
                }`}
              />
            </div>

            {/* Input Téléphone */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                placeholder="Numéro de téléphone de livraison *"
                value={phone}
                onBlur={() => setPhoneTouched(true)}
                onChange={e => setPhone(e.target.value)}
                className={`w-full bg-surface-50 border rounded-2xl pl-10 pr-4 py-3.5 text-xs font-semibold outline-none transition-all ${
                  phoneTouched 
                    ? phone.trim() 
                      ? 'border-emerald-500 focus:border-emerald-600' 
                      : 'border-red-500 focus:border-red-600'
                    : 'border-surface-200 focus:border-primary-500'
                }`}
              />
            </div>

            {/* Input Adresse */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">
                <MapPin size={16} />
              </div>
              <input
                type="text"
                placeholder="Adresse de livraison exacte (Ville, Quartier...) *"
                value={address}
                onBlur={() => setAddressTouched(true)}
                onChange={e => setAddress(e.target.value)}
                className={`w-full bg-surface-50 border rounded-2xl pl-10 pr-4 py-3.5 text-xs font-semibold outline-none transition-all ${
                  addressTouched 
                    ? address.trim() 
                      ? 'border-emerald-500 focus:border-emerald-600' 
                      : 'border-red-500 focus:border-red-600'
                    : 'border-surface-200 focus:border-primary-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Récapitulatif par boutique */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-surface-150 space-y-4">
          <h2 className="font-display font-black text-dark-800 text-xs uppercase tracking-wider pl-0.5">
            📦 Détail de vos commandes
          </h2>
          
          <div className="space-y-4 divide-y divide-surface-100">
            {Object.entries(groupedItems).map(([shopId, group]) => (
              <div key={shopId} className="pt-3 first:pt-0 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-dark-800">
                  <Store size={14} className="text-primary-600" />
                  <span>{group.shopName}</span>
                </div>
                
                <div className="space-y-1.5 pl-5">
                  {group.items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs text-dark-600">
                      <span>{item.qty}x {item.name}</span>
                      <span className="font-bold">{(item.price * item.qty).toLocaleString('fr-FR')} F</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Portefeuille & Paiement */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-surface-150 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-dark-800 text-xs uppercase tracking-wider pl-0.5">
              💳 Méthode de Paiement
            </h2>
            <span className="px-2 py-0.5 rounded-lg bg-primary-100 text-primary-700 font-bold text-[9px]">
              Mang Wallet
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-md">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-[10px] text-dark-600/40 font-black uppercase tracking-wider">Solde disponible</p>
                <p className="font-display font-black text-sm text-dark-900 mt-0.5">
                  {walletBalance.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            {isBalanceEnough ? (
              <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                <CheckCircle size={14} /> Solde OK
              </div>
            ) : (
              <button 
                onClick={() => {
                  setRechargeAmount((total - walletBalance).toString());
                  setRechargeOpen(true);
                }}
                className="px-3.5 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-1"
              >
                <AlertTriangle size={13} className="animate-pulse" /> Recharger
              </button>
            )}
          </div>

          {!isBalanceEnough && (
            <div className="p-3 bg-red-500/10 border border-red-300/20 rounded-2xl text-[10px] text-red-700 leading-normal">
              ⚠️ Votre solde est insuffisant. Il vous manque <strong>{(total - walletBalance).toLocaleString('fr-FR')} FCFA</strong>. Cliquez sur <strong>Recharger</strong> ci-dessus pour créditer votre compte instantanément par MTN ou Moov Money.
            </div>
          )}
        </div>

        {/* Section 4: Récapitulatif Financier */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-surface-150 space-y-3">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-dark-600">
              <span>Articles</span>
              <span>{total.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-dark-600">
              <span>Livraison</span>
              <span className="text-emerald-600 font-bold">Gratuit</span>
            </div>
            <div className="flex justify-between items-baseline font-black text-base border-t border-surface-100 pt-3 text-dark-900">
              <span>Total final</span>
              <span className="text-primary-700 font-display">
                {total.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-surface-200 px-4 py-4 flex items-center justify-between gap-3 shadow-2xl safe-pb max-w-[var(--content-max-width)] mx-auto">
        <div className="flex flex-col">
          <p className="text-dark-600/50 text-[9px] font-bold uppercase tracking-wider">Montant dû</p>
          <p className="font-display font-black text-primary-700 text-lg leading-none mt-1">
            {total.toLocaleString('fr-FR')} F
          </p>
        </div>

        <button 
          onClick={handlePay}
          disabled={loading || !isBalanceEnough}
          className={`flex-1 py-4 rounded-2xl font-black text-xs active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-md ${
            isBalanceEnough 
              ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-100' 
              : 'bg-surface-200 text-dark-400 cursor-not-allowed shadow-none'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <ShieldCheck size={14} />
              Payer avec mon Wallet MANG
            </>
          )}
        </button>
      </div>

      {/* BOTTOM SHEET RECHARGE EN 1-CLIC */}
      <BottomSheet open={rechargeOpen} onClose={() => setRechargeOpen(false)} title="💰 Recharge Express via Mobile Money">
        <div className="px-4 pt-2 pb-8 space-y-4">
          <div className="p-3 bg-primary-600/10 border border-primary-500/10 rounded-2xl text-[10px] text-primary-700 leading-normal">
            Sécurisé par <strong>FedaPay</strong>. Entrez vos informations pour être redirigé vers le paiement par code USSD / Mobile Money de votre opérateur.
          </div>

          {/* Opérateurs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-dark-700 pl-1">Choisir l'opérateur</label>
            <div className="grid grid-cols-3 gap-2">
              {OPERATORS.map(op => (
                <button
                  key={op.id}
                  onClick={() => setOperator(op.id)}
                  className={`flex flex-col items-center py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                    operator === op.id 
                      ? 'border-primary-600 bg-primary-50/50 text-primary-800' 
                      : 'border-surface-200 bg-white text-dark-700'
                  }`}
                >
                  <span className="text-2xl mb-0.5">{op.emoji}</span>
                  <span className="text-[10px] font-black leading-tight text-center">{op.id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Numéro Mobile Money */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-dark-700 pl-1">Numéro Mobile Money (Bénin)</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="tel"
                placeholder="Ex: 97000000"
                value={rechargePhone}
                onChange={e => setRechargePhone(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl pl-9 pr-4 py-3 text-xs font-bold outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-dark-700 pl-1">Montant à recharger (FCFA)</label>
            <input
              type="number"
              placeholder="Montant"
              value={rechargeAmount}
              onChange={e => setRechargeAmount(e.target.value)}
              className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-primary-500"
            />
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {[1000, 2000, 5000, 10000, 25000].map(p => (
              <button
                key={p}
                onClick={() => setRechargeAmount(p.toString())}
                className="px-3 py-1.5 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 text-[10px] font-bold text-dark-700 transition-colors"
              >
                +{p.toLocaleString('fr-FR')} F
              </button>
            ))}
          </div>

          {/* Bouton de Recharge */}
          <Button 
            onClick={handleRecharge} 
            disabled={rechargeLoading} 
            className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-2xl flex items-center justify-center gap-1.5 mt-2"
          >
            {rechargeLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Redirection FedaPay...
              </>
            ) : (
              'Recharger et Payer'
            )}
          </Button>
        </div>
      </BottomSheet>

    </div>
  );
}
