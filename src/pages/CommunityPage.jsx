import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Heart, MessageCircle, Share2, Users, Search,
  UserPlus, UserCheck, MoreHorizontal, Trash2,
  CornerDownRight, X, Send, ChevronDown,
  Flame, TrendingUp, Globe, Store, Image,
  Smile, MapPin, ChevronRight, Sparkles
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, BottomSheet } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useNavigate, useLocation } from 'react-router-dom'

// ============================================================
// TABS
// ============================================================
const TABS = [
  { key: 'feed',    label: '🌍 Pour toi'     },
  { key: 'following', label: '👥 Abonnements' },
  { key: 'trending',  label: '🔥 Tendances'   },
  { key: 'members',   label: '🌿 Membres'     },
]

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function CommunityPage() {
  const { user, profile } = useAuthStore()
  const [tab, setTab] = useState('feed')
  const tabsRef = useRef()

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 pt-12 pb-0 px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-2xl text-white font-bold">Communauté</h1>
            <p className="text-primary-200 text-xs">🌿 MANG — Ensemble, on grandit</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <Flame size={18} className="text-gold-300"/>
          </div>
        </div>
        {/* Tabs scrollables */}
        <div ref={tabsRef} className="flex gap-1 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx(
                'flex-shrink-0 px-4 py-2 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap',
                tab === t.key
                  ? 'bg-surface-50 text-primary-700'
                  : 'text-white/70 hover:text-white'
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENU */}
      <div className="flex-1 overflow-y-auto pb-28">
        {tab === 'feed'      && <PostsTab user={user} profile={profile} mode="feed"/>}
        {tab === 'following' && <PostsTab user={user} profile={profile} mode="following"/>}
        {tab === 'trending'  && <PostsTab user={user} profile={profile} mode="trending"/>}
        {tab === 'members'   && <MembersTab user={user} profile={profile}/>}
      </div>
    </div>
  )
}

// ============================================================
// ONGLET PUBLICATIONS (feed / following / trending)
// ============================================================
function PostsTab({ user, profile, mode }) {
  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [likedPosts, setLikedPosts]     = useState(new Set())
  const [commentsPost, setCommentsPost] = useState(null)
  const [likersPost, setLikersPost]     = useState(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [page, setPage]                 = useState(0)
  const [hasMore, setHasMore]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const PAGE_SIZE = 20
  const location = useLocation()

  // Ouvrir commentaires automatiquement depuis notification
  useEffect(() => {
    if (location.state?.openPostId && posts.length > 0) {
      const target = posts.find(p => p.id === location.state.openPostId)
      if (target) {
        setCommentsPost(target)
        window.history.replaceState({}, '')
      }
    }
  }, [location.state?.openPostId, posts])

  const buildQuery = useCallback((from = 0) => {
    let q = supabase
      .from('posts')
      .select(`*, user:profiles(id, username, avatar_url, last_seen_at), shop:shops(id, name, slug, cover_url, city, has_delivery, premium_level, owner:profiles(username, avatar_url))`)
      .range(from, from + PAGE_SIZE - 1)

    if (mode === 'trending') {
      q = q.order('likes_count', { ascending: false }).order('created_at', { ascending: false })
    } else {
      q = q.order('created_at', { ascending: false })
    }
    return q
  }, [mode])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setPage(0)
    setHasMore(true)

    let q = buildQuery(0)

    if (mode === 'following' && user) {
      const { data: follows } = await supabase
        .from('user_follows').select('following_id').eq('follower_id', user.id)
      const ids = (follows || []).map(f => f.following_id)
      if (ids.length === 0) { setPosts([]); setLoading(false); return }
      q = q.in('user_id', ids)
    }

    const { data } = await q
    if (!data) { setLoading(false); return }

    if (user) {
      if (user?.id) {
        const { data: myLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
        setLikedPosts(new Set((myLikes || []).map(l => l.post_id)))
      }
    }

    setPosts(data)
    setHasMore(data.length === PAGE_SIZE)
    setLoading(false)
  }, [user, mode, buildQuery])

  useEffect(() => { loadPosts() }, [loadPosts])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const { data } = await buildQuery(nextPage * PAGE_SIZE)
    if (data && data.length > 0) {
      setPosts(prev => [...prev, ...data])
      setPage(nextPage)
      setHasMore(data.length === PAGE_SIZE)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`community-${mode}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        if (mode === 'trending') return
        const { data: p } = await supabase
          .from('posts')
          .select(`*, user:profiles(id, username, avatar_url, last_seen_at), shop:shops(id, name, slug, cover_url, city, has_delivery, premium_level, owner:profiles(username, avatar_url))`)
          .eq('id', payload.new.id).single()
        if (p) setPosts(prev => [p, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        // Only update counts, never overwrite the full post object (would break liked state)
        setPosts(prev => prev.map(p => p.id === payload.new.id
          ? { ...p, likes_count: payload.new.likes_count, comments_count: payload.new.comments_count }
          : p
        ))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [mode])

  const toggleLike = async (postId) => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    const isLiked = likedPosts.has(postId)
    if (isLiked) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      if (error) { toast.error('Erreur'); return }
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s })
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
      if (error) { toast.error('Erreur'); return }
      setLikedPosts(prev => new Set([...prev, postId]))
      const post = posts.find(p => p.id === postId)
      if (post && post.user_id !== user.id) {
        await supabase.rpc('create_notification', {
          p_user_id: post.user_id,
          p_type: 'post_like',
          p_title: '❤️ Nouveau like',
          p_body: `@${profile?.username} a aimé votre publication`,
          p_reference_id: postId,
          p_reference_type: 'post',
        })
      }
    }
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ))
  }

  const deletePost = async (postId) => {
    if (!confirm('Supprimer cette publication ?')) return
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) { toast.error('Erreur suppression'); return }
    toast.success('Publication supprimée')
  }

  const onPostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev])
    setComposerOpen(false)
  }

  return (
    <div>
      {/* Composer déclencheur */}
      <div className="bg-white border-b border-surface-100 px-4 py-3">
        <button onClick={() => user ? setComposerOpen(true) : toast.error('Connectez-vous d\'abord')}
          className="w-full flex items-center gap-3">
          <Avatar src={profile?.avatar_url} name={profile?.username} size="md" className="flex-shrink-0"/>
          <div className="flex-1 text-left bg-surface-100 rounded-2xl px-4 py-2.5">
            <span className="text-dark-600/40 text-sm font-medium">Exprimez-vous... 🌿</span>
          </div>
        </button>
        {/* Boutons raccourcis */}
        <div className="flex gap-2 mt-2.5 ml-1">
          <button onClick={() => user ? setComposerOpen(true) : toast.error('Connectez-vous d\'abord')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 text-xs font-semibold text-dark-600">
            <Image size={13} className="text-primary-500"/> Photo
          </button>
          <button onClick={() => user ? setComposerOpen(true) : toast.error('Connectez-vous d\'abord')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 text-xs font-semibold text-dark-600">
            <Store size={13} className="text-primary-500"/> Boutique
          </button>
          <button onClick={() => user ? setComposerOpen(true) : toast.error('Connectez-vous d\'abord')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 text-xs font-semibold text-dark-600">
            <MapPin size={13} className="text-primary-500"/> Lieu
          </button>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-3 p-4">
          {[1,2,3].map(i => <PostSkeleton key={i}/>)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-3">{mode === 'following' ? '👥' : '🌿'}</p>
          <p className="font-display text-xl font-bold text-dark-800">
            {mode === 'following' ? 'Aucune publication' : 'Soyez le premier !'}
          </p>
          <p className="text-dark-600/50 text-sm mt-2">
            {mode === 'following' ? 'Abonnez-vous à des membres pour voir leurs posts' : 'Partagez quelque chose avec la communauté'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-surface-100">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              userId={user?.id}
              isLiked={likedPosts.has(post.id)}
              onLike={() => toggleLike(post.id)}
              onComment={() => setCommentsPost(post)}
              onLikers={() => setLikersPost(post)}
              onDelete={() => deletePost(post.id)}
            />
          ))}
          {/* Load more */}
          {hasMore && (
            <div className="py-4 flex justify-center">
              <button onClick={loadMore} disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-surface-100 text-sm font-semibold text-dark-600 active:scale-95 disabled:opacity-50">
                {loadingMore
                  ? <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>
                  : <ChevronDown size={16}/>}
                {loadingMore ? 'Chargement...' : 'Voir plus'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Composer bottomsheet */}
      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        user={user}
        profile={profile}
        onPosted={onPostCreated}
      />

      {/* Comments sheet */}
      {commentsPost && (
        <CommentsSheet
          post={commentsPost}
          open={!!commentsPost}
          onClose={() => setCommentsPost(null)}
          user={user}
          profile={profile}
        />
      )}

      {/* Likers sheet */}
      {likersPost && (
        <LikersSheet
          post={likersPost}
          open={!!likersPost}
          onClose={() => setLikersPost(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// COMPOSER — Créer une publication
// ============================================================
function PostComposer({ open, onClose, user, profile, onPosted }) {
  const [content, setContent]       = useState('')
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedShop, setSelectedShop] = useState(null)
  const [shopPickerOpen, setShopPickerOpen] = useState(false)
  const [posting, setPosting]       = useState(false)
  const fileRef = useRef()

  const reset = () => {
    setContent('')
    setImageFile(null)
    setImagePreview(null)
    setSelectedShop(null)
    setPosting(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const publish = async () => {
    if (!content.trim() && !imageFile && !selectedShop) {
      toast.error('Écris quelque chose ou ajoute une photo !'); return
    }
    setPosting(true)

    let imageUrl = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `posts/${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('posts').upload(path, imageFile)
      if (uploadErr) { toast.error('Erreur upload image'); setPosting(false); return }
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const { data: post, error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim(),
      image_url: imageUrl,
      shop_id: selectedShop?.id || null,
    }).select(`*, user:profiles(id, username, avatar_url, last_seen_at), shop:shops(id, name, slug, cover_url, city, has_delivery, premium_level, owner:profiles(username, avatar_url))`).single()

    setPosting(false)
    if (error) { toast.error('Erreur publication'); return }
    toast.success('Publié ! 🌿')
    onPosted(post)
    reset()
  }

  const canPublish = (content.trim() || imageFile || selectedShop) && !posting

  return (
    <BottomSheet open={open} onClose={handleClose} title="✍️ Nouvelle publication">
      <div className="px-4 pt-2 pb-4 flex flex-col gap-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>

        {/* Auteur */}
        <div className="flex items-center gap-3">
          <Avatar src={profile?.avatar_url} name={profile?.username} size="md"/>
          <div>
            <p className="font-bold text-dark-800 text-sm">@{profile?.username}</p>
            <p className="text-dark-600/40 text-xs">Visible par tous</p>
          </div>
        </div>

        {/* Texte */}
        <textarea
          placeholder="Quoi de neuf dans ton champ ? 🌿"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          className="w-full bg-surface-50 rounded-2xl px-4 py-3 text-sm text-dark-800 placeholder-dark-600/40 outline-none resize-none font-medium border border-surface-200 focus:border-primary-400 transition-colors"
        />

        {/* Preview image */}
        {imagePreview && (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-2xl"/>
            <button onClick={() => { setImageFile(null); setImagePreview(null) }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
              <X size={14} className="text-white"/>
            </button>
          </div>
        )}

        {/* Boutique sélectionnée */}
        {selectedShop && (
          <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-2xl border border-primary-100">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-primary-100">
              {selectedShop.cover_url
                ? <img src={selectedShop.cover_url} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center text-xl">🏪</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-dark-800 text-sm truncate">{selectedShop.name}</p>
              <p className="text-dark-600/50 text-xs">@{selectedShop.owner?.username}</p>
            </div>
            <button onClick={() => setSelectedShop(null)}
              className="w-7 h-7 rounded-full bg-primary-200 flex items-center justify-center">
              <X size={13} className="text-primary-700"/>
            </button>
          </div>
        )}

        {/* Barre d'outils */}
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage}/>
          <button onClick={() => fileRef.current?.click()}
            className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95',
              imageFile ? 'bg-primary-500 text-white' : 'bg-surface-100 text-dark-600')}>
            <Image size={14}/> Photo
          </button>
          <button onClick={() => setShopPickerOpen(true)}
            className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95',
              selectedShop ? 'bg-primary-500 text-white' : 'bg-surface-100 text-dark-600')}>
            <Store size={14}/> Boutique
          </button>
        </div>

        {/* Bouton publier */}
        <button onClick={publish} disabled={!canPublish}
          className="w-full py-3.5 rounded-2xl bg-primary-600 text-white font-bold text-sm shadow-green active:scale-[0.98] disabled:opacity-40 transition-all flex items-center justify-center gap-2">
          {posting
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Publication...</>
            : <><Sparkles size={16}/> Publier</>}
        </button>
      </div>

      {/* Shop Picker */}
      <ShopPicker
        open={shopPickerOpen}
        onClose={() => setShopPickerOpen(false)}
        onSelect={(shop) => { setSelectedShop(shop); setShopPickerOpen(false) }}
      />
    </BottomSheet>
  )
}

// ============================================================
// SHOP PICKER — Sélectionner une boutique à mentionner
// ============================================================
function ShopPicker({ open, onClose, onSelect }) {
  const [shops, setShops]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const debounce = useRef()

  const loadShops = useCallback(async (q = '') => {
    setLoading(true)
    let query = supabase
      .from('shops')
      .select('id, name, slug, cover_url, city, has_delivery, premium_level, owner:profiles(username, avatar_url)')
      .eq('is_active', true)
      .order('followers_count', { ascending: false })
      .limit(30)
    if (q.trim()) query = query.ilike('name', `%${q}%`)
    const { data } = await query
    setShops(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (open) loadShops() }, [open, loadShops])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => loadShops(val), 300)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="🏪 Mentionner une boutique">
      <div className="flex flex-col" style={{ height: '65vh' }}>
        {/* Recherche */}
        <div className="px-4 py-3 border-b border-surface-100">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40"/>
            <input
              type="text"
              placeholder="Rechercher une boutique..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-100 rounded-2xl text-sm text-dark-800 placeholder-dark-600/40 outline-none font-medium"
              autoFocus
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-12 h-12 rounded-xl skeleton flex-shrink-0"/>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 skeleton rounded-lg w-1/2"/>
                    <div className="h-3 skeleton rounded-lg w-1/3"/>
                  </div>
                </div>
              ))}
            </div>
          ) : shops.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">🏪</p>
              <p className="text-dark-600/50 text-sm">Aucune boutique trouvée</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {shops.map(shop => (
                <button key={shop.id} onClick={() => onSelect(shop)}
                  className="w-full flex items-center gap-3 py-3 active:bg-surface-50 rounded-xl text-left">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-primary-100">
                    {shop.cover_url
                      ? <img src={shop.cover_url} className="w-full h-full object-cover" alt={shop.name}/>
                      : <div className="w-full h-full flex items-center justify-center text-xl">🌿</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-dark-800 text-sm truncate">{shop.name}</p>
                    <p className="text-dark-600/40 text-xs">@{shop.owner?.username}</p>
                    {shop.city && <p className="text-dark-600/30 text-[10px]">📍 {shop.city}</p>}
                  </div>
                  <ChevronRight size={16} className="text-dark-600/30 flex-shrink-0"/>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

// ============================================================
// POST CARD
// ============================================================
function PostCard({ post, userId, isLiked, onLike, onComment, onLikers, onDelete }) {
  const navigate = useNavigate()
  const isOwner = post.user_id === userId
  const isOnline = post.user?.last_seen_at
    ? (new Date() - new Date(post.user.last_seen_at)) < 120000 : false
  const [menuOpen, setMenuOpen] = useState(false)

  const handleShare = () => {
    const text = post.content || 'Regarde cette publication sur MANG !'
    if (navigator.share) {
      navigator.share({ title: 'MANG Communauté', text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Copié !')
    }
  }

  return (
    <div className="bg-white px-4 py-3">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <button onClick={() => navigate(`/profil/${post.user?.username}`)} className="relative flex-shrink-0">
          <Avatar src={post.user?.avatar_url} name={post.user?.username} size="md"/>
          {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"/>}
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => navigate(`/profil/${post.user?.username}`)}>
            <p className="font-bold text-dark-800 text-sm">@{post.user?.username}</p>
          </button>
          <p className="text-dark-600/40 text-xs">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
          </p>
        </div>
        {isOwner && (
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 rounded-xl bg-surface-100 flex items-center justify-center active:scale-90">
              <MoreHorizontal size={16} className="text-dark-600/50"/>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}/>
                <div className="absolute right-0 top-10 z-20 bg-white rounded-2xl shadow-modal border border-surface-100 overflow-hidden min-w-[140px] animate-scale-in">
                  <button onClick={() => { onDelete(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                    <Trash2 size={14}/> Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Texte */}
      {post.content && (
        <p className="text-dark-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
      )}

      {/* Image */}
      {post.image_url && (
        <div className="mb-3 -mx-1 rounded-2xl overflow-hidden">
          <img src={post.image_url} alt="post" className="w-full max-h-80 object-cover"/>
        </div>
      )}

      {/* Carte boutique mentionnée */}
      {post.shop && (
        <button onClick={() => navigate(`/boutique/${post.shop.slug}`)}
          className="w-full mb-3 flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-2xl border border-primary-100 active:scale-[0.98] transition-transform text-left">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-primary-200">
            {post.shop.cover_url
              ? <img src={post.shop.cover_url} className="w-full h-full object-cover" alt={post.shop.name}/>
              : <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Store size={11} className="text-primary-600 flex-shrink-0"/>
              <span className="text-primary-600 text-[10px] font-bold uppercase tracking-wide">Boutique recommandée</span>
            </div>
            <p className="font-bold text-dark-800 text-sm truncate">{post.shop.name}</p>
            <p className="text-dark-600/50 text-xs">@{post.shop.owner?.username}
              {post.shop.city && <span> · 📍 {post.shop.city}</span>}
              {post.shop.has_delivery && <span className="text-primary-600"> · 🚚 Livraison</span>}
            </p>
          </div>
          <ChevronRight size={16} className="text-primary-400 flex-shrink-0"/>
        </button>
      )}

      {/* Stats */}
      {(post.likes_count > 0 || post.comments_count > 0) && (
        <div className="flex items-center justify-between py-2 border-b border-surface-100 mb-1">
          <button onClick={onLikers} className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <Heart size={11} className="text-white fill-white"/>
            </div>
            <span className="text-dark-600/60 text-xs font-medium">{post.likes_count || 0}</span>
          </button>
          {post.comments_count > 0 && (
            <button onClick={onComment} className="text-dark-600/60 text-xs font-medium">
              {post.comments_count} commentaire{post.comments_count > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        {[
          { icon: Heart, label: "J'aime", active: isLiked, activeClass: 'text-red-500 bg-red-50', onClick: onLike, filled: isLiked },
          { icon: MessageCircle, label: 'Commenter', active: false, activeClass: '', onClick: onComment },
          { icon: Share2, label: 'Partager', active: false, activeClass: '', onClick: handleShare },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95',
              btn.active ? btn.activeClass : 'text-dark-600/60 hover:bg-surface-100'
            )}>
            <btn.icon size={17} className={clsx(btn.active && 'fill-current')} strokeWidth={btn.active ? 0 : 1.8}/>
            <span className="text-xs">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// COMMENTS SHEET
// ============================================================
function CommentsSheet({ open, onClose, post, user, profile }) {
  const [comments, setComments]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [text, setText]           = useState('')
  const [replyTo, setReplyTo]     = useState(null)
  const [sending, setSending]     = useState(false)
  const [likedComments, setLikedComments] = useState(new Set())
  const [expandedReplies, setExpandedReplies] = useState(new Set())
  const inputRef = useRef()
  const bottomRef = useRef()

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('post_comments')
      .select(`
        *,
        user:profiles(id, username, avatar_url),
        replies:post_comments(
          *,
          user:profiles(id, username, avatar_url)
        )
      `)
      .eq('post_id', post.id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    setComments(data || [])

    // Charger mes likes de commentaires
    if (user) {
      const allIds = (data || []).flatMap(c => [c.id, ...(c.replies || []).map(r => r.id)])
      if (allIds.length > 0) {
        const { data: myLikes } = await supabase
          .from('post_comment_likes').select('comment_id').eq('user_id', user.id).in('comment_id', allIds)
        setLikedComments(new Set((myLikes || []).map(l => l.comment_id)))
      }
    }
    setLoading(false)
  }, [post.id, user])

  useEffect(() => { if (open) { setLoading(true); loadComments() } }, [open, loadComments])

  const sendComment = async () => {
    if (!text.trim() || sending || !user) return
    setSending(true)
    const { error } = await supabase.from('post_comments').insert({
      post_id: post.id,
      user_id: user.id,
      content: text.trim(),
      parent_id: replyTo?.id || null,
    })
    setSending(false)
    if (error) { toast.error('Erreur envoi'); return }
    // Notification à l'auteur du post
    if (post.user_id !== user.id) {
      await supabase.rpc('create_notification', {
        p_user_id: post.user_id,
        p_type: 'shop_comment',
        p_title: '💬 Nouveau commentaire',
        p_body: `@${profile?.username} a commenté votre publication`,
        p_reference_id: post.id,
        p_reference_type: 'post',
      })
    }
    setText('')
    setReplyTo(null)
    loadComments()
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
  }

  const deleteComment = async (commentId) => {
    if (!confirm('Supprimer ce commentaire ?')) return
    await supabase.from('post_comments').delete().eq('id', commentId)
    loadComments()
  }

  const toggleCommentLike = async (commentId) => {
    if (!user) return
    const isLiked = likedComments.has(commentId)
    if (isLiked) {
      await supabase.from('post_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
      setLikedComments(prev => { const s = new Set(prev); s.delete(commentId); return s })
    } else {
      await supabase.from('post_comment_likes').insert({ comment_id: commentId, user_id: user.id })
      setLikedComments(prev => new Set([...prev, commentId]))
    }
    // Mettre à jour le count localement
    setComments(prev => prev.map(c => {
      if (c.id === commentId) return { ...c, likes_count: (c.likes_count || 0) + (isLiked ? -1 : 1) }
      return { ...c, replies: (c.replies || []).map(r =>
        r.id === commentId ? { ...r, likes_count: (r.likes_count || 0) + (isLiked ? -1 : 1) } : r
      )}
    }))
  }

  const toggleReplies = (id) => {
    setExpandedReplies(prev => {
      const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
    })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="💬 Commentaires">
      <div className="flex flex-col" style={{ height: '72vh' }}>
        {/* Post résumé */}
        <div className="px-4 py-2 bg-surface-50 border-b border-surface-100">
          <div className="flex gap-2 items-center">
            <Avatar src={post.user?.avatar_url} name={post.user?.username} size="sm"/>
            <p className="text-dark-800 text-xs line-clamp-2 flex-1 font-medium">{post.content || '📷 Photo'}</p>
          </div>
        </div>

        {/* Commentaires */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">💬</p>
              <p className="text-dark-600/50 text-sm">Soyez le premier à commenter</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  userId={user?.id}
                  isLiked={likedComments.has(comment.id)}
                  onLike={() => toggleCommentLike(comment.id)}
                  onReply={() => { setReplyTo({ id: comment.id, username: comment.user?.username }); inputRef.current?.focus() }}
                  onDelete={() => deleteComment(comment.id)}
                />
                {comment.replies?.length > 0 && (
                  <div className="ml-10 mt-1.5">
                    <button onClick={() => toggleReplies(comment.id)}
                      className="flex items-center gap-1 text-xs text-primary-600 font-semibold mb-2">
                      <ChevronDown size={13} className={clsx('transition-transform', expandedReplies.has(comment.id) && 'rotate-180')}/>
                      {expandedReplies.has(comment.id)
                        ? 'Masquer les réponses'
                        : `Voir ${comment.replies.length} réponse${comment.replies.length > 1 ? 's' : ''}`}
                    </button>
                    {expandedReplies.has(comment.id) && (
                      <div className="space-y-2 border-l-2 border-surface-200 pl-3">
                        {comment.replies.map(reply => (
                          <CommentItem
                            key={reply.id}
                            comment={reply}
                            userId={user?.id}
                            isLiked={likedComments.has(reply.id)}
                            onLike={() => toggleCommentLike(reply.id)}
                            isReply
                            onReply={() => { setReplyTo({ id: comment.id, username: reply.user?.username }); inputRef.current?.focus() }}
                            onDelete={() => deleteComment(reply.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Saisie */}
        <div className="border-t border-surface-100 px-4 py-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-primary-50 rounded-xl">
              <CornerDownRight size={13} className="text-primary-600"/>
              <span className="text-primary-700 text-xs font-semibold flex-1">Répondre à @{replyTo.username}</span>
              <button onClick={() => setReplyTo(null)}><X size={13} className="text-primary-500"/></button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Avatar src={profile?.avatar_url} name={profile?.username} size="sm" className="flex-shrink-0"/>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendComment()}
                placeholder={replyTo ? `Répondre à @${replyTo.username}...` : 'Écrire un commentaire...'}
                className="w-full bg-surface-100 rounded-2xl px-4 py-2.5 pr-12 text-sm text-dark-800 placeholder-dark-600/40 outline-none font-medium"
              />
              <button onClick={sendComment} disabled={!text.trim() || sending}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center disabled:opacity-30 active:scale-90">
                {sending
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : <Send size={13} className="text-white ml-0.5"/>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}

// ============================================================
// COMMENT ITEM
// ============================================================
function CommentItem({ comment, userId, isReply, onReply, onDelete, isLiked, onLike }) {
  const isOwner = comment.user_id === userId
  return (
    <div className="flex gap-2">
      <Avatar src={comment.user?.avatar_url} name={comment.user?.username}
        size={isReply ? 'xs' : 'sm'} className="flex-shrink-0 mt-0.5"/>
      <div className="flex-1 min-w-0">
        <div className="bg-surface-100 rounded-2xl rounded-tl-sm px-3 py-2">
          <p className="font-bold text-dark-800 text-xs">@{comment.user?.username}</p>
          <p className="text-dark-700 text-sm mt-0.5 leading-relaxed">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-dark-600/40 text-[10px]">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
          </span>
          <button onClick={onLike}
            className={clsx('flex items-center gap-1 text-[10px] font-bold transition-colors',
              isLiked ? 'text-red-500' : 'text-dark-600/50')}>
            <Heart size={11} className={clsx(isLiked && 'fill-current')}/>
            {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
          </button>
          <button onClick={onReply} className="text-primary-600 text-[10px] font-bold">Répondre</button>
          {isOwner && (
            <button onClick={onDelete} className="text-red-500 text-[10px] font-bold">Supprimer</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// LIKERS SHEET
// ============================================================
function LikersSheet({ open, onClose, post }) {
  const [likers, setLikers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    supabase
      .from('post_likes')
      .select('user:profiles(id, username, avatar_url)')
      .eq('post_id', post.id)
      .then(({ data }) => { setLikers(data || []); setLoading(false) })
  }, [open, post.id])

  return (
    <BottomSheet open={open} onClose={onClose} title="❤️ Personnes qui ont aimé">
      <div className="px-4 pt-2 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-11 h-11 rounded-2xl skeleton"/>
                <div className="h-3.5 skeleton rounded-lg w-1/3"/>
              </div>
            ))}
          </div>
        ) : likers.length === 0 ? (
          <p className="text-center text-dark-600/50 py-8">Aucun like pour l'instant</p>
        ) : (
          <div className="space-y-3">
            {likers.map((l, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar src={l.user?.avatar_url} name={l.user?.username} size="md"/>
                <p className="font-semibold text-dark-800 text-sm">@{l.user?.username}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

// ============================================================
// ONGLET MEMBRES
// ============================================================
function MembersTab({ user, profile }) {
  const navigate = useNavigate()
  const [members, setMembers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [following, setFollowing] = useState(new Set())
  const debounce = useRef()

  const loadMembers = useCallback(async (q = '') => {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, city, last_seen_at')
      .neq('id', user?.id || '')
      .order('username')
      .limit(50)
    if (q.trim()) query = query.ilike('username', `%${q}%`)
    const { data } = await query
    setMembers(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadMembers() }, [loadMembers])

  useEffect(() => {
    if (!user) return
    supabase.from('user_follows').select('following_id').eq('follower_id', user.id)
      .then(({ data }) => setFollowing(new Set((data || []).map(f => f.following_id))))
  }, [user])

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => loadMembers(val), 300)
  }

  const toggleFollow = async (memberId) => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    const isFollowing = following.has(memberId)
    if (isFollowing) {
      const { error } = await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', memberId)
      if (error) { toast.error('Erreur'); return }
      setFollowing(prev => { const s = new Set(prev); s.delete(memberId); return s })
    } else {
      const { error } = await supabase.from('user_follows').insert({ follower_id: user.id, following_id: memberId })
      if (error) { toast.error('Erreur'); return }
      setFollowing(prev => new Set([...prev, memberId]))
      // Charger le username du follower pour la notification
      await supabase.rpc('create_notification', {
        p_user_id: memberId,
        p_type: 'user_follow',
        p_title: '👤 Nouveau follower',
        p_body: `@${profile?.username} vous suit maintenant`,
        p_reference_id: profile?.username,
        p_reference_type: 'profile',
      })
      toast.success('Abonnement effectué !')
    }
  }

  return (
    <div>
      <div className="sticky top-0 bg-white border-b border-surface-100 px-4 py-3 z-10">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
          <input type="text" placeholder="Rechercher un membre..."
            value={search} onChange={e => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-100 rounded-2xl text-sm text-dark-800 placeholder-dark-600/40 outline-none font-medium"/>
        </div>
      </div>

      {loading ? (
        <div className="space-y-1 p-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-12 h-12 rounded-2xl skeleton flex-shrink-0"/>
              <div className="flex-1 space-y-2">
                <div className="h-3.5 skeleton rounded-lg w-1/3"/>
                <div className="h-3 skeleton rounded-lg w-1/4"/>
              </div>
              <div className="w-20 h-8 skeleton rounded-xl"/>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-2">👥</p>
          <p className="font-bold text-dark-800">{search ? 'Aucun résultat' : 'Aucun membre'}</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-100">
          {members.map(member => {
            const isOnline = member.last_seen_at ? (new Date() - new Date(member.last_seen_at)) < 120000 : false
            const isFollowed = following.has(member.id)
            return (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => navigate(`/profil/${member.username}`)} className="relative flex-shrink-0">
                  <Avatar src={member.avatar_url} name={member.username} size="md"/>
                  {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"/>}
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => navigate(`/profil/${member.username}`)} className="text-left">
                    <p className="font-bold text-dark-800 text-sm truncate">{member.full_name || member.username}</p>
                    <p className="text-dark-600/50 text-xs">@{member.username}</p>
                  </button>
                  {member.city && <p className="text-dark-600/40 text-[10px] mt-0.5">📍 {member.city}</p>}
                </div>
                <button onClick={() => toggleFollow(member.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex-shrink-0',
                    isFollowed ? 'bg-surface-100 text-dark-600' : 'bg-primary-600 text-white shadow-green'
                  )}>
                  {isFollowed ? <><UserCheck size={13}/> Suivi</> : <><UserPlus size={13}/> Suivre</>}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// SKELETONS
// ============================================================
function PostSkeleton() {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl skeleton flex-shrink-0"/>
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 skeleton rounded-lg w-1/3"/>
          <div className="h-3 skeleton rounded-lg w-1/5"/>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 skeleton rounded-lg"/>
        <div className="h-3.5 skeleton rounded-lg"/>
        <div className="h-3.5 skeleton rounded-lg w-2/3"/>
      </div>
      <div className="h-36 skeleton rounded-2xl mt-3"/>
    </div>
  )
}
