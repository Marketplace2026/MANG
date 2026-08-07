import { useState, useEffect } from 'react'
import { X, QrCode, Copy, Check, Camera, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function QRCodeModal({ open, onClose, user, wallet, onScanResult }) {
  const [tab, setTab] = useState('my_qr') // 'my_qr' ou 'scan'
  const [copied, setCopied] = useState(false)
  const [scannedNumber, setScannedNumber] = useState('')

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const walletNumber = wallet?.wallet_number || '0000000000'
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(walletNumber)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(walletNumber)
    setCopied(true)
    toast.success('Numéro Wallet copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSimulateScan = () => {
    if (!scannedNumber.trim() || scannedNumber.trim().length < 7) {
      return toast.error('Entrez un numéro de wallet valide (10 chiffres)')
    }
    onScanResult(scannedNumber.trim())
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-md" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] flex flex-col max-w-[480px] mx-auto animate-slide-up overflow-hidden">
        {/* Navigation Onglets */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('my_qr')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === 'my_qr' ? 'bg-[#004D00] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
               Mon QR Code
            </button>
            <button
              onClick={() => setTab('scan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === 'scan' ? 'bg-[#004D00] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              📷 Scan & Pay
            </button>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 text-center space-y-5 overflow-y-auto">
          {tab === 'my_qr' ? (
            <>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Votre QR Code MANG Pay</h3>
                <p className="text-xs text-gray-500 mt-1">Présentez ce QR Code pour recevoir des paiements en direct</p>
              </div>

              {/* QR Code Container */}
              <div className="w-56 h-56 mx-auto p-4 bg-white rounded-3xl border-2 border-emerald-500 shadow-xl flex items-center justify-center relative">
                <img src={qrDataUrl} alt="QR Code MANG" className="w-full h-full object-contain" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-xl bg-[#004D00] text-white font-black text-sm flex items-center justify-center shadow-lg border-2 border-white">
                    🌿
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Numéro Wallet unique</p>
                  <p className="font-mono font-bold text-emerald-900 text-sm">
                    {walletNumber.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Scanner un QR Code MANG</h3>
                <p className="text-xs text-gray-500 mt-1">Visez le QR Code du destinataire pour pré-remplir le transfert</p>
              </div>

              {/* Viseur de caméra simulation */}
              <div className="w-64 h-64 mx-auto bg-gray-900 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center text-white border-4 border-amber-400">
                <div className="absolute inset-4 border-2 border-dashed border-amber-400/60 rounded-2xl animate-pulse" />
                <Camera size={40} className="text-amber-400 mb-2 animate-bounce" />
                <p className="text-xs font-bold text-amber-200">Scanner MANG Pay Actif</p>
                <span className="text-[10px] text-white/50 mt-1">Visez le QR Code d'un vendeur</span>
              </div>

              {/* Saisie alternative manuelle */}
              <div className="space-y-2 text-left pt-2">
                <label className="text-xs font-bold text-gray-700">Ou entrez le numéro Wallet manuellement :</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="10 chiffres ex: 1234567890"
                    value={scannedNumber}
                    onChange={(e) => setScannedNumber(e.target.value)}
                    maxLength={10}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleSimulateScan}
                    className="px-4 py-3 bg-[#004D00] text-white font-bold rounded-2xl text-xs active:scale-95 transition-transform"
                  >
                    Valider →
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Paiement sécurisé et chiffré MANG Pay</span>
          </div>
        </div>
      </div>
    </>
  )
}
