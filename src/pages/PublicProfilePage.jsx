import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserCheck, UserPlus, X } from 'lucide-react'
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

  const cachedProfile = useCacheStore.getState().membersCache[username] || null

  const [profile, setProfile] = useState(cachedProfile)
  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [posts, setPosts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(!cachedProfile)
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

  const isMe = myProfile?.username === username

  const loadData = useCallback(async () => {
    if (!username) return
    if (!useCacheStore.getState().membersCache[username]) {
      setLoading(true)
    }

    try {
      // 1. Tenter RPC v2.5 haute performance
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_public_profile_v25', { p_username: username })

      let profData = null
      let shopData = null
      let statsData = null

      if (!rpcErr && rpcData?.profile) {
        profData = rpcData.profile
        shopData = rpcData.shop
        statsData = rpcData.stats
      } else {
        // Fallback REST si RPC non déployé
        const { data: p } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle()
        if (!p) { setLoading(false); return }
        profData = p

        const { data: s } = await supabase.from('shops').select('*').eq('owner_id', p.id).eq('is_active', true).maybeSingle()
        shopData = s

        const [{ count: fers }, { count: fing }, { count: postCnt }] = await Promise.all([
          supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', p.id),
          supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', p.id),
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', p.id),
        ])

        statsData = {
          followers_count: fers || 0,
          following_count: fing || 0,
          posts_count: postCnt || 0,
          products_count: 0,
          avg_rating: 5.0,
          reviews_count: 0
        }
      }

      setProfile(profData)
      setShop(shopData)
      setStats(statsData)
      useCacheStore.getState().setMembers(username, profData)

      // 2. Charger les Produits si boutique présente
      if (shopData?.id) {
        const { data: prods } = await supabase
          .from('products')
          .select('*')
          .eq('shop_id', shopData.id)
          .eq('is_available', true)
          .order('created_at', { ascending: false })
        setProducts(prods || [])
        setStats(prev => ({ ...prev, products_count: prods?.length || 0 }))

        // Avis
        const { data: revs } = await supabase
          .from('shop_reviews')
          .select('*, user:profiles(*)')
          .eq('shop_id', shopData.id)
          .order('created_at', { ascending: false })
        setReviews(revs || [])
      }

      // 3. Charger les Posts
      if (profData?.id) {
        const { data: psts } = await supabase
          .from('posts')
          .select('*, user:profiles(*), shop:shops(*)')
          .eq('user_id', profData.id)
          .order('created_at', { ascending: false })
        setPosts(psts || [])
      }

      // 4. Vérifier si je suis abonné
      if (user && profData?.id && user.id !== profData.id) {
        const { data: f } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profData.id)
          .maybeSingle()
        setIsFollowing(!!f)
      }
    } catch (e) {
      console.error('Erreur chargement profil public:', e)
    } finally {
      setLoading(false)
    }
  }, [username, user])

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

  if (loading) return <PublicProfileSkeleton />

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-dark-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-20 h-20 bg-surface-100 dark:bg-dark-800 rounded-3xl flex items-center justify-center text-4xl mb-2">
          🕵️
        </div>
        <h2 className="font-bold text-gray-900 dark:text-white text-xl">Profil introuvable</h2>
        <p className="text-gray-500 text-xs max-w-xs">
          Le profil @{username} n'existe pas ou n'est pas accessible actuellement.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-emerald-700 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform"
        >
          Retourner en arrière
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
