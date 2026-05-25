import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Send, ArrowLeft, Image, Mic, Paperclip, Smile,
  Check, CheckCheck, MoreVertical, Trash2, X,
  Phone, Video, Search, MicOff, Square
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, BUCKETS } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar } from '@/components/ui'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'

// ============================================================
// EMOJIS RÉACTIONS
// ============================================================
const REACTIONS = ['❤️','😂','😮','😢','😡','👍','🙏','🔥']

// ============================================================
// TYPES MESSAGES
// ============================================================
const MSG_ICONS = { image: '🖼️', video: '🎥', audio: '🎙️', file: '📎' }

function formatMsgTime(date) {
  const d = new Date(date)
  if (isToday(d))     return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Hier ' + format(d, 'HH:mm')
  return format(d, 'dd/MM HH:mm')
}

function groupMessagesByDate(messages) {
  const groups = []
  let lastDate = null
  messages.forEach(msg => {
    const d = new Date(msg.created_at)
    const dateStr = format(d, 'yyyy-MM-dd')
    if (dateStr !== lastDate) {
      groups.push({ type: 'date', id: 'date-' + dateStr, label: isToday(d) ? "Aujourd'hui" : isYesterday(d) ? 'Hier' : format(d, 'dd MMMM yyyy', { locale: fr }) })
      lastDate = dateStr
    }
    groups.push({ type: 'message', ...msg })
  })
  return groups
}

// ============================================================
// PAGE PRINCIPALE MESSAGES
// ============================================================
export default function MessagesPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const openConvId = searchParams.get('conv')

  const [conversations, setConversations] = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [activeConv, setActiveConv]       = useState(null)

  useEffect(() => { if (user) loadConversations() }, [user])

  // Auto-ouvrir conv depuis URL param
  useEffect(() => {
    if (openConvId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === openConvId)
      if (conv) setActiveConv(conv)
    }
  }, [openConvId, conversations])

  const loadConversations = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        shop:shops(id, name, cover_url, slug),
        buyer:profiles!conversations_buyer_id_fkey(id, username, avatar_url, last_seen_at),
        seller:profiles!conversations_seller_id_fkey(id, username, avatar_url, last_seen_at)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  // Realtime sur conversations
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `buyer_id=eq.${user.id}`,
      }, () => loadConversations())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `seller_id=eq.${user.id}`,
      }, () => loadConversations())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const filtered = conversations.filter(c => {
    const other = c.buyer_id === user?.id ? c.seller : c.buyer
    const q = search.toLowerCase()
    return !q || (c.shop?.name || '').toLowerCase().includes(q) || (other?.username || '').toLowerCase().includes(q)
  })

  if (activeConv) {
    return (
      <ChatWindow
        conv={activeConv}
        user={user}
        onBack={() => { setActiveConv(null); loadConversations() }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-600 pt-12 pb-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl text-white font-bold">Messages</h1>
          <span className="text-primary-300 text-sm font-medium">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </span>
        </div>
        {/* Recherche */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/15 border border-white/20 text-white placeholder-white/40 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gold-400/50"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="space-y-1 p-2">
            {[1,2,3,4].map(i => <ConvSkeleton key={i}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-5xl mb-3">💬</p>
            <p className="font-display text-xl font-bold text-dark-800">Aucun message</p>
            <p className="text-dark-600/50 text-sm mt-2">
              {search ? 'Aucun résultat' : 'Contactez un vendeur depuis une boutique'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filtered.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                userId={user?.id}
                onClick={() => setActiveConv(conv)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CONVERSATION ITEM
// ============================================================
function ConvItem({ conv, userId, onClick }) {
  const isBuyer = conv.buyer_id === userId
  const other = isBuyer ? conv.seller : conv.buyer
  const isOnline = other?.last_seen_at
    ? (new Date() - new Date(other.last_seen_at)) < 120000 : false

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-100 transition-colors text-left">
      <div className="relative flex-shrink-0">
        <Avatar src={other?.avatar_url} name={other?.username} size="lg"/>
        {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-bold text-dark-800 text-sm truncate">@{other?.username}</p>
          <p className="text-dark-600/40 text-[10px] flex-shrink-0 ml-2">
            {formatMsgTime(conv.last_message_at)}
          </p>
        </div>
        <p className="text-primary-600 text-xs font-semibold truncate mb-0.5">
          🏪 {conv.shop?.name}
        </p>
        <p className="text-dark-600/50 text-xs truncate">
          {isBuyer ? 'Vous avez contacté ce vendeur' : 'Ce client vous a contacté'}
        </p>
      </div>
    </button>
  )
}

// ============================================================
// FENÊTRE DE CHAT
// ============================================================
function ChatWindow({ conv, user, onBack }) {
  const isBuyer     = conv.buyer_id === user.id
  const other       = isBuyer ? conv.seller : conv.buyer
  const isOnline    = other?.last_seen_at ? (new Date() - new Date(other.last_seen_at)) < 120000 : false

  const [messages, setMessages]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [text, setText]                 = useState('')
  const [sending, setSending]           = useState(false)
  const [reactionTarget, setReactionTarget] = useState(null)
  const [longPressMsg, setLongPressMsg] = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [recording, setRecording]       = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState(null)

  const bottomRef  = useRef()
  const inputRef   = useRef()
  const fileRef    = useRef()
  const audioRef   = useRef()
  const pressTimer = useRef()

  // Charger messages
  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, username, avatar_url)')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  useEffect(() => { loadMessages() }, [conv.id])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conv.id}`,
      }, async (payload) => {
        const { data: sender } = await supabase
          .from('profiles').select('id, username, avatar_url').eq('id', payload.new.sender_id).single()
        const newMsg = { ...payload.new, sender }
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conv.id}`,
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conv.id}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [conv.id])

  // Marquer comme lu
  useEffect(() => {
    supabase.from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conv.id)
      .neq('sender_id', user.id)
      .eq('is_read', false)
  }, [messages])

  // Envoyer texte
  const sendText = async () => {
    if (!text.trim() || sending) return
    const content = text.trim()
    setText('')
    setSending(true)
    try {
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        sender_id: user.id,
        content,
        type: 'text',
      })
    } catch { toast.error('Erreur envoi') }
    finally { setSending(false) }
  }

  // Envoyer image/fichier
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      const type = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file'

      const path = `${conv.id}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from(BUCKETS.MESSAGES).upload(path, file)
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from(BUCKETS.MESSAGES).getPublicUrl(data.path)

      await supabase.from('messages').insert({
        conversation_id: conv.id,
        sender_id: user.id,
        type,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        content: null,
      })
      toast.success('Fichier envoyé !')
    } catch { toast.error('Erreur upload') }
    finally { setUploading(false); e.target.value = '' }
  }

  // Enregistrement audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []
      recorder.ondataavailable = e => chunks.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setUploading(true)
        try {
          const path = `${conv.id}/${Date.now()}_voice.webm`
          const { data, error } = await supabase.storage.from(BUCKETS.MESSAGES).upload(path, blob)
          if (error) throw error
          const { data: { publicUrl } } = supabase.storage.from(BUCKETS.MESSAGES).getPublicUrl(data.path)
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user.id,
            type: 'audio',
            file_url: publicUrl,
            file_name: 'Message vocal',
            file_size: blob.size,
          })
          toast.success('Message vocal envoyé !')
        } catch { toast.error('Erreur envoi audio') }
        finally { setUploading(false) }
      }
      recorder.start()
      setMediaRecorder(recorder)
      setRecording(true)
    } catch { toast.error('Microphone non disponible') }
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    setRecording(false)
    setMediaRecorder(null)
  }

  // Réaction emoji
  const addReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    const reactions = { ...(msg.reactions || {}) }
    if (!reactions[emoji]) reactions[emoji] = []
    const idx = reactions[emoji].indexOf(user.id)
    if (idx > -1) reactions[emoji].splice(idx, 1)
    else reactions[emoji].push(user.id)
    if (reactions[emoji].length === 0) delete reactions[emoji]
    await supabase.from('messages').update({ reactions }).eq('id', msgId)
    setReactionTarget(null)
  }

  // Supprimer message
  const deleteMessage = async (msg) => {
    if (msg.sender_id !== user.id) return
    await supabase.from('messages').delete().eq('id', msg.id)
    setLongPressMsg(null)
    toast.success('Message supprimé')
  }

  // Long press
  const handleLongPress = (msg) => {
    pressTimer.current = setTimeout(() => setLongPressMsg(msg), 500)
  }

  const grouped = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-dvh bg-surface-50">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-600 pt-12 pb-3 px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-90">
            <ArrowLeft size={18} className="text-white"/>
          </button>
          <div className="relative">
            <Avatar src={other?.avatar_url} name={other?.username} size="md" className="ring-2 ring-white/30"/>
            {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-primary-700"/>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">@{other?.username}</p>
            <p className="text-primary-300 text-xs">
              {isOnline ? '🟢 En ligne' : `Vu ${formatDistanceToNow(new Date(other?.last_seen_at || Date.now()), { addSuffix: true, locale: fr })}`}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="px-2.5 py-1 rounded-xl bg-white/10">
              <p className="text-white text-[10px] font-semibold truncate max-w-[80px]">🏪 {conv.shop?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        onClick={() => { setReactionTarget(null); setLongPressMsg(null) }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center">
              <span className="text-3xl">💬</span>
            </div>
            <p className="font-bold text-dark-800">Démarrez la conversation</p>
            <p className="text-dark-600/50 text-sm">Envoyez un message à propos de la boutique {conv.shop?.name}</p>
          </div>
        ) : (
          grouped.map(item => {
            if (item.type === 'date') return (
              <div key={item.id} className="flex justify-center my-3">
                <span className="bg-dark-700/20 text-dark-600 text-[10px] font-semibold px-3 py-1 rounded-full">{item.label}</span>
              </div>
            )

            const isMe = item.sender_id === user.id
            return (
              <MessageBubble
                key={item.id}
                msg={item}
                isMe={isMe}
                onLongPress={() => handleLongPress(item)}
                onLongPressEnd={() => clearTimeout(pressTimer.current)}
                onReact={() => { setReactionTarget(item.id); setLongPressMsg(null) }}
                reactionActive={reactionTarget === item.id}
                onAddReaction={emoji => addReaction(item.id, emoji)}
                onDelete={() => deleteMessage(item)}
                showMenu={longPressMsg?.id === item.id}
                onCloseMenu={() => setLongPressMsg(null)}
              />
            )
          })
        )}
        <div ref={bottomRef}/>
      </div>

      {/* BARRE DE SAISIE */}
      <div className="flex-shrink-0 bg-white border-t border-surface-100 px-3 py-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>
            <span className="text-xs text-primary-600 font-medium">Envoi en cours...</span>
          </div>
        )}
        {recording && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-red-50 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"/>
            <span className="text-xs text-red-600 font-semibold">Enregistrement vocal...</span>
            <button onClick={stopRecording} className="ml-auto">
              <Square size={16} className="text-red-600"/>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Boutons médias */}
          <div className="flex gap-1 flex-shrink-0 pb-1">
            <button onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center active:scale-90">
              <Image size={16} className="text-dark-600/60"/>
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center active:scale-90">
              <Paperclip size={16} className="text-dark-600/60"/>
            </button>
          </div>

          {/* Zone texte */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
              placeholder="Message..."
              rows={1}
              className="w-full bg-surface-100 rounded-2xl px-4 py-2.5 text-sm text-dark-800 placeholder-dark-600/40 outline-none resize-none leading-relaxed max-h-32 font-medium"
              style={{ minHeight: '40px' }}
            />
          </div>

          {/* Bouton envoyer / micro */}
          {text.trim() ? (
            <button onClick={sendText} disabled={sending}
              className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-green active:scale-90 transition-transform disabled:opacity-50 pb-0">
              {sending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <Send size={16} className="text-white ml-0.5"/>}
            </button>
          ) : (
            <button
              onPointerDown={startRecording}
              onPointerUp={recording ? stopRecording : undefined}
              onPointerLeave={recording ? stopRecording : undefined}
              className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all', recording ? 'bg-red-500 animate-pulse' : 'bg-surface-100')}>
              {recording ? <MicOff size={16} className="text-white"/> : <Mic size={16} className="text-dark-600/60"/>}
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={handleFileSelect} className="hidden"/>
      </div>
    </div>
  )
}

// ============================================================
// MESSAGE BUBBLE
// ============================================================
function MessageBubble({ msg, isMe, onLongPress, onLongPressEnd, onReact, reactionActive, onAddReaction, onDelete, showMenu, onCloseMenu }) {
  const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0
  const totalReactions = hasReactions
    ? Object.entries(msg.reactions).reduce((s, [, users]) => s + users.length, 0) : 0

  return (
    <div className={clsx('flex gap-2 group', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar (autre seulement) */}
      {!isMe && (
        <Avatar src={msg.sender?.avatar_url} name={msg.sender?.username} size="xs" className="self-end mb-1 flex-shrink-0"/>
      )}

      <div className={clsx('max-w-[75%] relative', isMe ? 'items-end' : 'items-start')}>
        {/* Bulle */}
        <div
          onPointerDown={onLongPress}
          onPointerUp={onLongPressEnd}
          onPointerLeave={onLongPressEnd}
          onContextMenu={e => { e.preventDefault(); onLongPress() }}
          className={clsx(
            'relative rounded-2xl px-3.5 py-2.5 cursor-pointer select-none',
            isMe
              ? 'bg-primary-600 text-white rounded-br-sm'
              : 'bg-white text-dark-800 shadow-card rounded-bl-sm'
          )}
        >
          {/* Contenu selon type */}
          {msg.type === 'text' && (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
          )}

          {msg.type === 'image' && (
            <div className="overflow-hidden rounded-xl">
              <img src={msg.file_url} alt="Image" className="max-w-[220px] max-h-[220px] object-cover rounded-xl cursor-zoom-in"
                onClick={() => window.open(msg.file_url, '_blank')}/>
            </div>
          )}

          {msg.type === 'video' && (
            <video src={msg.file_url} controls className="max-w-[220px] rounded-xl"/>
          )}

          {msg.type === 'audio' && (
            <div className={clsx('flex items-center gap-2 px-1', isMe ? 'text-white' : 'text-dark-700')}>
              <Mic size={16}/>
              <audio src={msg.file_url} controls className="h-8 max-w-[160px]" style={{ filter: isMe ? 'invert(1)' : 'none' }}/>
            </div>
          )}

          {msg.type === 'file' && (
            <a href={msg.file_url} target="_blank" rel="noreferrer"
              className={clsx('flex items-center gap-2 text-sm font-medium underline', isMe ? 'text-white/90' : 'text-primary-600')}>
              <Paperclip size={14}/>
              <span className="truncate max-w-[140px]">{msg.file_name || 'Fichier'}</span>
            </a>
          )}

          {/* Heure + lu */}
          <div className={clsx('flex items-center gap-1 mt-0.5', isMe ? 'justify-end' : 'justify-start')}>
            <span className={clsx('text-[9px]', isMe ? 'text-white/60' : 'text-dark-600/40')}>
              {formatMsgTime(msg.created_at)}
            </span>
            {isMe && (
              msg.is_read
                ? <CheckCheck size={11} className="text-blue-300"/>
                : <Check size={11} className="text-white/60"/>
            )}
          </div>
        </div>

        {/* Réactions affichées */}
        {hasReactions && (
          <div className={clsx('flex flex-wrap gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onAddReaction(emoji)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-surface-100 border border-surface-200 text-xs hover:bg-surface-200 transition-colors">
                <span>{emoji}</span>
                <span className="text-dark-600 text-[10px] font-semibold">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Picker réactions */}
        {reactionActive && (
          <div className={clsx(
            'absolute z-20 flex gap-1 bg-white rounded-2xl shadow-modal p-2 border border-surface-200 animate-scale-in',
            isMe ? 'right-0 bottom-full mb-2' : 'left-0 bottom-full mb-2'
          )}>
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => onAddReaction(emoji)}
                className="w-8 h-8 rounded-xl hover:bg-surface-100 flex items-center justify-center text-lg active:scale-75 transition-transform">
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Menu long press */}
        {showMenu && (
          <div className={clsx(
            'absolute z-20 bg-white rounded-2xl shadow-modal border border-surface-200 overflow-hidden animate-scale-in min-w-[160px]',
            isMe ? 'right-0 bottom-full mb-2' : 'left-0 bottom-full mb-2'
          )}>
            <button onClick={onReact}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-dark-700 hover:bg-surface-50">
              <Smile size={15}/> Réagir
            </button>
            {isMe && (
              <button onClick={onDelete}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 border-t border-surface-100">
                <Trash2 size={15}/> Supprimer
              </button>
            )}
            <button onClick={onCloseMenu}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-dark-500 hover:bg-surface-50 border-t border-surface-100">
              <X size={15}/> Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// SKELETON
// ============================================================
function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-12 h-12 rounded-2xl skeleton flex-shrink-0"/>
      <div className="flex-1 space-y-2">
        <div className="h-3.5 skeleton rounded-lg w-1/2"/>
        <div className="h-3 skeleton rounded-lg w-3/4"/>
        <div className="h-3 skeleton rounded-lg w-1/3"/>
      </div>
    </div>
  )
}
