// hooks/useGoogleReferral.js
// À importer et appeler dans App.jsx — détecte le retour OAuth Google
// et traite le parrainage si un code était en attente dans localStorage

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'mang_pending_referral'

export function useGoogleReferral() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // SIGNED_IN déclenché après retour OAuth Google
      if (event !== 'SIGNED_IN') return

      const pendingCode = localStorage.getItem(STORAGE_KEY)
      if (!pendingCode) return

      // Nettoyer immédiatement pour éviter un double appel
      localStorage.removeItem(STORAGE_KEY)

      const userId = session?.user?.id
      if (!userId) return

      // Attendre que le profil soit créé par le trigger Supabase
      await new Promise(r => setTimeout(r, 1500))

      const { data: result } = await supabase.rpc('process_referral', {
        p_referred_id:   userId,
        p_referral_code: pendingCode,
      })

      if (result?.success) {
        toast.success(`🎁 +10 pièces reçues grâce à @${result.referrer_username} !`, { duration: 5000 })
      }
    })

    return () => subscription.unsubscribe()
  }, [])
}
