import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Shield, Bell, MapPin, Globe, HelpCircle,
  MessageCircle, Star, AlertTriangle, FileText, Lock,
  Info, LogOut, ChevronRight, User, Mail, Phone,
  Moon, Sun, Monitor, Trash2, Eye, ShieldCheck,
  Volume2, Package, MessageSquare, Tag, BellOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { BottomSheet, InputField } from '@/components/ui'
import { Eye as EyeIcon, EyeOff } from 'lucide-react'

// ─── Toggle Switch style iOS ──────────────────────────────────────────────────

function ToggleSwitch({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{ background: value ? '#008000' : '#D1D5DB' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

// ─── Section container ────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {title && (
        <div className="px-5 pt-4 pb-2 border-b border-gray-50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        </div>
      )}
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

// ─── Item cliquable standard ──────────────────────────────────────────────────

function Item({ icon: Icon, iconBg, iconColor, label, sub, badge, danger, onClick, last }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-colors active:bg-gray-50 ${
        danger ? 'active:bg-red-50' : ''
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={16} className={iconColor} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${danger ? 'text-red-600' : 'text-gray-800'}`}>{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      {badge && (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
          {badge}
        </span>
      )}
      <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

// ─── Item avec toggle ─────────────────────────────────────────────────────────

function ItemToggle({ icon: Icon, iconBg, iconColor, label, sub, value, onChange, saving }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={16} className={iconColor} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <ToggleSwitch value={value} onChange={onChange} disabled={saving} />
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuthStore()
  const navigate = useNavigate()

  // Sous-feuilles
  const [securityOpen,  setSecurityOpen]  = useState(false)
  const [languageOpen,  setLanguageOpen]  = useState(false)
  const [helpOpen,      setHelpOpen]      = useState(false)
  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [themeOpen,     setThemeOpen]     = useState(false)

  // Toggles notifications (chargés depuis le profil)
  const [notifPush,     setNotifPush]     = useState(true)
  const [notifOrders,   setNotifOrders]   = useState(true)
  const [notifMessages, setNotifMessages] = useState(true)
  const [notifPromos,   setNotifPromos]   = useState(false)
  const [savingNotif,   setSavingNotif]   = useState(false)

  // Toggles confidentialité
  const [shareLocation, setShareLocation] = useState(true)
  const [publicProfile, setPublicProfile] = useState(true)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  // Déconnexion avec double confirmation
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  // Charger les préférences depuis le profil
  useEffect(() => {
    if (!profile) return
    setNotifPush(profile.notif_push !== false)
    setNotifOrders(profile.notif_orders !== false)
    setNotifMessages(profile.notif_messages !== false)
    setNotifPromos(profile.notif_promos === true)
    setShareLocation(profile.location_sharing !== false)
    setPublicProfile(profile.is_public !== false)
  }, [profile])

  // Sauvegarder un toggle notif
  const saveNotif = async (field, val) => {
    setSavingNotif(true)
    await supabase.from('profiles').update({ [field]: val }).eq('id', user.id)
    await refreshProfile()
    setSavingNotif(false)
  }

  // Sauvegarder un toggle privacy
  const savePrivacy = async (field, val) => {
    setSavingPrivacy(true)
    await supabase.from('profiles').update({ [field]: val }).eq('id', user.id)
    await refreshProfile()
    setSavingPrivacy(false)
  }

  const handleSignOut = async () => {
    if (!logoutConfirm) { setLogoutConfirm(true); setTimeout(() => setLogoutConfirm(false), 3000); return }
    await signOut()
    navigate('/connexion', { replace: true })
  }

  const maskedEmail  = user?.email  ? user.email.replace(/(.{2}).+(@)/, '$1•••$2') : '—'
  const maskedPhone  = profile?.phone ? profile.phone.replace(/(.{4}).+(.{2})$/, '$1 •••• $2') : '—'

  return (
    <div className="min-h-screen" style={{ background: '#F5F6F8' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <h1 className="font-black text-gray-900 text-[17px] tracking-tight">Paramètres</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* ══ Section 1 : MON COMPTE ══ */}
        <Section title="Mon Compte">
          <Item
            icon={User}
            iconBg="bg-green-50" iconColor="text-green-600"
            label="Modifier le profil"
            sub="Nom, photo, bio, localisation"
            onClick={() => navigate('/profil')}
          />
          <Item
            icon={Mail}
            iconBg="bg-blue-50" iconColor="text-blue-600"
            label="Adresse e-mail"
            sub={maskedEmail}
            onClick={() => toast('Contactez le support pour changer votre email', { icon: 'ℹ️' })}
          />
          <Item
            icon={Phone}
            iconBg="bg-violet-50" iconColor="text-violet-600"
            label="Numéro de téléphone"
            sub={maskedPhone || 'Non renseigné'}
            onClick={() => navigate('/profil')}
          />
          <Item
            icon={Shield}
            iconBg="bg-gray-100" iconColor="text-gray-600"
            label="Sécurité & Mot de passe"
            sub="Modifiez votre mot de passe"
            onClick={() => setSecurityOpen(true)}
          />
        </Section>

        {/* ══ Section 2 : NOTIFICATIONS ══ */}
        <Section title="Notifications">
          <ItemToggle
            icon={Bell}
            iconBg="bg-orange-50" iconColor="text-orange-500"
            label="Notifications push"
            sub="Recevoir des alertes sur l'appli"
            value={notifPush}
            onChange={v => { setNotifPush(v); saveNotif('notif_push', v) }}
            saving={savingNotif}
          />
          <ItemToggle
            icon={Package}
            iconBg="bg-blue-50" iconColor="text-blue-500"
            label="Nouvelles commandes"
            sub="Alertes pour vos ventes"
            value={notifOrders}
            onChange={v => { setNotifOrders(v); saveNotif('notif_orders', v) }}
            saving={savingNotif}
          />
          <ItemToggle
            icon={MessageSquare}
            iconBg="bg-violet-50" iconColor="text-violet-500"
            label="Messages"
            sub="Quand quelqu'un vous écrit"
            value={notifMessages}
            onChange={v => { setNotifMessages(v); saveNotif('notif_messages', v) }}
            saving={savingNotif}
          />
          <ItemToggle
            icon={Tag}
            iconBg="bg-amber-50" iconColor="text-amber-500"
            label="Promotions & offres"
            sub="Newsletter et actualités MANG"
            value={notifPromos}
            onChange={v => { setNotifPromos(v); saveNotif('notif_promos', v) }}
            saving={savingNotif}
          />
        </Section>

        {/* ══ Section 3 : CONFIDENTIALITÉ & SÉCURITÉ ══ */}
        <Section title="Confidentialité & Sécurité">
          <ItemToggle
            icon={MapPin}
            iconBg="bg-emerald-50" iconColor="text-emerald-500"
            label="Partage de localisation"
            sub={shareLocation ? 'Actif — les vendeurs proches vous voient' : 'Désactivé'}
            value={shareLocation}
            onChange={v => { setShareLocation(v); savePrivacy('location_sharing', v) }}
            saving={savingPrivacy}
          />
          <ItemToggle
            icon={Eye}
            iconBg="bg-sky-50" iconColor="text-sky-500"
            label="Profil public"
            sub={publicProfile ? 'Visible par tous' : 'Visible uniquement par vos contacts'}
            value={publicProfile}
            onChange={v => { setPublicProfile(v); savePrivacy('is_public', v) }}
            saving={savingPrivacy}
          />
          <Item
            icon={ShieldCheck}
            iconBg="bg-green-50" iconColor="text-green-600"
            label="Authentification 2FA"
            sub="Bientôt disponible"
            badge="Bientôt"
            onClick={() => toast('La double authentification arrive bientôt !', { icon: '🛡️' })}
          />
          <Item
            icon={Trash2}
            iconBg="bg-red-50" iconColor="text-red-500"
            label="Supprimer mon compte"
            sub="Action irréversible"
            danger
            onClick={() => setDeleteOpen(true)}
          />
        </Section>

        {/* ══ Section 4 : APPARENCE & LANGUE ══ */}
        <Section title="Apparence & Langue">
          <Item
            icon={Globe}
            iconBg="bg-violet-50" iconColor="text-violet-600"
            label="Langue de l'application"
            sub={profile?.language === 'en' ? 'English' : 'Français'}
            onClick={() => setLanguageOpen(true)}
          />
          <Item
            icon={Monitor}
            iconBg="bg-gray-100" iconColor="text-gray-600"
            label="Thème de l'application"
            sub="Clair (par défaut)"
            badge="Bientôt"
            onClick={() => toast('Le mode sombre arrive bientôt !', { icon: '🌙' })}
          />
        </Section>

        {/* ══ Section 5 : AIDE & SUPPORT ══ */}
        <Section title="Aide & Support">
          <Item
            icon={HelpCircle}
            iconBg="bg-green-50" iconColor="text-green-600"
            label="Centre d'aide & FAQ"
            sub="Questions fréquentes"
            onClick={() => setHelpOpen(true)}
          />
          <Item
            icon={MessageCircle}
            iconBg="bg-emerald-50" iconColor="text-emerald-600"
            label="WhatsApp Support"
            sub="Réponse en moins d'1h"
            onClick={() => window.open('https://wa.me/2290197293196', '_blank')}
          />
          <Item
            icon={Star}
            iconBg="bg-amber-50" iconColor="text-amber-500"
            label="Noter l'application"
            sub="Aidez-nous à nous améliorer"
            onClick={() => toast("Merci pour votre soutien ! 🙏", { icon: '⭐' })}
          />
          <Item
            icon={AlertTriangle}
            iconBg="bg-orange-50" iconColor="text-orange-500"
            label="Signaler un problème"
            sub="Bug ou comportement suspect"
            onClick={() => window.open('https://wa.me/2290197293196?text=Signalement+bug+MANG+:', '_blank')}
          />
        </Section>

        {/* ══ Section 6 : LÉGAL & INFOS ══ */}
        <Section title="Informations légales">
          <Item
            icon={FileText}
            iconBg="bg-gray-100" iconColor="text-gray-500"
            label="Conditions générales d'utilisation"
            onClick={() => toast("CGU bientôt disponibles", { icon: '📄' })}
          />
          <Item
            icon={Lock}
            iconBg="bg-gray-100" iconColor="text-gray-500"
            label="Politique de confidentialité"
            onClick={() => toast("Politique de confidentialité bientôt disponible", { icon: '🔒' })}
          />
          <Item
            icon={Info}
            iconBg="bg-gray-100" iconColor="text-gray-500"
            label="À propos de MANG"
            sub="Version 1.0.0 · © 2026 MANG"
            onClick={() => toast('MANG v1.0.0 — Marché Agricole Nouvelle Génération 🌱', { icon: 'ℹ️', duration: 4000 })}
          />
        </Section>

        {/* ══ Bouton Déconnexion ══ */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-4 rounded-2xl transition-colors active:scale-[0.98]"
          style={{
            background: logoutConfirm ? '#FEE2E2' : '#FFF5F5',
            border: `1px solid ${logoutConfirm ? '#FECACA' : '#FFE4E6'}`
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <LogOut size={16} className="text-red-500" />
          </div>
          <span className="flex-1 text-left text-sm font-bold text-red-600">
            {logoutConfirm ? 'Appuyez à nouveau pour confirmer' : 'Se déconnecter'}
          </span>
          {logoutConfirm && <span className="text-xs text-red-400">⚠️</span>}
        </button>

      </div>

      {/* ══ SOUS-FEUILLES ══ */}
      <SecuritySheet     open={securityOpen}  onClose={() => setSecurityOpen(false)} />
      <LanguageSheet     open={languageOpen}  onClose={() => setLanguageOpen(false)} profile={profile} userId={user?.id} onUpdated={refreshProfile} />
      <HelpSheet         open={helpOpen}       onClose={() => setHelpOpen(false)} />
      <DeleteAccountSheet open={deleteOpen}   onClose={() => setDeleteOpen(false)} onConfirm={async () => { await signOut(); navigate('/accueil', { replace: true }) }} />
    </div>
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
      supabase.auth.getUser().then(({ data: { user } }) => {
        const providers = user?.app_metadata?.providers || []
        setIsOAuth(providers.includes('google') && !providers.includes('email'))
      })
    }
  }, [open])

  const validate = () => {
    const e = {}
    if (!form.current)             e.current = 'Requis'
    if (!form.next)                e.next    = 'Requis'
    else if (form.next.length < 6) e.next    = '6 caractères minimum'
    if (form.next !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: form.current })
    if (signInErr) { setLoading(false); setErrors({ current: 'Mot de passe actuel incorrect' }); return }
    const { error } = await supabase.auth.updateUser({ password: form.next })
    setLoading(false)
    if (error) { toast.error('Erreur lors de la mise à jour'); return }
    toast.success('Mot de passe mis à jour ✅')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Changer le mot de passe">
      <div className="px-5 pt-4 pb-6 space-y-4">
        {isOAuth ? (
          <div className="p-4 bg-blue-50 rounded-2xl text-sm text-blue-700 leading-relaxed">
            <p className="font-semibold mb-1">🔑 Compte Google</p>
            <p className="text-xs text-blue-600/80">Votre compte est connecté via Google. La gestion du mot de passe se fait depuis votre compte Google.</p>
          </div>
        ) : (
          <>
            {[
              { k: 'current', label: 'Mot de passe actuel', placeholder: '••••••••' },
              { k: 'next',    label: 'Nouveau mot de passe', placeholder: '6 caractères minimum' },
              { k: 'confirm', label: 'Confirmer le nouveau', placeholder: 'Répétez le nouveau' },
            ].map(({ k, label, placeholder }) => (
              <div key={k} className="relative">
                <InputField
                  label={label}
                  placeholder={placeholder}
                  type={show[k] ? 'text' : 'password'}
                  value={form[k]}
                  onChange={e => { setForm(p => ({ ...p, [k]: e.target.value })); setErrors(p => ({ ...p, [k]: '' })) }}
                  error={errors[k]}
                />
                <button
                  type="button"
                  onClick={() => setShow(p => ({ ...p, [k]: !p[k] }))}
                  className="absolute right-4 top-[38px] text-gray-400"
                >
                  {show[k] ? <EyeOff size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-opacity disabled:opacity-60"
              style={{ background: '#008000' }}
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

// ─── LanguageSheet ────────────────────────────────────────────────────────────

function LanguageSheet({ open, onClose, profile, userId, onUpdated }) {
  const langs = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English',  flag: '🇬🇧' },
    { code: 'fon', label: 'Fon',    flag: '🇧🇯' },
  ]
  const [saving, setSaving] = useState(false)
  const current = profile?.language || 'fr'

  const select = async (code) => {
    if (code === current) { onClose(); return }
    setSaving(true)
    await supabase.from('profiles').update({ language: code }).eq('id', userId)
    await onUpdated()
    setSaving(false)
    onClose()
    toast.success('Langue mise à jour ✅')
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Langue de l'application">
      <div className="px-5 pt-3 pb-6 space-y-2">
        {langs.map(l => (
          <button
            key={l.code}
            onClick={() => select(l.code)}
            disabled={saving}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-colors ${
              current === l.code
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-gray-50 border-2 border-transparent active:bg-gray-100'
            }`}
          >
            <span className="text-2xl">{l.flag}</span>
            <span className={`flex-1 text-left text-sm font-bold ${current === l.code ? 'text-green-700' : 'text-gray-800'}`}>
              {l.label}
            </span>
            {current === l.code && <span className="text-green-500 text-lg">✓</span>}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

// ─── HelpSheet ────────────────────────────────────────────────────────────────

function HelpSheet({ open, onClose }) {
  const faqs = [
    { q: 'Comment créer ma boutique ?',         a: "Allez dans \"Espace Vendeur\" depuis la page profil, puis cliquez sur \"Créer ma boutique\". Renseignez les informations de base et soumettez pour vérification." },
    { q: 'Comment passer une commande ?',        a: 'Trouvez un produit sur la marketplace, cliquez sur "Commander", choisissez votre adresse et validez. Le vendeur sera notifié immédiatement.' },
    { q: 'Comment retirer mon argent ?',         a: 'Rendez-vous dans "Mon Portefeuille" et cliquez sur "Retirer". Vous pouvez retirer via Mobile Money (MTN/Moov) ou virement bancaire.' },
    { q: 'Mon paiement est bloqué, que faire ?', a: 'Si un paiement reste "En attente" plus de 48h, contactez-nous sur WhatsApp. Nous traitons toutes les réclamations sous 24h.' },
    { q: 'Comment signaler un vendeur ?',        a: 'Sur la page du vendeur, cliquez sur les 3 points en haut et sélectionnez "Signaler". Notre équipe de modération examinera le signalement.' },
  ]
  const [open_, setOpen_] = useState(null)

  return (
    <BottomSheet open={open} onClose={onClose} title="Centre d'aide & FAQ">
      <div className="px-5 pt-3 pb-6 space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-gray-100">
            <button
              onClick={() => setOpen_(open_ === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-gray-800 flex-1">{faq.q}</span>
              <span className={`text-green-500 font-black text-lg transition-transform duration-200 ${open_ === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            {open_ === i && (
              <div className="px-4 py-3 bg-white">
                <p className="text-[13px] text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
        <div className="pt-2">
          <button
            onClick={() => window.open('https://wa.me/2290197293196?text=Bonjour, j\'ai besoin d\'aide avec MANG', '_blank')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-sm"
            style={{ background: '#25D366' }}
          >
            <MessageCircle size={16} />
            Contacter le support WhatsApp
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── DeleteAccountSheet ───────────────────────────────────────────────────────

function DeleteAccountSheet({ open, onClose, onConfirm }) {
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (confirm.toLowerCase() !== 'supprimer') {
      toast.error('Tapez "supprimer" pour confirmer')
      return
    }
    setLoading(true)
    try {
      await onConfirm()
      toast.success('Compte supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Supprimer mon compte">
      <div className="px-5 pt-4 pb-6 space-y-4">
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
          <p className="text-sm font-bold text-red-700 mb-1">⚠️ Action irréversible</p>
          <p className="text-xs text-red-600 leading-relaxed">
            La suppression de votre compte entraînera la perte définitive de vos données, commandes, boutiques et solde MANG Wallet.
          </p>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
            Tapez "supprimer" pour confirmer
          </label>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="supprimer"
            className="w-full px-4 py-3 rounded-xl border-2 border-red-200 focus:border-red-400 outline-none text-sm font-semibold text-gray-800"
          />
        </div>
        <button
          onClick={handleDelete}
          disabled={loading || confirm.toLowerCase() !== 'supprimer'}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-40 transition-opacity"
          style={{ background: '#EF4444' }}
        >
          {loading ? 'Suppression...' : 'Supprimer définitivement'}
        </button>
      </div>
    </BottomSheet>
  )
}
