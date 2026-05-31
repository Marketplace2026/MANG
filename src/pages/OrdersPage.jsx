import { useState, useEffect, useCallback } from 'react'
import {
  Package, CheckCircle, XCircle, Clock, CreditCard,
  ChevronRight, User, Store, MapPin, Phone, Hash,
  RefreshCw, Filter, Percent, AlertCircle, Eye
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, BottomSheet, PinInput, Button, Modal } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ============================================================
// CONFIG STATUTS
// ============================================================
const STATUS_CONFIG = {
  pending:  { label: 'En attente',  color: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500', icon: Clock },
  accepted: { label: 'Acceptée',    color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle },
  refused:  { label: 'Refusée',     color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     icon: XCircle },
  paid:     { label: 'Payée',       color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',    icon: CreditCard },
}

const TABS = [
  { key: 'all',    label: 'Tout' },
  { key: 'buyer',  label: 'Mes achats' },
  { key: 'seller', label: 'Reçues' },
]

const FILTER_STATUS = ['all','pending','accepted','refused','paid']

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function OrdersPage() {
  const { user, profile, wallet } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [pinModal, setPinModal] = useState(null) // { orderId, action }
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [processing, setProcessing] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [buyerRes, sellerRes] = await Promise.all([
        supabase.from('orders').select(`
          *,
          seller:profiles!orders_seller_id_fkey(id, username, avatar_url),
          product:products(id, name, description, image_url),
          shop:shops(id, name, cover_url)
        `).eq('buyer_id', user.id).order('created_at', { ascending: false }),

        supabase.from('orders').select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(id, username, avatar_url),
          product:products(id, name, description, image_url),
          shop:shops(id, name, cover_url)
        `).eq('seller_id', user.id).order('created_at', { ascending: false }),
      ])

      const buyerOrders = (buyerRes.data || []).map(o => ({ ...o, role: 'buyer' }))
      const sellerOrders = (sellerRes.data || []).map(o => ({ ...o, role: 'seller' }))
      const all = [...buyerOrders, ...sellerOrders].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      setOrders(all)

      // Marquer les commandes vendeur comme vues
      const pendingIds = sellerOrders.filter(o => o.status === 'pending').map(o => o.id)
      if (pendingIds.length) {
        await supabase.from('orders').update({ is_seen: true }).in('id', pendingIds)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadOrders() }, [loadOrders])

  // Filtrage
  const filteredOrders = orders.filter(o => {
    if (tab === 'buyer' && o.role !== 'buyer') return false
    if (tab === 'seller' && o.role !== 'seller') return false
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    return true
  })

  // Stats
  const stats = {
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'pending').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    paid:     orders.filter(o => o.status === 'paid').length,
  }

  // Accepter commande (vendeur)
  const handleAccept = async (orderId) => {
    setProcessing(true)
    try {
      const { error } = await supabase.rpc('accept_order', { p_order_id: orderId })
      if (error) throw error
      toast.success('Commande acceptée ✅')
      loadOrders()
      setSelectedOrder(null)
    } catch { toast.error('Erreur lors de l\'acceptation') }
    finally { setProcessing(false) }
  }

  // Refuser commande (vendeur)
  const handleRefuse = async (orderId) => {
    if (!confirm('Refuser cette commande ? Le montant sera remboursé à l\'acheteur.')) return
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('refuse_order', { p_seller_id: user.id, p_order_id: orderId })
      if (error) throw error
      toast.success('Commande refusée — remboursement effectué')
      loadOrders()
      setSelectedOrder(null)
    } catch { toast.error('Erreur lors du refus') }
    finally { setProcessing(false) }
  }

  // Payer commande (acheteur) — vérifie PIN
  const handlePayWithPin = async () => {
    if (pin.length !== 4) { setPinError(true); return }
    setProcessing(true)
    setPinError(false)

    try {
      // Vérifier PIN
      const { data: walletData } = await supabase
        .from('wallets').select('pin_hash, pin_set').eq('user_id', user.id).single()

      if (!walletData?.pin_set) {
        toast.error('Configurez d\'abord votre PIN wallet dans le Portefeuille')
        setPinModal(null); setPin('')
        return
      }

      // Hash PIN côté client (SHA-256)
      const encoder = new TextEncoder()
      const data = encoder.encode(pin)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const pinHash = hashArray.map(b => b.toString(16).padStart(2,'0')).join('')

      if (pinHash !== walletData.pin_hash) {
        setPinError(true)
        setPin('')
        toast.error('PIN incorrect')
        return
      }

      // Payer la commande
      const { error } = await supabase.rpc('pay_order', {
        p_buyer_id: user.id,
        p_order_id: pinModal.orderId,
        p_pin_hash: pinHash,
      })

      if (error) throw error

      toast.success('Paiement effectué avec succès ! 🎉')
      setPinModal(null)
      setPin('')
      setSelectedOrder(null)
      loadOrders()
    } catch (err) {
      toast.error(err.message || 'Erreur lors du paiement')
    } finally { setProcessing(false) }
  }

  const pendingSellerCount = orders.filter(o => o.role === 'seller' && o.status === 'pending').length

  return (
    <div className="min-h-screen bg-surface-50">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 pt-3 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)',backgroundSize:'20px 20px'}}/>
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-display text-2xl text-white font-bold">Commandes</h1>
              <p className="text-primary-300 text-sm">Achats & ventes</p>
            </div>
            <button onClick={loadOrders} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-95">
              <RefreshCw size={16} className="text-white"/>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label:'Total',    value: stats.total,    color:'text-white' },
              { label:'En attente', value: stats.pending, color:'text-orange-300' },
              { label:'Acceptées', value: stats.accepted, color:'text-emerald-300' },
              { label:'Payées',   value: stats.paid,     color:'text-blue-300' },
            ].map((s,i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-2.5 text-center">
                <p className={clsx('font-display font-bold text-xl leading-none', s.color)}>{s.value}</p>
                <p className="text-white/50 text-[9px] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Alerte commandes en attente */}
          {pendingSellerCount > 0 && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-2xl bg-orange-400/20 border border-orange-400/30">
              <AlertCircle size={16} className="text-orange-300 flex-shrink-0"/>
              <p className="text-orange-200 text-xs font-semibold">
                {pendingSellerCount} commande{pendingSellerCount > 1 ? 's' : ''} en attente de votre réponse
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="relative -mt-10 px-4 pb-28 space-y-3">
        {/* TABS */}
        <div className="bg-white rounded-2xl shadow-card p-1.5 flex gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx('flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
                tab === t.key ? 'bg-primary-600 text-white shadow-green' : 'text-dark-600')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* FILTRE STATUT */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_STATUS.map(s => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={clsx('flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border-2',
                  filterStatus === s
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-surface-200 bg-white text-dark-600')}>
                {s === 'all' ? '🔄 Toutes' : cfg?.label}
              </button>
            )
          })}
        </div>

        {/* LISTE */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <OrderSkeleton key={i}/>)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-card">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-display text-lg font-bold text-dark-800">Aucune commande</p>
            <p className="text-dark-600/50 text-sm mt-1">Vos commandes apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id + order.role}
                order={order}
                isBuyer={order.role === 'buyer'}
                onOpen={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* DETAIL COMMANDE */}
      <OrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        isBuyer={selectedOrder?.role === 'buyer'}
        onAccept={() => handleAccept(selectedOrder?.id)}
        onRefuse={() => handleRefuse(selectedOrder?.id)}
        onPay={() => { setPinModal({ orderId: selectedOrder?.id }); setPin('') }}
        processing={processing}
      />

      {/* PIN MODAL */}
      <Modal open={!!pinModal} onClose={() => { setPinModal(null); setPin(''); setPinError(false) }} title="🔐 Code PIN Wallet">
        <div className="p-5 space-y-5">
          <p className="text-sm text-dark-600 text-center">
            Entrez votre PIN à 4 chiffres pour confirmer le paiement
          </p>

          <div className="text-center">
            <p className="font-display text-2xl font-bold text-dark-800">
              {selectedOrder ? (selectedOrder.total_amount / 100).toLocaleString('fr-FR') : 0} FCFA
            </p>
            <p className="text-dark-600/50 text-xs mt-1">Montant à payer</p>
          </div>

          <PinInput value={pin} onChange={v => { setPin(v); setPinError(false) }} length={4} error={pinError}/>
          {pinError && <p className="text-center text-red-500 text-xs font-semibold">PIN incorrect, réessayez</p>}

          <Button variant="primary" className="w-full" size="lg"
            loading={processing} disabled={pin.length !== 4}
            onClick={handlePayWithPin}>
            Confirmer le paiement
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================
// ORDER CARD
// ============================================================
function OrderCard({ order, isBuyer, onOpen }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon
  const otherUser = isBuyer ? order.seller : order.buyer
  const amount = order.total_amount ? order.total_amount / 100 : order.total_amount || 0

  return (
    <div onClick={onOpen}
      className="bg-white rounded-2xl shadow-card overflow-hidden active:scale-[0.98] transition-transform cursor-pointer">
      <div className="flex gap-3 p-3.5">
        {/* Image produit */}
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-100">
          {order.product?.image_url
            ? <img src={order.product.image_url} className="w-full h-full object-cover" alt={order.product.name}/>
            : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🌿</div>}
        </div>

        <div className="flex-1 min-w-0">
          {/* Statut */}
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold', cfg.color)}>
              <div className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)}/>
              {cfg.label}
            </span>
            <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-lg',
              isBuyer ? 'bg-blue-50 text-blue-600' : 'bg-primary-50 text-primary-600')}>
              {isBuyer ? '🛒 Achat' : '🏪 Vente'}
            </span>
          </div>

          <p className="font-bold text-dark-800 text-sm truncate">{order.product?.name || 'Produit'}</p>
          <p className="text-dark-600/50 text-xs mt-0.5">
            {isBuyer ? 'Vendeur' : 'Acheteur'} : @{otherUser?.username}
          </p>

          <div className="flex items-center justify-between mt-1.5">
            <span className="font-display font-bold text-primary-700 text-sm">
              {amount.toLocaleString('fr-FR')} FCFA
            </span>
            <span className="text-dark-600/40 text-[10px]">
              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
        </div>

        <ChevronRight size={16} className="text-dark-600/30 self-center flex-shrink-0"/>
      </div>

      {/* Barre action rapide si en attente */}
      {order.status === 'pending' && !isBuyer && (
        <div className="flex border-t border-surface-100">
          <button onClick={e => { e.stopPropagation(); /* handled in detail */ onOpen() }}
            className="flex-1 py-2.5 text-xs font-bold text-primary-600 bg-primary-50 active:bg-primary-100 transition-colors">
            Voir & Répondre →
          </button>
        </div>
      )}
      {order.status === 'accepted' && isBuyer && (
        <div className="flex border-t border-surface-100">
          <button onClick={e => { e.stopPropagation(); onOpen() }}
            className="flex-1 py-2.5 text-xs font-bold text-emerald-600 bg-emerald-50 active:bg-emerald-100 transition-colors">
            Payer maintenant →
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// ORDER DETAIL SHEET
// ============================================================
function OrderDetailSheet({ open, onClose, order, isBuyer, onAccept, onRefuse, onPay, processing }) {
  if (!order) return null

  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const otherUser = isBuyer ? order.seller : order.buyer
  const amount = order.total_amount ? order.total_amount / 100 : 0
  const commission = order.commission ? order.commission / 100 : Math.round(amount * 0.05)
  const net = order.net_amount ? order.net_amount / 100 : amount - commission

  const info = [
    { icon: Hash,    label: 'ID commande', value: `#${order.id.slice(0,8).toUpperCase()}` },
    { icon: Package, label: 'Produit',     value: order.product?.name || '—' },
    { icon: User,    label: isBuyer ? 'Vendeur' : 'Acheteur', value: `@${otherUser?.username || '—'}` },
    { icon: Store,   label: 'Boutique',    value: order.shop?.name || '—' },
    { icon: MapPin,  label: 'Livraison',   value: order.delivery_address || 'Non renseigné' },
    { icon: Phone,   label: 'Téléphone',   value: order.delivery_phone || 'Non renseigné' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="Détails de la commande">
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Produit image + statut */}
        <div className="flex gap-3 items-center p-3 bg-surface-50 rounded-2xl">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-surface-100">
            {order.product?.image_url
              ? <img src={order.product.image_url} className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🌿</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-dark-800 text-sm">{order.product?.name}</p>
            <p className="text-dark-600/50 text-xs mt-0.5 line-clamp-2">{order.product?.description}</p>
          </div>
          <span className={clsx('px-2.5 py-1 rounded-xl text-xs font-bold flex-shrink-0', cfg.color)}>
            {cfg.label}
          </span>
        </div>

        {/* Montants */}
        <div className="bg-dark-800 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">Montant total</span>
            <span className="font-display font-bold text-white text-lg">{amount.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/40 text-xs flex items-center gap-1"><Percent size={11}/> Commission (5%)</span>
            <span className="text-red-400 text-xs font-semibold">-{commission.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between items-center">
            <span className="text-emerald-400 text-sm font-semibold">Net vendeur</span>
            <span className="font-display font-bold text-emerald-400">{net.toLocaleString('fr-FR')} FCFA</span>
          </div>
          {order.escrow_amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gold-400 text-xs flex items-center gap-1">🔒 En escrow</span>
              <span className="text-gold-400 text-xs font-semibold">{(order.escrow_amount/100).toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-surface-100">
          {info.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                <item.icon size={13} className="text-primary-600"/>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-dark-600/50 font-medium">{item.label}</p>
                <p className="text-sm text-dark-800 font-semibold truncate">{item.value}</p>
              </div>
            </div>
          ))}
          {order.note && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-dark-600/50 font-medium mb-0.5">Note de l'acheteur</p>
              <p className="text-sm text-dark-700 italic">"{order.note}"</p>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="space-y-2">
          {/* VENDEUR — commande en attente */}
          {!isBuyer && order.status === 'pending' && (
            <>
              <p className="text-xs text-dark-600/50 text-center font-medium">
                ⚠️ L'argent est en escrow. Acceptez ou refusez cette commande.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="danger" loading={processing} onClick={onRefuse} className="w-full">
                  <XCircle size={15}/> Refuser
                </Button>
                <Button variant="primary" loading={processing} onClick={onAccept} className="w-full">
                  <CheckCircle size={15}/> Accepter
                </Button>
              </div>
            </>
          )}

          {/* ACHETEUR — commande acceptée */}
          {isBuyer && order.status === 'accepted' && (
            <>
              <p className="text-xs text-emerald-600 text-center font-semibold bg-emerald-50 p-2 rounded-xl">
                ✅ Le vendeur a accepté ! Payez maintenant pour finaliser.
              </p>
              <Button variant="primary" size="lg" className="w-full" onClick={onPay}>
                <CreditCard size={16}/> Payer — {amount.toLocaleString('fr-FR')} FCFA
              </Button>
            </>
          )}

          {order.status === 'paid' && (
            <div className="text-center py-3 bg-blue-50 rounded-2xl">
              <p className="text-blue-700 font-bold text-sm">🎉 Commande finalisée et payée !</p>
            </div>
          )}
          {order.status === 'refused' && (
            <div className="text-center py-3 bg-red-50 rounded-2xl">
              <p className="text-red-600 font-bold text-sm">❌ Commande refusée — remboursement effectué</p>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

function OrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-3.5 flex gap-3">
      <div className="w-16 h-16 rounded-xl skeleton flex-shrink-0"/>
      <div className="flex-1 space-y-2">
        <div className="h-4 skeleton rounded-lg w-1/3"/>
        <div className="h-3.5 skeleton rounded-lg w-2/3"/>
        <div className="h-3 skeleton rounded-lg w-1/2"/>
        <div className="h-3.5 skeleton rounded-lg w-1/3"/>
      </div>
    </div>
  )
}
