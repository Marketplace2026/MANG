import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import { generateAutoReply } from '@/lib/ai'
import toast from 'react-hot-toast'

/**
 * useVendorCopilotResponder
 * Écoute en arrière-plan les messages entrants reçus par le vendeur
 * et répond automatiquement si le Copilote 24/7 est activé pour la boutique.
 */
export function useVendorCopilotResponder() {
  const { user } = useAuthStore()
  const repliedMessageIds = useRef(new Set())
  const processingRef = useRef(false)

  useEffect(() => {
    if (!user) return

    let isMounted = true
    let channel = null

    async function initListener() {
      // 1. Récupérer les boutiques dont l'utilisateur est propriétaire
      const { data: shops } = await supabase
        .from('shops')
        .select('id, name, city, has_delivery')
        .eq('owner_id', user.id)

      if (!isMounted || !shops || shops.length === 0) return

      const shopMap = new Map(shops.map(s => [s.id, s]))

      // 2. Écouter les nouveaux messages en temps réel
      channel = supabase
        .channel(`vendor-copilot-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const newMsg = payload.new
            if (!newMsg || !newMsg.conversation_id) return

            // Ne pas répondre à nos propres messages
            if (newMsg.sender_id === user.id) return

            // Éviter les doublons
            if (repliedMessageIds.current.has(newMsg.id)) return
            repliedMessageIds.current.add(newMsg.id)

            // Vérifier si cette conversation concerne l'une de nos boutiques
            const { data: conv } = await supabase
              .from('conversations')
              .select('id, shop_id, seller_id, buyer_id')
              .eq('id', newMsg.conversation_id)
              .single()

            if (!conv || conv.seller_id !== user.id) return

            const shop = shopMap.get(conv.shop_id) || shops[0]
            if (!shop) return

            // 3. Vérifier si le vendeur a activé le répondeur
            const storageKey = `mang_copilot_settings_${shop.id}`
            let settings = { enabled: true, instructions: '' }
            try {
              const saved = localStorage.getItem(storageKey)
              if (saved) settings = JSON.parse(saved)
            } catch {}

            if (!settings.enabled) return

            // 4. Charger les produits de la boutique pour le contexte
            const { data: products } = await supabase
              .from('products')
              .select('id, name, price, is_available')
              .eq('shop_id', shop.id)
              .limit(8)

            // Délai réaliste de frappe humaine (1.8s)
            await new Promise(r => setTimeout(r, 1800))
            if (!isMounted) return

            try {
              const autoReplyText = await generateAutoReply({
                incomingMessage: newMsg.content || '',
                shop,
                products: products || [],
                instructions: settings.instructions || ''
              })

              if (!autoReplyText) return

              // Insérer le message de réponse en tant que vendeur
              const { error: sendErr } = await supabase.from('messages').insert({
                conversation_id: conv.id,
                sender_id: user.id,
                content: autoReplyText,
                type: 'text',
                delivery_status: 'delivered'
              })

              if (!sendErr) {
                await supabase.from('conversations').update({
                  last_message: autoReplyText,
                  last_message_at: new Date().toISOString()
                }).eq('id', conv.id)

                toast('🤖 Copilote a répondu à votre client !', {
                  icon: '✨',
                  duration: 4000
                })
              }
            } catch (err) {
              console.warn('[Copilot Responder error]', err)
            }
          }
        )
        .subscribe()
    }

    initListener()

    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [user])
}
