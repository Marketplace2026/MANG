import { useState, useEffect, useRef } from 'react'
import {
  Wallet, RefreshCw, Copy, Check, Eye, EyeOff,
  Shield, ChevronRight, X, TrendingUp, TrendingDown,
  Phone, Download, Loader2
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'

const OPERATORS = [
  { id: 'MTN',    label: 'MTN Mobile Money', emoji: '🟡' },
  { id: 'Moov',   label: 'Moov Money',       emoji: '🔵' },
  { id: 'Celtis', label: 'Celtis Cash',      emoji: '🟢' },
]

const TX_CONFIG = {
  recharge:        { label: 'Recharge',          icon: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  deposit:         { label: 'Dépôt',             icon: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  transfer_in:     { label: 'Transfert reçu',    icon: '📥', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  transfer_out:    { label: 'Transfert envoyé',  icon: '📤', color: 'text-red-600',     bg: 'bg-red-50'     },
  withdraw:        { label: 'Retrait',            icon: '💸', color: 'text-red-600',     bg: 'bg-red-50'     },
  order_payment:   { label: 'Paiement commande', icon: '🛒', color: 'text-red-600',     bg: 'bg-red-50'     },
  order_received:  { label: 'Vente reçue',       icon: '💵', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  order_refund:    { label: 'Remboursement',      icon: '↩️', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  subscription:    { label: 'Abonnement premium',icon: '⭐', color: 'text-red-600',     bg: 'bg-red-50'     },
  pieces_purchase: { label: 'Achat pièces',      icon: '🪙', color: 'text-red-600',     bg: 'bg-red-50'     },
}

function getTxConfig(tx) {
  const type = (tx.type || tx.transaction_type || '').toLowerCase()
  if (TX_CONFIG[type]) return TX_CONFIG[type]
  if (type.includes('deposit') || type.includes('recharge')) return TX_CONFIG.recharge
  if (type.includes('transfer_in') || type.includes('transfer_received')) return TX_CONFIG.transfer_in
  if (type.includes('transfer_out') || type.includes('transfer_sent')) return TX_CONFIG.transfer_out
  if (type.includes('transfer')) return Number(tx.amount) < 0 ? TX_CONFIG.transfer_out : TX_CONFIG.transfer_in
  if (type.includes('withdraw')) return TX_CONFIG.withdraw
  if (type.includes('order') && Number(tx.amount) < 0) return TX_CONFIG.order_payment
  if (type.includes('order')) return TX_CONFIG.order_received
  if (type.includes('subscription') || type.includes('premium')) return TX_CONFIG.subscription
  return { label: 'Transaction', icon: '💳', color: 'text-gray-600', bg: 'bg-gray-50' }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================================
// SHEET GÉNÉRIQUE
// ============================================================
function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] flex flex-col animate-slide-up max-w-[480px] mx-auto">
        <div className="flex justify-center pt-3 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full"/>
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
              <X size={16} className="text-gray-500"/>
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </>
  )
}

// ============================================================
// PIN INPUT
// ============================================================
function PinInput({ value, onChange, error, label }) {
  const refs = useRef([])
  const digits = value.split('')
  const handle = (i, v) => {
    if (!/^\d*$/.test(v)) return
    const arr = [...digits]; arr[i] = v.slice(-1)
    const val = arr.join('').slice(0, 4)
    onChange(val)
    if (v && i < 3) refs.current[i + 1]?.focus()
  }
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }
  return (
    <div className="text-center">
      {label && <p className="text-sm font-bold text-gray-700 mb-3">{label}</p>}
      <div className="flex justify-center gap-4">
        {[0,1,2,3].map(i => (
          <input key={i} ref={el => refs.current[i] = el}
            type="password" inputMode="numeric" maxLength={1}
            value={digits[i] || ''}
            onChange={e => handle(i, e.target.value)}
            onKeyDown={e => onKey(i, e)}
            className={clsx(
              'w-14 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all',
              error ? 'border-red-400 bg-red-50' :
              digits[i] ? 'border-green-500 bg-green-50' :
              'border-gray-200 bg-gray-50 focus:border-green-500'
            )}
          />
        ))}
      </div>
      {error && <p className="text-red-500 text-xs font-semibold mt-2">❌ PIN incorrect</p>}
    </div>
  )
}

// ============================================================
// DÉPÔT
// ============================================================
function DepositSheet({ open, onClose, user }) {
  const [operator, setOperator] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  const PRESETS = [1000, 2000, 5000, 10000, 25000, 50000]

  const handleDeposit = async () => {
    if (!operator) return toast.error('Sélectionnez un opérateur')
    if (!phone.trim()) return toast.error('Entrez votre numéro')
    const amt = parseInt(amount)
    if (!amt || amt < 100) return toast.error('Minimum 100 FCFA')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fullName = user.user_metadata?.full_name || ''
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          user_id: user.id, type: 'deposit', operator,
          phone: phone.trim(), amount: amt, currency: 'XOF',
          description: 'Recharge MANG Wallet',
          email: user.email,
          first_name: fullName.split(' ')[0] || 'Client',
          last_name: fullName.split(' ')[1] || 'MANG',
          redirect_url: `${window.location.origin}/portefeuille?recharged=${amt}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur FedaPay')
      const url = data?.transaction?.payment_url || data?.transaction?.['v1/transaction']?.payment_url
      if (!url) throw new Error('Lien de paiement introuvable')
      window.location.href = url
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="💰 Recharger mon portefeuille">
      <div className="px-5 py-4 space-y-5 pb-10">
        <div>
          <p className="text-sm font-bold text-gray-700 mb-3">Opérateur Mobile Money</p>
          <div className="grid grid-cols-3 gap-3">
            {OPERATORS.map(op => (
              <button key={op.id} onClick={() => setOperator(op.id)}
                className={clsx('flex flex-col items-center py-4 rounded-2xl border-2 transition-all',
                  operator === op.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50')}>
                <span className="text-3xl mb-1">{op.emoji}</span>
                <span className="text-[11px] font-bold text-center leading-tight text-gray-700">{op.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">Numéro Mobile Money</p>
          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="tel" placeholder="Ex: 22961000000" value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">Montant (FCFA)</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map(p => (
              <button key={p} onClick={() => setAmount(String(p))}
                className={clsx('px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                  amount === String(p) ? 'bg-green-600 text-white border-green-600' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                {p.toLocaleString('fr-FR')}
              </button>
            ))}
          </div>
          <input type="number" placeholder="Autre montant" value={amount}
            onChange={e => setAmount(e.target.value)} min="100"
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"/>
        </div>
        {amount && parseInt(amount) >= 100 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Montant</span><span className="font-bold text-green-700">{parseInt(amount).toLocaleString('fr-FR')} FCFA</span></div>
            {operator && <div className="flex justify-between mt-1"><span className="text-gray-600">Via</span><span className="font-bold text-green-700">{OPERATORS.find(o=>o.id===operator)?.label}</span></div>}
          </div>
        )}
        <button onClick={handleDeposit} disabled={loading}
          className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={20} className="animate-spin"/> : '💳 Payer maintenant'}
        </button>
        <p className="text-center text-xs text-gray-400">🔒 Paiement sécurisé via FedaPay</p>
      </div>
    </Sheet>
  )
}

// ============================================================
// RETRAIT
// ============================================================
function WithdrawSheet({ open, onClose, user, wallet, onSuccess }) {
  const [operator, setOperator] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState(false)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  const balance = (wallet?.balance_available || 0) / 100

  const reset = () => { setStep(1); setPin(''); setPinError(false); setOperator(''); setPhone(''); setAmount('') }

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
    setLoading(true); setPinError(false)
    try {
      const { data: wd } = await supabase.from('wallets').select('pin_hash, pin_set').eq('user_id', user.id).single()
      if (!wd?.pin_set) { setLoading(false); return toast.error('Configurez votre PIN d\'abord') }
      const pinHash = await sha256(pin)
      if (wd.pin_hash !== pinHash) { setPinError(true); setPin(''); setLoading(false); return }

      const { data: { session } } = await supabase.auth.getSession()
      const fullName = user.user_metadata?.full_name || ''
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          user_id: user.id, type: 'withdraw', operator,
          phone: phone.trim(), amount: parseInt(amount), currency: 'XOF',
          description: 'Retrait MANG Wallet', email: user.email,
          first_name: fullName.split(' ')[0] || 'Client',
          last_name: fullName.split(' ')[1] || 'MANG',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur retrait')
      toast.success('✅ Retrait initié ! Vous recevrez votre argent sous peu.')
      onSuccess(); onClose(); reset()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { onClose(); reset() }} title="💸 Retrait Mobile Money">
      <div className="px-5 py-4 space-y-4 pb-10">
        {step === 1 ? (
          <>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3">Opérateur</p>
              <div className="grid grid-cols-3 gap-3">
                {OPERATORS.map(op => (
                  <button key={op.id} onClick={() => setOperator(op.id)}
                    className={clsx('flex flex-col items-center py-3 rounded-2xl border-2 transition-all',
                      operator === op.id ? 'border-green-500 bg-green-50' : 'border-gray-200')}>
                    <span className="text-2xl mb-1">{op.emoji}</span>
                    <span className="text-[10px] font-bold text-center text-gray-700">{op.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Numéro Mobile Money</p>
              <input type="tel" placeholder="Ex: 22961000000" value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"/>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Montant (FCFA)</p>
              <input type="number" placeholder="Montant à retirer" value={amount}
                onChange={e => setAmount(e.target.value)} min="500"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"/>
              <p className="text-xs text-gray-400 mt-1 pl-1">Solde : {balance.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <button onClick={handleContinue}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl active:scale-95 transition-transform">
              Continuer →
            </button>
          </>
        ) : (
          <>
            <div className="bg-gray-800 rounded-2xl p-4 text-center">
              <p className="text-white/60 text-sm">Montant du retrait</p>
              <p className="text-white font-black text-3xl">{parseInt(amount).toLocaleString('fr-FR')} FCFA</p>
              <p className="text-white/50 text-xs mt-1">→ {phone} via {OPERATORS.find(o=>o.id===operator)?.label}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <Shield size={18} className="text-amber-600 flex-shrink-0"/>
              <p className="text-amber-700 text-sm font-semibold">Entrez votre PIN pour confirmer</p>
            </div>
            <PinInput value={pin} onChange={setPin} error={pinError}/>
            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setPin(''); setPinError(false) }}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl">Retour</button>
              <button onClick={handleWithdraw} disabled={loading || pin.length !== 4}
                className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin"/> : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

// ============================================================
// TRANSFERT — Lookup amélioré
// ============================================================
function TransferSheet({ open, onClose, user, wallet, onSuccess }) {
  const [receiverNum, setReceiverNum] = useState('')
  const [receiver, setReceiver] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState(false)
  const balance = (wallet?.balance_available || 0) / 100
  const lookupTimer = useRef(null)

  const reset = () => {
    setStep(1); setPin(''); setPinError(false)
    setReceiverNum(''); setReceiver(null); setAmount(''); setNotFound(false)
  }

  // Lookup destinataire — méthode robuste
  const handleNumChange = (v) => {
    const clean = v.replace(/\s/g, '')
    setReceiverNum(clean)
    setReceiver(null)
    setNotFound(false)
    clearTimeout(lookupTimer.current)
    if (clean.length < 7) return

    lookupTimer.current = setTimeout(async () => {
      setLookingUp(true)
      try {
        // Méthode 1 : via RPC get_wallet_by_number
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_wallet_by_number', { p_wallet_number: clean })

        if (!rpcError && rpcData?.found) {
          if (rpcData.user_id === user.id) {
            toast.error('Vous ne pouvez pas vous transférer à vous-même')
            setNotFound(true)
          } else {
            setReceiver(rpcData)
          }
          setLookingUp(false)
          return
        }

        // Méthode 2 : query directe
        const { data, error } = await supabase
          .from('wallets')
          .select('user_id, wallet_number')
          .eq('wallet_number', clean)
          .single()

        if (error || !data) {
          setNotFound(true)
          setLookingUp(false)
          return
        }

        if (data.user_id === user.id) {
          toast.error('Vous ne pouvez pas vous transférer à vous-même')
          setNotFound(true)
          setLookingUp(false)
          return
        }

        // Récupérer le profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', data.user_id)
          .single()

        setReceiver({
          found: true,
          user_id: data.user_id,
          wallet_number: data.wallet_number,
          username: profile?.username,
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
        })
      } catch {
        setNotFound(true)
      } finally {
        setLookingUp(false)
      }
    }, 600)
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
    setLoading(true); setPinError(false)
    try {
      // Vérifier PIN
      const { data: wd } = await supabase.from('wallets').select('pin_hash, pin_set').eq('user_id', user.id).single()
      if (!wd?.pin_set) { setLoading(false); return toast.error('Configurez votre PIN d\'abord') }
      const pinHash = await sha256(pin)
      if (wd.pin_hash !== pinHash) { setPinError(true); setPin(''); setLoading(false); return }

      // Appel RPC transfer_money
      const { data, error } = await supabase.rpc('transfer_money', {
        sender_uuid: user.id,
        receiver_wallet_number: receiverNum.trim(),
        transfer_amount: parseInt(amount),
        user_pin: pinHash, // On envoie le hash
      })

      if (error) throw new Error(error.message || 'Erreur transfert')
      if (data?.error) throw new Error(data.error)

      toast.success(`✅ ${parseInt(amount).toLocaleString('fr-FR')} FCFA envoyés à @${receiver.username} !`)
      onSuccess(); onClose(); reset()
    } catch (err) {
      if (err.message.includes('PIN')) { setPinError(true); setPin('') }
      toast.error(err.message || 'Erreur lors du transfert')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { onClose(); reset() }} title="🔄 Transfert d'argent">
      <div className="px-5 py-4 space-y-4 pb-10">
        {step === 1 ? (
          <>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Numéro de wallet destinataire</p>
              <input type="text" inputMode="numeric"
                placeholder="Ex: 1234567890 (10 chiffres)"
                value={receiverNum}
                onChange={e => handleNumChange(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400"
                maxLength={10}
              />
              {lookingUp && (
                <p className="text-xs text-green-600 mt-1.5 pl-1 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin"/> Recherche en cours...
                </p>
              )}
              {notFound && !lookingUp && receiverNum.length >= 7 && (
                <p className="text-xs text-red-500 mt-1.5 pl-1">❌ Aucun wallet trouvé pour ce numéro</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5 pl-1">
                💡 Demandez le numéro de wallet à 10 chiffres au destinataire
              </p>
            </div>

            {/* Destinataire trouvé */}
            {receiver && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                <div className="w-11 h-11 rounded-xl bg-green-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {receiver.avatar_url
                    ? <img src={receiver.avatar_url} className="w-full h-full object-cover" alt=""/>
                    : <span className="text-lg font-bold text-green-700">{(receiver.username || '?')[0]?.toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-800 text-sm">{receiver.full_name || receiver.username}</p>
                  <p className="text-green-600 text-xs">@{receiver.username} · #{receiver.wallet_number}</p>
                </div>
                <Check size={18} className="text-green-600"/>
              </div>
            )}

            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Montant (FCFA)</p>
              <input type="number" placeholder="Ex: 5000" value={amount}
                onChange={e => setAmount(e.target.value)} min="100"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"/>
              <p className="text-xs text-gray-400 mt-1 pl-1">Solde disponible : {balance.toLocaleString('fr-FR')} FCFA</p>
            </div>

            {receiver && amount && parseInt(amount) >= 100 && (
              <div className="bg-gray-800 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-white/60">Destinataire</span><span className="text-white font-bold">@{receiver.username}</span></div>
                <div className="flex justify-between text-sm"><span className="text-white/60">Montant</span><span className="text-white font-bold">{parseInt(amount).toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between text-xs border-t border-white/10 pt-1.5">
                  <span className="text-white/40">Solde restant</span>
                  <span className="text-white/60">{(balance - parseInt(amount)).toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            )}

            <button onClick={handleContinue} disabled={!receiver || !amount || parseInt(amount) < 100}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl active:scale-95 transition-transform disabled:opacity-60">
              Continuer →
            </button>
          </>
        ) : (
          <>
            <div className="bg-gray-800 rounded-2xl p-4 text-center">
              <p className="text-white/60 text-sm">Transfert à @{receiver?.username}</p>
              <p className="text-white font-black text-3xl">{parseInt(amount).toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <Shield size={18} className="text-amber-600 flex-shrink-0"/>
              <p className="text-amber-700 text-sm font-semibold">Entrez votre PIN pour confirmer</p>
            </div>
            <PinInput value={pin} onChange={setPin} error={pinError}/>
            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setPin(''); setPinError(false) }}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl">Retour</button>
              <button onClick={handleTransfer} disabled={loading || pin.length !== 4}
                className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin"/> : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

// ============================================================
// PIN SETUP
// ============================================================
function PinSetupSheet({ open, onClose, user }) {
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState(1)
  const [hasPinAlready, setHasPinAlready] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState(false)

  useEffect(() => {
    if (open && user) {
      supabase.from('wallets').select('pin_set').eq('user_id', user.id).single()
        .then(({ data }) => {
          const has = !!data?.pin_set
          setHasPinAlready(has)
          setStep(has ? 1 : 2)
        })
    }
  }, [open, user])

  const reset = () => { setOldPin(''); setNewPin(''); setConfirmPin(''); setPinError(false); setStep(1) }

  const handleVerifyOld = async () => {
    if (oldPin.length !== 4) return
    setLoading(true)
    const { data: wd } = await supabase.from('wallets').select('pin_hash').eq('user_id', user.id).single()
    const hash = await sha256(oldPin)
    setLoading(false)
    if (wd?.pin_hash !== hash) { setPinError(true); setOldPin(''); return }
    setPinError(false); setStep(2)
  }

  const handleConfirm = async () => {
    if (confirmPin !== newPin) { setPinError(true); setConfirmPin(''); return }
    setLoading(true)
    try {
      const hash = await sha256(newPin)
      await supabase.from('wallets').update({ pin_hash: hash, pin_set: true }).eq('user_id', user.id)
      toast.success('🔐 PIN configuré avec succès !')
      reset(); onClose()
    } catch {
      toast.error('Erreur configuration PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose() }} title="🔐 Code PIN Wallet">
      <div className="px-5 py-6 space-y-5 pb-10">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <Shield size={20} className="text-green-600 flex-shrink-0"/>
          <div>
            <p className="font-bold text-green-800 text-sm">Code PIN sécurisé</p>
            <p className="text-green-600 text-xs">Requis pour les paiements et transferts</p>
          </div>
        </div>

        {step === 1 && hasPinAlready && (
          <>
            <PinInput value={oldPin} onChange={v => { setOldPin(v); setPinError(false) }} error={pinError} label="Entrez votre PIN actuel"/>
            <button onClick={handleVerifyOld} disabled={loading || oldPin.length !== 4}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin"/> : 'Vérifier →'}
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <PinInput value={newPin} onChange={v => { setNewPin(v); setPinError(false) }} error={false} label="Choisissez un PIN à 4 chiffres"/>
            <button onClick={() => newPin.length === 4 && setStep(3)} disabled={newPin.length !== 4}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60">
              Continuer →
            </button>
          </>
        )}
        {step === 3 && (
          <>
            <PinInput value={confirmPin} onChange={v => { setConfirmPin(v); setPinError(false) }} error={pinError} label="Confirmez votre PIN"/>
            {pinError && <p className="text-red-500 text-xs text-center font-semibold">❌ Les PIN ne correspondent pas</p>}
            <div className="flex gap-3">
              <button onClick={() => { setStep(2); setConfirmPin(''); setPinError(false) }}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl">Retour</button>
              <button onClick={handleConfirm} disabled={loading || confirmPin.length !== 4}
                className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin"/> : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

// ============================================================
// DÉTAIL TRANSACTION
// ============================================================
function TxDetailSheet({ open, onClose, tx }) {
  if (!tx) return null
  const cfg = getTxConfig(tx)
  const amount = Math.abs(Number(tx.amount)) / 100
  const isCredit = Number(tx.amount) > 0

  return (
    <Sheet open={open} onClose={onClose} title="📄 Détail transaction">
      <div className="px-5 py-4 pb-10 space-y-4">
        <div className="text-center py-6 bg-gray-50 rounded-2xl">
          <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3', cfg.bg)}>{cfg.icon}</div>
          <p className={clsx('font-black text-4xl', isCredit ? 'text-emerald-600' : 'text-red-600')}>
            {isCredit ? '+' : '-'}{amount.toLocaleString('fr-FR')} FCFA
          </p>
          <p className="text-gray-500 text-sm mt-1">{cfg.label}</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
          {[
            ['📅 Date', new Date(tx.created_at).toLocaleString('fr-FR')],
            ['🧾 Type', cfg.label],
            tx.receipt_number && ['🔖 Reçu', tx.receipt_number],
            tx.description && ['📌 Note', tx.description],
            tx.balance_after !== undefined && ['💰 Solde après', `${(Number(tx.balance_after)/100).toLocaleString('fr-FR')} FCFA`],
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-gray-500 text-sm">{label}</span>
              <span className="text-gray-800 text-sm font-semibold text-right max-w-[55%] break-all">{value}</span>
            </div>
          ))}
        </div>

        {tx.receipt_number && (
          <button onClick={() => { navigator.clipboard.writeText(tx.receipt_number); toast.success('Reçu copié !') }}
            className="w-full py-4 bg-gray-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Copy size={18}/> Copier le numéro de reçu
          </button>
        )}
      </div>
    </Sheet>
  )
}

// ============================================================
// GRAPHIQUE 7 JOURS
// ============================================================
function MiniChart({ transactions }) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    const txDay = transactions.filter(tx => new Date(tx.created_at).toDateString() === d.toDateString())
    const inAmt  = txDay.filter(t => Number(t.amount) > 0).reduce((s,t) => s + Number(t.amount)/100, 0)
    const outAmt = txDay.filter(t => Number(t.amount) < 0).reduce((s,t) => s + Math.abs(Number(t.amount))/100, 0)
    return { day, in: inAmt, out: outAmt }
  })
  const maxVal = Math.max(...last7.map(d => Math.max(d.in, d.out)), 1)
  const W = 300, H = 70, pad = 20
  const x = (i) => pad + i * (W - pad*2) / 6
  const y = (v) => H - (v / maxVal) * (H - 8)
  const ptIn  = last7.map((d,i) => `${x(i)},${y(d.in)}`).join(' ')
  const ptOut = last7.map((d,i) => `${x(i)},${y(d.out)}`).join(' ')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-gray-700 text-sm">Activité — 7 jours</p>
        <div className="flex gap-3 text-[10px] font-bold">
          <span className="text-emerald-600 flex items-center gap-1"><span className="w-3 h-1 bg-emerald-500 rounded inline-block"/>Entrées</span>
          <span className="text-red-500 flex items-center gap-1"><span className="w-3 h-1 bg-red-400 rounded inline-block"/>Sorties</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H+18}`} className="w-full" style={{height:75}}>
        <polyline points={ptIn}  fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points={ptOut} fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {last7.map((d,i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.in)}  r="3" fill="#22c55e"/>
            <circle cx={x(i)} cy={y(d.out)} r="3" fill="#f87171"/>
            <text x={x(i)} y={H+14} textAnchor="middle" fontSize="8" fill="#9ca3af">{d.day}</text>
          </g>
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

  const [depositOpen,  setDepositOpen]  = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [pinSetupOpen, setPinSetupOpen] = useState(false)
  const [selectedTx,   setSelectedTx]   = useState(null)

  useEffect(() => {
    if (user) {
      loadTransactions()
      refreshWallet()
      const params = new URLSearchParams(window.location.search)
      if (params.get('recharged')) {
        toast.success(`✅ Recharge de ${parseInt(params.get('recharged')).toLocaleString('fr-FR')} FCFA initiée !`)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [user])

  // Realtime
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('wallet_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, payload => {
        if (payload.new.user_id === user.id) {
          const amt = Number(payload.new.amount)
          if (amt > 0) toast.success(`💰 +${(amt/100).toLocaleString('fr-FR')} FCFA reçu !`)
          loadTransactions(); refreshWallet()
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets' }, payload => {
        if (payload.new.user_id === user.id) refreshWallet()
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  const loadTransactions = async () => {
    if (!user) return
    setLoadingTx(true)
    try {
      // Requête avec user_id (après le correctif SQL)
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data?.length > 0) {
        setTransactions(data)
        setLoadingTx(false)
        return
      }

      // Fallback : via wallet_id
      const { data: walletData } = await supabase
        .from('wallets').select('id').eq('user_id', user.id).single()
      if (!walletData) { setLoadingTx(false); return }

      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false })
        .limit(100)
      setTransactions(txData || [])
    } catch {
      setTransactions([])
    } finally {
      setLoadingTx(false)
    }
  }

  const handleCopy = () => {
    if (!wallet?.wallet_number) return
    navigator.clipboard.writeText(wallet.wallet_number)
    setWalletCopied(true); toast.success('Numéro copié !')
    setTimeout(() => setWalletCopied(false), 2000)
  }

  const handleSuccess = () => { loadTransactions(); refreshWallet() }

  const balance  = (wallet?.balance_available || 0) / 100
  const reserved = (wallet?.balance_reserved  || 0) / 100

  const now = new Date()
  const monthTx  = transactions.filter(tx => { const d = new Date(tx.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const monthIn  = monthTx.filter(t => Number(t.amount) > 0).reduce((s,t) => s + Number(t.amount)/100, 0)
  const monthOut = monthTx.filter(t => Number(t.amount) < 0).reduce((s,t) => s + Math.abs(Number(t.amount))/100, 0)

  const filteredTx = transactions.filter(tx => {
    if (txFilter === 'all') return true
    if (txFilter === 'in')  return Number(tx.amount) > 0
    if (txFilter === 'out') return Number(tx.amount) < 0
    const type = (tx.type || tx.transaction_type || '').toLowerCase()
    return type.includes(txFilter)
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* CARTE WALLET */}
      <div className="relative overflow-hidden pt-14 pb-28 px-4"
        style={{ background: 'linear-gradient(135deg, #0b3d2e 0%, #1a5c2e 60%, #2d8a3e 100%)' }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none"/>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-black/10 pointer-events-none"/>
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize: '24px 24px' }}/>

        <div className="relative flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Wallet size={20} className="text-white"/>
            </div>
            <div>
              <p className="text-white font-black text-base">MANG Wallet</p>
              <p className="text-white/50 text-xs">Portefeuille numérique</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setBalanceVisible(v => !v)}
              className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:scale-90">
              {balanceVisible ? <Eye size={15} className="text-white"/> : <EyeOff size={15} className="text-white"/>}
            </button>
            <button onClick={() => { loadTransactions(); refreshWallet() }}
              className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:scale-90">
              <RefreshCw size={15} className="text-white"/>
            </button>
          </div>
        </div>

        <div className="relative mb-5">
          <p className="text-white/60 text-xs font-medium mb-1">Solde disponible</p>
          <div className="flex items-end gap-2">
            <h2 className="font-black text-5xl text-white leading-none">
              {balanceVisible ? balance.toLocaleString('fr-FR') : '••••••'}
            </h2>
            <span className="text-white/60 text-lg mb-1">FCFA</span>
          </div>
          {reserved > 0 && <p className="text-yellow-300 text-xs mt-2">🔒 {reserved.toLocaleString('fr-FR')} FCFA en escrow</p>}
        </div>

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
            {walletCopied ? <Check size={16} className="text-emerald-300"/> : <Copy size={16} className="text-white/60"/>}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: '➕', label: 'Dépôt',    action: () => setDepositOpen(true),  color: 'bg-emerald-500' },
            { icon: '💸', label: 'Retrait',   action: () => setWithdrawOpen(true), color: 'bg-red-500'     },
            { icon: '🔄', label: 'Transfert', action: () => setTransferOpen(true), color: 'bg-blue-500'    },
            { icon: '🔐', label: 'PIN',       action: () => setPinSetupOpen(true), color: 'bg-purple-500'  },
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

      {/* STATS MOIS */}
      <div className="px-4 -mt-14 relative z-10">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ce mois-ci</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600"/>
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-semibold">Entrées</p>
                <p className="font-black text-emerald-700 text-sm">+{monthIn.toLocaleString('fr-FR')}</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown size={18} className="text-red-500"/>
              </div>
              <div>
                <p className="text-xs text-red-500 font-semibold">Sorties</p>
                <p className="font-black text-red-600 text-sm">-{monthOut.toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRAPHIQUE */}
      {transactions.length > 0 && (
        <div className="px-4 mt-4"><MiniChart transactions={transactions}/></div>
      )}

      {/* HISTORIQUE */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-700 text-sm">Historique ({transactions.length})</p>
          <button onClick={loadTransactions}
            className="w-8 h-8 bg-white rounded-xl border border-gray-100 flex items-center justify-center">
            <RefreshCw size={13} className="text-gray-500"/>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {[
            { key: 'all',      label: 'Tout'         },
            { key: 'in',       label: '📥 Entrées'   },
            { key: 'out',      label: '📤 Sorties'   },
            { key: 'recharge', label: '💰 Dépôts'    },
            { key: 'transfer', label: '🔄 Transferts' },
            { key: 'withdraw', label: '💸 Retraits'  },
            { key: 'order',    label: '🛒 Commandes' },
          ].map(f => (
            <button key={f.key} onClick={() => setTxFilter(f.key)}
              className={clsx('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                txFilter === f.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
              {f.label}
            </button>
          ))}
        </div>

        {loadingTx ? (
          <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-green-500"/></div>
        ) : filteredTx.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="text-4xl mb-3">💳</div>
            <p className="font-bold text-gray-500">Aucune transaction</p>
            <p className="text-sm text-gray-400 mt-1">Vos transactions apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTx.map(tx => {
              const cfg = getTxConfig(tx)
              const amt = Math.abs(Number(tx.amount)) / 100
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
                    {tx.description && <p className="text-gray-400 text-[10px] truncate">{tx.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={clsx('font-black text-base', isCredit ? 'text-emerald-600' : 'text-red-500')}>
                      {isCredit ? '+' : '-'}{amt.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-gray-400 text-[10px] font-semibold">FCFA</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0"/>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      <DepositSheet  open={depositOpen}   onClose={() => setDepositOpen(false)}  user={user}/>
      <WithdrawSheet open={withdrawOpen}  onClose={() => setWithdrawOpen(false)} user={user} wallet={wallet} onSuccess={handleSuccess}/>
      <TransferSheet open={transferOpen}  onClose={() => setTransferOpen(false)} user={user} wallet={wallet} onSuccess={handleSuccess}/>
      <PinSetupSheet open={pinSetupOpen}  onClose={() => setPinSetupOpen(false)} user={user}/>
      <TxDetailSheet open={!!selectedTx} onClose={() => setSelectedTx(null)}    tx={selectedTx}/>
    </div>
  )
}
