import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, UserPlus, UserCheck,
  Store, MessageCircle, Share2, Grid, BookOpen,
  ChevronRight, Heart, Users
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, BottomSheet } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ============================================================
// PAGE PROFIL PUBLIC
// ============================================================
export default function PublicProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile } = useAuthStore()

  const [profile, setProfile]     = useState(null)
  const [posts, setPosts]         = useState([])
  const [shops, setShops]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [tab, setTab]             = useState('posts')
  const [stats, setStats]         = useState({ posts: 0, followers: 0, following: 0 })
  const [followersSheet, setFollowersSheet] = useState(false)
  const [followingSheet, setFollowingSheet] = useState(false)

  const isMe = myProfile?.username === username

  const load = useCallback(async () => {
    setLoading(true)

    // Profil
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!prof) { setLoading(false); return }
    setProfile(prof)

    // Posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, shop:shops(id, name, slug, cover_url)')
      .eq('user_id', prof.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setPosts(postsData || [])

    // Boutiques
    const { data: shopsData } = await supabase
      .from('shops')
      .select('id, name, slug, cover_url, city, followers_count, premium_level, is_active')
      .eq('owner_id', prof.id)
      .eq('is_active', true)
      .order('followers_count', { ascending: false })
    setShops(shopsData || [])

    // Stats followers / following
    const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
    ])
    setStats({
      posts: postsData?.length || 0,
      followers: followersCount || 0,
      following: followingCount || 0,
    })

    // Est-ce que je suis ce profil ?
    if (user && user.id !== prof.id) {
      const { data: followData } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', prof.id)
        .maybeSingle()
      setIsFollowing(!!followData)
    }

    setLoading(false)
  }, [username, user])

  useEffect(() => { load() }, [load])

  const toggleFollow = async () => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    if (isFollowing) {
      const { error } = await supabase.from('user_follows')
        .delete().eq('follower_id', user.id).eq('following_id', profile.id)
      if (error) { toast.error('Erreur'); return }
      setIsFollowing(false)
      setStats(s => ({ ...s, followers: s.followers - 1 }))
    } else {
      const { error } = await supabase.from('user_follows')
        .insert({ follower_id: user.id, following_id: profile.id })
      if (error) { toast.error('Erreur'); return }
      setIsFollowing(true)
      setStats(s => ({ ...s, followers: s.followers + 1 }))
      // Notification
      await supabase.rpc('create_notification', {
        p_user_id: profile.id,
        p_type: 'user_follow',
        p_title: '👤 Nouveau follower',
        p_body: `@${myProfile?.username} vous suit maintenant`,
        p_reference_id: user.id,
        p_reference_type: 'profile',
      })
      toast.success(`Vous suivez @${profile.username} !`)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: `@${profile?.username} sur MANG`, url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Lien copié !')
    }
  }

  const handleMessage = () => {
    navigate('/messages')
    // TODO: ouvrir directement la conv avec ce user
  }

  if (loading) return <PublicProfileSkeleton/>

  if (!profile) return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center gap-4">
      <p className="text-5xl">🕵️</p>
      <p className="font-bold text-dark-800 text-lg">Profil introuvable</p>
      <button onClick={() => navigate(-1)}
        className="px-5 py-2.5 rounded-2xl bg-primary-600 text-white font-bold text-sm">
        Retour
      </button>
    </div>
  )

  const isOnline = profile.last_seen_at
    ? (new Date() - new Date(profile.last_seen_at)) < 120000 : false

  return (
    <div className="min-h-screen bg-surface-50">

      {/* HEADER COVER */}
      <div className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 pt-12 pb-24 overflow-hidden">
        {/* Pattern décoratif */}
        <div className="absolute inset-0 opacity-5"
          style={{backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)',backgroundSize:'20px 20px'}}/>
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gold-400/10 blur-3xl"/>

        {/* Barre nav */}
        <div className="relative flex items-center justify-between px-4 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90">
            <ArrowLeft size={18} className="text-white"/>
          </button>
          <button onClick={handleShare}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90">
            <Share2 size={16} className="text-white"/>
          </button>
        </div>

        {/* Avatar + infos */}
        <div className="relative flex flex-col items-center px-4">
          <div className="relative mb-3">
            <Avatar src={profile.avatar_url} name={profile.username} size="2xl"
              className="ring-4 ring-white/30 shadow-xl"/>
            {isOnline && (
              <div className="absolute bottom-1 right-1 flex items-center gap-1 px-2 py-0.5 bg-emerald-500 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>
                <span className="text-white text-[9px] font-bold">En ligne</span>
              </div>
            )}
          </div>
          <h1 className="font-display text-xl text-white font-bold">
            {profile.full_name || profile.username}
          </h1>
          <p className="text-primary-200 text-sm">@{profile.username}</p>
          {profile.city && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-primary-300"/>
              <span className="text-primary-300 text-xs">{profile.city}</span>
            </div>
          )}
        </div>
      </div>

      {/* STATS + ACTIONS — carte flottante */}
      <div className="relative -mt-14 mx-4 z-10">
        <div className="bg-white rounded-3xl shadow-modal p-4">

          {/* Stats */}
          <div className="flex items-center justify-around mb-4">
            <button className="flex flex-col items-center gap-0.5">
              <span className="font-display font-bold text-xl text-dark-800">{stats.posts}</span>
              <span className="text-dark-600/50 text-xs font-medium">Posts</span>
            </button>
            <div className="w-px h-8 bg-surface-200"/>
            <button onClick={() => setFollowersSheet(true)} className="flex flex-col items-center gap-0.5">
              <span className="font-display font-bold text-xl text-dark-800">{stats.followers}</span>
              <span className="text-dark-600/50 text-xs font-medium">Abonnés</span>
            </button>
            <div className="w-px h-8 bg-surface-200"/>
            <button onClick={() => setFollowingSheet(true)} className="flex flex-col items-center gap-0.5">
              <span className="font-display font-bold text-xl text-dark-800">{stats.following}</span>
              <span className="text-dark-600/50 text-xs font-medium">Abonnements</span>
            </button>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-dark-700 text-sm text-center mb-4 leading-relaxed">{profile.bio}</p>
          )}

          {/* Boutons actions */}
          {!isMe && (
            <div className="flex gap-2">
              <button onClick={toggleFollow}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95',
                  isFollowing
                    ? 'bg-surface-100 text-dark-700'
                    : 'bg-primary-600 text-white shadow-green'
                )}>
                {isFollowing
                  ? <><UserCheck size={15}/> Suivi</>
                  : <><UserPlus size={15}/> Suivre</>}
              </button>
              <button onClick={handleMessage}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-surface-100 text-dark-700 text-sm font-bold active:scale-95">
                <MessageCircle size={15}/> Message
              </button>
            </div>
          )}
          {isMe && (
            <button onClick={() => navigate('/profil')}
              className="w-full py-2.5 rounded-2xl bg-surface-100 text-dark-700 text-sm font-bold active:scale-95">
              ✏️ Modifier mon profil
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex mx-4 mt-4 bg-white rounded-2xl p-1 shadow-card gap-1">
        {[
          { key: 'posts', label: '📢 Posts', count: stats.posts },
          { key: 'shops', label: '🏪 Boutiques', count: shops.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx(
              'flex-1 py-2 rounded-xl text-sm font-bold transition-all',
              tab === t.key ? 'bg-primary-600 text-white shadow-sm' : 'text-dark-600'
            )}>
            {t.label}
            {t.count > 0 && (
              <span className={clsx('ml-1.5 text-xs', tab === t.key ? 'text-white/80' : 'text-dark-600/40')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CONTENU TABS */}
      <div className="mx-4 mt-3 pb-28">
        {tab === 'posts' && (
          <div>
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl shadow-card">
                <p className="text-4xl mb-2">📢</p>
                <p className="font-bold text-dark-800">Aucune publication</p>
                <p className="text-dark-600/50 text-sm mt-1">
                  {isMe ? 'Partagez quelque chose !' : `@${profile.username} n'a pas encore publié`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => (
                  <MiniPostCard key={post.id} post={post}/>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'shops' && (
          <div>
            {shops.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl shadow-card">
                <p className="text-4xl mb-2">🏪</p>
                <p className="font-bold text-dark-800">Aucune boutique</p>
                <p className="text-dark-600/50 text-sm mt-1">
                  {isMe ? 'Créez votre boutique !' : `@${profile.username} n'a pas encore de boutique`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {shops.map(shop => (
                  <MiniShopCard key={shop.id} shop={shop}/>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Followers Sheet */}
      <FollowSheet
        open={followersSheet}
        onClose={() => setFollowersSheet(false)}
        profileId={profile.id}
        type="followers"
        title="👥 Abonnés"
      />
      <FollowSheet
        open={followingSheet}
        onClose={() => setFollowingSheet(false)}
        profileId={profile.id}
        type="following"
        title="👤 Abonnements"
      />
    </div>
  )
}

// ============================================================
// MINI POST CARD
// ============================================================
function MiniPostCard({ post }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      {post.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden">
          <img src={post.image_url} alt="post" className="w-full max-h-52 object-cover"/>
        </div>
      )}
      {post.content && (
        <p className="text-dark-800 text-sm leading-relaxed">{post.content}</p>
      )}
      {post.shop && (
        <div className="mt-2 flex items-center gap-2 p-2 bg-primary-50 rounded-xl">
          <Store size={12} className="text-primary-600"/>
          <span className="text-primary-700 text-xs font-semibold truncate">{post.shop.name}</span>
        </div>
      )}
      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-surface-100">
        <div className="flex items-center gap-1 text-xs text-dark-600/50">
          <Heart size={12} className="text-red-400"/>
          <span>{post.likes_count || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-dark-600/50">
          <MessageCircle size={12} className="text-primary-400"/>
          <span>{post.comments_count || 0}</span>
        </div>
        <span className="ml-auto text-[10px] text-dark-600/30">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// MINI SHOP CARD
// ============================================================
function MiniShopCard({ shop }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(`/boutique/${shop.slug}`)}
      className="w-full bg-white rounded-2xl shadow-card overflow-hidden active:scale-[0.98] transition-transform text-left flex">
      <div className="w-20 h-20 flex-shrink-0 bg-primary-100">
        {shop.cover_url
          ? <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">🌿</div>
        }
      </div>
      <div className="flex-1 min-w-0 p-3">
        <p className="font-bold text-dark-800 text-sm truncate">{shop.name}</p>
        {shop.city && <p className="text-dark-600/50 text-xs mt-0.5">📍 {shop.city}</p>}
        <div className="flex items-center gap-1 mt-1.5">
          <Users size={10} className="text-primary-500"/>
          <span className="text-dark-600/50 text-xs">{shop.followers_count || 0} abonnés</span>
        </div>
      </div>
      <div className="flex items-center pr-3">
        <ChevronRight size={16} className="text-dark-600/30"/>
      </div>
    </button>
  )
}

// ============================================================
// FOLLOW SHEET — liste abonnés / abonnements
// ============================================================
function FollowSheet({ open, onClose, profileId, type, title }) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const query = type === 'followers'
      ? supabase.from('user_follows').select('user:profiles!follower_id(id, username, avatar_url, city)').eq('following_id', profileId)
      : supabase.from('user_follows').select('user:profiles!following_id(id, username, avatar_url, city)').eq('follower_id', profileId)

    query.then(({ data }) => {
      setPeople((data || []).map(d => d.user).filter(Boolean))
      setLoading(false)
    })
  }, [open, profileId, type])

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="px-4 py-2 pb-8" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl skeleton"/>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 skeleton rounded-lg w-1/3"/>
                  <div className="h-3 skeleton rounded-lg w-1/4"/>
                </div>
              </div>
            ))}
          </div>
        ) : people.length === 0 ? (
          <p className="text-center text-dark-600/50 py-8">Aucun résultat</p>
        ) : (
          <div className="space-y-3">
            {people.map(person => (
              <button key={person.id}
                onClick={() => { navigate(`/profil/${person.username}`); onClose() }}
                className="w-full flex items-center gap-3 active:opacity-70">
                <Avatar src={person.avatar_url} name={person.username} size="md"/>
                <div className="text-left">
                  <p className="font-bold text-dark-800 text-sm">@{person.username}</p>
                  {person.city && <p className="text-dark-600/40 text-xs">📍 {person.city}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

// ============================================================
// SKELETON
// ============================================================
function PublicProfileSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50">
      <div className="bg-primary-800 pb-24 pt-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-3xl skeleton"/>
          <div className="w-36 h-5 skeleton rounded-xl"/>
          <div className="w-24 h-4 skeleton rounded-lg"/>
        </div>
      </div>
      <div className="relative -mt-14 mx-4 space-y-3">
        <div className="h-36 skeleton rounded-3xl"/>
        <div className="h-12 skeleton rounded-2xl"/>
        <div className="h-48 skeleton rounded-2xl"/>
      </div>
    </div>
  )
}
