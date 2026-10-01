import { ShoppingCart, User, Package, Wallet, Compass } from 'lucide-react'

export function MarketplacePage() {
  return (
    <div className="p-6 text-center pt-20">
      <div className="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-primary-600">
        <ShoppingCart size={32} />
      </div>
      <h2 className="font-display text-2xl font-bold text-dark-800">Marketplace</h2>
      <p className="text-dark-600 mt-2">Phase 3 — En construction</p>
    </div>
  )
}

export function ProfilePage() {
  return (
    <div className="p-6 text-center pt-20">
      <div className="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-primary-600">
        <User size={32} />
      </div>
      <h2 className="font-display text-2xl font-bold text-dark-800">Profil</h2>
      <p className="text-dark-600 mt-2">Phase 2 — En construction</p>
    </div>
  )
}

export function OrdersPage() {
  return (
    <div className="p-6 text-center pt-20">
      <div className="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-primary-600">
        <Package size={32} />
      </div>
      <h2 className="font-display text-2xl font-bold text-dark-800">Commandes</h2>
      <p className="text-dark-600 mt-2">Phase 5 — En construction</p>
    </div>
  )
}

export function WalletPage() {
  return (
    <div className="p-6 text-center pt-20">
      <div className="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-primary-600">
        <Wallet size={32} />
      </div>
      <h2 className="font-display text-2xl font-bold text-dark-800">Portefeuille</h2>
      <p className="text-dark-600 mt-2">Phase 5 — En construction</p>
    </div>
  )
}

export function CommunityPage() {
  return (
    <div className="p-6 text-center pt-20">
      <div className="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-primary-600">
        <Compass size={32} />
      </div>
      <h2 className="font-display text-2xl font-bold text-dark-800">Communauté</h2>
      <p className="text-dark-600 mt-2">Phase 4 — En construction</p>
    </div>
  )
}
