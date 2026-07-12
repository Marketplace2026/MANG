import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Shield, Bell, MapPin, Globe, HelpCircle,
  MessageCircle, Star, AlertTriangle, FileText, Lock,
  Info, LogOut, ChevronRight, User, Mail, Phone,
  Moon, Sun, Trash2, Eye, EyeOff, ShieldCheck,
  Package, MessageSquare, Tag, Check, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { BottomSheet } from '@/components/ui'

// ─── Traductions i18n ─────────────────────────────────────────────────────────

const TRANSLATIONS = {
  fr: {
    settings: 'Paramètres',
    myAccount: 'Mon Compte',
    editProfile: 'Modifier le profil',
    editProfileSub: 'Nom, photo, bio, localisation',
    email: 'Adresse e-mail',
    phone: 'Numéro de téléphone',
    phoneEmpty: 'Non renseigné',
    security: 'Sécurité & Mot de passe',
    securitySub: 'Modifiez votre mot de passe',
    notifications: 'Notifications',
    notifPush: 'Notifications push',
    notifPushSub: "Recevoir des alertes sur l'appli",
    notifOrders: 'Nouvelles commandes',
    notifOrdersSub: 'Alertes pour vos ventes',
    notifMessages: 'Messages',
    notifMessagesSub: 'Quand quelqu\'un vous écrit',
    notifPromos: 'Promotions & offres',
    notifPromosSub: 'Newsletter et actualités MANG',
    privacySecurity: 'Confidentialité & Sécurité',
    shareLocation: 'Partage de localisation',
    shareLocationOn: 'Actif — les vendeurs proches vous voient',
    shareLocationOff: 'Désactivé',
    publicProfile: 'Profil public',
    publicProfileOn: 'Visible par tous',
    publicProfileOff: 'Visible uniquement par vos contacts',
    twoFA: 'Authentification 2 facteurs',
    twoFASub: 'Protégez votre compte',
    deleteAccount: 'Supprimer mon compte',
    deleteAccountSub: 'Action irréversible',
    appearanceLanguage: 'Apparence & Langue',
    language: 'Langue de l\'application',
    theme: 'Thème',
    themeLight: 'Mode clair',
    themeDark: 'Mode sombre',
    helpSupport: 'Aide & Support',
    faq: 'Centre d\'aide & FAQ',
    faqSub: 'Questions fréquentes',
    whatsapp: 'WhatsApp Support',
    whatsappSub: 'Réponse en moins d\'1h',
    rateApp: 'Noter l\'application',
    rateAppSub: 'Aidez-nous à nous améliorer',
    reportProblem: 'Signaler un problème',
    reportProblemSub: 'Bug ou comportement suspect',
    legalInfo: 'Informations légales',
    cgu: 'Conditions générales d\'utilisation',
    privacy: 'Politique de confidentialité',
    about: 'À propos de MANG',
    aboutSub: 'Version 1.0.0 · © 2026 MANG',
    logout: 'Se déconnecter',
    logoutConfirm: 'Appuyez à nouveau pour confirmer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    update: 'Mettre à jour',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau',
    deleteType: 'Tapez "supprimer" pour confirmer',
    deleteBtn: 'Supprimer définitivement',
    twoFANotAvailable: 'Activez 2FA pour sécuriser votre compte',
  },
  en: {
    settings: 'Settings',
    myAccount: 'My Account',
    editProfile: 'Edit profile',
    editProfileSub: 'Name, photo, bio, location',
    email: 'Email address',
    phone: 'Phone number',
    phoneEmpty: 'Not set',
    security: 'Security & Password',
    securitySub: 'Change your password',
    notifications: 'Notifications',
    notifPush: 'Push notifications',
    notifPushSub: 'Receive app alerts',
    notifOrders: 'New orders',
    notifOrdersSub: 'Alerts for your sales',
    notifMessages: 'Messages',
    notifMessagesSub: 'When someone writes to you',
    notifPromos: 'Promotions & offers',
    notifPromosSub: 'MANG newsletter and news',
    privacySecurity: 'Privacy & Security',
    shareLocation: 'Location sharing',
    shareLocationOn: 'Active — nearby sellers can see you',
    shareLocationOff: 'Disabled',
    publicProfile: 'Public profile',
    publicProfileOn: 'Visible to everyone',
    publicProfileOff: 'Visible only to your contacts',
    twoFA: '2-Factor Authentication',
    twoFASub: 'Secure your account',
    deleteAccount: 'Delete my account',
    deleteAccountSub: 'This action is irreversible',
    appearanceLanguage: 'Appearance & Language',
    language: 'App language',
    theme: 'Theme',
    themeLight: 'Light mode',
    themeDark: 'Dark mode',
    helpSupport: 'Help & Support',
    faq: 'Help Center & FAQ',
    faqSub: 'Frequently asked questions',
    whatsapp: 'WhatsApp Support',
    whatsappSub: 'Response within 1 hour',
    rateApp: 'Rate the app',
    rateAppSub: 'Help us improve',
    reportProblem: 'Report a problem',
    reportProblemSub: 'Bug or suspicious behavior',
    legalInfo: 'Legal information',
    cgu: 'Terms and conditions',
    privacy: 'Privacy policy',
    about: 'About MANG',
    aboutSub: 'Version 1.0.0 · © 2026 MANG',
    logout: 'Log out',
    logoutConfirm: 'Tap again to confirm',
    save: 'Save',
    cancel: 'Cancel',
    update: 'Update',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    deleteType: 'Type "delete" to confirm',
    deleteBtn: 'Permanently delete',
    twoFANotAvailable: 'Enable 2FA to protect your account',
  },
  fon: {
    settings: 'Ɖòwùnù',
    myAccount: 'Nɔ̌ compte',
    editProfile: 'Sɛ́n profil',
    editProfileSub: 'Nyĭ, fɔtɔ, bío, fínɛ́',
    email: 'E-mail ɖé',
    phone: 'Awɔ fón',
    phoneEmpty: 'É ɖó ǎ',
    security: 'Sísí & Nǔ ɖé',
    securitySub: 'Sín nǔ ɖé towe',
    notifications: 'Nùɖiɖo',
    notifPush: 'Nùɖiɖo push',
    notifPushSub: 'Mɔ nùɖiɖo lɛ',
    notifOrders: 'Commandes yɔyɔ̌',
    notifOrdersSub: 'Nùɖiɖo vendre towe',
    notifMessages: 'Nǔ gbɛwɛ',
    notifMessagesSub: 'Mɛ ɖɔ nǔ nú we',
    notifPromos: 'Nùjɔnǔ lɛ',
    notifPromosSub: 'MANG newsletter',
    privacySecurity: 'Xwiyixwi & Sísí',
    shareLocation: 'Fínɛ́ ɖèjí',
    shareLocationOn: 'Actu — vendeur lɛ mɔ we',
    shareLocationOff: 'Desactivé',
    publicProfile: 'Profil nyikpé',
    publicProfileOn: 'Mɛ bǐ mɔ',
    publicProfileOff: 'Contact towe kɛ́ɛ mɔ',
    twoFA: 'Sísí 2 facteurs',
    twoFASub: 'Compte towe sísí',
    deleteAccount: 'Zán compte towe',
    deleteAccountSub: 'Nǔ e na nyí gán',
    appearanceLanguage: 'Hɛnnɛ & Gbè',
    language: 'Gbè towe',
    theme: 'Couleur',
    themeLight: 'Weziza',
    themeDark: 'Zǎnzǎn',
    helpSupport: 'Ðɔkpɔ & Sín nǔ',
    faq: 'FAQ & Ðɔkpɔ',
    faqSub: 'Nùkanbyɔ lɛ',
    whatsapp: 'WhatsApp Support',
    whatsappSub: 'Gbɛ 1h mɛ',
    rateApp: 'Note appli',
    rateAppSub: 'Sín nuzu',
    reportProblem: 'Signal nǔvɔvɔ',
    reportProblemSub: 'Bug alǒ nǔ vɔ́vɔ́',
    legalInfo: 'Nǔkanbyɔ legal',
    cgu: 'Conditions Générales',
    privacy: 'Xwiyixwi policy',
    about: 'MANG tɔn',
    aboutSub: 'Version 1.0.0 · © 2026 MANG',
    logout: 'Yì',
    logoutConfirm: 'Ɖó lɛ́ vɔ bo na jɛn',
    save: 'Ɖó',
    cancel: 'Yì',
    update: 'Sɛ́n',
    currentPassword: 'Nǔ ɖé lɛlɛ',
    newPassword: 'Nǔ ɖé yɔyɔ̌',
    confirmPassword: 'Ðɔ tɔn gbɔn',
    deleteType: 'Ɖó "supprimer" bo na jɛn',
    deleteBtn: 'Zán kpé kpé',
    twoFANotAvailable: '2FA na wá',
  },
}

// Hook global pour le thème
function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('mang-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('mang-theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('mang-theme', 'light')
    }
  }, [dark])

  return [dark, setDark]
}

// ─── Toggle Switch style iOS ──────────────────────────────────────────────────

function ToggleSwitch({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'
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

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      {title && (
        <div className="px-5 pt-4 pb-2 border-b border-gray-50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        </div>
      )}
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

// ─── Item cliquable ───────────────────────────────────────────────────────────

function Item({ icon: Icon, iconBg, iconColor, label, sub, danger, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-colors ${danger ? 'active:bg-red-50' : 'active:bg-gray-50'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={16} className={iconColor} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${danger ? 'text-red-600' : 'text-gray-800'}`}>{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

// ─── Item Toggle ──────────────────────────────────────────────────────────────

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
  const navigate  = useNavigate()
  const [dark, setDark] = useTheme()

  // Langue active
  const lang = profile?.language || 'fr'
  const t    = TRANSLATIONS[lang] || TRANSLATIONS.fr

  // Sous-feuilles
  const [securityOpen,  setSecurityOpen]  = useState(false)
  const [languageOpen,  setLanguageOpen]  = useState(false)
  const [helpOpen,      setHelpOpen]      = useState(false)
  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [emailOpen,     setEmailOpen]     = useState(false)
  const [phoneOpen,     setPhoneOpen]     = useState(false)
  const [twoFAOpen,     setTwoFAOpen]     = useState(false)

  // Toggles notifs
  const [notifPush,     setNotifPush]     = useState(true)
  const [notifOrders,   setNotifOrders]   = useState(true)
  const [notifMessages, setNotifMessages] = useState(true)
  const [notifPromos,   setNotifPromos]   = useState(false)
  const [savingNotif,   setSavingNotif]   = useState(false)

  // Toggles privacy
  const [shareLocation, setShareLocation] = useState(true)
  const [publicProfile, setPublicProfile] = useState(true)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  // Déconnexion
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  // Charger préférences
  useEffect(() => {
    if (!profile) return
    setNotifPush(profile.notif_push !== false)
    setNotifOrders(profile.notif_orders !== false)
    setNotifMessages(profile.notif_messages !== false)
    setNotifPromos(profile.notif_promos === true)
    setShareLocation(profile.location_sharing !== false)
    setPublicProfile(profile.is_public !== false)
  }, [profile])

  const saveNotif = async (field, val) => {
    setSavingNotif(true)
    await supabase.from('profiles').update({ [field]: val }).eq('id', user.id)
    await refreshProfile()
    setSavingNotif(false)
  }

  const savePrivacy = async (field, val) => {
    setSavingPrivacy(true)
    await supabase.from('profiles').update({ [field]: val }).eq('id', user.id)
    await refreshProfile()
    setSavingPrivacy(false)
  }

  const handleSignOut = async () => {
    if (!logoutConfirm) {
      setLogoutConfirm(true)
      setTimeout(() => setLogoutConfirm(false), 3000)
      return
    }
    await signOut()
    navigate('/connexion', { replace: true })
  }

  const maskedEmail = user?.email
    ? user.email.replace(/^(.{2})(.+)(@.+)$/, (_, a, b, c) => a + '•'.repeat(Math.min(b.length, 6)) + c)
    : '—'
  const maskedPhone = profile?.phone
    ? profile.phone.slice(0, 4) + ' •••• ' + profile.phone.slice(-2)
    : null

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <h1 className="font-black text-gray-900 text-[17px] tracking-tight">{t.settings}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* ══ 1. MON COMPTE ══ */}
        <Section title={t.myAccount}>
          <Item icon={User} iconBg="bg-green-50" iconColor="text-green-600"
            label={t.editProfile} sub={t.editProfileSub}
            onClick={() => navigate('/profil')} />
          <Item icon={Mail} iconBg="bg-blue-50" iconColor="text-blue-600"
            label={t.email} sub={maskedEmail}
            onClick={() => setEmailOpen(true)} />
          <Item icon={Phone} iconBg="bg-violet-50" iconColor="text-violet-600"
            label={t.phone} sub={maskedPhone || t.phoneEmpty}
            onClick={() => setPhoneOpen(true)} />
          <Item icon={Shield} iconBg="bg-gray-100" iconColor="text-gray-600"
            label={t.security} sub={t.securitySub}
            onClick={() => setSecurityOpen(true)} />
        </Section>

        {/* ══ 2. NOTIFICATIONS ══ */}
        <Section title={t.notifications}>
          <ItemToggle icon={Bell} iconBg="bg-orange-50" iconColor="text-orange-500"
            label={t.notifPush} sub={t.notifPushSub}
            value={notifPush} saving={savingNotif}
            onChange={v => { setNotifPush(v); saveNotif('notif_push', v) }} />
          <ItemToggle icon={Package} iconBg="bg-blue-50" iconColor="text-blue-500"
            label={t.notifOrders} sub={t.notifOrdersSub}
            value={notifOrders} saving={savingNotif}
            onChange={v => { setNotifOrders(v); saveNotif('notif_orders', v) }} />
          <ItemToggle icon={MessageSquare} iconBg="bg-violet-50" iconColor="text-violet-500"
            label={t.notifMessages} sub={t.notifMessagesSub}
            value={notifMessages} saving={savingNotif}
            onChange={v => { setNotifMessages(v); saveNotif('notif_messages', v) }} />
          <ItemToggle icon={Tag} iconBg="bg-amber-50" iconColor="text-amber-500"
            label={t.notifPromos} sub={t.notifPromosSub}
            value={notifPromos} saving={savingNotif}
            onChange={v => { setNotifPromos(v); saveNotif('notif_promos', v) }} />
        </Section>

        {/* ══ 3. CONFIDENTIALITÉ ══ */}
        <Section title={t.privacySecurity}>
          <ItemToggle icon={MapPin} iconBg="bg-emerald-50" iconColor="text-emerald-500"
            label={t.shareLocation}
            sub={shareLocation ? t.shareLocationOn : t.shareLocationOff}
            value={shareLocation} saving={savingPrivacy}
            onChange={v => { setShareLocation(v); savePrivacy('location_sharing', v) }} />
          <ItemToggle icon={Eye} iconBg="bg-sky-50" iconColor="text-sky-500"
            label={t.publicProfile}
            sub={publicProfile ? t.publicProfileOn : t.publicProfileOff}
            value={publicProfile} saving={savingPrivacy}
            onChange={v => { setPublicProfile(v); savePrivacy('is_public', v) }} />
          <Item icon={ShieldCheck} iconBg="bg-green-50" iconColor="text-green-600"
            label={t.twoFA} sub={t.twoFASub}
            onClick={() => setTwoFAOpen(true)} />
          <Item icon={Trash2} iconBg="bg-red-50" iconColor="text-red-500"
            label={t.deleteAccount} sub={t.deleteAccountSub}
            danger onClick={() => setDeleteOpen(true)} />
        </Section>

        {/* ══ 4. APPARENCE & LANGUE ══ */}
        <Section title={t.appearanceLanguage}>
          <Item icon={Globe} iconBg="bg-violet-50" iconColor="text-violet-600"
            label={t.language}
            sub={lang === 'fr' ? '🇫🇷 Français' : lang === 'en' ? '🇬🇧 English' : '🇧🇯 Fon'}
            onClick={() => setLanguageOpen(true)} />
          {/* Thème : toggle inline, pas de navigation */}
          <div className="flex items-center gap-3.5 px-5 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              {dark ? <Moon size={16} className="text-indigo-500" strokeWidth={2.2} />
                    : <Sun  size={16} className="text-amber-500" strokeWidth={2.2} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{t.theme}</p>
              <p className="text-[11px] text-gray-400">{dark ? t.themeDark : t.themeLight}</p>
            </div>
            <ToggleSwitch value={dark} onChange={setDark} />
          </div>
        </Section>

        {/* ══ 5. AIDE & SUPPORT ══ */}
        <Section title={t.helpSupport}>
          <Item icon={HelpCircle} iconBg="bg-green-50" iconColor="text-green-600"
            label={t.faq} sub={t.faqSub}
            onClick={() => setHelpOpen(true)} />
          <Item icon={MessageCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600"
            label={t.whatsapp} sub={t.whatsappSub}
            onClick={() => window.open('https://wa.me/2290197293196?text=Bonjour%20MANG%20support', '_blank')} />
          <Item icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-500"
            label={t.reportProblem} sub={t.reportProblemSub}
            onClick={() => window.open('https://wa.me/2290197293196?text=Signalement%20bug%20MANG%20:', '_blank')} />
        </Section>

        {/* ══ 6. LÉGAL ══ */}
        <Section title={t.legalInfo}>
          <Item icon={FileText} iconBg="bg-gray-100" iconColor="text-gray-500"
            label={t.cgu}
            onClick={() => window.open('https://mang.vercel.app/cgu', '_blank')} />
          <Item icon={Lock} iconBg="bg-gray-100" iconColor="text-gray-500"
            label={t.privacy}
            onClick={() => window.open('https://mang.vercel.app/confidentialite', '_blank')} />
          <Item icon={Info} iconBg="bg-gray-100" iconColor="text-gray-500"
            label={t.about} sub={t.aboutSub}
            onClick={() => toast('MANG v1.0.0 — Marché Agricole Nouvelle Génération 🌱', { duration: 4000 })} />
        </Section>

        {/* Bouton Déconnexion */}
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]"
          style={{
            background: logoutConfirm ? '#FEE2E2' : '#FFF5F5',
            border: `1.5px solid ${logoutConfirm ? '#FECACA' : '#FFE4E6'}`
          }}>
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <LogOut size={16} className="text-red-500" />
          </div>
          <span className="flex-1 text-left text-sm font-bold text-red-600">
            {logoutConfirm ? t.logoutConfirm : t.logout}
          </span>
          {logoutConfirm && <span className="text-red-400 text-xs font-bold">⚠️</span>}
        </button>

      </div>

      {/* ══ SOUS-FEUILLES ══ */}
      <EmailSheet    open={emailOpen}    onClose={() => setEmailOpen(false)}    user={user} t={t} />
      <PhoneSheet    open={phoneOpen}    onClose={() => setPhoneOpen(false)}    profile={profile} userId={user?.id} onUpdated={refreshProfile} t={t} />
      <SecuritySheet open={securityOpen} onClose={() => setSecurityOpen(false)} t={t} />
      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} profile={profile} userId={user?.id} onUpdated={refreshProfile} />
      <HelpSheet     open={helpOpen}     onClose={() => setHelpOpen(false)} />
      <TwoFASheet    open={twoFAOpen}    onClose={() => setTwoFAOpen(false)}    user={user} t={t} />
      <DeleteSheet   open={deleteOpen}   onClose={() => setDeleteOpen(false)}   t={t}
        onConfirm={async () => { await signOut(); navigate('/accueil', { replace: true }) }} />
    </div>
  )
}

// ─── EmailSheet ───────────────────────────────────────────────────────────────

function EmailSheet({ open, onClose, user, t }) {
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) { setEmail(user?.email || ''); setPass('') }
  }, [open])

  const handleSave = async () => {
    if (!email.includes('@')) { toast.error('Email invalide'); return }
    if (!pass)                { toast.error('Mot de passe requis'); return }
    setLoading(true)
    // Vérifier le mot de passe actuel
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pass })
    if (authErr) { toast.error('Mot de passe incorrect'); setLoading(false); return }
    // Mettre à jour l'email
    const { error } = await supabase.auth.updateUser({ email })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Email mis à jour — vérifiez votre boîte ✉️', { duration: 5000 })
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Modifier l'e-mail">
      <div className="px-5 pt-4 pb-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Nouvel e-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="exemple@mail.com"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 outline-none text-sm font-semibold text-gray-800 transition-colors" />
        </div>
        <div className="relative">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
            Confirmez avec votre mot de passe
          </label>
          <input value={pass} onChange={e => setPass(e.target.value)}
            type={showPw ? 'text' : 'password'} placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 outline-none text-sm font-semibold text-gray-800 transition-colors pr-12" />
          <button onClick={() => setShowPw(p => !p)}
            className="absolute right-4 top-[38px] text-gray-400">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <div className="p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-600 leading-relaxed">
            📧 Un lien de confirmation sera envoyé à votre nouvel email. L'ancien email reste actif jusqu'à confirmation.
          </p>
        </div>
        <button onClick={handleSave} disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
          style={{ background: '#008000' }}>
          {loading ? 'Mise à jour...' : t.save}
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── PhoneSheet ───────────────────────────────────────────────────────────────

function PhoneSheet({ open, onClose, profile, userId, onUpdated, t }) {
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setPhone(profile?.phone || '')
  }, [open, profile])

  const handleSave = async () => {
    const cleaned = phone.replace(/\s/g, '')
    if (cleaned && cleaned.length < 8) { toast.error('Numéro invalide'); return }
    setLoading(true)
    const { error } = await supabase.from('profiles').update({ phone: cleaned || null }).eq('id', userId)
    setLoading(false)
    if (error) { toast.error('Erreur lors de la mise à jour'); return }
    await onUpdated()
    toast.success('Numéro mis à jour ✅')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Modifier le téléphone">
      <div className="px-5 pt-4 pb-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
            Numéro de téléphone
          </label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            type="tel" placeholder="+229 01 23 45 67"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 outline-none text-sm font-semibold text-gray-800 transition-colors" />
          <p className="text-[11px] text-gray-400 mt-1.5">Format international recommandé : +229 ...</p>
        </div>
        {phone && (
          <button onClick={() => setPhone('')}
            className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
            <Trash2 size={12} /> Supprimer le numéro
          </button>
        )}
        <button onClick={handleSave} disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
          style={{ background: '#008000' }}>
          {loading ? 'Mise à jour...' : t.save}
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── SecuritySheet ────────────────────────────────────────────────────────────

function SecuritySheet({ open, onClose, t }) {
  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' })
  const [show,    setShow]    = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [isOAuth, setIsOAuth] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({ current: '', next: '', confirm: '' })
    setErrors({})
    supabase.auth.getUser().then(({ data: { user } }) => {
      const providers = user?.app_metadata?.providers || []
      setIsOAuth(providers.includes('google') && !providers.includes('email'))
    })
  }, [open])

  const validate = () => {
    const e = {}
    if (!form.current)              e.current = 'Requis'
    if (!form.next)                 e.next    = 'Requis'
    else if (form.next.length < 6)  e.next    = '6 caractères minimum'
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

  const fields = [
    { k: 'current', label: t.currentPassword, ph: '••••••••' },
    { k: 'next',    label: t.newPassword,      ph: '6 caractères minimum' },
    { k: 'confirm', label: t.confirmPassword,  ph: 'Répétez le nouveau' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title={t.security}>
      <div className="px-5 pt-4 pb-6 space-y-4">
        {isOAuth ? (
          <div className="p-4 bg-blue-50 rounded-2xl">
            <p className="font-semibold text-blue-700 text-sm mb-1">🔑 Compte Google</p>
            <p className="text-xs text-blue-600/80 leading-relaxed">
              Votre compte est connecté via Google. Gérez votre mot de passe depuis votre compte Google.
            </p>
          </div>
        ) : (
          <>
            {fields.map(({ k, label, ph }) => (
              <div key={k} className="relative">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
                <input
                  value={form[k]} placeholder={ph}
                  type={show[k] ? 'text' : 'password'}
                  onChange={e => { setForm(p => ({ ...p, [k]: e.target.value })); setErrors(p => ({ ...p, [k]: '' })) }}
                  className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-sm font-semibold text-gray-800 transition-colors pr-12 ${errors[k] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-green-400'}`}
                />
                <button onClick={() => setShow(p => ({ ...p, [k]: !p[k] }))}
                  className="absolute right-4 top-[38px] text-gray-400">
                  {show[k] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {errors[k] && <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors[k]}</p>}
              </div>
            ))}
            <button onClick={handleSave} disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
              style={{ background: '#008000' }}>
              {loading ? 'Mise à jour...' : t.update}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

// ─── LanguageSheet ────────────────────────────────────────────────────────────

function LanguageSheet({ open, onClose, profile, userId, onUpdated }) {
  const [saving, setSaving] = useState(false)
  const current = profile?.language || 'fr'
  const langs = [
    { code: 'fr',  label: 'Français', flag: '🇫🇷', sub: 'Langue par défaut' },
    { code: 'en',  label: 'English',  flag: '🇬🇧', sub: 'International' },
    { code: 'fon', label: 'Fon',      flag: '🇧🇯', sub: 'Langue béninoise' },
  ]

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
          <button key={l.code} onClick={() => select(l.code)} disabled={saving}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
              current === l.code
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-gray-50 border-2 border-transparent active:bg-gray-100'
            }`}>
            <span className="text-2xl">{l.flag}</span>
            <div className="flex-1 text-left">
              <p className={`text-sm font-bold ${current === l.code ? 'text-green-700' : 'text-gray-800'}`}>{l.label}</p>
              <p className="text-[11px] text-gray-400">{l.sub}</p>
            </div>
            {current === l.code && <Check size={16} className="text-green-500" />}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

// ─── TwoFASheet ───────────────────────────────────────────────────────────────

function TwoFASheet({ open, onClose, user, t }) {
<!-- Placeholder TwoFA Sheet -->
function TwoFASheet({ open, onClose, user, t }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={t.twoFA}>
      <div className="px-5 pt-4 pb-6 space-y-4">
        <p className="text-center text-gray-600">L'authentification à deux facteurs n'est pas encore disponible.</p>
        <button onClick={onClose} className="w-full py-3.5 rounded-2xl font-bold text-white text-sm" style={{ background: '#008000' }}>
          {t.cancel}
        </button>
      </div>
    </BottomSheet>
  );
}

// ─── HelpSheet ────────────────────────────────────────────────────────────────

function HelpSheet({ open, onClose }) {
  const faqs = [
    { q: 'Comment créer ma boutique ?',          a: 'Allez dans "Espace Vendeur" depuis la page profil, puis "Créer ma boutique". Renseignez les informations et soumettez pour vérification.' },
    { q: 'Comment passer une commande ?',         a: 'Trouvez un produit, cliquez "Commander", choisissez votre adresse et validez. Le vendeur est notifié immédiatement.' },
    { q: 'Comment retirer mon argent ?',          a: 'Dans "Mon Portefeuille", cliquez "Retirer". Retraits via MTN/Moov Money ou virement bancaire.' },
    { q: 'Mon paiement est bloqué ?',             a: 'Si un paiement reste "En attente" plus de 48h, contactez le support WhatsApp. Traitement sous 24h.' },
    { q: 'Comment signaler un vendeur ?',         a: 'Sur la page vendeur, cliquez les 3 points puis "Signaler". Notre équipe examine sous 24h.' },
    { q: 'Comment modifier mes informations ?',   a: 'Dans Paramètres → Mon Compte, vous pouvez modifier email, téléphone et mot de passe.' },
  ]
  const [expanded, setExpanded] = useState(null)

  return (
    <BottomSheet open={open} onClose={onClose} title="Centre d'aide & FAQ">
      <div className="px-5 pt-3 pb-6 space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-gray-100">
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-gray-50 active:bg-gray-100 transition-colors text-left">
              <span className="text-sm font-semibold text-gray-800 flex-1">{faq.q}</span>
              <span className={`text-green-500 font-black text-lg transition-transform duration-200 ${expanded === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            {expanded === i && (
              <div className="px-4 py-3 bg-white">
                <p className="text-[13px] text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
        <button onClick={() => window.open('https://wa.me/2290197293196?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20avec%20MANG', '_blank')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-sm mt-2"
          style={{ background: '#25D366' }}>
          <MessageCircle size={16} />
          Contacter le support WhatsApp
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── DeleteSheet ──────────────────────────────────────────────────────────────

function DeleteSheet({ open, onClose, onConfirm, t }) {
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const keyword = 'supprimer'
  const valid   = input.toLowerCase() === keyword

  useEffect(() => { if (!open) setInput('') }, [open])

  const handleDelete = async () => {
    if (!valid) { toast.error(`Tapez "${keyword}" pour confirmer`); return }
    setLoading(true)
    try {
      // Marquer le compte comme supprimé dans profiles
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', user.id)
      await onConfirm()
    } catch {
      toast.error('Erreur lors de la suppression')
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t.deleteAccount}>
      <div className="px-5 pt-4 pb-6 space-y-4">
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
          <p className="text-sm font-bold text-red-700 mb-1">⚠️ Action irréversible</p>
          <ul className="text-xs text-red-600 leading-relaxed space-y-1 list-disc list-inside">
            <li>Toutes vos données seront supprimées</li>
            <li>Vos commandes et boutiques seront fermées</li>
            <li>Votre solde MANG Wallet sera perdu</li>
          </ul>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
            {t.deleteType}
          </label>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder={keyword}
            className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-sm font-semibold transition-colors ${
              valid ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 focus:border-red-300 text-gray-800'
            }`} />
        </div>
        <button onClick={handleDelete} disabled={loading || !valid}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-40 transition-opacity"
          style={{ background: '#EF4444' }}>
          {loading ? 'Suppression...' : t.deleteBtn}
        </button>
      </div>
    </BottomSheet>
  )
}
