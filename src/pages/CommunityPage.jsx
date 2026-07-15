import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Heart, MessageCircle, Share2, Users, Search,
  UserPlus, UserCheck, MoreHorizontal, Trash2,
  CornerDownRight, X, Send, ChevronDown,
  Flame, TrendingUp, Globe, Store, Image,
  Smile, MapPin, ChevronRight, Sparkles,
  BarChart2, AlertTriangle, Bookmark, Eye
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
// MOCK STORIES (Visuels Agricoles Riches)
// ============================================================
const MOCK_STORIES = [
  {
    id: 's1',
    username: 'agri_bio',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    media: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=500&q=80',
    caption: 'Récolte fraîche du matin 🍅 100% bio !',
    shopSlug: 'agri-bio'
  },
  {
    id: 's2',
    username: 'coop_nord',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    media: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=500&q=80',
    caption: 'Préparation des sacs de riz premium 🌾',
    shopSlug: 'coop-nord'
  },
  {
    id: 's3',
    username: 'miel_local',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    media: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=500&q=80',
    caption: 'Extraction de miel pur de forêt 🍯 Direct producteur.',
    shopSlug: 'miel-local'
  },
  {
    id: 's4',
    username: 'ferme_moderne',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    media: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=500&q=80',
    caption: 'Nos poules pondeuses en plein air 🐔🥚',
    shopSlug: 'ferme-moderne'
  }
]

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
// STORIES CAROUSEL
// ============================================================
function StoriesCarousel({ profile, onOpenStory }) {
  return (
    <div className="bg-white border-b border-surface-100 px-4 py-4 flex gap-3.5 overflow-x-auto no-scrollbar">
      {/* Ajouter ma story */}
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer">
        <div className="relative w-14 h-14 rounded-full p-[2px] border-2 border-dashed border-surface-300 flex items-center justify-center bg-surface-50">
          <Avatar src={profile?.avatar_url} name={profile?.username} size="md" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center border-2 border-white font-bold text-xs">
            +
          </div>
        </div>
        <span className="text-[10px] font-bold text-dark-600 mt-1">Ma story</span>
      </div>

      {/* Liste des stories mockées */}
      {MOCK_STORIES.map((s, idx) => (
        <div key={s.id} onClick={() => onOpenStory(idx)} className="flex flex-col items-center flex-shrink-0 cursor-pointer">
          <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-primary-500 to-gold-400 flex items-center justify-center shadow-md active:scale-95 transition-transform">
            <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
              <img src={s.avatar} className="w-full h-full object-cover" alt={s.username} />
            </div>
          </div>
          <span className="text-[10px] font-semibold text-dark-800 mt-1">@{s.username}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// STORY VIEWER MODAL
// ============================================================
function StoryViewer({ storyIndex, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(storyIndex)
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()
  const story = MOCK_STORIES[currentIdx]

  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          handleNext()
          return 100
        }
        return p + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [currentIdx])

  const handleNext = () => {
    if (currentIdx < MOCK_STORIES.length - 1) {
      setCurrentIdx(currentIdx + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1)
    }
  }

  if (!story) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-4 animate-fade-in">
      {/* Top indicator & Progress bars */}
      <div className="w-full space-y-3.5 pt-4">
        <div className="flex gap-1.5 w-full">
          {MOCK_STORIES.map((_, i) => (
            <div key={i} className="h-1 bg-white/20 rounded-full flex-1 overflow-hidden">
              <div
                className="h-full bg-primary-400 transition-all duration-100"
                style={{
                  width: i === currentIdx ? `${progress}%` : i < currentIdx ? '100%' : '0%'
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
              <img src={story.avatar} className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-sm">@{story.username}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image container with tap zones */}
      <div className="relative flex-1 flex items-center justify-center my-4">
        {/* Left Tap Zone */}
        <div onClick={handlePrev} className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer" />
        {/* Right Tap Zone */}
        <div onClick={handleNext} className="absolute right-0 top-0 bottom-0 w-3/4 z-10 cursor-pointer" />
        
        <img src={story.media} className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl" />
        
        <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-white">
          <p className="text-sm font-semibold leading-relaxed">{story.caption}</p>
        </div>
      </div>

      {/* Bottom Shop Referral Link */}
      <div className="pb-4 pt-2">
        <button
          onClick={() => {
            onClose()
            navigate(`/boutique/${story.shopSlug}`)
          }}
          className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-primary-500 active:scale-95 transition-transform"
        >
          <Store size={16} /> Visiter la boutique de @{story.username}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// LIGHTBOX VIEWER
// ============================================================
function Lightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null
  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-4" onClick={onClose}>
      <div className="flex justify-end pt-4">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-2">
        <img src={imageUrl} className="max-w-full max-h-[80vh] object-contain rounded-xl select-none" onClick={e => e.stopPropagation()} />
      </div>
      <div className="pb-8 text-center text-white/50 text-xs font-semibold">
        Cliquez n'importe où pour fermer
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
  const [searchQuery, setSearchQuery]   = useState('')

  // Modals Riches
  const [activeStoryIdx, setActiveStoryIdx] = useState(null)
  const [lightboxImg, setLightboxImg]       = useState(null)
  const [reportedPostIds, setReportedPostIds] = useState(new Set())
  const [reportingPostId, setReportingPostId] = useState(null)
  const [repostQuotePost, setRepostQuotePost] = useState(null)
  const [bookmarkedPosts, setBookmarkedPosts] = useState(new Set())

  const PAGE_SIZE = 20
  const location = useLocation()
  const loadMoreRef = useRef()

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
      .select(`*, user:profiles(id, username, avatar_url, last_seen_at, badges), shop:shops(id, name, slug, cover_url, city, has_delivery, premium_level, owner:profiles(username, avatar_url)), parent_post:parent_post_id(id, content, image_url, created_at, user:profiles(id, username, avatar_url, badges))`)
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

    if (user && user.id) {
      const [{ data: myLikes }, { data: myBookmarks }] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', user.id),
        supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id)
      ])
      setLikedPosts(new Set((myLikes || []).map(l => l.post_id)))
      setBookmarkedPosts(new Set((myBookmarks || []).map(b => b.post_id)))
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

  // Auto load-more via IntersectionObserver
  useEffect(() => {
    if (loading || !hasMore) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore()
      }
    }, { threshold: 0.8 })
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }
    return () => observer.disconnect()
  }, [loading, hasMore, page])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`community-${mode}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        if (mode === 'trending') return
        const { data: p } = await supabase
          .from('posts')
          .select(`*, user:profiles(id, username, avatar_url, last_seen_at, badges), shop:shops(id, name, slug, cover_url, city, has_delivery, premium_level, owner:profiles(username, avatar_url)), parent_post:parent_post_id(id, content, image_url, created_at, user:profiles(id, username, avatar_url, badges))`)
          .eq('id', payload.new.id).single()
        if (p) setPosts(prev => [p, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.map(p => p.id === payload.new.id
          ? { ...p, likes_count: payload.new.likes_count, comments_count: payload.new.comments_count, content: payload.new.content }
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
    
    // Mises à jour optimistes
    setLikedPosts(prev => {
      const s = new Set(prev)
      isLiked ? s.delete(postId) : s.add(postId)
      return s
    })
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count + (isLiked ? -1 : 1)) } : p
    ))

    try {
      if (isLiked) {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
        if (error) throw error
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
    } catch {
      // Rollback en cas d'erreur
      setLikedPosts(prev => {
        const s = new Set(prev)
        isLiked ? s.add(postId) : s.delete(postId)
        return s
      })
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? 1 : -1) } : p
      ))
      toast.error('Erreur de connexion')
    }
  }

  const deletePost = async (postId) => {
    if (!confirm('Supprimer cette publication ?')) return
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) { toast.error('Erreur suppression'); return }
    toast.success('Publication supprimée')
  }

  const handleReport = (postId) => {
    if (!user) return toast.error('Connectez-vous d\'abord')
    setReportingPostId(postId)
  }

  const executeReport = async (postId, reason) => {
    if (!user) return
    
    // Optimistic local hide
    setReportedPostIds(prev => {
      const copy = new Set(prev)
      copy.add(postId)
      return copy
    })
    setReportingPostId(null)

    try {
      const { error } = await supabase
        .from('post_reports')
        .insert({
          post_id: postId,
          user_id: user.id,
          reason
        })

      if (error) {
        if (error.code === '23505') {
          toast.error('Vous avez déjà signalé cette publication.')
        } else {
          console.error('Error reporting post:', error)
        }
      } else {
        toast.success('Publication signalée et masquée ! 🛡️')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleBookmark = async (postId) => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    const isBookmarked = bookmarkedPosts.has(postId)

    // Optimistic update
    setBookmarkedPosts(prev => {
      const copy = new Set(prev)
      if (isBookmarked) copy.delete(postId)
      else copy.add(postId)
      return copy
    })

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('post_bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        if (error) throw error
        toast.success('Retiré des favoris')
      } else {
        const { error } = await supabase
          .from('post_bookmarks')
          .insert({ post_id: postId, user_id: user.id })
        if (error) throw error
        toast.success('Ajouté aux favoris ! 💾')
      }
    } catch (err) {
      console.error(err)
      // Rollback
      setBookmarkedPosts(prev => {
        const copy = new Set(prev)
        if (isBookmarked) copy.add(postId)
        else copy.delete(postId)
        return copy
      })
      toast.error('Erreur réseau')
    }
  }

  const onPostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev])
    setComposerOpen(false)
  }

  // Filtrage local par mot-clé / Hashtag / Quarantaine
  const displayedPosts = posts
    .filter(p => p.status !== 'quarantined')
    .filter(p => !reportedPostIds.has(p.id))
    .filter(p => {
      if (!searchQuery.trim()) return true
      const s = searchQuery.toLowerCase()
      // Si c'est un tag, on vérifie la présence exacte du tag
      if (s.startsWith('#')) {
        return p.content.toLowerCase().includes(s)
      }
      return p.content.toLowerCase().includes(s) || (p.user?.username || '').toLowerCase().includes(s)
    })

  return (
    <div>
      {/* Carrousel de Stories Premium */}
      <StoriesCarousel profile={profile} onOpenStory={setActiveStoryIdx} />

      {/* Filtrage par recherche active */}
      {searchQuery && (
        <div className="bg-primary-50 px-4 py-3 flex items-center justify-between border-b border-primary-100">
          <p className="text-xs font-bold text-primary-800">
            Filtre actif : <span className="underline">{searchQuery}</span>
          </p>
          <button onClick={() => setSearchQuery('')} className="text-primary-700 hover:text-primary-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Composer déclencheur */}
      <div className="bg-white border-b border-surface-100 px-4 py-3">
        <button onClick={() => user ? setComposerOpen(true) : toast.error('Connectez-vous d\'abord')}
          className="w-full flex items-center gap-3">
          <Avatar src={profile?.avatar_url} name={profile?.username} size="md" className="flex-shrink-0"/>
          <div className="flex-1 text-left bg-surface-100 rounded-2xl px-4 py-2.5">
            <span className="text-dark-600/40 text-sm font-medium">Exprimer quelque chose ou lancer un sondage... 🌿</span>
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
            <BarChart2 size={13} className="text-violet-500"/> Sondage
          </button>
          <button onClick={() => user ? setComposerOpen(true) : toast.error('Connectez-vous d\'abord')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-100 text-xs font-semibold text-dark-600">
            <Store size={13} className="text-emerald-500"/> Boutique
          </button>
        </div>
      </div>

      {/* List Feed */}
      {loading ? (
        <div className="space-y-3 p-4">
          {[1,2,3].map(i => <PostSkeleton key={i}/>)}
        </div>
      ) : displayedPosts.length === 0 ? (
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
          {displayedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              userId={user?.id}
              isLiked={likedPosts.has(post.id)}
              onLike={() => toggleLike(post.id)}
              onComment={() => setCommentsPost(post)}
              onLikers={() => setLikersPost(post)}
              onDelete={() => deletePost(post.id)}
              onReport={() => handleReport(post.id)}
              onImageClick={(url) => setLightboxImg(url)}
              onHashtagClick={(tag) => setSearchQuery(tag)}
              onRepost={() => setRepostQuotePost(post)}
              isBookmarked={bookmarkedPosts.has(post.id)}
              onToggleBookmark={() => toggleBookmark(post.id)}
            />
          ))}
          {/* Scroll observer element for infinite scroll */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>
            </div>
          )}
        </div>
      )}

      {/* Composer BottomSheet */}
      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        user={user}
        profile={profile}
        onPosted={onPostCreated}
      />

      {/* Comments BottomSheet */}
      {commentsPost && (
        <CommentsSheet
          post={commentsPost}
          open={!!commentsPost}
          onClose={() => setCommentsPost(null)}
          user={user}
          profile={profile}
        />
      )}

      {/* Likers BottomSheet */}
      {likersPost && (
        <LikersSheet
          post={likersPost}
          open={!!likersPost}
          onClose={() => setLikersPost(null)}
        />
      )}

      {/* Story viewer full screen */}
      {activeStoryIdx !== null && (
        <StoryViewer storyIndex={activeStoryIdx} onClose={() => setActiveStoryIdx(null)} />
      )}

      {/* Lightbox full screen */}
      {lightboxImg && (
        <Lightbox imageUrl={lightboxImg} onClose={() => setLightboxImg(null)} />
      )}

      {/* Report BottomSheet */}
      {reportingPostId && (
        <ReportSheet
          open={!!reportingPostId}
          onClose={() => setReportingPostId(null)}
          onReportConfirmed={(reason) => executeReport(reportingPostId, reason)}
        />
      )}

      {/* Repost / Quote Post BottomSheet */}
      {repostQuotePost && (
        <RepostComposer
          open={!!repostQuotePost}
          onClose={() => setRepostQuotePost(null)}
          postToQuote={repostQuotePost}
          user={user}
          profile={profile}
          onPosted={(newPost) => {
            setPosts(prev => [newPost, ...prev])
            setRepostQuotePost(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================================
// COMPOSER — Créer une publication (Texte, Média, ou Sondage)
// ============================================================
function PostComposer({ open, onClose, user, profile, onPosted }) {
  const [content, setContent]       = useState('')
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedShop, setSelectedShop] = useState(null)
  const [shopPickerOpen, setShopPickerOpen] = useState(false)
  const [posting, setPosting]       = useState(false)

  // Poll creation fields
  const [isPollMode, setIsPollMode] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])

  const fileRef = useRef()

  const reset = () => {
    setContent('')
    setImageFile(null)
    setImagePreview(null)
    setSelectedShop(null)
    setPosting(false)
    setIsPollMode(false)
    setPollOptions(['', ''])
  }

  const handleClose = () => { reset(); onClose() }

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ''])
    }
  }

  const removePollOption = (idx) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx))
    }
  }

  const handlePollOptionChange = (idx, val) => {
    const updated = [...pollOptions]
    updated[idx] = val
    setPollOptions(updated)
  }

  const publish = async () => {
    if (!content.trim() && !imageFile && !selectedShop && !isPollMode) {
      toast.error('Écrivez un message ou ajoutez une option !'); return
    }
    
    // Validation du sondage
    if (isPollMode) {
      const activeOptions = pollOptions.filter(o => o.trim())
      if (activeOptions.length < 2) {
        toast.error('Un sondage nécessite au moins 2 options'); return
      }
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

    // Sérialisation du sondage dans le champ content si actif
    let finalContent = content.trim()
    if (isPollMode) {
      const activeOpts = pollOptions.filter(o => o.trim())
      const votesObj = {}
      activeOpts.forEach(opt => {
        votesObj[opt.trim()] = []
      })
      finalContent = JSON.stringify({
        is_poll: true,
        question: content.trim() || 'Sondage sans titre',
        options: activeOpts.map(o => o.trim()),
        votes: votesObj
      })
    }

    const { data: post, error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: finalContent,
      image_url: imageUrl,
      shop_id: selectedShop?.id || null,
    }).select(`*, user:profiles(id, username, avatar_url, last_seen_at), shop:shops(id, name, slug, cover_url, city, has_delivery, premium_level, owner:profiles(username, avatar_url))`).single()

    setPosting(false)
    if (error) { toast.error('Erreur publication'); return }
    toast.success('Publié ! 🌿')
    onPosted(post)
    reset()
  }

  const canPublish = (content.trim() || imageFile || selectedShop || isPollMode) && !posting

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

        {/* Texte / Question du sondage */}
        <textarea
          placeholder={isPollMode ? "Posez votre question pour le sondage... 🗳️" : "Quoi de neuf dans ton champ ? 🌿"}
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          className="w-full bg-surface-50 rounded-2xl px-4 py-3 text-sm text-dark-800 placeholder-dark-600/40 outline-none resize-none font-medium border border-surface-200 focus:border-primary-400 transition-colors"
        />

        {/* SECTION SONDAGE CRÉATION */}
        {isPollMode && (
          <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 space-y-2 animate-scale-in">
            <p className="text-xs font-bold text-dark-700">Options du sondage</p>
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChange={e => handlePollOptionChange(idx, e.target.value)}
                  className="flex-1 bg-white border border-surface-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-violet-500"
                />
                {pollOptions.length > 2 && (
                  <button onClick={() => removePollOption(idx)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button
                onClick={addPollOption}
                className="w-full py-2 bg-violet-50 border border-dashed border-violet-200 text-violet-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
              >
                + Ajouter une option
              </button>
            )}
          </div>
        )}

        {/* Preview image */}
        {imagePreview && !isPollMode && (
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
          <button
            onClick={() => {
              if (isPollMode) return
              fileRef.current?.click()
            }}
            disabled={isPollMode}
            className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-30',
              imageFile ? 'bg-primary-500 text-white' : 'bg-surface-100 text-dark-600')}
          >
            <Image size={14}/> Photo
          </button>
          
          <button
            onClick={() => {
              setIsPollMode(!isPollMode)
              setImageFile(null)
              setImagePreview(null)
            }}
            className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95',
              isPollMode ? 'bg-violet-600 text-white' : 'bg-surface-100 text-dark-600')}
          >
            <BarChart2 size={14}/> Sondage
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
// SHOP PICKER
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
// POST CARD (Avec Moteur de Reactions + Lightbox + Sondages)
// ============================================================
function PostCard({
  post, userId, isLiked, onLike, onComment, onLikers, onDelete,
  onReport, onImageClick, onHashtagClick, onRepost, isBookmarked, onToggleBookmark
}) {
  const navigate = useNavigate()
  const isOwner = post.user_id === userId
  const isOnline = post.user?.last_seen_at
    ? (new Date() - new Date(post.user.last_seen_at)) < 120000 : false
  
  const [menuOpen, setMenuOpen] = useState(false)
  const [reactionPanelOpen, setReactionPanelOpen] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [localReaction, setLocalReaction] = useState(() => {
    return localStorage.getItem(`post_reaction_${post.id}`) || null
  })

  const renderUserBadges = (userObj) => {
    if (!userObj || !userObj.badges || userObj.badges.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {userObj.badges.map((badge, idx) => {
          let colorClass = 'bg-primary-50 text-primary-700 border-primary-100'
          let emoji = '🎖️'
          if (badge === 'Producteur Vérifié') {
            colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100'
            emoji = '🏪'
          } else if (badge === 'Top Contributeur') {
            colorClass = 'bg-violet-50 text-violet-700 border-violet-100'
            emoji = '🔥'
          } else if (badge === 'Expert Bio') {
            colorClass = 'bg-amber-50 text-amber-700 border-amber-100'
            emoji = '🌿'
          }
          return (
            <span key={idx} className={clsx("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black border leading-none", colorClass)}>
              <span>{emoji}</span>
              <span>{badge}</span>
            </span>
          )
        })}
      </div>
    )
  }

  const handleShare = () => {
    const text = post.content || 'Regarde cette publication sur MANG !'
    if (navigator.share) {
      navigator.share({ title: 'MANG Communauté', text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Lien copié !')
    }
  }

  // Parse poll data if it's a poll
  let pollData = null
  try {
    if (post.content && post.content.startsWith('{"is_poll":true')) {
      pollData = JSON.parse(post.content)
    }
  } catch (e) {
    pollData = null
  }

  const hasVotedAny = pollData
    ? Object.values(pollData.votes).some(vArr => vArr.includes(userId))
    : false

  const totalVotes = pollData
    ? Object.values(pollData.votes).reduce((acc, curr) => acc + curr.length, 0)
    : 0

  const handleVote = async (option) => {
    if (!userId) return toast.error('Connectez-vous d\'abord')
    if (!pollData) return

    const updatedVotes = { ...pollData.votes }
    
    // Remove vote if already exists
    Object.keys(updatedVotes).forEach(opt => {
      updatedVotes[opt] = updatedVotes[opt].filter(uid => uid !== userId)
    })

    // Add vote to current selection
    updatedVotes[option].push(userId)

    const updatedPoll = { ...pollData, votes: updatedVotes }
    
    // Send updated JSON back to Supabase
    const { error } = await supabase
      .from('posts')
      .update({ content: JSON.stringify(updatedPoll) })
      .eq('id', post.id)

    if (error) {
      toast.error('Erreur lors du vote')
    } else {
      toast.success('Vote enregistré ! 🗳️')
    }
  }

  // Handler for custom emoji reaction
  const handleSelectReaction = (emoji) => {
    setLocalReaction(emoji)
    localStorage.setItem(`post_reaction_${post.id}`, emoji)
    setReactionPanelOpen(false)
    if (!isLiked) {
      onLike() // Standard like trigger
    }
  }

  const handleResetLike = () => {
    if (isLiked) {
      onLike()
      setLocalReaction(null)
      localStorage.removeItem(`post_reaction_${post.id}`)
    } else {
      setLocalReaction('❤️')
      localStorage.setItem(`post_reaction_${post.id}`, '❤️')
      onLike()
    }
  }

  // Detect and highlight hashtags
  const renderContentWithHashtags = (text) => {
    if (!text) return null
    const parts = text.split(/(\s+)/)
    return parts.map((part, i) => {
      if (part.startsWith('#') && part.length > 1) {
        return (
          <button
            key={i}
            onClick={() => onHashtagClick(part)}
            className="text-primary-600 hover:underline font-extrabold focus:outline-none"
          >
            {part}
          </button>
        )
      }
      return part
    })
  }

  return (
    <div className="bg-white px-4 py-4 rounded-3xl mb-3 shadow-sm border border-surface-100 relative">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <button onClick={() => navigate(`/profil/${post.user?.username}`)} className="relative flex-shrink-0">
          <Avatar src={post.user?.avatar_url} name={post.user?.username} size="md"/>
          {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"/>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => navigate(`/profil/${post.user?.username}`)}>
              <p className="font-bold text-dark-800 text-sm">@{post.user?.username}</p>
            </button>
            {renderUserBadges(post.user)}
          </div>
          <p className="text-dark-600/40 text-xs mt-0.5">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
          </p>
        </div>
        
        <div className="relative">
          <button onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 rounded-xl bg-surface-50 hover:bg-surface-100 flex items-center justify-center active:scale-90">
            <MoreHorizontal size={16} className="text-dark-600/50"/>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}/>
              <div className="absolute right-0 top-10 z-20 bg-white rounded-2xl shadow-modal border border-surface-100 overflow-hidden min-w-[150px] animate-scale-in">
                {/* Option enregistrer / Bookmark (TÂCHE B) */}
                <button onClick={() => { onToggleBookmark(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 border-b border-surface-100">
                  <Bookmark size={14} className={isBookmarked ? 'fill-current' : ''}/>
                  {isBookmarked ? 'Enregistré' : 'Enregistrer'}
                </button>

                {isOwner ? (
                  <button onClick={() => { onDelete(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                    <Trash2 size={14}/> Supprimer
                  </button>
                ) : (
                  <button onClick={() => { onReport(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50">
                    <AlertTriangle size={14}/> Signaler
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TEXT / POLL SECTION */}
      {pollData ? (
        <div className="bg-surface-50 border border-surface-150 rounded-2xl p-4.5 mb-3.5 space-y-3.5">
          <div className="flex items-center gap-2 text-violet-600 font-bold text-xs uppercase tracking-wide">
            <BarChart2 size={15} />
            <span>Sondage communauté</span>
          </div>
          
          <p className="text-dark-800 text-sm font-bold leading-relaxed">{pollData.question}</p>
          
          <div className="space-y-2">
            {pollData.options.map((opt, i) => {
              const voters = pollData.votes[opt] || []
              const hasVotedThis = voters.includes(userId)
              const percent = totalVotes > 0 ? Math.round((voters.length / totalVotes) * 100) : 0

              return (
                <div key={i} className="relative overflow-hidden rounded-xl border border-surface-200">
                  {hasVotedAny ? (
                    // Display results with percentages
                    <div className="flex justify-between items-center px-4 py-3 text-xs font-semibold text-dark-800 relative min-h-[40px]">
                      {/* Percent Bar background */}
                      <div
                        className={clsx('absolute left-0 top-0 bottom-0 transition-all duration-500',
                          hasVotedThis ? 'bg-violet-100/70' : 'bg-surface-150'
                        )}
                        style={{ width: `${percent}%` }}
                      />
                      <span className="relative z-10 flex items-center gap-1.5 truncate">
                        {opt} {hasVotedThis && '✅'}
                      </span>
                      <span className="relative z-10 font-bold ml-2">{percent}% ({voters.length})</span>
                    </div>
                  ) : (
                    // Clickable voting buttons
                    <button
                      onClick={() => handleVote(opt)}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-dark-700 hover:bg-violet-50/50 active:scale-99 transition-all flex justify-between items-center"
                    >
                      <span>{opt}</span>
                      <ChevronRight size={14} className="text-dark-400" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="text-[10px] text-dark-600/50 font-semibold flex items-center justify-between pt-1">
            <span>🗳️ {totalVotes} vote{totalVotes > 1 ? 's' : ''} au total</span>
            {hasVotedAny && <span className="text-violet-600">Vous avez voté</span>}
          </div>
        </div>
      ) : (
        post.content && (
          <p className="text-dark-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">
            {renderContentWithHashtags(post.content)}
          </p>
        )
      )}

      {/* QUOTED POST / REPOST SECTION (TÂCHE A) */}
      {post.parent_post && (
        <div className="bg-surface-50 border border-surface-150 rounded-2xl p-3.5 mb-3.5 flex flex-col gap-2 relative">
          <div className="flex items-center gap-2">
            <Avatar src={post.parent_post.user?.avatar_url} name={post.parent_post.user?.username} size="xs"/>
            <div>
              <p className="font-bold text-dark-800 text-xs">@{post.parent_post.user?.username}</p>
              <p className="text-[9px] text-dark-600/40 font-semibold">
                {formatDistanceToNow(new Date(post.parent_post.created_at), { addSuffix: true, locale: fr })}
              </p>
            </div>
          </div>
          <p className="text-dark-700 text-xs leading-relaxed">
            {post.parent_post.content?.startsWith('{"is_poll"') 
              ? '📊 Sondage de la communauté' 
              : renderContentWithHashtags(post.parent_post.content)}
          </p>
          {post.parent_post.image_url && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(post.parent_post.image_url);
              }}
              className="mt-1 max-w-full rounded-xl overflow-hidden cursor-zoom-in active:opacity-95 transition-opacity"
            >
              <img src={post.parent_post.image_url} alt="quoted post media" className="max-h-48 object-cover rounded-xl" />
            </div>
          )}
        </div>
      )}

      {/* Image */}
      {post.image_url && (
        <div
          onClick={() => onImageClick(post.image_url)}
          className="mb-3 rounded-2xl overflow-hidden cursor-zoom-in active:opacity-95 transition-opacity"
        >
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
            <span className="text-dark-600/60 text-xs font-semibold">{post.likes_count || 0}</span>
          </button>
          {post.comments_count > 0 && (
            <button onClick={onComment} className="text-dark-600/60 text-xs font-semibold">
              {post.comments_count} commentaire{post.comments_count > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 relative">
        {/* REACTION POPUP OVERLAY */}
        {reactionPanelOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setReactionPanelOpen(false)} />
            <div className="absolute bottom-11 left-2 z-40 bg-white shadow-modal border border-surface-100 rounded-full px-3 py-2 flex items-center gap-3.5 animate-scale-in">
              {['👍', '❤️', '😮', '👏', '🌿'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleSelectReaction(emoji)}
                  className="text-2xl active:scale-125 transition-transform hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={handleResetLike}
          onContextMenu={(e) => {
            e.preventDefault()
            setReactionPanelOpen(true)
          }}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95',
            isLiked ? 'text-red-500 bg-red-50' : 'text-dark-600/60 hover:bg-surface-100'
          )}
        >
          {isLiked ? (
            <span className="text-base leading-none">{localReaction || '❤️'}</span>
          ) : (
            <Heart size={17} strokeWidth={1.8} />
          )}
          <span className="text-xs">{isLiked ? (localReaction ? 'Réagi' : "J'aime") : "J'aime"}</span>
        </button>

        <button onClick={onComment} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-dark-600/60 hover:bg-surface-100 active:scale-95">
          <MessageCircle size={17} strokeWidth={1.8}/>
          <span className="text-xs">Commenter</span>
        </button>

        <button 
          onClick={() => setShareMenuOpen(v => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-dark-600/60 hover:bg-surface-100 active:scale-95 relative"
        >
          <Share2 size={17} strokeWidth={1.8}/>
          <span className="text-xs">Partager</span>
        </button>

        {shareMenuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShareMenuOpen(false)} />
            <div className="absolute bottom-11 right-2 z-40 bg-white shadow-modal border border-surface-100 rounded-2xl py-1 flex flex-col min-w-[170px] animate-scale-in">
              <button
                onClick={() => {
                  handleShare()
                  setShareMenuOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-dark-700 hover:bg-surface-50 flex items-center gap-2"
              >
                <span>🔗 Copier le lien</span>
              </button>
              <button
                onClick={() => {
                  onRepost()
                  setShareMenuOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-dark-700 hover:bg-surface-50 flex items-center gap-2 border-t border-surface-100"
              >
                <span>🔄 Republier (Quote Post)</span>
              </button>
            </div>
          </>
        )}
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
            <p className="text-dark-800 text-xs line-clamp-2 flex-1 font-medium">{post.content?.startsWith('{"is_poll"') ? '📊 Sondage' : post.content || '📷 Photo'}</p>
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
        p_reference_id: user.id,
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

// ============================================================
// MODAL SIGNALEMENT (TÂCHE D)
// ============================================================
const REPORT_REASONS = [
  { key: 'spam', label: 'Spam 🚫', desc: 'Publicités abusives, posts répétés ou frauduleux' },
  { key: 'prix_abusif', label: 'Prix Abusif 💸', desc: 'Prix anormalement élevé ou mensonger' },
  { key: 'harcelement', label: 'Harcèlement ⚠️', desc: 'Contenu agressif, haineux ou insultes' },
  { key: 'hors_sujet', label: 'Hors-sujet 📯', desc: 'N\'a aucun rapport avec l\'agriculture ou MANG' }
]

function ReportSheet({ open, onClose, onReportConfirmed }) {
  const [selected, setSelected] = useState('')

  return (
    <BottomSheet open={open} onClose={onClose} title="🛡️ Signaler cette publication">
      <div className="px-4 pt-2 pb-6 flex flex-col gap-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <p className="text-xs font-semibold text-dark-600/70">
          Pourquoi souhaitez-vous signaler cette publication ? Votre signalement sera examiné par l'équipe de modération.
        </p>

        <div className="space-y-2">
          {REPORT_REASONS.map(r => (
            <button
              key={r.key}
              onClick={() => setSelected(r.key)}
              className={clsx(
                "w-full text-left p-3.5 rounded-2xl border text-sm font-semibold transition-all flex flex-col gap-0.5",
                selected === r.key
                  ? "border-primary-600 bg-primary-50/50 text-primary-900"
                  : "border-surface-200 hover:border-surface-300 text-dark-800"
              )}
            >
              <span>{r.label}</span>
              <span className="text-[10px] font-medium text-dark-600/50">{r.desc}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-surface-100 hover:bg-surface-200 text-dark-800 font-bold rounded-2xl text-xs active:scale-95 transition-transform"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (!selected) { toast.error('Veuillez sélectionner un motif'); return }
              onReportConfirmed(selected)
            }}
            className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform shadow-md"
          >
            Signaler
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ============================================================
// COMPOSER DE REPOST / QUOTE POST (TÂCHE A)
// ============================================================
function RepostComposer({ open, onClose, postToQuote, user, profile, onPosted }) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  const handleClose = () => { setContent(''); onClose() }

  const publish = async () => {
    setPosting(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          parent_post_id: postToQuote.id
        })
        .select(`
          *,
          user:profiles(id, username, avatar_url, last_seen_at),
          shop:shops(id, name, slug, cover_url, city, has_delivery, premium_level, owner:profiles(username, avatar_url)),
          parent_post:parent_post_id(id, content, image_url, created_at, user:profiles(id, username, avatar_url))
        `)
        .single()

      if (error) throw error
      
      toast.success('Republié avec succès ! 🔄')
      onPosted(data)
      handleClose()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors du repost')
    } finally {
      setPosting(false)
    }
  }

  if (!postToQuote) return null

  return (
    <BottomSheet open={open} onClose={handleClose} title="🔄 Republier la publication">
      <div className="px-4 pt-2 pb-6 flex flex-col gap-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        
        {/* Auteur du Repost */}
        <div className="flex items-center gap-3">
          <Avatar src={profile?.avatar_url} name={profile?.username} size="sm"/>
          <div>
            <p className="font-bold text-dark-800 text-sm">@{profile?.username}</p>
            <p className="text-dark-600/40 text-xs">Partage sur votre fil d'actualité</p>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          placeholder="Ajouter une remarque..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          className="w-full bg-surface-50 rounded-2xl px-4 py-3 text-sm text-dark-800 placeholder-dark-600/40 outline-none resize-none font-medium border border-surface-200 focus:border-primary-400 transition-colors"
        />

        {/* Aperçu du post original à citer */}
        <div className="bg-surface-50 border border-surface-150 rounded-2xl p-3.5 flex flex-col gap-2 pointer-events-none select-none">
          <div className="flex items-center gap-2">
            <Avatar src={postToQuote.user?.avatar_url} name={postToQuote.user?.username} size="xs"/>
            <p className="font-bold text-dark-800 text-xs">@{postToQuote.user?.username}</p>
          </div>
          <p className="text-dark-700 text-xs line-clamp-3 leading-relaxed">
            {postToQuote.content?.startsWith('{"is_poll"') ? '📊 Sondage communauté' : postToQuote.content}
          </p>
          {postToQuote.image_url && (
            <img src={postToQuote.image_url} className="w-24 h-24 object-cover rounded-xl mt-1" />
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 py-3.5 bg-surface-100 hover:bg-surface-200 text-dark-800 font-bold rounded-2xl text-xs active:scale-95 transition-transform"
          >
            Annuler
          </button>
          <button
            onClick={publish}
            disabled={posting}
            className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform shadow-md disabled:opacity-50"
          >
            {posting ? 'Publication...' : 'Republier'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
