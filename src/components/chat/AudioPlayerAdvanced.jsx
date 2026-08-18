import { useState, useRef } from 'react'
import { Play, Pause, Mic } from 'lucide-react'
import { clsx } from 'clsx'

export default function AudioPlayerAdvanced({ url, isMe }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0 -> 1
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1) // 1x, 1.5x, 2x
  const audioRef = useRef(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  const cycleSpeed = (e) => {
    e.stopPropagation()
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    setSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }

  const handleSeek = (e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width))
    if (audioRef.current && duration) {
      audioRef.current.currentTime = newProgress * duration
      setProgress(newProgress)
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className={clsx('flex items-center gap-3 py-1 px-1 min-w-[210px]', isMe ? 'text-white' : 'text-gray-800 dark:text-white')}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          if (audioRef.current && audioRef.current.duration) {
            setProgress(audioRef.current.currentTime / audioRef.current.duration)
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0)
          }
        }}
        onEnded={() => {
          setPlaying(false)
          setProgress(0)
        }}
      />

      {/* Bouton Play/Pause */}
      <button
        onClick={togglePlay}
        className={clsx(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 shadow-xs',
          isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
        )}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Waveform / Progress Interactive Bar */}
      <div className="flex-1 min-w-[100px]">
        <div
          onClick={handleSeek}
          className={clsx(
            'h-2 rounded-full overflow-hidden cursor-pointer relative',
            isMe ? 'bg-white/30' : 'bg-gray-200 dark:bg-dark-700'
          )}
        >
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-100',
              isMe ? 'bg-white' : 'bg-emerald-600 dark:bg-emerald-400'
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex justify-between items-center mt-1 text-[10px]">
          <span className={isMe ? 'text-white/80' : 'text-gray-400 dark:text-gray-400'}>
            {formatTime(playing || progress > 0 ? (progress * duration) : duration)}
          </span>

          {/* Bouton d'accélération WhatsApp 1x / 1.5x / 2x */}
          <button
            onClick={cycleSpeed}
            className={clsx(
              'px-1.5 py-0.2 rounded-md font-black text-[9px] uppercase tracking-wider transition-colors',
              isMe
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
            )}
          >
            {speed}x
          </button>
        </div>
      </div>

      <Mic size={14} className={clsx('flex-shrink-0', isMe ? 'text-white/60' : 'text-gray-400')} />
    </div>
  )
}
