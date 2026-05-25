import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl text-white font-bold mb-1">Bon retour 👋</h2>
      <p className="text-primary-300 text-sm mb-6">Connectez-vous à votre compte MANG</p>

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

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-60 shadow-green mt-2">
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
