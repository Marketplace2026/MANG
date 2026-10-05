/**
 * MANG — Moteur d'Intelligence Artificielle Agricole (MANG AI Engine)
 * Supporte Google Gemini 1.5 Flash + Moteur Hybride Agronomique & Commercial Béninois.
 */

// Clé Gemini optionnelle (depuis l'env ou le stockage local du vendeur)
export function getGeminiApiKey() {
  try {
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GEMINI_API_KEY : null
    const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('mang_gemini_api_key') : null
    return envKey || localKey || null
  } catch {
    return null
  }
}

export function setGeminiApiKey(key) {
  try {
    if (typeof localStorage === 'undefined') return
    if (key) localStorage.setItem('mang_gemini_api_key', key.trim())
    else localStorage.removeItem('mang_gemini_api_key')
  } catch {}
}

// Appel direct à l'API Google Gemini 1.5 Flash REST
async function callGemini(prompt, systemInstruction = '') {
  const apiKey = getGeminiApiKey()
  if (!apiKey) return null

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      console.warn('[Gemini API error]', res.status, res.statusText)
      return null
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    return text ? text.trim() : null
  } catch (err) {
    console.warn('[Gemini Call Failed, fallback to local AI]', err)
    return null
  }
}

// ============================================================
// 1. GÉNÉRATEUR IA DE FICHES PRODUITS
// ============================================================
export async function generateProductDescription({ productName, category, price, originCity }) {
  const rawName = (productName || '').trim()
  if (!rawName) return null

  const systemPrompt = `Tu es un expert en marketing agricole au Bénin et en Afrique de l'Ouest. Tu rédiges des fiches produits attrayantes, rassurantes et très vendeuses pour la marketplace agricole MANG. Tu rédiges en français clair, chaleureux et professionnel.`

  const prompt = `Génère une description commerciale percutante pour ce produit agricole :
- Nom : ${rawName}
- Catégorie : ${category || 'Agricole'}
- Prix indicatif : ${price ? price + ' FCFA' : 'À définir'}
- Provenance : ${originCity || 'Bénin'}

Réponds directement avec un texte structuré comprenant :
1. Une phrase d'accroche enthousiaste sur la fraîcheur et la qualité 100% locale.
2. Les caractéristiques clés (qualité, récolte, conservation).
3. Les usages recommandés (consommation familiale, restauration, revente en gros).
4. Un appel à l'action pour commander dès maintenant sur MANG.`

  // Tentative avec Gemini
  const geminiResult = await callGemini(prompt, systemPrompt)
  if (geminiResult) return geminiResult

  // Moteur Hybride Agronomique Local (Fallback instantané 0ms)
  const city = originCity || 'du Bénin'
  const isCereal = /maïs|mais|riz|sorgho|mil/i.test(rawName)
  const isTuber = /igname|manioc|patate|taro/i.test(rawName)
  const isFruit = /tomate|ananas|mangue|orange|banane|papaye|avocat/i.test(rawName)
  const isLegume = /piment|oignon|gombo|aubergine|carotte|chou/i.test(rawName)
  const isAnimal = /poulet|volaille|porc|mouton|chèvre|oeuf|poisson/i.test(rawName)

  let qualityNote = 'Récolté avec soin et garanti sans produits chimiques nocifs.'
  let usageNote = 'Idéal pour les ménages, les restaurateurs et les commerçants grossistes.'

  if (isCereal) {
    qualityNote = 'Grains bien séchés, triés à la main, faible taux d’humidité et excellente conservation en sacs.'
    usageNote = 'Parfait pour la mouture, la préparation des pâtes locales, la provende animale ou le stockage.'
  } else if (isTuber) {
    qualityNote = 'Tubercules frais, fermes et riches en nutriments, directement issus de nos terres fertiles.'
    usageNote = 'Excellent pour le pilage (foutou/igname pilée), la friture ou la transformation en cossettes/farine.'
  } else if (isFruit || isLegume) {
    qualityNote = 'Cueilli à maturité parfaite, fraîcheur croquante garantie et saveur authentique du terroir.'
    usageNote = 'Parfait pour vos sauces, jus naturels et étals de marché avec une très bonne tenue.'
  } else if (isAnimal) {
    qualityNote = 'Élevage local sain, nourri aux grains naturels sous suivi vétérinaire rigoureux.'
    usageNote = 'Viande tendre, saine et savoureuse pour vos réceptions, cantines et repas de famille.'
  }

  return `🌟 **${rawName} de Premier Choix** (${city})

Profitez de la qualité authentique de nos récoltes locales ! Ce produit est soigneusement sélectionné auprès de producteurs partenaires pour vous garantir une fraîcheur et une pureté incomparables.

✨ **Points forts :**
- **Origine certifiée** : Terroir béninois, respect des cycles naturels.
- **Qualité premium** : ${qualityNote}
- **Conditionnement sécurisé** : Emballé prêt pour le transport et la livraison.

🍽️ **Usages recommandés :**
${usageNote}

📦 *Disponible en quantité limitée. Commandez directement via MANG avec paiement sécurisé Escrow et livraison rapide partout au Bénin !*`
}

// ============================================================
// 2. RÉPONDEUR AUTOMATIQUE INTELLIGENT 24/7 (CHAT)
// ============================================================
export async function generateAutoReply({ incomingMessage, shop, products = [], instructions = '' }) {
  const shopName = shop?.name || 'notre boutique'
  const shopCity = shop?.city || 'Bénin'
  const deliveryInfo = shop?.has_delivery ? 'Oui, nous assurons la livraison directe' : 'Retrait possible sur place ou transporteur sur demande'

  const catalogSummary = (products || []).slice(0, 6).map(p => 
    `- ${p.name} : ${p.price ? p.price + ' FCFA' : 'Prix sur demande'} (${p.is_available ? 'Disponible' : 'Bientôt disponible'})`
  ).join('\n')

  const systemPrompt = `Tu es le Copilote IA de la boutique agricole "${shopName}" sur la marketplace MANG au Bénin. Tu réponds aux acheteurs de manière polie, serviable, concise et professionnelle. Réponds en 2 à 4 phrases maximum.`

  const prompt = `Un acheteur a écrit ce message :
"${incomingMessage}"

Informations sur notre boutique :
- Nom : ${shopName}
- Ville : ${shopCity}
- Livraison : ${deliveryInfo}
- Consignes particulières du vendeur : ${instructions || 'Être courtois et proposer de finaliser la commande sur MANG.'}
- Catalogue de produits :
${catalogSummary || 'Consultez nos produits sur la vitrine MANG.'}

Rédige une réponse immédiate, accueillante et concrète.`

  // Tentative avec Gemini
  const geminiResult = await callGemini(prompt, systemPrompt)
  if (geminiResult) return geminiResult

  // Moteur Local Intelligent (Fallback 0ms)
  const lowerMsg = (incomingMessage || '').toLowerCase()

  // Détection d'intention
  if (lowerMsg.includes('prix') || lowerMsg.includes('combien') || lowerMsg.includes('cout') || lowerMsg.includes('coûte')) {
    const matchedProd = products.find(p => lowerMsg.includes((p.name || '').toLowerCase()))
    if (matchedProd) {
      return `Bonjour ! Chez ${shopName}, notre ${matchedProd.name} est disponible à ${matchedProd.price ? matchedProd.price + ' FCFA' : 'prix grossiste très avantageux'}. ${deliveryInfo}. Vous pouvez passer commande directement sur notre boutique MANG !`
    }
    return `Bonjour et bienvenue chez ${shopName} ! Nos prix sont affichés sur notre catalogue MANG avec des tarifs dégressifs selon les quantités. Quel produit vous intéresse précisément ?`
  }

  if (lowerMsg.includes('livr') || lowerMsg.includes('transport') || lowerMsg.includes('amener') || lowerMsg.includes('ou se trouve')) {
    return `Bonjour ! Nous sommes basés à ${shopCity}. Concernant la livraison : ${deliveryInfo}. Indiquez-nous votre ville ou quartier pour estimer le délai et le coût !`
  }

  if (lowerMsg.includes('dispo') || lowerMsg.includes('stock') || lowerMsg.includes('reste')) {
    return `Bonjour ! Oui, nos produits affichés sur MANG sont actuellement en stock et prêts pour expédition. Vous pouvez finaliser votre commande en toute sécurité avec la protection Escrow MANG !`
  }

  return `Bonjour et merci pour votre message ! Le vendeur ${shopName} est actuellement sur le terrain, mais votre commande est notre priorité. ${deliveryInfo}. N'hésitez pas à valider vos articles sur notre vitrine MANG ou à préciser votre besoin !`
}

// ============================================================
// 3. AUDIT & CONSEILS COMMERCIAUX IA POUR LA BOUTIQUE
// ============================================================
export async function analyzeShopPerformance({ shop, products = [] }) {
  const systemPrompt = `Tu es un conseiller expert en e-commerce agricole pour l'Afrique de l'Ouest. Tu donnes 3 conseils actionnables, très précis et percutants pour augmenter les ventes d'une boutique.`

  const prompt = `Analyse cette boutique agricole :
- Nom : ${shop?.name}
- Ville : ${shop?.city}
- Nombre de produits : ${products.length}
- Note moyenne : ${shop?.rating_avg || 5}/5
- Livraison activée : ${shop?.has_delivery ? 'Oui' : 'Non'}

Donne 3 conseils concrets pour doubler les ventes cette semaine sur MANG.`

  const geminiResult = await callGemini(prompt, systemPrompt)
  if (geminiResult) return geminiResult

  // Conseils agronomiques et commerciaux locaux précalculés
  const tips = []

  if (products.length < 3) {
    tips.push("📦 **Élargissez votre catalogue** : Les boutiques avec au moins 4 à 5 produits reçoivent 3x plus de commandes.")
  } else {
    tips.push("🏷️ **Proposez des tarifs dégressifs** : Ajoutez des paliers de prix pour les achats de 5 à 10 sacs/paniers afin d'attirer les grossistes et restaurateurs.")
  }

  if (!shop?.has_delivery) {
    tips.push("🚚 **Activez l'option de livraison** : Les acheteurs de Cotonou, Calavi et Parakou privilégient systématiquement les vendeurs livrant à domicile.")
  } else {
    tips.push("⚡ **Réactivité éclair** : Laissez activé votre Copilote IA MANG pour répondre en moins de 1 minute même quand vous êtes occupé au champ.")
  }

  tips.push("📸 **Photos en lumière naturelle** : Photographiez vos produits sur le lieu de récolte ou en stock bien rangé pour inspirer confiance maximale aux acheteurs.")

  return tips.join('\n\n')
}
