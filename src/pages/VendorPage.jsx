import { useState, useEffect, useRef } from 'react'
import {
  Store, Plus, Package, Star, Trash2, Eye, Edit3,
  MapPin, Truck, Phone, ChevronDown, X, Check,
  TrendingUp, Users, Heart, Coins, Crown, Zap,
  BarChart3, Clock, Camera, Search, ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, Button, BottomSheet, Modal, PremiumBadge, Skeleton } from '@/components/ui'

// ============================================================
// CONSTANTES
// ============================================================
const CATEGORIES = [
  { name: 'Production végétale',           icon: '🌱', items: ['Céréales & grains','Légumes','Fruits','Racines & tubercules','Plantes industrielles','Plantes aromatiques & médicinales'] },
  { name: 'Production animale',            icon: '🐄', items: ['Bovins','Ovins & caprins','Porcins','Aviculture','Apiculture','Pisciculture & aquaculture'] },
  { name: 'Transformation agricole',       icon: '🍯', items: ['Produits céréaliers transformés','Produits fruitiers transformés','Produits tubercules transformés','Produits animaux transformés'] },
  { name: 'Machines & équipements',        icon: '🚜', items: ['Machines lourdes','Équipements motorisés','Outils agricoles','Irrigation & énergie','Pièces & maintenance'] },
  { name: 'Intrants agricoles',            icon: '🌿', items: ['Semences & plants','Engrais organiques','Engrais chimiques','Amendements du sol','Produits phytosanitaires'] },
  { name: 'Espaces verts',                 icon: '🌳', items: ['Plantes ornementales','Arbres & arbustes','Gazon & pelouses','Fleurs & pépinières','Aménagement paysager','Entretien des espaces verts','Matériel de jardinage'] },
  { name: 'Services agricoles',            icon: '🛠️', items: ['Labour & préparation du sol','Récolte & battage','Transport & logistique','Stockage & conservation','Formation & conseil','Commercialisation & export'] },
]

const AVAILABILITY_OPTIONS = [
  { value: 'now',  label: '✅ Disponible maintenant' },
  { value: '1w',   label: '⏳ Dans 1 semaine' },
  { value: '2w',   label: '⏳ Dans 2 semaines' },
  { value: '1m',   label: '📅 Dans 1 mois' },
  { value: '2m',   label: '📅 Dans 2 mois' },
  { value: '3m',   label: '📅 Dans 3 mois' },
  { value: '6m',   label: '📅 Dans 6 mois' },
  { value: '1y',   label: '📆 Dans 1 an' },
]

const PRODUCT_LIMITS = { 0: 10, 1: 20, 2: 30, 3: Infinity }

const PREMIUM_PLANS = [
  {
    level: 1, name: 'Bronze', emoji: '🥉', price: 1000, stars: '⭐',
    color: 'from-amber-700 to-amber-800',
    perks: ['Jusqu\'à 20 produits', 'Boutique affichée plus haut', 'Badge Bronze visible'],
  },
  {
    level: 2, name: 'Argent', emoji: '🥈', price: 2000, stars: '⭐⭐',
    color: 'from-slate-500 to-slate-600',
    perks: ['Jusqu\'à 30 produits', 'Priorité dans les résultats', 'Badge Argent animé', 'Stats avancées'],
  },
  {
    level: 3, name: 'Or', emoji: '🥇', price: 3000, stars: '⭐⭐⭐',
    color: 'from-gold-500 to-gold-600',
    perks: ['Produits illimités', 'Toujours en tête de liste', 'Badge Or brillant', 'Support prioritaire', 'Analyse des ventes'],
    popular: true,
  },
]

const COINS_PACKS = [
  { coins: 5,  price: 100,  color: 'bg-emerald-500' },
  { coins: 10, price: 200,  color: 'bg-blue-500' },
  { coins: 20, price: 350,  color: 'bg-orange-500' },
  { coins: 50, price: 950,  color: 'bg-violet-500' },
]

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function VendorPage() {
  const { user, profile, wallet, pieces, refreshWallet } = useAuthStore()

  // Fonction pour recharger les pièces depuis Supabase directement
  const refreshPieces = async () => {
    if (!user) return
    try {
      const { data } = await supabase.from('pieces').select('balance').eq('user_id', user.id).single()
      if (data) {
        // Forcer le rechargement du store via refreshWallet qui charge aussi les pièces
        if (refreshWallet) await refreshWallet()
      }
    } catch {}
  }
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeShop, setActiveShop] = useState(null)

  // Modals
  const [createShopOpen, setCreateShopOpen]     = useState(false)
  const [addProductOpen, setAddProductOpen]     = useState(false)
  const [premiumOpen, setPremiumOpen]           = useState(false)
  const [coinsOpen, setCoinsOpen]               = useState(false)
  const [deleteShopModal, setDeleteShopModal]   = useState(null)
  const [deleteProductModal, setDeleteProductModal] = useState(null)
  const [editShopOpen, setEditShopOpen]         = useState(null)
  const [shopDetailOpen, setShopDetailOpen]     = useState(null)

  const [premiumStatus, setPremiumStatus] = useState(null)
  const [verifyOpen, setVerifyOpen] = useState(null) // shop
  const [verifyRequests, setVerifyRequests] = useState({}) // shopId -> request

  useEffect(() => { if (user) { loadShops(); checkPremium(); loadVerifyRequests() } }, [user])

  const loadVerifyRequests = async () => {
    const { data } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(r => { map[r.shop_id] = r })
      setVerifyRequests(map)
    }
  }

  const checkPremium = async () => {
    const { data } = await supabase
      .from('premium_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single()
    setPremiumStatus(data)
  }

  const loadShops = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('shops')
      .select('*, products(count)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    setShops(data || [])
    setLoading(false)
  }

  const handleDeleteShop = async (shop) => {
    try {
      // Supprimer images produits
      const { data: prods } = await supabase.from('products').select('image_url').eq('shop_id', shop.id)
      if (prods?.length) {
        const files = prods.filter(p => p.image_url).map(p => p.image_url.split('/').pop())
        if (files.length) await supabase.storage.from(BUCKETS.PRODUCTS).remove(files)
      }
      // Supprimer image boutique
      if (shop.cover_url) {
        await supabase.storage.from(BUCKETS.COVERS).remove([shop.cover_url.split('/').pop()])
      }
      await supabase.from('shops').delete().eq('id', shop.id)
      toast.success('Boutique supprimée')
      setDeleteShopModal(null)
      if (shopDetailOpen?.id === shop.id) setShopDetailOpen(null)
      loadShops()
    } catch { toast.error('Erreur lors de la suppression') }
  }

  // Stats globales
  const totalFollowers = shops.reduce((s, sh) => s + (sh.followers_count || 0), 0)
  const totalLikes     = shops.reduce((s, sh) => s + (sh.likes_count || 0), 0)
  const totalProducts  = shops.reduce((s, sh) => s + (sh.products?.[0]?.count || 0), 0)
  const daysLeft = premiumStatus
    ? Math.ceil((new Date(premiumStatus.expires_at) - new Date()) / 86400000)
    : null

  return (
    <div className="min-h-screen bg-surface-50">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)',backgroundSize:'20px 20px'}}/>
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-gold-400/10 blur-2xl"/>

        <div className="relative px-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-display text-2xl text-white font-bold">Espace Vendeur</h1>
              <p className="text-primary-300 text-sm mt-0.5">Gérez vos boutiques & produits</p>
            </div>
            {/* Pièces */}
            <button onClick={() => setCoinsOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gold-500/20 border border-gold-400/30 active:scale-95 transition-transform">
              <span className="text-xl">🪙</span>
              <div className="text-left">
                <p className="text-gold-300 text-[10px] font-medium">Pièces</p>
                <p className="text-white font-bold text-sm">{pieces?.balance || 0}</p>
              </div>
            </button>
          </div>

          {/* Badge premium actif */}
          {premiumStatus && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gold-500/20 border border-gold-400/30 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold-500/30 flex items-center justify-center">
                <Crown size={20} className="text-gold-300"/>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Premium actif ✨</p>
                <p className="text-gold-300 text-xs">{daysLeft} jour(s) restant(s)</p>
              </div>
              <button onClick={() => setPremiumOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gold-500 text-white text-xs font-bold active:scale-95">
                Renouveler
              </button>
            </div>
          )}

          {/* Stats globales */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Store,   label: 'Boutiques', value: shops.length },
              { icon: Package, label: 'Produits',  value: totalProducts },
              { icon: Users,   label: 'Abonnés',   value: totalFollowers },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-3 text-center">
                <s.icon size={16} className="text-primary-300 mx-auto mb-1"/>
                <p className="font-display font-bold text-white text-lg leading-none">{s.value}</p>
                <p className="text-primary-300 text-[10px] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="relative -mt-14 px-4 pb-28 space-y-4">

        {/* BOUTONS ACTIONS */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCreateShopOpen(true)}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-3xl shadow-card active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-green">
              <Store size={22} className="text-white"/>
            </div>
            <div className="text-center">
              <p className="font-bold text-dark-800 text-sm">Créer boutique</p>
              <p className="text-dark-600/50 text-xs">Coût : 10 🪙</p>
            </div>
          </button>

          <button onClick={() => setPremiumOpen(true)}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-gold-500/10 to-gold-600/5 rounded-3xl shadow-card border border-gold-400/20 active:scale-95 transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-gold-500 flex items-center justify-center shadow-gold animate-badge-glow">
              <Crown size={22} className="text-white"/>
            </div>
            <div className="text-center">
              <p className="font-bold text-dark-800 text-sm">Devenir Premium</p>
              <p className="text-gold-600 text-xs font-semibold">Boostez vos ventes</p>
            </div>
          </button>
        </div>

        {/* VERIFICATION BANNER — si au moins une boutique non vérifiée */}
        {shops.length > 0 && shops.some(s => !s.is_verified) && (
          <div className="bg-blue-50 rounded-3xl p-4 border border-blue-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-blue-800 text-sm">Obtenez le badge Vérifié ✅</p>
              <p className="text-blue-600 text-xs">Gagnez la confiance des acheteurs</p>
            </div>
            <button onClick={() => setVerifyOpen('select')}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold active:scale-95">
              Demander
            </button>
          </div>
        )}

        {/* MES BOUTIQUES */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-dark-800">Mes boutiques</h2>
            <span className="text-xs text-dark-600/50 font-medium bg-surface-100 px-2.5 py-1 rounded-xl">
              {shops.length} boutique{shops.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <ShopCardSkeleton key={i}/>)}
            </div>
          ) : shops.length === 0 ? (
            <EmptyShops onCreate={() => setCreateShopOpen(true)}/>
          ) : (
            <div className="space-y-3">
              {shops.map(shop => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  premiumStatus={premiumStatus}
                  verifyRequest={verifyRequests[shop.id]}
                  onOpen={() => setShopDetailOpen(shop)}
                  onEdit={() => setEditShopOpen(shop)}
                  onDelete={() => setDeleteShopModal(shop)}
                  onAddProduct={() => { setActiveShop(shop); setAddProductOpen(true) }}
                  onVerify={() => setVerifyOpen(shop)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}

      {/* Créer boutique */}
      <CreateShopSheet
        open={createShopOpen}
        onClose={() => setCreateShopOpen(false)}
        user={user}
        pieces={pieces}
        refreshWallet={refreshPieces}
        onCreated={() => { loadShops(); setCreateShopOpen(false) }}
      />

      {/* Ajouter produit */}
      <AddProductSheet
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        shop={activeShop}
        user={user}
        pieces={pieces}
        refreshWallet={refreshPieces}
        onAdded={() => loadShops()}
      />

      {/* Détail boutique + produits */}
      <ShopDetailSheet
        open={!!shopDetailOpen}
        onClose={() => setShopDetailOpen(null)}
        shop={shopDetailOpen}
        user={user}
        pieces={pieces}
        onDeleteProduct={setDeleteProductModal}
        onAddProduct={() => { setActiveShop(shopDetailOpen); setAddProductOpen(true) }}
        onRefresh={loadShops}
      />

      {/* Premium */}
      <PremiumSheet
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        wallet={wallet}
        user={user}
        currentPremium={premiumStatus}
        shops={shops}
        onPurchased={() => { checkPremium(); refreshWallet(); setPremiumOpen(false) }}
      />

      {/* Vérification boutique */}
      <VerificationSheet
        open={!!verifyOpen}
        onClose={() => setVerifyOpen(null)}
        shop={verifyOpen !== 'select' ? verifyOpen : null}
        shops={shops}
        user={user}
        profile={profile}
        verifyRequests={verifyRequests}
        existingRequest={verifyOpen && verifyOpen !== 'select' ? verifyRequests[verifyOpen.id] : null}
        onSubmitted={() => { setVerifyOpen(null); loadVerifyRequests() }}
        onSelectShop={(shop) => setVerifyOpen(shop)}
        showSelector={verifyOpen === 'select'}
      />

      {/* Acheter pièces */}
      <CoinsSheet
        open={coinsOpen}
        onClose={() => setCoinsOpen(false)}
        wallet={wallet}
        user={user}
        pieces={pieces}
        onPurchased={refreshWallet}
      />

      {/* Confirm delete shop */}
      <Modal open={!!deleteShopModal} onClose={() => setDeleteShopModal(null)} title="⚠️ Supprimer la boutique">
        <div className="p-5 space-y-4">
          <p className="text-dark-600 text-sm">
            Supprimer <span className="font-bold text-dark-800">"{deleteShopModal?.name}"</span> ? Cette action est irréversible. Tous les produits seront supprimés.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteShopModal(null)}>Annuler</Button>
            <Button variant="danger" className="flex-1" onClick={() => handleDeleteShop(deleteShopModal)}>Supprimer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================
// SHOP CARD
// ============================================================
function ShopCard({ shop, premiumStatus, verifyRequest, onOpen, onEdit, onDelete, onAddProduct, onVerify }) {
  const prodCount = shop.products?.[0]?.count || 0
  const premiumLevel = shop.premium_level || 0
  const limit = PRODUCT_LIMITS[premiumLevel]
  const limitPercent = Math.min(100, (prodCount / (limit === Infinity ? 99 : limit)) * 100)

  const premiumBorder = { 3:'border-gold-400/50', 2:'border-slate-400/40', 1:'border-amber-700/40' }[premiumLevel] || 'border-surface-200'

  return (
    <div className={clsx('bg-white rounded-3xl shadow-card overflow-hidden border-2', premiumBorder)}>
      {/* Cover */}
      <div className="relative h-28 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
        {shop.cover_url
          ? <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🌿</div>}

        {premiumLevel > 0 && (
          <div className="absolute top-2 right-2"><PremiumBadge level={premiumLevel}/></div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent"/>
        <div className="absolute bottom-2 left-3 flex items-center gap-2">
          <Avatar src={null} name={shop.name} size="sm" className="ring-2 ring-white/50"/>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{shop.name}</p>
            <p className="text-white/60 text-[10px]">{shop.city || 'Emplacement non défini'}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: Package, label: 'Produits', value: prodCount, color: 'text-primary-600' },
            { icon: Users,   label: 'Abonnés',  value: shop.followers_count || 0, color: 'text-blue-600' },
            { icon: Heart,   label: 'Likes',    value: shop.likes_count || 0, color: 'text-red-500' },
          ].map((s, i) => (
            <div key={i} className="text-center p-2 rounded-xl bg-surface-50">
              <s.icon size={13} className={clsx('mx-auto mb-0.5', s.color)}/>
              <p className="font-bold text-dark-800 text-sm">{s.value}</p>
              <p className="text-dark-600/40 text-[9px] font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Barre limite produits */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-dark-600/50 font-medium">Produits</span>
            <span className="text-xs text-dark-700 font-bold">
              {prodCount}/{limit === Infinity ? '∞' : limit}
            </span>
          </div>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-500', limitPercent >= 90 ? 'bg-red-500' : limitPercent >= 60 ? 'bg-gold-500' : 'bg-primary-500')}
              style={{ width: `${limit === Infinity ? 20 : limitPercent}%` }}
            />
          </div>
        </div>

        {/* Livraison / Whatsapp */}
        <div className="flex gap-2 mb-3">
          {shop.has_delivery && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 text-primary-700 text-[10px] font-bold">
              <Truck size={10}/> Livraison
            </span>
          )}
          {shop.whatsapp && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-bold">
              <Phone size={10}/> WhatsApp
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 gap-1.5">
          <button onClick={onOpen}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-primary-600 text-white text-xs font-bold shadow-green active:scale-95 transition-transform">
            <Package size={13}/> Produits
          </button>
          <button onClick={onEdit}
            className="flex items-center justify-center gap-1 py-2.5 rounded-2xl bg-surface-100 text-dark-600 text-xs font-semibold active:scale-95 transition-transform">
            <Edit3 size={13}/>
          </button>
          <button onClick={onDelete}
            className="flex items-center justify-center gap-1 py-2.5 rounded-2xl bg-red-50 text-red-500 text-xs font-semibold active:scale-95 transition-transform">
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SHOP DETAIL SHEET (produits)
// ============================================================
function ShopDetailSheet({ open, onClose, shop, user, pieces, onDeleteProduct, onAddProduct, onRefresh }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (open && shop) loadProducts() }, [open, shop])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').eq('shop_id', shop.id).order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  const handleDelete = async (product) => {
    if (!confirm(`Supprimer "${product.name}" ?`)) return
    if (product.image_url) {
      await supabase.storage.from(BUCKETS.PRODUCTS).remove([product.image_url.split('/').pop()])
    }
    await supabase.from('products').delete().eq('id', product.id)
    toast.success('Produit supprimé')
    loadProducts()
    onRefresh()
  }

  const toggleAvailable = async (product) => {
    await supabase.from('products').update({ is_available: !product.is_available }).eq('id', product.id)
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p))
  }

  if (!shop) return null

  const premiumLevel = shop.premium_level || 0
  const limit = PRODUCT_LIMITS[premiumLevel]

  return (
    <BottomSheet open={open} onClose={onClose} title={`🏪 ${shop.name}`}>
      <div className="px-4 pt-2 pb-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Produits', value: `${products.length}/${limit === Infinity ? '∞' : limit}`, color: 'bg-primary-50 text-primary-700' },
            { label: 'Abonnés',  value: shop.followers_count || 0, color: 'bg-blue-50 text-blue-700' },
            { label: 'Mes pièces', value: `🪙 ${pieces?.balance || 0}`, color: 'bg-gold-50 text-gold-700' },
          ].map((s, i) => (
            <div key={i} className={clsx('rounded-xl p-2 text-center text-xs font-bold', s.color)}>
              <p className="font-display text-base">{s.value}</p>
              <p className="opacity-70 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bouton ajouter */}
        <button onClick={onAddProduct}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-sm shadow-green active:scale-95 transition-transform mb-4">
          <Plus size={16}/> Ajouter un produit (5 🪙)
        </button>

        {/* Liste produits */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-2xl"/>)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">📦</p>
            <p className="font-bold text-dark-800">Aucun produit</p>
            <p className="text-sm text-dark-600/50 mt-1">Ajoutez votre premier produit</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(product => (
              <ProductItem key={product.id} product={product} onDelete={() => handleDelete(product)} onToggle={() => toggleAvailable(product)}/>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

// ============================================================
// PRODUCT ITEM
// ============================================================
function ProductItem({ product, onDelete, onToggle }) {
  const AVAIL_LABELS = {
    now:'✅ Dispo','1w':'⏳ 1 sem','2w':'⏳ 2 sem','1m':'📅 1 mois','2m':'📅 2 mois','3m':'📅 3 mois','6m':'📅 6 mois','1y':'📆 1 an'
  }
  return (
    <div className="flex gap-3 p-3 bg-white rounded-2xl shadow-card">
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-100">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🌿</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-dark-800 text-sm truncate">{product.name}</p>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onToggle}
              className={clsx('w-6 h-6 rounded-lg flex items-center justify-center text-[10px] transition-colors',
                product.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-dark-500')}>
              {product.is_available ? '✓' : '○'}
            </button>
            <button onClick={onDelete} className="w-6 h-6 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <Trash2 size={11}/>
            </button>
          </div>
        </div>
        <p className="text-xs text-dark-600/50 mt-0.5 line-clamp-1">{product.description}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-display font-bold text-primary-700 text-sm">{product.price?.toLocaleString('fr-FR')} FCFA</span>
          <span className="text-[10px] text-dark-600/40">{AVAIL_LABELS[product.availability] || '✅ Dispo'}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CREATE SHOP SHEET
// ============================================================
function CreateShopSheet({ open, onClose, user, pieces, onCreated, refreshWallet }) {
  const [form, setForm] = useState({ name:'', description:'', city:'', whatsapp:'', has_delivery: false })
  const [category, setCategory] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState(null)
  const coverRef = useRef()

  const reset = () => {
    setForm({ name:'', description:'', city:'', whatsapp:'', has_delivery: false })
    setCategory(''); setCoverFile(null); setCoverPreview(null); setCoords(null)
  }

  const handleCover = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleLocate = () => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async ({ coords: c }) => {
      setCoords({ latitude: c.latitude, longitude: c.longitude })
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${c.latitude}&lon=${c.longitude}&format=json`)
        const data = await res.json()
        const city = data.address?.city || data.address?.town || data.address?.village || ''
        setForm(p => ({ ...p, city }))
        toast.success(`📍 ${city}`)
      } catch { toast.success('Position enregistrée') }
      setLocating(false)
    }, () => { toast.error('GPS inaccessible'); setLocating(false) })
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    if (!category) { toast.error('Catégorie requise'); return }
    if (!coverFile) { toast.error('Photo de la boutique requise'); return }
    if ((pieces?.balance || 0) < 10) { toast.error('Pièces insuffisantes (10 🪙 requis)'); return }

    setLoading(true)
    try {
      // Upload cover
      const compressed = await compressImage(coverFile, 900, 0.75)
      const path = `${user.id}/${Date.now()}.jpg`
      const coverUrl = await uploadImage(BUCKETS.COVERS, compressed, path)

      // Slug unique
      let slug = slugify(form.name)
      const { count } = await supabase.from('shops').select('id', { count: 'exact' }).eq('slug', slug)
      if (count > 0) slug = `${slug}-${Date.now()}`

      const { error } = await supabase.from('shops').insert({
        owner_id: user.id,
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        city: form.city.trim() || null,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        cover_url: coverUrl,
        has_delivery: form.has_delivery,
        whatsapp: form.whatsapp.trim() || null,
        category_id: null, // On stocke le nom en attendant
      })

      if (error) throw error

      // Déduire pièces (récupérer le vrai solde depuis Supabase)
      const { data: piecesData } = await supabase
        .from('pieces').select('balance').eq('user_id', user.id).single()
      const currentBalance = piecesData?.balance || 0
      await supabase.from('pieces')
        .update({ balance: currentBalance - 10 })
        .eq('user_id', user.id)

      // Notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'order_new',
        title: '🏪 Boutique créée !',
        body: `Votre boutique "${form.name}" est maintenant en ligne.`,
      })

      toast.success('Boutique créée avec succès ! 🎉')
      reset()
      // Recharger les pièces depuis Supabase
      if (refreshWallet) await refreshWallet()
      onCreated()
    } catch (err) {
      toast.error(err.message?.includes('23505') ? 'Ce nom de boutique existe déjà' : 'Erreur lors de la création')
    } finally { setLoading(false) }
  }

  // Filtrer catégories
  const filtered = CATEGORIES.map(g => ({
    ...g, items: g.items.filter(it => !catSearch || it.toLowerCase().includes(catSearch.toLowerCase()) || g.name.toLowerCase().includes(catSearch.toLowerCase()))
  })).filter(g => g.items.length > 0)

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title="🏪 Créer une boutique">
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Alerte pièces */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gold-50 border border-gold-200">
          <span className="text-2xl">🪙</span>
          <div>
            <p className="text-gold-800 font-bold text-sm">Coût : 10 pièces</p>
            <p className="text-gold-600 text-xs">Solde actuel : {pieces?.balance || 0} pièces</p>
          </div>
        </div>

        {/* Photo cover */}
        <div>
          <label className="block text-sm font-bold text-dark-700 mb-2">Photo de la boutique *</label>
          <button onClick={() => coverRef.current?.click()}
            className="w-full h-36 rounded-2xl overflow-hidden border-2 border-dashed border-surface-300 bg-surface-50 flex flex-col items-center justify-center active:scale-[0.98] transition-transform relative">
            {coverPreview ? (
              <img src={coverPreview} className="w-full h-full object-cover"/>
            ) : (
              <>
                <Camera size={28} className="text-dark-600/30 mb-2"/>
                <p className="text-dark-600/50 text-sm font-medium">Appuyer pour ajouter une photo</p>
              </>
            )}
            {coverPreview && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-bold">Changer la photo</p>
              </div>
            )}
          </button>
          <input ref={coverRef} type="file" accept="image/*" onChange={handleCover} className="hidden"/>
        </div>

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Nom de la boutique *</label>
          <input type="text" placeholder="Ex: Ferme Agro-Béninoise" value={form.name}
            onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input-field"/>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Description</label>
          <textarea placeholder="Décrivez votre boutique..." value={form.description}
            onChange={e => setForm(p => ({...p, description: e.target.value}))}
            className="input-field resize-none" rows={3}/>
        </div>

        {/* Catégorie */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Catégorie *</label>
          <button onClick={() => setCatOpen(true)}
            className={clsx('input-field text-left flex items-center justify-between', !category && 'text-dark-600/40')}>
            <span>{category || 'Choisir une catégorie'}</span>
            <ChevronDown size={16} className="text-dark-600/40"/>
          </button>
        </div>

        {/* Ville + GPS */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Ville</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
              <input type="text" placeholder="Ex: Cotonou" value={form.city}
                onChange={e => setForm(p => ({...p, city: e.target.value}))} className="input-field pl-10"/>
            </div>
            <button onClick={handleLocate} disabled={locating}
              className="px-4 py-3 rounded-2xl bg-primary-50 text-primary-700 font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-2">
              {locating ? <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/> : <><MapPin size={15}/> GPS</>}
            </button>
          </div>
        </div>

        {/* Livraison + WhatsApp */}
        <div className="space-y-3">
          <button onClick={() => setForm(p => ({...p, has_delivery: !p.has_delivery}))}
            className={clsx('w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all',
              form.has_delivery ? 'border-primary-500 bg-primary-50' : 'border-surface-200')}>
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              form.has_delivery ? 'bg-primary-500 text-white' : 'bg-surface-100 text-dark-600')}>
              <Truck size={16}/>
            </div>
            <span className={clsx('flex-1 text-left text-sm font-bold', form.has_delivery ? 'text-primary-700' : 'text-dark-700')}>
              Livraison disponible
            </span>
            <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
              form.has_delivery ? 'border-primary-500 bg-primary-500' : 'border-surface-300')}>
              {form.has_delivery && <Check size={12} className="text-white" strokeWidth={3}/>}
            </div>
          </button>

          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
            <input type="tel" placeholder="Numéro WhatsApp (+229...)" value={form.whatsapp}
              onChange={e => setForm(p => ({...p, whatsapp: e.target.value}))} className="input-field pl-10"/>
          </div>
        </div>

        <Button variant="primary" className="w-full" size="lg" loading={loading} onClick={handleCreate}>
          Créer la boutique — 10 🪙
        </Button>
      </div>

      {/* Modal catégories */}
      {catOpen && (
        <>
          <div className="fixed inset-0 bg-dark-900/60 z-[60] backdrop-blur-sm" onClick={() => setCatOpen(false)}/>
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl max-w-[480px] mx-auto shadow-modal animate-slide-up">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-surface-300"/></div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100">
              <h3 className="font-display text-lg font-bold">Catégorie</h3>
              <button onClick={() => setCatOpen(false)} className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center"><X size={16}/></button>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
                <input type="text" placeholder="Rechercher..." value={catSearch} onChange={e => setCatSearch(e.target.value)} className="input-field pl-10 text-sm"/>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] px-4 pb-6 space-y-2">
              {filtered.map(group => (
                <div key={group.name} className="rounded-2xl border-2 border-surface-200 overflow-hidden">
                  <button onClick={() => setExpandedGroup(expandedGroup === group.name ? null : group.name)}
                    className="w-full flex items-center justify-between p-3 bg-surface-50 active:bg-surface-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <span className="font-bold text-dark-800 text-sm">{group.name}</span>
                    </div>
                    <ChevronDown size={15} className={clsx('text-dark-600/40 transition-transform', expandedGroup === group.name && 'rotate-180')}/>
                  </button>
                  {expandedGroup === group.name && (
                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-white">
                      {group.items.map(item => {
                        const full = `${group.name} · ${item}`
                        return (
                          <button key={item} onClick={() => { setCategory(full); setCatOpen(false); setCatSearch('') }}
                            className={clsx('flex items-center gap-2 p-2.5 rounded-xl text-left transition-all',
                              category === full ? 'bg-primary-100 ring-2 ring-primary-400' : 'bg-surface-50 active:bg-primary-50')}>
                            <span>{group.icon}</span>
                            <span className="text-xs font-semibold text-dark-700 truncate">{item}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </BottomSheet>
  )
}

// ============================================================
// ADD PRODUCT SHEET
// ============================================================
function AddProductSheet({ open, onClose, shop, user, pieces, onAdded, refreshWallet }) {
  const [form, setForm] = useState({ name:'', description:'', price:'', availability:'now' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const imgRef = useRef()

  const reset = () => { setForm({ name:'', description:'', price:'', availability:'now' }); setImageFile(null); setImagePreview(null) }

  const handleImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    if (!form.price || isNaN(+form.price) || +form.price <= 0) { toast.error('Prix invalide'); return }
    if (!imageFile) { toast.error('Photo requise'); return }
    if ((pieces?.balance || 0) < 5) { toast.error('Pièces insuffisantes (5 🪙 requis)'); return }

    setLoading(true)
    try {
      const compressed = await compressImage(imageFile, 800, 0.75)
      const path = `${shop.id}/${Date.now()}.jpg`
      const imageUrl = await uploadImage(BUCKETS.PRODUCTS, compressed, path)

      const { error } = await supabase.from('products').insert({
        shop_id: shop.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Math.round(+form.price),
        image_url: imageUrl,
        availability: form.availability,
        is_available: true,
      })
      if (error) throw error

      const { data: piecesData2 } = await supabase
        .from('pieces').select('balance').eq('user_id', user.id).single()
      const currentBalance2 = piecesData2?.balance || 0
      await supabase.from('pieces')
        .update({ balance: currentBalance2 - 5 })
        .eq('user_id', user.id)

      toast.success('Produit ajouté ! 📦')
      reset()
      // Recharger les pièces depuis Supabase
      if (refreshWallet) await refreshWallet()
      onAdded()
      onClose()
    } catch { toast.error('Erreur lors de l\'ajout') }
    finally { setLoading(false) }
  }

  if (!shop) return null

  return (
    <BottomSheet open={open} onClose={() => { reset(); onClose() }} title={`➕ Ajouter un produit`}>
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Boutique info */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary-50">
          <Store size={16} className="text-primary-600"/>
          <span className="text-primary-700 font-semibold text-sm">{shop.name}</span>
          <span className="ml-auto text-xs text-gold-600 font-bold bg-gold-50 px-2 py-0.5 rounded-lg">5 🪙</span>
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-bold text-dark-700 mb-2">Photo du produit *</label>
          <button onClick={() => imgRef.current?.click()}
            className="w-full h-32 rounded-2xl overflow-hidden border-2 border-dashed border-surface-300 bg-surface-50 flex flex-col items-center justify-center active:scale-[0.98] transition-transform relative">
            {imagePreview
              ? <img src={imagePreview} className="w-full h-full object-cover"/>
              : <><Camera size={24} className="text-dark-600/30 mb-1.5"/><p className="text-dark-600/50 text-sm">Appuyer pour ajouter</p></>}
          </button>
          <input ref={imgRef} type="file" accept="image/*" onChange={handleImage} className="hidden"/>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Nom du produit *</label>
          <input type="text" placeholder="Ex: Maïs jaune local" value={form.name}
            onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input-field"/>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Description</label>
          <textarea placeholder="Détails, conditionnement, qualité..." value={form.description}
            onChange={e => setForm(p => ({...p, description: e.target.value}))}
            className="input-field resize-none" rows={2}/>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Prix (FCFA) *</label>
          <input type="number" placeholder="Ex: 5000" min="0" value={form.price}
            onChange={e => setForm(p => ({...p, price: e.target.value}))} className="input-field"/>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-dark-700">Disponibilité</label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABILITY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setForm(p => ({...p, availability: opt.value}))}
                className={clsx('p-2.5 rounded-xl text-xs font-semibold text-left transition-all active:scale-95 border-2',
                  form.availability === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-surface-200 text-dark-600')}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" className="w-full" size="lg" loading={loading} onClick={handleAdd}>
          Ajouter le produit — 5 🪙
        </Button>
      </div>
    </BottomSheet>
  )
}

// ============================================================
// PREMIUM SHEET
// ============================================================
function PremiumSheet({ open, onClose, wallet, user, currentPremium, shops, onPurchased }) {
  const [loading, setLoading] = useState(null)

  const handleBuy = async (plan) => {
    if (!user) return
    const balance = wallet ? wallet.balance_available : 0
    const balanceFCFA = balance
    if (balanceFCFA < plan.price) { toast.error(`Solde insuffisant. Disponible : ${balanceFCFA.toLocaleString('fr-FR')} FCFA`); return }

    if (!confirm(`Confirmer le paiement de ${plan.price.toLocaleString()} FCFA pour Premium ${plan.name} (30 jours) ?`)) return

    setLoading(plan.level)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Déduire wallet
      await supabase.from('wallets').update({
        balance_available: wallet.balance_available - plan.price,
        balance_total: (wallet.balance_total || wallet.balance_available) - plan.price,
      }).eq('user_id', user.id)

      // Créer abonnement
      await supabase.from('premium_subscriptions').insert({
        user_id: user.id,
        shop_id: shops[0]?.id || null,
        level: plan.level,
        amount: plan.price, // en FCFA directement
        expires_at: expiresAt.toISOString(),
      })

      // Mettre à jour boutiques
      if (shops.length > 0) {
        await supabase.from('shops').update({ premium_level: plan.level, premium_expires_at: expiresAt.toISOString() }).eq('owner_id', user.id)
      }

      toast.success(`🎉 Premium ${plan.name} activé pour 30 jours !`)
      onPurchased()
    } catch { toast.error('Erreur lors du paiement') }
    finally { setLoading(null) }
  }

  const balance = wallet ? (wallet.balance_available).toLocaleString('fr-FR') : '0'
  // balance_available est en centimes → diviser par 100 pour FCFA

  return (
    <BottomSheet open={open} onClose={onClose} title="⭐ Devenir Premium">
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Solde */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-dark-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <span className="text-sm">💳</span>
            </div>
            <span className="text-white/60 text-sm font-medium">Solde wallet</span>
          </div>
          <span className="font-display font-bold text-white">{balance} FCFA</span>
        </div>

        {currentPremium && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gold-50 border border-gold-200">
            <Crown size={20} className="text-gold-600"/>
            <div>
              <p className="font-bold text-gold-800 text-sm">Premium actif</p>
              <p className="text-gold-600 text-xs">Expire le {new Date(currentPremium.expires_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        )}

        {PREMIUM_PLANS.map(plan => (
          <div key={plan.level}
            className={clsx('relative rounded-3xl overflow-hidden border-2 transition-all',
              plan.popular ? 'border-gold-400 shadow-gold' : 'border-surface-200')}>
            {plan.popular && (
              <div className="absolute top-0 left-0 right-0 bg-gold-500 text-white text-center text-xs font-bold py-1">
                ⭐ POPULAIRE
              </div>
            )}
            <div className={clsx('p-4', plan.popular && 'pt-8')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-10 h-10 rounded-2xl bg-gradient-to-br flex items-center justify-center text-xl', plan.color)}>
                    {plan.emoji}
                  </div>
                  <div>
                    <p className="font-display font-bold text-dark-800">Premium {plan.name}</p>
                    <p className="text-dark-600/50 text-xs">{plan.stars}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-dark-800 text-lg">{plan.price.toLocaleString()}</p>
                  <p className="text-dark-600/50 text-xs">FCFA / mois</p>
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                {plan.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-primary-600" strokeWidth={3}/>
                    </div>
                    <span className="text-dark-700 text-xs font-medium">{perk}</span>
                  </div>
                ))}
              </div>

              <Button
                variant={plan.popular ? 'gold' : 'primary'}
                className="w-full"
                loading={loading === plan.level}
                onClick={() => handleBuy(plan)}
              >
                Activer {plan.name} — {plan.price.toLocaleString()} FCFA
              </Button>
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}

// ============================================================
// COINS SHEET
// ============================================================
function CoinsSheet({ open, onClose, wallet, user, pieces, onPurchased }) {
  const [loading, setLoading] = useState(null)

  const handleBuy = async (pack) => {
    const balance = wallet ? wallet.balance_available : 0
    if (balance < pack.price) { toast.error(`Solde insuffisant. Disponible : ${balance.toLocaleString()} FCFA`); return }

    if (!confirm(`Acheter ${pack.coins} pièces pour ${pack.price} FCFA ?`)) return

    setLoading(pack.coins)
    try {
      await supabase.from('wallets').update({
        balance_available: wallet.balance_available - pack.price,
        balance_total: wallet.balance_total - pack.price,
      }).eq('user_id', user.id)

      // Récupérer le vrai solde pieces depuis Supabase avant d'incrémenter
      const { data: realPieces } = await supabase.from('pieces').select('balance').eq('user_id', user.id).single()
      await supabase.from('pieces').update({ balance: (realPieces?.balance || 0) + pack.coins }).eq('user_id', user.id)

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        wallet_id: wallet.id,
        transaction_type: 'pieces_purchase',
        amount: -pack.price,
        status: 'completed',
        description: `Achat de ${pack.coins} pièces 🪙`,
      })

      toast.success(`🪙 ${pack.coins} pièces achetées !`)
      onPurchased()
      onClose()
    } catch { toast.error('Erreur lors de l\'achat') }
    finally { setLoading(null) }
  }

  const balance = wallet ? (wallet.balance_available).toLocaleString('fr-FR') : '0' // centimes → FCFA
  const currentPieces = pieces?.balance || 0

  return (
    <BottomSheet open={open} onClose={onClose} title="🪙 Recharger des pièces">
      <div className="px-4 pt-2 pb-8 space-y-4">
        {/* Infos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-dark-800 text-center">
            <p className="text-white/50 text-xs">Solde Wallet</p>
            <p className="font-display font-bold text-white text-base">{balance} FCFA</p>
          </div>
          <div className="p-3 rounded-2xl bg-gold-50 border border-gold-200 text-center">
            <p className="text-gold-600 text-xs">Pièces actuelles</p>
            <p className="font-display font-bold text-gold-700 text-base">🪙 {currentPieces}</p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-primary-50 border border-primary-100">
          <p className="text-primary-700 text-xs font-semibold text-center">
            💡 Créer une boutique = 10 🪙 &nbsp;•&nbsp; Ajouter un produit = 5 🪙
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {COINS_PACKS.map(pack => (
            <button key={pack.coins} onClick={() => handleBuy(pack)}
              disabled={!!loading}
              className={clsx('relative p-4 rounded-2xl text-white flex flex-col items-center gap-2 active:scale-95 transition-all shadow-md', pack.color, loading === pack.coins && 'opacity-70')}>
              {loading === pack.coins && (
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/20">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                </div>
              )}
              <span className="text-3xl">🪙</span>
              <p className="font-display font-black text-2xl">{pack.coins}</p>
              <p className="text-white/80 text-xs font-semibold">pièces</p>
              <div className="w-full mt-1 py-1.5 rounded-xl bg-black/20">
                <p className="text-white font-bold text-sm text-center">{pack.price} FCFA</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================
function EmptyShops({ onCreate }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-20 h-20 rounded-3xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
        <Store size={36} className="text-primary-400"/>
      </div>
      <h3 className="font-display text-xl font-bold text-dark-800 mb-2">Pas encore de boutique</h3>
      <p className="text-dark-600/60 text-sm mb-6">Créez votre première boutique et commencez à vendre sur MANG !</p>
      <Button variant="primary" onClick={onCreate}>
        <Plus size={16}/> Créer ma première boutique
      </Button>
    </div>
  )
}

function ShopCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      <div className="h-28 skeleton"/>
      <div className="p-3.5 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => <div key={i} className="h-14 skeleton rounded-xl"/>)}
        </div>
        <div className="h-2 skeleton rounded-full"/>
        <div className="grid grid-cols-4 gap-1.5">
          <div className="col-span-2 h-10 skeleton rounded-2xl"/>
          <div className="h-10 skeleton rounded-2xl"/>
          <div className="h-10 skeleton rounded-2xl"/>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// VERIFICATION SHEET
// ============================================================

// ============================================================
// VERIFICATION SHEET — Multi-étapes + Sélecteur boutique
// ============================================================
function VerificationSheet({ open, onClose, shop, shops, user, profile, verifyRequests, existingRequest, onSubmitted, onSelectShop, showSelector }) {
  const [step, setStep] = useState(1)
  const [sending, setSending] = useState(false)

  // Étape 1 — Identité
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [idType, setIdType] = useState('CNI')

  // Étape 2 — Boutique & activité
  const [activityType, setActivityType] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [location, setLocation] = useState('')

  // Étape 3 — Conditions de production
  const [productionMethod, setProductionMethod] = useState('')
  const [usePesticides, setUsePesticides] = useState(null)
  const [monthlyCapacity, setMonthlyCapacity] = useState('')
  const [deliveryScope, setDeliveryScope] = useState('')
  const [certifications, setCertifications] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')

  useEffect(() => {
    if (open) {
      setStep(1)
      setFullName(profile?.full_name || '')
      setPhone(profile?.phone || '')
      setIdType('CNI')
      setActivityType('')
      setYearsExperience('')
      setLocation(profile?.city || '')
      setProductionMethod('')
      setUsePesticides(null)
      setMonthlyCapacity('')
      setDeliveryScope('')
      setCertifications('')
      setAdditionalInfo('')
    }
  }, [open, profile])

  const isPending = existingRequest?.status === 'pending'
  const isRejected = existingRequest?.status === 'rejected'

  const ACTIVITY_TYPES = ['Maraîchage', 'Élevage', 'Céréales', 'Fruits', 'Transformation alimentaire', 'Pêche', 'Apiculture', 'Autre']
  const PRODUCTION_METHODS = ['Bio / Naturel', 'Conventionnel', 'Traditionnel', 'Mixte']
  const DELIVERY_SCOPES = ['Locale (ville)', 'Régionale', 'Nationale', 'Non disponible']

  const canGoStep2 = fullName.trim() && phone.trim()
  const canGoStep3 = activityType && location.trim()
  const canSubmit = productionMethod && deliveryScope

  const submit = async () => {
    if (!canSubmit) return
    setSending(true)

    const formData = {
      user_id: user.id,
      shop_id: shop.id,
      shop_name: shop.name,
      // Étape 1
      full_name: fullName.trim(),
      phone: phone.trim(),
      id_type: idType,
      // Étape 2
      activity_type: activityType,
      years_experience: yearsExperience || null,
      location: location.trim(),
      // Étape 3
      production_method: productionMethod,
      use_pesticides: usePesticides,
      monthly_capacity: monthlyCapacity || null,
      delivery_scope: deliveryScope,
      certifications: certifications.trim() || null,
      additional_info: additionalInfo.trim() || null,
      status: 'pending',
    }

    const { error } = await supabase.from('verification_requests').insert(formData)
    setSending(false)

    if (error) {
      if (error.code === '23505') toast.error('Demande déjà envoyée pour cette boutique')
      else toast.error('Erreur : ' + error.message)
      return
    }

    await supabase.rpc('create_notification', {
      p_user_id: 'd9f97369-ae78-4da2-844c-1c9c97b12445',
      p_type: 'verification_request',
      p_title: '🔔 Nouvelle demande de vérification',
      p_body: `@${profile?.username} (${fullName}) demande la vérification de "${shop.name}" — ${activityType}`,
      p_reference_id: shop.id,
      p_reference_type: 'shop',
    })

    toast.success('Demande envoyée ! Réponse sous 24-48h ✅')
    onSubmitted()
  }

  // ── SÉLECTEUR DE BOUTIQUE ──
  if (showSelector) {
    const unverifiedShops = shops.filter(s => !s.is_verified)
    return (
      <BottomSheet open={open} onClose={onClose} title="🏪 Quelle boutique vérifier ?">
        <div className="px-4 pt-2 pb-8 space-y-3">
          <p className="text-gray-500 text-sm">Sélectionnez la boutique pour laquelle vous souhaitez demander la vérification.</p>
          {unverifiedShops.map(s => {
            const req = verifyRequests[s.id]
            return (
              <button key={s.id} onClick={() => req?.status !== 'pending' && onSelectShop(s)}
                className={clsx('w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
                  req?.status === 'pending' ? 'border-yellow-200 bg-yellow-50 opacity-70' : 'border-gray-100 bg-white active:scale-[0.98]')}>
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary-100 flex-shrink-0">
                  {s.cover_url
                    ? <img src={s.cover_url} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-xl">🌿</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-dark-800 text-sm truncate">{s.name}</p>
                  <p className="text-gray-400 text-xs">{s.city || 'Localisation non définie'}</p>
                </div>
                {req?.status === 'pending'
                  ? <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">⏳ En attente</span>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    )
  }

  if (!shop) return null

  return (
    <BottomSheet open={open} onClose={onClose} title="✅ Demande de vérification">
      <div style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="px-4 pt-2 pb-8 space-y-5">

          {/* Boutique sélectionnée */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-100 flex-shrink-0">
              {shop.cover_url
                ? <img src={shop.cover_url} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center">🌿</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-blue-800 text-sm truncate">{shop.name}</p>
              <p className="text-blue-500 text-xs">Boutique à vérifier</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>

          {/* Statut existant */}
          {isPending && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-center">
              <p className="text-4xl mb-2">⏳</p>
              <p className="font-bold text-yellow-800 text-sm">Demande en cours d'examen</p>
              <p className="text-yellow-600 text-xs mt-1">Nous traitons votre demande sous 24-48h</p>
            </div>
          )}

          {isRejected && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="font-bold text-red-700 text-sm mb-1">❌ Demande refusée</p>
              {existingRequest?.admin_note && <p className="text-red-600 text-xs">{existingRequest.admin_note}</p>}
              <p className="text-red-500 text-xs mt-1">Vous pouvez soumettre une nouvelle demande.</p>
            </div>
          )}

          {!isPending && (
            <>
              {/* Indicateur d'étapes */}
              <div className="flex items-center gap-2">
                {[1,2,3].map(s => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all',
                      step === s ? 'bg-blue-600 text-white shadow-md' :
                      step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500')}>
                      {step > s ? '✓' : s}
                    </div>
                    {s < 3 && <div className={clsx('flex-1 h-1 rounded-full transition-all', step > s ? 'bg-green-400' : 'bg-gray-200')}/>}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 -mt-2">
                <span>Identité</span>
                <span className="ml-4">Activité</span>
                <span>Production</span>
              </div>

              {/* ── ÉTAPE 1 : Identité ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="font-black text-dark-900 text-base">👤 Votre identité</p>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Nom complet *</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Prénom et Nom"
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-300"/>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Téléphone *</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+229 XX XX XX XX"
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-300"/>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Type de pièce d'identité</label>
                    <div className="flex gap-2">
                      {['CNI', 'Passeport', 'Permis'].map(t => (
                        <button key={t} onClick={() => setIdType(t)}
                          className={clsx('flex-1 py-2.5 rounded-2xl border-2 text-xs font-bold transition-all active:scale-95',
                            idType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500')}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
                    <p className="text-amber-700 text-xs font-semibold">📋 Note : Vous devrez peut-être envoyer une photo de votre pièce via WhatsApp après soumission.</p>
                  </div>

                  <button onClick={() => setStep(2)} disabled={!canGoStep2}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2">
                    Suivant →
                  </button>
                </div>
              )}

              {/* ── ÉTAPE 2 : Boutique & Activité ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="font-black text-dark-900 text-base">🏪 Votre activité</p>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Type d'activité *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACTIVITY_TYPES.map(t => (
                        <button key={t} onClick={() => setActivityType(t)}
                          className={clsx('py-2.5 px-3 rounded-2xl border-2 text-xs font-bold text-left transition-all active:scale-95',
                            activityType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600')}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Localisation exacte *</label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                      placeholder="Ex: Cotonou, Quartier Fidjrossè"
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-300"/>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Années d'expérience</label>
                    <div className="flex gap-2">
                      {['< 1 an', '1-3 ans', '3-5 ans', '5-10 ans', '10+ ans'].map(y => (
                        <button key={y} onClick={() => setYearsExperience(y)}
                          className={clsx('flex-1 py-2 rounded-xl border-2 text-[10px] font-bold transition-all active:scale-95',
                            yearsExperience === y ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500')}>
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep(1)}
                      className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm active:scale-95">
                      ← Retour
                    </button>
                    <button onClick={() => setStep(3)} disabled={!canGoStep3}
                      className="flex-[2] py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm disabled:opacity-40 active:scale-[0.98]">
                      Suivant →
                    </button>
                  </div>
                </div>
              )}

              {/* ── ÉTAPE 3 : Conditions de production ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="font-black text-dark-900 text-base">🌱 Production & Livraison</p>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Méthode de production *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRODUCTION_METHODS.map(m => (
                        <button key={m} onClick={() => setProductionMethod(m)}
                          className={clsx('py-2.5 rounded-2xl border-2 text-xs font-bold transition-all active:scale-95',
                            productionMethod === m ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600')}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-2">Utilisation de pesticides / engrais chimiques ?</label>
                    <div className="flex gap-2">
                      {[{v: false, l:'Non ✅'},{v: true, l:'Oui'},{v: null, l:'Parfois'}].map(opt => (
                        <button key={String(opt.v)} onClick={() => setUsePesticides(opt.v)}
                          className={clsx('flex-1 py-2.5 rounded-2xl border-2 text-xs font-bold transition-all active:scale-95',
                            usePesticides === opt.v && opt.v !== null || (usePesticides === null && opt.v === null)
                              ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500')}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Zone de livraison *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DELIVERY_SCOPES.map(d => (
                        <button key={d} onClick={() => setDeliveryScope(d)}
                          className={clsx('py-2.5 rounded-2xl border-2 text-xs font-bold transition-all active:scale-95',
                            deliveryScope === d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600')}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Capacité mensuelle (optionnel)</label>
                    <input type="text" value={monthlyCapacity} onChange={e => setMonthlyCapacity(e.target.value)}
                      placeholder="Ex: 500 kg/mois, 20 lapins/semaine..."
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-300"/>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Certifications (optionnel)</label>
                    <input type="text" value={certifications} onChange={e => setCertifications(e.target.value)}
                      placeholder="Ex: Certification bio, label qualité..."
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-300"/>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-dark-700 block mb-1.5">Informations supplémentaires</label>
                    <textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)}
                      placeholder="Tout ce que vous souhaitez nous dire sur votre activité..."
                      rows={3}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-blue-300 resize-none"/>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep(2)}
                      className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm active:scale-95">
                      ← Retour
                    </button>
                    <button onClick={submit} disabled={!canSubmit || sending}
                      className="flex-[2] py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
                      {sending
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        : '✅ Envoyer la demande'}
                    </button>
                  </div>

                  <p className="text-center text-gray-400 text-xs">Réponse sous 24-48h après examen</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
