# 🌿 MANG — Marché Agricole Nouvelle Génération

Marketplace agricole mobile-first pour le Bénin.

## Stack Technique

- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Paiements** : FedaPay (Mobile Money MTN, Moov, Celtis)
- **Déploiement** : Vercel + Supabase

---

## 🚀 Mise en place — Étape par étape

### 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. Choisir une région proche du Bénin (Europe West ou US East)
3. Notez : **Project URL** et **anon public key** (Settings > API)

### 2. Configurer la base de données

Dans Supabase, allez dans **SQL Editor** et exécutez dans l'ordre :

```
1. sql/01_schema.sql       — Tables + triggers + fonctions
2. sql/02_rls_policies.sql — Sécurité + catégories initiales
3. sql/03_functions_realtime.sql — Fonctions métier + temps réel
```

### 3. Configurer le Storage

Dans Supabase > Storage, créez ces 4 buckets (tous **Public**) :
- `avatars`
- `shop-covers`
- `product-images`
- `message-files`

### 4. Installer et lancer le projet

```bash
# Cloner ou dézipper le projet
cd mang

# Copier les variables d'environnement
cp .env.example .env
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

Le projet sera disponible sur http://localhost:5173

---

## 📁 Structure du projet

```
mang/
├── sql/
│   ├── 01_schema.sql              # Schéma BDD complet
│   ├── 02_rls_policies.sql        # Sécurité RLS + catégories
│   └── 03_functions_realtime.sql  # Fonctions métier + realtime
├── src/
│   ├── components/
│   │   ├── layout/                # AppLayout, AuthLayout
│   │   ├── ui/                    # Composants réutilisables
│   │   ├── auth/                  # Formulaires auth
│   │   ├── marketplace/           # Boutiques, recherche, filtres
│   │   ├── vendor/                # Espace vendeur
│   │   ├── orders/                # Commandes
│   │   ├── wallet/                # Portefeuille
│   │   ├── chat/                  # Messagerie
│   │   ├── notifications/         # Notifications
│   │   └── community/             # Communauté sociale
│   ├── pages/                     # Pages React Router
│   ├── hooks/                     # Hooks personnalisés
│   ├── lib/
│   │   └── supabase.js            # Client Supabase + utils
│   ├── store/
│   │   └── index.js               # Zustand stores (auth, notifs, messages)
│   ├── styles/
│   │   └── globals.css            # Styles globaux + design tokens
│   ├── App.jsx                    # Routing principal
│   └── main.jsx                   # Point d'entrée
├── .env.example                   # Template variables d'environnement
├── tailwind.config.js             # Design system MANG
├── vite.config.js
└── package.json
```

---

## 🎨 Design System

### Couleurs
- **Primary** : Vert forêt tropical (#16a34a)
- **Gold** : Or terre (#f59e0b) — Premium, CTAs secondaires
- **Earth** : Terre ocre (#d4821e) — Accents
- **Surface** : Blancs/gris neutres

### Typographie
- **Display** : Fraunces (titres, logo)
- **Sans** : Nunito (corps, interface)
- **Mono** : JetBrains Mono (numéros wallet, codes)

---

## 📊 Tables de la base de données

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs |
| `wallets` | Portefeuilles numériques |
| `pieces` | Monnaie interne |
| `categories` | 39 catégories en 7 groupes |
| `shops` | Boutiques des vendeurs |
| `products` | Produits des boutiques |
| `shop_followers` | Abonnements boutiques |
| `shop_likes` | Likes boutiques |
| `shop_comments` | Commentaires boutiques |
| `product_favorites` | Produits favoris |
| `orders` | Commandes avec escrow |
| `wallet_transactions` | Historique transactions |
| `premium_subscriptions` | Abonnements premium |
| `conversations` | Conversations chat |
| `messages` | Messages individuels |
| `notifications` | Notifications temps réel |
| `posts` | Publications communauté |
| `post_likes` | Likes publications |
| `post_comments` | Commentaires publications |
| `user_follows` | Abonnements utilisateurs |
| `search_history` | Historique recherches |

---

## 🗓️ Roadmap des phases

- [x] **Phase 1** — Base & Architecture (BDD + Structure React)
- [ ] **Phase 2** — Authentification & Profils
- [ ] **Phase 3** — Marketplace & Boutiques
- [ ] **Phase 4** — Espace Vendeur
- [ ] **Phase 5** — Commandes & Wallet
- [ ] **Phase 6** — Messagerie Temps Réel
- [ ] **Phase 7** — Notifications & Social
- [ ] **Phase 8** — Polish & Déploiement

---

## 🔑 Fonctions SQL importantes

- `transfer_funds()` — Transfert sécurisé entre wallets (atomique)
- `place_order()` — Passage de commande avec escrow
- `pay_order()` — Paiement avec vérification PIN
- `refuse_order()` — Refus avec remboursement automatique
- `buy_pieces()` — Achat de pièces internes
- `generate_wallet_number()` — Numéro wallet unique à 10 chiffres
- `generate_receipt_number()` — Numéro reçu format MANG-2024-XXXXXX
