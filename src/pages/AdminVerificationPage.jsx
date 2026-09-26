import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, X, Shield, Users, Store, Package,
  TrendingUp, Scale, Trash2, Heart, Award, CheckCircle, AlertTriangle
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, BottomSheet, Button } from '@/components/ui'

const ADMIN_ID = 'd9f97369-ae78-4da2-844c-1c9c97b12445'

const REJECT_REASONS = {
  identite: [
    'Photo de pièce d\'identité illisible',
    'Pièce d\'identité expirée',
    'Nom ne correspond pas au compte',
    'Selfie manquant ou non conforme',
  ],
  activite: [
    'Activité déclarée ne correspond pas aux produits vendus',
    'Localisation non vérifiable',
    'Années d\'expérience insuffisantes',
  ],
  production: [
    'Capacité déclarée non réaliste',
    'Méthode de production non claire',
    'Zone de livraison trop large',
    'Certifications non vérifiables',
  ],
  general: [
    'Informations insuffisantes',
    'Boutique inactive (aucun produit)',
    'Comportement suspect sur la plateforme',
    'Doublon avec une boutique existante',
  ],
}

export default function AdminVerificationPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Tabs
  const [activeTab, setActiveTab] = useState('verifications') // 'verifications' | 'stats' | 'disputes' | 'catalog'

  // Verification Requests state
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState([])
  const [customNote, setCustomNote] = useState('')
  const [processing, setProcessing] = useState(false)

  // Admin Stats state
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Disputes state
  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [resolvingDispute, setResolvingDispute] = useState(null)
  const [resNote, setResNote] = useState('')
  const [resDecision, setResDecision] = useState('')

  // Catalog moderation state
  const [catalogShops, setCatalogShops] = useState([])
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)

  // Sécurité — seul l'admin peut accéder
  useEffect(() => {
    if (user && user.id !== ADMIN_ID) {
      navigate('/')
      toast.error('Accès refusé')
    }
  }, [user, navigate])

  // Chargement des vérifications
  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    const { data } = await supabase
      .from('verification_requests')
      .select('*, shop:shops(id, name, slug, cover_url, city, is_verified), user:profiles(id, username, avatar_url, email)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setRequestsLoading(false)
  }, [filter])

  useEffect(() => {
    if (activeTab === 'verifications') loadRequests()
  }, [activeTab, loadRequests])

  // Chargement des statistiques
  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const { count: shopCount } = await supabase.from('shops').select('*', { count: 'exact', head: true })
      const { count: verifiedShopsCount } = await supabase.from('shops').select('*', { count: 'exact', head: true }).eq('is_verified', true)
      const { data: orders } = await supabase.from('orders').select('*').eq('status', 'paid')
      const { count: disputesCount } = await supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open')

      const gmv = orders ? orders.reduce((sum, o) => sum + o.total_amount, 0) : 0
      const commissions = orders ? orders.reduce((sum, o) => sum + o.commission, 0) : 0

      setStats({
        userCount,
        shopCount,
        verifiedShopsCount,
        gmv,
        commissions,
        disputesCount
      })
    } catch {}
    setStatsLoading(false)
  }

  // Chargement des litiges
  const loadDisputes = async () => {
    setDisputesLoading(true)
    try {
      const { data } = await supabase
        .from('disputes')
        .select('*, initiator:profiles(username), order:orders(*, product:products(name), buyer:profiles(username), seller:profiles(username))')
        .order('created_at', { ascending: false })
      setDisputes(data || [])
    } catch {}
    setDisputesLoading(false)
  }

  // Chargement du catalogue (modération)
  const loadCatalog = async () => {
    setCatalogLoading(true)
    try {
      const { data: sh } = await supabase.from('shops').select('*, owner:profiles(username)').order('created_at', { ascending: false })
      const { data: pr } = await supabase.from('products').select('*, shop:shops(name)').order('created_at', { ascending: false })
      setCatalogShops(sh || [])
      setCatalogProducts(pr || [])
    } catch {}
    setCatalogLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'stats') loadStats()
    if (activeTab === 'disputes') loadDisputes()
    if (activeTab === 'catalog') loadCatalog()
  }, [activeTab])

  // APPROBATION DE BOUTIQUE
  const approve = async (req) => {
    if (!confirm(`Vérifier la boutique "${req.shop?.name}" ?`)) return
    setProcessing(true)
    try {
      await supabase.from('shops').update({ is_verified: true }).eq('id', req.shop_id)
      await supabase.from('verification_requests').update({ status: 'approved' }).eq('id', req.id)
      await supabase.rpc('create_notification', {
        p_user_id: req.user_id,
        p_type: 'shop_follow',
        p_title: '✅ Boutique vérifiée !',
        p_body: `Félicitations ! Votre boutique "${req.shop?.name}" a été vérifiée. Le badge ✅ est maintenant visible.`,
        p_reference_id: req.shop_id,
        p_reference_type: 'shop',
      })
      toast.success(`✅ "${req.shop?.name}" vérifiée !`)
      setSelectedRequest(null)
      loadRequests()
    } finally { setProcessing(false) }
  }

  // REJET DE DEMANDE DE BOUTIQUE
  const reject = async (req) => {
    if (selectedReasons.length === 0 && !customNote.trim()) {
      toast.error('Sélectionnez au moins une raison')
      return
    }
    setProcessing(true)
    try {
      const allReasons = [...selectedReasons, customNote.trim()].filter(Boolean)
      const adminNote = allReasons.join(' • ')

      await supabase.from('verification_requests')
        .update({ status: 'rejected', admin_note: adminNote }).eq('id', req.id)

      await supabase.rpc('create_notification', {
        p_user_id: req.user_id,
        p_type: 'shop_follow',
        p_title: '❌ Demande de vérification refusée',
        p_body: `Votre demande pour "${req.shop?.name}" a été refusée. Raisons : ${adminNote}`,
        p_reference_id: req.shop_id,
        p_reference_type: 'shop',
      })

      toast.success('Demande refusée — vendeur notifié')
      setRejectOpen(false)
      setSelectedRequest(null)
      setSelectedReasons([])
      setCustomNote('')
      loadRequests()
    } finally { setProcessing(false) }
  }

  // RESOLUTION DE LITIGE
  const handleResolveDispute = async () => {
    if (!resDecision) return toast.error('Veuillez prendre une décision')
    if (!resNote.trim()) return toast.error('Veuillez saisir une note de résolution')
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('resolve_dispute', {
        p_dispute_id: resolvingDispute.id,
        p_decision: resDecision,
        p_resolution_note: resNote.trim()
      })
      if (error) throw error
      if (data?.success) {
        toast.success('Litige résolu avec succès ! ⚖️')
        setResolvingDispute(null)
        setResNote('')
        setResDecision('')
        loadDisputes()
      } else {
        throw new Error(data?.error || 'Erreur')
      }
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      setProcessing(false)
    }
  }

  // MODERATION CATALOGUE (Suppression)
  const handleDeleteProduct = async (product) => {
    if (!confirm(`Supprimer définitivement le produit "${product.name}" ?`)) return
    try {
      await supabase.from('products').delete().eq('id', product.id)
      toast.success('Produit supprimé !')
      loadCatalog()
    } catch {
      toast.error('Erreur de suppression')
    }
  }

  const handleDeleteShop = async (shop) => {
    if (!confirm(`Supprimer définitivement la boutique "${shop.name}" ?`)) return
    try {
      await supabase.from('shops').delete().eq('id', shop.id)
      toast.success('Boutique supprimée !')
      loadCatalog()
    } catch {
      toast.error('Erreur de suppression')
    }
  }

  const STATUS_CONFIG = {
    pending:  { label: 'En attente', color: 'text-yellow-700 bg-yellow-100', dot: 'bg-yellow-400' },
    approved: { label: 'Approuvées', color: 'text-green-700 bg-green-100', dot: 'bg-green-400' },
    rejected: { label: 'Refusées',   color: 'text-red-700 bg-red-100',     dot: 'bg-red-400' },
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-600 pt-12 pb-6 px-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-90">
            <ArrowLeft size={18} className="text-white"/>
          </button>
          <div>
            <h1 className="font-black text-xl text-white">Panel Administrateur</h1>
            <p className="text-blue-200 text-xs">MANG E-Commerce Administration</p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex bg-white/10 rounded-2xl p-1 border border-white/10 mt-4 text-xs font-bold text-white">
          <button onClick={() => setActiveTab('verifications')}
            className={clsx('flex-1 py-2.5 rounded-xl transition-all', activeTab === 'verifications' ? 'bg-white text-blue-800 shadow-lg' : 'hover:bg-white/5')}>
            Vérifications
          </button>
          <button onClick={() => setActiveTab('stats')}
            className={clsx('flex-1 py-2.5 rounded-xl transition-all', activeTab === 'stats' ? 'bg-white text-blue-800 shadow-lg' : 'hover:bg-white/5')}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('disputes')}
            className={clsx('flex-1 py-2.5 rounded-xl transition-all', activeTab === 'disputes' ? 'bg-white text-blue-800 shadow-lg' : 'hover:bg-white/5')}>
            Litiges
          </button>
          <button onClick={() => setActiveTab('catalog')}
            className={clsx('flex-1 py-2.5 rounded-xl transition-all', activeTab === 'catalog' ? 'bg-white text-blue-800 shadow-lg' : 'hover:bg-white/5')}>
            Catalogue
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 max-w-[var(--content-max-width)] mx-auto space-y-4">
        
        {/* ONGLET 1 : VERIFICATIONS (BOUTIQUES) */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {Object.keys(STATUS_CONFIG).map(st => (
                <button key={st} onClick={() => setFilter(st)}
                  className={clsx('flex-1 py-2.5 rounded-2xl font-bold text-xs border-2 transition-all active:scale-95',
                    filter === st ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-surface-200 bg-white text-dark-600'
                  )}>
                  {STATUS_CONFIG[st].label}
                </button>
              ))}
            </div>

            {requestsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-32 skeleton rounded-3xl" />)}
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-card text-dark-500">
                <p className="text-4xl mb-2">📋</p>
                <p className="font-bold">Aucune demande</p>
                <p className="text-xs text-dark-600/40 mt-1">Aucune demande trouvée avec ce statut.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} onClick={() => setSelectedRequest(req)}
                    className="bg-white rounded-3xl p-4 shadow-card hover:border-blue-300 border-2 border-transparent transition-all cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={null} name={req.shop_name || req.shop?.name} size="md" />
                      <div>
                        <p className="font-bold text-dark-800 text-sm">{req.shop_name || req.shop?.name}</p>
                        <p className="text-dark-600/40 text-xs">Par @{req.user?.username || 'Vendeur'}</p>
                      </div>
                    </div>
                    <span className={clsx('text-[10px] font-bold px-2 py-1 rounded-lg', STATUS_CONFIG[req.status].color)}>
                      {STATUS_CONFIG[req.status].label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 2 : DASHBOARD STATS */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {statsLoading ? (
              <div className="h-40 skeleton rounded-3xl"/>
            ) : stats ? (
              <div className="space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-3xl p-4 shadow-card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={20}/></div>
                    <div>
                      <p className="text-dark-600/40 text-[10px] font-bold uppercase tracking-wider">Utilisateurs</p>
                      <p className="font-display font-black text-dark-800 text-lg leading-tight">{stats.userCount}</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-4 shadow-card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center"><Store size={20}/></div>
                    <div>
                      <p className="text-dark-600/40 text-[10px] font-bold uppercase tracking-wider">Boutiques</p>
                      <p className="font-display font-black text-dark-800 text-lg leading-tight">{stats.verifiedShopsCount} / {stats.shopCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-3xl p-5 shadow-card text-white space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-blue-300" size={18}/>
                    <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Volume & Revenus Plateforme</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Volume GMV (Payé)</p>
                      <p className="font-display font-black text-white text-2xl mt-1">{(stats.gmv/1).toLocaleString('fr-FR')} F</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Commissions Net (5%)</p>
                      <p className="font-display font-black text-gold-300 text-2xl mt-1">{(stats.commissions/1).toLocaleString('fr-FR')} F</p>
                    </div>
                  </div>
                </div>

                {stats.disputesCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-center justify-between text-red-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-red-600" size={18}/>
                      <span className="font-bold text-xs">{stats.disputesCount} litige(s) en attente de résolution</span>
                    </div>
                    <button onClick={() => setActiveTab('disputes')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold">
                      Arbitrer
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ONGLET 3 : LITIGES */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            {disputesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-28 skeleton rounded-3xl" />)}
              </div>
            ) : disputes.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-card text-dark-500">
                <p className="text-4xl mb-2">⚖️</p>
                <p className="font-bold">Aucun litige</p>
                <p className="text-xs text-dark-600/40 mt-1">Aucune réclamation ouverte sur la plateforme.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map(dispute => (
                  <div key={dispute.id} className="bg-white rounded-3xl p-4 shadow-card space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-surface-50 text-xs">
                      <span className="font-mono text-dark-400">Litige #{dispute.id.slice(0, 8)}</span>
                      <span className={clsx('font-black px-2 py-0.5 rounded-lg uppercase text-[9px]',
                        dispute.status === 'open' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-surface-100 text-dark-500'
                      )}>
                        {dispute.status === 'open' ? 'À arbitrer' : 'Résolu'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p>📦 <strong>Produit :</strong> {dispute.order?.product?.name}</p>
                      <p>👤 <strong>Acheteur :</strong> @{dispute.order?.buyer?.username}</p>
                      <p>🏪 <strong>Vendeur :</strong> @{dispute.order?.seller?.username}</p>
                      <p className="text-red-700 bg-red-50 p-2.5 rounded-xl font-medium mt-1">
                        ⚠️ <strong>Raison :</strong> {dispute.reason} — {dispute.description}
                      </p>
                    </div>

                    {dispute.status === 'open' && (
                      <button onClick={() => setResolvingDispute(dispute)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl active:scale-95 shadow-md transition-all flex items-center justify-center gap-1.5">
                        <Scale size={14}/> Ouvrir l'arbitrage admin
                      </button>
                    )}

                    {dispute.status === 'resolved' && (
                      <p className="text-xs text-dark-500 font-semibold bg-surface-50 p-2 rounded-xl text-center">
                        ⚖️ Résolution : {dispute.resolution_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 4 : MODERATION CATALOGUE */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {catalogLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-28 skeleton rounded-3xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Moderation Boutiques */}
                <div className="bg-white rounded-3xl p-4 shadow-card space-y-3">
                  <p className="text-xs font-black text-dark-600/50 uppercase tracking-wider pl-0.5">Boutiques ({catalogShops.length})</p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {catalogShops.map(sh => (
                      <div key={sh.id} className="flex justify-between items-center py-2 border-b border-surface-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{sh.is_verified ? '✅' : '🏪'}</span>
                          <div>
                            <p className="font-bold text-xs text-dark-800">{sh.name}</p>
                            <p className="text-dark-600/35 text-[9px]">Par @{sh.owner?.username}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteShop(sh)} className="text-red-500 p-1 active:scale-75 transition-transform">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Moderation Produits */}
                <div className="bg-white rounded-3xl p-4 shadow-card space-y-3">
                  <p className="text-xs font-black text-dark-600/50 uppercase tracking-wider pl-0.5">Produits ({catalogProducts.length})</p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {catalogProducts.map(prod => (
                      <div key={prod.id} className="flex justify-between items-center py-2 border-b border-surface-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-surface-100 overflow-hidden flex-shrink-0">
                            {prod.image_url ? <img src={prod.image_url} className="w-full h-full object-cover"/> : '🌾'}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-dark-800 truncate max-w-[120px]">{prod.name}</p>
                            <p className="text-dark-600/35 text-[9px]">Boutique: {prod.shop?.name}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteProduct(prod)} className="text-red-500 p-1 active:scale-75 transition-transform">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAIL DEMANDE DE VERIFICATION SHEET */}
      {selectedRequest && (
        <BottomSheet open={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="📋 Détail de la demande">
          <div className="px-4 pt-2 pb-8 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="p-4 bg-surface-50 rounded-2xl space-y-3 text-xs">
              <p>👤 <strong>Nom complet :</strong> {selectedRequest.full_name}</p>
              <p>📞 <strong>Téléphone :</strong> {selectedRequest.phone}</p>
              <p>📍 <strong>Localisation :</strong> {selectedRequest.location}</p>
              <p>🌾 <strong>Type de profil :</strong> {selectedRequest.profile_type} ({selectedRequest.activity_type})</p>
              <p>💼 <strong>Expérience :</strong> {selectedRequest.years_experience} ans</p>
              <p>🚚 <strong>Portée livraison :</strong> {selectedRequest.delivery_scope}</p>
              {selectedRequest.production_method && <p>🚜 <strong>Méthode prod. :</strong> {selectedRequest.production_method}</p>}
              {selectedRequest.additional_info && <p>💬 <strong>Exigences/Notes :</strong> {selectedRequest.additional_info}</p>}
            </div>

            {/* Photos ID */}
            <div className="grid grid-cols-2 gap-2">
              {selectedRequest.id_photo_url && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-dark-600 pl-0.5">Pièce d'identité</p>
                  <a href={selectedRequest.id_photo_url} target="_blank" rel="noreferrer" className="block h-28 rounded-xl bg-surface-100 overflow-hidden border border-surface-200">
                    <img src={selectedRequest.id_photo_url} className="w-full h-full object-cover" alt="ID"/>
                  </a>
                </div>
              )}
              {selectedRequest.selfie_url && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-dark-600 pl-0.5">Selfie de vérification</p>
                  <a href={selectedRequest.selfie_url} target="_blank" rel="noreferrer" className="block h-28 rounded-xl bg-surface-100 overflow-hidden border border-surface-200">
                    <img src={selectedRequest.selfie_url} className="w-full h-full object-cover" alt="Selfie"/>
                  </a>
                </div>
              )}
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <button onClick={() => setRejectOpen(true)}
                  className="flex-1 py-3 bg-red-50 text-red-500 font-bold rounded-2xl text-sm active:scale-95 transition-transform">
                  Rejeter
                </button>
                <button onClick={() => approve(selectedRequest)} disabled={processing}
                  className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform shadow-md flex items-center justify-center gap-1.5">
                  {processing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check size={16}/> Valider la boutique</>}
                </button>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* REJECT SHEET */}
      {selectedRequest && rejectOpen && (
        <BottomSheet open={rejectOpen} onClose={() => setRejectOpen(false)} title="❌ Motif du rejet">
          <div className="px-4 pt-2 pb-8 space-y-4 max-h-[85vh] overflow-y-auto">
            {Object.entries(REJECT_REASONS).map(([category, reasons]) => (
              <div key={category} className="space-y-2">
                <p className="text-[10px] font-bold text-dark-600/50 uppercase tracking-wider pl-0.5">
                  {category === 'identite' && 'Pièce & Selfie'}
                  {category === 'activite' && 'Localisation & Expérience'}
                  {category === 'production' && 'Capacité & Livraison'}
                  {category === 'general' && 'Autres raisons'}
                </p>
                <div className="flex flex-col gap-1.5">
                  {reasons.map(r => (
                    <button key={r} onClick={() => toggleReason(r)}
                      className={clsx('p-3 rounded-xl border text-left text-xs font-semibold transition-all active:scale-[0.99]',
                        selectedReasons.includes(r) ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-surface-200 bg-white text-dark-700 hover:border-surface-300'
                      )}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Note additionnelle (optionnel)</label>
              <textarea placeholder="Compléments ou explications..." value={customNote} onChange={e => setCustomNote(e.target.value)}
                rows={2} className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-500 resize-none"/>
            </div>

            <Button onClick={() => reject(selectedRequest)} disabled={processing} variant="danger" className="w-full py-3.5 text-sm font-bold shadow-md">
              {processing ? 'Traitement...' : '❌ Confirmer le rejet'}
            </Button>
          </div>
        </BottomSheet>
      )}

      {/* ARBITRAGE LITIGE SHEET */}
      {resolvingDispute && (
        <BottomSheet open={!!resolvingDispute} onClose={() => setResolvingDispute(null)} title="⚖️ Arbitrage de litige">
          <div className="px-4 pt-2 pb-8 space-y-4">
            <div className="p-3.5 bg-red-500/10 border border-red-300/30 rounded-2xl text-red-800 text-xs leading-normal">
              ⚠️ <strong>Action d'arbitrage.</strong> Vous devez décider si vous remboursez l'acheteur ou si vous libérez les fonds au vendeur. Cette action est irréversible.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Décision arbitrale *</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setResDecision('refund_buyer')}
                  className={clsx('p-3 rounded-xl border-2 text-center text-xs font-bold transition-all active:scale-95',
                    resDecision === 'refund_buyer' ? 'border-red-500 bg-red-50 text-red-700' : 'border-surface-200 text-dark-600 bg-white hover:border-surface-300'
                  )}>
                  Rembourser Acheteur
                </button>
                <button onClick={() => setResDecision('pay_seller')}
                  className={clsx('p-3 rounded-xl border-2 text-center text-xs font-bold transition-all active:scale-95',
                    resDecision === 'pay_seller' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-surface-200 text-dark-600 bg-white hover:border-surface-300'
                  )}>
                  Payer le Vendeur
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Note de résolution (Justification) *</label>
              <textarea
                placeholder="Indiquez la raison de votre décision..."
                value={resNote}
                onChange={e => setResNote(e.target.value)}
                rows={3}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-500 resize-none font-medium"
              />
            </div>

            <Button onClick={handleResolveDispute} disabled={processing} className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-md">
              {processing ? 'Application...' : <><CheckCircle size={15}/> Appliquer la décision</>}
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
