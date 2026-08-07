import { useState, useEffect } from 'react'
import { X, Lock, ShieldCheck, ArrowRight, Clock, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function EscrowBreakdownModal({ open, onClose, user, wallet }) {
  const [escrowOrders, setEscrowOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && user) {
      loadEscrowOrders()
    }
  }, [open, user])

  const loadEscrowOrders = async () => {
    setLoading(true)
    try {
      // Charger les commandes où le solde est bloqué en escrow (seller & status in pending/accepted/paid)
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:products(name, images))')
        .eq('seller_id', user.id)
        .in('status', ['paid', 'accepted'])
        .order('created_at', { ascending: false })

      if (!error && data) {
        setEscrowOrders(data)
      } else {
        setEscrowOrders([])
      }
    } catch {
      setEscrowOrders([])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const reservedFCFA = wallet?.balance_reserved || 0

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] flex flex-col max-w-[480px] mx-auto animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-amber-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-base">Fonds en Escrow MANG</h3>
              <p className="text-xs text-amber-700 font-medium">Garantie Anti-Fraude Achat / Vente</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-amber-200">
            <X size={16} className="text-amber-800" />
          </button>
        </div>

        {/* Détails */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-100 mb-1">Montant total bloqué</p>
            <h2 className="font-display font-black text-4xl">{reservedFCFA.toLocaleString('fr-FR')} FCFA</h2>
            <p className="text-xs text-amber-100/80 mt-2">
              Ces fonds vous seront versés dès que l'acheteur aura confirmé la réception de ses produits frais.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs font-semibold">
            <ShieldCheck size={18} className="text-blue-600 flex-shrink-0" />
            <p>Le système Escrow MANG protège le vendeur et l'acheteur. Aucun risque d'impayé !</p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 text-sm mb-3">Commandes associées ({escrowOrders.length})</h4>
            {loading ? (
              <div className="space-y-2 py-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : escrowOrders.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 rounded-2xl border border-gray-100">
                <Clock size={24} className="text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-500">Aucune commande en attente de déblocage</p>
                <p className="text-[11px] text-gray-400 mt-1">Vos ventes sécurisées apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {escrowOrders.map((ord) => (
                  <div key={ord.id} className="p-3.5 bg-white border border-gray-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-gray-900">Commande #{ord.order_number || ord.id.slice(0, 8)}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Statut : <span className="font-bold text-amber-600 uppercase">{ord.status}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-emerald-700">+{Number(ord.total_amount || 0).toLocaleString('fr-FR')} FCFA</p>
                      <span className="text-[10px] text-gray-400 font-medium">Libération imminente</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
