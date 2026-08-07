import { useState, useMemo } from 'react'
import { Search, RefreshCw, ChevronRight, ArrowDownLeft, ArrowUpRight, ShoppingBag, Coins, CornerUpLeft } from 'lucide-react'

const TX_CONFIGS = {
  deposit:         { label: 'Rechargement MoMo', icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  recharge:        { label: 'Rechargement MoMo', icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  withdraw:        { label: 'Retrait Mobile Money', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50' },
  transfer_out:    { label: 'Transfert envoyé', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-50' },
  transfer_in:     { label: 'Transfert reçu', icon: ArrowDownLeft, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  order_payment:   { label: 'Achat Produit MANG', icon: ShoppingBag, color: 'text-red-600', bg: 'bg-red-50' },
  order_received:  { label: 'Vente encaissée', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  order_refund:    { label: 'Remboursement', icon: CornerUpLeft, color: 'text-blue-600', bg: 'bg-blue-50' },
  pieces_purchase: { label: 'Achat de Pièces', icon: Coins, color: 'text-amber-600', bg: 'bg-amber-50' },
}

export default function TransactionListPro({ transactions, loading, onRefresh, onSelectTx }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Filtrage combiné (Texte + Catégorie)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const type = (tx.type || '').toLowerCase()
      const isCredit = Number(tx.amount) > 0
      
      // Filtre Onglet
      if (activeTab === 'in' && !isCredit) return false
      if (activeTab === 'out' && isCredit) return false
      if (activeTab === 'orders' && !type.includes('order')) return false

      // Filtre Recherche
      if (!searchTerm.trim()) return true
      const query = searchTerm.toLowerCase()
      const description = (tx.description || '').toLowerCase()
      const receipt = (tx.receipt_number || '').toLowerCase()
      const amountStr = Math.abs(Number(tx.amount)).toString()

      return description.includes(query) || receipt.includes(query) || amountStr.includes(query)
    })
  }, [transactions, searchTerm, activeTab])

  return (
    <div className="space-y-4">
      {/* Header Historique & Bouton Rafraîchir */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Historique des transactions</h3>
          <p className="text-xs text-gray-500">{filteredTransactions.length} transaction(s) enregistrée(s)</p>
        </div>
        <button
          onClick={onRefresh}
          className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
        >
          <RefreshCw size={15} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Champ de Recherche Intelligent */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, montant, n° reçu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
      </div>

      {/* Onglets Filtres Rapides */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'in', label: '📥 Entrées' },
          { id: 'out', label: '📤 Sorties' },
          { id: 'orders', label: '🛒 Commandes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-[#004D00] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liste des Transactions */}
      {loading ? (
        <div className="space-y-2 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-2xl">
            💳
          </div>
          <h4 className="font-bold text-gray-800 text-sm">Aucune transaction trouvée</h4>
          <p className="text-xs text-gray-400 mt-1">Vos dépôts, retraits et ventes s'afficheront ici en temps réel.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
            const isCredit = Number(tx.amount) > 0
            const amountFCFA = Math.abs(Number(tx.amount))
            const typeKey = (tx.type || '').toLowerCase()
            const cfg = TX_CONFIGS[typeKey] || { label: 'Transaction', icon: ArrowUpRight, color: 'text-gray-600', bg: 'bg-gray-50' }
            const Icon = cfg.icon
            const txDate = new Date(tx.created_at)

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTx(tx)}
                className="group flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-emerald-300 transition-all cursor-pointer active:scale-[0.98]"
              >
                {/* Icône de type */}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                  <Icon size={20} />
                </div>

                {/* Détails texte */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 text-xs truncate">{cfg.label}</p>
                    {tx.receipt_number && (
                      <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        #{tx.receipt_number.slice(-6)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{tx.description || 'Opération MANG Wallet'}</p>
                  <p className="text-[10px] text-gray-400 font-medium">
                    {txDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} à {txDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Montant & Flèche */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-black text-sm sm:text-base ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : '-'}{amountFCFA.toLocaleString('fr-FR')} FCFA
                  </p>
                  <span className="text-[9px] font-bold text-gray-400 uppercase">Validé</span>
                </div>

                <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
