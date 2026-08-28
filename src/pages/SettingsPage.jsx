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
import i18n from '../i18n'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { BottomSheet } from '@/components/ui'

// â”€â”€â”€ Traductions i18n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TRANSLATIONS = {
  fr: {
    settings: 'ParamÃ¨tres',
    myAccount: 'Mon Compte',
    editProfile: 'Modifier le profil',
    editProfileSub: 'Nom, photo, bio, localisation',
    email: 'Adresse e-mail',
    phone: 'NumÃ©ro de tÃ©lÃ©phone',
    phoneEmpty: 'Non renseignÃ©',
    security: 'SÃ©curitÃ© & Mot de passe',
    securitySub: 'Modifiez votre mot de passe',
    notifications: 'Notifications',
    notifPush: 'Notifications push',
    notifPushSub: "Recevoir des alertes sur l'appli",
    notifOrders: 'Nouvelles commandes',
    notifOrdersSub: 'Alertes pour vos ventes',
    notifMessages: 'Messages',
    notifMessagesSub: 'Quand quelqu\'un vous Ã©crit',
    notifPromos: 'Promotions & offres',
    notifPromosSub: 'Newsletter et actualitÃ©s MANG',
    privacySecurity: 'ConfidentialitÃ© & SÃ©curitÃ©',
    shareLocation: 'Partage de localisation',
    shareLocationOn: 'Actif â€” les vendeurs proches vous voient',
    shareLocationOff: 'DÃ©sactivÃ©',
    publicProfile: 'Profil public',
    publicProfileOn: 'Visible par tous',
    publicProfileOff: 'Visible uniquement par vos contacts',
    twoFA: 'Authentification 2 facteurs',
    twoFASub: 'ProtÃ©gez votre compte',
    deleteAccount: 'Supprimer mon compte',
    deleteAccountSub: 'Action irrÃ©versible',
    appearanceLanguage: 'Apparence & Langue',
    language: 'Langue de l\'application',
    theme: 'ThÃ¨me',
    themeLight: 'Mode clair',
    themeDark: 'Mode sombre',
    helpSupport: 'Aide & Support',
    faq: 'Centre d\'aide & FAQ',
    faqSub: 'Questions frÃ©quentes',
    whatsapp: 'WhatsApp Support',
    whatsappSub: 'RÃ©ponse en moins d\'1h',
    rateApp: 'Noter l\'application',
    rateAppSub: 'Aidez-nous Ã  nous amÃ©liorer',
    reportProblem: 'Signaler un problÃ¨me',
    reportProblemSub: 'Bug ou comportement suspect',
    legalInfo: 'Informations lÃ©gales',
    cgu: 'Conditions gÃ©nÃ©rales d\'utilisation',
    privacy: 'Politique de confidentialitÃ©',
    about: 'Ã€ propos de MANG',
    aboutSub: 'Version 1.0.0 Â· Â© 2026 MANG',
    logout: 'Se dÃ©connecter',
    logoutConfirm: 'Appuyez Ã  nouveau pour confirmer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    update: 'Mettre Ã  jour',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau',
    deleteType: 'Tapez "supprimer" pour confirmer',
    deleteBtn: 'Supprimer dÃ©finitivement',
    twoFANotAvailable: 'Activez 2FA pour sÃ©curiser votre compte',
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
    shareLocationOn: 'Active â€” nearby sellers can see you',
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
    aboutSub: 'Version 1.0.0 Â· Â© 2026 MANG',
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
    settings: 'Æ‰Ã²wÃ¹nÃ¹',
    myAccount: 'NÉ”ÌŒ compte',
    editProfile: 'SÉ›Ìn profil',
    editProfileSub: 'NyÄ­, fÉ”tÉ”, bÃ­o, fÃ­nÉ›Ì',
    email: 'E-mail É–Ã©',
    phone: 'AwÉ” fÃ³n',
    phoneEmpty: 'Ã‰ É–Ã³ ÇŽ',
    security: 'SÃ­sÃ­ & NÇ” É–Ã©',
    securitySub: 'SÃ­n nÇ” É–Ã© towe',
    notifications: 'NÃ¹É–iÉ–o',
    notifPush: 'NÃ¹É–iÉ–o push',
    notifPushSub: 'MÉ” nÃ¹É–iÉ–o lÉ›',
    notifOrders: 'Commandes yÉ”yÉ”ÌŒ',
    notifOrdersSub: 'NÃ¹É–iÉ–o vendre towe',
    notifMessages: 'NÇ” gbÉ›wÉ›',
    notifMessagesSub: 'MÉ› É–É” nÇ” nÃº we',
    notifPromos: 'NÃ¹jÉ”nÇ” lÉ›',
    notifPromosSub: 'MANG newsletter',
    privacySecurity: 'Xwiyixwi & SÃ­sÃ­',
    shareLocation: 'FÃ­nÉ›Ì É–Ã¨jÃ­',
    shareLocationOn: 'Actu â€” vendeur lÉ› mÉ” we',
    shareLocationOff: 'DesactivÃ©',
    publicProfile: 'Profil nyikpÃ©',
    publicProfileOn: 'MÉ› bÇ mÉ”',
    publicProfileOff: 'Contact towe kÉ›ÌÉ› mÉ”',
    twoFA: 'SÃ­sÃ­ 2 facteurs',
    twoFASub: 'Compte towe sÃ­sÃ­',
    deleteAccount: 'ZÃ¡n compte towe',
    deleteAccountSub: 'NÇ” e na nyÃ­ gÃ¡n',
    appearanceLanguage: 'HÉ›nnÉ› & GbÃ¨',
    language: 'GbÃ¨ towe',
    theme: 'Couleur',
    themeLight: 'Weziza',
    themeDark: 'ZÇŽnzÇŽn',
    helpSupport: 'ÃÉ”kpÉ” & SÃ­n nÇ”',
    faq: 'FAQ & ÃÉ”kpÉ”',
    faqSub: 'NÃ¹kanbyÉ” lÉ›',
    whatsapp: 'WhatsApp Support',
    whatsappSub: 'GbÉ› 1h mÉ›',
    rateApp: 'Note appli',
    rateAppSub: 'SÃ­n nuzu',
    reportProblem: 'Signal nÇ”vÉ”vÉ”',
    reportProblemSub: 'Bug alÇ’ nÇ” vÉ”ÌvÉ”Ì',
    legalInfo: 'NÇ”kanbyÉ” legal',
    cgu: 'Conditions GÃ©nÃ©rales',
    privacy: 'Xwiyixwi policy',
    about: 'MANG tÉ”n',
    aboutSub: 'Version 1.0.0 Â· Â© 2026 MANG',
    logout: 'YÃ¬',
    logoutConfirm: 'Æ‰Ã³ lÉ›Ì vÉ” bo na jÉ›n',
    save: 'Æ‰Ã³',
    cancel: 'YÃ¬',
    update: 'SÉ›Ìn',
    currentPassword: 'NÇ” É–Ã© lÉ›lÉ›',
    newPassword: 'NÇ” É–Ã© yÉ”yÉ”ÌŒ',
    confirmPassword: 'ÃÉ” tÉ”n gbÉ”n',
    deleteType: 'Æ‰Ã³ "supprimer" bo na jÉ›n',
    deleteBtn: 'ZÃ¡n kpÃ© kpÃ©',
    twoFANotAvailable: '2FA na wÃ¡',
  },
}

// Hook global pour le thÃ¨me
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

// â”€â”€â”€ Toggle Switch style iOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Item cliquable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Item Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Page principale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // DÃ©connexion
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  // Charger prÃ©fÃ©rences
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
    ? user.email.replace(/^(.{2})(.+)(@.+)$/, (_, a, b, c) => a + 'â€¢'.repeat(Math.min(b.length, 6)) + c)
    : 'â€”'
  const maskedPhone = profile?.phone
    ? profile.phone.slice(0, 4) + ' â€¢â€¢â€¢â€¢ ' + profile.phone.slice(-2)
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

        {/* â•â• 1. MON COMPTE â•â• */}
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

        {/* â•â• 2. NOTIFICATIONS â•â• */}
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

        {/* â•â• 3. CONFIDENTIALITÃ‰ â•â• */}
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

        {/* â•â• 4. APPARENCE & LANGUE â•â• */}
        <Section title={t.appearanceLanguage}>
          <Item icon={Globe} iconBg="bg-violet-50" iconColor="text-violet-600"
            label={t.language}
            sub={lang === 'fr' ? 'ðŸ‡«ðŸ‡· FranÃ§ais' : lang === 'en' ? 'ðŸ‡¬ðŸ‡§ English' : 'ðŸ‡§ðŸ‡¯ Fon'}
            onClick={() => setLanguageOpen(true)} />
          {/* ThÃ¨me : toggle inline, pas de navigation */}
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

        {/* â•â• 5. AIDE & SUPPORT â•â• */}
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

        {/* â•â• 6. LÃ‰GAL â•â• */}
        <Section title={t.legalInfo}>
          <Item icon={FileText} iconBg="bg-gray-100" iconColor="text-gray-500"
            label={t.cgu}
            onClick={() => window.open('https://mang.vercel.app/cgu', '_blank')} />
          <Item icon={Lock} iconBg="bg-gray-100" iconColor="text-gray-500"
            label={t.privacy}
            onClick={() => window.open('https://mang.vercel.app/confidentialite', '_blank')} />
          <Item icon={Info} iconBg="bg-gray-100" iconColor="text-gray-500"
            label={t.about} sub={t.aboutSub}
            onClick={() => toast('MANG v1.0.0 â€” MarchÃ© Agricole Nouvelle GÃ©nÃ©ration ðŸŒ±', { duration: 4000 })} />
        </Section>

        {/* Bouton DÃ©connexion */}
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
          {logoutConfirm && <span className="text-red-400 text-xs font-bold">âš ï¸</span>}
        </button>

      </div>

      {/* â•â• SOUS-FEUILLES â•â• */}
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

// â”€â”€â”€ EmailSheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    // VÃ©rifier le mot de passe actuel
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pass })
    if (authErr) { toast.error('Mot de passe incorrect'); setLoading(false); return }
    // Mettre Ã  jour l'email
    const { error } = await supabase.auth.updateUser({ email })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Email mis Ã  jour â€” vÃ©rifiez votre boÃ®te âœ‰ï¸', { duration: 5000 })
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
            type={showPw ? 'text' : 'password'} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 outline-none text-sm font-semibold text-gray-800 transition-colors pr-12" />
          <button onClick={() => setShowPw(p => !p)}
            className="absolute right-4 top-[38px] text-gray-400">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <div className="p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-600 leading-relaxed">
            ðŸ“§ Un lien de confirmation sera envoyÃ© Ã  votre nouvel email. L'ancien email reste actif jusqu'Ã  confirmation.
          </p>
        </div>
        <button onClick={handleSave} disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
          style={{ background: '#008000' }}>
          {loading ? 'Mise Ã  jour...' : t.save}
        </button>
      </div>
    </BottomSheet>
  )
}

// â”€â”€â”€ PhoneSheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PhoneSheet({ open, onClose, profile, userId, onUpdated, t }) {
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setPhone(profile?.phone || '')
  }, [open, profile])

  const handleSave = async () => {
    const cleaned = phone.replace(/\s/g, '')
    if (cleaned && cleaned.length < 8) { toast.error('NumÃ©ro invalide'); return }
    setLoading(true)
    const { error } = await supabase.from('profiles').update({ phone: cleaned || null }).eq('id', userId)
    setLoading(false)
    if (error) { toast.error('Erreur lors de la mise Ã  jour'); return }
    await onUpdated()
    toast.success('NumÃ©ro mis Ã  jour âœ…')
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Modifier le tÃ©lÃ©phone">
      <div className="px-5 pt-4 pb-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
            NumÃ©ro de tÃ©lÃ©phone
          </label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            type="tel" placeholder="+229 01 23 45 67"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-400 outline-none text-sm font-semibold text-gray-800 transition-colors" />
          <p className="text-[11px] text-gray-400 mt-1.5">Format international recommandÃ© : +229 ...</p>
        </div>
        {phone && (
          <button onClick={() => setPhone('')}
            className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
            <Trash2 size={12} /> Supprimer le numÃ©ro
          </button>
        )}
        <button onClick={handleSave} disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60"
          style={{ background: '#008000' }}>
          {loading ? 'Mise Ã  jour...' : t.save}
        </button>
      </div>
    </BottomSheet>
  )
}

// â”€â”€â”€ SecuritySheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    else if (form.next.length < 6)  e.next    = '6 caractÃ¨res minimum'
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
    if (error) { toast.error('Erreur lors de la mise Ã  jour'); return }
    toast.success('Mot de passe mis Ã  jour âœ…')
    onClose()
  }

  const fields = [
    { k: 'current', label: t.currentPassword, ph: 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' },
    { k: 'next',    label: t.newPassword,      ph: '6 caractÃ¨res minimum' },
    { k: 'confirm', label: t.confirmPassword,  ph: 'RÃ©pÃ©tez le nouveau' },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title={t.security}>
      <div className="px-5 pt-4 pb-6 space-y-4">
        {isOAuth ? (
          <div className="p-4 bg-blue-50 rounded-2xl">
            <p className="font-semibold text-blue-700 text-sm mb-1">ðŸ”‘ Compte Google</p>
            <p className="text-xs text-blue-600/80 leading-relaxed">
              Votre compte est connectÃ© via Google. GÃ©rez votre mot de passe depuis votre compte Google.
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
              {loading ? 'Mise Ã  jour...' : t.update}
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

// â”€â”€â”€ LanguageSheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LanguageSheet({ open, onClose, profile, userId, onUpdated }) {
  const [saving, setSaving] = useState(false)
  const current = profile?.language || 'fr'
  const langs = [
    { code: 'fr',  label: 'FranÃ§ais', flag: 'ðŸ‡«ðŸ‡·', sub: 'Langue par dÃ©faut' },
    { code: 'en',  label: 'English',  flag: 'ðŸ‡¬ðŸ‡§', sub: 'International' },
    { code: 'fon', label: 'Fon',      flag: 'ðŸ‡§ðŸ‡¯', sub: 'Langue bÃ©ninoise' },
  ]

  const select = async (code) => {
    if (code === current) { onClose(); return }
    setSaving(true)
    await supabase.from('profiles').update({ language: code }).eq('id', userId)
    await onUpdated()
      i18n.changeLanguage(code)
      setSaving(false)
    onClose()
    toast.success('Langue mise Ã  jour âœ…')
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

// â”€â”€â”€ TwoFASheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


function TwoFASheet({ open, onClose, user, t }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={t.twoFA}>
      <div className="px-5 pt-4 pb-6 space-y-4">
        <p className="text-center text-gray-600">L'authentification Ã  deux facteurs n'est pas encore disponible.</p>
        <button onClick={onClose} className="w-full py-3.5 rounded-2xl font-bold text-white text-sm" style={{ background: '#008000' }}>
          {t.cancel}
        </button>
      </div>
    </BottomSheet>
  );
}

// â”€â”€â”€ HelpSheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HelpSheet({ open, onClose }) {
  const faqs = [
    { q: 'Comment crÃ©er ma boutique ?',          a: 'Allez dans "Espace Vendeur" depuis la page profil, puis "CrÃ©er ma boutique". Renseignez les informations et soumettez pour vÃ©rification.' },
    { q: 'Comment passer une commande ?',         a: 'Trouvez un produit, cliquez "Commander", choisissez votre adresse et validez. Le vendeur est notifiÃ© immÃ©diatement.' },
    { q: 'Comment retirer mon argent ?',          a: 'Dans "Mon Portefeuille", cliquez "Retirer". Retraits via MTN/Moov Money ou virement bancaire.' },
    { q: 'Mon paiement est bloquÃ© ?',             a: 'Si un paiement reste "En attente" plus de 48h, contactez le support WhatsApp. Traitement sous 24h.' },
    { q: 'Comment signaler un vendeur ?',         a: 'Sur la page vendeur, cliquez les 3 points puis "Signaler". Notre Ã©quipe examine sous 24h.' },
    { q: 'Comment modifier mes informations ?',   a: 'Dans ParamÃ¨tres â†’ Mon Compte, vous pouvez modifier email, tÃ©lÃ©phone et mot de passe.' },
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

// â”€â”€â”€ DeleteSheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      // Marquer le compte comme supprimÃ© dans profiles
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
          <p className="text-sm font-bold text-red-700 mb-1">âš ï¸ Action irrÃ©versible</p>
          <ul className="text-xs text-red-600 leading-relaxed space-y-1 list-disc list-inside">
            <li>Toutes vos donnÃ©es seront supprimÃ©es</li>
            <li>Vos commandes et boutiques seront fermÃ©es</li>
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

