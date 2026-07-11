import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Edit3, MapPin, Phone, User, Mail,
  LogOut, ChevronRight, Shield, Bell, HelpCircle,
  Wallet, Coins, Copy, Check, Settings, Star,
  Lock, Eye, EyeOff, Globe, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, XCircle, ToggleLeft, ToggleRight,
  Navigation, X, MessageCircle, Gift, Store, Package, Heart,
  Truck, Clock, CheckCircle, ArrowUpRight, ArrowDownLeft,
  Home, Plus, Trash2, PenLine, ShieldCheck, TrendingUp
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'
import { useAuthStore, useNotificationsStore } from '@/store'
import {
  Avatar, Button, BottomSheet, InputField, StatCard
} from '@/components/ui'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=16`,
    { headers: { 'Accept-Language': 'fr' } }
  )
  const data = await res.json()
  const a = data.address || {}
  const neighbourhood = a.neighbourhood || a.suburb || a.quarter || a.borough || a.city_district || a.village || ''
  const city = a.city || a.town || a.municipality || a.county || a.state_district || ''
  const country = a.country_code?.toUpperCase() || ''
  const label = [neighbourhood, city].filter(Boolean).join(', ')
  return { label, city, neighbourhood, country, display_name: data.display_name }
}

// Niveau de fidélité selon les commandes totales
function getMemberLevel(totalOrders = 0) {
  if (totalOrders >= 50) return { label: 'Membre Gold', icon: '🥇', color: 'from-yellow-500 to-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' }
  if (totalOrders >= 20) return { label: 'Membre Silver', icon: '🥈', color: 'from-slate-400 to-slate-300', text: 'text-slate-700', bg: 'bg-slate-100' }
  return { label: 'Membre Bronze', icon: '🥉', color: 'from-orange-600 to-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' }
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, profile, wallet, pieces, signOut, refreshProfile } = useAuthStore()
  const { unreadCount, fetchNotifications } = useNotificationsStore()
  const navigate = useNavigate()

  const [editOpen,       setEditOpen]       = useState(false)
  const [settingsOpen,   setSettingsOpen]   = useState(false)
  const [walletCopied,   setWalletCopied]   = useState(false)
  const [addressesOpen,  setAddressesOpen]  = useState(false)
  const [loyaltyOpen,    setLoyaltyOpen]    = useState(false)

  // Données supplémentaires chargées
  const [orderStats,  setOrderStats]  = useState({ pending: 0, accepted: 0, paid: 0, delivered: 0 })
  const [userShops,   setUserShops]   = useState([])
  const [addresses,   setAddresses]   = useState([])

  // Sous-feuilles des paramètres
  const [securityOpen,  setSecurityOpen]  = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [privacyOpen,   setPrivacyOpen]   = useState(false)
  const [languageOpen,  setLanguageOpen]  = useState(false)
  const [helpOpen,      setHelpOpen]      = useState(false)

  useEffect(() => {
    if (!user) return
    fetchNotifications(user.id)
    loadExtra()
  }, [user])

  const loadExtra = async () => {
    if (!user) return

    // Stats commandes acheteur
    const { data: orders } = await supabase
      .from('orders')
      .select('status, delivery_status')
      .eq('buyer_id', user.id)

    if (orders) {
      setOrderStats({
        pending:   orders.filter(o => o.status === 'pending').length,
        accepted:  orders.filter(o => o.status === 'accepted').length,
        paid:      orders.filter(o => o.status === 'paid' && o.delivery_status !== 'delivered').length,
        delivered: orders.filter(o => o.delivery_status === 'delivered').length,
      })
    }

    // Boutiques du vendeur
    const { data: shops } = await supabase
      .from('shops')
      .select('id, name, slug, is_active, is_verified')
      .eq('owner_id', user.id)
    setUserShops(shops || [])

    // Adresses de livraison
    const { data: addrs } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
    setAddresses(addrs || [])
  }

  const handleCopyWallet = () => {
    if (!wallet?.wallet_number) return
    navigator.clipboard.writeText(wallet.wallet_number)
    setWalletCopied(true)
    toast.success('Numéro copié !')
    setTimeout(() => setWalletCopied(false), 2000)
  }

  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const handleSignOut = async () => {
    if (!signOutConfirm) { setSignOutConfirm(true); return }
    await signOut()
    navigate('/connexion')
  }

  if (!profile) return <ProfileSkeleton />

  const isOnline = profile.last_seen_at
    ? (new Date() - new Date(profile.last_seen_at)) < 300000 : false

  const totalOrders = orderStats.pending + orderStats.accepted + orderStats.paid + orderStats.delivered
  const memberLevel = getMemberLevel(totalOrders)
  const hasShop = userShops.length > 0

  return (
    <div className="min-h-screen bg-surface-50">

      {/* ── HERO HEADER ── */}
      <div className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 pb-24 pt-4">
        {/* Motif de fond */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-gold-400/10 blur-3xl"/>
          <div className="absolute bottom-0 left-0 w-72 h-36 rounded-full bg-primary-400/10 blur-2xl"/>
          <div className="absolute inset-0 opacity-5"
            style={{backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)',backgroundSize:'24px 24px'}}/>
        </div>

        {/* Barre du haut */}
        <div className="relative flex justify-between items-center px-5 mb-5">
          <h1 className="font-display text-xl text-white font-bold">Mon MANG</h1>
          <div className="flex items-center gap-2">
            {/* Badge Notifications */}
            {unreadCount > 0 && (
              <button onClick={() => navigate('/notifications')}
                className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 transition-transform">
                <Bell size={17} className="text-white"/>
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1 border-2 border-primary-800">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </button>
            )}
            <button onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 transition-transform">
              <Settings size={17} className="text-white"/>
            </button>
          </div>
        </div>

        {/* Infos profil */}
        <div className="relative flex flex-col items-center px-5">
          <AvatarUploader profile={profile} onUpdated={refreshProfile}/>

          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="font-display text-2xl text-white font-bold">
                {profile.full_name || profile.username}
              </h2>
              {isOnline && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-primary-700 animate-pulse-dot"/>}
            </div>
            <p className="text-primary-300 text-sm font-medium mt-0.5">@{profile.username}</p>

            {/* Badge ville */}
            {profile.city && (
              <div className="flex items-center justify-center gap-1 mt-1.5">
                <MapPin size={11} className="text-primary-400"/>
                <span className="text-primary-400 text-xs font-medium">
                  {[profile.neighbourhood, profile.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {/* Badge niveau de membre */}
            <div className={`inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full ${memberLevel.bg} border border-white/10`}>
              <span className="text-xs">{memberLevel.icon}</span>
              <span className={`text-[11px] font-black ${memberLevel.text}`}>{memberLevel.label}</span>
            </div>
          </div>

          <button onClick={() => setEditOpen(true)}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 active:bg-white/20 border border-white/20 transition-colors">
            <Edit3 size={13} className="text-white"/>
            <span className="text-white text-sm font-semibold">Modifier le profil</span>
          </button>
        </div>
      </div>

      {/* ── CONTENU FLOTTANT ── */}
      <div className="relative -mt-14 px-4 space-y-4 pb-28">

        {/* ── WIDGET WALLET GLASSMORPHISM ── */}
        <WalletCard
          wallet={wallet}
          pieces={pieces}
          copied={walletCopied}
          onCopy={handleCopyWallet}
          onNavigate={() => navigate('/portefeuille')}
        />

        {/* ── SUIVI COMMANDES ACHETEUR ── */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="text-[11px] font-black text-dark-400 uppercase tracking-wider">Mes Commandes</p>
            <button onClick={() => navigate('/commandes')}
              className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
              Voir tout
            </button>
          </div>
          <div className="grid grid-cols-4 divide-x divide-surface-100 pb-4">
            {[
              { icon: Clock,        label: 'En attente', count: orderStats.pending,   color: 'text-orange-500', bg: 'bg-orange-50' },
              { icon: Package,      label: 'Acceptées',  count: orderStats.accepted,  color: 'text-blue-500',   bg: 'bg-blue-50'   },
              { icon: Truck,        label: 'En cours',   count: orderStats.paid,      color: 'text-violet-500', bg: 'bg-violet-50' },
              { icon: CheckCircle,  label: 'Livrées',    count: orderStats.delivered, color: 'text-emerald-500',bg: 'bg-emerald-50'},
            ].map((item, i) => (
              <button key={i} onClick={() => navigate('/commandes')}
                className="flex flex-col items-center gap-1.5 pt-3 pb-1 active:bg-surface-50 transition-colors">
                <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center relative`}>
                  <item.icon size={16} className={item.color}/>
                  {item.count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center px-0.5 border border-white">
                      {item.count > 9 ? '9+' : item.count}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold text-dark-500 leading-tight text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── RACCOURCIS RAPIDES ── */}
        <div className="bg-white rounded-3xl shadow-card p-4">
          <p className="text-[11px] font-black text-dark-400 uppercase tracking-wider mb-3.5">Accès rapide</p>
          <div className="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
            {[
              { icon: Heart,        label: 'Favoris',       onClick: () => navigate('/favoris'),        color: 'text-red-500     bg-red-50'    },
              { icon: MessageCircle,label: 'Messages',       onClick: () => navigate('/messages'),       color: 'text-violet-600  bg-violet-50' },
              { icon: Gift,         label: 'Parrainage',    onClick: () => navigate('/parrainage'),     color: 'text-amber-600   bg-amber-50'  },
              { icon: Globe,        label: 'Communauté',    onClick: () => navigate('/communaute'),     color: 'text-primary-600 bg-primary-50'},
            ].map((item, i) => {
              const IC = item.icon
              return (
                <button key={i} onClick={item.onClick}
                  className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.color}`}>
                    <IC size={18} strokeWidth={2.2}/>
                  </div>
                  <span className="text-[10px] font-bold text-dark-700 leading-tight">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── ESPACE ACHETEUR ── */}
        <MenuSection title="Activité Acheteur" icon="🛒">
          <MenuItem icon={Package}    color="text-orange-500 bg-orange-50" label="Historique Commandes"     sub="Suivez vos achats"              onClick={() => navigate('/commandes')}/>
          <MenuItem icon={Heart}      color="text-red-500 bg-red-50"       label="Mes Favoris"              sub="Boutiques et produits suivis"   onClick={() => navigate('/favoris')}/>
          <MenuItem icon={MapPin}     color="text-primary-600 bg-primary-50" label="Carnet d'adresses"     sub={`${addresses.length} adresse(s) enregistrée(s)`} onClick={() => setAddressesOpen(true)}/>
          <MenuItem icon={TrendingUp} color="text-amber-500 bg-amber-50"   label="Mon niveau de fidélité"  sub={`${memberLevel.icon} ${memberLevel.label} · ${totalOrders} commandes`} onClick={() => setLoyaltyOpen(true)} last/>
        </MenuSection>

        {/* ── ESPACE VENDEUR ── */}
        <MenuSection title="Espace Vendeur" icon="🏪">
          {hasShop ? (
            userShops.map((shop, i) => (
              <MenuItem
                key={shop.id}
                icon={Store}
                color="text-primary-600 bg-primary-50"
                label={shop.name}
                sub={shop.is_verified ? '✅ Boutique vérifiée' : '⏳ En attente de vérification'}
                onClick={() => navigate(`/vendeur`)}
                last={i === userShops.length - 1}
              />
            ))
          ) : (
            <MenuItem icon={Store} color="text-primary-600 bg-primary-50" label="Créer ma boutique" sub="Commencez à vendre dès aujourd'hui" onClick={() => navigate('/vendeur')} last/>
          )}
        </MenuSection>

        {/* ── INFORMATIONS PERSONNELLES ── */}
        <PersonalInfoCard profile={profile} onEdit={() => setEditOpen(true)}/>

        {/* ── PARAMÈTRES ── */}
        <MenuSection title="Paramètres" icon="⚙️">
          <MenuItem icon={Shield}     color="text-dark-600 bg-surface-100"  label="Sécurité & Mot de passe"    onClick={() => setSecurityOpen(true)}/>
          <MenuItem icon={Bell}       color="text-blue-600 bg-blue-50"      label="Notifications"              onClick={() => setNotifOpen(true)}/>
          <MenuItem icon={MapPin}     color="text-emerald-600 bg-emerald-50" label="Confidentialité localisation" onClick={() => setPrivacyOpen(true)}/>
          <MenuItem icon={Globe}      color="text-violet-600 bg-violet-50"  label="Langue de l'application"   onClick={() => setLanguageOpen(true)} last/>
        </MenuSection>

        {/* ── SUPPORT ── */}
        <MenuSection title="Aide & Support" icon="💬">
          <MenuItem icon={HelpCircle} color="text-primary-600 bg-primary-50" label="Centre d'aide & FAQ"       onClick={() => setHelpOpen(true)}/>
          <MenuItem icon={MessageCircle} color="text-emerald-600 bg-emerald-50" label="WhatsApp Support"        sub="Réponse en moins d'1h"           onClick={() => window.open('https://wa.me/2290197293196', '_blank')} last/>
        </MenuSection>

        {/* Bouton déconnexion */}
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 active:bg-red-100 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <LogOut size={16} className="text-red-500"/>
          </div>
          <span className="flex-1 text-left text-sm font-bold text-red-600">
            {signOutConfirm ? 'Confirmer la déconnexion ?' : 'Se déconnecter'}
          </span>
          {signOutConfirm && <span className="text-xs text-red-400 font-semibold">Appuyez à nouveau</span>}
        </button>

      </div>

      {/* ── MODALS & FEUILLES ── */}

      {/* Modifier profil */}
      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onUpdated={refreshProfile}/>

      {/* Paramètres hub */}
      <SettingsSheet
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        onSignOut={handleSignOut}
        onSecurity={() => { setSettingsOpen(false); setSecurityOpen(true) }}
        onPrivacy={() => { setSettingsOpen(false); setPrivacyOpen(true) }}
        onNotif={() => { setSettingsOpen(false); setNotifOpen(true) }}
        onLanguage={() => { setSettingsOpen(false); setLanguageOpen(true) }}
        onHelp={() => { setSettingsOpen(false); setHelpOpen(true) }}
      />

      <SecuritySheet open={securityOpen} onClose={() => setSecurityOpen(false)}/>
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} profile={profile} onUpdated={refreshProfile}/>
      <PrivacySheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} profile={profile} onUpdated={refreshProfile}/>
      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} profile={profile} onUpdated={refreshProfile}/>
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)}/>

      {/* Carnet d'adresses */}
      <AddressesSheet
        open={addressesOpen}
        onClose={() => { setAddressesOpen(false); loadExtra() }}
        userId={user?.id}
        addresses={addresses}
        onRefresh={loadExtra}
      />

      {/* Fidélité */}
      <LoyaltySheet
        open={loyaltyOpen}
        onClose={() => setLoyaltyOpen(false)}
        memberLevel={memberLevel}
        totalOrders={totalOrders}
      />
    </div>
  )
}

// ─── MenuSection ─────────────────────────────────────────────────────────────

function MenuSection({ title, icon, children }) {
  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      <div className="px-5 pt-4 pb-2 border-b border-surface-50">
        <p className="text-[11px] font-black text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>{icon}</span> {title}
        </p>
      </div>
      <div className="divide-y divide-surface-50">
        {children}
      </div>
    </div>
  )
}

// ─── MenuItem ────────────────────────────────────────────────────────────────

function MenuItem({ icon: Icon, color, label, sub, onClick, last }) {
  return (
    <button onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-5 py-3.5 active:bg-surface-50 transition-colors text-left',
      )}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={16} strokeWidth={2.2}/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-dark-800 leading-snug">{label}</p>
        {sub && <p className="text-[11px] text-dark-600/50 mt-0.5 truncate">{sub}</p>}
      </div>
      <ChevronRight size={15} className="text-dark-600/25 flex-shrink-0"/>
    </button>
  )
}

// ─── AvatarUploader ───────────────────────────────────────────────────────────

function AvatarUploader({ profile, onUpdated }) {
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImage(file, 400, 0.85)
      const path = `${profile.id}/avatar.jpg`
      const url = await uploadImage(BUCKETS.AVATARS, compressed, path)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
      await onUpdated()
      toast.success('Photo mise à jour !')
    } catch { toast.error("Erreur lors de l'upload") }
    finally { setUploading(false) }
  }

  return (
    <div className="relative">
      <Avatar src={profile.avatar_url} name={profile.full_name || profile.username} size="2xl"
        className="ring-4 ring-white/30 ring-offset-2 ring-offset-primary-800"/>
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className="absolute bottom-1 right-1 w-9 h-9 rounded-xl bg-primary-500 border-2 border-primary-800 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
        {uploading
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          : <Camera size={15} className="text-white"/>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden"/>
    </div>
  )
}

// ─── WalletCard (Glassmorphism Premium) ───────────────────────────────────────

function WalletCard({ wallet, pieces, copied, onCopy, onNavigate }) {
  const balance  = wallet ? Number(wallet.balance_available ?? 0).toLocaleString('fr-FR') : '—'
  const reserved = wallet ? Number(wallet.balance_reserved ?? 0) : 0

  return (
    <div
      onClick={onNavigate}
      className="relative overflow-hidden rounded-3xl cursor-pointer active:scale-[0.98] transition-transform shadow-modal"
      style={{ background: 'linear-gradient(135deg, #0f2027, #1a3a2a, #0f2027)' }}
    >
      {/* Effets de lumière */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary-500/15 blur-3xl pointer-events-none"/>
      <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-gold-500/10 blur-2xl pointer-events-none"/>
      <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)',backgroundSize:'18px 18px'}}/>

      <div className="relative p-5">
        {/* Header carte */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Wallet size={15} className="text-primary-400"/>
            </div>
            <span className="text-white/70 text-sm font-semibold">MANG Wallet</span>
          </div>
          <span className="text-white/30 text-xs font-mono tracking-widest">
            {wallet?.wallet_number ? `•••• ${wallet.wallet_number.slice(-4)}` : '——'}
          </span>
        </div>

        {/* Solde principal */}
        <div className="mb-4">
          <p className="text-white/40 text-xs mb-1">Solde disponible</p>
          <p className="font-display text-3xl font-bold text-white">
            {balance} <span className="text-lg text-white/40">FCFA</span>
          </p>
          {reserved > 0 && (
            <p className="text-gold-400 text-xs mt-1">
              {Number(reserved).toLocaleString('fr-FR')} FCFA en réserve
            </p>
          )}
        </div>

        {/* Séparateur */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Pièces MANG */}
            <div className="flex items-center gap-1.5">
              <Coins size={13} className="text-gold-400"/>
              <span className="text-gold-400 text-xs font-bold">{pieces?.balance ?? 0} pièces</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); onCopy() }}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors">
              {copied ? <Check size={13} className="text-emerald-400"/> : <Copy size={13}/>}
              <span className="text-[10px] font-medium">{copied ? 'Copié !' : 'Copier N°'}</span>
            </button>
            {/* Badge 'Voir' */}
            <div className="flex items-center gap-1 text-white/40">
              <ArrowUpRight size={13}/>
              <span className="text-[10px] font-medium">Gérer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PersonalInfoCard ─────────────────────────────────────────────────────────

function PersonalInfoCard({ profile, onEdit }) {
  const locationLabel = [profile.neighbourhood, profile.city].filter(Boolean).join(', ')

  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <p className="text-[11px] font-black text-dark-400 uppercase tracking-wider">👤 Informations</p>
        <button onClick={onEdit} className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
          Modifier
        </button>
      </div>
      <div className="divide-y divide-surface-50">
        {[
          { icon: User,   label: 'Nom complet',  value: profile.full_name  || 'Non renseigné' },
          { icon: Mail,   label: 'Email',         value: profile.email },
          { icon: Phone,  label: 'Téléphone',     value: profile.phone     || 'Non renseigné' },
          { icon: MapPin, label: 'Localisation',  value: locationLabel     || 'Non renseignée' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <item.icon size={13} className="text-primary-600"/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-dark-600/40 font-semibold uppercase tracking-wide">{item.label}</p>
              <p className="text-sm text-dark-800 font-semibold truncate mt-0.5">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AddressesSheet ───────────────────────────────────────────────────────────

function AddressesSheet({ open, onClose, userId, addresses, onRefresh }) {
  const [addMode,   setAddMode]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [locating,  setLocating]  = useState(false)
  const [form,      setForm]      = useState({ label: '', address_line: '', city: '', neighbourhood: '', latitude: null, longitude: null, is_default: false })

  const resetForm = () => setForm({ label: '', address_line: '', city: '', neighbourhood: '', latitude: null, longitude: null, is_default: false })

  const handleLocate = () => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const geo = await reverseGeocode(coords.latitude, coords.longitude)
        setForm(p => ({ ...p, city: geo.city, neighbourhood: geo.neighbourhood, latitude: coords.latitude, longitude: coords.longitude }))
        toast.success(`📍 ${geo.label}`)
      } catch { toast.error('Erreur de géocodage') }
      setLocating(false)
    }, () => { toast.error('GPS refusé'); setLocating(false) }, { enableHighAccuracy: true, timeout: 15000 })
  }

  const handleSave = async () => {
    if (!form.label || !form.city) { toast.error('Remplissez au minimum un libellé et la ville'); return }
    setLoading(true)
    const { error } = await supabase.from('user_addresses').insert({
      user_id: userId,
      label: form.label.trim(),
      address_line: form.address_line.trim() || null,
      city: form.city.trim(),
      neighbourhood: form.neighbourhood.trim() || null,
      latitude: form.latitude,
      longitude: form.longitude,
      is_default: form.is_default,
    })
    setLoading(false)
    if (error) { toast.error('Erreur de sauvegarde'); return }
    toast.success('Adresse ajoutée ✅')
    resetForm()
    setAddMode(false)
    onRefresh()
  }

  const handleDelete = async (id) => {
    await supabase.from('user_addresses').delete().eq('id', id)
    toast.success('Adresse supprimée')
    onRefresh()
  }

  const handleSetDefault = async (id) => {
    await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userId)
    await supabase.from('user_addresses').update({ is_default: true }).eq('id', id)
    onRefresh()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Carnet d'adresses">
      <div className="px-5 pt-2 pb-6 space-y-3">
        {!addMode ? (
          <>
            <button onClick={() => setAddMode(true)}
              className="w-full flex items-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-primary-200 text-primary-600 font-bold text-sm active:scale-95 transition-transform">
              <Plus size={16}/> Ajouter une adresse
            </button>

            {addresses.length === 0 && (
              <div className="text-center py-8">
                <span className="text-4xl">📍</span>
                <p className="text-sm font-semibold text-dark-600/60 mt-2">Aucune adresse enregistrée</p>
                <p className="text-xs text-dark-600/40 mt-1">Ajoutez vos adresses de livraison habituelles</p>
              </div>
            )}

            {addresses.map(addr => (
              <div key={addr.id} className={clsx(
                'p-4 rounded-2xl border transition-all',
                addr.is_default ? 'border-primary-300 bg-primary-50/50' : 'border-surface-200 bg-white'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-dark-800 truncate">{addr.label}</p>
                      {addr.is_default && (
                        <span className="text-[9px] font-black text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Par défaut
                        </span>
                      )}
                    </div>
                    {addr.address_line && <p className="text-xs text-dark-600/60 mt-0.5">{addr.address_line}</p>}
                    <p className="text-xs text-dark-600/50 mt-0.5">
                      {[addr.neighbourhood, addr.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!addr.is_default && (
                      <button onClick={() => handleSetDefault(addr.id)}
                        className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center active:scale-95">
                        <Check size={12} className="text-primary-600"/>
                      </button>
                    )}
                    <button onClick={() => handleDelete(addr.id)}
                      className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center active:scale-95">
                      <Trash2 size={12} className="text-red-500"/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { setAddMode(false); resetForm() }}
                className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center active:scale-95">
                <ChevronDown size={16} className="text-dark-600"/>
              </button>
              <p className="font-bold text-dark-800 text-sm">Nouvelle adresse</p>
            </div>

            <input placeholder="Libellé (ex: Domicile, Bureau...)" value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              className="input-field text-sm w-full"/>

            <input placeholder="Adresse exacte (rue, numéro...)" value={form.address_line}
              onChange={e => setForm(p => ({ ...p, address_line: e.target.value }))}
              className="input-field text-sm w-full"/>

            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Ville" value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="input-field text-sm"/>
              <input placeholder="Quartier" value={form.neighbourhood}
                onChange={e => setForm(p => ({ ...p, neighbourhood: e.target.value }))}
                className="input-field text-sm"/>
            </div>

            <button onClick={handleLocate} disabled={locating}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50',
                form.latitude ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-primary-50 text-primary-700 border border-primary-200'
              )}>
              {locating ? <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>
                : form.latitude ? <CheckCircle2 size={15} className="text-emerald-600"/> : <Navigation size={15}/>}
              <span>{locating ? 'Localisation...' : form.latitude ? '📍 Position enregistrée' : 'Détecter ma position GPS'}</span>
            </button>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-50 cursor-pointer">
              <input type="checkbox" checked={form.is_default}
                onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))}
                className="w-4 h-4 accent-primary-600"/>
              <span className="text-sm font-semibold text-dark-700">Définir comme adresse par défaut</span>
            </label>

            <Button variant="primary" className="w-full" loading={loading} onClick={handleSave}>
              Enregistrer l'adresse
            </Button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

// ─── LoyaltySheet ─────────────────────────────────────────────────────────────

function LoyaltySheet({ open, onClose, memberLevel, totalOrders }) {
  const levels = [
    { label: 'Bronze',  icon: '🥉', min: 0,  max: 19,  color: 'bg-orange-500',  desc: 'Bienvenue sur MANG !' },
    { label: 'Silver',  icon: '🥈', min: 20, max: 49,  color: 'bg-slate-400',   desc: '20 commandes passées' },
    { label: 'Gold',    icon: '🥇', min: 50, max: 9999, color: 'bg-amber-400',   desc: '50 commandes passées' },
  ]
  const currentIdx = memberLevel.label.includes('Gold') ? 2 : memberLevel.label.includes('Silver') ? 1 : 0
  const nextLevel = levels[currentIdx + 1]
  const progressToNext = nextLevel ? Math.min(100, Math.round((totalOrders / nextLevel.min) * 100)) : 100

  return (
    <BottomSheet open={open} onClose={onClose} title="Programme de fidélité">
      <div className="px-5 pt-2 pb-8 space-y-4">
        {/* Badge actuel */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-dark-900 to-dark-800 text-center">
          <span className="text-5xl">{memberLevel.icon}</span>
          <p className="text-white font-black text-lg mt-2">{memberLevel.label}</p>
          <p className="text-white/50 text-xs mt-1">{totalOrders} commandes réalisées</p>
        </div>

        {/* Progression */}
        {nextLevel && (
          <div className="p-4 rounded-2xl bg-surface-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-dark-700">Prochain niveau : {nextLevel.icon} {nextLevel.label}</p>
              <p className="text-xs font-bold text-primary-600">{totalOrders}/{nextLevel.min}</p>
            </div>
            <div className="w-full h-2.5 bg-surface-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${progressToNext}%` }}/>
            </div>
            <p className="text-[10px] text-dark-600/50 mt-1.5">
              Plus que {nextLevel.min - totalOrders} commandes pour atteindre le niveau {nextLevel.label}
            </p>
          </div>
        )}

        {/* Liste des niveaux */}
        <div className="space-y-2">
          <p className="text-[11px] font-black text-dark-400 uppercase tracking-wider">Tous les niveaux</p>
          {levels.map((lv, i) => (
            <div key={lv.label} className={clsx(
              'flex items-center gap-3 p-3.5 rounded-2xl border transition-all',
              i === currentIdx ? 'border-primary-300 bg-primary-50/50' : 'border-surface-200 bg-white'
            )}>
              <span className="text-2xl">{lv.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-dark-800">{lv.label}</p>
                <p className="text-xs text-dark-600/50">{lv.desc}</p>
              </div>
              {i === currentIdx && <span className="text-[9px] font-black text-primary-600 bg-primary-100 px-2 py-1 rounded-full">Actuel</span>}
              {i < currentIdx && <Check size={14} className="text-emerald-500"/>}
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── EditProfileSheet ─────────────────────────────────────────────────────────

function EditProfileSheet({ open, onClose, profile, onUpdated }) {
  const [form,     setForm]     = useState({ full_name: '', username: '', phone: '', city: '', neighbourhood: '' })
  const [usernameStatus, setUsernameStatus] = useState(null)
  const usernameDebounce = useRef(null)
  const [loading,  setLoading]  = useState(false)
  const [locating, setLocating] = useState(false)
  const [locInfo,  setLocInfo]  = useState(null)

  useEffect(() => {
    if (profile && open) {
      setForm({
        full_name:     profile.full_name     || '',
        username:      profile.username      || '',
        phone:         profile.phone         || '',
        city:          profile.city          || '',
        neighbourhood: profile.neighbourhood || '',
      })
      setLocInfo(null)
      setUsernameStatus(null)
    }
  }, [profile, open])

  const checkUsername = (value) => {
    clearTimeout(usernameDebounce.current)
    if (!value || value === profile.username) { setUsernameStatus(null); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    usernameDebounce.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', value.toLowerCase()).neq('id', profile.id).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
  }

  const handleLocate = () => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return }
    setLocating(true)
    toast('📍 Détection en cours...', { duration: 3000 })
    let watchId = null, done = false
    const finish = async (latitude, longitude, accuracy) => {
      if (done) return
      done = true
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      try {
        const geo = await reverseGeocode(latitude, longitude)
        setForm(p => ({ ...p, city: geo.city, neighbourhood: geo.neighbourhood }))
        setLocInfo({ label: geo.label, accuracy: Math.round(accuracy), country: geo.country })
        await supabase.from('profiles').update({ latitude, longitude }).eq('id', profile.id)
        toast.success(`📍 ${geo.label || 'Position détectée'} (±${Math.round(accuracy)}m)`)
      } catch { toast.error('Impossible de récupérer la ville') }
      setLocating(false)
    }
    const globalTimeout = setTimeout(() => {
      if (!done) { done = true; if (watchId !== null) navigator.geolocation.clearWatch(watchId); setLocating(false); toast.error('Position introuvable') }
    }, 25000)
    watchId = navigator.geolocation.watchPosition(
      ({ coords: { latitude, longitude, accuracy } }) => {
        if (accuracy < 100 || (accuracy < 500 && !done)) { clearTimeout(globalTimeout); finish(latitude, longitude, accuracy) }
      },
      (err) => {
        clearTimeout(globalTimeout)
        const msg = err.code === 1 ? 'Permission GPS refusée' : err.code === 2 ? 'GPS indisponible' : 'Délai dépassé'
        toast.error(msg); setLocating(false); done = true
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
    )
  }

  const handleSave = async () => {
    if (form.phone) {
      const phoneClean = form.phone.replace(/\s/g, '')
      if (!/^(\+229)?[0-9]{8}$/.test(phoneClean)) { toast.error('Numéro invalide (ex: +229 61 00 00 00)'); return }
    }
    setLoading(true)
    if (usernameStatus === 'taken')    { toast.error("Ce nom d'utilisateur est déjà pris"); setLoading(false); return }
    if (usernameStatus === 'invalid')  { toast.error('Username invalide (3-20 car.)'); setLoading(false); return }
    if (usernameStatus === 'checking') { toast.error('Vérification en cours...'); setLoading(false); return }
    const { error } = await supabase.from('profiles').update({
      full_name:     form.full_name.trim()            || null,
      username:      form.username.trim().toLowerCase() || null,
      phone:         form.phone.trim()                || null,
      city:          form.city.trim()                 || null,
      neighbourhood: form.neighbourhood.trim()        || null,
    }).eq('id', profile.id)
    setLoading(false)
    if (error) { toast.error('Erreur: ' + (error.message || 'inconnue')); return }
    await onUpdated()
    onClose()
    toast.success('Profil mis à jour ✅')
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Modifier le profil">
      <div className="px-5 pt-4 pb-6 space-y-4">
        <InputField label="Nom complet" icon={User} placeholder="Votre nom complet"
          value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))}/>

        <div>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={form.username}
              onChange={e => { setForm(p => ({...p, username: e.target.value})); checkUsername(e.target.value) }}
              className={clsx('input-field pl-9 pr-9 text-sm w-full',
                usernameStatus === 'available' ? 'border-emerald-400' :
                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400' : ''
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking'  && <div className="w-3.5 h-3.5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>}
              {usernameStatus === 'available' && <CheckCircle2 size={14} className="text-emerald-500"/>}
              {usernameStatus === 'taken'     && <XCircle size={14} className="text-red-500"/>}
              {usernameStatus === 'invalid'   && <AlertCircle size={14} className="text-orange-400"/>}
            </div>
          </div>
          {usernameStatus === 'available' && <p className="text-xs text-emerald-500 mt-1 pl-1 font-medium">Disponible ✓</p>}
          {usernameStatus === 'taken'     && <p className="text-xs text-red-500 mt-1 pl-1 font-medium">Déjà pris</p>}
          {usernameStatus === 'invalid'   && <p className="text-xs text-orange-400 mt-1 pl-1 font-medium">3-20 caractères, lettres/chiffres/_</p>}
        </div>

        <InputField label="Téléphone" icon={Phone} placeholder="+229 XX XX XX XX" type="tel"
          value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))}/>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-dark-700 pl-1">Localisation</label>
          <button onClick={handleLocate} disabled={locating}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50',
              locInfo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-primary-50 text-primary-700 border border-primary-200'
            )}>
            {locating ? <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>
              : locInfo ? <CheckCircle2 size={16} className="text-emerald-600"/> : <Navigation size={16}/>}
            <span>{locating ? 'Localisation en cours...' : locInfo ? `📍 ${locInfo.label}` : 'Détecter ma position précise'}</span>
          </button>
          {locInfo && <p className="text-xs text-dark-600/50 pl-1 flex items-center gap-1"><AlertCircle size={11}/> Précision : ±{locInfo.accuracy} m · {locInfo.country}</p>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
              <input type="text" placeholder="Ville" value={form.city}
                onChange={e => setForm(p => ({...p, city: e.target.value}))}
                className="input-field pl-9 text-sm"/>
            </div>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
              <input type="text" placeholder="Quartier" value={form.neighbourhood}
                onChange={e => setForm(p => ({...p, neighbourhood: e.target.value}))}
                className="input-field pl-9 text-sm"/>
            </div>
          </div>
        </div>

        <Button variant="primary" className="w-full" loading={loading} onClick={handleSave}>
          Sauvegarder
        </Button>
      </div>
    </BottomSheet>
  )
}

// ─── SettingsSheet ────────────────────────────────────────────────────────────

function SettingsSheet({ open, onClose, onSignOut, onSecurity, onPrivacy, onNotif, onLanguage, onHelp }) {
  const items = [
    { icon: '🔒', label: 'Changer le mot de passe',      action: onSecurity },
    { icon: '📍', label: 'Confidentialité localisation', action: onPrivacy  },
    { icon: '🔔', label: 'Préférences notifications',    action: onNotif    },
    { icon: '🌍', label: "Langue de l'application",      action: onLanguage },
    { icon: '❓', label: "Centre d'aide",                action: onHelp     },
  ]
  return (
    <BottomSheet open={open} onClose={onClose} title="Paramètres">
      <div className="px-5 pt-2 pb-6 space-y-2">
        {items.map((item, i) => (
          <button key={i} onClick={() => { onClose(); item.action() }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface-50 active:bg-surface-100 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <span className="flex-1 text-left text-sm font-semibold text-dark-800">{item.label}</span>
            <ChevronRight size={16} className="text-dark-600/30"/>
          </button>
        ))}
        <button onClick={() => { onClose(); onSignOut() }}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 active:bg-red-100 transition-colors mt-2">
          <span className="text-xl">🚪</span>
          <span className="flex-1 text-left text-sm font-bold text-red-600">Se déconnecter</span>
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── SecuritySheet ────────────────────────────────────────────────────────────

function SecuritySheet({ open, onClose }) {
  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' })
  const [show,    setShow]    = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [isOAuth, setIsOAuth] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ current: '', next: '', confirm: '' })
      setErrors({})
      supabase.auth.getUser().then(({ data: { user } }) => {
        const providers = user?.app_metadata?.providers || []
        setIsOAuth(providers.includes('google') && !providers.includes('email'))
      })
    }
  }, [open])

  const validate = () => {
    const e = {}
    if (!form.current)              e.current = 'Requis'
    if (!form.next)                 e.next    = 'Requis'
    else if (form.next.length < 6)  e.next    = '6 caractères minimum'
    if (form.next !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: form.current })
    if (signInErr) { setLoading(false); setErrors({ current: 'Mot de passe actuel incorrect' }); return }
    const { error } = await supabase.auth.updateUser({ password: form.next })
    setLoading(false)
    if (error) { toast.error('Erreur lors de la mise à jour'); return }
    toast.success('Mot de passe mis à jour ✅')
    onClose()
  }

  const toggleShow = (k) => setShow(p => ({ ...p, [k]: !p[k] }))
  const fieldProps = (k, label, placeholder) => ({
    label, placeholder,
    type: show[k] ? 'text' : 'password',
    value: form[k],
    onChange: e => { setForm(p => ({...p, [k]: e.target.value})); setErrors(p => ({...p, [k]: ''})) },
    error: errors[k],
    suffix: (
      <button type="button" onClick={() => toggleShow(k)} className="text-dark-600/40 hover:text-dark-600 transition-colors">
        {show[k] ? <EyeOff size={15}/> : <Eye size={15}/>}
      </button>
    ),
  })

  return (
    <BottomSheet open={open} onClose={onClose} title="Changer le mot de passe">
      <div className="px-5 pt-4 pb-6 space-y-4">
        {isOAuth ? (
          <div className="p-4 bg-blue-50 rounded-2xl text-sm text-blue-700 leading-relaxed">
            <p className="font-semibold mb-1">🔑 Compte Google</p>
            <p className="text-xs text-blue-600/80">Votre compte est connecté via Google. La gestion du mot de passe se fait depuis votre compte Google.</p>
          </div>
        ) : (
          <>
            <PasswordInput {...fieldProps('current', 'Mot de passe actuel', '••••••••')}/>
            <PasswordInput {...fieldProps('next',    'Nouveau mot de passe', '6 caractères minimum')}/>
            <PasswordInput {...fieldProps('confirm', 'Confirmer',            'Répéter le nouveau mot de passe')}/>
            <Button variant="primary" className="w-full" loading={loading} onClick={handleSave}>Mettre à jour</Button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

function PasswordInput({ label, placeholder, type, value, onChange, error, suffix }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-dark-700 pl-1">{label}</label>
      <div className="relative">
        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange}
          className={clsx('input-field pl-10 pr-10', error && 'border-red-400 focus:ring-red-300')}/>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</div>
      </div>
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
    </div>
  )
}

// ─── NotificationsSheet ───────────────────────────────────────────────────────

const NOTIF_KEYS = [
  { key: 'notif_orders',     label: 'Commandes',   desc: 'Confirmation et suivi de commandes' },
  { key: 'notif_promotions', label: 'Promotions',   desc: 'Offres spéciales et réductions' },
  { key: 'notif_messages',   label: 'Messages',     desc: 'Nouveaux messages reçus' },
  { key: 'notif_wallet',     label: 'Portefeuille', desc: 'Transactions et mouvements FCFA' },
  { key: 'notif_community',  label: 'Communauté',   desc: 'Actualités et activités' },
]

function NotificationsSheet({ open, onClose, profile, onUpdated }) {
  const [prefs,   setPrefs]   = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && profile) {
      const init = {}
      NOTIF_KEYS.forEach(({ key }) => { init[key] = profile[key] !== false })
      setPrefs(init)
    }
  }, [open, profile])

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles').update(prefs).eq('id', profile.id)
    setLoading(false)
    if (error) { toast.error('Erreur de sauvegarde'); return }
    await onUpdated()
    toast.success('Préférences mises à jour ✅')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Notifications">
      <div className="px-5 pt-2 pb-6 space-y-3">
        {NOTIF_KEYS.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-dark-800">{label}</p>
              <p className="text-xs text-dark-600/50 mt-0.5">{desc}</p>
            </div>
            <button onClick={() => toggle(key)}
              className={clsx('w-12 h-6 rounded-full transition-all duration-200 flex items-center relative flex-shrink-0', prefs[key] ? 'bg-primary-500' : 'bg-surface-300')}>
              <div className={clsx('w-5 h-5 bg-white rounded-full shadow absolute transition-all duration-200', prefs[key] ? 'left-[26px]' : 'left-0.5')}/>
            </button>
          </div>
        ))}
        <Button variant="primary" className="w-full mt-4" loading={loading} onClick={handleSave}>Sauvegarder</Button>
      </div>
    </BottomSheet>
  )
}

// ─── PrivacySheet ─────────────────────────────────────────────────────────────

function PrivacySheet({ open, onClose, profile, onUpdated }) {
  const [shareLocation, setShareLocation] = useState(true)
  const [loading,       setLoading]       = useState(false)

  useEffect(() => {
    if (open && profile) setShareLocation(profile.share_location !== false)
  }, [open, profile])

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles').update({ share_location: shareLocation }).eq('id', profile.id)
    setLoading(false)
    if (error) { toast.error('Erreur de sauvegarde'); return }
    await onUpdated()
    toast.success('Confidentialité mise à jour ✅')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Confidentialité localisation">
      <div className="px-5 pt-4 pb-6 space-y-4">
        <div className="p-4 bg-blue-50 rounded-2xl text-sm text-blue-700 leading-relaxed">
          <p className="font-semibold mb-1">🔒 Vos données GPS</p>
          <p className="text-xs text-blue-600/80">Votre position exacte n'est jamais partagée. Seule votre ville et votre quartier peuvent apparaître sur votre profil public selon vos préférences.</p>
        </div>
        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl">
          <div className="flex-1 pr-4">
            <p className="text-sm font-semibold text-dark-800">Afficher ma localisation</p>
            <p className="text-xs text-dark-600/50 mt-0.5">Votre ville et quartier visibles sur votre profil public</p>
          </div>
          <button onClick={() => setShareLocation(!shareLocation)}
            className={clsx('w-12 h-6 rounded-full transition-all duration-200 flex items-center relative flex-shrink-0', shareLocation ? 'bg-primary-500' : 'bg-surface-300')}>
            <div className={clsx('w-5 h-5 bg-white rounded-full shadow absolute transition-all duration-200', shareLocation ? 'left-[26px]' : 'left-0.5')}/>
          </button>
        </div>
        <Button variant="primary" className="w-full" loading={loading} onClick={handleSave}>Sauvegarder</Button>
      </div>
    </BottomSheet>
  )
}

// ─── LanguageSheet ────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'fr',  label: 'Français', flag: '🇫🇷' },
  { code: 'fon', label: 'Fon',      flag: '🇧🇯' },
  { code: 'yo',  label: 'Yoruba',   flag: '🌍'  },
  { code: 'en',  label: 'English',  flag: '🇬🇧' },
]

function LanguageSheet({ open, onClose, profile, onUpdated }) {
  const [selected, setSelected] = useState('fr')

  useEffect(() => {
    if (open && profile) setSelected(profile.language || 'fr')
  }, [open, profile])

  const handleSelect = async (code) => {
    setSelected(code)
    await supabase.from('profiles').update({ language: code }).eq('id', profile.id)
    await onUpdated()
    toast.success(`Langue mise à jour : ${LANGUAGES.find(l => l.code === code)?.label}`)
    setTimeout(onClose, 400)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Langue de l'application">
      <div className="px-5 pt-2 pb-6 space-y-2">
        {LANGUAGES.map(({ code, label, flag }) => (
          <button key={code} onClick={() => handleSelect(code)}
            className={clsx('w-full flex items-center gap-3 p-4 rounded-2xl transition-colors',
              selected === code ? 'bg-primary-50 border border-primary-200' : 'bg-surface-50 active:bg-surface-100')}>
            <span className="text-2xl">{flag}</span>
            <span className={clsx('flex-1 text-left text-sm font-semibold', selected === code ? 'text-primary-700' : 'text-dark-800')}>{label}</span>
            {selected === code && <Check size={16} className="text-primary-600"/>}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

// ─── HelpSheet ────────────────────────────────────────────────────────────────

const FAQ = [
  { q: 'Comment créer une boutique sur MANG ?', a: "Rendez-vous dans l'onglet Vendeur, puis appuyez sur « Créer ma boutique ». Remplissez les informations requises et soumettez. L'activation prend moins de 24h." },
  { q: 'Comment recharger mon portefeuille MANG ?', a: "Allez dans l'onglet Wallet, puis « Recharger ». Utilisez Mobile Money (MTN, Moov), virement bancaire ou dépôt en agence." },
  { q: 'Mon paiement est en attente, que faire ?', a: "Les paiements peuvent prendre jusqu'à 24h. Si le statut reste « En attente » après 24h, contactez notre support." },
  { q: 'Comment signaler un vendeur ou un produit ?', a: "Sur la page du produit, appuyez sur les 3 points (⋯) puis « Signaler ». Notre équipe examine chaque signalement sous 48h." },
  { q: 'Comment modifier mon numéro de téléphone ?', a: "Allez dans Modifier le profil depuis la page Profil. Mettez à jour votre numéro et sauvegardez." },
]

function HelpSheet({ open, onClose }) {
  const [openIdx, setOpenIdx] = useState(null)
  const toggle = (i) => setOpenIdx(prev => prev === i ? null : i)

  return (
    <BottomSheet open={open} onClose={onClose} title="Aide & Support">
      <div className="px-5 pt-2 pb-6 space-y-3">
        <div className="flex gap-2">
          <a href="tel:+2290197293196"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary-50 text-primary-700 font-semibold text-sm active:scale-95 transition-transform">
            <Phone size={15}/> Appeler
          </a>
          <a href="https://wa.me/2290197293196" target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold text-sm active:scale-95 transition-transform">
            <span className="text-base">💬</span> WhatsApp
          </a>
        </div>
        <p className="text-xs font-semibold text-dark-600/50 uppercase tracking-wider px-1 pt-2">Questions fréquentes</p>
        {FAQ.map((item, i) => (
          <div key={i} className="bg-surface-50 rounded-2xl overflow-hidden">
            <button onClick={() => toggle(i)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <span className="flex-1 text-sm font-semibold text-dark-800 leading-snug">{item.q}</span>
              {openIdx === i ? <ChevronUp size={16} className="text-primary-500 flex-shrink-0"/> : <ChevronDown size={16} className="text-dark-600/30 flex-shrink-0"/>}
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-dark-600 leading-relaxed border-t border-surface-200 pt-3">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}

// ─── ProfileSkeleton ──────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50">
      <div className="bg-primary-800 pb-24 pt-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full skeleton"/>
          <div className="w-40 h-6 skeleton rounded-xl"/>
          <div className="w-24 h-4 skeleton rounded-lg"/>
          <div className="w-32 h-5 skeleton rounded-full"/>
        </div>
      </div>
      <div className="relative -mt-14 px-4 space-y-4">
        <div className="h-40 skeleton rounded-3xl"/>
        <div className="h-28 skeleton rounded-3xl"/>
        <div className="h-20 skeleton rounded-3xl"/>
        <div className="h-48 skeleton rounded-3xl"/>
        <div className="h-32 skeleton rounded-3xl"/>
      </div>
    </div>
  )
}
