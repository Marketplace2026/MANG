import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Mot de passe trop court (6 caractères min)'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { username: form.username } }
    })
    setLoading(false)
    if (error) {
      toast.error(error.message === 'User already registered' ? 'Email déjà utilisé' : 'Erreur lors de l\'inscription')
    } else {
      toast.success('Compte créé avec succès !')
      navigate('/marketplace')
    }
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl text-white font-bold mb-1">Rejoignez MANG 🌿</h2>
      <p className="text-primary-300 text-sm mb-6">Créez votre compte et commencez à vendre ou acheter</p>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="text" placeholder="Nom d'utilisateur unique"
            value={form.username} onChange={e => setForm({...form, username: e.target.value})}
            required pattern="[a-zA-Z0-9_]{3,20}"
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium" />
        </div>

        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="email" placeholder="Adresse email"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})}
            required
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium" />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input type={showPass ? 'text' : 'password'} placeholder="Mot de passe (6 caractères min)"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})}
            required minLength={6}
            className="w-full pl-10 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium" />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
            {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-60 shadow-gold mt-2">
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
