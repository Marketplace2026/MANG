import { ArrowDownLeft, ArrowUpRight, Send, QrCode, Sparkles } from 'lucide-react'

export default function QuickActionsGrid({ onDeposit, onWithdraw, onTransfer, onScan }) {
  const ACTIONS = [
    {
      id: 'deposit',
      label: 'Dépôt',
      sublabel: 'MoMo / Card',
      icon: ArrowDownLeft,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      badge: '0% Frais',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      onClick: onDeposit,
    },
    {
      id: 'withdraw',
      label: 'Retrait',
      sublabel: 'Vers Mobile',
      icon: ArrowUpRight,
      color: 'bg-red-600 hover:bg-red-700 text-white',
      badge: 'Instant',
      badgeColor: 'bg-red-100 text-red-800',
      onClick: onWithdraw,
    },
    {
      id: 'transfer',
      label: 'Envoyer',
      sublabel: 'MANG à MANG',
      icon: Send,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      badge: 'Gratuit',
      badgeColor: 'bg-blue-100 text-blue-800',
      onClick: onTransfer,
    },
    {
      id: 'scan',
      label: 'Scan & Pay',
      sublabel: 'Scanner QR',
      icon: QrCode,
      color: 'bg-amber-500 hover:bg-amber-600 text-white',
      badge: 'Flash',
      badgeColor: 'bg-amber-100 text-amber-900',
      onClick: onScan,
    },
  ]

  return (
    <div className="my-5">
      <div className="grid grid-cols-4 gap-2.5">
        {ACTIONS.map((act) => {
          const Icon = act.icon
          return (
            <button
              key={act.id}
              onClick={act.onClick}
              className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              {/* Badge supérieur */}
              <span className={`absolute -top-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${act.badgeColor}`}>
                {act.badge}
              </span>

              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-sm transition-transform group-hover:scale-110 ${act.color}`}>
                <Icon size={22} />
              </div>

              <span className="font-bold text-gray-800 text-xs leading-tight">{act.label}</span>
              <span className="text-[10px] text-gray-400 font-medium">{act.sublabel}</span>
            </button>
          )
        })}
      </div>

      {/* Bannière de réassurance des économies */}
      <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-bold">
            Transferts inter-membres MANG <span className="underline decoration-emerald-500">100% gratuits</span>
          </p>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-200 text-emerald-800 uppercase">
          0 FCFA
        </span>
      </div>
    </div>
  )
}
