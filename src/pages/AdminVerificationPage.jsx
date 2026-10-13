import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, X, Shield, Users, Store, Package,
  TrendingUp, Scale, Trash2, Heart, Award, CheckCircle, AlertTriangle, FileText,
  CreditCard, Clock, CheckCircle2, Phone, AlertCircle, Copy, ExternalLink,
  MessageCircle, Ban, UserX, UserCheck, Search, Filter, RefreshCw, Eye,
  Calendar, DollarSign, Flag, MoreVertical
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

const cleanPhoneForWhatsApp = (phone) => {
  if (!phone) return ''
  let cleaned = phone.replace(/[^\d]/g, '')
  if (cleaned.length === 8 || cleaned.length === 10) {
    cleaned = '229' + cleaned
  }
  return cleaned
}

export default function AdminVerificationPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Active Tab
  const [activeTab, setActiveTab] = useState('withdrawals') 
  // 'withdrawals' | 'verifications' | 'stats' | 'users' | 'posts' | 'disputes' | 'catalog'

  // Live badge counts
  const [badgeCounts, setBadgeCounts] = useState({
    withdrawals: 0,
    verifications: 0,
    disputes: 0,
    posts: 0,
    users: 0,
  })

  // General processing flag
  const [processing, setProcessing] = useState(false)

  // 1. Withdrawals state
  const [withdrawals, setWithdrawals] = useState([])
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false)
  const [withdrawalFilter, setWithdrawalFilter] = useState('pending')
  const [withdrawalSearch, setWithdrawalSearch] = useState('')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null)
  const [rejectWithdrawalModal, setRejectWithdrawalModal] = useState(false)
  const [rejectWithdrawalReason, setRejectWithdrawalReason] = useState('')

  // 2. Verification Requests state (Boutiques)
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState([])
  const [customNote, setCustomNote] = useState('')

  // 3. Admin Financial Stats state
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('all') // 'all' | 'today' | '7d' | 'month'

  // 4. Users Management state
  const [usersList, setUsersList] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all') // 'all' | 'banned' | 'sellers'
  const [selectedUser, setSelectedUser] = useState(null)
  const [userWalletsMap, setUserWalletsMap] = useState({})

  // 5. Posts Moderation state
  const [postsList, setPostsList] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postFilter, setPostFilter] = useState('all') // 'all' | 'quarantined'
  const [postSearch, setPostSearch] = useState('')

  // 6. Disputes state
  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [resolvingDispute, setResolvingDispute] = useState(null)
  const [resNote, setResNote] = useState('')
  const [resDecision, setResDecision] = useState('')

  // 7. Catalog moderation state
  const [catalogShops, setCatalogShops] = useState([])
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  // Sécurité — seul le super-administrateur peut accéder
  useEffect(() => {
    if (user && user.id !== ADMIN_ID) {
      navigate('/')
      toast.error('Accès refusé : privilège administrateur requis')
    }
  }, [user, navigate])

  // Compteurs en temps réel pour les pastilles des onglets
  const loadBadgeCounts = useCallback(async () => {
    try {
      const [
        { count: pendingW },
        { count: pendingV },
        { count: openD },
        { count: quarantinedP },
        { count: totalU }
      ] = await Promise.all([
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'quarantined'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ])

      setBadgeCounts({
        withdrawals: pendingW || 0,
        verifications: pendingV || 0,
        disputes: openD || 0,
        posts: quarantinedP || 0,
        users: totalU || 0,
      })
    } catch (e) {
      console.warn('loadBadgeCounts error:', e)
    }
  }, [])

  useEffect(() => {
    loadBadgeCounts()
  }, [loadBadgeCounts, activeTab])

  // 1. RETRAITS
  const loadWithdrawals = useCallback(async () => {
    setWithdrawalsLoading(true)
    try {
      let query = supabase
        .from('withdrawal_requests')
        .select('*, user:profiles(id, username, full_name, avatar_url, phone)')
        .order('created_at', { ascending: false })
      if (withdrawalFilter !== 'all') {
        query = query.eq('status', withdrawalFilter)
      }
      const { data, error } = await query
      if (!error) setWithdrawals(data || [])
    } catch (e) {
      console.error('loadWithdrawals error:', e)
    } finally {
      setWithdrawalsLoading(false)
    }
  }, [withdrawalFilter])

  // 2. VERIFICATIONS BOUTIQUES
  const loadRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const { data } = await supabase
        .from('verification_requests')
        .select('*, shop:shops(id, name, slug, cover_url, city, is_verified), user:profiles(id, username, avatar_url, email)')
        .eq('status', filter)
        .order('created_at', { ascending: false })
      setRequests(data || [])
    } catch (e) {
      console.error('loadRequests error:', e)
    } finally {
      setRequestsLoading(false)
    }
  }, [filter])

  // 3. STATISTIQUES FINANCIÈRES & TRÉSORERIE
  const loadStats = useCallback(async (period = dateFilter) => {
    setStatsLoading(true)
    try {
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const { count: shopCount } = await supabase.from('shops').select('*', { count: 'exact', head: true })
      const { count: verifiedShopsCount } = await supabase.from('shops').select('*', { count: 'exact', head: true }).eq('is_verified', true)
      const { count: disputesCount } = await supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open')

      // Requête Commandes selon filtre temporel
      let ordersQuery = supabase.from('orders').select('id, total_amount, commission, created_at').eq('status', 'paid')
      if (period === 'today') {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        ordersQuery = ordersQuery.gte('created_at', todayStart.toISOString())
      } else if (period === '7d') {
        const d7 = new Date(Date.now() - 7 * 86400000)
        ordersQuery = ordersQuery.gte('created_at', d7.toISOString())
      } else if (period === 'month') {
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)
        ordersQuery = ordersQuery.gte('created_at', monthStart.toISOString())
      }
      const { data: orders } = await ordersQuery

      // Séquestre Global & Soldes Portefeuilles (wallets)
      const { data: walletsData } = await supabase.from('wallets').select('balance_reserved, balance_available, balance_total')
      const globalEscrow = walletsData ? walletsData.reduce((sum, w) => sum + (Number(w.balance_reserved) || 0), 0) : 0
      const totalAvailable = walletsData ? walletsData.reduce((sum, w) => sum + (Number(w.balance_available) || 0), 0) : 0

      // Total des retraits en attente
      const { data: pendingWData } = await supabase.from('withdrawal_requests').select('amount').eq('status', 'pending')
      const totalPendingWithdrawals = pendingWData ? pendingWData.reduce((sum, w) => sum + (Number(w.amount) || 0), 0) : 0

      const gmv = orders ? orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) : 0
      const commissions = orders ? orders.reduce((sum, o) => sum + (Number(o.commission) || 0), 0) : 0

      setStats({
        userCount: userCount || 0,
        shopCount: shopCount || 0,
        verifiedShopsCount: verifiedShopsCount || 0,
        gmv,
        commissions,
        globalEscrow,
        totalAvailable,
        totalPendingWithdrawals,
        disputesCount: disputesCount || 0,
      })
    } catch (e) {
      console.error('loadStats error:', e)
    } finally {
      setStatsLoading(false)
    }
  }, [dateFilter])

  // 4. UTILISATEURS (COMPTES)
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && profiles) {
        setUsersList(profiles)

        // Récupérer les portefeuilles pour les afficher
        const { data: wallets } = await supabase
          .from('wallets')
          .select('user_id, balance_available, balance_reserved, wallet_number')
        if (wallets) {
          const map = {}
          wallets.forEach(w => { map[w.user_id] = w })
          setUserWalletsMap(map)
        }
      }
    } catch (e) {
      console.error('loadUsers error:', e)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // 5. PUBLICATIONS COMMUNAUTAIRES
  const loadPosts = useCallback(async () => {
    setPostsLoading(true)
    try {
      let query = supabase
        .from('posts')
        .select('*, user:profiles(id, username, full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (postFilter === 'quarantined') {
        query = query.eq('status', 'quarantined')
      }

      const { data, error } = await query
      if (!error) setPostsList(data || [])
    } catch (e) {
      console.error('loadPosts error:', e)
    } finally {
      setPostsLoading(false)
    }
  }, [postFilter])

  // 6. LITIGES
  const loadDisputes = useCallback(async () => {
    setDisputesLoading(true)
    try {
      const { data } = await supabase
        .from('disputes')
        .select('*, initiator:profiles(username), order:orders(*, product:products(name), buyer:profiles(username), seller:profiles(username))')
        .order('created_at', { ascending: false })
      setDisputes(data || [])
    } catch (e) {
      console.error('loadDisputes error:', e)
    } finally {
      setDisputesLoading(false)
    }
  }, [])

  // 7. CATALOGUE
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      const { data: sh } = await supabase.from('shops').select('*, owner:profiles(username, phone)').order('created_at', { ascending: false })
      const { data: pr } = await supabase.from('products').select('*, shop:shops(name, slug)').order('created_at', { ascending: false })
      setCatalogShops(sh || [])
      setCatalogProducts(pr || [])
    } catch (e) {
      console.error('loadCatalog error:', e)
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  // Déclenchement automatique selon l'onglet actif
  useEffect(() => {
    if (activeTab === 'withdrawals') loadWithdrawals()
    else if (activeTab === 'verifications') loadRequests()
    else if (activeTab === 'stats') loadStats()
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'posts') loadPosts()
    else if (activeTab === 'disputes') loadDisputes()
    else if (activeTab === 'catalog') loadCatalog()
  }, [activeTab, loadWithdrawals, loadRequests, loadStats, loadUsers, loadPosts, loadDisputes, loadCatalog])

  // ==========================================
  // ACTIONS RETRAITS
  // ==========================================
  const handleApproveWithdrawal = async (w) => {
    if (!confirm(`Confirmer que le virement Mobile Money de ${Number(w.amount).toLocaleString('fr-FR')} FCFA a bien été envoyé au ${w.phone} (${w.operator}) ?`)) return
    setProcessing(true)
    try {
      await supabase.from('withdrawal_requests').update({
        status: 'approved',
        processed_at: new Date().toISOString(),
      }).eq('id', w.id)

      if (w.transaction_id) {
        await supabase.from('wallet_transactions').update({ status: 'completed' }).eq('id', w.transaction_id)
      } else if (w.receipt_number) {
        await supabase.from('wallet_transactions').update({ status: 'completed' }).eq('receipt_number', w.receipt_number)
      }

      await supabase.from('notifications').insert({
        user_id: w.user_id,
        type: 'wallet_debit',
        title: 'Retrait Mobile Money validé ! ✅',
        body: `Votre retrait de ${Number(w.amount).toLocaleString('fr-FR')} FCFA vers ${w.operator} (${w.phone}) a été transféré avec succès.`,
      })

      toast.success('Retrait validé avec succès !')
      setSelectedWithdrawal(null)
      loadWithdrawals()
      loadBadgeCounts()
    } catch {
      toast.error('Erreur lors de la validation')
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal) return
    const w = selectedWithdrawal
    const reason = rejectWithdrawalReason.trim() || 'Numéro incorrect ou contrôle de sécurité'
    setProcessing(true)
    try {
      await supabase.from('withdrawal_requests').update({
        status: 'rejected',
        admin_note: reason,
        processed_at: new Date().toISOString(),
      }).eq('id', w.id)

      const { data: userWallet } = await supabase.from('wallets').select('id, balance_available, balance_total').eq('user_id', w.user_id).single()
      if (userWallet) {
        const refundedBal = (userWallet.balance_available || 0) + Number(w.amount)
        await supabase.from('wallets').update({
          balance_available: refundedBal,
          balance_total: (userWallet.balance_total || userWallet.balance_available) + Number(w.amount),
        }).eq('id', userWallet.id)

        const year = new Date().getFullYear()
        const refundReceipt = `MANG-${year}-${Math.floor(Math.random() * 999999 + 1).toString().padStart(6, '0')}`
        await supabase.from('wallet_transactions').insert({
          wallet_id: userWallet.id,
          user_id: w.user_id,
          type: 'order_refund',
          amount: Number(w.amount),
          balance_after: refundedBal,
          description: `Remboursement retrait annulé (${reason})`,
          receipt_number: refundReceipt,
          status: 'completed',
        })
      }

      await supabase.from('notifications').insert({
        user_id: w.user_id,
        type: 'wallet_credit',
        title: 'Demande de retrait annulée & Remboursée ↩️',
        body: `Votre demande de retrait de ${Number(w.amount).toLocaleString('fr-FR')} FCFA a été annulée (${reason}). Le montant a été recrédité sur votre portefeuille MANG PAY.`,
      })

      toast.success('Retrait rejeté et solde remboursé !')
      setRejectWithdrawalModal(false)
      setSelectedWithdrawal(null)
      setRejectWithdrawalReason('')
      loadWithdrawals()
      loadBadgeCounts()
    } catch {
      toast.error('Erreur lors du rejet')
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // ACTIONS VERIFICATIONS BOUTIQUES
  // ==========================================
  const approve = async (req) => {
    if (!confirm(`Vérifier la boutique "${req.shop?.name}" ?`)) return
    setProcessing(true)
    try {
      await supabase.from('shops').update({ is_verified: true }).eq('id', req.shop_id)
      await supabase.from('verification_requests').update({ status: 'approved' }).eq('id', req.id)
      await supabase.rpc('create_notification', {
        p_user_id: req.user_id,
        p_type: 'shop_follow',
        p_title: 'Boutique vérifiée ! 🏪',
        p_body: `Félicitations ! Votre boutique "${req.shop?.name}" a été vérifiée par l'administration. Le badge vérifié est maintenant visible.`,
        p_reference_id: req.shop_id,
        p_reference_type: 'shop',
      })
      toast.success(`"${req.shop?.name}" vérifiée !`)
      setSelectedRequest(null)
      loadRequests()
      loadBadgeCounts()
    } finally {
      setProcessing(false)
    }
  }

  const toggleReason = (r) => {
    setSelectedReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

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
        p_title: 'Demande de vérification refusée',
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
      loadBadgeCounts()
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // ACTIONS UTILISATEURS (SUPABASE CONTROL)
  // ==========================================
  const handleDeleteUser = async (u) => {
    if (!confirm(`⚠️ ACTION CRITIQUE : Supprimer définitivement le compte de @${u.username} (${u.full_name || u.phone || u.id}) ?\n\nCette action supprimera également ses boutiques, ses annonces, son portefeuille et ses données comme dans le dashboard Supabase.`)) return
    setProcessing(true)
    try {
      // Tenter la fonction RPC dédiée si présente, sinon suppression directe de profil
      const { error: rpcErr } = await supabase.rpc('admin_delete_user', { p_target_user_id: u.id })
      if (rpcErr) {
        const { error: delErr } = await supabase.from('profiles').delete().eq('id', u.id)
        if (delErr) throw delErr
      }
      toast.success(`Compte @${u.username} supprimé avec succès !`)
      setSelectedUser(null)
      loadUsers()
      loadBadgeCounts()
    } catch (err) {
      console.error('Delete user error:', err)
      toast.error('Erreur lors de la suppression : ' + (err.message || 'Contrainte liée à la base'))
    } finally {
      setProcessing(false)
    }
  }

  const handleToggleBanUser = async (u) => {
    const willBan = !u.is_banned
    const actionLabel = willBan ? 'suspendre / bannir' : 'débannir et réactiver'
    if (!confirm(`Voulez-vous ${actionLabel} le compte @${u.username} ?`)) return
    setProcessing(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: willBan })
        .eq('id', u.id)
      if (error) throw error
      toast.success(`Compte @${u.username} ${willBan ? 'banni' : 'réactivé'} avec succès`)
      setUsersList(prev => prev.map(item => item.id === u.id ? { ...item, is_banned: willBan } : item))
      if (selectedUser?.id === u.id) {
        setSelectedUser(prev => ({ ...prev, is_banned: willBan }))
      }
    } catch (err) {
      toast.error('Erreur : ' + (err.message || 'Impossible de mettre à jour le statut'))
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // ACTIONS MODÉRATION PUBLICATIONS
  // ==========================================
  const handleDeletePost = async (post) => {
    if (!confirm(`Supprimer définitivement cette publication de @${post.user?.username || 'utilisateur'} ?`)) return
    setProcessing(true)
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) throw error
      toast.success('Publication supprimée !')
      loadPosts()
      loadBadgeCounts()
    } catch {
      toast.error('Erreur lors de la suppression de la publication')
    } finally {
      setProcessing(false)
    }
  }

  const handleToggleQuarantinePost = async (post) => {
    const nextStatus = post.status === 'quarantined' ? 'active' : 'quarantined'
    setProcessing(true)
    try {
      const { error } = await supabase.from('posts').update({ status: nextStatus }).eq('id', post.id)
      if (error) throw error
      toast.success(nextStatus === 'quarantined' ? 'Publication mise en quarantaine ⚠️' : 'Publication rétablie en ligne ✅')
      loadPosts()
      loadBadgeCounts()
    } catch {
      toast.error('Erreur lors du changement de statut')
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // ACTIONS LITIGES
  // ==========================================
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
        toast.success('Litige résolu avec succès !')
        setResolvingDispute(null)
        setResNote('')
        setResDecision('')
        loadDisputes()
        loadBadgeCounts()
      } else {
        throw new Error(data?.error || 'Erreur')
      }
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // ACTIONS CATALOGUE (Boutiques & Produits)
  // ==========================================
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

  // ==========================================
  // LISTES FILTRÉES EN MÉMOIRE
  // ==========================================
  const filteredWithdrawals = useMemo(() => {
    if (!withdrawalSearch.trim()) return withdrawals
    const q = withdrawalSearch.toLowerCase()
    return withdrawals.filter(w =>
      (w.phone && w.phone.toLowerCase().includes(q)) ||
      (w.operator && w.operator.toLowerCase().includes(q)) ||
      (w.receipt_number && w.receipt_number.toLowerCase().includes(q)) ||
      (w.user?.username && w.user.username.toLowerCase().includes(q)) ||
      (w.user?.full_name && w.user.full_name.toLowerCase().includes(q))
    )
  }, [withdrawals, withdrawalSearch])

  const pendingWithdrawalsSum = useMemo(() => {
    return filteredWithdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + Number(w.amount || 0), 0)
  }, [filteredWithdrawals])

  const filteredUsers = useMemo(() => {
    let list = usersList
    if (userRoleFilter === 'banned') list = list.filter(u => u.is_banned)
    if (!userSearch.trim()) return list
    const q = userSearch.toLowerCase()
    return list.filter(u =>
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.city && u.city.toLowerCase().includes(q))
    )
  }, [usersList, userRoleFilter, userSearch])

  const filteredPosts = useMemo(() => {
    if (!postSearch.trim()) return postsList
    const q = postSearch.toLowerCase()
    return postsList.filter(p =>
      (p.content && p.content.toLowerCase().includes(q)) ||
      (p.user?.username && p.user.username.toLowerCase().includes(q))
    )
  }, [postsList, postSearch])

  const filteredCatalogShops = useMemo(() => {
    if (!catalogSearch.trim()) return catalogShops
    const q = catalogSearch.toLowerCase()
    return catalogShops.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.owner?.username && s.owner.username.toLowerCase().includes(q))
    )
  }, [catalogShops, catalogSearch])

  const filteredCatalogProducts = useMemo(() => {
    if (!catalogSearch.trim()) return catalogProducts
    const q = catalogSearch.toLowerCase()
    return catalogProducts.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.shop?.name && p.shop.name.toLowerCase().includes(q))
    )
  }, [catalogProducts, catalogSearch])

  const STATUS_CONFIG = {
    pending:  { label: 'En attente', color: 'text-amber-700 bg-amber-100', dot: 'bg-amber-400' },
    approved: { label: 'Approuvées', color: 'text-emerald-700 bg-emerald-100', dot: 'bg-emerald-400' },
    rejected: { label: 'Refusées',   color: 'text-red-700 bg-red-100',     dot: 'bg-red-400' },
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      {/* HEADER COCKPIT SUPER-ADMIN */}
      <div className="bg-gradient-to-br from-dark-900 via-blue-900 to-indigo-900 pt-12 pb-6 px-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-95 transition-all text-white"
              title="Retour"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl text-white tracking-tight">Cockpit Super-Admin</h1>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  ROOT
                </span>
              </div>
              <p className="text-blue-200/80 text-xs mt-0.5">MANG E-Commerce — Command Center</p>
            </div>
          </div>

          <button
            onClick={() => {
              loadBadgeCounts()
              if (activeTab === 'withdrawals') loadWithdrawals()
              else if (activeTab === 'verifications') loadRequests()
              else if (activeTab === 'stats') loadStats()
              else if (activeTab === 'users') loadUsers()
              else if (activeTab === 'posts') loadPosts()
              else if (activeTab === 'disputes') loadDisputes()
              else if (activeTab === 'catalog') loadCatalog()
              toast.success('Données actualisées')
            }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90 transition-all"
            title="Actualiser"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* TABS SELECTOR SCROLLABLE HORIZONTALEMENT AVEC BADGES NOTIFICATIONS */}
        <div className="flex bg-black/25 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 mt-3 text-xs font-bold text-white overflow-x-auto no-scrollbar gap-1.5">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'withdrawals' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <span>Retraits 💵</span>
            {badgeCounts.withdrawals > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {badgeCounts.withdrawals}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('verifications')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'verifications' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <span>Boutiques 🏪</span>
            {badgeCounts.verifications > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {badgeCounts.verifications}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'stats' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <span>Trésorerie 📊</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'users' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <span>Utilisateurs 👥</span>
            <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 rounded-full">
              {badgeCounts.users}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'posts' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <span>Posts 📝</span>
            {badgeCounts.posts > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {badgeCounts.posts}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'disputes' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <span>Litiges ⚖️</span>
            {badgeCounts.disputes > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {badgeCounts.disputes}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'catalog' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <span>Catalogue 📦</span>
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 max-w-[var(--content-max-width)] mx-auto space-y-4">

        {/* ========================================================= */}
        {/* ONGLET 1 : RETRAITS MOBILE MONEY AVEC OUTILS 1-CLIC */}
        {/* ========================================================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            {/* Barre de recherche & Filtres */}
            <div className="bg-white rounded-2xl p-3 shadow-card space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="Rechercher par numéro, nom, opérateur ou reçu..."
                  value={withdrawalSearch}
                  onChange={e => setWithdrawalSearch(e.target.value)}
                  className="w-full bg-surface-50 border border-surface-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                />
                {withdrawalSearch && (
                  <button onClick={() => setWithdrawalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-xs">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex gap-1.5">
                {[
                  { id: 'pending',  label: 'En attente ⏳' },
                  { id: 'approved', label: 'Validés ✅' },
                  { id: 'rejected', label: 'Rejetés ❌' },
                  { id: 'all',      label: 'Tous' },
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setWithdrawalFilter(st.id)}
                    className={clsx(
                      'flex-1 py-2 rounded-xl font-bold text-xs border transition-all active:scale-95 whitespace-nowrap text-center',
                      withdrawalFilter === st.id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-surface-200 bg-white text-dark-600'
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bannière récapitulative des montants en attente */}
            {withdrawalFilter === 'pending' && filteredWithdrawals.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-3.5 text-white flex items-center justify-between shadow-card">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-wider text-amber-100">Total en attente d'envoi</p>
                  <p className="font-display font-black text-xl leading-tight">
                    {pendingWithdrawalsSum.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                    {filteredWithdrawals.filter(w => w.status === 'pending').length} demande(s)
                  </span>
                </div>
              </div>
            )}

            {withdrawalsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-28 skeleton rounded-3xl" />)}
              </div>
            ) : filteredWithdrawals.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-card text-dark-500">
                <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-2 text-dark-400">
                  <CreditCard size={28} />
                </div>
                <p className="font-bold">Aucune demande trouvée</p>
                <p className="text-xs text-dark-600/50 mt-1">Aucun retrait ne correspond aux critères.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWithdrawals.map(w => {
                  const isPending = w.status === 'pending'
                  const isApproved = w.status === 'approved'
                  const cleanPhone = cleanPhoneForWhatsApp(w.phone)
                  const whatsAppText = `Bonjour ${w.user?.full_name || w.user?.username || ''}, concernant votre demande de retrait MANG PAY de ${Number(w.amount).toLocaleString('fr-FR')} FCFA...`

                  return (
                    <div
                      key={w.id}
                      className="bg-white rounded-3xl p-4 shadow-card border-2 border-transparent hover:border-blue-200 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={w.user?.avatar_url} name={w.user?.full_name || w.user?.username || 'Vendeur'} size="md" />
                          <div>
                            <p className="font-bold text-dark-900 text-sm">
                              {w.user?.full_name || w.user?.username || 'Vendeur'}
                            </p>
                            <p className="text-dark-500 text-xs">@{w.user?.username || 'user'}</p>
                            <p className="text-[10px] text-dark-400 mt-0.5">
                              {new Date(w.created_at).toLocaleDateString('fr-FR')} à {new Date(w.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-dark-900 text-base text-red-600">
                            -{Number(w.amount).toLocaleString('fr-FR')} FCFA
                          </p>
                          <span className={clsx(
                            'inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg mt-1',
                            isPending ? 'bg-amber-100 text-amber-800' :
                            isApproved ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                          )}>
                            {isPending ? 'En attente ⏳' : isApproved ? 'Transféré ✅' : 'Rejeté ❌'}
                          </span>
                        </div>
                      </div>

                      {/* Coordonnées de paiement Mobile Money avec outils 1-clic */}
                      <div className="p-3 bg-surface-50 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-dark-700 bg-white px-2 py-1 rounded-lg border border-surface-200 uppercase text-[11px]">
                            {w.operator}
                          </span>
                          <span className="font-mono font-black text-dark-900 text-sm tracking-wide">{w.phone}</span>
                        </div>

                        {/* Outils rapides : Copie & WhatsApp */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(w.phone)
                              toast.success(`Numéro ${w.phone} copié !`)
                            }}
                            className="p-1.5 bg-white border border-surface-200 rounded-lg hover:bg-surface-100 active:scale-90 transition-all text-dark-600"
                            title="Copier le numéro"
                          >
                            <Copy size={13} />
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(w.amount.toString())
                              toast.success(`Montant ${w.amount} copié !`)
                            }}
                            className="px-2 py-1 bg-white border border-surface-200 rounded-lg hover:bg-surface-100 active:scale-90 transition-all font-bold text-[11px] text-dark-600"
                            title="Copier le montant brut"
                          >
                            Copier FCFA
                          </button>

                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsAppText)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 active:scale-90 transition-all flex items-center gap-1 text-[11px] font-bold"
                              title="Ouvrir WhatsApp"
                            >
                              <MessageCircle size={13} />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {w.receipt_number && (
                        <div className="flex items-center justify-between text-[11px] text-dark-500 px-1">
                          <span>Reçu transaction :</span>
                          <span className="font-mono font-bold text-dark-700">#{w.receipt_number}</span>
                        </div>
                      )}

                      {w.admin_note && (
                        <p className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                          <strong>Note admin :</strong> {w.admin_note}
                        </p>
                      )}

                      {/* Actions Administrateur */}
                      {isPending && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => {
                              setSelectedWithdrawal(w)
                              setRejectWithdrawalReason('')
                              setRejectWithdrawalModal(true)
                            }}
                            disabled={processing}
                            className="flex-1 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50"
                          >
                            Refuser & Rembourser
                          </button>
                          <button
                            onClick={() => handleApproveWithdrawal(w)}
                            disabled={processing}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 size={14} />
                            Valider le virement
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 2 : VERIFICATIONS DES BOUTIQUES */}
        {/* ========================================================= */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {Object.keys(STATUS_CONFIG).map(st => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  className={clsx(
                    'flex-1 py-2.5 rounded-2xl font-bold text-xs border-2 transition-all active:scale-95',
                    filter === st ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-surface-200 bg-white text-dark-600'
                  )}
                >
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
                <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-2 text-dark-400">
                  <FileText size={28} />
                </div>
                <p className="font-bold">Aucune demande</p>
                <p className="text-xs text-dark-600/40 mt-1">Aucune demande trouvée avec ce statut.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="bg-white rounded-3xl p-4 shadow-card hover:border-blue-300 border-2 border-transparent transition-all cursor-pointer flex items-center justify-between"
                  >
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

        {/* ========================================================= */}
        {/* ONGLET 3 : TABLEAU DE BORD TRÉSORERIE & FINANCIER */}
        {/* ========================================================= */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Filtres de période temporelle */}
            <div className="bg-white rounded-2xl p-1.5 shadow-card flex gap-1 text-xs font-bold">
              {[
                { id: 'today', label: "Aujourd'hui" },
                { id: '7d',    label: '7 jours' },
                { id: 'month', label: 'Ce mois' },
                { id: 'all',   label: 'Tout' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setDateFilter(p.id)
                    loadStats(p.id)
                  }}
                  className={clsx(
                    'flex-1 py-2 rounded-xl transition-all text-center',
                    dateFilter === p.id ? 'bg-blue-600 text-white shadow-sm' : 'text-dark-600 hover:bg-surface-100'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {statsLoading ? (
              <div className="h-48 skeleton rounded-3xl" />
            ) : stats ? (
              <div className="space-y-4">
                {/* Carte Trésorerie & Séquestre */}
                <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-dark-900 rounded-3xl p-5 shadow-card text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="text-emerald-400" size={20} />
                      <p className="text-xs font-black uppercase tracking-wider text-blue-200">
                        Sécurité Trésorerie & Séquestre
                      </p>
                    </div>
                    <span className="text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                      Escrow Live
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                    <div>
                      <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Séquestre en cours</p>
                      <p className="font-display font-black text-emerald-400 text-2xl mt-1 leading-none">
                        {(stats.globalEscrow || 0).toLocaleString('fr-FR')} F
                      </p>
                      <p className="text-[10px] text-blue-200/60 mt-1">Fonds retenus jusqu'à livraison</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Retraits en attente</p>
                      <p className="font-display font-black text-amber-400 text-2xl mt-1 leading-none">
                        {(stats.totalPendingWithdrawals || 0).toLocaleString('fr-FR')} F
                      </p>
                      <p className="text-[10px] text-blue-200/60 mt-1">À payer aux vendeurs</p>
                    </div>
                  </div>
                </div>

                {/* Revenus & Volume de vente */}
                <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-5 shadow-card text-white space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-emerald-300" size={18} />
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-200">
                      Volume GMV & Commissions MANG
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Volume GMV (Payé)</p>
                      <p className="font-display font-black text-white text-2xl mt-1 leading-none">
                        {(stats.gmv || 0).toLocaleString('fr-FR')} F
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Commissions Net (5%)</p>
                      <p className="font-display font-black text-yellow-300 text-2xl mt-1 leading-none">
                        {(stats.commissions || 0).toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compteurs Utilisateurs et Boutiques */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-3xl p-4 shadow-card flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users size={22} />
                    </div>
                    <div>
                      <p className="text-dark-400 text-[10px] font-bold uppercase tracking-wider">Utilisateurs</p>
                      <p className="font-display font-black text-dark-900 text-xl leading-tight">{stats.userCount}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-4 shadow-card flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Store size={22} />
                    </div>
                    <div>
                      <p className="text-dark-400 text-[10px] font-bold uppercase tracking-wider">Boutiques (Vérif)</p>
                      <p className="font-display font-black text-dark-900 text-xl leading-tight">
                        {stats.verifiedShopsCount} / {stats.shopCount}
                      </p>
                    </div>
                  </div>
                </div>

                {stats.disputesCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-center justify-between text-red-800 shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-red-600" size={18} />
                      <span className="font-bold text-xs">{stats.disputesCount} litige(s) ouvert(s) à arbitrer</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('disputes')}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                    >
                      Arbitrer
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 4 : GESTION COMPLÈTE DES UTILISATEURS (SUPABASE STYLE) */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Barre de recherche & Filtres */}
            <div className="bg-white rounded-2xl p-3 shadow-card space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="Rechercher par @pseudo, nom, email, téléphone ou ville..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full bg-surface-50 border border-surface-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                />
                {userSearch && (
                  <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-xs">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {[
                  { id: 'all',    label: `Tous (${usersList.length})` },
                  { id: 'banned', label: `Bannis / Suspendus (${usersList.filter(u => u.is_banned).length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setUserRoleFilter(f.id)}
                    className={clsx(
                      'flex-1 py-2 rounded-xl font-bold text-xs border transition-all text-center',
                      userRoleFilter === f.id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-surface-200 bg-white text-dark-600'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 skeleton rounded-3xl" />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-card text-dark-500">
                <Users size={28} className="mx-auto mb-2 text-dark-400" />
                <p className="font-bold">Aucun utilisateur trouvé</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredUsers.map(u => {
                  const wallet = userWalletsMap[u.id]
                  const isSuperAdmin = u.id === ADMIN_ID
                  return (
                    <div
                      key={u.id}
                      className="bg-white rounded-2xl p-3.5 shadow-card border-2 border-transparent hover:border-blue-200 transition-all flex items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => setSelectedUser(u)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <Avatar src={u.avatar_url} name={u.full_name || u.username} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-dark-900 text-sm truncate max-w-[150px]">
                              {u.full_name || u.username}
                            </p>
                            {isSuperAdmin && (
                              <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.2 rounded">
                                ADMIN
                              </span>
                            )}
                            {u.is_banned && (
                              <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.2 rounded">
                                BANNI
                              </span>
                            )}
                          </div>
                          <p className="text-dark-500 text-xs truncate">@{u.username} • {u.phone || u.email || 'Pas de contact'}</p>
                          {wallet && (
                            <p className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
                              Solde : {Number(wallet.balance_available || 0).toLocaleString('fr-FR')} FCFA
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions rapides utilisateur */}
                      {!isSuperAdmin && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleToggleBanUser(u)}
                            disabled={processing}
                            className={clsx(
                              'p-2 rounded-xl transition-all active:scale-90 border',
                              u.is_banned
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            )}
                            title={u.is_banned ? 'Débannir' : 'Suspendre / Bannir'}
                          >
                            {u.is_banned ? <UserCheck size={15} /> : <Ban size={15} />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={processing}
                            className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 active:scale-90 transition-all"
                            title="Supprimer définitivement le compte"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 5 : MODÉRATION DES POSTS COMMUNAUTAIRES */}
        {/* ========================================================= */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {/* Barre de recherche & Filtres */}
            <div className="bg-white rounded-2xl p-3 shadow-card space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="Rechercher dans le texte ou par auteur..."
                  value={postSearch}
                  onChange={e => setPostSearch(e.target.value)}
                  className="w-full bg-surface-50 border border-surface-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex gap-2">
                {[
                  { id: 'all',         label: 'Toutes les publications' },
                  { id: 'quarantined', label: 'En quarantaine / Signalées ⚠️' },
                ].map(pf => (
                  <button
                    key={pf.id}
                    onClick={() => setPostFilter(pf.id)}
                    className={clsx(
                      'flex-1 py-2 rounded-xl font-bold text-xs border transition-all text-center',
                      postFilter === pf.id ? 'border-red-600 bg-red-50 text-red-800' : 'border-surface-200 bg-white text-dark-600'
                    )}
                  >
                    {pf.label}
                  </button>
                ))}
              </div>
            </div>

            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-32 skeleton rounded-3xl" />)}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-card text-dark-500">
                <FileText size={28} className="mx-auto mb-2 text-dark-400" />
                <p className="font-bold">Aucune publication trouvée</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map(p => {
                  const isQuarantined = p.status === 'quarantined'
                  return (
                    <div
                      key={p.id}
                      className={clsx(
                        'bg-white rounded-3xl p-4 shadow-card border-2 transition-all space-y-3',
                        isQuarantined ? 'border-red-300 bg-red-50/20' : 'border-transparent'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={p.user?.avatar_url} name={p.user?.username || 'Membre'} size="sm" />
                          <div>
                            <p className="font-bold text-dark-900 text-xs">@{p.user?.username || 'Membre'}</p>
                            <p className="text-[10px] text-dark-400">
                              {new Date(p.created_at).toLocaleDateString('fr-FR')} à {new Date(p.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <span className={clsx(
                          'text-[10px] font-bold px-2 py-0.5 rounded-lg',
                          isQuarantined ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        )}>
                          {isQuarantined ? 'En Quarantaine ⚠️' : 'En ligne'}
                        </span>
                      </div>

                      {/* Contenu de la publication */}
                      <p className="text-xs text-dark-800 whitespace-pre-line leading-relaxed font-normal">
                        {p.content}
                      </p>

                      {p.image_url && (
                        <div className="h-44 rounded-2xl overflow-hidden bg-surface-100 border border-surface-200">
                          <img src={p.image_url} alt="Publication" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Statistiques & Actions de modération */}
                      <div className="flex items-center justify-between pt-2 border-t border-surface-100 text-xs">
                        <span className="text-dark-400 text-[11px]">
                          ❤️ {p.likes_count || 0} • 💬 {p.comments_count || 0}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleQuarantinePost(p)}
                            disabled={processing}
                            className={clsx(
                              'px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95',
                              isQuarantined
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            )}
                          >
                            {isQuarantined ? 'Rétablir en ligne' : 'Quarantaine'}
                          </button>

                          <button
                            onClick={() => handleDeletePost(p)}
                            disabled={processing}
                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1"
                          >
                            <Trash2 size={13} />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 6 : ARBITRAGE DES LITIGES */}
        {/* ========================================================= */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            {disputesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-28 skeleton rounded-3xl" />)}
              </div>
            ) : disputes.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-card text-dark-500">
                <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-2 text-dark-400">
                  <Scale size={28} />
                </div>
                <p className="font-bold">Aucun litige</p>
                <p className="text-xs text-dark-600/40 mt-1">Aucune réclamation ouverte sur la plateforme.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map(dispute => (
                  <div key={dispute.id} className="bg-white rounded-3xl p-4 shadow-card space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-surface-50 text-xs">
                      <span className="font-mono text-dark-400">Litige #{dispute.id.slice(0, 8)}</span>
                      <span className={clsx(
                        'font-black px-2 py-0.5 rounded-lg uppercase text-[9px]',
                        dispute.status === 'open' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-surface-100 text-dark-500'
                      )}>
                        {dispute.status === 'open' ? 'À arbitrer' : 'Résolu'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p><strong>Produit :</strong> {dispute.order?.product?.name}</p>
                      <p><strong>Acheteur :</strong> @{dispute.order?.buyer?.username}</p>
                      <p><strong>Vendeur :</strong> @{dispute.order?.seller?.username}</p>
                      <p className="text-red-700 bg-red-50 p-2.5 rounded-xl font-medium mt-1">
                        <strong>Raison :</strong> {dispute.reason} — {dispute.description}
                      </p>
                    </div>

                    {dispute.status === 'open' && (
                      <button
                        onClick={() => setResolvingDispute(dispute)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl active:scale-95 shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <Scale size={14} /> Ouvrir l'arbitrage admin
                      </button>
                    )}

                    {dispute.status === 'resolved' && (
                      <p className="text-xs text-dark-500 font-semibold bg-surface-50 p-2 rounded-xl text-center">
                        Résolution : {dispute.resolution_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 7 : MODÉRATION CATALOGUE (Boutiques & Produits) */}
        {/* ========================================================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                placeholder="Rechercher une boutique ou un produit..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full bg-white border border-surface-200 rounded-2xl pl-10 pr-4 py-3 text-xs outline-none focus:border-blue-500 shadow-card font-medium"
              />
            </div>

            {catalogLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-28 skeleton rounded-3xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Moderation Boutiques */}
                <div className="bg-white rounded-3xl p-4 shadow-card space-y-3">
                  <p className="text-xs font-black text-dark-600/50 uppercase tracking-wider pl-0.5">
                    Boutiques ({filteredCatalogShops.length})
                  </p>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {filteredCatalogShops.map(sh => (
                      <div key={sh.id} className="flex justify-between items-center py-2 border-b border-surface-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded',
                            sh.is_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-100 text-dark-500'
                          )}>
                            {sh.is_verified ? 'Vérifiée' : 'Standard'}
                          </span>
                          <div>
                            <p className="font-bold text-xs text-dark-800">{sh.name}</p>
                            <p className="text-dark-600/35 text-[9px]">Par @{sh.owner?.username || 'vendeur'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteShop(sh)}
                          className="text-red-500 p-2 hover:bg-red-50 rounded-xl active:scale-75 transition-all"
                          title="Supprimer la boutique"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Moderation Produits */}
                <div className="bg-white rounded-3xl p-4 shadow-card space-y-3">
                  <p className="text-xs font-black text-dark-600/50 uppercase tracking-wider pl-0.5">
                    Produits ({filteredCatalogProducts.length})
                  </p>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {filteredCatalogProducts.map(prod => (
                      <div key={prod.id} className="flex justify-between items-center py-2 border-b border-surface-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-surface-100 overflow-hidden flex-shrink-0">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt="" className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-dark-800 truncate max-w-[150px]">{prod.name}</p>
                            <p className="text-dark-600/35 text-[9px]">Boutique : {prod.shop?.name}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(prod)}
                          className="text-red-500 p-2 hover:bg-red-50 rounded-xl active:scale-75 transition-all"
                          title="Supprimer le produit"
                        >
                          <Trash2 size={14} />
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

      {/* ========================================================= */}
      {/* BOTTOM SHEET : INSPECTION & GESTION DÉTAILLÉE UTILISATEUR */}
      {/* ========================================================= */}
      {selectedUser && (
        <BottomSheet open={!!selectedUser} onClose={() => setSelectedUser(null)} title="Détail du compte utilisateur">
          <div className="px-4 pt-2 pb-8 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-2xl">
              <Avatar src={selectedUser.avatar_url} name={selectedUser.full_name || selectedUser.username} size="lg" />
              <div>
                <p className="font-black text-dark-900 text-base">{selectedUser.full_name || selectedUser.username}</p>
                <p className="text-dark-500 text-xs">@{selectedUser.username}</p>
                <p className="text-[11px] font-mono text-dark-400 mt-0.5">UUID : {selectedUser.id}</p>
              </div>
            </div>

            <div className="p-4 bg-white border border-surface-200 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-50">
                <span className="text-dark-400">Email :</span>
                <span className="font-semibold text-dark-800">{selectedUser.email || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-50">
                <span className="text-dark-400">Téléphone :</span>
                <span className="font-mono font-bold text-dark-900">{selectedUser.phone || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-50">
                <span className="text-dark-400">Ville / Localisation :</span>
                <span className="font-semibold text-dark-800">{selectedUser.city || 'Non renseignée'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-50">
                <span className="text-dark-400">Date d'inscription :</span>
                <span className="font-semibold text-dark-800">
                  {new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-dark-400">Statut du compte :</span>
                <span className={clsx('font-black uppercase text-[10px] px-2 py-0.5 rounded', selectedUser.is_banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
                  {selectedUser.is_banned ? 'Banni / Suspendu' : 'Actif'}
                </span>
              </div>
            </div>

            {/* Solde Portefeuille si disponible */}
            {userWalletsMap[selectedUser.id] && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
                <p className="font-black text-emerald-900 uppercase text-[10px]">Portefeuille MANG PAY associé</p>
                <div className="flex justify-between pt-1">
                  <span className="text-emerald-700">Solde disponible :</span>
                  <span className="font-mono font-black text-emerald-900">
                    {Number(userWalletsMap[selectedUser.id].balance_available || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">En séquestre (réservé) :</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {Number(userWalletsMap[selectedUser.id].balance_reserved || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            )}

            {/* Actions Super-Admin sur le compte */}
            {selectedUser.id !== ADMIN_ID && (
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleToggleBanUser(selectedUser)}
                  disabled={processing}
                  className={clsx(
                    'w-full py-3.5 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 border',
                    selectedUser.is_banned
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  )}
                >
                  {selectedUser.is_banned ? <UserCheck size={16} /> : <Ban size={16} />}
                  <span>{selectedUser.is_banned ? 'Débannir et réactiver le compte' : 'Suspendre / Bannir ce compte'}</span>
                </button>

                <button
                  onClick={() => handleDeleteUser(selectedUser)}
                  disabled={processing}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Trash2 size={16} />
                  <span>Supprimer définitivement ce compte (Action irréversible)</span>
                </button>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* DETAIL DEMANDE DE VERIFICATION SHEET */}
      {selectedRequest && (
        <BottomSheet open={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Détail de la demande">
          <div className="px-4 pt-2 pb-8 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="p-4 bg-surface-50 rounded-2xl space-y-3 text-xs">
              <p><strong>Nom complet :</strong> {selectedRequest.full_name}</p>
              <p><strong>Téléphone :</strong> {selectedRequest.phone}</p>
              <p><strong>Localisation :</strong> {selectedRequest.location}</p>
              <p><strong>Type de profil :</strong> {selectedRequest.profile_type} ({selectedRequest.activity_type})</p>
              <p><strong>Expérience :</strong> {selectedRequest.years_experience} ans</p>
              <p><strong>Portée livraison :</strong> {selectedRequest.delivery_scope}</p>
              {selectedRequest.production_method && <p><strong>Méthode prod. :</strong> {selectedRequest.production_method}</p>}
              {selectedRequest.additional_info && <p><strong>Exigences/Notes :</strong> {selectedRequest.additional_info}</p>}
            </div>

            {/* Photos ID */}
            <div className="grid grid-cols-2 gap-2">
              {selectedRequest.id_photo_url && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-dark-600 pl-0.5">Pièce d'identité</p>
                  <a href={selectedRequest.id_photo_url} target="_blank" rel="noreferrer" className="block h-28 rounded-xl bg-surface-100 overflow-hidden border border-surface-200">
                    <img src={selectedRequest.id_photo_url} className="w-full h-full object-cover" alt="ID" />
                  </a>
                </div>
              )}
              {selectedRequest.selfie_url && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-dark-600 pl-0.5">Selfie de vérification</p>
                  <a href={selectedRequest.selfie_url} target="_blank" rel="noreferrer" className="block h-28 rounded-xl bg-surface-100 overflow-hidden border border-surface-200">
                    <img src={selectedRequest.selfie_url} className="w-full h-full object-cover" alt="Selfie" />
                  </a>
                </div>
              )}
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setRejectOpen(true)}
                  className="flex-1 py-3 bg-red-50 text-red-500 font-bold rounded-2xl text-sm active:scale-95 transition-transform"
                >
                  Rejeter
                </button>
                <button
                  onClick={() => approve(selectedRequest)}
                  disabled={processing}
                  className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-transform shadow-md flex items-center justify-center gap-1.5"
                >
                  {processing ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Check size={16} /> Valider la boutique</>
                  )}
                </button>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* REJECT SHEET */}
      {selectedRequest && rejectOpen && (
        <BottomSheet open={rejectOpen} onClose={() => setRejectOpen(false)} title="Motif du rejet">
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
                    <button
                      key={r}
                      onClick={() => toggleReason(r)}
                      className={clsx(
                        'p-3 rounded-xl border text-left text-xs font-semibold transition-all active:scale-[0.99]',
                        selectedReasons.includes(r)
                          ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                          : 'border-surface-200 bg-white text-dark-700 hover:border-surface-300'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Note additionnelle (optionnel)</label>
              <textarea
                placeholder="Compléments ou explications..."
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                rows={2}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-500 resize-none font-medium"
              />
            </div>

            <Button onClick={() => reject(selectedRequest)} disabled={processing} variant="danger" className="w-full py-3.5 text-sm font-bold shadow-md">
              {processing ? 'Traitement...' : 'Confirmer le rejet'}
            </Button>
          </div>
        </BottomSheet>
      )}

      {/* ARBITRAGE LITIGE SHEET */}
      {resolvingDispute && (
        <BottomSheet open={!!resolvingDispute} onClose={() => setResolvingDispute(null)} title="Arbitrage de litige">
          <div className="px-4 pt-2 pb-8 space-y-4">
            <div className="p-3.5 bg-red-500/10 border border-red-300/30 rounded-2xl text-red-800 text-xs leading-normal">
              <strong>Action d'arbitrage.</strong> Vous devez décider si vous remboursez l'acheteur ou si vous libérez les fonds au vendeur. Cette action est irréversible.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Décision arbitrale *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setResDecision('refund_buyer')}
                  className={clsx(
                    'p-3 rounded-xl border-2 text-center text-xs font-bold transition-all active:scale-95',
                    resDecision === 'refund_buyer' ? 'border-red-500 bg-red-50 text-red-700' : 'border-surface-200 text-dark-600 bg-white hover:border-surface-300'
                  )}
                >
                  Rembourser Acheteur
                </button>
                <button
                  onClick={() => setResDecision('pay_seller')}
                  className={clsx(
                    'p-3 rounded-xl border-2 text-center text-xs font-bold transition-all active:scale-95',
                    resDecision === 'pay_seller' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-surface-200 text-dark-600 bg-white hover:border-surface-300'
                  )}
                >
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
              {processing ? 'Application...' : <><CheckCircle size={15} /> Appliquer la décision</>}
            </Button>
          </div>
        </BottomSheet>
      )}

      {/* REJET DEMANDE DE RETRAIT SHEET */}
      {rejectWithdrawalModal && selectedWithdrawal && (
        <BottomSheet
          open={rejectWithdrawalModal}
          onClose={() => { setRejectWithdrawalModal(false); setSelectedWithdrawal(null) }}
          title="Refuser et Rembourser le retrait"
        >
          <div className="px-4 pt-2 pb-8 space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs leading-normal">
              <strong>Annulation & Sécurité :</strong> Le montant de <strong>{Number(selectedWithdrawal.amount).toLocaleString('fr-FR')} FCFA</strong> sera immédiatement recrédité sur le portefeuille MANG PAY du vendeur et une notification lui sera envoyée.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Motif du refus (visible par le vendeur) *</label>
              <textarea
                placeholder="Ex : Numéro Mobile Money erroné ou non attribué. Veuillez corriger vos coordonnées."
                value={rejectWithdrawalReason}
                onChange={e => setRejectWithdrawalReason(e.target.value)}
                rows={3}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-500 resize-none font-medium"
              />
            </div>

            <Button
              onClick={handleRejectWithdrawal}
              disabled={processing}
              variant="danger"
              className="w-full py-3.5 text-sm font-bold shadow-md"
            >
              {processing ? 'Remboursement en cours...' : 'Confirmer le refus & Rembourser'}
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
