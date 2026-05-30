import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Send, ArrowLeft, Image, Mic, Paperclip, Smile,
  Check, CheckCheck, MoreVertical, Trash2, X,
  Search, MicOff, Phone, Video, Star, Forward,
  Copy, Reply, Pin, Download, Camera, Plus,
  ChevronDown, Info, Bell, BellOff, Archive,
  MessageCircle, Users, Clock, Loader2, ZoomIn
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════
const REACTIONS = ['❤️','😂','😮','😢','😡','👍','🙏','🔥','🎉','💯']
const MSG_BUCKET = 'messages'

// ══════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════
function fmtTime(date) {
  const d = new Date(date)
  if (isToday(d))     return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Hier ' + format(d, 'HH:mm')
  return format(d, 'dd/MM/yy')
}

function fmtDate(date) {
  const d = new Date(date)
  if (isToday(d))     return "Aujourd'hui"
  if (isYesterday(d)) return 'Hier'
  return format(d, 'dd MMMM yyyy', { locale: fr })
}

function isOnline(lastSeen) {
  if (!lastSeen) return false
  return (Date.now() - new Date(lastSeen).getTime()) < 120000
}

function groupByDate(msgs) {
  const out = []
  let last = null
  msgs.forEach(m => {
    const d = format(new Date(m.created_at), 'yyyy-MM-dd')
    if (d !== last) { out.push({ type: 'date', id: 'date-' + d, label: fmtDate(m.created_at) }); last = d }
    out.push({ type: 'msg', ...m })
  })
  return out
}

// ══════════════════════════════════════════════════════════
// AVATAR
// ══════════════════════════════════════════════════════════
function Avatar({ src, name, size = 'md', online = false }) {
  const sizes = { xs: 'w-7 h-7 text-[10px]', sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-12 h-12 text-base' }
  const dotSizes = { xs: 'w-2 h-2', sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3 h-3' }
  const initials = name ? name[0].toUpperCase() : '?'
  return (
    <div className="relative flex-shrink-0">
      <div className={clsx('rounded-2xl overflow-hidden bg-primary-100 flex items-center justify-center font-bold text-primary-700', sizes[size])}>
        {src ? <img src={src} alt={name} className="w-full h-full object-cover"/> : initials}
      </div>
      {online && <span className={clsx('absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-400 border-2 border-white', dotSizes[size])}/>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// IMAGE VIEWER
// ══════════════════════════════════════════════════════════
function ImageViewer({ url, onClose }) {
  if (!url) return null
  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
        <X size={20} className="text-white"/>
      </button>
      <img src={url} alt="" className="max-w-full max-h-full object-contain"/>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// AUDIO PLAYER
// ══════════════════════════════════════════════════════════
function AudioPlayer({ url, isMe }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play()
    setPlaying(!playing)
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={url}
        onTimeUpdate={e => setProgress(e.target.currentTime / (e.target.duration || 1))}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => { setPlaying(false); setProgress(0) }}/>
      <button onClick={toggle}
        className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          isMe ? 'bg-white/20' : 'bg-primary-100')}>
        {playing
          ? <span className={clsx('text-sm', isMe ? 'text-white' : 'text-primary-700')}>⏸</span>
          : <span className={clsx('text-sm', isMe ? 'text-white' : 'text-primary-700')}>▶</span>
        }
      </button>
      <div className="flex-1">
        <div className={clsx('h-1.5 rounded-full overflow-hidden', isMe ? 'bg-white/20' : 'bg-primary-100')}>
          <div className={clsx('h-full rounded-full transition-all', isMe ? 'bg-white' : 'bg-primary-600')}
            style={{ width: `${progress * 100}%` }}/>
        </div>
        <p className={clsx('text-[9px] mt-0.5', isMe ? 'text-white/60' : 'text-dark-400')}>
          {duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : '0:00'}
        </p>
      </div>
      <Mic size={12} className={isMe ? 'text-white/40' : 'text-dark-400'}/>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// BULLE DE MESSAGE
// ══════════════════════════════════════════════════════════
function MessageBubble({ msg, isMe, onLongPress, onReact, reactions, onDelete, onReply, onCopy, onZoom, replyMsg }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [reactionOpen, setReactionOpen] = useState(false)
  const longTimer = useRef(null)

  const handlePointerDown = () => {
    longTimer.current = setTimeout(() => setMenuOpen(true), 500)
  }
  const handlePointerUp = () => clearTimeout(longTimer.current)

  const totalReacts = reactions ? Object.values(reactions).reduce((s, a) => s + a.length, 0) : 0

  return (
    <div className={clsx('flex gap-2 group mb-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {!isMe && (
        <Avatar src={msg.sender?.avatar_url} name={msg.sender?.username} size="xs"
          online={isOnline(msg.sender?.last_seen_at)}/>
      )}

      <div className={clsx('relative', isMe ? 'items-end' : 'items-start')} style={{ maxWidth: '75%' }}>
        {/* Reply preview */}
        {msg.reply_to_content && (
          <div className={clsx('flex items-center gap-2 mb-0.5 px-2 py-1.5 rounded-xl text-xs border-l-2',
            isMe ? 'bg-primary-700 border-white/40 text-white/70' : 'bg-surface-100 border-primary-400 text-dark-500')}>
            <Reply size={10}/>
            <span className="truncate max-w-[150px]">{msg.reply_to_content}</span>
          </div>
        )}

        {/* Bulle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={e => { e.preventDefault(); setMenuOpen(true) }}
          className={clsx(
            'relative rounded-2xl cursor-pointer select-none',
            msg.type === 'image' || msg.type === 'video' ? 'p-0 overflow-hidden' : 'px-3.5 py-2.5',
            isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white text-dark-800 shadow-sm rounded-bl-sm border border-surface-100'
          )}>

          {/* Texte */}
          {msg.type === 'text' && (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
          )}

          {/* Image */}
          {msg.type === 'image' && (
            <div className="relative">
              <img src={msg.file_url} alt="Image" className="max-w-[240px] max-h-[300px] object-cover block"
                onClick={() => onZoom && onZoom(msg.file_url)}/>
              <button onClick={() => onZoom && onZoom(msg.file_url)}
                className="absolute top-2 right-2 w-7 h-7 bg-black/40 rounded-full flex items-center justify-center">
                <ZoomIn size={12} className="text-white"/>
              </button>
            </div>
          )}

          {/* Video */}
          {msg.type === 'video' && (
            <video src={msg.file_url} controls className="max-w-[240px] max-h-[300px] block"/>
          )}

          {/* Audio */}
          {msg.type === 'audio' && (
            <div className="py-1"><AudioPlayer url={msg.file_url} isMe={isMe}/></div>
          )}

          {/* Fichier */}
          {msg.type === 'file' && (
            <a href={msg.file_url} target="_blank" rel="noreferrer" download
              className={clsx('flex items-center gap-2 text-sm font-medium', isMe ? 'text-white/90' : 'text-primary-600')}>
              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                isMe ? 'bg-white/20' : 'bg-primary-50')}>
                <Paperclip size={16}/>
              </div>
              <div className="min-w-0">
                <p className="truncate max-w-[130px] font-semibold">{msg.file_name || 'Fichier'}</p>
                <p className={clsx('text-[10px]', isMe ? 'text-white/50' : 'text-dark-400')}>
                  {msg.file_size ? `${(msg.file_size / 1024).toFixed(0)} Ko` : 'Fichier'}
                </p>
              </div>
              <Download size={14} className="flex-shrink-0"/>
            </a>
          )}

          {/* Statut */}
          {msg.type !== 'image' && msg.type !== 'video' && (
            <div className={clsx('flex items-center gap-1 mt-0.5', isMe ? 'justify-end' : 'justify-start')}>
              <span className={clsx('text-[9px]', isMe ? 'text-white/60' : 'text-dark-400/60')}>{fmtTime(msg.created_at)}</span>
              {isMe && (msg.is_read
                ? <CheckCheck size={11} className="text-blue-300"/>
                : <Check size={11} className="text-white/60"/>
              )}
              {msg.is_starred && <Star size={9} className={isMe ? 'text-yellow-300 fill-yellow-300' : 'text-yellow-500 fill-yellow-500'}/>}
            </div>
          )}
        </div>

        {/* Réactions affichées */}
        {reactions && totalReacts > 0 && (
          <div className={clsx('flex flex-wrap gap-1 mt-1', isMe ? 'justify-end' : 'justify-start')}>
            {Object.entries(reactions).filter(([, u]) => u.length > 0).map(([emoji, users]) => (
              <span key={emoji}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white border border-surface-200 text-xs shadow-sm">
                {emoji} <span className="text-dark-500 text-[10px] font-bold">{users.length}</span>
              </span>
            ))}
          </div>
        )}

        {/* MENU LONG PRESS */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}/>
            <div className={clsx(
              'absolute z-40 bg-white rounded-2xl shadow-xl border border-surface-100 overflow-hidden min-w-[190px] animate-scale-in',
              isMe ? 'right-0' : 'left-0', 'bottom-full mb-2'
            )}>
              {/* Réactions rapides */}
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-surface-100">
                {REACTIONS.slice(0, 6).map(emoji => (
                  <button key={emoji} onClick={() => { onReact(emoji); setMenuOpen(false) }}
                    className="text-lg active:scale-75 transition-transform hover:scale-125">
                    {emoji}
                  </button>
                ))}
                <button onClick={() => { setReactionOpen(true); setMenuOpen(false) }}
                  className="w-7 h-7 bg-surface-100 rounded-full flex items-center justify-center text-xs text-dark-500 font-bold">+</button>
              </div>

              {[
                { icon: Reply,   label: 'Répondre',   action: () => { onReply(); setMenuOpen(false) } },
                { icon: Copy,    label: 'Copier',      action: () => { onCopy(); setMenuOpen(false) } },
                { icon: Star,    label: msg.is_starred ? 'Retirer favori' : 'Mettre en favori', action: () => setMenuOpen(false) },
                { icon: Forward, label: 'Transférer',  action: () => { toast('Bientôt disponible'); setMenuOpen(false) } },
                ...(isMe ? [{ icon: Trash2, label: 'Supprimer', action: () => { onDelete(); setMenuOpen(false) }, red: true }] : []),
              ].map(item => {
                const Icon = item.icon
                return (
                  <button key={item.label} onClick={item.action}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface-50 border-t border-surface-50',
                      item.red ? 'text-red-600' : 'text-dark-700')}>
                    <Icon size={15}/> {item.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* PICKER RÉACTIONS COMPLET */}
        {reactionOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setReactionOpen(false)}/>
            <div className={clsx('absolute z-40 bg-white rounded-2xl shadow-xl border border-surface-100 p-3 animate-scale-in',
              isMe ? 'right-0' : 'left-0', 'bottom-full mb-2')}>
              <div className="grid grid-cols-5 gap-2">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => { onReact(emoji); setReactionOpen(false) }}
                    className="w-10 h-10 rounded-xl hover:bg-surface-100 flex items-center justify-center text-2xl active:scale-75 transition-transform">
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// CHAT WINDOW
// ══════════════════════════════════════════════════════════
function ChatWindow({ conv, user, onBack, onMarkRead }) {
  const other = conv.buyer_id === user.id ? conv.seller : conv.buyer
  const [messages, setMessages]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [text, setText]             = useState('')
  const [sending, setSending]       = useState(false)
  const [recording, setRecording]   = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [replyTo, setReplyTo]       = useState(null)
  const [zoomImg, setZoomImg]       = useState(null)
  const [showInfo, setShowInfo]     = useState(false)
  const [typing, setTyping]         = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [pinned, setPinned]         = useState(null)
  const [searchMsg, setSearchMsg]   = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [uploading, setUploading]   = useState(false)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const fileRef     = useRef(null)
  const imgRef      = useRef(null)
  const mediaRef    = useRef(null)
  const recTimer    = useRef(null)
  const typingTimer = useRef(null)
  const online      = isOnline(other?.last_seen_at)

  // Charger messages
  useEffect(() => { 
    // Réinitialiser le badge immédiatement à l'ouverture
    onMarkRead?.(conv.id)
    loadMessages() 
  }, [conv.id])

  // Scroll bas
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Realtime messages
  useEffect(() => {
    const ch = supabase.channel(`chat-${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        payload => {
          setMessages(prev => [...prev, payload.new])
          if (payload.new.sender_id !== user.id) {
            markRead(conv.id)
            onMarkRead?.(conv.id)
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        payload => setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        payload => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe()

    // Typing indicator
    const typingCh = supabase.channel(`typing-${conv.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user.id) {
          setOtherTyping(true)
          clearTimeout(typingTimer.current)
          typingTimer.current = setTimeout(() => setOtherTyping(false), 3000)
        }
      })
      .subscribe()

    // Mise à jour last_seen
    supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

    return () => { supabase.removeChannel(ch); supabase.removeChannel(typingCh) }
  }, [conv.id])

  const loadMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, username, avatar_url, last_seen_at)')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
    // Marquer comme lus via fonction SQL (contourne RLS)
    if (data?.length) {
      const { error } = await supabase.rpc('mark_conversation_read', {
        p_conv_id: conv.id,
        p_user_id: user.id
      })
      if (!error) onMarkRead?.(conv.id)
    }
    setLoading(false)
  }

  const markRead = async (convId) => {
    await supabase.rpc('mark_conversation_read', {
      p_conv_id: convId,
      p_user_id: user.id
    })
  }

  const broadcastTyping = () => {
    supabase.channel(`typing-${conv.id}`).send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id } })
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
    broadcastTyping()
  }

  // Envoyer texte
  const sendText = async () => {
    const content = text.trim()
    if (!content || sending) return
    setSending(true); setText('')
    if (inputRef.current) inputRef.current.style.height = '40px'
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender_id: user.id,
      content,
      type: 'text',
      reply_to_id: replyTo?.id || null,
      reply_to_content: replyTo?.content || null,
    })
    await supabase.from('conversations').update({ last_message: content, last_message_at: new Date().toISOString() }).eq('id', conv.id)
    setReplyTo(null)
    setSending(false)
  }

  // Upload fichier
  const uploadFile = async (file) => {
    const ext  = file.name.split('.').pop()
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file'
    const path = `${conv.id}/${Date.now()}.${ext}`

    setUploading(true)
    const { error } = await supabase.storage.from(MSG_BUCKET).upload(path, file, { upsert: true })
    if (error) { toast.error('Erreur upload'); setUploading(false); return }

    const { data: urlData } = supabase.storage.from(MSG_BUCKET).getPublicUrl(path)
    await supabase.from('messages').insert({
      conversation_id: conv.id, sender_id: user.id, type,
      file_url: urlData.publicUrl, file_name: file.name,
      file_size: file.size, content: type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Vidéo' : type === 'audio' ? '🎙️ Audio' : `📎 ${file.name}`,
      reply_to_id: replyTo?.id || null, reply_to_content: replyTo?.content || null,
    })
    await supabase.from('conversations').update({ last_message: type === 'image' ? '📷 Photo' : '📎 Fichier', last_message_at: new Date().toISOString() }).eq('id', conv.id)
    setReplyTo(null); setUploading(false)
  }

  // Enregistrement audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
        await uploadFile(file)
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      let t = 0
      recTimer.current = setInterval(() => { t++; setRecordTime(t) }, 1000)
    } catch { toast.error('Microphone non disponible') }
  }

  const stopRecording = () => {
    if (mediaRef.current) { mediaRef.current.stop(); mediaRef.current = null }
    clearInterval(recTimer.current)
    setRecording(false); setRecordTime(0)
  }

  // Réaction
  const addReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId)
    const reactions = { ...(msg?.reactions || {}) }
    if (!reactions[emoji]) reactions[emoji] = []
    const idx = reactions[emoji].indexOf(user.id)
    if (idx > -1) reactions[emoji].splice(idx, 1)
    else reactions[emoji].push(user.id)
    await supabase.from('messages').update({ reactions }).eq('id', msgId)
  }

  // Supprimer
  const deleteMsg = async (msgId) => {
    await supabase.from('messages').delete().eq('id', msgId)
    toast.success('Message supprimé')
  }

  // Copier
  const copyMsg = (content) => {
    navigator.clipboard.writeText(content)
    toast.success('Copié !')
  }

  const filtered = searchMsg
    ? messages.filter(m => m.content?.toLowerCase().includes(searchMsg.toLowerCase()))
    : messages

  const grouped = groupByDate(filtered)

  return (
    <div className="fixed inset-0 bg-surface-50 flex flex-col" style={{ zIndex: 200 }}>
      {/* Fond décoratif léger */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #2ECC71 1px, transparent 1px)', backgroundSize: '20px 20px' }}/>

      {/* ── HEADER ── */}
      <div className="relative bg-primary-700 pt-12 pb-3 px-4 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0b3d2e, #1a5c2e)' }}>

        {/* Bandeau message épinglé */}
        {pinned && (
          <div className="mb-2 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Pin size={12} className="text-yellow-300 flex-shrink-0"/>
            <p className="text-white/80 text-xs truncate flex-1">{pinned.content}</p>
            <button onClick={() => setPinned(null)}><X size={12} className="text-white/50"/></button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-90">
            <ArrowLeft size={18} className="text-white"/>
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => setShowInfo(true)}>
            <Avatar src={other?.avatar_url} name={other?.username} size="md" online={online}/>
            <div className="min-w-0">
              <p className="text-white font-bold text-base truncate leading-tight">@{other?.username}</p>
              <p className="text-white/50 text-xs">
                {otherTyping ? <span className="text-green-300 animate-pulse">En train d'écrire...</span>
                  : online ? <span className="text-emerald-300">En ligne</span>
                  : other?.last_seen_at ? `Vu ${formatDistanceToNow(new Date(other.last_seen_at), { locale: fr, addSuffix: true })}` : 'Hors ligne'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setShowSearch(!showSearch)}
              className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-90">
              <Search size={16} className="text-white"/>
            </button>
            <button onClick={() => toast('Appel bientôt disponible')}
              className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-90">
              <Phone size={16} className="text-white"/>
            </button>
            <button onClick={() => setShowInfo(true)}
              className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-90">
              <MoreVertical size={16} className="text-white"/>
            </button>
          </div>
        </div>

        {/* Recherche dans messages */}
        {showSearch && (
          <div className="mt-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"/>
            <input autoFocus value={searchMsg} onChange={e => setSearchMsg(e.target.value)}
              placeholder="Rechercher dans la conversation..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none border border-white/15"/>
          </div>
        )}
      </div>

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-primary-400"/>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary-50 flex items-center justify-center mb-4">
              <MessageCircle size={36} className="text-primary-400"/>
            </div>
            <p className="font-bold text-dark-600">Démarrez la conversation</p>
            <p className="text-sm text-dark-400 mt-1">Dites bonjour à @{other?.username} !</p>
          </div>
        ) : (
          grouped.map(item => {
            if (item.type === 'date') {
              return (
                <div key={item.id} className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-surface-200"/>
                  <span className="text-xs text-dark-400 font-semibold px-3 py-1 bg-surface-100 rounded-full">{item.label}</span>
                  <div className="flex-1 h-px bg-surface-200"/>
                </div>
              )
            }
            const isMe = item.sender_id === user.id
            return (
              <MessageBubble
                key={item.id}
                msg={item}
                isMe={isMe}
                reactions={item.reactions}
                replyMsg={item.reply_to_id ? messages.find(m => m.id === item.reply_to_id) : null}
                onReact={emoji => addReaction(item.id, emoji)}
                onDelete={() => deleteMsg(item.id)}
                onReply={() => setReplyTo(item)}
                onCopy={() => copyMsg(item.content || '')}
                onZoom={url => setZoomImg(url)}
              />
            )
          })
        )}

        {/* Indicateur typing */}
        {otherTyping && (
          <div className="flex items-center gap-2 py-1">
            <Avatar src={other?.avatar_url} name={other?.username} size="xs"/>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-dark-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}/>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="flex justify-end">
            <div className="bg-primary-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary-600"/>
              <span className="text-xs text-primary-700 font-semibold">Envoi en cours...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* ── REPLY BANNER ── */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 border-t border-primary-100">
          <Reply size={14} className="text-primary-600 flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary-700">Répondre à @{replyTo.sender?.username}</p>
            <p className="text-xs text-dark-500 truncate">{replyTo.content || '📎 Fichier'}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center">
            <X size={12} className="text-primary-700"/>
          </button>
        </div>
      )}

      {/* ── INPUT ── */}
      <div className="bg-white border-t border-surface-100 px-3 py-2.5 flex-shrink-0"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>

        {recording ? (
          /* Mode enregistrement */
          <div className="flex items-center gap-3 bg-red-50 rounded-2xl px-4 py-3 border border-red-200">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0"/>
            <span className="text-red-600 font-bold text-sm flex-1">
              {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')} — Enregistrement...
            </span>
            <button onClick={stopRecording}
              className="px-4 py-1.5 bg-red-500 text-white font-bold text-sm rounded-xl active:scale-95">
              Envoyer ✓
            </button>
            <button onClick={() => { stopRecording(); setRecordTime(0) }}
              className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
              <X size={14} className="text-red-600"/>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Boutons médias */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => imgRef.current?.click()}
                className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center active:scale-90">
                <Camera size={17} className="text-dark-500"/>
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center active:scale-90">
                <Paperclip size={17} className="text-dark-500"/>
              </button>
            </div>

            {/* Zone texte */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                placeholder="Message..."
                rows={1}
                className="w-full bg-surface-100 rounded-2xl px-4 py-2.5 text-sm text-dark-800 placeholder-dark-400 outline-none resize-none leading-relaxed font-medium block"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>

            {/* Bouton send / micro */}
            {text.trim() ? (
              <button onClick={sendText} disabled={sending}
                className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform disabled:opacity-50 shadow-lg"
                style={{ boxShadow: '0 4px 15px rgba(46,204,113,0.4)' }}>
                {sending
                  ? <Loader2 size={16} className="text-white animate-spin"/>
                  : <Send size={16} className="text-white ml-0.5"/>}
              </button>
            ) : (
              <button
                onPointerDown={startRecording}
                className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all',
                  recording ? 'bg-red-500 animate-pulse' : 'bg-surface-100')}>
                <Mic size={17} className={recording ? 'text-white' : 'text-dark-500'}/>
              </button>
            )}
          </div>
        )}

        {/* Inputs fichiers cachés */}
        <input ref={imgRef}  type="file" accept="image/*,video/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}/>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}/>
      </div>

      {/* ── INFO PANEL ── */}
      {showInfo && (
        <>
          <div className="fixed inset-0 bg-black/40 z-20 backdrop-blur-sm" onClick={() => setShowInfo(false)}/>
          <div className="fixed top-0 right-0 h-full w-80 bg-white z-30 flex flex-col shadow-2xl"
            style={{ animation: 'slideLeft 0.25s ease' }}>
            <div className="bg-primary-700 pt-14 pb-6 px-4 text-center"
              style={{ background: 'linear-gradient(135deg, #0b3d2e, #1a5c2e)' }}>
              <button onClick={() => setShowInfo(false)} className="absolute top-4 left-4 w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <X size={16} className="text-white"/>
              </button>
              <Avatar src={other?.avatar_url} name={other?.username} size="lg" online={online}/>
              <p className="text-white font-bold text-lg mt-3">@{other?.username}</p>
              <p className="text-white/50 text-xs">{online ? '🟢 En ligne' : 'Hors ligne'}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[
                { icon: Bell,    label: 'Notifications',       action: () => toast('Bientôt') },
                { icon: Archive, label: 'Archiver conversation', action: () => toast('Bientôt') },
                { icon: Star,    label: 'Messages favoris',    action: () => toast('Bientôt') },
                { icon: Search,  label: 'Rechercher',          action: () => { setShowSearch(true); setShowInfo(false) } },
              ].map(item => {
                const Icon = item.icon
                return (
                  <button key={item.label} onClick={item.action}
                    className="w-full flex items-center gap-3 p-4 bg-surface-50 rounded-2xl text-sm font-semibold text-dark-700 active:bg-surface-100 transition-colors">
                    <Icon size={17} className="text-primary-600"/> {item.label}
                  </button>
                )
              })}

              <div className="bg-surface-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-dark-400 uppercase mb-3">Médias partagés</p>
                <div className="grid grid-cols-3 gap-1">
                  {messages.filter(m => m.type === 'image').slice(0, 6).map(m => (
                    <img key={m.id} src={m.file_url} alt="" className="w-full aspect-square object-cover rounded-xl cursor-pointer active:scale-95"
                      onClick={() => { setZoomImg(m.file_url); setShowInfo(false) }}/>
                  ))}
                  {messages.filter(m => m.type === 'image').length === 0 && (
                    <p className="col-span-3 text-xs text-dark-400 text-center py-2">Aucun média</p>
                  )}
                </div>
              </div>

              <button className="w-full p-4 bg-red-50 rounded-2xl text-sm font-bold text-red-600 flex items-center justify-center gap-2 active:bg-red-100">
                <Trash2 size={15}/> Supprimer la conversation
              </button>
            </div>
          </div>
          <style>{`@keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </>
      )}

      {/* Image viewer */}
      <ImageViewer url={zoomImg} onClose={() => setZoomImg(null)}/>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// CONVERSATION ITEM
// ══════════════════════════════════════════════════════════
function ConvItem({ conv, userId, onClick }) {
  const other = conv.buyer_id === userId ? conv.seller : conv.buyer
  const online = isOnline(other?.last_seen_at)
  const unread = conv.unread_count || 0
  const hasUnread = unread > 0
  const isAchat = conv.buyer_id === userId

  return (
    <button onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left border-b border-surface-100/60',
        hasUnread ? 'bg-white active:bg-surface-50' : 'bg-white/60 active:bg-surface-50'
      )}>
      <div className="relative flex-shrink-0">
        <Avatar src={other?.avatar_url} name={other?.username} size="lg" online={online}/>
        {/* Badge achat/vente */}
        <span className={clsx(
          'absolute -top-1 -left-1 text-[8px] font-black px-1 py-0.5 rounded-full',
          isAchat ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
        )}>
          {isAchat ? '🛒' : '🏪'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={clsx('text-sm truncate', hasUnread ? 'font-black text-dark-900' : 'font-bold text-dark-700')}>
            @{other?.username}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {conv.last_message_at && (
              <span className={clsx('text-[10px]', hasUnread ? 'text-primary-600 font-bold' : 'text-dark-400')}>
                {fmtTime(conv.last_message_at)}
              </span>
            )}
            {hasUnread && (
              <span className="min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-sm animate-pulse">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>

        {conv.shop && (
          <p className="text-[10px] text-primary-600 font-semibold mb-0.5 flex items-center gap-1">
            🏪 {conv.shop.name}
          </p>
        )}

        <p className={clsx('text-xs truncate',
          hasUnread ? 'text-dark-800 font-bold' : 'text-dark-400 font-normal')}>
          {conv.last_message || 'Démarrer la conversation...'}
        </p>
      </div>
    </button>
  )
}

// ══════════════════════════════════════════════════════════
// SKELETON
// ══════════════════════════════════════════════════════════
function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-12 h-12 rounded-2xl bg-surface-200 animate-pulse flex-shrink-0"/>
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-surface-200 rounded-lg w-1/3 animate-pulse"/>
        <div className="h-3 bg-surface-200 rounded-lg w-2/3 animate-pulse"/>
        <div className="h-3 bg-surface-200 rounded-lg w-1/2 animate-pulse"/>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════
export default function MessagesPage() {
  const { user }          = useAuthStore()
  const [searchParams]    = useSearchParams()
  const openConvId        = searchParams.get('conv')
  const [convs, setConvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [active, setActive]   = useState(null)
  const [tab, setTab]         = useState('all') // 'all' | 'unread' | 'achat' | 'vente'
  const readConvsSet = useRef(new Set())

  useEffect(() => { if (user) loadConvs() }, [user])

  useEffect(() => {
    if (openConvId && convs.length > 0) {
      const c = convs.find(c => c.id === openConvId)
      if (c) setActive(c)
    }
  }, [openConvId, convs])

  // Realtime - écouter nouveaux messages ET conversations
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('convs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConvs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Nouveau message → mettre à jour le badge si pas de notre part
        if (payload.new.sender_id !== user.id) {
          setConvs(prev => prev.map(c => {
            if (c.id === payload.new.conversation_id) {
              return {
                ...c,
                last_message: payload.new.content,
                last_message_at: payload.new.created_at,
                unread_count: (c.unread_count || 0) + 1,
              }
            }
            return c
          }))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  const loadConvs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select(`*, shop:shops(id, name, cover_url, slug),
        buyer:profiles!conversations_buyer_id_fkey(id, username, avatar_url, last_seen_at),
        seller:profiles!conversations_seller_id_fkey(id, username, avatar_url, last_seen_at)`)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    if (data?.length) {
      // Calculer unread_count pour chaque conversation
      // is_read peut être NULL ou false pour les messages non lus
      const convIds = data.map(c => c.id)
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .or('is_read.is.null,is_read.eq.false')
        .neq('sender_id', user.id)

      const unreadMap = {}
      unreadData?.forEach(m => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1
      })

      setConvs(data.map(c => ({
        ...c,
        unread_count: readConvsSet.current.has(c.id) ? 0 : (unreadMap[c.id] || 0)
      })))
    } else {
      setConvs([])
    }
    setLoading(false)
  }

  const filtered = convs.filter(c => {
    const other = c.buyer_id === user?.id ? c.seller : c.buyer
    const q = search.toLowerCase()
    const matchSearch = !q || (other?.username || '').toLowerCase().includes(q) || (c.shop?.name || '').toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q)
    // Achat = l'utilisateur est le buyer (il a initié la conv)
    // Vente = l'utilisateur est le seller (l'autre a initié)
    const matchTab =
      tab === 'all' ? true :
      tab === 'unread' ? (c.unread_count || 0) > 0 :
      tab === 'achat' ? c.buyer_id === user?.id :
      tab === 'vente' ? c.seller_id === user?.id : true
    return matchSearch && matchTab
  })
  
  const unreadAchat = convs.filter(c => c.buyer_id === user?.id && (c.unread_count || 0) > 0).length
  const unreadVente = convs.filter(c => c.seller_id === user?.id && (c.unread_count || 0) > 0).length

  const unreadTotal = convs.reduce((s, c) => s + (c.unread_count || 0), 0)

  const handleMarkRead = (convId) => {
    readConvsSet.current.add(convId)
    setConvs(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c))
    // Nettoyer après 5 secondes (largement le temps que la DB soit à jour)
    setTimeout(() => readConvsSet.current.delete(convId), 5000)
  }

  if (active) return <ChatWindow conv={active} user={user} onBack={() => { setActive(null); loadConvs() }} onMarkRead={handleMarkRead}/>

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 pt-14 pb-3 px-4"
        style={{ background: 'linear-gradient(135deg, #0b3d2e, #1a5c2e)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl text-white font-bold">Messages</h1>
            <p className="text-white/50 text-xs">
              {convs.length} conversation{convs.length !== 1 ? 's' : ''}
              {unreadTotal > 0 && <span className="ml-1.5 text-green-300 font-bold">· {unreadTotal} non lu{unreadTotal > 1 ? 's' : ''}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadConvs} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-90">
              <Loader2 size={16} className="text-white"/>
            </button>
          </div>
        </div>

        {/* Recherche */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"/>
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:bg-white/15"/>
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-white/40"/></button>}
        </div>

        {/* Onglets Achat / Vente / Tous / Non lus */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all',    label: 'Tous',    badge: unreadTotal },
            { key: 'achat',  label: '🛒 Achat', badge: unreadAchat },
            { key: 'vente',  label: '🏪 Vente', badge: unreadVente },
            { key: 'unread', label: 'Non lus',  badge: unreadTotal },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                tab === t.key ? 'bg-white text-primary-700' : 'bg-white/10 text-white/60')}>
              {t.label}
              {t.badge > 0 && (
                <span className={clsx('w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center',
                  tab === t.key ? 'bg-primary-600 text-white' : 'bg-red-500 text-white')}>
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto pb-28">
        {loading ? (
          <div className="space-y-1 py-2">
            {[1,2,3,4].map(i => <ConvSkeleton key={i}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 rounded-3xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={36} className="text-primary-400"/>
            </div>
            <p className="font-bold text-dark-700 text-lg">
              {search ? 'Aucun résultat' : tab === 'unread' ? 'Aucun message non lu' : 'Aucune conversation'}
            </p>
            <p className="text-dark-400 text-sm mt-2">
              {!search && tab === 'all' && 'Contactez un vendeur depuis une boutique pour démarrer'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map(conv => (
              <ConvItem key={conv.id} conv={conv} userId={user?.id} onClick={async () => {
                // 1) Badge à 0 immédiatement + protéger contre reload realtime
                readConvsSet.current.add(conv.id)
                setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c))
                // 2) Marquer en DB via fonction SQL (contourne RLS)
                await supabase.rpc('mark_conversation_read', {
                  p_conv_id: conv.id,
                  p_user_id: user.id
                })
                // 3) DB confirmée → nettoyer le verrou
                readConvsSet.current.delete(conv.id)
                setActive(conv)
              }}/>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
