import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertCircle, Gift, Sparkles, Tag } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M47.532 24.552c0-1.636-.132-3.272-.396-4.908H24.48v9.288h13.02c-.552 2.988-2.256 5.58-4.776 7.284v5.976h7.704c4.512-4.152 7.104-10.284 7.104-17.64z" fill="#4285F4"/>
      <path d="M24.48 48c6.48 0 11.952-2.136 15.936-5.808l-7.704-5.976c-2.148 1.452-4.908 2.304-8.232 2.304-6.312 0-11.664-4.26-13.584-10.008H3.012v6.168C6.972 42.828 15.228 48 24.48 48z" fill="#34A853"/>
      <path d="M10.896 28.512A14.4 14.4 0 0 1 10.08 24c0-1.572.276-3.096.816-4.512V13.32H3.012A23.988 23.988 0 0 0 .48 24c0 3.876.924 7.548 2.532 10.68l7.884-6.168z" fill="#FBBC04"/>
      <path d="M24.48 9.504c3.564 0 6.756 1.224 9.276 3.624l6.888-6.888C36.42 2.376 30.96 0 24.48 0 15.228 0 6.972 5.172 3.012 13.32l7.884 6.168c1.92-5.748 7.272-10.008 13.584-10.008z" fill="#EA4335"/>
    </svg>
  )
}

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score: 1, label: 'Très faible', color: 'bg-red-500' }
  if (score === 2) return { score: 2, label: 'Faible', color: 'bg-orange-400' }
  if (score === 3) return { score: 3, label: 'Moyen', color: 'bg-yellow-400' }
  if (score === 4) return { score: 4, label: 'Fort', color: 'bg-green-400' }
  return { score: 5, label: 'Très fort', color: 'bg-emerald-400' }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const urlRef = (searchParams.get('ref') || '').trim().toUpperCase()
  const [referralCode, setReferralCode] = useState(() => {
    return urlRef || (typeof window !== 'undefined' ? localStorage.getItem('mang_pending_referral') || '' : '')
  })

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null)
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const usernameDebounce = useRef(null)
  const strength = getPasswordStrength(form.password)

  // Mémoriser le parrainage dès l'arrivée via lien de parrainage
  useEffect(() => {
    if (urlRef) {
      localStorage.setItem('mang_pending_referral', urlRef)
      setReferralCode(urlRef)
    }
  }, [urlRef])

  // Cooldown du bouton de renvoi d'email
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const checkUsername = (value) => {
    clearTimeout(usernameDebounce.current)
    const clean = value.trim()
    if (!clean) { setUsernameStatus(null); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    usernameDebounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id').eq('username', clean.toLowerCase()).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 450)
  }

  // Google OAuth
  const handleGoogle = async () => {
    const refToSave = referralCode.trim() || urlRef
    if (refToSave) {
      localStorage.setItem('mang_pending_referral', refToSave.toUpperCase())
    }
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/marketplace` }
    })
    if (error) {
      toast.error('Connexion Google impossible')
      setGoogleLoading(false)
    }
  }

  // Inscription classique Email / Password
  const handleRegister = async (e) => {
    e.preventDefault()

    const cleanUsername = form.username.trim().toLowerCase()
    const cleanEmail = form.email.trim().toLowerCase()
    const cleanRef = referralCode.trim().toUpperCase()

    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      toast.error('Le nom d’utilisateur doit comporter entre 3 et 20 caractères')
      return
    }
    if (usernameStatus === 'taken') {
      toast.error("Ce nom d'utilisateur est déjà pris")
      return
    }
    if (usernameStatus === 'invalid') {
      toast.error('Nom invalide (3 à 20 caractères, lettres, chiffres ou _ sans espace)')
      return
    }
    if (form.password.length < 6) {
      toast.error('Mot de passe trop court (6 caractères minimum)')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (cleanRef) {
      localStorage.setItem('mang_pending_referral', cleanRef)
    }

    setLoading(true)

    // 1. Inscription dans Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: form.password,
      options: {
        data: {
          username: cleanUsername,
          referral_code_used: cleanRef || null
        }
      }
    })

    if (error) {
      setLoading(false)
      toast.error(
        error.message === 'User already registered'
          ? 'Cette adresse email est déjà utilisée'
          : error.message || "Erreur lors de l'inscription"
      )
      return
    }

    const userId = data?.user?.id
    const session = data?.session

    // 2. Création initiale côté client (profil, portefeuille, et 20 PIÈCES OFFERTES)
    if (userId) {
      const w_number = Math.floor(1000000000 + Math.random() * 9000000000).toString()
      const r_code = 'MNG' + userId.replace(/-/g, '').substring(0, 5).toUpperCase()

      try {
        // Profil
        await supabase.from('profiles').insert({
          id: userId,
          username: cleanUsername,
          email: cleanEmail,
          referral_code: r_code,
          referral_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // Portefeuille avec les colonnes valides
        await supabase.from('wallets').insert({
          user_id: userId,
          wallet_number: w_number,
          balance_total: 0,
          balance_available: 0,
          balance_reserved: 0,
          pin_set: false
        })

        // 20 PIÈCES GRATUITES DE BIENVENUE
        await supabase.from('pieces').insert({
          user_id: userId,
          balance: 20
        })

        // Si parrainage et session immédiatement active, traiter le parrainage
        if (cleanRef && session) {
          try {
            await supabase.rpc('process_referral', {
              p_referred_id: userId,
              p_referral_code: cleanRef,
            })
            localStorage.removeItem('mang_pending_referral')
          } catch (refErr) {
            console.warn('[Register] process_referral avertissement:', refErr)
          }
        }
      } catch (err) {
        console.warn('[Register] Initialisation utilisateur:', err)
      }
    }

    // 3. Cas validation par email requise
    if (!session) {
      setLoading(false)
      setRegisteredEmail(cleanEmail)
      setEmailVerificationSent(true)
      toast.success('Compte créé ! Veuillez valider votre e-mail pour activer vos 20 pièces offertes.', { duration: 6500 })
      return
    }

    setLoading(false)
    useAuthStore.getState().setGuestMode(false)
    toast.success('🎉 Bienvenue sur MANG ! Vous recevez 20 pièces gratuites de bienvenue !', { duration: 6000 })
    navigate('/marketplace')
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return
    setLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: registeredEmail
    })
    setLoading(false)
    if (error) {
      toast.error(error.message || 'Erreur lors du renvoi')
    } else {
      toast.success('E-mail de confirmation renvoyé !')
      setResendCooldown(60)
    }
  }

  const UsernameIcon = () => {
    if (usernameStatus === 'checking') return <Loader2 size={15} className="animate-spin text-white/40"/>
    if (usernameStatus === 'available') return <CheckCircle2 size={15} className="text-emerald-400"/>
    if (usernameStatus === 'taken') return <XCircle size={15} className="text-red-400"/>
    if (usernameStatus === 'invalid') return <AlertCircle size={15} className="text-orange-400"/>
    return null
  }

  const usernameHint = {
    available: { text: 'Disponible', cls: 'text-emerald-400' },
    taken: { text: 'Déjà pris', cls: 'text-red-400' },
    invalid: { text: '3-20 caractères, lettres, chiffres ou _ uniquement', cls: 'text-orange-400' },
    checking: { text: 'Vérification en cours...', cls: 'text-white/40' },
  }[usernameStatus]

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword
  const passwordsMismatch = form.password && form.confirmPassword && form.password !== form.confirmPassword

  const canSubmit = !loading && !googleLoading
    && usernameStatus !== 'taken'
    && usernameStatus !== 'invalid'
    && usernameStatus !== 'checking'

  if (emailVerificationSent) {
    return (
      <div className="animate-fade-in text-center py-4">
        <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-5 text-3xl">
          ✉️
        </div>
        <h2 className="font-display text-2xl text-white font-bold mb-2">Vérifiez votre e-mail</h2>
        <p className="text-primary-200 text-sm mb-6 leading-relaxed">
          Nous avons envoyé un lien de confirmation à <br/>
          <strong className="text-gold-300 font-semibold">{registeredEmail}</strong>.<br/>
          Veuillez cliquer sur ce lien pour activer votre compte MANG et débloquer vos <strong className="text-emerald-300">20 pièces offertes</strong>.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || loading}
            className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-white/10 disabled:text-white/40 disabled:border-white/10 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm shadow-gold"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {resendCooldown > 0 ? `Renvoyer dans (${resendCooldown}s)` : "Renvoyer l'e-mail"}
          </button>

          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm"
          >
            Accéder à ma messagerie
          </a>

          <Link
            to="/connexion"
            className="block text-gold-300 font-bold hover:text-gold-200 text-sm pt-4"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl text-white font-bold mb-1">Rejoignez MANG</h2>
      <p className="text-primary-300 text-sm mb-4">Créez votre compte et commencez à vendre ou acheter</p>

      {/* BANNIÈRE CADEAU DE BIENVENUE : 20 PIÈCES OFFERTES */}
      <div className="bg-gradient-to-r from-emerald-500/20 via-primary-500/30 to-gold-500/20 border border-gold-400/30 rounded-2xl p-3 mb-5 flex items-center gap-2.5 shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-300 shrink-0">
          <Sparkles size={18} />
        </div>
        <p className="text-xs text-white/90 leading-tight">
          <strong className="text-gold-300 font-bold">+20 pièces MANG</strong> offertes gratuitement à l'inscription pour booster vos premières annonces !
        </p>
      </div>

      {/* Bouton Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 mb-5"
        style={{ background: 'rgba(255,255,255,0.95)', color: '#1a1a1a' }}
      >
        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-500"/> : <GoogleIcon />}
        <span>{googleLoading ? 'Redirection...' : 'Continuer avec Google'}</span>
      </button>

      {/* Séparateur */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/15"/>
        <span className="text-white/35 text-xs font-semibold tracking-wider uppercase">ou</span>
        <div className="flex-1 h-px bg-white/15"/>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">

        {/* Code de parrainage (Saisie manuelle ou pré-rempli) */}
        <div>
          <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Gift size={14} className="text-gold-400"/> Code parrain
            </span>
            <span className="text-[11px] text-white/40 font-normal">Optionnel</span>
          </label>
          <div className="relative">
            <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"/>
            <input
              type="text"
              name="referralCode"
              placeholder="Ex: MNG12345"
              value={referralCode}
              onChange={e => {
                const clean = e.target.value.replace(/\s+/g, '').toUpperCase()
                setReferralCode(clean)
                if (clean) localStorage.setItem('mang_pending_referral', clean)
                else localStorage.removeItem('mang_pending_referral')
              }}
              autoComplete="off"
              className={clsx(
                'w-full pl-10 pr-24 py-3.5 bg-white/10 border rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-mono tracking-wider transition-colors',
                referralCode ? 'border-gold-400/60 bg-gold-500/10' : 'border-white/20'
              )}
            />
            {referralCode ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-gold-500/30 text-gold-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gold-400/40 flex items-center gap-1">
                <CheckCircle2 size={11} className="text-gold-300"/> +10 pièces
              </span>
            ) : null}
          </div>
          {referralCode ? (
            <p className="text-[11px] mt-1 pl-1 text-gold-300 font-medium">
              Code appliqué ! Vous recevrez 10 pièces bonus offertes en plus des 20 pièces de bienvenue.
            </p>
          ) : (
            <p className="text-[11px] mt-1 pl-1 text-white/40">
              Entrez le code de votre parrain pour débloquer +10 pièces supplémentaires.
            </p>
          )}
        </div>

        {/* Username */}
        <div>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"/>
            <input
              type="text"
              name="username"
              placeholder="Nom d'utilisateur unique"
              value={form.username}
              onChange={e => {
                const val = e.target.value.replace(/\s+/g, '')
                setForm({ ...form, username: val })
                checkUsername(val)
              }}
              required
              autoComplete="username"
              className={clsx(
                'w-full pl-10 pr-10 py-3.5 bg-white/10 border rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium transition-colors',
                usernameStatus === 'available' ? 'border-emerald-400/50' :
                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400/50' :
                'border-white/20'
              )}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2"><UsernameIcon/></div>
          </div>
          {usernameHint && <p className={clsx('text-xs mt-1.5 pl-1 font-medium', usernameHint.cls)}>{usernameHint.text}</p>}
        </div>

        {/* Email */}
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"/>
          <input
            type="email"
            name="email"
            placeholder="Adresse email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium"
          />
        </div>

        {/* Mot de passe */}
        <div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"/>
            <input
              type={showPass ? 'text' : 'password'}
              name="password"
              placeholder="Mot de passe (6 caractères min)"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required minLength={6}
              autoComplete="new-password"
              className="w-full pl-10 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {form.password.length > 0 && (
            <div className="mt-2 px-1">
              <div className="flex gap-1 mb-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={clsx(
                    'flex-1 h-1 rounded-full transition-all duration-300',
                    i <= strength.score ? strength.color : 'bg-white/15'
                  )}/>
                ))}
              </div>
              <p className={clsx('text-xs font-semibold', {
                'text-red-400': strength.score <= 1,
                'text-orange-400': strength.score === 2,
                'text-yellow-400': strength.score === 3,
                'text-green-400': strength.score === 4,
                'text-emerald-400': strength.score === 5,
              })}>{strength.label}</p>
            </div>
          )}
        </div>

        {/* Confirmation du mot de passe */}
        <div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"/>
            <input
              type={showConfirmPass ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirmer le mot de passe"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              required minLength={6}
              autoComplete="new-password"
              className={clsx(
                'w-full pl-10 pr-12 py-3.5 bg-white/10 border rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium',
                passwordsMatch ? 'border-emerald-400/50' :
                passwordsMismatch ? 'border-red-400/50' :
                'border-white/20'
              )}
            />
            <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showConfirmPass ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {passwordsMismatch && (
            <p className="text-xs text-red-400 font-medium mt-1 pl-1">
              Les mots de passe ne correspondent pas
            </p>
          )}
          {passwordsMatch && (
            <p className="text-xs text-emerald-400 font-medium mt-1 pl-1">
              Les mots de passe correspondent
            </p>
          )}
        </div>

        {/* Mention légale CGU */}
        <p className="text-[11px] text-white/50 text-center leading-tight pt-1">
          En créant un compte, vous acceptez les <span className="text-gold-300">Conditions Générales d'Utilisation</span> de MANG.
        </p>

        {/* Bouton de soumission */}
        <button
          type="submit"
          disabled={!canSubmit || passwordsMismatch}
          className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-60 shadow-gold mt-2 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin"/>}
          {loading ? 'Création du compte...' : 'Créer mon compte (20 pièces offertes)'}
        </button>

        {/* Bouton Mode Invité */}
        <button
          type="button"
          onClick={() => {
            useAuthStore.getState().setGuestMode(true)
            toast.success("Mode invité activé — Bienvenue sur le marché MANG !")
            navigate('/marketplace')
          }}
          className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/15 transition-all duration-200 active:scale-95 flex items-center justify-center mt-2"
        >
          Entrer en tant qu'invité
        </button>
      </form>

      <p className="text-center text-white/50 text-sm mt-6">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="text-gold-300 font-bold hover:text-gold-200">Se connecter</Link>
      </p>
    </div>
  )
}
