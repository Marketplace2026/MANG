import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, CheckCircle, XCircle, Clock, CreditCard,
  ChevronRight, RefreshCw, Truck, MapPin, Phone,
  Hash, AlertCircle, Shield, X, Loader2, User, Search
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, BottomSheet } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const formatFCFA = (val) => Math.round(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

// ── Config statuts ──────────────────────────────────────────
const STATUS = {
  pending:  { label: 'En attente',  color: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500',  icon: Clock },
  accepted: { label: 'Acceptée',   color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle },
  refused:  { label: 'Refusée',    color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     icon: XCircle },
  paid:     { label: 'Payée',      color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',    icon: CreditCard },
}

const DELIVERY_STATUS = {
  pending:    { label: 'En attente livraison', icon: '⏳', color: 'bg-orange-50 text-orange-700' },
  preparing:  { label: 'En préparation',       icon: '📦', color: 'bg-blue-50 text-blue-700'    },
  shipped:    { label: 'En route',             icon: '🚚', color: 'bg-violet-50 text-violet-700' },
  delivered:  { label: 'Livré',               icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
}

const TABS = [
  { key: 'all',    label: 'Toutes' },
  { key: 'buyer',  label: '🛒 Mes achats' },
  { key: 'seller', label: '🏪 Reçues' },
]

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

// ── PIN Input ────────────────────────────────────────────────
function PinInput({ value, onChange, error }) {
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
            digits[i] ? 'border-primary-500 bg-primary-50' :
            'border-surface-200 bg-surface-50 focus:border-primary-400'
          )}
        />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════
export default function OrdersPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('all')
  const [filterStatus, setFilter]   = useState('all')
  const [selectedOrder, setSelected] = useState(null)
  const [reviewOrder, setReviewOrder] = useState(null)
  const [disputeOrder, setDisputeOrder] = useState(null)

  // Search & Batch Selection
  const [search, setSearch]                   = useState('')
  const [ordersLimit, setOrdersLimit]         = useState(15)
  const [hasMore, setHasMore]                 = useState(false)
  const [moreLoading, setMoreLoading]         = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [selectionMode, setSelectionMode]     = useState(false)

  // PIN payment
  const [pinModal, setPinModal]     = useState(null)
  const [pin, setPin]               = useState('')
  const [pinError, setPinError]     = useState(false)
  const [processing, setProcessing] = useState(false)

  const loadOrders = useCallback(async (isMore = false) => {
    if (!user) return
    if (!isMore) {
      setLoading(true)
    } else {
      setMoreLoading(true)
    }
    try {
      const currentLimit = isMore ? ordersLimit + 15 : 15
      const [bRes, sRes] = await Promise.all([
        supabase.from('orders').select(`
          *, 
          seller:profiles!orders_seller_id_fkey(id, username, avatar_url),
          product:products(id, name, image_url, price),
          shop:shops(id, name)
        `).eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(currentLimit),

        supabase.from('orders').select(`
          *,
          buyer:profiles!orders_buyer_id_fkey(id, username, avatar_url),
          product:products(id, name, image_url, price),
          shop:shops(id, name)
        `).eq('seller_id', user.id).order('created_at', { ascending: false }).limit(currentLimit),
      ])
      const all = [
        ...(bRes.data || []).map(o => ({ ...o, role: 'buyer' })),
        ...(sRes.data || []).map(o => ({ ...o, role: 'seller' })),
      ].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      setOrders(all)
      setOrdersLimit(currentLimit)
      setHasMore((bRes.data?.length === currentLimit) || (sRes.data?.length === currentLimit))
    } finally {
      setLoading(false)
      setMoreLoading(false)
    }
  }, [user, ordersLimit])

  useEffect(() => {
    loadOrders(false)
  }, [user])

  // Realtime
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('orders_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders(false))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, loadOrders])

  // Advanced search filter
  const filtered = orders.filter(o => {
    if (tab === 'buyer'  && o.role !== 'buyer')  return false
    if (tab === 'seller' && o.role !== 'seller') return false
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      const idMatch = o.id.toLowerCase().includes(s)
      const prodMatch = (o.product?.name || '').toLowerCase().includes(s)
      const shopMatch = (o.shop?.name || '').toLowerCase().includes(s)
      const userMatch = o.role === 'buyer'
        ? (o.seller?.username || '').toLowerCase().includes(s)
        : (o.buyer?.username || '').toLowerCase().includes(s)
      if (!idMatch && !prodMatch && !shopMatch && !userMatch) return false
    }
    return true
  })

  const stats = {
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'pending').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    paid:     orders.filter(o => o.status === 'paid').length,
  }

  // ── Accepter commande ──
  const handleAccept = async (orderId) => {
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('accept_order', { p_order_id: orderId })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      toast.success('✅ Commande acceptée !')
      loadOrders(false); setSelected(null)
    } catch (err) { toast.error(err.message || 'Erreur lors de l\'acceptation') }
    finally { setProcessing(false) }
  }

  // ── Refuser commande ──
  const handleRefuse = async (orderId) => {
    if (!confirm('Refuser cette commande ? Le montant sera remboursé à l\'acheteur.')) return
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('refuse_order', {
        p_seller_id: user.id,
        p_order_id:  orderId,
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      toast.success('Commande refusée — remboursement effectué')
      loadOrders(false); setSelected(null)
    } catch (err) { toast.error(err.message || 'Erreur lors du refus') }
    finally { setProcessing(false) }
  }

  // ── Payer avec PIN ──
  const handlePayWithPin = async () => {
    if (pin.length !== 4) { setPinError(true); return }
    setProcessing(true); setPinError(false)
    try {
      const { data: wd } = await supabase.from('wallets')
        .select('pin_hash, pin_set').eq('user_id', user.id).single()

      if (!wd?.pin_set) {
        toast.error('Configurez votre PIN dans le Wallet d\'abord')
        setPinModal(null); setPin(''); return
      }

      const pinHash = await sha256(pin)
      if (wd.pin_hash !== pinHash) {
        setPinError(true); setPin('')
        toast.error('PIN incorrect')
        return
      }

      const { data, error } = await supabase.rpc('pay_order', {
        p_buyer_id:  user.id,
        p_order_id:  pinModal.orderId,
        p_pin_hash:  pinHash,
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      toast.success(`🎉 Paiement de ${data.amount_paid_fcfa?.toLocaleString('fr-FR')} FCFA effectué !`)
      setPinModal(null); setPin(''); setSelected(null)
      loadOrders(false)
    } catch (err) { toast.error(err.message || 'Erreur lors du paiement') }
    finally { setProcessing(false) }
  }

  // ── Suivi livraison (vendeur) ──
  const handleDeliveryStatus = async (orderId, status) => {
    const labels = { preparing:'En préparation', shipped:'Expédié', delivered:'Livré' }
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('update_delivery_status', {
        p_seller_id: user.id,
        p_order_id: orderId,
        p_status: status,
      })
      if (error) throw new Error(error.message)
      toast.success(`✅ Statut mis à jour : ${labels[status]}`)
      loadOrders(false); setSelected(null)
    } catch (err) { toast.error(err.message) }
    finally { setProcessing(false) }
  }

  // ── Messagerie Instantanée Directe ──
  const handleContact = async (buyerId, sellerId, shopId) => {
    console.log('[handleContact] Initiated with:', { buyerId, sellerId, shopId })
    try {
      if (!buyerId || !sellerId || !shopId) {
        const missing = []
        if (!buyerId) missing.push('buyerId')
        if (!sellerId) missing.push('sellerId')
        if (!shopId) missing.push('shopId')
        console.error('[handleContact] Error: Missing ID!', { buyerId, sellerId, shopId })
        throw new Error(`ID manquant (${missing.join(', ')})`)
      }

      // Rechercher si la conversation existe déjà par UNIQUE(shop_id, buyer_id)
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('shop_id', shopId)
        .eq('buyer_id', buyerId)
        .limit(1)

      if (findError) {
        console.error('[handleContact] Search error:', findError)
        throw findError
      }

      let convId
      if (existing && existing.length > 0) {
        convId = existing[0].id
        console.log('[handleContact] Found existing conversation:', convId)
      } else {
        console.log('[handleContact] Creating new conversation...')
        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({
            buyer_id: buyerId,
            seller_id: sellerId,
            shop_id: shopId
          })
          .select('id')
          .single()
        
        if (createError) {
          console.error('[handleContact] Insert error:', createError)
          throw createError
        }
        convId = created.id
        console.log('[handleContact] Created new conversation ID:', convId)
      }
      navigate(`/messages?conv=${convId}`)
    } catch (err) {
      console.error('[handleContact] Failed:', err)
      toast.error(err.message || 'Erreur lors de la création de la messagerie')
    }
  }

  // ── Impression Bon / Facture PDF (A4) ──
  const downloadOrderPDF = async (order) => {
    try {
      const { jsPDF } = await import('jspdf')
      const receiptNum = `MANG-ORD-${order.id.slice(0,8).toUpperCase()}`
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })

      const logoImg = await new Promise((resolve) => {
        const img = new Image()
        img.src = '/logo-mang.png'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
      })

      // Header MANG
      doc.setFillColor(11, 61, 46)
      doc.rect(0, 0, 595, 100, 'F')

      if (logoImg) {
        doc.addImage(logoImg, 'PNG', 35, 25, 50, 50)
      }

      const startX = logoImg ? 100 : 35
      doc.setTextColor('#ffffff')
      doc.setFontSize(22); doc.setFont(undefined, 'bold')
      doc.text('MANG Marketplace', startX, 55)
      doc.setFontSize(10); doc.setFont(undefined, 'normal')
      doc.text('Marché Agricole Nouvelle Génération', startX, 75)
      doc.setFontSize(12); doc.setFont(undefined, 'bold')
      doc.text(order.role === 'buyer' ? 'FACTURE ACHAT' : 'BON DE LIVRAISON', 560, 60, { align: 'right' })

      // Grid Details
      doc.setTextColor('#374151')
      doc.setFontSize(10)
      
      doc.setFont(undefined, 'bold')
      doc.text('Commande N° :', 35, 140)
      doc.setFont(undefined, 'normal')
      doc.text(receiptNum, 120, 140)

      doc.setFont(undefined, 'bold')
      doc.text('Date :', 35, 160)
      doc.setFont(undefined, 'normal')
      doc.text(new Date(order.created_at).toLocaleDateString('fr-FR'), 120, 160)

      doc.setFont(undefined, 'bold')
      doc.text('Statut Paye :', 35, 180)
      doc.setFont(undefined, 'normal')
      doc.text(order.status === 'paid' ? 'Payé' : 'En attente', 120, 180)

      doc.setFont(undefined, 'bold')
      doc.text('Boutique :', 320, 140)
      doc.setFont(undefined, 'normal')
      doc.text(order.shop?.name || 'MANG Shop', 400, 140)

      doc.setFont(undefined, 'bold')
      doc.text('Acheteur :', 320, 160)
      doc.setFont(undefined, 'normal')
      doc.text(`@${order.buyer?.username || 'Client'}`, 400, 160)

      doc.setFont(undefined, 'bold')
      doc.text('Téléphone :', 320, 180)
      doc.setFont(undefined, 'normal')
      doc.text(order.delivery_phone || '—', 400, 180)

      // Separator
      doc.setDrawColor('#e5e7eb')
      doc.line(35, 205, 560, 205)

      // Product section
      doc.setFont(undefined, 'bold')
      doc.setTextColor('#111111')
      doc.setFontSize(12)
      doc.text('DÉTAILS DU PRODUIT', 35, 230)

      doc.setFillColor(243, 244, 246)
      doc.rect(35, 245, 525, 25, 'F')
      doc.setFontSize(10)
      doc.setTextColor('#374151')
      doc.text('Produit', 45, 261)
      doc.text('Quantité', 320, 261, { align: 'center' })
      doc.text('Prix unitaire', 420, 261, { align: 'right' })
      doc.text('Total', 540, 261, { align: 'right' })

      doc.setFont(undefined, 'normal')
      doc.setTextColor('#111111')
      doc.text(order.product?.name || 'Produit', 45, 292)
      doc.text(String(order.quantity), 320, 292, { align: 'center' })
      doc.text(formatFCFA(order.unit_price || order.product?.price || 0), 420, 292, { align: 'right' })
      doc.text(formatFCFA(order.total_amount), 540, 292, { align: 'right' })

      doc.line(35, 310, 560, 310)

      // Totals
      let summaryY = 335
      doc.setFont(undefined, 'bold')
      doc.text('Sous-total :', 400, summaryY)
      doc.setFont(undefined, 'normal')
      doc.text(formatFCFA(order.total_amount), 540, summaryY, { align: 'right' })

      summaryY += 20
      doc.setFont(undefined, 'bold')
      doc.text('Livraison :', 400, summaryY)
      doc.setFont(undefined, 'normal')
      doc.text('Gratuit', 540, summaryY, { align: 'right' })

      summaryY += 25
      doc.setFillColor(243, 244, 246)
      doc.rect(380, summaryY - 15, 180, 25, 'F')
      doc.setFont(undefined, 'bold')
      doc.setTextColor('#111111')
      doc.text('Total payé :', 400, summaryY)
      doc.text(formatFCFA(order.total_amount), 540, summaryY, { align: 'right' })

      // Address
      let shipY = 430
      doc.setFont(undefined, 'bold')
      doc.setFontSize(12)
      doc.text('ADRESSE DE LIVRAISON', 35, shipY)

      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      doc.setTextColor('#374151')
      const splitAddress = doc.splitTextToSize(order.delivery_address || 'Non renseigné', 525)
      doc.text(splitAddress, 35, shipY + 20)

      // Footer
      doc.setFillColor(249, 250, 251)
      doc.rect(0, 780, 595, 62, 'F')
      doc.setFontSize(8)
      doc.setTextColor('#9ca3af')
      doc.text('Facture officielle générée par MANG Marketplace', 297, 805, { align: 'center' })
      doc.text(`Date d'impression : ${new Date().toLocaleString('fr-FR')}`, 297, 818, { align: 'center' })

      doc.save(`${receiptNum}.pdf`)
      toast.success('Facture PDF téléchargée ! 📄')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors du téléchargement du PDF')
    }
  }

  // ── Traitement Par Lot (Batch Actions) ──
  const handleBatchAccept = async () => {
    if (!selectedOrderIds.length) return
    setProcessing(true)
    let successCount = 0
    try {
      await Promise.all(selectedOrderIds.map(async (id) => {
        const { data } = await supabase.rpc('accept_order', { p_order_id: id })
        if (data?.success || !data?.error) successCount++
      }))
      toast.success(`✅ ${successCount} commandes acceptées !`)
      setSelectedOrderIds([])
      setSelectionMode(false)
      loadOrders(false)
    } catch {
      toast.error('Erreur lors du traitement par lot')
    } finally {
      setProcessing(false)
    }
  }

  const handleBatchRefuse = async () => {
    if (!selectedOrderIds.length) return
    if (!confirm(`Refuser ces ${selectedOrderIds.length} commandes ? Les acheteurs seront remboursés.`)) return
    setProcessing(true)
    let successCount = 0
    try {
      await Promise.all(selectedOrderIds.map(async (id) => {
        const { data } = await supabase.rpc('refuse_order', {
          p_seller_id: user.id,
          p_order_id: id
        })
        if (data?.success || !data?.error) successCount++
      }))
      toast.success(`✅ ${successCount} commandes refusées`)
      setSelectedOrderIds([])
      setSelectionMode(false)
      loadOrders(false)
    } catch {
      toast.error('Erreur lors du traitement par lot')
    } finally {
      setProcessing(false)
    }
  }

  const handleBatchShip = async () => {
    if (!selectedOrderIds.length) return
    setProcessing(true)
    let successCount = 0
    try {
      await Promise.all(selectedOrderIds.map(async (id) => {
        const { data } = await supabase.rpc('update_delivery_status', {
          p_seller_id: user.id,
          p_order_id: id,
          p_status: 'shipped'
        })
        if (data?.success || !data?.error) successCount++
      }))
      toast.success(`🚚 ${successCount} commandes expédiées !`)
      setSelectedOrderIds([])
      setSelectionMode(false)
      loadOrders(false)
    } catch {
      toast.error('Erreur lors de l\'expédition par lot')
    } finally {
      setProcessing(false)
    }
  }

  const pendingCount = orders.filter(o => o.role === 'seller' && o.status === 'pending').length

  return (
    <div className="min-h-screen bg-surface-50 pb-28">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 pt-12 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize: '20px 20px' }}/>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl text-white font-bold">Commandes</h1>
              <p className="text-primary-300 text-sm">Achats & ventes</p>
            </div>
            <button onClick={() => loadOrders(false)}
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90">
              <RefreshCw size={16} className="text-white"/>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total',     value: stats.total,    color: 'text-white' },
              { label: 'En attente', value: stats.pending,  color: 'text-orange-300' },
              { label: 'Acceptées', value: stats.accepted, color: 'text-emerald-300' },
              { label: 'Payées',    value: stats.paid,     color: 'text-blue-300' },
            ].map((s,i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-2.5 text-center">
                <p className={clsx('font-display font-bold text-xl leading-none', s.color)}>{s.value}</p>
                <p className="text-white/50 text-[9px] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {pendingCount > 0 && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-2xl bg-orange-400/20 border border-orange-400/30">
              <AlertCircle size={16} className="text-orange-300 flex-shrink-0"/>
              <p className="text-orange-200 text-xs font-semibold">
                {pendingCount} commande{pendingCount > 1 ? 's' : ''} en attente de votre réponse !
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="relative -mt-10 px-4 space-y-3">
        {/* TABS */}
        <div className="bg-white rounded-2xl shadow-card p-1.5 flex gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => {
              setTab(t.key)
              setSelectionMode(false)
              setSelectedOrderIds([])
            }}
              className={clsx('flex-1 py-2.5 rounded-xl text-xs font-bold transition-all',
                tab === t.key ? 'bg-primary-600 text-white shadow-green' : 'text-dark-600')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* SEARCH & BATCH ACTIONS */}
        <div className="bg-white rounded-3xl p-4 shadow-card space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Rechercher par produit, boutique, client..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-2xl pl-9 pr-8 py-2.5 text-xs font-bold outline-none focus:border-primary-500"
              />
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400">
                  <X size={12} />
                </button>
              )}
            </div>

            {tab === 'seller' && ['pending', 'paid'].includes(filterStatus) && (
              <button
                onClick={() => {
                  setSelectionMode(!selectionMode)
                  setSelectedOrderIds([])
                }}
                className={clsx(
                  "px-3 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center",
                  selectionMode ? "bg-red-500 text-white shadow-md" : "bg-primary-50 text-primary-700 border border-primary-100"
                )}
              >
                {selectionMode ? "Annuler" : "Sélectionner"}
              </button>
            )}
          </div>

          {selectionMode && selectedOrderIds.length > 0 && (
            <div className="flex gap-2 animate-scale-in pt-1">
              {filterStatus === 'pending' && (
                <>
                  <button
                    onClick={handleBatchRefuse}
                    disabled={processing}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md"
                  >
                    Refuser ({selectedOrderIds.length})
                  </button>
                  <button
                    onClick={handleBatchAccept}
                    disabled={processing}
                    className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-green shadow-md"
                  >
                    Accepter ({selectedOrderIds.length})
                  </button>
                </>
              )}
              {filterStatus === 'paid' && (
                <button
                  onClick={handleBatchShip}
                  disabled={processing}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-md"
                >
                  🚚 Expédier le lot ({selectedOrderIds.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* FILTRE STATUT */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['all','pending','accepted','refused','paid'].map(s => {
            const cfg = STATUS[s]
            return (
              <button key={s} onClick={() => {
                setFilter(s)
                setSelectionMode(false)
                setSelectedOrderIds([])
              }}
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
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-card p-3.5 flex gap-3">
                <div className="w-16 h-16 rounded-xl skeleton flex-shrink-0"/>
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded-lg w-1/3"/>
                  <div className="h-3 skeleton rounded-lg w-2/3"/>
                  <div className="h-3 skeleton rounded-lg w-1/2"/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-card">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-display text-lg font-bold text-dark-800">Aucune commande</p>
            <p className="text-dark-600/50 text-sm mt-1">Vos commandes apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <div key={order.id + order.role} className="flex items-center gap-2">
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.includes(order.id)}
                    onChange={() => {
                      setSelectedOrderIds(prev =>
                        prev.includes(order.id)
                          ? prev.filter(id => id !== order.id)
                          : [...prev, order.id]
                      )
                    }}
                    className="w-4 h-4 rounded accent-primary-600 cursor-pointer flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <OrderCard key={order.id + order.role} order={order}
                    isBuyer={order.role === 'buyer'}
                    onOpen={() => {
                      if (selectionMode) {
                        setSelectedOrderIds(prev =>
                          prev.includes(order.id)
                            ? prev.filter(id => id !== order.id)
                            : [...prev, order.id]
                        )
                      } else {
                        setSelected(order)
                      }
                    }}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <button
            onClick={() => loadOrders(true)}
            disabled={moreLoading}
            className="w-full py-3.5 bg-white border border-surface-200 text-dark-700 font-bold rounded-2xl text-xs active:scale-98 transition-all flex items-center justify-center gap-2 shadow-card"
          >
            {moreLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-primary-600" />
                Chargement...
              </>
            ) : (
              'Voir plus de commandes'
            )}
          </button>
        )}
      </div>

      {/* DETAIL COMMANDE */}
      <OrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelected(null)}
        isBuyer={selectedOrder?.role === 'buyer'}
        onAccept={() => handleAccept(selectedOrder?.id)}
        onRefuse={() => handleRefuse(selectedOrder?.id)}
        onPay={() => { setPinModal({ orderId: selectedOrder?.id }); setPin('') }}
        onDeliveryStatus={(status) => handleDeliveryStatus(selectedOrder?.id, status)}
        processing={processing}
        onOpenReview={setReviewOrder}
        onOpenDispute={setDisputeOrder}
        onContact={handleContact}
        downloadOrderPDF={downloadOrderPDF}
      />

      <ReviewSheet
        open={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        order={reviewOrder}
        user={user}
        onSubmitted={() => loadOrders(false)}
      />

      <DisputeSheet
        open={!!disputeOrder}
        onClose={() => setDisputeOrder(null)}
        order={disputeOrder}
        user={user}
        onSubmitted={() => loadOrders(false)}
      />

      {/* MODAL PIN */}
      {pinModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"/>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-modal w-full max-w-sm animate-scale-in">
              <div className="flex items-center justify-between p-5 border-b border-surface-100">
                <h3 className="font-display text-lg font-bold text-dark-800">🔐 Code PIN Wallet</h3>
                <button onClick={() => { setPinModal(null); setPin(''); setPinError(false) }}
                  className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center">
                  <X size={16}/>
                </button>
              </div>
              <div className="p-5 space-y-5">
                <p className="text-sm text-dark-600 text-center">
                  Entrez votre PIN à 4 chiffres pour confirmer le paiement
                </p>
                <div className="text-center bg-surface-50 rounded-2xl p-4">
                  <p className="font-display text-3xl font-bold text-dark-800">
                    {selectedOrder ? formatFCFA(selectedOrder.total_amount) : '0 FCFA'}
                  </p>
                  <p className="text-dark-600/50 text-xs mt-1">Montant à payer</p>
                </div>
                <PinInput value={pin} onChange={v => { setPin(v); setPinError(false) }} error={pinError}/>
                {pinError && <p className="text-center text-red-500 text-xs font-semibold">❌ PIN incorrect</p>}
                <button onClick={handlePayWithPin} disabled={processing || pin.length !== 4}
                  className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-green">
                  {processing ? <Loader2 size={18} className="animate-spin"/> : '💳 Confirmer le paiement'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── ORDER CARD ───────────────────────────────────────────────
function OrderCard({ order, isBuyer, onOpen }) {
  const cfg = STATUS[order.status] || STATUS.pending
  const other = isBuyer ? order.seller : order.buyer

  return (
    <div onClick={onOpen}
      className="bg-white rounded-2xl shadow-card overflow-hidden active:scale-[0.98] transition-transform cursor-pointer">
      <div className="flex gap-3 p-3.5">
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-100">
          {order.product?.image_url
            ? <img src={order.product.image_url} className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🌿</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold', cfg.color)}>
              <div className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)}/>{cfg.label}
            </span>
            <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-lg',
              isBuyer ? 'bg-blue-50 text-blue-600' : 'bg-primary-50 text-primary-600')}>
              {isBuyer ? '🛒 Achat' : '🏪 Vente'}
            </span>
          </div>
          <p className="font-bold text-dark-800 text-sm truncate">{order.product?.name || 'Produit'}</p>
          <p className="text-dark-600/50 text-xs">
            {isBuyer ? 'Vendeur' : 'Acheteur'} : @{other?.username}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="font-display font-bold text-primary-700 text-sm">
              {formatFCFA(order.total_amount)}
            </span>
            <span className="text-dark-600/40 text-[10px]">
              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-dark-600/30 self-center flex-shrink-0"/>
      </div>

      {/* Actions rapides */}
      {order.status === 'pending' && !isBuyer && (
        <div className="border-t border-surface-100 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600 text-center">
          ⚠️ En attente de votre réponse → Voir & Répondre
        </div>
      )}
      {order.status === 'accepted' && isBuyer && (
        <div className="border-t border-surface-100 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600 text-center">
          ✅ Acceptée — Cliquez pour payer
        </div>
      )}
    </div>
  )
}

// ── ORDER DETAIL SHEET ───────────────────────────────────────
function OrderDetailSheet({
  open, onClose, order, isBuyer, onAccept, onRefuse, onPay,
  onDeliveryStatus, processing, onOpenReview, onOpenDispute,
  onContact, downloadOrderPDF
}) {
  if (!order) return null
  const cfg = STATUS[order.status] || STATUS.pending
  const other = isBuyer ? order.seller : order.buyer
  const delivCfg = DELIVERY_STATUS[order.delivery_status] || DELIVERY_STATUS.pending

  return (
    <BottomSheet open={open} onClose={onClose} title="📦 Détails de la commande">
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Produit */}
        <div className="flex gap-3 items-center p-3 bg-surface-50 rounded-2xl">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-surface-100">
            {order.product?.image_url
              ? <img src={order.product.image_url} className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🌿</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-dark-800 text-sm">{order.product?.name}</p>
            <p className="text-dark-600/50 text-xs">Qté : {order.quantity}</p>
          </div>
          <span className={clsx('px-2.5 py-1 rounded-xl text-xs font-bold flex-shrink-0', cfg.color)}>
            {cfg.label}
          </span>
        </div>

        {/* Montants */}
        <div className="bg-dark-800 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-sm">Total</span>
            <span className="font-display font-bold text-white text-xl">{formatFCFA(order.total_amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/40 text-xs">Commission MANG (5%)</span>
            <span className="text-red-400 text-xs">-{formatFCFA(order.commission)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-white/10 pt-2">
            <span className="text-emerald-400 text-sm font-semibold">Net vendeur</span>
            <span className="font-bold text-emerald-400">{formatFCFA(order.net_amount)}</span>
          </div>
          {order.escrow_amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gold-400 text-xs">🔒 Escrow</span>
              <span className="text-gold-400 text-xs font-semibold">
                {formatFCFA(order.escrow_amount)}
              </span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-surface-100">
          {[
            { icon: Hash,   label: 'ID',         value: `#${order.id.slice(0,8).toUpperCase()}` },
            { icon: Package,label: 'Boutique',    value: order.shop?.name || '—' },
            { icon: User,   label: isBuyer ? 'Vendeur' : 'Acheteur', value: `@${other?.username || '—'}` },
            { icon: MapPin, label: 'Livraison',   value: order.delivery_address || 'Non renseigné' },
            { icon: Phone,  label: 'Téléphone',   value: order.delivery_phone || 'Non renseigné' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon size={13} className="text-primary-600"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-dark-600/50 font-medium">{item.label}</p>
                <p className={`text-sm text-dark-800 font-semibold ${item.label === 'Livraison' ? 'break-words whitespace-normal' : 'truncate'}`}>{item.value}</p>
              </div>
            </div>
          ))}
          {order.note && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-dark-600/50 mb-0.5">Note</p>
              <p className="text-sm text-dark-700 italic">"{order.note}"</p>
            </div>
          )}
        </div>

        {/* Pro features CTA */}
        <div className="grid grid-cols-2 gap-3.5">
          <button
            onClick={() => downloadOrderPDF(order)}
            className="py-3 bg-white border border-surface-200 text-dark-700 hover:bg-surface-50 font-bold rounded-2xl text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            📄 Reçu PDF
          </button>
          <button
            onClick={() => onContact(order.buyer_id, order.seller_id, order.shop_id)}
            className="py-3 bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold rounded-2xl text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            💬 Discuter
          </button>
        </div>

        {/* Suivi livraison si payé */}
        {order.status === 'paid' && (
          <div className="space-y-2 pt-2 border-t border-surface-150">
            <div className={clsx('flex items-center gap-2 p-3 rounded-2xl text-sm font-bold', delivCfg.color)}>
              <span className="text-lg">{delivCfg.icon}</span>
              {delivCfg.label}
            </div>

            {/* Barre progression */}
            <div className="flex items-center gap-1">
              {['pending','preparing','shipped','delivered'].map((s, i) => (
                <div key={s} className="flex-1 flex items-center">
                  <div className={clsx('w-full h-1.5 rounded-full transition-all',
                    ['pending','preparing','shipped','delivered'].indexOf(order.delivery_status) >= i
                      ? 'bg-primary-500' : 'bg-surface-200')}/>
                </div>
              ))}
            </div>

            {/* Boutons vendeur */}
            {!isBuyer && order.delivery_status !== 'delivered' && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { s: 'preparing', label: '📦 Préparer',  disabled: order.delivery_status !== 'pending' },
                  { s: 'shipped',   label: '🚚 Expédier',  disabled: order.delivery_status !== 'preparing' },
                  { s: 'delivered', label: '✅ Livré',      disabled: order.delivery_status !== 'shipped' },
                ].map(btn => (
                  <button key={btn.s}
                    onClick={() => onDeliveryStatus(btn.s)}
                    disabled={btn.disabled || processing}
                    className={clsx('py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95',
                      btn.disabled ? 'bg-surface-100 text-dark-600/30 cursor-not-allowed' : 'bg-primary-600 text-white shadow-green')}>
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIONS */}
        <div className="space-y-2 pt-1">
          {/* VENDEUR — en attente */}
          {!isBuyer && order.status === 'pending' && (
            <>
              <p className="text-xs text-dark-600/50 text-center bg-orange-50 p-2.5 rounded-xl">
                ⚠️ Le montant est en escrow. Acceptez ou refusez.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={onRefuse} disabled={processing}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500 text-white font-bold active:scale-95 transition-transform disabled:opacity-60">
                  {processing ? <Loader2 size={15} className="animate-spin"/> : <><XCircle size={15}/> Refuser</>}
                </button>
                <button onClick={onAccept} disabled={processing}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary-600 text-white font-bold shadow-green active:scale-95 transition-transform disabled:opacity-60">
                  {processing ? <Loader2 size={15} className="animate-spin"/> : <><CheckCircle size={15}/> Accepter</>}
                </button>
              </div>
            </>
          )}

          {/* ACHETEUR — acceptée → payer */}
          {isBuyer && order.status === 'accepted' && (
            <>
              <p className="text-xs text-emerald-600 text-center font-semibold bg-emerald-50 p-2.5 rounded-xl">
                ✅ Le vendeur a accepté ! Payez maintenant.
              </p>
              <button onClick={onPay}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary-600 text-white font-bold text-base shadow-green active:scale-95 transition-transform">
                <CreditCard size={18}/> Payer {formatFCFA(order.total_amount)}
              </button>
            </>
          )}

          {order.status === 'paid' && (
            <div className="space-y-2">
              <div className="text-center py-3 bg-blue-50 rounded-2xl">
                <p className="text-blue-700 font-bold">🎉 Commande payée et finalisée !</p>
              </div>
              {isBuyer && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { onClose(); onOpenDispute(order) }}
                    className="py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs active:scale-95 transition-transform"
                  >
                    ⚖️ Ouvrir un litige
                  </button>
                  {order.delivery_status === 'delivered' ? (
                    <button
                      onClick={() => { onClose(); onOpenReview(order) }}
                      className="py-3 bg-gold-500 hover:bg-gold-400 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform shadow-gold"
                    >
                      ⭐ Écrire un avis
                    </button>
                  ) : (
                    <span className="py-3 bg-surface-100 text-dark-400/40 text-center font-bold rounded-2xl text-xs flex items-center justify-center">
                      Avis après livraison
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {order.status === 'refused' && (
            <div className="text-center py-3 bg-red-50 rounded-2xl">
              <p className="text-red-600 font-bold">❌ Refusée — remboursement effectué</p>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

// ── REVIEW SHEET (AVIS PRODUIT) ──────────────────────────────
function ReviewSheet({ open, onClose, order, user, onSubmitted }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  if (!order) return null

  const handleSubmit = async () => {
    if (!comment.trim()) return toast.error('Veuillez saisir un commentaire')
    setLoading(true)
    try {
      const { error } = await supabase.from('product_reviews').insert({
        product_id: order.product_id,
        user_id: user.id,
        rating: rating,
        comment: comment.trim()
      })
      if (error) {
        if (error.code === '23505') throw new Error('Vous avez déjà laissé un avis sur ce produit')
        throw error
      }
      toast.success('Avis publié avec succès ! ⭐')
      setComment('')
      setRating(5)
      if (onSubmitted) onSubmitted()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la publication')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="⭐ Laisser un avis">
      <div className="px-4 pt-2 pb-8 space-y-4">
        <p className="text-xs text-dark-600/50 leading-normal">
          Partagez votre avis sur le produit <strong>{order.product?.name}</strong> pour aider la communauté.
        </p>

        <div className="flex justify-center gap-2 text-3xl">
          {[1,2,3,4,5].map(val => (
            <button key={val} onClick={() => setRating(val)} className="transition-transform active:scale-75">
              <span className={val <= rating ? 'text-gold-500 text-3xl' : 'text-surface-300 text-3xl'}>★</span>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-dark-700">Votre commentaire</label>
          <textarea
            placeholder="Qualité du produit, fraîcheur..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-gold-500 resize-none font-medium"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 bg-gold-500 text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-gold disabled:opacity-40"
        >
          {loading ? 'Publication...' : 'Publier l\'avis'}
        </button>
      </div>
    </BottomSheet>
  )
}

// ── DISPUTE SHEET (LITIGES) ──────────────────────────────────
function DisputeSheet({ open, onClose, order, user, onSubmitted }) {
  const [reason, setReason] = useState('Produit gâté / abîmé')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  if (!order) return null

  const handleSubmit = async () => {
    if (!description.trim()) return toast.error('Veuillez décrire le problème')
    setLoading(true)
    try {
      const { error } = await supabase.from('disputes').insert({
        order_id: order.id,
        initiator_id: user.id,
        reason: reason,
        description: description.trim(),
        status: 'open'
      })
      if (error) throw error

      await supabase.rpc('create_notification', {
        p_user_id: order.seller_id,
        p_type: 'order_refused',
        p_title: '⚠️ Litige ouvert',
        p_body: `L'acheteur a ouvert un litige sur la commande #${order.id.slice(0, 8)}. Motif : ${reason}`,
        p_reference_id: order.id,
        p_reference_type: 'order'
      })

      toast.success('Litige ouvert. L\'administrateur va l\'étudier.')
      setDescription('')
      if (onSubmitted) onSubmitted()
      onClose()
    } catch {
      toast.error('Erreur lors de la création du litige')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="⚖️ Ouvrir un litige">
      <div className="px-4 pt-2 pb-8 space-y-4">
        <div className="p-3 bg-red-50 text-red-800 rounded-2xl text-xs leading-normal">
          Si le produit reçu n'est pas conforme, est gâté ou n'a pas été livré, signalez-le. L'argent restera bloqué en escrow le temps de la résolution.
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-dark-700">Motif du litige</label>
          <div className="flex flex-col gap-1.5">
            {['Produit gâté / abîmé', 'Commande non reçue', 'Qualité non conforme', 'Autre problème'].map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={clsx('p-3 rounded-xl border text-left text-xs font-semibold transition-all active:scale-[0.99]',
                  reason === r ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-surface-200 bg-white text-dark-700'
                )}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-dark-700">Détails explicatifs</label>
          <textarea
            placeholder="Expliquez précisément la situation..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-500 resize-none font-medium"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 bg-red-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40"
        >
          {loading ? 'Création...' : 'Ouvrir le dossier de litige'}
        </button>
      </div>
    </BottomSheet>
  )
}
