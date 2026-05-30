import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

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

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error('Email ou mot de passe incorrect')
    } else {
      navigate('/marketplace')
    }
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
    // Pas de setLoading(false) ici — la page redirige
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl text-white font-bold mb-1">Bon retour 👋</h2>
      <p className="text-primary-300 text-sm mb-6">Connectez-vous à votre compte MANG</p>

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

      {/* Formulaire email */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium"
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full pl-10 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium"
          />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
            {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>

        <Link to="/mot-de-passe-oublie" className="block text-right text-xs text-gold-300 hover:text-gold-200 font-medium">
          Mot de passe oublié ?
        </Link>

        <button type="submit" disabled={loading || googleLoading}
          className="w-full py-3.5 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-60 shadow-green mt-2 flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin"/>}
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-white/50 text-sm mt-6">
        Pas encore de compte ?{' '}
        <Link to="/inscription" className="text-gold-300 font-bold hover:text-gold-200">
          S'inscrire
        </Link>
      </p>
    </div>
  )
}
