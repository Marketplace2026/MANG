import { useState, useEffect, useRef } from 'react'
import {
  Wallet, RefreshCw, Copy, Check, Eye, EyeOff,
  Shield, ChevronRight, X, Loader2, TrendingUp,
  TrendingDown, Phone, Download, FileText
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const OPERATORS = [
  { id: 'MTN',    label: 'MTN Mobile Money', emoji: '🟡' },
  { id: 'Moov',   label: 'Moov Money',       emoji: '🔵' },
  { id: 'Celtis', label: 'Celtis Cash',      emoji: '🟢' },
]

const TX_TYPES = {
  deposit:         { label: 'Rechargement',     icon: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  recharge:        { label: 'Rechargement',     icon: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  withdraw:        { label: 'Retrait',          icon: '💸', color: 'text-red-600',     bg: 'bg-red-50'     },
  transfer_out:    { label: 'Transfert envoyé', icon: '📤', color: 'text-red-600',     bg: 'bg-red-50'     },
  transfer_in:     { label: 'Transfert reçu',   icon: '📥', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  order_payment:   { label: 'Paiement commande',icon: '🛒', color: 'text-red-600',     bg: 'bg-red-50'     },
  order_received:  { label: 'Vente reçue',      icon: '💵', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  order_refund:    { label: 'Remboursement',    icon: '↩️', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  subscription:    { label: 'Abonnement',       icon: '⭐', color: 'text-red-600',     bg: 'bg-red-50'     },
  pieces_purchase: { label: 'Achat pièces',     icon: '🪙', color: 'text-red-600',     bg: 'bg-red-50'     },
}

function getTxCfg(tx) {
  const t = (tx.type || tx.transaction_type || '').toLowerCase()
  if (TX_TYPES[t]) return TX_TYPES[t]
  if (t.includes('deposit') || t.includes('recharge')) return TX_TYPES.deposit
  if (t.includes('withdraw')) return TX_TYPES.withdraw
  if (t.includes('transfer_out') || (t.includes('transfer') && Number(tx.amount) < 0)) return TX_TYPES.transfer_out
  if (t.includes('transfer_in')  || (t.includes('transfer') && Number(tx.amount) > 0)) return TX_TYPES.transfer_in
  if (t.includes('order') && Number(tx.amount) < 0) return TX_TYPES.order_payment
  if (t.includes('order')) return TX_TYPES.order_received
  return { label: 'Transaction', icon: '💳', color: 'text-gray-600', bg: 'bg-gray-50' }
}

// Afficher le montant RÉEL en FCFA (le DB stocke en centimes)
function toFCFA(cents) {
  return Math.abs(Number(cents)) / 100
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

// ── Sheet ────────────────────────────────────────────────
function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] flex flex-col max-w-[480px] mx-auto animate-slide-up">
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

// ── PIN Input ────────────────────────────────────────────
function PinInput({ value, onChange, error, label }) {
  const refs = useRef([])
  const digits = value.split('')
  const handle = (i, v) => {
    if (!/^\d*$/.test(v)) return
    const arr = [...digits]; arr[i] = v.slice(-1)
    onChange(arr.join('').slice(0, 4))
    if (v && i < 3) refs.current[i+1]?.focus()
  }
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i-1]?.focus()
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

// ── Enregistrer transaction + notification ───────────────
async function recordTx({ walletId, userId, type, amountCents, balanceAfterCents, description }) {
  const year = new Date().getFullYear()
  const receiptNum = `MANG-${year}-${Math.floor(Math.random()*999999+1).toString().padStart(6,'0')}`
  await supabase.from('wallet_transactions').insert({
    wallet_id: walletId, user_id: userId, type,
    amount: amountCents, balance_after: balanceAfterCents,
    description, receipt_number: receiptNum,
  })
  const notifMap = {
    deposit:      ['wallet_credit', '💰 Rechargement réussi !',  `+${toFCFA(amountCents).toLocaleString('fr-FR')} FCFA crédités.`],
    withdraw:     ['wallet_debit',  '💸 Retrait effectué !',     `-${toFCFA(Math.abs(amountCents)).toLocaleString('fr-FR')} FCFA retirés.`],
    transfer_out: ['wallet_debit',  '📤 Transfert envoyé !',     `-${toFCFA(Math.abs(amountCents)).toLocaleString('fr-FR')} FCFA transférés.`],
    transfer_in:  ['wallet_credit', '📥 Transfert reçu !',       `+${toFCFA(amountCents).toLocaleString('fr-FR')} FCFA reçus.`],
  }
  const n = notifMap[type]
  if (n) await supabase.from('notifications').insert({ user_id: userId, type: n[0], title: n[1], body: n[2] })
  return receiptNum
}

// ══════════════════════════════════════════════════════════
// DÉPÔT
// ══════════════════════════════════════════════════════════
function DepositSheet({ open, onClose, user, wallet, onSuccess }) {
  const [operator, setOperator] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const PRESETS = [1000, 2000, 5000, 10000, 25000, 50000]

  const handleDeposit = async () => {
    if (!operator)      return toast.error('Sélectionnez un opérateur')
    if (!phone.trim())  return toast.error('Entrez votre numéro')
    const amt = parseInt(amount)
    if (!amt || amt < 100) return toast.error('Minimum 100 FCFA')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const meta = user.user_metadata || {}
      const fname = meta.full_name?.split(' ')[0] || meta.username || 'Client'
      const lname = meta.full_name?.split(' ').slice(1).join(' ') || 'MANG'

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          user_id: user.id, type: 'deposit', operator,
          phone: phone.trim(), amount: amt, currency: 'XOF',
          description: 'Recharge MANG Wallet',
          email: user.email || `${user.id}@mang.app`,
          customer: {
            firstname: fname, lastname: lname,
            email: user.email || `${user.id}@mang.app`,
            phone_number: { number: phone.trim(), country: 'BJ' },
          },
          redirect_url: `${window.location.origin}/portefeuille?recharged=${amt}&op=${operator}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || JSON.stringify(data))
      const url = data?.transaction?.payment_url
             || data?.transaction?.['v1/transaction']?.payment_url
             || data?.payment_url
      if (!url) throw new Error('Lien de paiement introuvable — vérifiez la config FedaPay')
      window.location.href = url
    } catch (err) {
      console.error('Deposit error:', err)
      toast.error(err.message)
    } finally { setLoading(false) }
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
                  operator === op.id ? 'border-green-500 bg-green-50' : 'border-gray-200')}>
                <span className="text-3xl mb-1">{op.emoji}</span>
                <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{op.label}</span>
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
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Montant à payer</span>
              <span className="font-bold text-green-700">{parseInt(amount).toLocaleString('fr-FR')} FCFA</span>
            </div>
            {operator && <div className="flex justify-between">
              <span className="text-gray-600">Via</span>
              <span className="font-bold text-green-700">{OPERATORS.find(o=>o.id===operator)?.label}</span>
            </div>}
          </div>
        )}
        <button onClick={handleDeposit} disabled={loading || !operator || !phone || !amount}
          className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={20} className="animate-spin"/> : '💳 Payer maintenant'}
        </button>
        <p className="text-center text-xs text-gray-400">🔒 Paiement sécurisé via FedaPay</p>
      </div>
    </Sheet>
  )
}

// ══════════════════════════════════════════════════════════
// RETRAIT
// ══════════════════════════════════════════════════════════
function WithdrawSheet({ open, onClose, user, wallet, onSuccess }) {
  const [operator, setOperator] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState(false)
  // Solde RÉEL en FCFA
  const [realBalanceCents, setRealBalanceCents] = useState(wallet?.balance_available || 0)

  useEffect(() => {
    if (open && user) {
      supabase.from("wallets").select("balance_available").eq("user_id", user.id).single()
        .then(({ data }) => { if (data) setRealBalanceCents(data.balance_available) })
    }
  }, [open, user])

  const balanceFCFA = realBalanceCents / 100

  const reset = () => { setStep(1); setPin(''); setPinError(false); setOperator(''); setPhone(''); setAmount('') }

  const handleContinue = () => {
    if (!operator) return toast.error('Sélectionnez un opérateur')
    if (!phone.trim()) return toast.error('Entrez votre numéro')
    const amt = parseInt(amount)
    if (!amt || amt < 500) return toast.error('Minimum 500 FCFA')
    if (amt > balanceFCFA) return toast.error(`Solde insuffisant. Disponible : ${balanceFCFA.toLocaleString('fr-FR')} FCFA`)
    setStep(2)
  }

  const handleWithdraw = async () => {
    if (pin.length !== 4) return
    setLoading(true); setPinError(false)
    try {
      const { data: wd } = await supabase.from('wallets').select('pin_hash, pin_set, id').eq('user_id', user.id).single()
      if (!wd?.pin_set) { setLoading(false); return toast.error('Configurez votre PIN d\'abord') }
      const pinHash = await sha256(pin)
      if (wd.pin_hash !== pinHash) { setPinError(true); setPin(''); setLoading(false); return }

      const amt = parseInt(amount)
      const amtCents = amt * 100

      // Récupérer le solde RÉEL depuis la DB (pas le store qui peut être périmé)
      const { data: freshWallet } = await supabase
        .from('wallets').select('balance_available, balance_total')
        .eq('user_id', user.id).single()
      if (!freshWallet) { setLoading(false); return toast.error('Erreur wallet') }

      if (freshWallet.balance_available < amtCents) {
        setLoading(false)
        return toast.error(`Solde insuffisant. Disponible : ${(freshWallet.balance_available/100).toLocaleString('fr-FR')} FCFA`)
      }

      // Débiter wallet avec solde frais
      const newBalCents = freshWallet.balance_available - amtCents
      await supabase.from('wallets').update({
        balance_available: newBalCents,
        balance_total: freshWallet.balance_total - amtCents,
      }).eq('user_id', user.id)

      // Enregistrer transaction + notification
      await recordTx({
        walletId: wd.id, userId: user.id, type: 'withdraw',
        amountCents: -amtCents, balanceAfterCents: newBalCents,
        description: `Retrait ${amt.toLocaleString('fr-FR')} FCFA via ${OPERATORS.find(o=>o.id===operator)?.label} → ${phone}`,
      })

      // Appel FedaPay
      const { data: { session } } = await supabase.auth.getSession()
      const meta = user.user_metadata || {}
      const fname = meta.full_name?.split(' ')[0] || meta.username || 'Client'
      const lname = meta.full_name?.split(' ').slice(1).join(' ') || 'MANG'

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          user_id: user.id, type: 'withdraw', operator,
          phone: phone.trim(), amount: amt, currency: 'XOF',
          description: 'Retrait MANG Wallet',
          email: user.email || `${user.id}@mang.app`,
          customer: {
            firstname: fname, lastname: lname,
            email: user.email || `${user.id}@mang.app`,
            phone_number: { number: phone.trim(), country: 'BJ' },
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Rembourser si FedaPay échoue
        await supabase.from('wallets').update({
          balance_available: freshWallet.balance_available,
          balance_total: freshWallet.balance_total,
        }).eq('user_id', user.id)
        throw new Error(data.error || data.message || 'Erreur FedaPay')
      }

      toast.success(`✅ Retrait de ${amt.toLocaleString('fr-FR')} FCFA initié !`)
      onSuccess(); onClose(); reset()
    } catch (err) {
      console.error('Withdraw error:', err)
      toast.error(err.message)
    } finally { setLoading(false) }
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
                    <span className="text-[10px] font-bold text-gray-700 text-center">{op.label}</span>
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
              <input type="number" placeholder="Montant à retirer (min 500)" value={amount}
                onChange={e => setAmount(e.target.value)} min="500"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"/>
              <p className="text-xs text-gray-400 mt-1 pl-1">
                Solde disponible : <span className="font-bold text-green-700">{balanceFCFA.toLocaleString('fr-FR')} FCFA</span>
              </p>
            </div>
            <button onClick={handleContinue}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl active:scale-95 transition-transform">
              Continuer →
            </button>
          </>
        ) : (
          <>
            <div className="bg-gray-800 rounded-2xl p-4 text-center space-y-1">
              <p className="text-white/60 text-sm">Montant du retrait</p>
              <p className="text-white font-black text-3xl">{parseInt(amount).toLocaleString('fr-FR')} FCFA</p>
              <p className="text-white/50 text-xs">→ {phone} via {OPERATORS.find(o=>o.id===operator)?.label}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <Shield size={18} className="text-amber-600 flex-shrink-0"/>
              <p className="text-amber-700 text-sm font-semibold">Entrez votre PIN pour confirmer</p>
            </div>
            <PinInput value={pin} onChange={v => { setPin(v); setPinError(false) }} error={pinError}/>
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

// ══════════════════════════════════════════════════════════
// TRANSFERT — Montant en FCFA, converti en centimes dans SQL
// ══════════════════════════════════════════════════════════
function TransferSheet({ open, onClose, user, wallet, onSuccess }) {
  const [receiverNum, setReceiverNum] = useState('')
  const [receiver, setReceiver]       = useState(null)
  const [lookingUp, setLookingUp]     = useState(false)
  const [notFound, setNotFound]       = useState(false)
  const [amount, setAmount]           = useState('')
  const [pin, setPin]                 = useState('')
  const [step, setStep]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [pinError, setPinError]       = useState(false)
  const [realBalanceCents, setRealBalanceCents] = useState(wallet?.balance_available || 0)

  useEffect(() => {
    if (open && user) {
      supabase.from("wallets").select("balance_available").eq("user_id", user.id).single()
        .then(({ data }) => { if (data) setRealBalanceCents(data.balance_available) })
    }
  }, [open, user])

  const balanceFCFA = realBalanceCents / 100
  const timer = useRef(null)

  const reset = () => {
    setStep(1); setPin(''); setPinError(false)
    setReceiverNum(''); setReceiver(null); setAmount(''); setNotFound(false)
  }

  const lookupWallet = async (num) => {
    const clean = num.trim()
    if (clean.length < 7) { setReceiver(null); setNotFound(false); return }
    setLookingUp(true)
    try {
      // Méthode directe — query simple
      const { data, error } = await supabase
        .from('wallets')
        .select('user_id, wallet_number')
        .eq('wallet_number', clean)
        .maybeSingle()

      if (error || !data) {
        setNotFound(true); setReceiver(null)
        return
      }
      if (data.user_id === user.id) {
        toast.error('Vous ne pouvez pas vous transférer à vous-même')
        setNotFound(true); setReceiver(null)
        return
      }
      // Récupérer le profil
      const { data: p } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', data.user_id)
        .single()

      setReceiver({ user_id: data.user_id, wallet_number: data.wallet_number, ...p })
      setNotFound(false)
    } catch {
      setNotFound(true); setReceiver(null)
    } finally { setLookingUp(false) }
  }

  const handleNumChange = (v) => {
    const clean = v.replace(/\D/g,'').slice(0, 10)
    setReceiverNum(clean); setReceiver(null); setNotFound(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => lookupWallet(clean), 700)
  }

  const handleContinue = () => {
    if (!receiver) return toast.error('Destinataire introuvable')
    const amt = parseInt(amount)
    if (!amt || amt < 100) return toast.error('Minimum 100 FCFA')
    if (amt > balanceFCFA) return toast.error(`Solde insuffisant. Disponible : ${balanceFCFA.toLocaleString('fr-FR')} FCFA`)
    setStep(2)
  }

  const handleTransfer = async () => {
    if (pin.length !== 4) return
    setLoading(true); setPinError(false)
    try {
      const pinHash = await sha256(pin)
      const amt = parseInt(amount)  // En FCFA — la fonction SQL convertit en centimes

      const { data, error } = await supabase.rpc('transfer_money', {
        sender_uuid:             user.id,
        receiver_wallet_number:  receiverNum.trim(),
        amount_fcfa:             amt,      // FCFA direct — SQL * 100
        user_pin:                pinHash,
      })

      if (error) throw new Error(error.message || 'Erreur transfert')
      if (data?.error) throw new Error(data.error)

      toast.success(`✅ ${amt.toLocaleString('fr-FR')} FCFA envoyés à @${receiver.username} !`)
      onSuccess(); onClose(); reset()
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('pin')) { setPinError(true); setPin('') }
      toast.error(msg || 'Erreur lors du transfert')
    } finally { setLoading(false) }
  }

  return (
    <Sheet open={open} onClose={() => { onClose(); reset() }} title="🔄 Transfert d'argent">
      <div className="px-5 py-4 space-y-4 pb-10">
        {step === 1 ? (
          <>
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Numéro wallet destinataire</p>
              <input
                type="text" inputMode="numeric"
                placeholder="10 chiffres (ex: 1234567890)"
                value={receiverNum}
                onChange={e => handleNumChange(e.target.value)}
                maxLength={10}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              {lookingUp && (
                <p className="text-xs text-blue-600 mt-1.5 pl-1 flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin"/> Vérification...
                </p>
              )}
              {notFound && !lookingUp && receiverNum.length >= 7 && (
                <p className="text-xs text-red-500 mt-1.5 pl-1">❌ Aucun wallet trouvé pour ce numéro</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5 pl-1">
                💡 Demandez le numéro wallet (10 chiffres) au destinataire dans son profil Wallet
              </p>
            </div>

            {receiver && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-green-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {receiver.avatar_url
                    ? <img src={receiver.avatar_url} className="w-full h-full object-cover" alt=""/>
                    : <span className="text-xl font-black text-green-700">{(receiver.username||'?')[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1">
                  <p className="font-black text-green-800">{receiver.full_name || receiver.username}</p>
                  <p className="text-green-600 text-sm">@{receiver.username}</p>
                  <p className="text-green-500 text-xs font-mono">#{receiver.wallet_number}</p>
                </div>
                <Check size={22} className="text-green-600"/>
              </div>
            )}

            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Montant en FCFA</p>
              <input type="number" placeholder="Ex: 500" value={amount}
                onChange={e => setAmount(e.target.value)} min="100"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"/>
              <p className="text-xs text-gray-400 mt-1 pl-1">
                Solde : <span className="font-bold text-green-700">{balanceFCFA.toLocaleString('fr-FR')} FCFA</span>
              </p>
            </div>

            {receiver && amount && parseInt(amount) >= 100 && (
              <div className="bg-gray-800 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Destinataire</span>
                  <span className="text-white font-bold">@{receiver.username}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Montant envoyé</span>
                  <span className="text-white font-black text-base">{parseInt(amount).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/10 pt-1.5">
                  <span className="text-white/40">Solde restant</span>
                  <span className="text-white/60">{(balanceFCFA - parseInt(amount)).toLocaleString('fr-FR')} FCFA</span>
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
            <div className="bg-gray-800 rounded-2xl p-5 text-center space-y-2">
              <p className="text-white/60 text-sm">Envoi à @{receiver?.username}</p>
              <p className="text-white font-black text-4xl">{parseInt(amount).toLocaleString('fr-FR')}</p>
              <p className="text-white/60 text-lg">FCFA</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <Shield size={18} className="text-amber-600 flex-shrink-0"/>
              <p className="text-amber-700 text-sm font-semibold">Entrez votre PIN pour confirmer</p>
            </div>
            <PinInput value={pin} onChange={v => { setPin(v); setPinError(false) }} error={pinError}/>
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

// ══════════════════════════════════════════════════════════
// PIN SETUP
// ══════════════════════════════════════════════════════════
function PinSetupSheet({ open, onClose, user }) {
  const [oldPin, setOldPin]         = useState('')
  const [newPin, setNewPin]         = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep]             = useState(1)
  const [hasPinAlready, setHas]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [pinError, setPinError]     = useState(false)

  useEffect(() => {
    if (open && user) {
      supabase.from('wallets').select('pin_set').eq('user_id', user.id).single()
        .then(({ data }) => { const h = !!data?.pin_set; setHas(h); setStep(h ? 1 : 2) })
    }
  }, [open, user])

  const reset = () => { setOldPin(''); setNewPin(''); setConfirmPin(''); setPinError(false); setStep(1) }

  const verifyOld = async () => {
    if (oldPin.length !== 4) return
    setLoading(true)
    const { data: wd } = await supabase.from('wallets').select('pin_hash').eq('user_id', user.id).single()
    const hash = await sha256(oldPin)
    setLoading(false)
    if (wd?.pin_hash !== hash) { setPinError(true); setOldPin(''); return }
    setPinError(false); setStep(2)
  }

  const confirm = async () => {
    if (confirmPin !== newPin) { setPinError(true); setConfirmPin(''); return }
    setLoading(true)
    try {
      const hash = await sha256(newPin)
      await supabase.from('wallets').update({ pin_hash: hash, pin_set: true }).eq('user_id', user.id)
      toast.success('🔐 PIN configuré !')
      reset(); onClose()
    } catch { toast.error('Erreur') }
    finally { setLoading(false) }
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose() }} title="🔐 Code PIN Wallet">
      <div className="px-5 py-6 space-y-5 pb-10">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <Shield size={20} className="text-green-600 flex-shrink-0"/>
          <div>
            <p className="font-bold text-green-800 text-sm">Code PIN sécurisé</p>
            <p className="text-green-600 text-xs">Requis pour paiements et transferts</p>
          </div>
        </div>
        {step === 1 && hasPinAlready && (
          <>
            <PinInput value={oldPin} onChange={v => { setOldPin(v); setPinError(false) }} error={pinError} label="PIN actuel"/>
            <button onClick={verifyOld} disabled={loading || oldPin.length !== 4}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin"/> : 'Vérifier →'}
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <PinInput value={newPin} onChange={v => { setNewPin(v); setPinError(false) }} label="Nouveau PIN (4 chiffres)"/>
            <button onClick={() => newPin.length === 4 && setStep(3)} disabled={newPin.length !== 4}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl disabled:opacity-60">Continuer →</button>
          </>
        )}
        {step === 3 && (
          <>
            <PinInput value={confirmPin} onChange={v => { setConfirmPin(v); setPinError(false) }} error={pinError} label="Confirmer le PIN"/>
            <div className="flex gap-3">
              <button onClick={() => { setStep(2); setConfirmPin(''); setPinError(false) }}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl">Retour</button>
              <button onClick={confirm} disabled={loading || confirmPin.length !== 4}
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

// ══════════════════════════════════════════════════════════
// REÇU PDF
// ══════════════════════════════════════════════════════════
async function downloadPDF(tx) {
  try {
    const { jsPDF } = await import('jspdf')
    const cfg = getTxCfg(tx)
    const amtFCFA = toFCFA(tx.amount)
    const isCredit = Number(tx.amount) > 0
    const receiptNum = tx.receipt_number || `MANG-${new Date().getFullYear()}-${String(tx.id||'').slice(0,6).toUpperCase()}`
    const doc = new jsPDF({ unit: 'pt', format: 'a5' })

    doc.setFillColor(11, 61, 46)
    doc.rect(0, 0, 420, 80, 'F')
    doc.setTextColor('#fff')
    doc.setFontSize(22); doc.setFont(undefined,'bold')
    doc.text('MANG Wallet', 30, 48)
    doc.setFontSize(8); doc.setFont(undefined,'normal')
    doc.text('Marché Agricole Nouvelle Génération', 30, 65)
    doc.text('REÇU OFFICIEL', 390, 48, { align:'right' })

    doc.setTextColor(isCredit ? '#16a34a' : '#dc2626')
    doc.setFontSize(32); doc.setFont(undefined,'bold')
    doc.text(`${isCredit?'+':'-'}${amtFCFA.toLocaleString('fr-FR')} FCFA`, 210, 140, { align:'center' })

    doc.setTextColor('#555')
    doc.setFontSize(12); doc.setFont(undefined,'normal')
    doc.text(cfg.label, 210, 162, { align:'center' })

    doc.setDrawColor('#e5e7eb'); doc.line(30, 178, 390, 178)

    const rows = [
      ['Reçu N°', receiptNum],
      ['Date', new Date(tx.created_at).toLocaleString('fr-FR')],
      ['Type', cfg.label],
      ['Montant', `${isCredit?'+':'-'}${amtFCFA.toLocaleString('fr-FR')} FCFA`],
      ['Statut', '✅ Validé'],
      tx.description && ['Description', tx.description],
    ].filter(Boolean)

    let y = 205
    rows.forEach(([lbl, val]) => {
      doc.setFont(undefined,'bold'); doc.setTextColor('#374151')
      doc.setFontSize(10); doc.text(lbl + ' :', 35, y)
      doc.setFont(undefined,'normal'); doc.setTextColor('#111')
      doc.text(String(val), 160, y)
      doc.setDrawColor('#f3f4f6'); doc.line(30, y+8, 390, y+8)
      y += 28
    })

    doc.setFillColor(249,250,251); doc.rect(0, 530, 420, 60, 'F')
    doc.setFontSize(7); doc.setTextColor('#9ca3af')
    doc.text('Reçu certifié MANG — mang-pbgk.vercel.app', 210, 550, { align:'center' })
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 210, 564, { align:'center' })

    doc.save(`${receiptNum}.pdf`)
    toast.success('✅ Reçu PDF téléchargé !')
  } catch (err) {
    console.error(err)
    toast.error('Erreur PDF. Assurez-vous que jspdf est installé.')
  }
}

function copyReceipt(tx) {
  const cfg = getTxCfg(tx)
  const amtFCFA = toFCFA(tx.amount)
  const isCredit = Number(tx.amount) > 0
  const receiptNum = tx.receipt_number || 'N/A'
  const text = `
🌿 MANG WALLET — REÇU OFFICIEL
================================
Reçu N°   : ${receiptNum}
Date      : ${new Date(tx.created_at).toLocaleString('fr-FR')}
Type      : ${cfg.label}
Montant   : ${isCredit?'+':'-'}${amtFCFA.toLocaleString('fr-FR')} FCFA
Statut    : ✅ Validé
${tx.description ? 'Note      : ' + tx.description : ''}
================================
MANG — mang-pbgk.vercel.app
`.trim()
  navigator.clipboard.writeText(text)
  toast.success('Reçu copié ! Collez-le sur WhatsApp.')
}

// ══════════════════════════════════════════════════════════
// DÉTAIL TRANSACTION
// ══════════════════════════════════════════════════════════
function TxDetailSheet({ open, onClose, tx }) {
  if (!tx) return null
  const cfg = getTxCfg(tx)
  const amtFCFA = toFCFA(tx.amount)
  const isCredit = Number(tx.amount) > 0
  const receiptNum = tx.receipt_number || 'N/A'

  return (
    <Sheet open={open} onClose={onClose} title="📄 Détail transaction">
      <div className="px-5 py-4 pb-10 space-y-4">
        <div className="text-center py-6 bg-gray-50 rounded-2xl">
          <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3', cfg.bg)}>{cfg.icon}</div>
          <p className={clsx('font-black text-4xl', isCredit ? 'text-emerald-600' : 'text-red-600')}>
            {isCredit?'+':'-'}{amtFCFA.toLocaleString('fr-FR')} FCFA
          </p>
          <p className="text-gray-500 text-sm mt-1">{cfg.label}</p>
        </div>
        <div className="bg-emerald-100 text-emerald-700 text-sm font-bold text-center py-2 rounded-xl">✅ Transaction validée</div>
        <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
          {[
            ['🧾 Reçu N°', receiptNum],
            ['📅 Date', new Date(tx.created_at).toLocaleString('fr-FR')],
            ['🏷️ Type', cfg.label],
            ['💵 Montant', `${isCredit?'+':'-'}${amtFCFA.toLocaleString('fr-FR')} FCFA`],
            tx.balance_after !== undefined && ['💰 Solde après', `${((Number(tx.balance_after))/100).toLocaleString('fr-FR')} FCFA`],
            tx.description && ['📌 Note', tx.description],
          ].filter(Boolean).map(([lbl, val]) => (
            <div key={lbl} className="flex items-start justify-between px-4 py-3 gap-3">
              <span className="text-gray-500 text-sm flex-shrink-0">{lbl}</span>
              <span className="text-gray-800 text-sm font-semibold text-right break-all">{val}</span>
            </div>
          ))}
        </div>
        <button onClick={() => downloadPDF(tx)}
          className="w-full py-4 bg-gray-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95">
          <Download size={18}/> Télécharger reçu PDF
        </button>
        <button onClick={() => copyReceipt(tx)}
          className="w-full py-3.5 bg-green-50 text-green-700 font-bold rounded-2xl border border-green-200 flex items-center justify-center gap-2 active:scale-95">
          <FileText size={16}/> Copier reçu (WhatsApp)
        </button>
      </div>
    </Sheet>
  )
}

// ══════════════════════════════════════════════════════════
// GRAPHIQUE
// ══════════════════════════════════════════════════════════
function MiniChart({ transactions }) {
  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-(6-i))
    const dayTx = transactions.filter(t => new Date(t.created_at).toDateString()===d.toDateString())
    return {
      day: d.toLocaleDateString('fr-FR',{weekday:'short'}),
      in:  dayTx.filter(t=>Number(t.amount)>0).reduce((s,t)=>s+toFCFA(t.amount),0),
      out: dayTx.filter(t=>Number(t.amount)<0).reduce((s,t)=>s+toFCFA(t.amount),0),
    }
  })
  const max = Math.max(...last7.flatMap(d=>[d.in,d.out]),1)
  const W=300, H=70, p=20
  const x = i => p+i*(W-p*2)/6
  const y = v => H-(v/max)*(H-8)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-gray-700 text-sm">Activité — 7 jours</p>
        <div className="flex gap-3 text-[10px] font-bold">
          <span className="text-emerald-600">▬ Entrées</span>
          <span className="text-red-500">▬ Sorties</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H+18}`} className="w-full" style={{height:75}}>
        <polyline points={last7.map((d,i)=>`${x(i)},${y(d.in)}`).join(' ')} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points={last7.map((d,i)=>`${x(i)},${y(d.out)}`).join(' ')} fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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

// ══════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════
export default function WalletPage() {
  const { user, wallet, refreshWallet } = useAuthStore()
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx]       = useState(true)
  const [balanceVisible, setBV]         = useState(true)
  const [copied, setCopied]             = useState(false)
  const [filter, setFilter]             = useState('all')

  const [depositOpen,  setDO] = useState(false)
  const [withdrawOpen, setWO] = useState(false)
  const [transferOpen, setTO] = useState(false)
  const [pinOpen,      setPO] = useState(false)
  const [selectedTx,   setST] = useState(null)

  useEffect(() => {
    if (!user) return
    loadTx(); refreshWallet()
    const params = new URLSearchParams(window.location.search)
    if (params.get('recharged')) {
      const amt = parseInt(params.get('recharged'))
      toast.success(`✅ ${amt.toLocaleString('fr-FR')} FCFA rechargés !`)
      window.history.replaceState({}, '', window.location.pathname)
      // Enregistrer transaction dépôt après retour FedaPay
      setTimeout(async () => {
        const { data: wd } = await supabase.from('wallets').select('id, balance_available').eq('user_id', user.id).single()
        if (wd) {
          await recordTx({
            walletId: wd.id, userId: user.id, type: 'deposit',
            amountCents: amt * 100, balanceAfterCents: wd.balance_available,
            description: `Rechargement ${amt.toLocaleString('fr-FR')} FCFA via ${params.get('op') || 'Mobile Money'}`,
          })
          loadTx(); refreshWallet()
        }
      }, 2500)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('wlt_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions' }, p => {
        if (p.new.user_id === user.id) { loadTx(); refreshWallet() }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets' }, p => {
        if (p.new.user_id === user.id) refreshWallet()
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  const loadTx = async () => {
    if (!user) return
    setLoadingTx(true)
    try {
      const { data, error } = await supabase.from('wallet_transactions')
        .select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(100)
      if (!error && data?.length) { setTransactions(data); setLoadingTx(false); return }
      // Fallback wallet_id
      const { data: wd } = await supabase.from('wallets').select('id').eq('user_id', user.id).single()
      if (!wd) { setLoadingTx(false); return }
      const { data: txd } = await supabase.from('wallet_transactions')
        .select('*').eq('wallet_id', wd.id)
        .order('created_at', { ascending: false }).limit(100)
      setTransactions(txd || [])
    } catch { setTransactions([]) }
    finally { setLoadingTx(false) }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet?.wallet_number || '')
    setCopied(true); toast.success('Numéro copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const onSuccess = () => { loadTx(); refreshWallet() }

  // Montants RÉELS en FCFA
  const balanceFCFA  = (wallet?.balance_available || 0) / 100
  const reservedFCFA = (wallet?.balance_reserved  || 0) / 100
  const now = new Date()
  const monthTx  = transactions.filter(t => { const d=new Date(t.created_at); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear() })
  const monthIn  = monthTx.filter(t=>Number(t.amount)>0).reduce((s,t)=>s+toFCFA(t.amount),0)
  const monthOut = monthTx.filter(t=>Number(t.amount)<0).reduce((s,t)=>s+toFCFA(t.amount),0)

  const filteredTx = transactions.filter(tx => {
    if (filter==='all') return true
    if (filter==='in')  return Number(tx.amount)>0
    if (filter==='out') return Number(tx.amount)<0
    const t=(tx.type||'').toLowerCase()
    return t.includes(filter)
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* CARTE */}
      <div className="relative overflow-hidden pt-14 pb-28 px-4"
        style={{background:'linear-gradient(135deg,#0b3d2e,#1a5c2e 55%,#2d8a3e)'}}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none"/>
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)',backgroundSize:'24px 24px'}}/>

        <div className="relative flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Wallet size={20} className="text-white"/>
            </div>
            <div>
              <p className="text-white font-black text-base">MANG Wallet</p>
              <p className="text-white/50 text-xs">Portefeuille numérique sécurisé</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setBV(v=>!v)} className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:scale-90">
              {balanceVisible ? <Eye size={15} className="text-white"/> : <EyeOff size={15} className="text-white"/>}
            </button>
            <button onClick={() => { loadTx(); refreshWallet() }} className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:scale-90">
              <RefreshCw size={15} className="text-white"/>
            </button>
          </div>
        </div>

        <div className="relative mb-5">
          <p className="text-white/60 text-xs mb-1">Solde disponible</p>
          <div className="flex items-end gap-2">
            <h2 className="font-black text-5xl text-white leading-none">
              {balanceVisible ? balanceFCFA.toLocaleString('fr-FR') : '••••••'}
            </h2>
            <span className="text-white/60 text-lg mb-1">FCFA</span>
          </div>
          {reservedFCFA > 0 && <p className="text-yellow-300 text-xs mt-2">🔒 {reservedFCFA.toLocaleString('fr-FR')} FCFA en escrow</p>}
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/10 border border-white/15 mb-6">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Numéro wallet</p>
            <p className="text-white font-mono font-bold tracking-[0.2em] text-base">
              {wallet?.wallet_number?.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') || '—— ——— ———'}
            </p>
          </div>
          <button onClick={handleCopy} className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center active:scale-90">
            {copied ? <Check size={16} className="text-emerald-300"/> : <Copy size={16} className="text-white/60"/>}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { icon:'➕', label:'Dépôt',    action:()=>setDO(true), color:'bg-emerald-500' },
            { icon:'💸', label:'Retrait',  action:()=>setWO(true), color:'bg-red-500'     },
            { icon:'🔄', label:'Transfert',action:()=>setTO(true), color:'bg-blue-500'    },
            { icon:'🔐', label:'PIN',      action:()=>setPO(true), color:'bg-purple-500'  },
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

      {/* STATS */}
      <div className="px-4 -mt-14 relative z-10">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ce mois-ci</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600"/>
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-semibold">Reçu</p>
                <p className="font-black text-emerald-700 text-sm">+{monthIn.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown size={18} className="text-red-500"/>
              </div>
              <div>
                <p className="text-xs text-red-500 font-semibold">Dépensé</p>
                <p className="font-black text-red-600 text-sm">-{monthOut.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {transactions.length > 0 && <div className="px-4 mt-4"><MiniChart transactions={transactions}/></div>}

      {/* HISTORIQUE */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-700 text-sm">Historique ({transactions.length})</p>
          <button onClick={loadTx} className="w-8 h-8 bg-white rounded-xl border border-gray-100 flex items-center justify-center active:scale-90">
            <RefreshCw size={13} className="text-gray-500"/>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {[
            {key:'all',     label:'Tout'},
            {key:'in',      label:'📥 Entrées'},
            {key:'out',     label:'📤 Sorties'},
            {key:'deposit', label:'💰 Dépôts'},
            {key:'withdraw',label:'💸 Retraits'},
            {key:'transfer',label:'🔄 Transferts'},
            {key:'order',   label:'🛒 Commandes'},
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={clsx('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors',
                filter===f.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200')}>
              {f.label}
            </button>
          ))}
        </div>

        {loadingTx ? (
          <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-green-500"/></div>
        ) : filteredTx.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">💳</div>
            <p className="font-bold text-gray-500">Aucune transaction</p>
            <p className="text-sm text-gray-400 mt-1">Vos transactions apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTx.map(tx => {
              const cfg = getTxCfg(tx)
              const amtFCFA = toFCFA(tx.amount)
              const isCredit = Number(tx.amount) > 0
              const date = new Date(tx.created_at)
              return (
                <div key={tx.id} onClick={() => setST(tx)}
                  className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
                  <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0', cfg.bg)}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{cfg.label}</p>
                    <p className="text-gray-400 text-xs">
                      {date.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})} · {date.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                    </p>
                    {tx.receipt_number && <p className="text-gray-300 text-[10px] truncate">#{tx.receipt_number}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={clsx('font-black text-base', isCredit ? 'text-emerald-600' : 'text-red-500')}>
                      {isCredit?'+':'-'}{amtFCFA.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-gray-400 text-[10px]">FCFA</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0"/>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <DepositSheet  open={depositOpen}  onClose={()=>setDO(false)} user={user} wallet={wallet} onSuccess={onSuccess}/>
      <WithdrawSheet open={withdrawOpen} onClose={()=>setWO(false)} user={user} wallet={wallet} onSuccess={onSuccess}/>
      <TransferSheet open={transferOpen} onClose={()=>setTO(false)} user={user} wallet={wallet} onSuccess={onSuccess}/>
      <PinSetupSheet open={pinOpen}      onClose={()=>setPO(false)} user={user}/>
      <TxDetailSheet open={!!selectedTx} onClose={()=>setST(null)}  tx={selectedTx}/>
    </div>
  )
}
