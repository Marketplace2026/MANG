import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Heart, MessageCircle, Share2, Users, Search,
  UserPlus, UserCheck, MoreHorizontal, Trash2,
  Edit3, CornerDownRight, X, Send, ChevronDown,
  Globe, Flame, TrendingUp
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, BottomSheet } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const TABS = [
  { key: 'posts',   label: '📢 Publications', icon: Globe },
  { key: 'members', label: '👥 Membres',       icon: Users },
]

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function CommunityPage() {
  const { user, profile } = useAuthStore()
  const [tab, setTab] = useState('posts')

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-600 pt-12 pb-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl text-white font-bold">Communauté</h1>
            <p className="text-primary-300 text-sm">🌿 MANG — Ensemble, on grandit</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Flame size={18} className="text-gold-300"/>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex bg-white/10 rounded-2xl p-1 gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx(
                'flex-1 py-2 rounded-xl text-sm font-bold transition-all',
                tab === t.key ? 'bg-white text-primary-700' : 'text-white/70'
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENU */}
      <div className="flex-1 overflow-y-auto pb-28">
        {tab === 'posts'   && <PostsTab user={user} profile={profile}/>}
        {tab === 'members' && <MembersTab user={user}/>}
      </div>
    </div>
  )
}

// ============================================================
// ONGLET PUBLICATIONS
// ============================================================
function PostsTab({ user, profile }) {
  const [posts, setPosts]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [content, setContent]       = useState('')
  const [posting, setPosting]       = useState(false)
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [commentsPost, setCommentsPost] = useState(null)
  const [likersPost, setLikersPost]     = useState(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, user:profiles(id, username, avatar_url, last_seen_at)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!postsData) { setLoading(false); return }

    // Charger likes de l'utilisateur
    if (user) {
      const { data: myLikes } = await supabase
        .from('post_likes').select('post_id').eq('user_id', user.id)
      setLikedPosts(new Set((myLikes || []).map(l => l.post_id)))
    }

    setPosts(postsData)
    setLoading(false)
  }, [user])

  useEffect(() => { loadPosts() }, [loadPosts])

  // Realtime posts + likes
  useEffect(() => {
    const ch = supabase.channel('community-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const { data: p } = await supabase
          .from('posts').select('*, user:profiles(id, username, avatar_url, last_seen_at)')
          .eq('id', payload.new.id).single()
        if (p) setPosts(prev => [p, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const createPost = async () => {
    if (!content.trim()) { toast.error('Écris quelque chose !'); return }
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    setPosting(true)
    const { error } = await supabase.from('posts').insert({ user_id: user.id, content: content.trim() })
    setPosting(false)
    if (error) { toast.error('Erreur publication'); return }
    setContent('')
    toast.success('Publication créée ! 🌿')
  }

  const toggleLike = async (postId) => {
    if (!user) { toast.error('Connectez-vous d\'abord'); return }
    const isLiked = likedPosts.has(postId)
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s })
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
      setLikedPosts(prev => new Set([...prev, postId]))
    }
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ))
  }

  const deletePost = async (postId) => {
    if (!confirm('Supprimer cette publication ?')) return
    await supabase.from('posts').delete().eq('id', postId)
    toast.success('Publication supprimée')
  }

  return (
    <div>
      {/* Zone de publication */}
      <div className="bg-white border-b border-surface-100 px-4 py-3">
        <div className="flex gap-3">
          <Avatar src={profile?.avatar_url} name={profile?.username} size="md" className="flex-shrink-0"/>
          <div className="flex-1">
            <textarea
              placeholder="Exprimez-vous sur MANG... 🌿"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={2}
              className="w-full bg-surface-100 rounded-2xl px-4 py-2.5 text-sm text-dark-800 placeholder-dark-600/40 outline-none resize-none font-medium"
            />
            {content.trim() && (
              <div className="flex justify-end mt-2">
                <button onClick={createPost} disabled={posting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold shadow-green active:scale-95 transition-transform disabled:opacity-50">
                  {posting
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : <><Send size={14}/> Publier</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Liste posts */}
      {loading ? (
        <div className="space-y-3 p-4">
          {[1,2,3].map(i => <PostSkeleton key={i}/>)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-5xl mb-3">🌿</p>
          <p className="font-display text-xl font-bold text-dark-800">Aucune publication</p>
          <p className="text-dark-600/50 text-sm mt-2">Soyez le premier à partager !</p>
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
        </div>
      )}

      {/* Sheet commentaires */}
      {commentsPost && (
        <CommentsSheet
          post={commentsPost}
          open={!!commentsPost}
          onClose={() => setCommentsPost(null)}
          user={user}
          profile={profile}
        />
      )}

      {/* Sheet likers */}
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
// POST CARD
// ============================================================
function PostCard({ post, userId, isLiked, onLike, onComment, onLikers, onDelete }) {
  const isOwner = post.user_id === userId
  const isOnline = post.user?.last_seen_at
    ? (new Date() - new Date(post.user.last_seen_at)) < 120000 : false
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="bg-white px-4 py-3">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <Avatar src={post.user?.avatar_url} name={post.user?.username} size="md"/>
          {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"/>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-dark-800 text-sm">@{post.user?.username}</p>
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

      {/* Contenu */}
      <p className="text-dark-800 text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>

      {/* Stats */}
      {(post.likes_count > 0 || post.comments_count > 0) && (
        <div className="flex items-center justify-between py-2 border-b border-surface-100 mb-1">
          <button onClick={onLikers} className="flex items-center gap-1.5 hover:underline">
            <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
              <Heart size={11} className="text-white fill-white"/>
            </div>
            <span className="text-dark-600/60 text-xs font-medium">{post.likes_count || 0}</span>
          </button>
          {post.comments_count > 0 && (
            <button onClick={onComment} className="text-dark-600/60 text-xs font-medium hover:underline">
              {post.comments_count} commentaire{post.comments_count > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Actions style Facebook */}
      <div className="flex items-center gap-1">
        {[
          {
            icon: Heart, label: "J'aime",
            active: isLiked,
            activeClass: 'text-red-500',
            onClick: onLike,
            filled: isLiked,
          },
          { icon: MessageCircle, label: 'Commenter', active: false, activeClass: '', onClick: onComment },
          { icon: Share2, label: 'Partager', active: false, activeClass: '', onClick: () => {
            if (navigator.share) navigator.share({ title: 'MANG', text: post.content })
            else { navigator.clipboard.writeText(post.content); toast.success('Copié !') }
          }},
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95',
              btn.active ? btn.activeClass + ' bg-red-50' : 'text-dark-600/60 hover:bg-surface-100'
            )}>
            <btn.icon
              size={17}
              className={clsx(btn.active && 'fill-current')}
              strokeWidth={btn.active ? 0 : 1.8}
            />
            <span className="text-xs">{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// COMMENTS SHEET — avec réponses imbriquées
// ============================================================
function CommentsSheet({ open, onClose, post, user, profile }) {
  const [comments, setComments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [text, setText]             = useState('')
  const [replyTo, setReplyTo]       = useState(null) // { id, username }
  const [sending, setSending]       = useState(false)
  const [expandedReplies, setExpandedReplies] = useState(new Set())
  const inputRef = useRef()

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
    setLoading(false)
  }, [post.id])

  useEffect(() => { if (open) { loadComments() } }, [open, loadComments])

  const sendComment = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('post_comments').insert({
      post_id: post.id,
      user_id: user.id,
      content: text.trim(),
      parent_id: replyTo?.id || null,
    })
    setSending(false)
    if (error) { toast.error('Erreur envoi'); return }
    setText('')
    setReplyTo(null)
    loadComments()
  }

  const deleteComment = async (commentId) => {
    if (!confirm('Supprimer ce commentaire ?')) return
    await supabase.from('post_comments').delete().eq('id', commentId)
    loadComments()
  }

  const toggleReplies = (id) => {
    setExpandedReplies(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="💬 Commentaires">
      <div className="flex flex-col" style={{ height: '70vh' }}>
        {/* Post résumé */}
        <div className="px-4 py-2 bg-surface-50 border-b border-surface-100">
          <div className="flex gap-2 items-center">
            <Avatar src={post.user?.avatar_url} name={post.user?.username} size="sm"/>
            <p className="text-dark-800 text-xs line-clamp-2 flex-1">{post.content}</p>
          </div>
        </div>

        {/* Liste commentaires */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto"/>
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
                  onReply={() => { setReplyTo({ id: comment.id, username: comment.user?.username }); inputRef.current?.focus() }}
                  onDelete={() => deleteComment(comment.id)}
                />
                {/* Réponses */}
                {comment.replies?.length > 0 && (
                  <div className="ml-10 mt-2">
                    <button onClick={() => toggleReplies(comment.id)}
                      className="flex items-center gap-1 text-xs text-primary-600 font-semibold mb-2">
                      <ChevronDown size={13} className={clsx('transition-transform', expandedReplies.has(comment.id) && 'rotate-180')}/>
                      {expandedReplies.has(comment.id) ? 'Masquer' : `Voir ${comment.replies.length} réponse${comment.replies.length > 1 ? 's' : ''}`}
                    </button>
                    {expandedReplies.has(comment.id) && (
                      <div className="space-y-2 border-l-2 border-surface-200 pl-3">
                        {comment.replies.map(reply => (
                          <CommentItem
                            key={reply.id}
                            comment={reply}
                            userId={user?.id}
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
        </div>

        {/* Zone saisie */}
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

function CommentItem({ comment, userId, isReply, onReply, onDelete }) {
  const isOwner = comment.user_id === userId
  return (
    <div className="flex gap-2">
      <Avatar src={comment.user?.avatar_url} name={comment.user?.username} size={isReply ? 'xs' : 'sm'} className="flex-shrink-0 mt-0.5"/>
      <div className="flex-1 min-w-0">
        <div className="bg-surface-100 rounded-2xl rounded-tl-sm px-3 py-2">
          <p className="font-bold text-dark-800 text-xs">@{comment.user?.username}</p>
          <p className="text-dark-700 text-sm mt-0.5 leading-relaxed">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-dark-600/40 text-[10px]">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
          </span>
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
function MembersTab({ user }) {
  const [members, setMembers]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [following, setFollowing]     = useState(new Set())
  const debounce                      = useRef()

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

  // Mes follows
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
      await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', memberId)
      setFollowing(prev => { const s = new Set(prev); s.delete(memberId); return s })
    } else {
      await supabase.from('user_follows').insert({ follower_id: user.id, following_id: memberId })
      setFollowing(prev => new Set([...prev, memberId]))
      // Notification
      await supabase.from('notifications').insert({
        user_id: memberId,
        type: 'user_follow',
        title: '👤 Nouveau follower',
        body: `@${user?.username || 'Quelqu\'un'} vous suit maintenant`,
        reference_id: user.id,
        reference_type: 'profile',
      })
      toast.success('Abonnement effectué !')
    }
  }

  return (
    <div>
      {/* Recherche */}
      <div className="sticky top-0 bg-white border-b border-surface-100 px-4 py-3 z-10">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="input-field pl-10 text-sm"
          />
        </div>
      </div>

      {/* Liste */}
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
                <div className="relative flex-shrink-0">
                  <Avatar src={member.avatar_url} name={member.username} size="md"/>
                  {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-dark-800 text-sm truncate">
                    {member.full_name || member.username}
                  </p>
                  <p className="text-dark-600/50 text-xs">@{member.username}</p>
                  {member.city && (
                    <p className="text-dark-600/40 text-[10px] mt-0.5">📍 {member.city}</p>
                  )}
                </div>
                <button onClick={() => toggleFollow(member.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex-shrink-0',
                    isFollowed
                      ? 'bg-surface-100 text-dark-600'
                      : 'bg-primary-600 text-white shadow-green'
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
    </div>
  )
}
