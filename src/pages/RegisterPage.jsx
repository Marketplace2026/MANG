import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M47.532 24.552c0-1.636-.132-3.272-.396-4.908H24.48v9.288h13.02c-.552 2.988-2.256 5.58-4.776 7.284v5.976h7.704c4.512-4.152 7.104-10.284 7.104-17.64z" fill="#4285F4"/>
      <path d="M24.48 48c6.48 0 11.952-2.136 15.936-5.808l-7.704-5.976c-2.148 1.452-4.908 2.304-8.232 2.304-6.312 0-11.664-4.26-13.584-10.008H3.012v6.168C6.972 42.828 15.228 48 24.48 48z" fill="#34A853"/>
      <path d="M10.896 28.512A14.4 14.4 0 0 1 10.08 24c0-1.572.276-3.096.816-4.512V13.32H3.012A23.988 23.988 0 0 0.48 24c0 3.876.924 7.548 2.532 10.68l7.884-6.168z" fill="#FBBC04"/>
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

  const [form, setForm] = useState({ username: '', email: '', password: '', referralCode: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState(null)
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [acceptTerms, setAcceptTerms] = useState(true)

  const usernameDebounce = useRef(null)
  const strength = getPasswordStrength(form.password)

  // Auto-remplissage du code de parrainage depuis l'URL (?ref=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const refParam = params.get('ref')
    if (refParam) {
      setForm(prev => ({ ...prev, referralCode: refParam.toUpperCase() }))
    }
  }, [])

  // Cooldown du bouton de renvoi d'email
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const checkUsername = (value) => {
    clearTimeout(usernameDebounce.current)
    const cleanVal = (value || '').trim().toLowerCase()
    if (!cleanVal) { setUsernameStatus(null); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanVal)) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    usernameDebounce.current = setTimeout(async () => {
      const { data } = await supabase
       .from('profiles').select('id').eq('username', cleanVal).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
  }

  // Google OAuth
  const handleGoogle = async () => {
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

  // Inscription email/password avec BONUS 20 PIÈCES OFFERTES
  const handleRegister = async (e) => {
    e.preventDefault()
    const cleanEmail = form.email.trim().toLowerCase()
    const cleanUsername = form.username.trim().toLowerCase()

    if (!cleanEmail || !cleanUsername) { toast.error('Veuillez remplir tous les champs obligatoires'); return }
    if (form.password.length < 6) { toast.error('Mot de passe trop court (6 caractères min)'); return }
    if (usernameStatus === 'taken') { toast.error("Ce nom d'utilisateur est déjà pris"); return }
    if (usernameStatus === 'invalid') { toast.error('Nom d’utilisateur invalide (3-20 caractères, lettres/chiffres/_)'); return }
    if (!acceptTerms) { toast.error('Veuillez accepter les conditions générales'); return }

    setLoading(true)

    // 1. Créer le compte Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: form.password,
      options: { data: { username: cleanUsername } }
    })

    if (error) {
      setLoading(false)
      toast.error(error.message === 'User already registered' ? 'Cet e-mail est déjà utilisé' : error.message || "Erreur lors de l'inscription")
      return
    }

    const userId = data?.user?.id
    const session = data?.session

    // 2. SI INSCRIPTION OK, ON CRÉE PROFIL + WALLET + 20 PIÈCES GRATUITES
    if (userId) {
      const w_number = Math.floor(1000000 + Math.random() * 9000000).toString().padStart(10, '0')
      const r_code = 'MNG' + userId.replace(/-/g, '').substring(0, 5).toUpperCase()

      try {
        // Créer profil
        await supabase.from('profiles').insert({
          id: userId,
          username: cleanUsername,
          email: cleanEmail,
          referral_code: r_code,
          referral_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // Créer wallet
        await supabase.from('wallets').insert({
          user_id: userId,
          wallet_number: w_number,
          balance_total: 0,
          balance_avail: 0,
          balance_reser: 0
        })

        // 🎁 20 PIÈCES MANG OFFERTES À TOUT LE MONDE À L'INSCRIPTION !
        await supabase.from('pieces').upsert({ user_id: userId, balance: 20 }, { onConflict: 'user_id' })

      } catch (err) {
        console.error('Erreur initialisation profil/pièces:', err)
      }
    }

    // 3. Gérer email verification
    if (!session) {
      setLoading(false)
      setRegisteredEmail(cleanEmail)
      setEmailVerificationSent(true)
      toast.success('🎁 Inscription réussie ! 20 Pièces MANG vous sont réservées. Validez votre e-mail.')
      return
    }

    setLoading(false)
    toast.success('🎁 Bienvenue ! Votre compte est créé avec 20 Pièces MANG gratuites !')
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
    invalid: { text: '3-20 caractères (lettres, chiffres, _)', cls: 'text-orange-400' },
    checking: { text: 'Vérification...', cls: 'text-white/40' },
  }[usernameStatus]

  const canSubmit = !loading && !googleLoading
    && usernameStatus !== 'taken'
    && usernameStatus !== 'invalid'
    && usernameStatus !== 'checking'
    && acceptTerms

  if (emailVerificationSent) {
    return (
      <div className="animate-fade-in text-center py-4">
        <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-4 text-3xl">
          🎁
        </div>
        <span className="inline-block px-3 py-1 bg-gold-500/20 text-gold-300 rounded-full text-xs font-bold mb-3 border border-gold-500/30">
          +20 Pièces MANG Offertes
        </span>
        <h2 className="font-display text-2xl text-white font-bold mb-2">Vérifiez votre e-mail</h2>
        <p className="text-primary-200 text-sm mb-6 leading-relaxed">
          Nous avons envoyé un lien de confirmation à <br/>
          <strong className="text-gold-300 font-semibold">{registeredEmail}</strong>.<br/>
          Cliquez sur ce lien pour activer votre compte et recevoir vos <strong>20 Pièces gratuites</strong>.
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
      <h2 className="font-display text-2xl text-white font-bold mb-1">Rejoignez MANG 🌿</h2>
      <p className="text-primary-300 text-sm mb-4">Créez votre compte et profitez du marché agricole</p>

      {/* 🎁 Banner Bonus Bienvenue 20 Pièces Gratuit */}
      <div className="p-3 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-400/30 rounded-2xl mb-5 flex items-center gap-3 backdrop-blur-md">
        <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center text-xl flex-shrink-0">
          🎁
        </div>
        <div>
          <p className="text-xs font-black text-amber-300 uppercase tracking-wider">Cadeau de Bienvenue</p>
          <p className="text-xs text-white font-semibold">
            <span className="font-extrabold text-amber-400">20 Pièces MANG (20 FCFA)</span> gratuites créditées à l'inscription !
          </p>
        </div>
      </div>

      {/* Bouton Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 mb-5 shadow-sm"
        style={{ background: 'rgba(255,255,255,0.95)', color: '#1a1a1a' }}
      >
        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-500"/> : <GoogleIcon />}
        <span>{googleLoading ? 'Redirection...' : 'Continuer avec Google'}</span>
      </button>

      {/* Séparateur */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/15"/>
        <span className="text-white/35 text-xs font-semibold tracking-wider uppercase">ou par e-mail</span>
        <div className="flex-1 h-px bg-white/15"/>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">

        {/* Username */}
        <div>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"/>
            <input
              type="text"
              placeholder="Nom d'utilisateur unique"
              value={form.username}
              onChange={e => { setForm({...form, username: e.target.value }); checkUsername(e.target.value) }}
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
            placeholder="Adresse email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value })}
            required
            autoComplete="email"
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium"
          />
        </div>

        {/* Code Parrain (Optionnel) */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">🎟️</span>
          <input
            type="text"
            placeholder="Code de parrainage (optionnel)"
            value={form.referralCode}
            onChange={e => setForm({...form, referralCode: e.target.value.toUpperCase() })}
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-mono tracking-wider"
          />
        </div>

        {/* Mot de passe */}
        <div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"/>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Mot de passe (6 caractères min)"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value })}
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

        {/* Case CGU & Confidentialité */}
        <label className="flex items-start gap-2.5 cursor-pointer pt-1 px-1">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={e => setAcceptTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-white/30 text-emerald-600 focus:ring-gold-400 bg-white/10"
          />
          <span className="text-xs text-white/70 font-medium leading-tight">
            J'accepte les <span className="text-gold-300 font-bold underline">Conditions Générales</span> et la <span className="text-gold-300 font-bold underline">Politique de Confidentialité</span> de MANG.
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-60 shadow-gold mt-2 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin"/>}
          {loading ? 'Création du compte...' : 'Créer mon compte (20 Pièces offertes)'}
        </button>
      </form>

      <p className="text-center text-white/50 text-sm mt-6">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="text-gold-300 font-bold hover:text-gold-200">Se connecter</Link>
      </p>
    </div>
  )
}
