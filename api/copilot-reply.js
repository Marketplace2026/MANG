import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dvpvtytebjywjzarkjoe.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cHZ0eXRlYmp5d2p6YXJram9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU2NjMyNSwiZXhwIjoyMDk1MTQyMzI1fQ.kKlZNkh2s51sNBr00LthtgxupZ6kwGWESgB2p54hksQ'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Moteur IA Agronomique & Commercial Local Béninois
function generateReply({ incomingMessage, shop, products = [] }) {
  const shopName = shop?.name || 'notre boutique'
  const shopCity = shop?.city || 'Bénin'
  const deliveryInfo = shop?.has_delivery
    ? 'Livraison possible et rapide directement à votre adresse'
    : 'Retrait disponible à la boutique'

  const lowerMsg = (incomingMessage || '').toLowerCase().trim()

  // 1. Détection de salutations ("cc", "salut", "bonjour", "bonsoir")
  const isGreetingOnly = /^(cc|slt|salut|bonjour|bonsoir|bjr|bsr|coucou|hello|hi|yo)[.!? ]*$/i.test(lowerMsg)
  if (isGreetingOnly) {
    let prodsSummary = ''
    if (products.length > 0) {
      const top3 = products.slice(0, 3).map(p => `• ${p.name} (${p.price ? p.price.toLocaleString('fr-FR') + ' FCFA' : 'Prix doux'})`).join('\n')
      prodsSummary = `\n\nVoici quelques-uns de nos produits disponibles actuellement :\n${top3}`
    }
    return `Bonjour et bienvenue chez ${shopName} ! 👋\nMerci pour votre message. En quoi pouvons-nous vous être utile aujourd'hui ?${prodsSummary}`
  }

  // 2. Détection de demande de prix
  if (lowerMsg.includes('prix') || lowerMsg.includes('combien') || lowerMsg.includes('cout') || lowerMsg.includes('coûte') || lowerMsg.includes('tarif')) {
    const matched = products.find(p => lowerMsg.includes((p.name || '').toLowerCase()))
    if (matched) {
      return `Bonjour ! Notre ${matched.name} est disponible à ${matched.price ? matched.price.toLocaleString('fr-FR') + ' FCFA' : 'prix très avantageux'}. ${deliveryInfo}. Vous pouvez passer commande directement sur notre boutique MANG !`
    }
    if (products.length > 0) {
      const list = products.slice(0, 4).map(p => `• ${p.name} : ${p.price ? p.price.toLocaleString('fr-FR') + ' FCFA' : 'Prix disponible'}`).join('\n')
      return `Bonjour ! Voici nos tarifs actuels chez ${shopName} :\n${list}\n\nQuel article souhaitez-vous commander ?`
    }
    return `Bonjour ! Nos prix sont très compétitifs avec des tarifs dégressifs selon la quantité. Quel produit vous intéresse précisément ?`
  }

  // 3. Détection de livraison / localisation
  if (lowerMsg.includes('livr') || lowerMsg.includes('transport') || lowerMsg.includes('amener') || lowerMsg.includes('ou se trouve') || lowerMsg.includes('localisation') || lowerMsg.includes('adresse') || lowerMsg.includes('cotonou') || lowerMsg.includes('calavi') || lowerMsg.includes('parakou')) {
    return `Bonjour ! Nous sommes basés à ${shopCity}. Concernant la livraison : ${deliveryInfo}. Indiquez-nous votre ville ou quartier pour organiser l'expédition !`
  }

  // 4. Détection de disponibilité / stock
  if (lowerMsg.includes('dispo') || lowerMsg.includes('stock') || lowerMsg.includes('reste') || lowerMsg.includes('encore')) {
    return `Bonjour ! Oui, nos récoltes et articles présentés sur MANG sont bien en stock et prêts pour livraison. Combien d'unités ou de sacs souhaitez-vous ?`
  }

  // 5. Message général bienveillant
  return `Bonjour et merci pour votre message chez ${shopName} ! Vos articles sont disponibles avec ${deliveryInfo}. N'hésitez pas à nous préciser votre commande ou la quantité souhaitée !`
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { conversationId, incomingMessage } = req.body || {}
    if (!conversationId || !incomingMessage) {
      return res.status(400).json({ error: 'Missing parameters' })
    }

    // 1. Récupérer la conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*, shop:shops(*)')
      .eq('id', conversationId)
      .single()

    if (convErr || !conv) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    // 2. Charger les produits de la boutique
    let products = []
    if (conv.shop_id) {
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, price, is_available')
        .eq('shop_id', conv.shop_id)
        .eq('is_available', true)
        .limit(8)
      if (prods) products = prods
    }

    // 3. Générer la réponse intelligente du Copilote
    const replyText = generateReply({
      incomingMessage,
      shop: conv.shop,
      products
    })

    if (!replyText) {
      return res.status(500).json({ error: 'Could not generate reply' })
    }

    // 4. Insérer le message en tant que vendeur (Copilote IA 24/7)
    const { data: newMsg, error: insertErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conv.id,
        sender_id: conv.seller_id,
        content: replyText,
        type: 'text',
        delivery_status: 'delivered'
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[Copilot insert error]', insertErr)
      return res.status(500).json({ error: insertErr.message })
    }

    // 5. Mettre à jour la conversation
    await supabase
      .from('conversations')
      .update({
        last_message: replyText,
        last_message_at: new Date().toISOString()
      })
      .eq('id', conv.id)

    return res.status(200).json({ success: true, reply: replyText, message: newMsg })
  } catch (err) {
    console.error('[Copilot handler error]', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
