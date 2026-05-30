import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

// Icône Google SVG inline
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

// ── Calcul force du mot de passe ──────────────────────────
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 6)  score++
  if (pwd.length >= 10) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score: 1, label: 'Très faible', color: 'bg-red-500' }
  if (score === 2) return { score: 2, label: 'Faible',     color: 'bg-orange-400' }
  if (score === 3) return { score: 3, label: 'Moyen',      color: 'bg-yellow-400' }
  if (score === 4) return { score: 4, label: 'Fort',       color: 'bg-green-400' }
  return              { score: 5, label: 'Très fort',   color: 'bg-emerald-400' }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Username check
  const [usernameStatus, setUsernameStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const usernameDebounce = useRef(null)

  const strength = getPasswordStrength(form.password)

  // Vérification username en temps réel
  const checkUsername = (value) => {
    clearTimeout(usernameDebounce.current)
    if (!value) { setUsernameStatus(null); return }

    // Validation format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')
    usernameDebounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value.toLowerCase())
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
  }

  const handleUsernameChange = (e) => {
    const val = e.target.value
    setForm({ ...form, username: val })
    checkUsername(val)
  }

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

  const handleRegister = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Mot de passe trop court (6 caractères min)'); return }
    if (usernameStatus === 'taken') { toast.error('Ce nom d\'utilisateur est déjà pris'); return }
    if (usernameStatus === 'invalid') { toast.error('Nom d\'utilisateur invalide (3-20 caractères, lettres/chiffres/_)'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { username: form.username.toLowerCase() } }
    })
    setLoading(false)
    if (error) {
      toast.error(error.message === 'User already registered' ? 'Email déjà utilisé' : 'Erreur lors de l\'inscription')
    } else {
      toast.success('Compte créé avec succès ! 🌿')
      navigate('/marketplace')
    }
  }

  // Icône statut username
  const UsernameIcon = () => {
    if (usernameStatus === 'checking') return <Loader2 size={15} className="animate-spin text-white/40"/>
    if (usernameStatus === 'available') return <CheckCircle2 size={15} className="text-emerald-400"/>
    if (usernameStatus === 'taken') return <XCircle size={15} className="text-red-400"/>
    if (usernameStatus === 'invalid') return <AlertCircle size={15} className="text-orange-400"/>
    return null
  }

  const usernameHint = {
    available: { text: 'Disponible ✓', cls: 'text-emerald-400' },
    taken:     { text: 'Déjà pris',    cls: 'text-red-400' },
    invalid:   { text: '3-20 caractères, lettres/chiffres/_', cls: 'text-orange-400' },
    checking:  { text: 'Vérification...', cls: 'text-white/40' },
  }[usernameStatus]

  const canSubmit = !loading && !googleLoading && usernameStatus !== 'taken' && usernameStatus !== 'invalid' && usernameStatus !== 'checking'

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl text-white font-bold mb-1">Rejoignez MANG 🌿</h2>
      <p className="text-primary-300 text-sm mb-6">Créez votre compte et commencez à vendre ou acheter</p>

      {/* Bouton Google */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 mb-5"
        style={{ background: 'rgba(255,255,255,0.95)', color: '#1a1a1a' }}
      >
        {googleLoading
          ? <Loader2 size={18} className="animate-spin text-gray-500"/>
          : <GoogleIcon />
        }
        <span>{googleLoading ? 'Redirection...' : 'Continuer avec Google'}</span>
      </button>

      {/* Séparateur */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/15"/>
        <span className="text-white/35 text-xs font-semibold tracking-wider uppercase">ou</span>
        <div className="flex-1 h-px bg-white/15"/>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">

        {/* Username */}
        <div>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Nom d'utilisateur unique"
              value={form.username}
              onChange={handleUsernameChange}
              required
              className={clsx(
                'w-full pl-10 pr-10 py-3.5 bg-white/10 border rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium transition-colors',
                usernameStatus === 'available' ? 'border-emerald-400/50' :
                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400/50' :
                'border-white/20'
              )}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <UsernameIcon />
            </div>
          </div>
          {usernameHint && (
            <p className={clsx('text-xs mt-1.5 pl-1 font-medium', usernameHint.cls)}>
              {usernameHint.text}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="email"
            placeholder="Adresse email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium"
          />
        </div>

        {/* Mot de passe + barre de force */}
        <div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Mot de passe (6 caractères min)"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              className="w-full pl-10 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>

          {/* Barre de force */}
          {form.password.length > 0 && (
            <div className="mt-2 px-1">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={clsx(
                    'flex-1 h-1 rounded-full transition-all duration-300',
                    i <= strength.score ? strength.color : 'bg-white/15'
                  )}/>
                ))}
              </div>
              <p className={clsx('text-xs font-semibold', {
                'text-red-400':    strength.score <= 1,
                'text-orange-400': strength.score === 2,
                'text-yellow-400': strength.score === 3,
                'text-green-400':  strength.score === 4,
                'text-emerald-400':strength.score === 5,
              })}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-60 shadow-gold mt-2 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin"/>}
          {loading ? 'Création du compte...' : 'Créer mon compte'}
        </button>
      </form>

      <p className="text-center text-white/50 text-sm mt-6">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="text-gold-300 font-bold hover:text-gold-200">Se connecter</Link>
      </p>
    </div>
  )
}
