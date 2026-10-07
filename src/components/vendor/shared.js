export const formatFCFA = (val) => Math.round(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

export const CATEGORIES = [
  { name: 'Production végétale',           icon: 'sprout', items: ['Céréales & grains','Légumes','Fruits','Racines & tubercules','Plantes industrielles','Plantes aromatiques & médicinales'] },
  { name: 'Production animale',            icon: 'beef', items: ['Bovins','Ovins & caprins','Porcins','Aviculture','Apiculture','Pisciculture & aquaculture'] },
  { name: 'Transformation agricole',       icon: '🥫', items: ['Produits céréaliers transformés','Produits fruitiers transformés','Produits tubercules transformés','Produits animaux transformés'] },
  { name: 'Machines & équipements',        icon: 'tractor', items: ['Machines lourdes','Équipements motorisés','Outils agricoles','Irrigation & énergie','Pièces & maintenance'] },
  { name: 'Intrants agricoles',            icon: '🧪', items: ['Semences & plants','Engrais organiques','Engrais chimiques','Amendements du sol','Produits phytosanitaires'] },
  { name: 'Espaces verts',                 icon: '🏡', items: ['Plantes ornementales','Arbres & arbustes','Gazon & pelouses','Fleurs & pépinières','Aménagement paysager','Entretien des espaces verts','Matériel de jardinage'] },
  { name: 'Services agricoles',            icon: '🤝', items: ['Labour & préparation du sol','Récolte & battage','Transport & logistique','Stockage & conservation','Formation & conseil','Commercialisation & export'] },
]

export const AVAILABILITY_OPTIONS = [
  { value: 'now',  label: 'Disponible maintenant' },
  { value: '1w',   label: 'Dans 1 semaine' },
  { value: '2w',   label: 'Dans 2 semaines' },
  { value: '1m',   label: 'Dans 1 mois' },
  { value: '2m',   label: 'Dans 2 mois' },
  { value: '3m',   label: 'Dans 3 mois' },
  { value: '6m',   label: 'Dans 6 mois' },
  { value: '1y',   label: 'Dans 1 an' },
]

export const PRODUCT_LIMITS = { 0: 5, 1: 10, 2: 20, 3: Infinity }

export const PREMIUM_PLANS = [
  {
    level: 1, name: 'Bronze', price: 1000, stars: '★',
    color: 'from-amber-700 to-amber-800',
    perks: ['Jusqu\'à 10 produits', 'Boutique affichée plus haut', 'Badge Bronze visible'],
  },
  {
    level: 2, name: 'Argent', price: 2000, stars: '★★',
    color: 'from-slate-500 to-slate-600',
    perks: ['Jusqu\'à 20 produits', 'Priorité dans les résultats', 'Badge Argent animé', 'Stats avancées'],
  },
  {
    level: 3, name: 'Or', price: 3000, stars: '★★★',
    color: 'from-gold-500 to-gold-600',
    perks: ['Produits illimités', 'Toujours en tête de liste', 'Badge Or brillant', 'Support prioritaire', 'Analyse des ventes'],
    popular: true,
  },
]

export const COINS_PACKS = [
  { coins: 5,  price: 100,  color: 'bg-emerald-500' },
  { coins: 10, price: 200,  color: 'bg-blue-500' },
  { coins: 20, price: 350,  color: 'bg-orange-500' },
  { coins: 50, price: 950,  color: 'bg-violet-500' },
]

export function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
}

export async function syncShopProductVisibility(supabase, shopId, premiumLevel = 0) {
  if (!shopId || !supabase) return
  const limit = PRODUCT_LIMITS[premiumLevel] ?? 5

  try {
    const { data: prods, error } = await supabase
      .from('products')
      .select('id, is_available')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })

    if (error || !prods || prods.length === 0) return

    const toActivate = []
    const toDeactivate = []

    prods.forEach((prod, index) => {
      const shouldBeVisible = limit === Infinity || index < limit
      if (shouldBeVisible && !prod.is_available) {
        toActivate.push(prod.id)
      } else if (!shouldBeVisible && prod.is_available) {
        toDeactivate.push(prod.id)
      }
    })

    if (toActivate.length > 0) {
      await supabase.from('products').update({ is_available: true }).in('id', toActivate)
    }
    if (toDeactivate.length > 0) {
      await supabase.from('products').update({ is_available: false }).in('id', toDeactivate)
    }
  } catch (err) {
    console.warn('[syncShopProductVisibility] Erreur de synchro:', err)
  }
}
