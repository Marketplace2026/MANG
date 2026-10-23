import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, X, Shield, Users, Store, Package,
  TrendingUp, Scale, Trash2, Heart, Award, CheckCircle, AlertTriangle, FileText,
  CreditCard, Clock, CheckCircle2, Phone, AlertCircle, Copy, ExternalLink,
  MessageCircle, Ban, UserX, UserCheck, Search, Filter, RefreshCw, Eye,
  Calendar, DollarSign, Flag, MoreVertical, Banknote, ShieldCheck, XCircle,
  MessageSquare, Download, Bell, Send, Lock, History, ChevronRight, Truck,
  Wallet, PlusCircle, MinusCircle, FileSpreadsheet, AlertOctagon
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
  const { user, profile } = useAuthStore()
  const isSuperAdmin = user?.id === ADMIN_ID || profile?.is_admin || profile?.role === 'admin'

  // Active Tab
  const [activeTab, setActiveTab] = useState('withdrawals') 
  // 'withdrawals' | 'verifications' | 'stats' | 'escrow' | 'users' | 'broadcast' | 'posts' | 'audit' | 'disputes' | 'catalog'

  // Live badge counts
  const [badgeCounts, setBadgeCounts] = useState({
    withdrawals: 0,
    verifications: 0,
    disputes: 0,
    posts: 0,
    users: 0,
    escrowOrders: 0,
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

  // 4. Escrow Live Orders Tracker state
  const [escrowOrders, setEscrowOrders] = useState([])
  const [escrowLoading, setEscrowLoading] = useState(false)

  // 5. Users Management state
  const [usersList, setUsersList] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all') // 'all' | 'banned' | 'suspicious'
  const [selectedUser, setSelectedUser] = useState(null)
  const [userWalletsMap, setUserWalletsMap] = useState({})

  // User Wallet Manual Adjustment state
  const [adjustWalletModal, setAdjustWalletModal] = useState(false)
  const [adjOperation, setAdjOperation] = useState('credit') // 'credit' | 'debit'
  const [adjAmount, setAdjAmount] = useState('')
  const [adjReason, setAdjReason] = useState('')

  // 6. Posts Moderation state
  const [postsList, setPostsList] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postFilter, setPostFilter] = useState('all') // 'all' | 'quarantined'
  const [postSearch, setPostSearch] = useState('')

  // 7. Disputes state
  const [disputes, setDisputes] = useState([])
  const [disputesLoading, setDisputesLoading] = useState(false)
  const [resolvingDispute, setResolvingDispute] = useState(null)
  const [resNote, setResNote] = useState('')
  const [resDecision, setResDecision] = useState('')

  // 8. Catalog moderation state
  const [catalogShops, setCatalogShops] = useState([])
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  // 9. Broadcast Notification state
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastTarget, setBroadcastTarget] = useState('all')

  // 10. Audit Logs state
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)

  // Ban Modal state
  const [banModalOpen, setBanModalOpen] = useState(false)
  const [banReasonInput, setBanReasonInput] = useState('')
  const [userToBan, setUserToBan] = useState(null)

  // Sécurité — réservé aux administrateurs
  useEffect(() => {
    if (user && !isSuperAdmin) {
      navigate('/')
      toast.error('Accès refusé : privilège administrateur requis')
    }
  }, [user, isSuperAdmin, navigate])

  // Helper pour consigner les logs d'audit
  const recordAuditLog = useCallback(async (action, targetType = null, targetId = null, details = {}) => {
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id || ADMIN_ID,
        action,
        target_type: targetType,
        target_id: targetId ? targetId.toString() : null,
        details,
      })
    } catch (e) {
      console.warn('Audit log write error:', e)
    }
  }, [user])

  // Compteurs en temps réel pour les pastilles des onglets
  const loadBadgeCounts = useCallback(async () => {
    try {
      const [
        { count: pendingW },
        { count: pendingV },
        { count: openD },
        { count: quarantinedP },
        { count: totalU },
        { count: escrowO }
      ] = await Promise.all([
        supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'quarantined'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid')
      ])

      setBadgeCounts({
        withdrawals: pendingW || 0,
        verifications: pendingV || 0,
        disputes: openD || 0,
        posts: quarantinedP || 0,
        users: totalU || 0,
        escrowOrders: escrowO || 0,
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

      const { data: walletsData } = await supabase.from('wallets').select('balance_reserved, balance_available, balance_total')
      const globalEscrow = walletsData ? walletsData.reduce((sum, w) => sum + (Number(w.balance_reserved) || 0), 0) : 0
      const totalAvailable = walletsData ? walletsData.reduce((sum, w) => sum + (Number(w.balance_available) || 0), 0) : 0

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

  // 4. COMMANDES EN SÉQUESTRE (ESCROW TRACKER)
  const loadEscrowOrders = useCallback(async () => {
    setEscrowLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, total_amount, commission, net_amount, status, delivery_phone, delivery_address,
          product:products(name, image_url),
          buyer:profiles!orders_buyer_id_fkey(username, full_name, phone),
          seller:profiles!orders_seller_id_fkey(username, full_name, phone)
        `)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
      if (!error) setEscrowOrders(data || [])
    } catch (e) {
      console.error('loadEscrowOrders error:', e)
    } finally {
      setEscrowLoading(false)
    }
  }, [])

  // 5. UTILISATEURS (COMPTES)
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300)

      if (!error && profiles) {
        setUsersList(profiles)

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

  // 6. PUBLICATIONS COMMUNAUTAIRES
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

  // 7. LITIGES
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

  // 8. CATALOGUE
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

  // 9. AUDIT LOGS
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (!error) setAuditLogs(data || [])
    } catch (e) {
      console.error('loadAuditLogs error:', e)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  // Déclenchement automatique selon l'onglet actif
  useEffect(() => {
    if (activeTab === 'withdrawals') loadWithdrawals()
    else if (activeTab === 'verifications') loadRequests()
    else if (activeTab === 'stats') loadStats()
    else if (activeTab === 'escrow') loadEscrowOrders()
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'posts') loadPosts()
    else if (activeTab === 'disputes') loadDisputes()
    else if (activeTab === 'catalog') loadCatalog()
    else if (activeTab === 'audit') loadAuditLogs()
  }, [activeTab, loadWithdrawals, loadRequests, loadStats, loadEscrowOrders, loadUsers, loadPosts, loadDisputes, loadCatalog, loadAuditLogs])

  // ==========================================
  // ACTIONS RETRAITS
  // ==========================================
  const handleApproveWithdrawal = async (w) => {
    if (Number(w.amount) >= 100000) {
      if (!confirm(`GROS VIREMENT : Le montant est de ${Number(w.amount).toLocaleString('fr-FR')} FCFA. Confirmez-vous que ce transfert a été exécuté ?`)) return
    } else {
      if (!confirm(`Confirmer que le virement Mobile Money de ${Number(w.amount).toLocaleString('fr-FR')} FCFA a bien été envoyé au ${w.phone} (${w.operator}) ?`)) return
    }

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
        title: 'Retrait Mobile Money validé !',
        body: `Votre retrait de ${Number(w.amount).toLocaleString('fr-FR')} FCFA vers ${w.operator} (${w.phone}) a été transféré avec succès.`,
      })

      await recordAuditLog('withdrawal_approved', 'withdrawal_request', w.id, {
        amount: w.amount,
        phone: w.phone,
        operator: w.operator,
        user_id: w.user_id,
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
        title: 'Demande de retrait annulée & Remboursée',
        body: `Votre demande de retrait de ${Number(w.amount).toLocaleString('fr-FR')} FCFA a été annulée (${reason}). Le montant a été recrédité sur votre portefeuille MANG PAY.`,
      })

      await recordAuditLog('withdrawal_rejected', 'withdrawal_request', w.id, {
        amount: w.amount,
        reason,
        user_id: w.user_id,
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
  // EXPORT COMPTABLE CSV / EXCEL
  // ==========================================
  const exportFinancialReportCSV = async () => {
    toast.loading('Génération du rapport comptable...', { id: 'csv-export' })
    try {
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id, created_at, total_amount, commission, net_amount, status,
          buyer:profiles!orders_buyer_id_fkey(username, full_name, phone),
          seller:profiles!orders_seller_id_fkey(username, full_name, phone)
        `)
        .order('created_at', { ascending: false })

      if (dateFilter === 'today') {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        ordersQuery = ordersQuery.gte('created_at', todayStart.toISOString())
      } else if (dateFilter === '7d') {
        ordersQuery = ordersQuery.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      } else if (dateFilter === 'month') {
        const m = new Date()
        m.setDate(1)
        m.setHours(0, 0, 0, 0)
        ordersQuery = ordersQuery.gte('created_at', m.toISOString())
      }
      const { data: orders } = await ordersQuery

      const { data: withdrawalsList } = await supabase
        .from('withdrawal_requests')
        .select('id, created_at, processed_at, amount, operator, phone, status, receipt_number, user:profiles(username, full_name)')
        .order('created_at', { ascending: false })

      let csvContent = '\uFEFF' // UTF-8 BOM pour Excel
      csvContent += 'RAPPORT COMPTABLE ET FINANCIER MANG\n'
      csvContent += `Date d'exportation;${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')};Filtre;${dateFilter}\n\n`

      csvContent += '--- TRANSACTIONS COMMANDES MARCHÉ ---\n'
      csvContent += 'Date;ID Commande;Acheteur;Vendeur;Total Commande (FCFA);Commission MANG (5%);Net Vendeur (FCFA);Statut\n'
      if (orders && orders.length > 0) {
        orders.forEach(o => {
          csvContent += `${new Date(o.created_at).toLocaleDateString('fr-FR')};${o.id.slice(0, 8)};"${o.buyer?.full_name || o.buyer?.username || ''}";"${o.seller?.full_name || o.seller?.username || ''}";${o.total_amount || 0};${o.commission || 0};${o.net_amount || (o.total_amount - (o.commission || 0))};${o.status}\n`
        })
      } else {
        csvContent += 'Aucune commande enregistrée sur cette période;;;;;;;\n'
      }

      csvContent += '\n--- RETRAITS MOBILE MONEY ---\n'
      csvContent += 'Date;ID Retrait;Bénéficiaire;Opérateur;Numéro de Téléphone;Montant (FCFA);Reçu MANG;Statut\n'
      if (withdrawalsList && withdrawalsList.length > 0) {
        withdrawalsList.forEach(w => {
          csvContent += `${new Date(w.created_at).toLocaleDateString('fr-FR')};${w.id.slice(0, 8)};"${w.user?.full_name || w.user?.username || ''}";${w.operator};${w.phone};${w.amount};${w.receipt_number || ''};${w.status}\n`
        })
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `rapport-financier-mang-${dateFilter}-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Rapport exporté avec succès (compatible Excel)', { id: 'csv-export' })
      await recordAuditLog('export_financial_csv', 'financial_stats', null, { period: dateFilter })
    } catch (e) {
      console.error('Export error:', e)
      toast.error('Erreur lors de l\'exportation', { id: 'csv-export' })
    }
  }

  // ==========================================
  // LIBÉRATION D'OFFICE DU SÉQUESTRE COMMANDE
  // ==========================================
  const handleReleaseEscrow = async (order) => {
    if (!confirm(`Confirmer la libération d'office du séquestre de ${Number(order.total_amount).toLocaleString('fr-FR')} FCFA pour la commande #${order.id.slice(0, 8)} ?\n\nLe montant net (${Number(order.net_amount || order.total_amount * 0.95).toLocaleString('fr-FR')} FCFA) sera immédiatement versé sur le portefeuille du vendeur @${order.seller?.username}.`)) return
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('admin_release_escrow_order', {
        p_order_id: order.id,
        p_note: 'Libération d\'office effectuée par le super-administrateur'
      })

      if (error) {
        // Fallback direct
        const { data: sellerWallet } = await supabase.from('wallets').select('*').eq('user_id', order.seller_id).single()
        if (sellerWallet) {
          const net = Number(order.net_amount || order.total_amount * 0.95)
          await supabase.from('wallets').update({
            balance_reserved: Math.max(0, (sellerWallet.balance_reserved || 0) - Number(order.total_amount)),
            balance_available: (sellerWallet.balance_available || 0) + net,
            balance_total: (sellerWallet.balance_total || 0) + net,
          }).eq('id', sellerWallet.id)

          await supabase.from('orders').update({ status: 'accepted' }).eq('id', order.id)
        }
      }

      await recordAuditLog('escrow_released', 'order', order.id, {
        total: order.total_amount,
        seller_id: order.seller_id,
      })

      toast.success('Séquestre libéré : Le vendeur a été payé !')
      loadEscrowOrders()
      loadStats()
      loadBadgeCounts()
    } catch (err) {
      toast.error('Erreur lors de la libération du séquestre')
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // AJUSTEMENT MANUEL DU PORTEFEUILLE USER
  // ==========================================
  const handleAdjustWallet = async () => {
    if (!selectedUser) return
    const numAmount = parseInt(adjAmount, 10)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Veuillez saisir un montant valide')
      return
    }
    if (!adjReason.trim()) {
      toast.error('Le motif d\'ajustement est obligatoire')
      return
    }
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('admin_adjust_wallet', {
        p_target_user_id: selectedUser.id,
        p_operation: adjOperation,
        p_amount: numAmount,
        p_reason: adjReason.trim()
      })

      if (error) {
        const { data: userWallet } = await supabase.from('wallets').select('*').eq('user_id', selectedUser.id).single()
        if (!userWallet) throw new Error('Portefeuille introuvable')
        const diff = adjOperation === 'credit' ? numAmount : -numAmount
        if (adjOperation === 'debit' && userWallet.balance_available < numAmount) {
          throw new Error('Solde disponible insuffisant pour ce débit')
        }
        const newAvail = userWallet.balance_available + diff
        const newTot = userWallet.balance_total + diff
        await supabase.from('wallets').update({
          balance_available: newAvail,
          balance_total: newTot,
        }).eq('id', userWallet.id)

        const year = new Date().getFullYear()
        const receipt = `MANG-ADJ-${year}-${Math.floor(Math.random() * 9999 + 1)}`
        await supabase.from('wallet_transactions').insert({
          wallet_id: userWallet.id,
          user_id: selectedUser.id,
          type: adjOperation === 'credit' ? 'order_refund' : 'order_payment',
          amount: numAmount,
          balance_after: newAvail,
          description: `Ajustement admin : ${adjReason.trim()}`,
          receipt_number: receipt,
          status: 'completed',
        })

        await supabase.from('notifications').insert({
          user_id: selectedUser.id,
          type: adjOperation === 'credit' ? 'wallet_credit' : 'wallet_debit',
          title: adjOperation === 'credit' ? 'Solde crédité' : 'Solde débité',
          body: `${numAmount.toLocaleString('fr-FR')} FCFA ont été ${adjOperation === 'credit' ? 'crédités sur' : 'déduits de'} votre compte MANG PAY. Motif : ${adjReason.trim()}`,
        })
      }

      await recordAuditLog('wallet_adjusted', 'wallet', selectedUser.id, {
        operation: adjOperation,
        amount: numAmount,
        reason: adjReason.trim(),
      })

      toast.success(`Portefeuille ${adjOperation === 'credit' ? 'crédité' : 'débité'} de ${numAmount.toLocaleString('fr-FR')} FCFA !`)
      setAdjustWalletModal(false)
      setAdjAmount('')
      setAdjReason('')
      loadUsers()
      loadStats()
    } catch (err) {
      toast.error('Erreur : ' + (err.message || 'Échec de l\'opération'))
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // DIFFUSION NOTIFICATION GLOBALE (BROADCAST)
  // ==========================================
  const handleSendBroadcast = async () => {
    const title = broadcastTitle.trim()
    const body = broadcastBody.trim()

    if (!title || !body) {
      toast.error('Veuillez remplir le titre et le corps du message')
      return
    }
    if (!confirm(`Diffuser cette notification à TOUS les utilisateurs inscrits sur MANG ?\n\nTitre : "${title}"`)) return

    setProcessing(true)
    try {
      let sentCount = 0

      // 1. Essai prioritaire via la fonction RPC sécurisée
      const { data, error: rpcError } = await supabase.rpc('admin_broadcast_notification', {
        p_title: title,
        p_body: body,
        p_type: 'system',
      })

      if (!rpcError && (data?.sent_to !== undefined || data?.count !== undefined || data?.success)) {
        sentCount = data.sent_to ?? data.count ?? 0
      } else {
        if (rpcError) {
          console.warn('[Broadcast] RPC admin_broadcast_notification erreur/manquante:', rpcError)
        }

        // 2. Fallback direct : Récupération des profils et insertion par lots (chunks)
        const { data: profiles, error: profErr } = await supabase.from('profiles').select('id')
        if (profErr) {
          throw new Error('Erreur d’accès aux profils utilisateurs : ' + (profErr.message || 'accès refusé'))
        }

        if (!profiles || profiles.length === 0) {
          throw new Error('Aucun profil utilisateur trouvé dans la base de données.')
        }

        const notifs = profiles.map(p => ({
          user_id: p.id,
          type: 'system',
          title: title,
          body: body,
          is_read: false,
          created_at: new Date().toISOString()
        }))

        // Insertion par blocs de 100
        const BATCH_SIZE = 100
        for (let i = 0; i < notifs.length; i += BATCH_SIZE) {
          const chunk = notifs.slice(i, i + BATCH_SIZE)
          const { error: insertErr } = await supabase.from('notifications').insert(chunk)
          if (insertErr) {
            console.error('[Broadcast] Erreur insertion lot:', insertErr)
            throw new Error('Échec d’insertion des notifications : ' + insertErr.message)
          }
        }

        sentCount = profiles.length
      }

      await recordAuditLog('broadcast_notification_sent', 'all_users', null, {
        title: title,
        sent_to: sentCount,
      })

      toast.success(`Notification diffusée avec succès à ${sentCount} membre(s) !`)
      setBroadcastTitle('')
      setBroadcastBody('')
    } catch (err) {
      console.error('handleSendBroadcast error:', err)
      toast.error('Erreur lors de la diffusion : ' + (err.message || ''))
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
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        type: 'system',
        title: 'Boutique vérifiée !',
        body: `Félicitations ! Votre boutique "${req.shop?.name}" a été vérifiée par l'administration. Le badge vérifié est maintenant visible.`,
      })

      await recordAuditLog('shop_verified', 'shop', req.shop_id, { shop_name: req.shop?.name })

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

      await supabase.from('notifications').insert({
        user_id: req.user_id,
        type: 'system',
        title: 'Demande de vérification refusée',
        body: `Votre demande pour "${req.shop?.name}" a été refusée. Raisons : ${adminNote}`,
      })

      await recordAuditLog('shop_verification_rejected', 'shop', req.shop_id, { reason: adminNote })

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
    if (!confirm(`ACTION CRITIQUE : Supprimer définitivement le compte de @${u.username} (${u.full_name || u.phone || u.id}) ?\n\nCette action supprimera également ses boutiques, ses annonces, son portefeuille et ses données comme dans le dashboard Supabase.`)) return
    setProcessing(true)
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_user', { p_target_user_id: u.id })
      if (rpcErr) {
        const { error: delErr } = await supabase.from('profiles').delete().eq('id', u.id)
        if (delErr) throw delErr
      }

      await recordAuditLog('user_deleted', 'profile', u.id, { username: u.username, phone: u.phone })

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
    if (!u.is_banned) {
      // Ouvrir la modal pour saisir le motif de suspension
      setUserToBan(u)
      setBanReasonInput('')
      setBanModalOpen(true)
    } else {
      // Débannir
      if (!confirm(`Confirmer la réactivation du compte @${u.username} ?`)) return
      setProcessing(true)
      try {
        const { error: rpcErr } = await supabase.rpc('admin_toggle_user_ban', {
          p_user_id: u.id,
          p_is_banned: false,
          p_ban_reason: null
        })
        if (rpcErr) {
          const { data, error } = await supabase
            .from('profiles')
            .update({ is_banned: false, ban_reason: null })
            .eq('id', u.id)
            .select()
          if (error) throw error
          if (!data || data.length === 0) {
            throw new Error("L'action a échoué (0 ligne modifiée par les règles de sécurité RLS). Exécutez le script SQL de migration admin 35.")
          }
        }

        await recordAuditLog('user_unbanned', 'profile', u.id, { username: u.username })

        toast.success(`Compte @${u.username} réactivé avec succès`)
        setUsersList(prev => prev.map(item => item.id === u.id ? { ...item, is_banned: false, ban_reason: null } : item))
        if (selectedUser?.id === u.id) {
          setSelectedUser(prev => ({ ...prev, is_banned: false, ban_reason: null }))
        }
      } catch (err) {
        toast.error('Erreur : ' + (err.message || 'Impossible de réactiver le compte'))
      } finally {
        setProcessing(false)
      }
    }
  }

  const handleConfirmBanUser = async () => {
    if (!userToBan) return
    const reason = banReasonInput.trim() || 'Non-respect des règles de la communauté MANG'
    setProcessing(true)
    try {
      const { error: rpcErr } = await supabase.rpc('admin_toggle_user_ban', {
        p_user_id: userToBan.id,
        p_is_banned: true,
        p_ban_reason: reason
      })
      if (rpcErr) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ is_banned: true, ban_reason: reason })
          .eq('id', userToBan.id)
          .select()
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error("L'action a échoué (0 ligne modifiée par les règles de sécurité RLS). Exécutez le script SQL de migration admin 35.")
        }
      }

      await recordAuditLog('user_banned', 'profile', userToBan.id, { username: userToBan.username, reason })

      toast.success(`Compte @${userToBan.username} banni avec succès`)
      setUsersList(prev => prev.map(item => item.id === userToBan.id ? { ...item, is_banned: true, ban_reason: reason } : item))
      if (selectedUser?.id === userToBan.id) {
        setSelectedUser(prev => ({ ...prev, is_banned: true, ban_reason: reason }))
      }
      setBanModalOpen(false)
      setUserToBan(null)
      setBanReasonInput('')
    } catch (err) {
      toast.error('Erreur : ' + (err.message || 'Impossible de bannir le compte'))
    } finally {
      setProcessing(false)
    }
  }

  const handleToggleAdminRole = async (targetUser) => {
    const willBeAdmin = !targetUser.is_admin
    if (!confirm(`Confirmer ${willBeAdmin ? 'la promotion' : 'la révocation'} des droits Administrateur pour @${targetUser.username} ?`)) return
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('admin_toggle_admin_role', {
        p_target_user_id: targetUser.id,
        p_is_admin: willBeAdmin
      })
      if (error) {
        const { error: directErr } = await supabase
          .from('profiles')
          .update({ is_admin: willBeAdmin, role: willBeAdmin ? 'admin' : 'user' })
          .eq('id', targetUser.id)
        if (directErr) throw directErr
      }

      await recordAuditLog(willBeAdmin ? 'admin_promoted' : 'admin_demoted', 'profile', targetUser.id, { username: targetUser.username })

      toast.success(`Droits administrateur ${willBeAdmin ? 'accordés' : 'révoqués'} à @${targetUser.username}`)
      setUsersList(prev => prev.map(item => item.id === targetUser.id ? { ...item, is_admin: willBeAdmin, role: willBeAdmin ? 'admin' : 'user' } : item))
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(prev => ({ ...prev, is_admin: willBeAdmin, role: willBeAdmin ? 'admin' : 'user' }))
      }
    } catch (err) {
      toast.error('Erreur : ' + (err.message || 'Impossible de modifier le rôle'))
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

      await recordAuditLog('post_deleted', 'post', post.id, { author: post.user?.username })

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

      await recordAuditLog('post_status_changed', 'post', post.id, { status: nextStatus })

      toast.success(nextStatus === 'quarantined' ? 'Publication mise en quarantaine' : 'Publication rétablie en ligne')
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
        await recordAuditLog('dispute_resolved', 'dispute', resolvingDispute.id, {
          decision: resDecision,
          note: resNote.trim(),
        })

        toast.success(resDecision === 'refund_buyer' ? 'Litige résolu : Acheteur remboursé !' : 'Litige résolu : Vendeur payé !')
        setResolvingDispute(null)
        setResNote('')
        setResDecision('')
        loadDisputes()
        loadBadgeCounts()
        loadStats()
        loadEscrowOrders()
      } else {
        throw new Error(data?.error || 'Erreur lors de la résolution')
      }
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'arbitrage')
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // ACTIONS CATALOGUE
  // ==========================================
  const handleToggleShopActive = async (shop) => {
    const nextActive = shop.is_active === false
    setProcessing(true)
    try {
      const { error: rpcErr } = await supabase.rpc('admin_toggle_shop_active', {
        p_shop_id: shop.id,
        p_is_active: nextActive
      })
      if (rpcErr) {
        const { data, error } = await supabase
          .from('shops')
          .update({ is_active: nextActive })
          .eq('id', shop.id)
          .select()
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error("L'action a échoué (0 ligne affectée par les permissions RLS). Exécutez la migration SQL 35.")
        }
      }
      await recordAuditLog(nextActive ? 'shop_activated' : 'shop_suspended', 'shop', shop.id, { name: shop.name })
      toast.success(nextActive ? `Boutique "${shop.name}" réactivée` : `Boutique "${shop.name}" suspendue`)
      setCatalogShops(prev => prev.map(s => s.id === shop.id ? { ...s, is_active: nextActive } : s))
    } catch (err) {
      toast.error('Erreur lors du changement de statut : ' + (err.message || ''))
    } finally {
      setProcessing(false)
    }
  }

  const handleToggleProductAvailable = async (product) => {
    const nextAvail = product.is_available === false
    setProcessing(true)
    try {
      const { error: rpcErr } = await supabase.rpc('admin_toggle_product_available', {
        p_product_id: product.id,
        p_is_available: nextAvail
      })
      if (rpcErr) {
        const { data, error } = await supabase
          .from('products')
          .update({ is_available: nextAvail })
          .eq('id', product.id)
          .select()
        if (error) throw error
        if (!data || data.length === 0) {
          throw new Error("L'action a échoué (0 ligne affectée par les permissions RLS). Exécutez la migration SQL 35.")
        }
      }
      await recordAuditLog(nextAvail ? 'product_activated' : 'product_hidden', 'product', product.id, { name: product.name })
      toast.success(nextAvail ? `Produit "${product.name}" visible en ligne` : `Produit "${product.name}" masqué`)
      setCatalogProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: nextAvail } : p))
    } catch (err) {
      toast.error('Erreur lors du changement de statut : ' + (err.message || ''))
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteProduct = async (product) => {
    if (!confirm(`Supprimer définitivement le produit "${product.name}" ?`)) return
    setProcessing(true)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_product', { p_product_id: product.id })
      if (rpcErr) {
        const { error } = await supabase.from('products').delete().eq('id', product.id)
        if (error) throw error
      } else if (rpcData?.message) {
        toast(rpcData.message, { icon: 'ℹ️' })
      }
      await recordAuditLog('product_deleted', 'product', product.id, { name: product.name })
      toast.success('Produit retiré du catalogue !')
      loadCatalog()
    } catch (err) {
      toast.error('Erreur de suppression : ' + (err.message || ''))
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteShop = async (shop) => {
    if (!confirm(`Supprimer définitivement la boutique "${shop.name}" ?`)) return
    setProcessing(true)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_shop', { p_shop_id: shop.id })
      if (rpcErr) {
        const { error } = await supabase.from('shops').delete().eq('id', shop.id)
        if (error) throw error
      } else if (rpcData?.message) {
        toast(rpcData.message, { icon: 'ℹ️' })
      }
      await recordAuditLog('shop_deleted', 'shop', shop.id, { name: shop.name })
      toast.success('Boutique retirée !')
      loadCatalog()
    } catch (err) {
      toast.error('Erreur de suppression : ' + (err.message || ''))
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // DÉTECTION MULTI-COMPTES (NUMÉROS PARTAGÉS)
  // ==========================================
  const sharedPhoneMap = useMemo(() => {
    const map = {}
    usersList.forEach(u => {
      if (u.phone) {
        const clean = u.phone.replace(/[^\d]/g, '')
        if (clean.length >= 8) {
          map[clean] = (map[clean] || 0) + 1
        }
      }
    })
    return map
  }, [usersList])

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
    if (userRoleFilter === 'admins') list = list.filter(u => u.is_admin || u.role === 'admin' || u.id === ADMIN_ID)
    if (userRoleFilter === 'suspicious') {
      list = list.filter(u => {
        if (!u.phone) return false
        const clean = u.phone.replace(/[^\d]/g, '')
        return sharedPhoneMap[clean] > 1
      })
    }

    if (!userSearch.trim()) return list
    const q = userSearch.toLowerCase()
    return list.filter(u =>
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.city && u.city.toLowerCase().includes(q))
    )
  }, [usersList, userRoleFilter, userSearch, sharedPhoneMap])

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
              <p className="text-blue-200/80 text-xs mt-0.5">MANG Command Center Pro</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadBadgeCounts()
                if (activeTab === 'withdrawals') loadWithdrawals()
                else if (activeTab === 'verifications') loadRequests()
                else if (activeTab === 'stats') loadStats()
                else if (activeTab === 'escrow') loadEscrowOrders()
                else if (activeTab === 'users') loadUsers()
                else if (activeTab === 'posts') loadPosts()
                else if (activeTab === 'disputes') loadDisputes()
                else if (activeTab === 'catalog') loadCatalog()
                else if (activeTab === 'audit') loadAuditLogs()
                toast.success('Données actualisées')
              }}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90 transition-all"
              title="Actualiser"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* TABS SELECTOR SCROLLABLE HORIZONTALEMENT */}
        <div className="flex bg-black/25 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 mt-3 text-xs font-bold text-white overflow-x-auto no-scrollbar gap-1.5">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'withdrawals' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <Banknote size={15} />
            <span>Retraits</span>
            {badgeCounts.withdrawals > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {badgeCounts.withdrawals}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('escrow')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'escrow' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <Truck size={15} />
            <span>Séquestre Live</span>
            {badgeCounts.escrowOrders > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {badgeCounts.escrowOrders}
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
            <TrendingUp size={15} />
            <span>Trésorerie</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'users' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <Users size={15} />
            <span>Utilisateurs</span>
            <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 rounded-full">
              {badgeCounts.users}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'broadcast' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <Bell size={15} />
            <span>Diffusion Push</span>
          </button>

          <button
            onClick={() => setActiveTab('verifications')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'verifications' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <ShieldCheck size={15} />
            <span>Vérification</span>
            {badgeCounts.verifications > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {badgeCounts.verifications}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'posts' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <FileText size={15} />
            <span>Posts</span>
            {badgeCounts.posts > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {badgeCounts.posts}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'audit' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <History size={15} />
            <span>Journal d'Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={clsx(
              'flex items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap active:scale-95',
              activeTab === 'disputes' ? 'bg-white text-dark-900 shadow-md font-black' : 'text-blue-100/90 hover:bg-white/10'
            )}
          >
            <Scale size={15} />
            <span>Litiges</span>
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
            <Package size={15} />
            <span>Catalogue</span>
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 max-w-[var(--content-max-width)] mx-auto space-y-4">

        {/* ========================================================= */}
        {/* ONGLET 1 : RETRAITS MOBILE MONEY AVEC OUTILS 1-CLIC */}
        {/* ========================================================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
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
                  { id: 'pending',  label: 'En attente', icon: Clock },
                  { id: 'approved', label: 'Validés', icon: CheckCircle2 },
                  { id: 'rejected', label: 'Rejetés', icon: XCircle },
                  { id: 'all',      label: 'Tous', icon: null },
                ].map(st => {
                  const Icon = st.icon
                  return (
                    <button
                      key={st.id}
                      onClick={() => setWithdrawalFilter(st.id)}
                      className={clsx(
                        'flex-1 py-2 px-1 rounded-xl font-bold text-xs border transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-1',
                        withdrawalFilter === st.id ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-surface-200 bg-white text-dark-600'
                      )}
                    >
                      {Icon && <Icon size={12} />}
                      <span>{st.label}</span>
                    </button>
                  )
                })}
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
                            'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg mt-1',
                            isPending ? 'bg-amber-100 text-amber-800' :
                            isApproved ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                          )}>
                            {isPending && <Clock size={11} />}
                            {isApproved && <CheckCircle2 size={11} />}
                            {!isPending && !isApproved && <XCircle size={11} />}
                            <span>{isPending ? 'En attente' : isApproved ? 'Transféré' : 'Rejeté'}</span>
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
        {/* ONGLET 2 : SÉQUESTRE LIVE & SUIVI COMMANDES EN TRANSIT */}
        {/* ========================================================= */}
        {activeTab === 'escrow' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-3xl p-5 text-white shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">Moniteur des Séquestres</p>
                  <h2 className="font-black text-xl mt-0.5">Commandes payées en attente de livraison</h2>
                </div>
                <span className="bg-white/20 text-white font-bold text-xs px-2.5 py-1 rounded-full">
                  {escrowOrders.length} en transit
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-2 leading-relaxed">
                Les fonds restent bloqués jusqu'à ce que l'acheteur confirme la réception. En cas de retard excessif (+48h/72h), l'administrateur peut libérer d'office le séquestre pour rémunérer le vendeur.
              </p>
            </div>

            {escrowLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-28 skeleton rounded-3xl" />)}
              </div>
            ) : escrowOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-card text-dark-500">
                <Truck size={32} className="mx-auto mb-2 text-dark-400" />
                <p className="font-bold">Aucune commande en attente de livraison</p>
                <p className="text-xs text-dark-400 mt-1">Tous les séquestres ont été débloqués et payés aux vendeurs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {escrowOrders.map(order => {
                  const daysElapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24))
                  const isDelayed = daysElapsed >= 2

                  return (
                    <div key={order.id} className="bg-white rounded-3xl p-4 shadow-card border-2 border-transparent hover:border-emerald-200 transition-all space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-dark-600">Commande #{order.id.slice(0, 8)}</span>
                            {isDelayed && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle size={10} /> +{daysElapsed} jours
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-dark-900 text-sm mt-0.5">{order.product?.name || 'Produit commandé'}</p>
                          <p className="text-xs text-dark-500 mt-0.5">
                            Payée le {new Date(order.created_at).toLocaleDateString('fr-FR')} à {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-emerald-600 text-base leading-tight">
                            {Number(order.total_amount).toLocaleString('fr-FR')} FCFA
                          </p>
                          <p className="text-[10px] text-dark-400 mt-0.5">
                            Net Vendeur : {Number(order.net_amount || order.total_amount * 0.95).toLocaleString('fr-FR')} F
                          </p>
                        </div>
                      </div>

                      {/* Participants */}
                      <div className="p-3 bg-surface-50 rounded-2xl text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-dark-500">Acheteur :</span>
                          <span className="font-bold text-dark-800">
                            {order.buyer?.full_name || order.buyer?.username} ({order.delivery_phone || order.buyer?.phone || 'Pas de numéro'})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-500">Vendeur :</span>
                          <span className="font-bold text-dark-800">
                            @{order.seller?.username} ({order.seller?.phone || 'Pas de numéro'})
                          </span>
                        </div>
                        {order.delivery_address && (
                          <div className="flex justify-between border-t border-surface-200/50 pt-1 text-[11px]">
                            <span className="text-dark-500">Lieu livraison :</span>
                            <span className="text-dark-700 truncate max-w-[200px]">{order.delivery_address}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Super-Admin */}
                      <button
                        onClick={() => handleReleaseEscrow(order)}
                        disabled={processing}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        <span>Libérer le séquestre d'office (Payer le vendeur)</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 3 : TABLEAU DE BORD TRÉSORERIE & EXPORT COMPTABLE */}
        {/* ========================================================= */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Filtres de période temporelle & Bouton Export CSV */}
            <div className="bg-white rounded-2xl p-2 shadow-card flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1 text-xs font-bold flex-1 min-w-[200px]">
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

              {/* Bouton Export Excel / CSV */}
              <button
                onClick={exportFinancialReportCSV}
                className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
                title="Exporter le rapport comptable (CSV/Excel)"
              >
                <Download size={14} />
                <span>Export Comptable (CSV/Excel)</span>
              </button>
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
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 4 : UTILISATEURS & DÉTECTION MULTI-COMPTES */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
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

              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all',        label: `Tous (${usersList.length})` },
                  { id: 'admins',     label: `Admins (${usersList.filter(u => u.is_admin || u.role === 'admin' || u.id === ADMIN_ID).length})` },
                  { id: 'banned',     label: `Bannis (${usersList.filter(u => u.is_banned).length})` },
                  { id: 'suspicious', label: `Numéros partagés (${usersList.filter(u => u.phone && sharedPhoneMap[u.phone.replace(/[^\d]/g, '')] > 1).length})` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setUserRoleFilter(f.id)}
                    className={clsx(
                      'flex-1 py-2 px-1 rounded-xl font-bold text-xs border transition-all text-center whitespace-nowrap',
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
                  const cleanPhone = u.phone ? u.phone.replace(/[^\d]/g, '') : ''
                  const sharedCount = sharedPhoneMap[cleanPhone] || 0
                  const isShared = sharedCount > 1

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
                            {isShared && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <AlertTriangle size={9} /> Numéro partagé ({sharedCount})
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
        {/* ONGLET 5 : DIFFUSION NOTIFICATIONS PUSH GLOBALE */}
        {/* ========================================================= */}
        {activeTab === 'broadcast' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="font-black text-dark-900 text-base">Diffusion Push Générale (Broadcast)</h2>
                  <p className="text-xs text-dark-500">Envoyer une alerte en temps réel à tous les utilisateurs enregistrés sur MANG</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-dark-700 pl-0.5">Titre de la notification *</label>
                  <input
                    type="text"
                    placeholder="Ex: Arrivage frais d'ananas de saison !"
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    className="w-full bg-surface-50 border border-surface-200 rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-dark-700 pl-0.5">Message / Contenu *</label>
                  <textarea
                    rows={4}
                    placeholder="Rédigez le message qui s'affichera dans les notifications des utilisateurs..."
                    value={broadcastBody}
                    onChange={e => setBroadcastBody(e.target.value)}
                    className="w-full bg-surface-50 border border-surface-200 rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 resize-none font-medium"
                  />
                </div>

                <button
                  onClick={handleSendBroadcast}
                  disabled={processing || !broadcastTitle.trim() || !broadcastBody.trim()}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={16} />
                  <span>{processing ? 'Diffusion en cours...' : `Diffuser la notification (${badgeCounts.users || usersList.length || 'tous les'} membres)`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 6 : VERIFICATIONS DES BOUTIQUES */}
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
        {/* ONGLET 7 : MODÉRATION DES POSTS COMMUNAUTAIRES */}
        {/* ========================================================= */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
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
                  { id: 'all',         label: 'Toutes les publications', icon: FileText },
                  { id: 'quarantined', label: 'En quarantaine / Signalées', icon: AlertTriangle },
                ].map(pf => {
                  const Icon = pf.icon
                  return (
                    <button
                      key={pf.id}
                      onClick={() => setPostFilter(pf.id)}
                      className={clsx(
                        'flex-1 py-2 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5',
                        postFilter === pf.id ? 'border-red-600 bg-red-50 text-red-800' : 'border-surface-200 bg-white text-dark-600'
                      )}
                    >
                      <Icon size={13} />
                      <span>{pf.label}</span>
                    </button>
                  )
                })}
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
                          'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg',
                          isQuarantined ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        )}>
                          {isQuarantined ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                          <span>{isQuarantined ? 'En Quarantaine' : 'En ligne'}</span>
                        </span>
                      </div>

                      <p className="text-xs text-dark-800 whitespace-pre-line leading-relaxed font-normal">
                        {p.content}
                      </p>

                      {p.image_url && (
                        <div className="h-44 rounded-2xl overflow-hidden bg-surface-100 border border-surface-200">
                          <img src={p.image_url} alt="Publication" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-surface-100 text-xs">
                        <div className="flex items-center gap-3 text-dark-400 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Heart size={12} className="text-rose-500 fill-rose-500" />
                            <span>{p.likes_count || 0}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} className="text-blue-500" />
                            <span>{p.comments_count || 0}</span>
                          </span>
                        </div>

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
        {/* ONGLET 8 : JOURNAL D'AUDIT (AUDIT LOGS) */}
        {/* ========================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-4 shadow-card flex items-center justify-between">
              <div>
                <h2 className="font-black text-dark-900 text-base">Journal d'Audit & Traçabilité</h2>
                <p className="text-xs text-dark-500">Historique sécurisé des actions sensibles effectuées par l'administration</p>
              </div>
              <button
                onClick={loadAuditLogs}
                className="p-2 rounded-xl bg-surface-50 border border-surface-200 text-dark-600 active:scale-90"
                title="Actualiser les logs"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {auditLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 skeleton rounded-3xl" />)}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-card text-dark-500">
                <History size={28} className="mx-auto mb-2 text-dark-400" />
                <p className="font-bold">Aucun événement enregistré</p>
                <p className="text-xs text-dark-400 mt-1">Les futures actions administratives apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditLogs.map(log => (
                  <div key={log.id} className="bg-white rounded-2xl p-3.5 shadow-card border border-surface-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black font-mono uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-dark-400">
                        {new Date(log.created_at).toLocaleDateString('fr-FR')} {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {log.target_type && (
                      <p className="text-dark-700 font-medium">
                        Cible : <strong className="font-mono">{log.target_type}</strong> {log.target_id ? `(#${log.target_id.slice(0, 8)})` : ''}
                      </p>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-[11px] text-dark-500 bg-surface-50 p-2 rounded-xl font-mono">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 9 : ARBITRAGE DES LITIGES */}
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
        {/* ONGLET 10 : MODÉRATION CATALOGUE */}
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
                      <div key={sh.id} className="flex justify-between items-center py-2.5 border-b border-surface-50 last:border-0 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={clsx(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0',
                            sh.is_active === false ? 'bg-red-100 text-red-700' :
                            sh.is_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-100 text-dark-500'
                          )}>
                            {sh.is_active === false ? 'Suspendue' : sh.is_verified ? 'Vérifiée' : 'Standard'}
                          </span>
                          <div className="min-w-0">
                            <p className={clsx("font-bold text-xs truncate", sh.is_active === false ? "text-dark-400 line-through" : "text-dark-800")}>{sh.name}</p>
                            <p className="text-dark-600/35 text-[9px] truncate">Par @{sh.owner?.username || 'vendeur'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggleShopActive(sh)}
                            disabled={processing}
                            className={clsx(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold active:scale-95 transition-all border",
                              sh.is_active === false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                            title={sh.is_active === false ? "Réactiver la boutique" : "Suspendre la boutique"}
                          >
                            {sh.is_active === false ? "Réactiver" : "Suspendre"}
                          </button>
                          <button
                            onClick={() => handleDeleteShop(sh)}
                            disabled={processing}
                            className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg active:scale-75 transition-all"
                            title="Supprimer la boutique"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
                      <div key={prod.id} className="flex justify-between items-center py-2.5 border-b border-surface-50 last:border-0 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-surface-100 overflow-hidden flex-shrink-0">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt="" className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={clsx("font-bold text-xs truncate max-w-[140px]", prod.is_available === false ? "text-dark-400 line-through" : "text-dark-800")}>{prod.name}</p>
                              {prod.is_available === false && (
                                <span className="bg-red-100 text-red-700 text-[9px] font-black px-1 rounded">Masqué</span>
                              )}
                            </div>
                            <p className="text-dark-600/35 text-[9px] truncate">Boutique : {prod.shop?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleToggleProductAvailable(prod)}
                            disabled={processing}
                            className={clsx(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold active:scale-95 transition-all border",
                              prod.is_available === false ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-700 border-gray-200"
                            )}
                            title={prod.is_available === false ? "Rendre visible" : "Masquer le produit"}
                          >
                            {prod.is_available === false ? "Afficher" : "Masquer"}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            disabled={processing}
                            className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg active:scale-75 transition-all"
                            title="Supprimer le produit"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
              {selectedUser.is_banned && selectedUser.ban_reason && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <strong>Motif du bannissement :</strong> {selectedUser.ban_reason}
                </div>
              )}
            </div>

            {/* Solde Portefeuille si disponible */}
            {userWalletsMap[selectedUser.id] && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-black text-emerald-900 uppercase text-[10px]">Portefeuille MANG PAY associé</p>
                  <button
                    onClick={() => {
                      setAdjOperation('credit')
                      setAdjAmount('')
                      setAdjReason('')
                      setAdjustWalletModal(true)
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                  >
                    <Wallet size={12} />
                    <span>Ajuster Solde</span>
                  </button>
                </div>
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

            {/* Actions Administrateur sur le compte */}
            {selectedUser.id !== ADMIN_ID && (
              <div className="space-y-2 pt-2">
                {/* Promouvoir / Révoquer Administrateur */}
                <button
                  onClick={() => handleToggleAdminRole(selectedUser)}
                  disabled={processing}
                  className={clsx(
                    'w-full py-3.5 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-2 border',
                    selectedUser.is_admin
                      ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                  )}
                >
                  <Shield size={16} />
                  <span>{selectedUser.is_admin ? 'Révoquer les droits Administrateur' : 'Accorder les droits Administrateur'}</span>
                </button>

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

      {/* MODAL AJUSTEMENT PORTEFEUILLE */}
      {adjustWalletModal && selectedUser && (
        <BottomSheet
          open={adjustWalletModal}
          onClose={() => setAdjustWalletModal(false)}
          title={`Ajuster le solde de @${selectedUser.username}`}
        >
          <div className="px-4 pt-2 pb-8 space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs">
              Action financière tracée dans le journal d'audit. L'utilisateur recevra une notification automatique.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAdjOperation('credit')}
                className={clsx(
                  'p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all',
                  adjOperation === 'credit' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-surface-200 text-dark-600'
                )}
              >
                <PlusCircle size={15} />
                <span>Créditer (+)</span>
              </button>

              <button
                onClick={() => setAdjOperation('debit')}
                className={clsx(
                  'p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all',
                  adjOperation === 'debit' ? 'border-red-500 bg-red-50 text-red-800' : 'border-surface-200 text-dark-600'
                )}
              >
                <MinusCircle size={15} />
                <span>Débiter (-)</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Montant en FCFA *</label>
              <input
                type="number"
                placeholder="Ex : 5000"
                value={adjAmount}
                onChange={e => setAdjAmount(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Motif / Justification obligatoire *</label>
              <textarea
                rows={2}
                placeholder="Ex : Geste commercial suite au litige #123 ou régularisation de compte"
                value={adjReason}
                onChange={e => setAdjReason(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 resize-none font-medium"
              />
            </div>

            <Button
              onClick={handleAdjustWallet}
              disabled={processing}
              className={clsx(
                'w-full py-3.5 text-white font-bold rounded-2xl shadow-md',
                adjOperation === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {processing ? 'En cours...' : `Confirmer le ${adjOperation === 'credit' ? 'Crédit' : 'Débit'}`}
            </Button>
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

      {/* BAN USER MODAL */}
      {banModalOpen && userToBan && (
        <BottomSheet
          open={banModalOpen}
          onClose={() => { setBanModalOpen(false); setUserToBan(null) }}
          title={`Suspendre @${userToBan.username || 'l’utilisateur'}`}
        >
          <div className="px-4 pt-2 pb-8 space-y-4">
            <div className="p-3.5 bg-red-500/10 border border-red-300/30 rounded-2xl text-red-800 text-xs leading-normal space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-red-700">
                <AlertTriangle size={15} /> Suspension immédiate du compte
              </p>
              <p>
                L'utilisateur sera immédiatement bloqué par l'écran de sécurité de MANG. Il ne pourra plus passer de commande, publier de contenu ni accéder à son portefeuille jusqu'à réactivation.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Motifs fréquents :</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Fraude / Tentative d’escroquerie',
                  'Non-respect des règles de la communauté',
                  'Contenu inapproprié ou contrefaçon',
                  'Comportement abusif / Harcèlement',
                  'Commandes non honorées à répétition',
                  'Suspicion d’usurpation d’identité'
                ].map((reasonPreset) => (
                  <button
                    key={reasonPreset}
                    type="button"
                    onClick={() => setBanReasonInput(reasonPreset)}
                    className={clsx(
                      'text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-all text-left',
                      banReasonInput === reasonPreset
                        ? 'bg-red-50 border-red-500 text-red-700 font-bold'
                        : 'bg-white border-surface-200 text-dark-600 hover:border-surface-300'
                    )}
                  >
                    {reasonPreset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-dark-700 pl-0.5">Motif personnalisé affiché à l'utilisateur :</label>
              <textarea
                placeholder="Indiquez clairement la raison du bannissement..."
                value={banReasonInput}
                onChange={e => setBanReasonInput(e.target.value)}
                rows={3}
                className="w-full bg-surface-50 border border-surface-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-red-500 resize-none font-medium"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setBanModalOpen(false); setUserToBan(null) }}
                className="flex-1 py-3 bg-surface-100 text-dark-700 font-bold rounded-2xl text-xs active:scale-95 transition-transform"
              >
                Annuler
              </button>
              <Button
                onClick={handleConfirmBanUser}
                disabled={processing}
                variant="danger"
                className="flex-[2] py-3 text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {processing ? 'Suspension en cours...' : <><Ban size={14} /> Confirmer la suspension</>}
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

