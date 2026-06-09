import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, ChevronDown, ChevronUp, Phone, MapPin, User, Shield } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { Avatar, BottomSheet } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const ADMIN_ID = 'd9f97369-ae78-4da2-844c-1c9c97b12445'

const REJECT_REASONS = {
  identite: [
    'Photo de pièce d\'identité illisible',
    'Pièce d\'identité expirée',
    'Nom ne correspond pas au compte',
    'Selfie manquant ou non conforme',
  ],
  activite: [
    'Activité déclarée ne correspond pas aux produits vendus',
    'Localisation non vérifiable',
    'Années d\'expérience insuffisantes',
  ],
  production: [
    'Capacité déclarée non réaliste',
    'Méthode de production non claire',
    'Zone de livraison trop large',
    'Certifications non vérifiables',
  ],
  general: [
    'Informations insuffisantes',
    'Boutique inactive (aucun produit)',
    'Comportement suspect sur la plateforme',
    'Doublon avec une boutique existante',
  ],
}

export default function AdminVerificationPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState([])
  const [customNote, setCustomNote] = useState('')
  const [processing, setProcessing] = useState(false)

  // Sécurité — seul l'admin peut accéder
  useEffect(() => {
    if (user && user.id !== ADMIN_ID) {
      navigate('/')
      toast.error('Accès refusé')
    }
  }, [user, navigate])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('verification_requests')
      .select('*, shop:shops(id, name, slug, cover_url, city, is_verified), user:profiles(id, username, avatar_url, email)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { loadRequests() }, [loadRequests])

  const approve = async (req) => {
    if (!confirm(`Vérifier la boutique "${req.shop?.name}" ?`)) return
    setProcessing(true)
    try {
      // 1. Vérifier la boutique
      await supabase.from('shops').update({ is_verified: true }).eq('id', req.shop_id)
      // 2. Mettre à jour la demande
      await supabase.from('verification_requests').update({ status: 'approved' }).eq('id', req.id)
      // 3. Notifier le vendeur
      await supabase.rpc('create_notification', {
        p_user_id: req.user_id,
        p_type: 'shop_follow',
        p_title: '✅ Boutique vérifiée !',
        p_body: `Félicitations ! Votre boutique "${req.shop?.name}" a été vérifiée. Le badge ✅ est maintenant visible.`,
        p_reference_id: req.shop_id,
        p_reference_type: 'shop',
      })
      toast.success(`✅ "${req.shop?.name}" vérifiée !`)
      setSelectedRequest(null)
      loadRequests()
    } finally { setProcessing(false) }
  }

  const reject = async (req) => {
    if (selectedReasons.length === 0 && !customNote.trim()) {
      toast.error('Sélectionnez au moins une raison')
      return
    }
    setProcessing(true)
    try {
      const allReasons = [...selectedReasons, customNote.trim()].filter(Boolean)
      const adminNote = allReasons.join(' • ')

      await supabase.from('verification_requests')
        .update({ status: 'rejected', admin_note: adminNote }).eq('id', req.id)

      await supabase.rpc('create_notification', {
        p_user_id: req.user_id,
        p_type: 'shop_follow',
        p_title: '❌ Demande de vérification refusée',
        p_body: `Votre demande pour "${req.shop?.name}" a été refusée. Raisons : ${adminNote}`,
        p_reference_id: req.shop_id,
        p_reference_type: 'shop',
      })

      toast.success('Demande refusée — vendeur notifié')
      setRejectOpen(false)
      setSelectedRequest(null)
      setSelectedReasons([])
      setCustomNote('')
      loadRequests()
    } finally { setProcessing(false) }
  }

  const toggleReason = (reason) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    )
  }

  const STATUS_CONFIG = {
    pending:  { label: 'En attente', color: 'text-yellow-700 bg-yellow-100', dot: 'bg-yellow-400' },
    approved: { label: 'Approuvées', color: 'text-green-700 bg-green-100', dot: 'bg-green-400' },
    rejected: { label: 'Refusées',   color: 'text-red-700 bg-red-100',     dot: 'bg-red-400' },
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-600 pt-12 pb-6 px-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-90">
            <ArrowLeft size={18} className="text-white"/>
          </button>
          <div>
            <h1 className="font-black text-xl text-white">Vérifications</h1>
            <p className="text-blue-200 text-xs">Administration MANG</p>
          </div>
          <div className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-white/10 rounded-full">
            <Shield size={12} className="text-blue-200"/>
            <span className="text-blue-200 text-[10px] font-bold">Admin</span>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                filter === s ? 'bg-white text-blue-700' : 'bg-white/10 text-white/70')}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[s].dot)}/>
              {STATUS_CONFIG[s].label}
              {filter === s && requests.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[9px] font-black">
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-2xl"/>)
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📋</p>
            <p className="font-bold text-dark-800">Aucune demande {STATUS_CONFIG[filter].label.toLowerCase()}</p>
          </div>
        ) : (
          requests.map(req => (
            <button key={req.id} onClick={() => setSelectedRequest(req)}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {req.shop?.cover_url
                    ? <img src={req.shop.cover_url} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-xl">🌿</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-dark-900 text-sm truncate">{req.shop?.name}</p>
                    {req.profile_type && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                        {req.profile_type === 'producteur' ? '🌱' : req.profile_type === 'commercant' ? '🏪' : '🎓'}
                        {' '}{req.profile_type}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">@{req.user?.username} · {req.full_name || 'Nom non renseigné'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-gray-400 text-[10px]">
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: fr })}
                    </p>
                    {req.activity_type && (
                      <span className="text-gray-400 text-[10px]">· {req.activity_type}</span>
                    )}
                  </div>
                </div>
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', STATUS_CONFIG[req.status]?.dot)}/>
              </div>
              {req.admin_note && (
                <p className="mt-2 text-red-500 text-[10px] bg-red-50 px-3 py-1.5 rounded-xl">❌ {req.admin_note}</p>
              )}
            </button>
          ))
        )}
      </div>

      {/* DETAIL SHEET */}
      {selectedRequest && (
        <BottomSheet open={!!selectedRequest} onClose={() => setSelectedRequest(null)}
          title={`📋 ${selectedRequest.shop?.name}`}>
          <div style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="px-4 pt-2 pb-6 space-y-4">

              {/* Infos boutique */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-blue-100">
                  {selectedRequest.shop?.cover_url
                    ? <img src={selectedRequest.shop.cover_url} className="w-full h-full object-cover"/>
                    : <div className="w-full h-full flex items-center justify-center text-xl">🌿</div>}
                </div>
                <div>
                  <p className="font-black text-blue-900 text-sm">{selectedRequest.shop?.name}</p>
                  <p className="text-blue-500 text-xs">@{selectedRequest.user?.username}</p>
                  {selectedRequest.shop?.city && <p className="text-blue-400 text-[10px]">📍 {selectedRequest.shop.city}</p>}
                </div>
              </div>

              {/* Section: Identité */}
              <InfoSection title="👤 Identité" color="blue">
                <InfoRow label="Nom complet" value={selectedRequest.full_name}/>
                <InfoRow label="Téléphone" value={selectedRequest.phone}/>
                <InfoRow label="Pièce d'identité" value={selectedRequest.id_type}/>
                {selectedRequest.id_photo_url && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Photo pièce d'identité</p>
                    <img src={selectedRequest.id_photo_url} className="w-full max-h-40 object-cover rounded-xl border border-gray-200"/>
                  </div>
                )}
                {selectedRequest.selfie_url && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Selfie avec pièce</p>
                    <img src={selectedRequest.selfie_url} className="w-full max-h-40 object-cover rounded-xl border border-gray-200"/>
                  </div>
                )}
              </InfoSection>

              {/* Section: Activité */}
              <InfoSection title="🏪 Activité" color="green">
                <InfoRow label="Profil" value={selectedRequest.profile_type}/>
                <InfoRow label="Type d'activité" value={selectedRequest.activity_type}/>
                <InfoRow label="Localisation" value={selectedRequest.location}/>
                <InfoRow label="Expérience" value={selectedRequest.years_experience}/>
              </InfoSection>

              {/* Section: Production / Commerce */}
              <InfoSection title={selectedRequest.profile_type === 'producteur' ? '🌱 Production' : '📦 Commerce/Service'} color="amber">
                {selectedRequest.profile_type === 'producteur' && (
                  <>
                    <InfoRow label="Méthode" value={selectedRequest.production_method}/>
                    <InfoRow label="Pesticides" value={selectedRequest.use_pesticides === true ? 'Oui' : selectedRequest.use_pesticides === false ? 'Non' : selectedRequest.use_pesticides}/>
                    <InfoRow label="Superficie" value={selectedRequest.farm_size}/>
                    <InfoRow label="Capacité/mois" value={selectedRequest.monthly_capacity}/>
                  </>
                )}
                {selectedRequest.profile_type !== 'producteur' && (
                  <>
                    <InfoRow label="Produits/Services" value={selectedRequest.products_type}/>
                    <InfoRow label="Approvisionnement" value={selectedRequest.supply_source}/>
                  </>
                )}
                <InfoRow label="Zone de service" value={selectedRequest.delivery_scope}/>
                <InfoRow label="Certifications" value={selectedRequest.certifications}/>
                {selectedRequest.additional_info && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">Notes supplémentaires</p>
                    <p className="text-sm text-dark-800 mt-0.5">{selectedRequest.additional_info}</p>
                  </div>
                )}
              </InfoSection>

              {/* Boutons actions */}
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setRejectOpen(true) }}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 text-red-600 border-2 border-red-200 font-bold text-sm active:scale-95">
                    <X size={16}/> Refuser
                  </button>
                  <button onClick={() => approve(selectedRequest)} disabled={processing}
                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 text-white font-bold text-sm shadow-md active:scale-[0.97] disabled:opacity-50">
                    {processing
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      : <><Check size={16}/> Approuver ✅</>}
                  </button>
                </div>
              )}

              {selectedRequest.status === 'approved' && (
                <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-100">
                  <p className="text-2xl mb-1">✅</p>
                  <p className="font-bold text-green-700 text-sm">Boutique vérifiée</p>
                </div>
              )}

              {selectedRequest.status === 'rejected' && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <p className="font-bold text-red-700 text-sm mb-1">❌ Refusée</p>
                  <p className="text-red-600 text-xs">{selectedRequest.admin_note}</p>
                </div>
              )}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* REJECT SHEET */}
      <BottomSheet open={rejectOpen} onClose={() => { setRejectOpen(false); setSelectedReasons([]); setCustomNote('') }}
        title="❌ Raisons du refus">
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="px-4 pt-2 pb-6 space-y-4">
            <p className="text-gray-500 text-sm">Cochez toutes les raisons applicables. Le vendeur les recevra par notification.</p>

            {Object.entries(REJECT_REASONS).map(([category, reasons]) => (
              <div key={category}>
                <p className="font-bold text-dark-700 text-xs uppercase tracking-wide mb-2 px-1">
                  {category === 'identite' ? '👤 Identité' :
                   category === 'activite' ? '🏪 Activité' :
                   category === 'production' ? '🌱 Production' : '⚠️ Général'}
                </p>
                <div className="space-y-1.5">
                  {reasons.map(reason => (
                    <button key={reason} onClick={() => toggleReason(reason)}
                      className={clsx('w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98]',
                        selectedReasons.includes(reason) ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-white')}>
                      <div className={clsx('w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all',
                        selectedReasons.includes(reason) ? 'border-red-500 bg-red-500' : 'border-gray-300')}>
                        {selectedReasons.includes(reason) && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-dark-700">{reason}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="font-bold text-dark-700 text-xs uppercase tracking-wide mb-2 px-1">✏️ Note personnalisée</p>
              <textarea value={customNote} onChange={e => setCustomNote(e.target.value)}
                placeholder="Ajoutez une note personnalisée au vendeur..."
                rows={2}
                className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm border border-gray-200 outline-none focus:border-red-300 resize-none"/>
            </div>

            {selectedReasons.length > 0 && (
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-red-600 text-xs font-semibold mb-1">{selectedReasons.length} raison(s) sélectionnée(s) :</p>
                {selectedReasons.map(r => <p key={r} className="text-red-500 text-xs">• {r}</p>)}
              </div>
            )}

            <button onClick={() => reject(selectedRequest)} disabled={processing || (selectedReasons.length === 0 && !customNote.trim())}
              className="w-full py-3.5 rounded-2xl bg-red-600 text-white font-bold text-sm shadow-md active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
              {processing
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <><X size={15}/> Refuser et notifier le vendeur</>}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

// ── Composants utilitaires ──
function InfoSection({ title, color, children }) {
  const [open, setOpen] = useState(true)
  const colors = {
    blue: 'border-blue-100 bg-blue-50',
    green: 'border-green-100 bg-green-50',
    amber: 'border-amber-100 bg-amber-50',
  }
  return (
    <div className={clsx('rounded-2xl border overflow-hidden', colors[color])}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3">
        <p className="font-black text-dark-800 text-sm">{title}</p>
        {open ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 bg-white border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value && value !== false && value !== 0) return null
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-xs w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-dark-800 text-sm font-semibold flex-1">{String(value)}</span>
    </div>
  )
}
