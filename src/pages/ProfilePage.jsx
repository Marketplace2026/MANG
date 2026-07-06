import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Edit3, MapPin, Phone, User, Mail,
  LogOut, ChevronRight, Shield, Bell, HelpCircle,
  Wallet, Coins, Copy, Check, Settings, Star,
  Lock, Eye, EyeOff, Globe, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, XCircle, ToggleLeft, ToggleRight,
  Navigation, X
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import {
  Avatar, Button, BottomSheet, InputField, StatCard
} from '@/components/ui'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function reverseGeocode(lat, lon) {
  // Nominatim (OpenStreetMap) — gratuit, pas besoin de clé API
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=16`,
    { headers: { 'Accept-Language': 'fr' } }
  )
  const data = await res.json()
  const a = data.address || {}

  // Quartier / Arrondissement le plus précis possible
  const neighbourhood =
    a.neighbourhood || a.suburb || a.quarter || a.borough ||
    a.city_district || a.village || ''

  // Ville
  const city =
    a.city || a.town || a.municipality || a.county || a.state_district || ''

  // Pays
  const country = a.country_code?.toUpperCase() || ''

  const label = [neighbourhood, city].filter(Boolean).join(', ')
  return { label, city, neighbourhood, country, display_name: data.display_name }
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, profile, wallet, pieces, signOut, refreshProfile } = useAuthStore()
  const navigate = useNavigate()
  const [editOpen,     setEditOpen]     = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [walletCopied, setWalletCopied] = useState(false)

  // Sous-feuilles des paramètres
  const [securityOpen,      setSecurityOpen]      = useState(false)
  const [notifOpen,         setNotifOpen]          = useState(false)
  const [privacyOpen,       setPrivacyOpen]        = useState(false)
  const [languageOpen,      setLanguageOpen]       = useState(false)
  const [helpOpen,          setHelpOpen]           = useState(false)

  const handleCopyWallet = () => {
    if (!wallet?.wallet_number) return
    navigator.clipboard.writeText(wallet.wallet_number)
    setWalletCopied(true)
    toast.success('Numéro copié !')
    setTimeout(() => setWalletCopied(false), 2000)
  }

  const [signOutConfirm, setSignOutConfirm] = useState(false)

  const handleSignOut = async () => {
    if (!signOutConfirm) { setSignOutConfirm(true); return }
    await signOut()
    navigate('/connexion')
  }

  if (!profile) return <ProfileSkeleton />

  const isOnline = profile.last_seen_at
    ? (new Date() - new Date(profile.last_seen_at)) < 300000 : false

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Hero header */}
      <div className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 pb-20 pt-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-gold-400/10 blur-2xl"/>
          <div className="absolute bottom-0 left-0 w-64 h-32 rounded-full bg-primary-400/10 blur-2xl"/>
          <div className="absolute inset-0 opacity-5"
            style={{backgroundImage:'radial-gradient(circle,white 1px,transparent 1px)',backgroundSize:'24px 24px'}}/>
        </div>

        <div className="relative flex justify-between items-center px-5 mb-3">
          <h1 className="font-display text-xl text-white font-bold">Mon Profil</h1>
          <button onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 transition-transform">
            <Settings size={18} className="text-white"/>
          </button>
        </div>

        <div className="relative flex flex-col items-center">
          <AvatarUploader profile={profile} onUpdated={refreshProfile}/>
          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="font-display text-2xl text-white font-bold">
                {profile.full_name || profile.username}
              </h2>
              {isOnline && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-primary-700 animate-pulse-dot"/>}
            </div>
            <p className="text-primary-300 text-sm font-medium mt-0.5">@{profile.username}</p>
            {profile.city && (
              <div className="flex items-center justify-center gap-1 mt-1.5">
                <MapPin size={12} className="text-primary-400"/>
                <span className="text-primary-400 text-xs font-medium">
                  {[profile.neighbourhood, profile.city].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
          <button onClick={() => setEditOpen(true)}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 active:bg-white/20 border border-white/20 transition-colors">
            <Edit3 size={14} className="text-white"/>
            <span className="text-white text-sm font-semibold">Modifier le profil</span>
          </button>
        </div>
      </div>

      {/* Contenu flottant */}
      <div className="relative -mt-12 px-4 space-y-4 pb-24">
        <WalletCard wallet={wallet} copied={walletCopied} onCopy={handleCopyWallet}/>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Coins} label="Pièces MANG" value={`${pieces?.balance ?? 0} pièces`} color="gold"/>
          <div onClick={() => navigate('/vendeur')} className="cursor-pointer">
            <StatCard icon={Star} label="Mes boutiques" value="Voir tout" color="primary"/>
          </div>
        </div>

        <PersonalInfoCard profile={profile}/>
        <ProfileMenu
          onSignOut={handleSignOut}
          onSecurity={() => { setSettingsOpen(false); setSecurityOpen(true) }}
          onNotif={() => { setSettingsOpen(false); setNotifOpen(true) }}
          onHelp={() => { setSettingsOpen(false); setHelpOpen(true) }}
        />
      </div>

      {/* Confirmation déconnexion */}
      {signOutConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setSignOutConfirm(false)}/>
          <div className="fixed bottom-0 left-0 right-0 z-[70] max-w-[480px] mx-auto bg-white rounded-t-3xl p-6 pb-10 shadow-modal">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">👋</div>
              <h3 className="font-display text-lg font-bold text-dark-800">Se déconnecter ?</h3>
              <p className="text-sm text-dark-600/60 mt-1">Vous devrez vous reconnecter pour accéder à votre compte.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSignOutConfirm(false)}
                className="flex-1 py-3.5 rounded-2xl bg-surface-100 text-dark-700 font-bold text-sm active:scale-95 transition-transform">
                Annuler
              </button>
              <button onClick={async () => { await signOut(); navigate('/connexion') }}
                className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm active:scale-95 transition-transform shadow-sm">
                Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}

      {/* Feuille : modifier profil */}
      <EditProfileSheet
        open={editOpen} onClose={() => setEditOpen(false)}
        profile={profile} onUpdated={refreshProfile}
      />

      {/* Feuille : paramètres (hub) */}
      <SettingsSheet
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        onSignOut={handleSignOut}
        onSecurity={() => { setSettingsOpen(false); setSecurityOpen(true) }}
        onPrivacy={() => { setSettingsOpen(false); setPrivacyOpen(true) }}
        onNotif={() => { setSettingsOpen(false); setNotifOpen(true) }}
        onLanguage={() => { setSettingsOpen(false); setLanguageOpen(true) }}
        onHelp={() => { setSettingsOpen(false); setHelpOpen(true) }}
      />

      {/* Feuille : changer mot de passe */}
      <SecuritySheet open={securityOpen} onClose={() => setSecurityOpen(false)}/>

      {/* Feuille : notifications */}
      <NotificationsSheet
        open={notifOpen} onClose={() => setNotifOpen(false)}
        profile={profile} onUpdated={refreshProfile}
      />

      {/* Feuille : confidentialité localisation */}
      <PrivacySheet
        open={privacyOpen} onClose={() => setPrivacyOpen(false)}
        profile={profile} onUpdated={refreshProfile}
      />

      {/* Feuille : langue */}
      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} profile={profile} onUpdated={refreshProfile}/>

      {/* Feuille : aide & FAQ */}
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)}/>
    </div>
  )
}

// ─── AvatarUploader ───────────────────────────────────────────────────────────

function AvatarUploader({ profile, onUpdated }) {
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImage(file, 400, 0.85)
      const path = `${profile.id}/avatar.jpg`
      const url = await uploadImage(BUCKETS.AVATARS, compressed, path)
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
      await onUpdated()
      toast.success('Photo mise à jour !')
    } catch { toast.error("Erreur lors de l'upload") }
    finally { setUploading(false) }
  }

  return (
    <div className="relative">
      <Avatar src={profile.avatar_url} name={profile.full_name || profile.username} size="2xl"
        className="ring-4 ring-primary-600/50 ring-offset-2 ring-offset-primary-700"/>
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className="absolute bottom-1 right-1 w-9 h-9 rounded-xl bg-primary-500 border-2 border-primary-700 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
        {uploading
          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          : <Camera size={15} className="text-white"/>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden"/>
    </div>
  )
}

// ─── WalletCard ───────────────────────────────────────────────────────────────

function WalletCard({ wallet, copied, onCopy }) {
  const balance  = wallet ? Number(wallet.balance_available ?? 0).toLocaleString('fr-FR') : '—'
  const reserved = wallet ? Number(wallet.balance_reserved ?? 0) : 0

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-800 to-dark-900 p-5 shadow-modal">
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary-500/10 blur-2xl pointer-events-none"/>
      <div className="absolute bottom-0 left-0 w-32 h-24 rounded-full bg-gold-500/10 blur-xl pointer-events-none"/>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <Wallet size={15} className="text-primary-400"/>
            </div>
            <span className="text-white/60 text-sm font-medium">MANG Wallet</span>
          </div>
          <span className="text-white/30 text-xs font-mono tracking-widest">
            {wallet?.wallet_number ? `•••• ${wallet.wallet_number.slice(-4)}` : '——'}
          </span>
        </div>
        <div className="mb-4">
          <p className="text-white/40 text-xs mb-1">Solde disponible</p>
          <p className="font-display text-3xl font-bold text-white">
            {balance} <span className="text-lg text-white/50">FCFA</span>
          </p>
          {reserved > 0 && <p className="text-gold-400 text-xs mt-1">{Number(reserved).toLocaleString('fr-FR')} FCFA en réserve</p>}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button onClick={onCopy} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors">
            {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
            <span className="text-xs font-medium">{copied ? 'Copié !' : 'Copier le numéro'}</span>
          </button>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-gold-500/60"/>
            <div className="w-4 h-4 rounded-full bg-gold-400/40 -ml-2"/>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PersonalInfoCard ─────────────────────────────────────────────────────────

function PersonalInfoCard({ profile }) {
  const locationLabel = [profile.neighbourhood, profile.city].filter(Boolean).join(', ')

  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-100">
        <h3 className="font-display font-bold text-dark-800">Informations personnelles</h3>
      </div>
      <div className="divide-y divide-surface-100">
        {[
          { icon: User,   label: 'Nom complet', value: profile.full_name  || 'Non renseigné' },
          { icon: Mail,   label: 'Email',        value: profile.email },
          { icon: Phone,  label: 'Téléphone',    value: profile.phone     || 'Non renseigné' },
          { icon: MapPin, label: 'Localisation', value: locationLabel     || 'Non renseignée' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <item.icon size={14} className="text-primary-600"/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-dark-600/50 font-medium">{item.label}</p>
              <p className="text-sm text-dark-800 font-semibold truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ProfileMenu ──────────────────────────────────────────────────────────────

function ProfileMenu({ onSignOut, onSecurity, onNotif, onHelp }) {
  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      <div className="divide-y divide-surface-100">
        {[
          { icon: Shield,     label: 'Sécurité & Confidentialité', action: onSecurity },
          { icon: Bell,       label: 'Notifications',               action: onNotif   },
          { icon: HelpCircle, label: 'Aide & Support',              action: onHelp    },
        ].map((item, i) => (
          <button key={i} onClick={item.action}
            className="w-full flex items-center gap-3 px-5 py-4 active:bg-surface-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center flex-shrink-0">
              <item.icon size={16} className="text-dark-600"/>
            </div>
            <span className="flex-1 text-left text-sm font-semibold text-dark-800">{item.label}</span>
            <ChevronRight size={16} className="text-dark-600/30"/>
          </button>
        ))}
        <button onClick={onSignOut} className="w-full flex items-center gap-3 px-5 py-4 active:bg-red-50 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <LogOut size={16} className="text-red-500"/>
          </div>
          <span className="flex-1 text-left text-sm font-bold text-red-500">Se déconnecter</span>
        </button>
      </div>
    </div>
  )
}

// ─── EditProfileSheet ─────────────────────────────────────────────────────────

function EditProfileSheet({ open, onClose, profile, onUpdated }) {
  const [form,     setForm]     = useState({ full_name: '', username: '', phone: '', city: '', neighbourhood: '' })
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const usernameDebounce = useRef(null)
  const [loading,  setLoading]  = useState(false)
  const [locating, setLocating] = useState(false)
  const [locInfo,  setLocInfo]  = useState(null)

  useEffect(() => {
    if (profile && open) {
      setForm({
        full_name:     profile.full_name     || '',
        username:      profile.username      || '',
        phone:         profile.phone         || '',
        city:          profile.city          || '',
        neighbourhood: profile.neighbourhood || '',
      })
      setLocInfo(null)
      setUsernameStatus(null)
    }
  }, [profile, open])

  const checkUsername = (value) => {
    clearTimeout(usernameDebounce.current)
    if (!value || value === profile.username) { setUsernameStatus(null); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    usernameDebounce.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', value.toLowerCase()).neq('id', profile.id).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
  }

  const handleLocate = () => {
    if (!navigator.geolocation) { toast.error('GPS non disponible'); return }
    setLocating(true)
    toast('📍 Détection en cours...', { duration: 3000 })

    let watchId = null
    let done = false

    const finish = async (latitude, longitude, accuracy) => {
      if (done) return
      done = true
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      try {
        const geo = await reverseGeocode(latitude, longitude)
        setForm(p => ({ ...p, city: geo.city, neighbourhood: geo.neighbourhood }))
        setLocInfo({ label: geo.label, accuracy: Math.round(accuracy), country: geo.country })
        await supabase.from('profiles').update({ latitude, longitude }).eq('id', profile.id)
        toast.success(`📍 ${geo.label || 'Position détectée'} (±${Math.round(accuracy)}m)`)
      } catch {
        toast.error('Impossible de récupérer la ville')
      }
      setLocating(false)
    }

    // Timeout global 25 secondes
    const globalTimeout = setTimeout(() => {
      if (!done) {
        done = true
        if (watchId !== null) navigator.geolocation.clearWatch(watchId)
        setLocating(false)
        toast.error('Position introuvable — vérifie que le GPS est activé')
      }
    }, 25000)

    watchId = navigator.geolocation.watchPosition(
      ({ coords: { latitude, longitude, accuracy } }) => {
        // Accepter dès que précision < 500m (réseau) ou attendre < 100m (GPS)
        if (accuracy < 100 || (accuracy < 500 && !done)) {
          clearTimeout(globalTimeout)
          finish(latitude, longitude, accuracy)
        }
      },
      (err) => {
        clearTimeout(globalTimeout)
        const msg = err.code === 1 ? 'Permission GPS refusée — autorisez la localisation'
                  : err.code === 2 ? 'GPS indisponible'
                  : 'Délai dépassé'
        toast.error(msg)
        setLocating(false)
        done = true
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
    )
  }

  const handleSave = async () => {
    // Validation téléphone béninois
    if (form.phone) {
      const phoneClean = form.phone.replace(/\s/g, '')
      const validPhone = /^(\+229)?[0-9]{8}$/.test(phoneClean)
      if (!validPhone) {
        toast.error('Numéro invalide (ex: +229 61 00 00 00)')
        return
      }
    }
    setLoading(true)
    if (usernameStatus === 'taken') { toast.error("Ce nom d'utilisateur est déjà pris"); return }
    if (usernameStatus === 'invalid') { toast.error('Username invalide (3-20 caractères, lettres/chiffres/_)'); return }
    if (usernameStatus === 'checking') { toast.error('Vérification du username en cours...'); return }
    const { error } = await supabase.from('profiles').update({
      full_name:     form.full_name.trim()     || null,
      username:      form.username.trim().toLowerCase() || null,
      phone:         form.phone.trim()         || null,
      city:          form.city.trim()          || null,
      neighbourhood: form.neighbourhood.trim() || null,
    }).eq('id', profile.id)
    setLoading(false)
    if (error) {
      console.error('Save error:', error)
      toast.error('Erreur lors de la sauvegarde: ' + (error.message || 'inconnue'))
      return
    }
    await onUpdated()
    onClose()
    toast.success('Profil mis à jour ✅')
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Modifier le profil">
      <div className="px-5 pt-4 pb-6 space-y-4">
        <InputField label="Nom complet" icon={User} placeholder="Votre nom complet"
          value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))}/>

        {/* Username avec vérification temps réel */}
        <div>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
            <input
              type="text"
              placeholder="Nom d'utilisateur"
              value={form.username}
              onChange={e => { setForm(p => ({...p, username: e.target.value})); checkUsername(e.target.value) }}
              className={clsx('input-field pl-9 pr-9 text-sm w-full',
                usernameStatus === 'available' ? 'border-emerald-400' :
                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400' : ''
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && <div className="w-3.5 h-3.5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>}
              {usernameStatus === 'available' && <CheckCircle2 size={14} className="text-emerald-500"/>}
              {usernameStatus === 'taken'     && <XCircle size={14} className="text-red-500"/>}
              {usernameStatus === 'invalid'   && <AlertCircle size={14} className="text-orange-400"/>}
            </div>
          </div>
          {usernameStatus === 'available' && <p className="text-xs text-emerald-500 mt-1 pl-1 font-medium">Disponible ✓</p>}
          {usernameStatus === 'taken'     && <p className="text-xs text-red-500 mt-1 pl-1 font-medium">Déjà pris</p>}
          {usernameStatus === 'invalid'   && <p className="text-xs text-orange-400 mt-1 pl-1 font-medium">3-20 caractères, lettres/chiffres/_</p>}
        </div>

        <InputField label="Téléphone" icon={Phone} placeholder="+229 XX XX XX XX" type="tel"
          value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))}/>

        {/* Localisation précise */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-dark-700 pl-1">Localisation</label>

          {/* Bouton GPS */}
          <button onClick={handleLocate} disabled={locating}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50',
              locInfo
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-primary-50 text-primary-700 border border-primary-200'
            )}>
            {locating
              ? <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"/>
              : locInfo
                ? <CheckCircle2 size={16} className="text-emerald-600"/>
                : <Navigation size={16}/>}
            <span>
              {locating ? 'Localisation en cours...'
                : locInfo ? `📍 ${locInfo.label}`
                : 'Détecter ma position précise'}
            </span>
          </button>

          {locInfo && (
            <p className="text-xs text-dark-600/50 pl-1 flex items-center gap-1">
              <AlertCircle size={11}/>
              Précision : ±{locInfo.accuracy} m · {locInfo.country}
            </p>
          )}

          {/* Saisie manuelle en fallback */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
              <input type="text" placeholder="Ville" value={form.city}
                onChange={e => setForm(p => ({...p, city: e.target.value}))}
                className="input-field pl-9 text-sm"/>
            </div>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
              <input type="text" placeholder="Quartier" value={form.neighbourhood}
                onChange={e => setForm(p => ({...p, neighbourhood: e.target.value}))}
                className="input-field pl-9 text-sm"/>
            </div>
          </div>
        </div>

        <Button variant="primary" className="w-full" loading={loading} onClick={handleSave}>
          Sauvegarder
        </Button>
      </div>
    </BottomSheet>
  )
}

// ─── SettingsSheet (hub) ──────────────────────────────────────────────────────

function SettingsSheet({ open, onClose, onSignOut, onSecurity, onPrivacy, onNotif, onLanguage, onHelp }) {
  const items = [
    { icon: '🔒', label: 'Changer le mot de passe',         action: onSecurity  },
    { icon: '📍', label: 'Confidentialité localisation',    action: onPrivacy   },
    { icon: '🔔', label: 'Préférences notifications',       action: onNotif     },
    { icon: '🌍', label: "Langue de l'application",         action: onLanguage  },
    { icon: '❓', label: "Centre d'aide",                   action: onHelp      },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="Paramètres">
      <div className="px-5 pt-2 pb-6 space-y-2">
        {items.map((item, i) => (
          <button key={i} onClick={() => { onClose(); item.action() }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface-50 active:bg-surface-100 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <span className="flex-1 text-left text-sm font-semibold text-dark-800">{item.label}</span>
            <ChevronRight size={16} className="text-dark-600/30"/>
          </button>
        ))}
        <button onClick={() => { onClose(); onSignOut() }}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 active:bg-red-100 transition-colors mt-2">
          <span className="text-xl">🚪</span>
          <span className="flex-1 text-left text-sm font-bold text-red-600">Se déconnecter</span>
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── SecuritySheet ────────────────────────────────────────────────────────────

function SecuritySheet({ open, onClose }) {
  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' })
  const [show,    setShow]    = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [isOAuth, setIsOAuth] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ current: '', next: '', confirm: '' })
      setErrors({})
      // Vérifier si l'utilisateur est connecté via Google OAuth
      supabase.auth.getUser().then(({ data: { user } }) => {
        const providers = user?.app_metadata?.providers || []
        setIsOAuth(providers.includes('google') && !providers.includes('email'))
      })
    }
  }, [open])

  const validate = () => {
    const e = {}
    if (!form.current)           e.current = 'Requis'
    if (!form.next)              e.next    = 'Requis'
    else if (form.next.length < 6) e.next  = '6 caractères minimum'
    if (form.next !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    // 1. Vérifier l'ancien mot de passe via re-auth
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: form.current,
    })
    if (signInErr) {
      setLoading(false)
      setErrors({ current: 'Mot de passe actuel incorrect' })
      return
    }

    // 2. Mettre à jour
    const { error } = await supabase.auth.updateUser({ password: form.next })
    setLoading(false)
    if (error) { toast.error('Erreur lors de la mise à jour'); return }
    toast.success('Mot de passe mis à jour ✅')
    onClose()
  }

  const toggleShow = (k) => setShow(p => ({ ...p, [k]: !p[k] }))

  const fieldProps = (k, label, placeholder) => ({
    label,
    placeholder,
    type: show[k] ? 'text' : 'password',
    value: form[k],
    onChange: e => { setForm(p => ({...p, [k]: e.target.value})); setErrors(p => ({...p, [k]: ''})) },
    error: errors[k],
    suffix: (
      <button type="button" onClick={() => toggleShow(k)}
        className="text-dark-600/40 hover:text-dark-600 transition-colors">
        {show[k] ? <EyeOff size={15}/> : <Eye size={15}/>}
      </button>
    ),
  })

  return (
    <BottomSheet open={open} onClose={onClose} title="Changer le mot de passe">
      <div className="px-5 pt-4 pb-6 space-y-4">
        {isOAuth ? (
          <div className="p-4 bg-blue-50 rounded-2xl text-sm text-blue-700 leading-relaxed">
            <p className="font-semibold mb-1">🔑 Compte Google</p>
            <p className="text-xs text-blue-600/80">
              Votre compte est connecté via Google. La gestion du mot de passe se fait directement depuis votre compte Google.
            </p>
          </div>
        ) : (
          <>
            <PasswordInput {...fieldProps('current', 'Mot de passe actuel', '••••••••')}/>
            <PasswordInput {...fieldProps('next',    'Nouveau mot de passe', '6 caractères minimum')}/>
            <PasswordInput {...fieldProps('confirm', 'Confirmer',            'Répéter le nouveau mot de passe')}/>
            <Button variant="primary" className="w-full" loading={loading} onClick={handleSave}>
              Mettre à jour
            </Button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

function PasswordInput({ label, placeholder, type, value, onChange, error, suffix }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-dark-700 pl-1">{label}</label>
      <div className="relative">
        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-600/40 pointer-events-none"/>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange}
          className={clsx('input-field pl-10 pr-10', error && 'border-red-400 focus:ring-red-300')}/>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</div>
      </div>
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
    </div>
  )
}

// ─── NotificationsSheet ───────────────────────────────────────────────────────

const NOTIF_KEYS = [
  { key: 'notif_orders',     label: 'Commandes',        desc: 'Confirmation et suivi de commandes' },
  { key: 'notif_promotions', label: 'Promotions',        desc: 'Offres spéciales et réductions' },
  { key: 'notif_messages',   label: 'Messages',          desc: 'Nouveaux messages reçus' },
  { key: 'notif_wallet',     label: 'Portefeuille',      desc: 'Transactions et mouvements FCFA' },
  { key: 'notif_community',  label: 'Communauté',        desc: 'Actualités et activités' },
]

function NotificationsSheet({ open, onClose, profile, onUpdated }) {
  const [prefs,   setPrefs]   = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && profile) {
      const init = {}
      NOTIF_KEYS.forEach(({ key }) => {
        init[key] = profile[key] !== false // default true
      })
      setPrefs(init)
    }
  }, [open, profile])

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles')
      .update(prefs)
      .eq('id', profile.id)
    setLoading(false)
    if (error) { toast.error('Erreur de sauvegarde'); return }
    await onUpdated()
    toast.success('Préférences mises à jour ✅')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Notifications">
      <div className="px-5 pt-2 pb-6 space-y-3">
        {NOTIF_KEYS.map(({ key, label, desc }) => (
          <div key={key}
            className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-dark-800">{label}</p>
              <p className="text-xs text-dark-600/50 mt-0.5">{desc}</p>
            </div>
            <button onClick={() => toggle(key)}
              className={clsx(
                'w-12 h-6 rounded-full transition-all duration-200 flex items-center relative flex-shrink-0',
                prefs[key] ? 'bg-primary-500' : 'bg-surface-300'
              )}>
              <div className={clsx(
                'w-5 h-5 bg-white rounded-full shadow absolute transition-all duration-200',
                prefs[key] ? 'left-[26px]' : 'left-0.5'
              )}/>
            </button>
          </div>
        ))}
        <Button variant="primary" className="w-full mt-4" loading={loading} onClick={handleSave}>
          Sauvegarder
        </Button>
      </div>
    </BottomSheet>
  )
}

// ─── PrivacySheet ─────────────────────────────────────────────────────────────

function PrivacySheet({ open, onClose, profile, onUpdated }) {
  const [shareLocation, setShareLocation] = useState(true)
  const [loading,       setLoading]       = useState(false)

  useEffect(() => {
    if (open && profile) {
      setShareLocation(profile.share_location !== false)
    }
  }, [open, profile])

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles')
      .update({ share_location: shareLocation })
      .eq('id', profile.id)
    setLoading(false)
    if (error) { toast.error('Erreur de sauvegarde'); return }
    await onUpdated()
    toast.success('Confidentialité mise à jour ✅')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Confidentialité localisation">
      <div className="px-5 pt-4 pb-6 space-y-4">
        <div className="p-4 bg-blue-50 rounded-2xl text-sm text-blue-700 leading-relaxed">
          <p className="font-semibold mb-1">🔒 Vos données GPS</p>
          <p className="text-xs text-blue-600/80">
            Votre position exacte n'est jamais partagée publiquement. Seule votre ville et votre quartier
            peuvent apparaître sur votre profil public selon vos préférences ci-dessous.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl">
          <div className="flex-1 pr-4">
            <p className="text-sm font-semibold text-dark-800">Afficher ma localisation</p>
            <p className="text-xs text-dark-600/50 mt-0.5">
              Votre ville et quartier visibles sur votre profil public
            </p>
          </div>
          <button onClick={() => setShareLocation(!shareLocation)}
            className={clsx(
              'w-12 h-6 rounded-full transition-all duration-200 flex items-center relative flex-shrink-0',
              shareLocation ? 'bg-primary-500' : 'bg-surface-300'
            )}>
            <div className={clsx(
              'w-5 h-5 bg-white rounded-full shadow absolute transition-all duration-200',
              shareLocation ? 'left-[26px]' : 'left-0.5'
            )}/>
          </button>
        </div>

        <div className="p-4 bg-surface-50 rounded-2xl space-y-2">
          <p className="text-xs font-semibold text-dark-700 uppercase tracking-wider">Ce qui est stocké</p>
          {[
            { label: 'Coordonnées GPS',        stored: true,  shared: false },
            { label: 'Ville',                  stored: true,  shared: shareLocation },
            { label: 'Quartier',               stored: true,  shared: shareLocation },
            { label: 'Adresse exacte',         stored: false, shared: false },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1">
              <span className="text-dark-600 font-medium">{row.label}</span>
              <div className="flex gap-3">
                <span className={clsx('font-semibold', row.stored ? 'text-emerald-600' : 'text-dark-600/40')}>
                  {row.stored ? '✓ Stocké' : '✗ Non stocké'}
                </span>
                <span className={clsx('font-semibold', row.shared ? 'text-primary-600' : 'text-dark-600/40')}>
                  {row.shared ? '✓ Public' : '✗ Privé'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Button variant="primary" className="w-full" loading={loading} onClick={handleSave}>
          Sauvegarder
        </Button>
      </div>
    </BottomSheet>
  )
}

// ─── LanguageSheet ────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'fon', label: 'Fon',      flag: '🇧🇯' },
  { code: 'yo',  label: 'Yoruba',   flag: '🌍' },
  { code: 'en',  label: 'English',  flag: '🇬🇧' },
]

function LanguageSheet({ open, onClose, profile, onUpdated }) {
  const [selected, setSelected] = useState('fr')

  useEffect(() => {
    if (open && profile) setSelected(profile.language || 'fr')
  }, [open, profile])

  const handleSelect = async (code) => {
    setSelected(code)
    await supabase.from('profiles').update({ language: code }).eq('id', profile.id)
    await onUpdated()
    toast.success(`Langue mise à jour : ${LANGUAGES.find(l => l.code === code)?.label}`)
    setTimeout(onClose, 400)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Langue de l'application">
      <div className="px-5 pt-2 pb-6 space-y-2">
        {LANGUAGES.map(({ code, label, flag }) => (
          <button key={code} onClick={() => handleSelect(code)}
            className={clsx(
              'w-full flex items-center gap-3 p-4 rounded-2xl transition-colors',
              selected === code
                ? 'bg-primary-50 border border-primary-200'
                : 'bg-surface-50 active:bg-surface-100'
            )}>
            <span className="text-2xl">{flag}</span>
            <span className={clsx(
              'flex-1 text-left text-sm font-semibold',
              selected === code ? 'text-primary-700' : 'text-dark-800'
            )}>{label}</span>
            {selected === code && <Check size={16} className="text-primary-600"/>}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

// ─── HelpSheet ────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Comment créer une boutique sur MANG ?',
    a: "Rendez-vous dans l'onglet Vendeur, puis appuyez sur « Créer ma boutique ». Remplissez les informations requises (nom, description, catégorie) et soumettez votre demande. L'activation prend moins de 24h.",
  },
  {
    q: 'Comment recharger mon portefeuille MANG ?',
    a: "Allez dans l'onglet Wallet, puis « Recharger ». Vous pouvez utiliser Mobile Money (MTN, Moov), virement bancaire ou dépôt en agence.",
  },
  {
    q: 'Mon paiement est en attente, que faire ?',
    a: "Les paiements peuvent prendre jusqu'à 24h en cas de vérification. Si le statut est toujours « En attente » après 24h, contactez notre support via le bouton ci-dessous.",
  },
  {
    q: 'Comment signaler un vendeur ou un produit ?',
    a: "Sur la page du produit ou du vendeur, appuyez sur les 3 points (⋯) puis « Signaler ». Notre équipe examine chaque signalement sous 48h.",
  },
  {
    q: 'Comment modifier mon numéro de téléphone ?',
    a: "Allez dans Modifier le profil depuis la page Profil. Mettez à jour votre numéro et sauvegardez. Une vérification par SMS peut être requise.",
  },
]

function HelpSheet({ open, onClose }) {
  const [openIdx, setOpenIdx] = useState(null)

  const toggle = (i) => setOpenIdx(prev => prev === i ? null : i)

  return (
    <BottomSheet open={open} onClose={onClose} title="Aide & Support">
      <div className="px-5 pt-2 pb-6 space-y-3">
        {/* Bouton contact rapide */}
        <div className="flex gap-2">
          <a href="tel:+2290197293196"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary-50 text-primary-700 font-semibold text-sm active:scale-95 transition-transform">
            <Phone size={15}/> Appeler
          </a>
          <a href="https://wa.me/2290197293196" target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold text-sm active:scale-95 transition-transform">
            <span className="text-base">💬</span> WhatsApp
          </a>
        </div>

        <p className="text-xs font-semibold text-dark-600/50 uppercase tracking-wider px-1 pt-2">
          Questions fréquentes
        </p>

        {FAQ.map((item, i) => (
          <div key={i} className="bg-surface-50 rounded-2xl overflow-hidden">
            <button onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <span className="flex-1 text-sm font-semibold text-dark-800 leading-snug">
                {item.q}
              </span>
              {openIdx === i
                ? <ChevronUp size={16} className="text-primary-500 flex-shrink-0"/>
                : <ChevronDown size={16} className="text-dark-600/30 flex-shrink-0"/>}
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-dark-600 leading-relaxed border-t border-surface-200 pt-3">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}

// ─── ProfileSkeleton ──────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50">
      <div className="bg-primary-800 pb-20 pt-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-32 h-32 rounded-2xl skeleton"/>
          <div className="w-40 h-6 skeleton rounded-xl"/>
          <div className="w-24 h-4 skeleton rounded-lg"/>
        </div>
      </div>
      <div className="relative -mt-12 px-4 space-y-4">
        <div className="h-36 skeleton rounded-3xl"/>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 skeleton rounded-2xl"/>
          <div className="h-20 skeleton rounded-2xl"/>
        </div>
        <div className="h-48 skeleton rounded-3xl"/>
      </div>
    </div>
  )
}
