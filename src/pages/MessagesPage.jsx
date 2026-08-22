// split-screen layout version 2.0.0
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Send, ArrowLeft, Image, Mic, Paperclip, Smile,
  Check, CheckCheck, MoreVertical, Trash2, X,
  Search, MicOff, Phone, Video, Star, Forward,
  Copy, Reply, Pin, Download, Camera, Plus,
  ChevronDown, Info, Bell, BellOff, Archive,
  MessageCircle, Users, Clock, Loader2, ZoomIn,
  Lock, StopCircle, Play, Pause
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useMessagesStore } from '@/store'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const formatFCFA = (val) => Math.round(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

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
        onLoadedMetadata={e => {
          const d = e.target.duration
          // Bug connu de Chrome : les fichiers audio/webm issus de MediaRecorder
          // renvoient parfois duration = Infinity au premier chargement.
          if (d === Infinity || Number.isNaN(d)) {
            e.target.currentTime = 1e101
            e.target.ontimeupdate = () => {
              e.target.ontimeupdate = null
              setDuration(e.target.duration)
              e.target.currentTime = 0
            }
          } else {
            setDuration(d)
          }
        }}
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
// APERÇU VOCAL AVANT ENVOI — même disposition que WhatsApp
// (ligne 1 : minuteur + curseur en pointillés + vitesse
//  ligne 2 : supprimer + pilule Lecture/Pause + envoyer)
// ══════════════════════════════════════════════════════════
const DOTS_COUNT = 28

function VoicePreviewPlayer({ url, duration = 0, onDelete, onSend, sending }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0 → 1
  const [speed, setSpeed] = useState(1)
  const [realDuration, setRealDuration] = useState(duration)
  const audioRef = useRef(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play()
    setPlaying(!playing)
  }

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const total = realDuration || duration || 0
  const currentSeconds = playing || progress > 0 ? Math.floor(progress * total) : Math.floor(total)
  const thumbIndex = Math.min(DOTS_COUNT - 1, Math.round(progress * (DOTS_COUNT - 1)))

  const seek = (e) => {
    if (!audioRef.current || !total) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = ratio * total
    setProgress(ratio)
  }

  return (
    <div className="w-full bg-dark-900 rounded-3xl px-4 py-3 animate-scale-in">
      <audio ref={audioRef} src={url}
        onTimeUpdate={e => setProgress(e.target.currentTime / (e.target.duration || total || 1))}
        onLoadedMetadata={e => {
          const d = e.target.duration
          if (d === Infinity || Number.isNaN(d)) {
            e.target.currentTime = 1e101
            e.target.ontimeupdate = () => {
              e.target.ontimeupdate = null
              setRealDuration(Math.round(e.target.duration))
              e.target.currentTime = 0
            }
          } else {
            setRealDuration(Math.round(d))
          }
        }}
        onEnded={() => { setPlaying(false); setProgress(0) }}/>

      {/* Ligne 1 : minuteur, curseur en pointillés, vitesse */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-white text-sm font-semibold tabular-nums w-8 flex-shrink-0">
          {Math.floor(currentSeconds / 60)}:{String(currentSeconds % 60).padStart(2, '0')}
        </span>
        <div onClick={seek} className="flex-1 flex items-center gap-[3px] cursor-pointer py-2">
          {Array.from({ length: DOTS_COUNT }).map((_, i) => (
            i === thumbIndex
              ? <div key={i} className="w-[3px] h-4 bg-white rounded-full flex-shrink-0"/>
              : <div key={i} className="w-1 h-1 bg-white/30 rounded-full flex-shrink-0"/>
          ))}
        </div>
        <button onClick={cycleSpeed}
          className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {speed % 1 === 0 ? speed : speed.toFixed(1)}x
        </button>
      </div>

      {/* Ligne 2 : supprimer, lecture/pause, envoyer */}
      <div className="flex items-center gap-2.5">
        <button onClick={onDelete}
          className="w-11 h-11 rounded-full bg-red-950/70 text-red-400 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform">
          <Trash2 size={18}/>
        </button>
        <button onClick={toggle}
          className="flex-1 h-11 rounded-full bg-dark-700 text-white flex items-center justify-center gap-2 font-semibold text-sm active:scale-[0.98] transition-transform">
          {playing ? <Pause size={16} className="fill-white"/> : <Play size={16} className="fill-white"/>}
          {playing ? 'Pause' : 'Lecture'}
        </button>
        <button onClick={onSend} disabled={sending}
          className="w-11 h-11 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform disabled:opacity-50 shadow-lg">
          {sending ? <Loader2 size={18} className="text-white animate-spin"/> : <Send size={18} className="text-white ml-0.5"/>}
        </button>
      </div>
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
              {isMe && (
                msg.delivery_status === 'read' || msg.is_read ? (
                  <CheckCheck size={12} className="text-sky-300" title="Lu" />
                ) : msg.delivery_status === 'delivered' ? (
                  <CheckCheck size={12} className="text-white/50" title="Distribué" />
                ) : (
                  <Check size={12} className="text-white/50" title="Envoyé" />
                )
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
                { icon: Forward, label: 'Transférer',  action: () => { setMenuOpen(false) } },
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
function ChatWindow({ conv, user, onBack, onMarkRead, initialProductId }) {
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
  const [contextProduct, setContextProduct] = useState(null)
  const [locked, setLocked]         = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [waveBars, setWaveBars]     = useState([])
  const [recordedBlob, setRecordedBlob]       = useState(null)
  const [recordedUrl, setRecordedUrl]         = useState(null)
  const startYRef                   = useRef(0)
  const startXRef                   = useRef(0)
  const streamRef                   = useRef(null)
  const chunksRef                   = useRef([])
  const pendingActionRef            = useRef('send') // 'send' | 'preview' | 'cancel'
  const startingRef                 = useRef(false)  // true tant que startRecording() attend le micro
  const pendingStopRef              = useRef(null)    // action à exécuter dès que le micro est prêt, si on a relâché entre-temps
  const audioCtxRef                 = useRef(null)
  const analyserRef                 = useRef(null)
  const waveIntervalRef             = useRef(null)
  const [isOnlineState, setIsOnlineState] = useState(isOnline(other?.last_seen_at))

  // Fetch product context
  useEffect(() => {
    if (initialProductId) {
      supabase.from('products').select('*').eq('id', initialProductId).single()
        .then(({ data }) => {
          if (data) {
            setContextProduct(data)
            setText(`Bonjour, je suis intéressé par votre produit : "${data.name}"`)
          }
        })
    }
  }, [initialProductId])

  const sendProductLink = async () => {
    if (!contextProduct || sending) return
    setSending(true)
    const content = `Je suis intéressé par ce produit :\n🛍️ *${contextProduct.name}*\n💰 Prix : ${formatFCFA(contextProduct.price)}\n🔗 Lien : ${window.location.origin}/produit/${contextProduct.id}`
    
    // Insérer en base de données
    const { data: newMsg, error } = await supabase.from('messages').insert({
      conversation_id: conv.id,
      sender_id: user.id,
      content,
      type: 'text'
    }).select('*, sender:profiles!messages_sender_id_fkey(id, username, avatar_url, last_seen_at)').single()

    if (!error && newMsg) {
      setMessages(prev => [...prev, newMsg])
    }

    setContextProduct(null)
    setSending(false)
  }

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const fileRef     = useRef(null)
  const imgRef      = useRef(null)
  const mediaRef    = useRef(null)
  const recTimer    = useRef(null)
  const typingTimer = useRef(null)
  const online      = isOnlineState

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
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
          if (payload.new.sender_id !== user.id) {
            // Update to read since chat is open
            supabase.from('messages').update({ delivery_status: 'read' }).eq('id', payload.new.id)
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
          setOtherTyping(payload.isTyping)
          clearTimeout(typingTimer.current)
          if (payload.isTyping) {
            typingTimer.current = setTimeout(() => setOtherTyping(false), 3000)
          }
        }
      })
      .subscribe()

    // Presence Sync
    const presenceCh = supabase.channel(`presence-${conv.id}`)
    presenceCh
      .on('presence', { event: 'sync' }, () => {
        const state = presenceCh.presenceState()
        const presenceUsers = Object.values(state).flat()
        const otherOnline = presenceUsers.some(u => u.user_id === other?.id)
        setIsOnlineState(otherOnline)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceCh.track({ user_id: user.id, online_at: new Date().toISOString() })
        }
      })

    // Mise à jour last_seen
    supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)

    return () => {
      supabase.removeChannel(ch)
      supabase.removeChannel(typingCh)
      supabase.removeChannel(presenceCh)
    }
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
    // Mettre à jour delivery_status à read pour les messages reçus non lus
    if (data?.length) {
      const unreadIds = data.filter(m => m.sender_id !== user.id && m.delivery_status !== 'read').map(m => m.id)
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ delivery_status: 'read' }).in('id', unreadIds)
      }
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

  const broadcastTyping = (isTypingVal = true) => {
    supabase.channel(`typing-${conv.id}`).send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, isTyping: isTypingVal } })
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
    broadcastTyping(true)
  }

  // Envoyer texte
  const sendText = async () => {
    const content = text.trim()
    if (!content || sending) return
    setSending(true); setText('')
    broadcastTyping(false)
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

  // Waveform live pendant l'enregistrement (Web Audio API)
  const startWaveform = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioCtx()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      setWaveBars([])
      waveIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const normalized = Math.min(1, avg / 90)
        setWaveBars(prev => {
          const next = [...prev, normalized]
          return next.length > 40 ? next.slice(next.length - 40) : next
        })
      }, 120)
    } catch { /* Web Audio indisponible : l'enregistrement continue sans visuel */ }
  }

  const stopWaveform = () => {
    clearInterval(waveIntervalRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }

  // Enregistrement audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop())
          streamRef.current = null
        }
        const action = pendingActionRef.current
        if (action === 'cancel') { chunksRef.current = []; return }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (action === 'preview') {
          setRecordedBlob(blob)
          setRecordedUrl(URL.createObjectURL(blob))
        } else {
          const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
          await uploadFile(file)
        }
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setLocked(false)
      setIsCancelled(false)
      setRecordedBlob(null)
      setRecordedUrl(null)
      let t = 0
      setRecordTime(0)
      recTimer.current = setInterval(() => { t++; setRecordTime(t) }, 1000)
      startWaveform(stream)

      startingRef.current = false
      // Si l'utilisateur a déjà relâché pendant que le micro s'initialisait, on exécute
      // maintenant l'action demandée au lieu de la perdre silencieusement.
      if (pendingStopRef.current) {
        const action = pendingStopRef.current
        pendingStopRef.current = null
        stopRecording(action)
      }
    } catch {
      startingRef.current = false
      pendingStopRef.current = null
      toast.error('Microphone non disponible')
    }
  }

  // action : 'send' (relâché sans verrou → envoi direct), 'preview' (verrouillé → aperçu avant envoi), 'cancel' (glissé pour annuler)
  const stopRecording = (action = 'send') => {
    clearInterval(recTimer.current)
    stopWaveform()
    pendingActionRef.current = action


    if (mediaRef.current) {
      if (action === 'cancel') mediaRef.current.onstop = () => {
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
        chunksRef.current = []
      }
      try { mediaRef.current.stop() } catch (err) {}
      mediaRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setRecording(false)
    if (action !== 'preview') {
      setRecordTime(0)
      setLocked(false)
      setIsCancelled(false)
    }
  }

  const discardRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordTime(0)
    setLocked(false)
  }

  const sendRecordedVoice = async () => {
    if (!recordedBlob || sending) return
    setSending(true)
    const file = new File([recordedBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
    await uploadFile(file)
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordTime(0)
    setLocked(false)
    setSending(false)
  }

  // Nettoyage si la fenêtre de chat se ferme en cours d'enregistrement
  useEffect(() => {
    return () => {
      clearInterval(recTimer.current)
      stopWaveform()
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
  }, [])

  const handlePointerDown = (e) => {
    e.preventDefault()
    try {
      e.target.setPointerCapture(e.pointerId)
    } catch (err) {}
    startYRef.current = e.clientY
    startXRef.current = e.clientX
    setLocked(false)
    setIsCancelled(false)
    pendingStopRef.current = null
    startingRef.current = true
    startRecording()
  }

  const handlePointerMove = (e) => {
    if (!mediaRef.current || locked || isCancelled) return
    const currentY = e.clientY
    const currentX = e.clientX
    const deltaY = startYRef.current - currentY
    const deltaX = startXRef.current - currentX
    
    if (deltaY > 80) {
      setLocked(true)
      toast.success('Enregistrement verrouillé 🔒')
    } else if (deltaX > 80) {
      setIsCancelled(true)
      toast.error('Enregistrement annulé 🗑️')
      stopRecording('cancel')
    }
  }

  const handlePointerUp = (e) => {
    e.preventDefault()
    try {
      e.target.releasePointerCapture(e.pointerId)
    } catch (err) {}
    if (isCancelled) return
    if (!mediaRef.current) {
      // Le micro est encore en cours d'initialisation (permission/latence) :
      // on mémorise l'intention pour l'exécuter dès que startRecording() aura terminé,
      // au lieu de ne rien faire.
      if (startingRef.current) pendingStopRef.current = 'preview'
      return
    }
    // Tout relâchement (verrouillé ou non) amène à l'écran d'aperçu avant envoi,
    // exactement comme la référence WhatsApp — plus d'envoi instantané au relâchement.
    stopRecording('preview')
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
          <button onClick={onBack} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-90 md:hidden">
            <ArrowLeft size={18} className="text-white"/>
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => setShowInfo(true)}>
            <Avatar src={other?.avatar_url} name={other?.username} size="md" online={isOnlineState}/>
            <div className="min-w-0">
              <p className="text-white font-bold text-base truncate leading-tight">@{other?.username}</p>
              <p className="text-white/50 text-xs">
                {otherTyping ? <span className="text-green-300 animate-pulse">En train d'écrire...</span>
                  : isOnlineState ? <span className="text-emerald-300">En ligne</span>
                  : other?.last_seen_at ? `Vu à ${format(new Date(other.last_seen_at), 'HH:mm')}` : 'Hors ligne'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setShowSearch(!showSearch)}
              className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-90">
              <Search size={16} className="text-white"/>
            </button>
            <button onClick={() => setMenuOpen(false)}
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

        {/* Encart Produit MANG Contextuel */}
        {contextProduct && (
          <div className="mb-2 flex items-center gap-3 bg-emerald-50/70 border border-emerald-100/50 rounded-2xl p-2 animate-scale-in">
            {contextProduct.image_url && (
              <img src={contextProduct.image_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-dark-800 text-xs font-black truncate">{contextProduct.name}</p>
              <p className="text-primary-700 text-[10px] font-black">{formatFCFA(contextProduct.price)}</p>
            </div>
            <button onClick={sendProductLink} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold active:scale-95 transition-transform flex items-center gap-1">
              <Send size={10} /> Partager
            </button>
            <button onClick={() => setContextProduct(null)} className="w-6 h-6 bg-emerald-100/50 rounded-full flex items-center justify-center">
              <X size={10} className="text-emerald-700"/>
            </button>
          </div>
        )}

        {recordedUrl ? (
          /* Aperçu avant envoi : écouter, supprimer ou envoyer — même disposition que WhatsApp */
          <VoicePreviewPlayer
            url={recordedUrl}
            duration={recordTime}
            onDelete={discardRecording}
            onSend={sendRecordedVoice}
            sending={sending}
          />
        ) : recording ? (
          /* Mode enregistrement */
          <div className="relative flex items-center gap-3 bg-red-50 rounded-2xl px-4 py-3 border border-red-200 animate-scale-in">
            {/* Badge verrou flottant — cliquable, verrouille immédiatement l'enregistrement */}
            {!locked && (
              <button
                onClick={() => { setLocked(true); toast.success('Enregistrement verrouillé 🔒') }}
                className="absolute -top-16 right-3 flex flex-col items-center gap-1 animate-bounce active:scale-90 transition-transform">
                <div className="w-10 h-10 rounded-full bg-white shadow-lg border border-surface-200 flex items-center justify-center text-dark-500">
                  <Lock size={16}/>
                </div>
                <ChevronDown size={13} className="rotate-180 text-dark-300"/>
              </button>
            )}

            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0"/>
            <span className="text-red-600 font-bold text-sm flex-shrink-0">
              {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
            </span>

            {/* Waveform en direct */}
            <div className="flex items-center gap-[2px] flex-1 h-6 overflow-hidden">
              {waveBars.length === 0 ? (
                <span className="text-xs font-normal text-red-500 animate-pulse">
                  {locked ? 'Verrouillé 🔒' : 'Glissez ↑ verrouiller · ← annuler'}
                </span>
              ) : waveBars.map((v, i) => (
                <div key={i} className="w-[3px] bg-red-400 rounded-full flex-shrink-0"
                  style={{ height: `${Math.max(15, v * 100)}%` }}/>
              ))}
            </div>

            {locked ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => stopRecording('cancel')}
                  className="w-9 h-9 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center transition-colors active:scale-90">
                  <Trash2 size={15}/>
                </button>
                <button onClick={() => stopRecording('preview')}
                  className="w-9 h-9 bg-dark-800 text-white rounded-xl flex items-center justify-center active:scale-90 shadow-md">
                  <StopCircle size={17}/>
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-red-400 flex-shrink-0">●REC</span>
            )}
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
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 transition-all select-none touch-none',
                  recording ? 'bg-red-500 animate-pulse text-white' : 'bg-surface-100 text-dark-500')}>
                <Mic size={17} />
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

  const [isTyping, setIsTyping] = useState(false)
  const typingTimer = useRef(null)

  useEffect(() => {
    if (!userId) return
    const typingCh = supabase.channel(`typing-${conv.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== userId) {
          setIsTyping(payload.isTyping)
          clearTimeout(typingTimer.current)
          if (payload.isTyping) {
            typingTimer.current = setTimeout(() => setIsTyping(false), 4000)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(typingCh)
      clearTimeout(typingTimer.current)
    }
  }, [conv.id, userId])

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

        <p className={clsx('text-xs truncate transition-all',
          isTyping ? 'text-emerald-600 font-bold' : hasUnread ? 'text-dark-800 font-bold' : 'text-dark-400 font-normal')}>
          {isTyping ? '... écrit' : (conv.last_message || 'Démarrer la conversation...')}
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
  const openProductId     = searchParams.get('product')
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

  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  // Realtime - écouter nouveaux messages ET conversations
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('convs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConvs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Nouveau message → mettre à jour le badge si pas de notre part
        if (payload.new.sender_id !== user.id) {
          // Si la conversation n'est pas active (chat fermé), on met à jour delivery_status à delivered
          if (activeRef.current?.id !== payload.new.conversation_id) {
            supabase.from('messages').update({ delivery_status: 'delivered' }).eq('id', payload.new.id)
          }

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
      // Mettre à jour delivery_status à delivered pour tous les messages reçus non lus/non distribués
      const convIds = data.map(c => c.id)
      const { data: undelivered } = await supabase
        .from('messages')
        .select('id')
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .eq('delivery_status', 'sent')
      if (undelivered?.length) {
        const undeliveredIds = undelivered.map(m => m.id)
        await supabase.from('messages').update({ delivery_status: 'delivered' }).in('id', undeliveredIds)
      }

      // Calculer unread_count pour chaque conversation
      // is_read peut être NULL ou false pour les messages non lus
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

  const { fetchUnreadCount } = useMessagesStore()

  const handleMarkRead = (convId) => {
    readConvsSet.current.add(convId)
    setConvs(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c))
    if (user?.id) fetchUnreadCount(user.id)
    setTimeout(() => readConvsSet.current.delete(convId), 5000)
  }

  return (
    <div className="min-h-screen bg-surface-100 flex justify-center items-stretch py-0 md:py-6 md:px-4">
      <div className="w-full max-w-6xl bg-white md:rounded-3xl md:shadow-card overflow-hidden flex">
        
        {/* Partie Gauche : Liste des Conversations */}
        <div className={clsx(
          "w-full md:w-[360px] lg:w-[400px] flex flex-col border-r border-surface-100 flex-shrink-0",
          active ? "hidden md:flex" : "flex"
        )}>
          {/* Header */}
          <header className="bg-[#004D00] pt-4 pb-3 px-4 sticky top-0 z-50 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-white text-2xl font-bold">Messages</h1>
                <p className="text-white/80 text-sm">
                  {convs.length} conversation{convs.length !== 1 ? 's' : ''}
                  {unreadTotal > 0 && <span className="ml-1.5 text-green-300 font-bold">· {unreadTotal} non lu{unreadTotal > 1 ? 's' : ''}</span>}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={loadConvs} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center active:scale-90">
                  <Loader2 size={16} className="text-white"/>
                </button>
              </div>
            </div>
          </header>

          <div className="bg-[#004D00] px-4 pb-3 flex-shrink-0">
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

        {/* Partie Droite : Discussion Active (WhatsApp Web Style) */}
        <div className={clsx(
          "flex-grow flex flex-col bg-surface-50 relative",
          active ? "flex" : "hidden md:flex items-center justify-center text-center p-8 bg-[url('/logo-mang.png')] bg-[length:150px] bg-center bg-no-repeat bg-blend-overlay opacity-80"
        )}>
          {active ? (
            <ChatWindow 
              conv={active} 
              user={user} 
              onBack={() => { setActive(null); loadConvs() }} 
              onMarkRead={handleMarkRead}
              initialProductId={openProductId}
            />
          ) : (
            <div className="max-w-sm space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600 shadow-md">
                <MessageCircle size={36} />
              </div>
              <h2 className="font-display font-bold text-dark-800 text-lg">MANG Direct Message</h2>
              <p className="text-dark-600/50 text-xs leading-relaxed">
                Sélectionnez une discussion à gauche pour négocier en direct, poser vos questions et passer commande en toute sécurité.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
