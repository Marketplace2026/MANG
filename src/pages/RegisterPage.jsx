import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Check, Gift } from 'lucide-react'
import { clsx } from 'clsx'

const PASSWORD_RULES = [
  { label: '6 caractères minimum', test: v => v.length >= 6 },
  { label: 'Une lettre majuscule',  test: v => /[A-Z]/.test(v) },
  { label: 'Un chiffre',            test: v => /\d/.test(v) },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') || ''

  const [form, setForm]         = useState({ username: '', email: '', password: '', referralCode: refCode })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState({})
  const [referrerName, setReferrerName] = useState('')

  // Vérifier le code de parrainage présent dans l'URL
  useEffect(() => {
    if (refCode) checkReferralCode(refCode)
  }, [refCode])

  const checkReferralCode = async (code) => {
    if (!code || code.length < 6) { setReferrerName(''); return }
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('referral_code', code.toUpperCase())
      .single()
    setReferrerName(data?.username || '')
  }

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: '' }))
    if (k === 'referralCode') checkReferralCode(v)
  }

  const validate = () => {
    const e = {}
    if (!form.username) e.username = 'Nom requis'
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) e.username = '3-20 caractères, lettres/chiffres/_'
    if (!form.email) e.email = 'Email requis'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide'
    if (!form.password) e.password = 'Mot de passe requis'
    else if (form.password.length < 6) e.password = '6 caractères minimum'
    // Vérifier que le code saisi est valide si rempli
    if (form.referralCode.trim() && !referrerName) e.referralCode = 'Code de parrainage invalide'
    return e
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    // CORRECTIF : on passe referral_code_used dans les metadata utilisateur.
    // Le trigger Postgres trg_auto_process_referral se charge du reste,
    // sans setTimeout fragile côté client.
    const { data, error } = await supabase.auth.signUp({
      email:    form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          username:           form.username.toLowerCase().trim(),
          referral_code_used: form.referralCode.trim().toUpperCase() || null,
        }
      }
    })

    if (error) {
      setLoading(false)
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('already') || msg.includes('duplicate')) {
        setErrors({ email: '❌ Cet email est déjà utilisé' })
        toast.error('Email déjà utilisé')
      } else {
        toast.error(error.message)
      }
      return
    }

    // Si un code valide était fourni, afficher le toast de bienvenue avec bonus
    if (form.referralCode.trim() && referrerName) {
      toast.success(`🎁 +10 pièces reçues grâce au parrainage de @${referrerName} !`, { duration: 5000 })
    }

    setLoading(false)
    toast.success('Bienvenue sur MANG ! 🌿')
    navigate('/')
  }

  const inputClass = (hasError) => clsx(
    'w-full py-3.5 rounded-2xl text-white text-sm font-medium transition-all duration-200',
    'bg-white/10 border placeholder-white/30',
    'focus:outline-none focus:ring-2 focus:bg-white/15',
    hasError
      ? 'border-red-400/70 focus:ring-red-400/50 pl-10 pr-4'
      : 'border-white/15 focus:ring-gold-400/60 focus:border-transparent pl-10 pr-4'
  )

  const passwordStrength = PASSWORD_RULES.filter(r => r.test(form.password)).length

  return (
    <div className="animate-fade-in">
      <h2 className="font-display text-2xl text-white font-bold mb-1">Rejoignez MANG 🌿</h2>
      <p className="text-primary-200/70 text-sm mb-6">Votre marché agricole digital au Bénin</p>

      {/* Banner parrainage */}
      {referrerName && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-gold-500/20 border border-gold-400/30 mb-4">
          <Gift size={16} className="text-gold-300"/>
          <p className="text-gold-200 text-xs font-semibold">
            🎁 Parrainé par <strong>@{referrerName}</strong> — Vous recevrez 10 🪙 pièces !
          </p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-white/50 pl-1 uppercase tracking-wider">Nom d'utilisateur</label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"/>
            <input type="text" placeholder="ex: amadou_farmer" value={form.username}
              onChange={e => set('username', e.target.value)}
              autoCapitalize="none" className={inputClass(errors.username)}/>
          </div>
          {errors.username
            ? <p className="text-xs text-red-400 pl-1">{errors.username}</p>
            : <p className="text-xs text-white/30 pl-1">Lettres, chiffres et _ uniquement</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-white/50 pl-1 uppercase tracking-wider">Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"/>
            <input type="email" placeholder="votre@email.com" value={form.email}
              onChange={e => set('email', e.target.value)} autoComplete="email" className={inputClass(errors.email)}/>
          </div>
          {errors.email && <p className="text-xs text-red-400 pl-1">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-white/50 pl-1 uppercase tracking-wider">Mot de passe</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"/>
            <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password}
              onChange={e => set('password', e.target.value)}
              className={clsx(inputClass(errors.password), 'pr-12')}/>
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400 pl-1">{errors.password}</p>}
          {form.password.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className={clsx('flex-1 h-1 rounded-full transition-all duration-300',
                    i < passwordStrength
                      ? passwordStrength === 1 ? 'bg-red-400' : passwordStrength === 2 ? 'bg-gold-400' : 'bg-emerald-400'
                      : 'bg-white/15')}/>
                ))}
              </div>
              {PASSWORD_RULES.map((rule, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={clsx('w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all',
                    rule.test(form.password) ? 'bg-emerald-400' : 'bg-white/15')}>
                    {rule.test(form.password) && <Check size={8} className="text-white" strokeWidth={3}/>}
                  </div>
                  <span className={clsx('text-xs', rule.test(form.password) ? 'text-emerald-300' : 'text-white/30')}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Code parrainage */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-white/50 pl-1 uppercase tracking-wider">
            Code de parrainage <span className="text-white/30 normal-case">(optionnel)</span>
          </label>
          <div className="relative">
            <Gift size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"/>
            <input type="text" placeholder="Ex: BAUD1234" value={form.referralCode}
              onChange={e => set('referralCode', e.target.value.toUpperCase())}
              className={clsx(inputClass(errors.referralCode), 'uppercase tracking-widest')}
              maxLength={8}/>
            {referrerName && (
              <Check size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400"/>
            )}
          </div>
          {/* CORRECTIF : afficher erreur si code invalide saisi */}
          {errors.referralCode && (
            <p className="text-xs text-red-400 pl-1">{errors.referralCode}</p>
          )}
          {referrerName && (
            <p className="text-xs text-emerald-300 pl-1 font-semibold">
              ✅ Code valide — parrainé par @{referrerName} (+10 🪙)
            </p>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 bg-gold-500 hover:bg-gold-400 text-white shadow-gold disabled:opacity-50 mt-2">
          {loading
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            : <><span>Créer mon compte</span><ArrowRight size={16}/></>}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-white/10"/>
        <span className="text-white/30 text-xs">ou</span>
        <div className="flex-1 h-px bg-white/10"/>
      </div>

      <p className="text-center text-white/40 text-sm">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="text-gold-300 font-bold hover:text-gold-200">Se connecter</Link>
      </p>
    </div>
  )
}
