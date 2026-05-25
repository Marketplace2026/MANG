import { useState, useEffect, useRef } from 'react'
import {
  Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw,
  Copy, Check, Eye, EyeOff, Send, Download,
  Shield, ChevronRight, X, Loader2, TrendingUp,
  TrendingDown, Coins, Phone, AlertCircle
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'

// ============================================================
// CONFIG
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const FEDAPAY_PUBLIC_KEY = import.meta.env.VITE_FEDAPAY_PUBLIC_KEY || 'pk_live_dzW1Lrl6pm90lGjdrzzUxTk9'

const OPERATORS = [
  { id: 'MTN',    label: 'MTN Mobile Money', emoji: '🟡', color: '#ffcc00' },
  { id: 'Moov',   label: 'Moov Money',       emoji: '🔵', color: '#0066ff' },
  { id: 'Celtis', label: 'Celtis Cash',      emoji: '🟢', color: '#00aa44' },
]

const TX_TYPES = {
  deposit:           { label: 'Rechargement',      icon: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50', sign: '+' },
  withdraw:          { label: 'Retrait',            icon: '💸', color: 'text-red-600',     bg: 'bg-red-50',     sign: '-' },
  transfer:          { label: 'Transfert',          icon: '🔄', color: 'text-blue-600',    bg: 'bg-blue-50',    sign: '±' },
  transfer_sent:     { label: 'Transfert envoyé',  icon: '📤', color: 'text-red-600',     bg: 'bg-red-50',     sign: '-' },
  transfer_received: { label: 'Transfert reçu',    icon: '📥', color: 'text-emerald-600', bg: 'bg-emerald-50', sign: '+' },
  order_payment:     { label: 'Paiement commande', icon: '🛒', color: 'text-red-600',     bg: 'bg-red-50',     sign: '-' },
  order_received:    { label: 'Vente reçue',       icon: '💵', color: 'text-emerald-600', bg: 'bg-emerald-50', sign: '+' },
  subscription:      { label: 'Abonnement',        icon: '⭐', color: 'text-red-600',     bg: 'bg-red-50',     sign: '-' },
}

function getTxConfig(tx) {
  const type = (tx.transaction_type || tx.type || '').toLowerCase()
  if (type.includes('deposit')) return TX_TYPES.deposit
  if (type.includes('withdraw')) return TX_TYPES.withdraw
  if (type.includes('transfer_sent')) return TX_TYPES.transfer_sent
  if (type.includes('transfer_received')) return TX_TYPES.transfer_received
  if (type.includes('transfer')) return Number(tx.amount) < 0 ? TX_TYPES.transfer_sent : TX_TYPES.transfer_received
  if (type.includes('order') || type.includes('purchase')) return Number(tx.amount) < 0 ? TX_TYPES.order_payment : TX_TYPES.order_received
  if (type.includes('premium') || type.includes('subscription')) return TX_TYPES.subscription
  return { label: 'Transaction', icon: '💳', color: 'text-gray-600', bg: 'bg-gray-50', sign: Number(tx.amount) > 0 ? '+' : '-' }
}

// ── Hash SHA-256 ───────────────────────────────────────────
async function generateHash(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Hash PIN ───────────────────────────────────────────────
async function hashPin(pin) {
  return generateHash(pin)
}

// ============================================================
// BOTTOM SHEET GÉNÉRIQUE
// ============================================================
function Sheet({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] flex flex-col"
        style={{ animation: 'slideUp 0.3s ease' }}>
        <div className="flex justify-center pt-3 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}

// ============================================================
// PIN INPUT
// ============================================================
function PinInput({ value, onChange, error }) {
  const inputs = useRef([])
  const digits = value.split('')

  const handleChange = (i, v) => {
    if (!/^\d*$/.test(v)) return
    const arr = digits.slice()
    arr[i] = v.slice(-1)
    const newVal = arr.join('').slice(0, 4)
    onChange(newVal)
    if (v && i < 3) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  return (
    <div className="flex justify-center gap-4 py-2">
      {[0, 1, 2, 3].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className={clsx(
            'w-14 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all',
            error ? 'border-red-400 bg-red-50' : digits[i] ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 focus:border-green-500'
          )}
        />
      ))}
    </div>
  )
}

// ============================================================
// MODAL DÉPÔT — FEDAPAY
// ============================================================
function DepositSheet({ open, onClose, user, wallet, onSuccess }) {
  const [operator, setOperator] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const PRESETS = [1000, 2000, 5000, 10000, 25000, 50000]

  const handleDeposit = async () => {
    if (!operator) return toast.error('Sélectionnez un opérateur')
    if (!phone.trim()) return toast.error('Entrez votre numéro Mobile Money')
    const amt = parseInt(amount)
    if (!amt || amt < 100) return toast.error('Montant minimum : 100 FCFA')

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée')

      const payload = {
        user_id: user.id,
        type: 'deposit',
        operator,
        phone: phone.trim(),
        amount: amt,
        currency: 'XOF',
        description: 'Recharge portefeuille MANG',
        email: user.email,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Client',
        last_name: user.user_metadata?.full_name?.split(' ')[1] || 'MANG',
        metadata: { user_id: user.id, operator, phone: phone.trim(), source: 'app' },
        redirect_url: `${window.location.origin}/portefeuille?recharged=${amt}`,
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Erreur serveur FedaPay')
      }

      const data = await res.json()
      const paymentUrl =
        data?.transaction?.payment_url ||
        data?.transaction?.['v1/transaction']?.payment_url

      if (!paymentUrl) throw new Error('Lien de paiement introuvable')

      // Redirection FedaPay
      window.location.href = paymentUrl

    } catch (err) {
      toast.error(err.message || 'Erreur lors du dépôt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="💰 Recharger mon portefeuille">
      <div className="px-5 py-4 space-y-5 pb-10">

        {/* Opérateurs */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-3">Opérateur Mobile Money</p>
          <div className="grid grid-cols-3 gap-3">
            {OPERATORS.map(op => (
              <button key={op.id} onClick={() => setOperator(op.id)}
                className={clsx(
                  'flex flex-col items-center py-4 rounded-2xl border-2 transition-all font-bold text-sm',
                  operator === op.id ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600'
                )}>
                <span className="text-3xl mb-1">{op.emoji}</span>
                <span className="text-[11px] text-center leading-tight">{op.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Téléphone */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">Numéro Mobile Money</p>
          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="tel" placeholder="Ex: 22961000000" value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>

        {/* Montant */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">Montant (FCFA)</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map(p => (
              <button key={p} onClick={() => setAmount(String(p))}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                  amount === String(p) ? 'bg-green-600 text-white border-green-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                )}>
                {p.toLocaleString('fr-FR')}
              </button>
            ))}
          </div>
          <input type="number" placeholder="Autre montant" value={amount}
            onChange={e => setAmount(e.target.value)} min="100"
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>

        {/* Récap */}
        {amount && parseInt(amount) >= 100 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Montant à recharger</span>
              <span className="font-bold text-green-700">{parseInt(amount).toLocaleString('fr-FR')} FCFA</span>
            </div>
            {operator && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Via</span>
                <span className="font-bold text-green-700">{OPERATORS.find(o => o.id === operator)?.label}</span>
              </div>
            )}
          </div>
        )}

        <button onClick={handleDeposit} disabled={loading}
          className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl text-base active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={20} className="animate-spin" /> : '💳 Payer maintenant'}
        </button>

        <p className="text-center text-xs text-gray-400">
          🔒 Paiement sécurisé via FedaPay
        </p>
      </div>
    </Sheet>
  )
}

// ============================================================
// MODAL RETRAIT
// ============================================================
function WithdrawSheet({ open, onClose, user, wallet, onSuccess }) {
  const [operator, setOperator] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState(false)

  const balance = wallet ? wallet.balance_available / 100 : 0

  const handleContinue = () => {
    if (!operator) return toast.error('Sélectionnez un opérateur')
    if (!phone.trim()) return toast.error('Entrez votre numéro')
    const amt = parseInt(amount)
    if (!amt || amt < 500) return toast.error('Minimum 500 FCFA')
    if (amt > balance) return toast.error('Solde insuffisant')
    setStep(2)
  }

  const handleWithdraw = async () => {
    if (pin.length !== 4) return
    setLoading(true)
    setPinError(false)

    try {
      const pinHash = await hashPin(pin)

      // Vérifier PIN
      const { data: walletData } = await supabase
        .from('wallets').select('pin_hash, pin_set').eq('user_id', user.id).single()

      if (!walletData?.pin_set) {
        setLoading(false)
        return toast.error('Configurez votre PIN d\'abord')
      }
      if (walletData.pin_hash !== pinHash) {
        setPinError(true)
        setPin('')
        setLoading(false)
        return
      }

      // Appel Edge Function retrait
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          type: 'withdraw',
          operator,
          phone: phone.trim(),
          amount: parseInt(amount),
          currency: 'XOF',
          description: 'Retrait vers Mobile Money',
          email: user.email,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur retrait')

      toast.success('Retrait initié ! Vous recevrez votre argent sous peu.')
      onSuccess()
      onClose()
      setStep(1); setPin(''); setAmount(''); setPhone(''); setOperator('')

    } catch (err) {
      toast.error(err.message || 'Erreur lors du retrait')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { onClose(); setStep(1); setPin('') }} title="💸 Retrait Mobile Money">
      <div className="px-5 py-4 space-y-4 pb-10">
        {step === 1 ? (
          <>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Opérateur</p>
              <div className="grid grid-cols-3 gap-3">
                {OPERATORS.map(op => (
                  <button key={op.id} onClick={() => setOperator(op.id)}
                    className={clsx('flex flex-col items-center py-3 rounded-2xl border-2 transition-all text-sm font-bold',
                      operator === op.id ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600')}>
                    <span className="text-2xl mb-1">{op.emoji}</span>
                    <span className="text-[10px] text-center">{op.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Numéro Mobile Money</p>
              <input type="tel" placeholder="Ex: 22961000000" value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>

            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Montant (FCFA)</p>
              <input type="number" placeholder="Montant à retirer" value={amount}
                onChange={e => setAmount(e.target.value)} min="500"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              <p className="text-xs text-gray-400 mt-1 pl-1">Solde disponible : {balance.toLocaleString('fr-FR')} FCFA</p>
            </div>

            <button onClick={handleContinue}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl text-base active:scale-95 transition-transform">
              Continuer →
            </button>
          </>
        ) : (
          <>
            <div className="bg-gray-800 rounded-2xl p-4 text-center">
              <p className="text-white/60 text-sm">Montant du retrait</p>
              <p className="text-white font-black text-3xl">{parseInt(amount).toLocaleString('fr-FR')} FCFA</p>
              <p className="text-white/50 text-xs mt-1">→ {phone} via {OPERATORS.find(o => o.id === operator)?.label}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <Shield size={20} className="text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm font-semibold">Entrez votre PIN pour confirmer</p>
            </div>

            <PinInput value={pin} onChange={setPin} error={pinError} />
            {pinError && <p className="text-center text-red-500 text-xs font-semibold">❌ PIN incorrect</p>}

            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setPin('') }}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl">Retour</button>
              <button onClick={handleWithdraw} disabled={loading || pin.length !== 4}
                className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

// ============================================================
// MODAL TRANSFERT
// ============================================================
function TransferSheet({ open, onClose, user, wallet, onSuccess }) {
  const [receiverNum, setReceiverNum] = useState('')
  const [receiver, setReceiver] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState(false)

  const balance = wallet ? wallet.balance_available / 100 : 0

  const handleNumChange = async (v) => {
    setReceiverNum(v)
    setReceiver(null)
    if (v.length < 10) return
    setLookingUp(true)
    const { data } = await supabase
      .from('wallets')
      .select('*, user:profiles!wallets_user_id_fkey(username, full_name, avatar_url)')
      .eq('wallet_number', v.trim())
      .single()
    setLookingUp(false)
    if (data && data.user_id !== user.id) setReceiver(data)
    else if (data?.user_id === user.id) toast.error('Vous ne pouvez pas vous transférer à vous-même')
  }

  const handleContinue = () => {
    if (!receiver) return toast.error('Destinataire introuvable')
    const amt = parseInt(amount)
    if (!amt || amt < 100) return toast.error('Minimum 100 FCFA')
    if (amt > balance) return toast.error('Solde insuffisant')
    setStep(2)
  }

  const handleTransfer = async () => {
    if (pin.length !== 4) return
    setLoading(true)
    setPinError(false)

    try {
      const pinHash = await hashPin(pin)

      // Appel RPC
      const { error } = await supabase.rpc('transfer_money', {
        sender_uuid: user.id,
        receiver_wallet_number: receiverNum.trim(),
        transfer_amount: parseInt(amount),
        user_pin: pin,
      })

      if (error) {
        if (error.message?.includes('PIN') || error.message?.includes('pin')) {
          setPinError(true); setPin('')
        } else {
          toast.error(error.message || 'Erreur transfert')
        }
        setLoading(false)
        return
      }

      toast.success(`✅ ${parseInt(amount).toLocaleString('fr-FR')} FCFA envoyés à @${receiver.user?.username}`)
      onSuccess()
      onClose()
      setStep(1); setPin(''); setAmount(''); setReceiverNum(''); setReceiver(null)

    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { onClose(); setStep(1); setPin('') }} title="🔄 Transfert d'argent">
      <div className="px-5 py-4 space-y-4 pb-10">
        {step === 1 ? (
          <>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Numéro de wallet destinataire</p>
              <input type="text" inputMode="numeric" placeholder="Ex: 0123456789"
                value={receiverNum} onChange={e => handleNumChange(e.target.value)}
                maxLength={10}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400" />
              {lookingUp && <p className="text-xs text-green-600 mt-1 pl-1">🔍 Recherche...</p>}
            </div>

            {receiver && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-green-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {receiver.user?.avatar_url
                    ? <img src={receiver.user.avatar_url} className="w-full h-full object-cover" />
                    : <span className="text-lg">👤</span>
                  }
                </div>
                <div>
                  <p className="font-bold text-green-800 text-sm">{receiver.user?.full_name || receiver.user?.username}</p>
                  <p className="text-green-600 text-xs">@{receiver.user?.username} · {receiver.wallet_number}</p>
                </div>
                <Check size={20} className="text-green-600 ml-auto" />
              </div>
            )}

            {receiverNum.length === 10 && !receiver && !lookingUp && (
              <p className="text-red-500 text-xs font-medium pl-1">❌ Aucun wallet trouvé</p>
            )}

            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Montant (FCFA)</p>
              <input type="number" placeholder="Ex: 5000" value={amount}
                onChange={e => setAmount(e.target.value)} min="100"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              <p className="text-xs text-gray-400 mt-1 pl-1">Solde : {balance.toLocaleString('fr-FR')} FCFA</p>
            </div>

            {receiver && amount && parseInt(amount) >= 100 && (
              <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Envoi à</span>
                  <span className="text-white font-bold">@{receiver.user?.username}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Montant</span>
                  <span className="text-white font-bold">{parseInt(amount).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/10 pt-2">
                  <span className="text-white/40">Solde restant estimé</span>
                  <span className="text-white/60">{(balance - parseInt(amount)).toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            )}

            <button onClick={handleContinue} disabled={!receiver || !amount || parseInt(amount) < 100}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl text-base active:scale-95 transition-transform disabled:opacity-60">
              Continuer →
            </button>
          </>
        ) : (
          <>
            <div className="bg-gray-800 rounded-2xl p-4 text-center">
              <p className="text-white/60 text-sm">Transfert à @{receiver?.user?.username}</p>
              <p className="text-white font-black text-3xl">{parseInt(amount).toLocaleString('fr-FR')} FCFA</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <Shield size={20} className="text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm font-semibold">Entrez votre PIN pour confirmer</p>
            </div>

            <PinInput value={pin} onChange={setPin} error={pinError} />
            {pinError && <p className="text-center text-red-500 text-xs font-semibold">❌ PIN incorrect</p>}

            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setPin('') }}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl">Retour</button>
              <button onClick={handleTransfer} disabled={loading || pin.length !== 4}
                className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

// ============================================================
// MODAL PIN SETUP
// ============================================================
function PinSetupSheet({ open, onClose, user }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState(false)

  const handleSetPin = async () => {
    if (step === 1) {
      if (pin.length !== 4) return
      setStep(2)
      return
    }
    if (confirmPin !== pin) {
      setPinError(true)
      setConfirmPin('')
      return
    }
    setLoading(true)
    try {
      const pinHash = await hashPin(pin)
      await supabase.from('wallets').update({ pin_hash: pinHash, pin_set: true }).eq('user_id', user.id)
      toast.success('🔐 PIN configuré avec succès !')
      setPin(''); setConfirmPin(''); setStep(1)
      onClose()
    } catch {
      toast.error('Erreur configuration PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { setStep(1); setPin(''); setConfirmPin(''); onClose() }} title="🔐 Code PIN Wallet">
      <div className="px-5 py-4 space-y-5 pb-10">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <Shield size={20} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800 text-sm">Sécurisez votre wallet</p>
            <p className="text-green-600 text-xs">Le PIN est requis pour payer et transférer</p>
          </div>
        </div>

        <div className="text-center">
          <p className="font-bold text-gray-800 text-base">
            {step === 1 ? 'Choisissez un PIN à 4 chiffres' : 'Confirmez votre PIN'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {step === 1 ? 'Ce code protège vos transactions' : 'Retapez le même code PIN'}
          </p>
        </div>

        {step === 1
          ? <PinInput value={pin} onChange={v => { setPin(v); setPinError(false) }} error={pinError} />
          : <PinInput value={confirmPin} onChange={v => { setConfirmPin(v); setPinError(false) }} error={pinError} />
        }
        {pinError && <p className="text-center text-red-500 text-xs font-semibold">❌ Les PIN ne correspondent pas</p>}

        <button onClick={handleSetPin} disabled={loading || (step === 1 ? pin.length !== 4 : confirmPin.length !== 4)}
          className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : step === 1 ? 'Continuer →' : 'Confirmer le PIN'}
        </button>
      </div>
    </Sheet>
  )
}

// ============================================================
// MODAL DÉTAIL TRANSACTION + REÇU PDF
// ============================================================
function TxDetailSheet({ open, onClose, tx }) {
  if (!tx) return null
  const cfg = getTxConfig(tx)
  const amount = Math.abs(Number(tx.amount))
  const isCredit = Number(tx.amount) > 0

  const downloadPDF = async () => {
    try {
      // Import dynamique jsPDF
      const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })

      const receiptNumber = `MANG-${new Date().getFullYear()}-${String(tx.id).slice(0, 8).toUpperCase()}`
      const securityHash = await generateHash(`${receiptNumber}|${tx.amount}|${tx.created_at}`)

      // Header
      doc.setFillColor('#0b3d2e')
      doc.rect(0, 0, 595, 110, 'F')
      doc.setTextColor('#ffffff')
      doc.setFontSize(22)
      doc.text('MANG WALLET', 40, 65)
      doc.setFontSize(11)
      doc.text('Reçu Financier Officiel', 400, 65)

      // Carte
      doc.setFillColor('#ffffff')
      doc.roundedRect(40, 130, 515, 420, 18, 18, 'F')
      doc.setDrawColor(220)
      doc.roundedRect(40, 130, 515, 420, 18, 18)

      // Titre
      doc.setFontSize(14)
      doc.setTextColor('#333')
      doc.text('Détails de la transaction', 60, 170)

      // Montant
      doc.setFontSize(36)
      doc.setTextColor(isCredit ? '#16a34a' : '#dc2626')
      doc.text(`${isCredit ? '+' : '-'} ${amount.toLocaleString('fr-FR')} FCFA`, 297, 230, { align: 'center' })

      // Badge type
      doc.setFillColor(isCredit ? '#16a34a' : '#dc2626')
      doc.roundedRect(220, 248, 155, 30, 10, 10, 'F')
      doc.setTextColor('#fff')
      doc.setFontSize(12)
      doc.text(cfg.label.toUpperCase(), 297, 268, { align: 'center' })

      // Infos
      doc.setTextColor('#333')
      doc.setFontSize(12)
      const gap = 34
      let y = 310

      const line = (label, val, offset) => {
        doc.setFont(undefined, 'bold')
        doc.text(label, 70, y + gap * offset)
        doc.setFont(undefined, 'normal')
        doc.text(String(val), 240, y + gap * offset)
      }

      line('Numéro de reçu :', receiptNumber, 0)
      line('Transaction ID :', String(tx.id).slice(0, 16) + '...', 1)
      line('Date :', new Date(tx.created_at).toLocaleString('fr-FR'), 2)
      line('Statut :', tx.status === 'completed' ? '✅ Validé' : tx.status === 'pending' ? '⏳ En attente' : tx.status || 'Validé', 3)
      if (tx.description) line('Description :', tx.description, 4)

      // Hash footer
      doc.setFontSize(7)
      doc.setTextColor('#aaa')
      doc.text(`Signature : ${securityHash}`, 40, 800)
      doc.setFontSize(9)
      doc.text('Document certifié électroniquement par MANG Wallet. Toute modification invalide ce reçu.', 40, 815)

      doc.save(`${receiptNumber}.pdf`)
      toast.success('Reçu téléchargé !')
    } catch (err) {
      toast.error('Erreur génération PDF')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="📄 Détail de la transaction">
      <div className="px-5 py-4 pb-10 space-y-4">
        {/* Montant */}
        <div className="text-center py-6 bg-gray-50 rounded-2xl">
          <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3', cfg.bg)}>
            {cfg.icon}
          </div>
          <p className={clsx('font-black text-4xl', isCredit ? 'text-emerald-600' : 'text-red-600')}>
            {isCredit ? '+' : '-'}{amount.toLocaleString('fr-FR')} FCFA
          </p>
          <p className="text-gray-500 text-sm mt-1">{cfg.label}</p>
        </div>

        {/* Badge statut */}
        <div className={clsx('flex items-center justify-center py-2 px-4 rounded-xl text-sm font-bold',
          tx.status === 'completed' || !tx.status ? 'bg-emerald-100 text-emerald-700' :
          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
          {tx.status === 'completed' || !tx.status ? '✅ Validé' :
           tx.status === 'pending' ? '⏳ En attente' : '❌ Échoué'}
        </div>

        {/* Infos */}
        <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
          {[
            ['📅 Date', new Date(tx.created_at).toLocaleString('fr-FR')],
            ['🧾 Type', cfg.label],
            tx.description && ['📌 Description', tx.description],
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-gray-500 text-sm">{label}</span>
              <span className="text-gray-800 text-sm font-semibold text-right max-w-[60%]">{value}</span>
            </div>
          ))}
        </div>

        {/* Bouton PDF */}
        <button onClick={downloadPDF}
          className="w-full py-4 bg-gray-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <Download size={18} /> Télécharger le reçu PDF
        </button>
      </div>
    </Sheet>
  )
}

// ============================================================
// GRAPHIQUE SIMPLE (SVG)
// ============================================================
function MiniChart({ transactions }) {
  if (!transactions.length) return null

  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    const txDay = transactions.filter(tx => new Date(tx.created_at).toDateString() === d.toDateString())
    const inAmt = txDay.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
    const outAmt = txDay.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    last7.push({ day, in: inAmt / 100, out: outAmt / 100 })
  }

  const maxVal = Math.max(...last7.map(d => Math.max(d.in, d.out)), 1)
  const W = 300, H = 80, pad = 20

  const pointsIn = last7.map((d, i) => `${pad + i * (W - pad * 2) / 6},${H - (d.in / maxVal) * (H - 10)}`).join(' ')
  const pointsOut = last7.map((d, i) => `${pad + i * (W - pad * 2) / 6},${H - (d.out / maxVal) * (H - 10)}`).join(' ')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-gray-700 text-sm">Activité — 7 derniers jours</p>
        <div className="flex gap-3 text-[10px] font-bold">
          <span className="text-emerald-600 flex items-center gap-1"><span className="w-3 h-1 bg-emerald-500 rounded inline-block"/>Entrées</span>
          <span className="text-red-500 flex items-center gap-1"><span className="w-3 h-1 bg-red-400 rounded inline-block"/>Sorties</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: 80 }}>
        <polyline points={pointsIn} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pointsOut} fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {last7.map((d, i) => (
          <text key={i} x={pad + i * (W - pad * 2) / 6} y={H + 16} textAnchor="middle" fontSize="9" fill="#9ca3af">{d.day}</text>
        ))}
      </svg>
    </div>
  )
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function WalletPage() {
  const { user, wallet, refreshWallet } = useAuthStore()
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(true)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [walletCopied, setWalletCopied] = useState(false)
  const [txFilter, setTxFilter] = useState('all')

  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [pinSetupOpen, setPinSetupOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)

  useEffect(() => {
    if (user) {
      loadTransactions()
      refreshWallet()
      // Vérifier retour FedaPay
      const params = new URLSearchParams(window.location.search)
      if (params.get('recharged')) {
        toast.success(`✅ Recharge de ${parseInt(params.get('recharged')).toLocaleString('fr-FR')} FCFA initiée !`)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [user])

  // Realtime wallet
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('wallet_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'wallet_transactions',
      }, (payload) => {
        if (payload.new.user_id === user.id) {
          const amt = Number(payload.new.amount)
          if (amt > 0) toast.success(`💰 +${(amt / 100).toLocaleString('fr-FR')} FCFA reçu !`)
          loadTransactions()
          refreshWallet()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const loadTransactions = async () => {
    if (!user) return
    setLoadingTx(true)
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setTransactions(data || [])
    setLoadingTx(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet?.wallet_number || '')
    setWalletCopied(true)
    toast.success('Numéro copié !')
    setTimeout(() => setWalletCopied(false), 2000)
  }

  const handleSuccess = () => { loadTransactions(); refreshWallet() }

  const balance = wallet ? wallet.balance_available / 100 : 0
  const reserved = wallet ? (wallet.balance_reserved || 0) / 100 : 0

  // Stats
  const now = new Date()
  const monthTx = transactions.filter(tx => {
    const d = new Date(tx.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthIn = monthTx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount) / 100, 0)
  const monthOut = monthTx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)) / 100, 0)

  // Filtrage
  const filteredTx = transactions.filter(tx => {
    if (txFilter === 'all') return true
    if (txFilter === 'in') return Number(tx.amount) > 0
    if (txFilter === 'out') return Number(tx.amount) < 0
    return (tx.transaction_type || '').includes(txFilter)
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ── CARTE WALLET ── */}
      <div className="relative overflow-hidden pt-14 pb-28 px-4"
        style={{ background: 'linear-gradient(135deg, #0b3d2e, #1a5c2e, #00c853)' }}>

        {/* Déco */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-black/10 pointer-events-none" />
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-base">MANG Wallet</p>
              <p className="text-white/50 text-xs">Portefeuille numérique</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setBalanceVisible(v => !v)}
              className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:scale-90">
              {balanceVisible ? <Eye size={15} className="text-white" /> : <EyeOff size={15} className="text-white" />}
            </button>
            <button onClick={refreshWallet}
              className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:scale-90">
              <RefreshCw size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* Solde */}
        <div className="relative mb-6">
          <p className="text-white/60 text-xs font-medium mb-1">Solde disponible</p>
          <div className="flex items-end gap-2">
            <h2 className="font-black text-5xl text-white leading-none">
              {balanceVisible ? balance.toLocaleString('fr-FR') : '••••••'}
            </h2>
            <span className="text-white/60 text-lg mb-1">FCFA</span>
          </div>
          {reserved > 0 && (
            <p className="text-yellow-300 text-xs mt-2 flex items-center gap-1">
              🔒 {reserved.toLocaleString('fr-FR')} FCFA en escrow
            </p>
          )}
        </div>

        {/* Numéro wallet */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/10 border border-white/15 mb-6">
          <div>
            <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Numéro de wallet</p>
            <p className="text-white font-mono font-bold tracking-[0.2em] text-base">
              {wallet?.wallet_number
                ? wallet.wallet_number.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
                : '—— ——— ———'}
            </p>
          </div>
          <button onClick={handleCopy}
            className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center active:scale-90">
            {walletCopied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} className="text-white/60" />}
          </button>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: '➕', label: 'Dépôt', action: () => setDepositOpen(true), color: 'bg-emerald-500' },
            { icon: '💸', label: 'Retrait', action: () => setWithdrawOpen(true), color: 'bg-red-500' },
            { icon: '🔄', label: 'Transfert', action: () => setTransferOpen(true), color: 'bg-blue-500' },
            { icon: '🔐', label: 'PIN', action: () => setPinSetupOpen(true), color: 'bg-purple-500' },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
              <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg', btn.color)}>
                {btn.icon}
              </div>
              <span className="text-white/80 text-[11px] font-bold">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── STATS MOIS ── */}
      <div className="px-4 -mt-14 relative z-10">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ce mois-ci</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-semibold">Entrées</p>
                <p className="font-black text-emerald-700">+{monthIn.toLocaleString('fr-FR')}</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs text-red-500 font-semibold">Sorties</p>
                <p className="font-black text-red-600">-{monthOut.toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRAPHIQUE ── */}
      {transactions.length > 0 && (
        <div className="px-4 mt-4">
          <MiniChart transactions={transactions} />
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-700 text-sm">Historique</p>
          <button onClick={loadTransactions} className="w-8 h-8 bg-white rounded-xl border border-gray-100 flex items-center justify-center">
            <RefreshCw size={13} className="text-gray-500" />
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {[
            { key: 'all', label: 'Tout' },
            { key: 'in', label: '📥 Entrées' },
            { key: 'out', label: '📤 Sorties' },
            { key: 'deposit', label: '💰 Dépôts' },
            { key: 'transfer', label: '🔄 Transferts' },
            { key: 'withdraw', label: '💸 Retraits' },
          ].map(f => (
            <button key={f.key} onClick={() => setTxFilter(f.key)}
              className={clsx('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                txFilter === f.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
              {f.label}
            </button>
          ))}
        </div>

        {loadingTx ? (
          <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-green-500" /></div>
        ) : filteredTx.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💳</div>
            <p className="font-bold text-gray-500">Aucune transaction</p>
            <p className="text-sm text-gray-400 mt-1">Vos transactions apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTx.map(tx => {
              const cfg = getTxConfig(tx)
              const amount = Math.abs(Number(tx.amount)) / 100
              const isCredit = Number(tx.amount) > 0
              const date = new Date(tx.created_at)

              return (
                <div key={tx.id} onClick={() => setSelectedTx(tx)}
                  className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
                  <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0', cfg.bg)}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{cfg.label}</p>
                    <p className="text-gray-400 text-xs">
                      {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={clsx('font-black text-base', isCredit ? 'text-emerald-600' : 'text-red-500')}>
                      {isCredit ? '+' : '-'}{amount.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-gray-400 text-[10px] font-semibold">FCFA</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <DepositSheet open={depositOpen} onClose={() => setDepositOpen(false)} user={user} wallet={wallet} onSuccess={handleSuccess} />
      <WithdrawSheet open={withdrawOpen} onClose={() => setWithdrawOpen(false)} user={user} wallet={wallet} onSuccess={handleSuccess} />
      <TransferSheet open={transferOpen} onClose={() => setTransferOpen(false)} user={user} wallet={wallet} onSuccess={handleSuccess} />
      <PinSetupSheet open={pinSetupOpen} onClose={() => setPinSetupOpen(false)} user={user} />
      <TxDetailSheet open={!!selectedTx} onClose={() => setSelectedTx(null)} tx={selectedTx} />
    </div>
  )
}
