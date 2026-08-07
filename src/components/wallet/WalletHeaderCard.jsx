import { useState } from 'react'
import { Eye, EyeOff, Copy, Check, QrCode, Lock, Coins } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WalletHeaderCard({ wallet, pieces, onOpenQR, onOpenEscrow }) {
  const [showBalance, setShowBalance] = useState(true)
  const [copied, setCopied] = useState(false)

  const balanceFCFA = wallet?.balance_available || 0
  const reservedFCFA = wallet?.balance_reserved || 0
  const pointsCount = pieces?.balance || 0

  const handleCopyWalletNumber = () => {
    if (!wallet?.wallet_number) return
    navigator.clipboard.writeText(wallet.wallet_number)
    setCopied(true)
    toast.success('Numéro Wallet copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#004D00] via-[#003300] to-[#002200] p-6 text-white shadow-2xl border border-white/10">
      {/* Motifs géométriques d'arrière-plan */}
      <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />

      {/* Rangée supérieure : Marque & QR Code */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md">
            <span className="text-base">🌿</span>
          </div>
          <div>
            <h3 className="font-display font-black text-sm tracking-wider text-amber-400">MANG PAY</h3>
            <p className="text-[10px] text-white/60 font-semibold">Compte Professionnel Certifié</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenQR}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold transition-all active:scale-95 backdrop-blur-md"
          >
            <QrCode size={14} className="text-amber-400" />
            <span>Mon QR</span>
          </button>
          
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 active:scale-90 transition-transform"
          >
            {showBalance ? <Eye size={15} className="text-white/80" /> : <EyeOff size={15} className="text-white/80" />}
          </button>
        </div>
      </div>

      {/* Affichage du Solde Principal */}
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Solde disponible</p>
        <div className="flex items-baseline gap-2">
          <h2 className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight">
            {showBalance ? balanceFCFA.toLocaleString('fr-FR') : '••••••••'}
          </h2>
          <span className="text-lg font-bold text-amber-400">FCFA</span>
        </div>
      </div>

      {/* Numéro de Wallet Copiable */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-black/20 border border-white/10 mb-4 backdrop-blur-md">
        <div>
          <p className="text-[9px] uppercase font-bold tracking-widest text-white/50">N° de Compte Wallet</p>
          <p className="font-mono font-bold tracking-widest text-sm text-white">
            {wallet?.wallet_number?.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') || '---- ---- ---'}
          </p>
        </div>
        <button
          onClick={handleCopyWalletNumber}
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-transform border border-white/10"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-white/70" />}
        </button>
      </div>

      {/* Sub-Soldes : Escrow et Pièces MANG */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <button 
          onClick={onOpenEscrow}
          className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all active:scale-95"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Lock size={13} className="text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold text-white/60 truncate">En Escrow (Ventes)</p>
            <p className="text-xs font-bold text-amber-300 truncate">
              {showBalance ? `${reservedFCFA.toLocaleString('fr-FR')} F` : '•••• F'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Coins size={13} className="text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold text-white/60 truncate">Pièces MANG</p>
            <p className="text-xs font-bold text-emerald-300 truncate">
              {showBalance ? `${pointsCount.toLocaleString('fr-FR')} PTS` : '•••• PTS'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
