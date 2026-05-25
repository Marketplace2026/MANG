import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`
    })
    setLoading(false)
    if (error) { toast.error('Erreur lors de l\'envoi'); return }
    setSent(true)
  }

  if (sent) return (
    <div className="text-center animate-fade-in">
      <div className="text-5xl mb-4">📧</div>
      <h2 className="font-display text-xl text-white font-bold mb-2">Email envoyé !</h2>
      <p className="text-primary-300 text-sm mb-6">Vérifiez votre boîte mail pour réinitialiser votre mot de passe.</p>
      <Link to="/connexion" className="btn-primary w-full block text-center">Retour à la connexion</Link>
    </div>
  )

  return (
    <div className="animate-fade-in">
      <Link to="/connexion" className="flex items-center gap-1 text-primary-300 text-sm mb-6 hover:text-white">
        <ArrowLeft size={16}/> Retour
      </Link>
      <h2 className="font-display text-2xl text-white font-bold mb-1">Mot de passe oublié ?</h2>
      <p className="text-primary-300 text-sm mb-6">Entrez votre email pour recevoir un lien de réinitialisation.</p>
      <form onSubmit={handleReset} className="space-y-4">
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="email" placeholder="Votre adresse email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-60">
          {loading ? 'Envoi...' : 'Envoyer le lien'}
        </button>
      </form>
    </div>
  )
}
