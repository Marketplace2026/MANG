import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Lock, AlertCircle, Home } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useCacheStore } from '@/store'
import { BottomSheet, UserLink } from '@/components/ui'

import ProfileHeaderCard from '@/components/profile/ProfileHeaderCard'
import ProfileTabsNav from '@/components/profile/ProfileTabsNav'
import ProfileProductsGrid from '@/components/profile/ProfileProductsGrid'
import ProfileReviewsList from '@/components/profile/ProfileReviewsList'
import ProfileAboutTab from '@/components/profile/ProfileAboutTab'

function PublicProfilePageContent() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile } = useAuthStore()

  const cleanUsername = (username || '').replace(/^@/, '').trim().toLowerCase()
  const cachedProfile = useCacheStore.getState().membersCache[cleanUsername] || null

  const [profile, setProfile] = useState(cachedProfile)
  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [posts, setPosts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState(null) // null | 'NOT_FOUND' | 'RLS_RESTRICTED' | 'NETWORK_ERROR'
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('products') // 'products' | 'posts' | 'reviews' | 'about'
  const [stats, setStats] = useState({
    followers_count: 0,
    following_count: 0,
    products_count: 0,
    posts_count: 0,
    avg_rating: 5.0,
    reviews_count: 0
  })

  const [followersSheet, setFollowersSheet] = useState(false)
  const [followingSheet, setFollowingSheet] = useState(false)
  const [followersList, setFollowersList] = useState([])
  const [followingList, setFollowingList] = useState([])

  const isMe = myProfile?.username?.toLowerCase() === cleanUsername

  const loadData = useCallback(async () => {
    if (!cleanUsername) {
      setErrorState('NOT_FOUND')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorState(null)

    try {
      // 1. REQUÊTE SUPABASE ANTI N+1 JOINTE (profiles + shops)
      const { data: prof, error: fetchErr } = await supabase
        .from('profiles')
        .select(`*, shops(*)`)
        .ilike('username', cleanUsername)
        .maybeSingle()

      // GESTION ERREURS FETCH SUPABASE
      if (fetchErr) {
        console.error('PROFILE_FETCH_ERROR', fetchErr)
        if (fetchErr.code === 'PGRST301' || fetchErr.code === '42501') {
          setErrorState('RLS_RESTRICTED')
        } else {
          setErrorState('NETWORK_ERROR')
        }
        setLoading(false)
        return
      }

      // CAS A : Profil introuvable
      if (!prof) {
        setErrorState('NOT_FOUND')
        setLoading(false)
        return
      }

      // Extraction de la boutique jointe sans requête N+1
      const shopObj = Array.isArray(prof.shops)
        ? prof.shops.find(s => s.is_active) || prof.shops[0] || null
        : (prof.shops?.is_active ? prof.shops : null)

      setProfile(prof)
      setShop(shopObj)
      useCacheStore.getState().setMembers(cleanUsername, prof)

      // 2. Charger les statistiques (Abonnés, Abonnements, Publications)
      const [{ count: fers }, { count: fing }, { count: postCnt }] = await Promise.all([
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', prof.id),
      ])

      setStats({
        followers_count: fers || 0,
        following_count: fing || 0,
        posts_count: postCnt || 0,
        products_count: 0,
        avg_rating: 5.0,
        reviews_count: 0
      })

      // 3. Charger les Produits et Avis si boutique disponible
      if (shopObj?.id) {
        const [{ data: prods }, { data: revs }] = await Promise.all([
          supabase.from('products').select('*').eq('shop_id', shopObj.id).eq('is_available', true).order('created_at', { ascending: false }),
          supabase.from('shop_reviews').select('*, user:profiles(*)').eq('shop_id', shopObj.id).order('created_at', { ascending: false })
        ])

        setProducts(prods || [])
        setReviews(revs || [])

        const avg = revs?.length > 0
          ? revs.reduce((acc, r) => acc + (r.rating || 5), 0) / revs.length
          : 5.0

        setStats(prev => ({
          ...prev,
          products_count: prods?.length || 0,
          reviews_count: revs?.length || 0,
          avg_rating: avg
        }))
      }

      // 4. Charger les Publications du membre
      const { data: psts } = await supabase
        .from('posts')
        .select('*, user:profiles(*), shop:shops(*)')
        .eq('user_id', prof.id)
        .order('created_at', { ascending: false })
      setPosts(psts || [])

      // 5. Statut d'abonnement courant
      if (user && user.id !== prof.id) {
        const { data: f } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', prof.id)
          .maybeSingle()
        setIsFollowing(!!f)
      }
    } catch (err) {
      console.error('PROFILE_FETCH_EXCEPTION', err)
      setErrorState('NETWORK_ERROR')
    } finally {
      setLoading(false)
    }
  }, [cleanUsername, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleFollow = async () => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    if (!profile) return

    if (isFollowing) {
      const { error } = await supabase.from('user_follows')
        .delete().eq('follower_id', user.id).eq('following_id', profile.id)
      if (error) { toast.error('Erreur'); return }
      setIsFollowing(false)
      setStats(s => ({ ...s, followers_count: Math.max(0, s.followers_count - 1) }))
    } else {
      const { error } = await supabase.from('user_follows')
        .insert({ follower_id: user.id, following_id: profile.id })
      if (error) { toast.error('Erreur'); return }
      setIsFollowing(true)
      setStats(s => ({ ...s, followers_count: s.followers_count + 1 }))
      toast.success(`Vous suivez désormais @${profile.username} !`)
    }
  }

  const loadFollowers = async () => {
    if (!profile) return
    setFollowersSheet(true)
    const { data } = await supabase
      .from('user_follows')
      .select('follower:profiles(*)')
      .eq('following_id', profile.id)
    setFollowersList((data || []).map(d => d.follower).filter(Boolean))
  }

  const loadFollowing = async () => {
    if (!profile) return
    setFollowingSheet(true)
    const { data } = await supabase
      .from('user_follows')
      .select('following:profiles(*)')
      .eq('follower_id', profile.id)
    setFollowingList((data || []).map(d => d.following).filter(Boolean))
  }

  // 1. ÉTAT SKELETON (Chargement en cours)
  if (loading) {
    return <PublicProfileSkeleton />
  }

  // 2. ÉTAT ERREUR B : Profil Privé (RLS)
  if (errorState === 'RLS_RESTRICTED') {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center text-4xl mb-3">
          <Lock size={36} />
        </div>
        <h2 className="font-bold text-gray-900 dark:text-white text-xl mb-1">Profil privé</h2>
        <p className="text-gray-500 text-xs max-w-xs mb-5">
          L'accès à ce profil a été restreint par son propriétaire.
        </p>
        <button
          onClick={() => navigate('/marketplace')}
          className="px-6 py-3 bg-emerald-700 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform"
        >
          Retour au Marketplace
        </button>
      </div>
    )
  }

  // 3. ÉTAT ERREUR C : Erreur Réseau
  if (errorState === 'NETWORK_ERROR') {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center text-4xl mb-3">
          <AlertCircle size={36} />
        </div>
        <h2 className="font-bold text-gray-900 dark:text-white text-xl mb-1">Erreur réseau</h2>
        <p className="text-gray-500 text-xs max-w-xs mb-5">
          Impossible de contacter le serveur. Vérifiez votre connexion Internet.
        </p>
        <button
          onClick={loadData}
          className="px-6 py-3 bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 active:scale-95 transition-transform"
        >
          <RefreshCw size={14} /> Réessayer
        </button>
      </div>
    )
  }

  // 4. ÉTAT ERREUR A : Profil Introuvable
  if (errorState === 'NOT_FOUND' || !profile) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-dark-950 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-20 h-20 bg-surface-100 dark:bg-dark-800 rounded-3xl flex items-center justify-center text-4xl mb-1">
          🕵️
        </div>
        <h2 className="font-bold text-gray-900 dark:text-white text-xl">Ce profil n'existe pas</h2>
        <p className="text-gray-500 text-xs max-w-xs mb-4">
          Le nom d'utilisateur @{cleanUsername || username} est introuvable sur MANG.
        </p>
        <button
          onClick={() => navigate('/marketplace')}
          className="px-6 py-3 bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Home size={14} /> Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-dark-950 pb-24">
      {/* Top Header Floating Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-2xl bg-black/40 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto active:scale-90 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* 1. HEADER CARD */}
      <ProfileHeaderCard
        profile={profile}
        shop={shop}
        stats={stats}
        isMe={isMe}
        isFollowing={isFollowing}
        onToggleFollow={toggleFollow}
        onOpenFollowers={loadFollowers}
        onOpenFollowing={loadFollowing}
      />

      {/* 2. STICKY TABS NAVIGATION */}
      <ProfileTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          products: products.length,
          posts: posts.length,
          reviews: reviews.length,
        }}
      />

      {/* 3. TAB CONTENU */}
      <main className="animate-fade-in">
        {activeTab === 'products' && (
          <ProfileProductsGrid products={products} shop={shop} profile={profile} />
        )}

        {activeTab === 'posts' && (
          <div className="p-4 max-w-[var(--content-max-width)] mx-auto space-y-3">
            {posts.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                Aucune publication pour le moment.
              </div>
            ) : (
              posts.map(p => (
                <div key={p.id} className="p-4 bg-white dark:bg-dark-900 rounded-3xl border border-surface-200 dark:border-dark-800 space-y-2">
                  <UserLink user={p.user} size="sm" showUsername={true} />
                  <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">{p.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <ProfileReviewsList reviews={reviews} avgRating={stats.avg_rating} />
        )}

        {activeTab === 'about' && (
          <ProfileAboutTab profile={profile} shop={shop} />
        )}
      </main>

      {/* BottomSheet Abonnés */}
      <BottomSheet open={followersSheet} onClose={() => setFollowersSheet(false)} title="👥 Abonnés">
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {followersList.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">Aucun abonné pour le moment</p>
          ) : (
            followersList.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-dark-800">
                <UserLink user={u} size="md" showUsername={true} />
              </div>
            ))
          )}
        </div>
      </BottomSheet>

      {/* BottomSheet Abonnements */}
      <BottomSheet open={followingSheet} onClose={() => setFollowingSheet(false)} title="👤 Abonnements">
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {followingList.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8">Aucun abonnement pour le moment</p>
          ) : (
            followingList.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-dark-800">
                <UserLink user={u} size="md" showUsername={true} />
              </div>
            ))
          )}
        </div>
      </BottomSheet>
    </div>
  )
}

function PublicProfileSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-dark-950 animate-pulse">
      <div className="h-36 bg-surface-200 dark:bg-dark-800" />
      <div className="p-4 space-y-4 -mt-12">
        <div className="w-24 h-24 rounded-full bg-surface-300 dark:bg-dark-700 ring-4 ring-white" />
        <div className="h-6 w-1/3 bg-surface-200 dark:bg-dark-800 rounded-xl" />
        <div className="h-4 w-1/4 bg-surface-200 dark:bg-dark-800 rounded-xl" />
        <div className="h-16 bg-surface-200 dark:bg-dark-800 rounded-2xl" />
      </div>
    </div>
  )
}

class ProfileErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('ProfilePage Error Boundary caught:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-50 dark:bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center text-3xl mb-3">
            ⚠️
          </div>
          <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-1">Affichage du profil temporairement indisponible</h2>
          <p className="text-gray-500 text-xs max-w-xs mb-4">
            Une erreur est survenue lors du chargement des données. Veuillez réessayer.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-emerald-700 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform"
          >
            Recharger la page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function PublicProfilePage() {
  return (
    <ProfileErrorBoundary>
      <PublicProfilePageContent />
    </ProfileErrorBoundary>
  )
}
