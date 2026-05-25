import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { toast.error('Erreur lors de la réinitialisation'); return }
    toast.success('Mot de passe mis à jour !')
    navigate('/connexion')
  }

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl text-white font-bold mb-1">Nouveau mot de passe</h2>
      <p className="text-primary-300 text-sm mb-6">Choisissez un nouveau mot de passe sécurisé.</p>
      <form onSubmit={handleReset} className="space-y-4">
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="password" placeholder="Nouveau mot de passe" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            className="w-full pl-10 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm font-medium" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-primary-500 hover:bg-primary-400 text-white font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-60">
          {loading ? 'Mise à jour...' : 'Mettre à jour'}
        </button>
      </form>
    </div>
  )
}
