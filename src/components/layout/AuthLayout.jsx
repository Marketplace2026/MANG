import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-primary-900 via-primary-800 to-dark-900">
      {/* Décoration fond */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary-600/5 blur-3xl" />
      </div>

      {/* Logo header */}
      <div className="flex flex-col items-center pt-16 pb-8 relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-gold-400 flex items-center justify-center shadow-gold mb-4">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="font-display text-3xl text-white font-bold tracking-tight">MANG</h1>
        <p className="text-primary-300 text-sm mt-1 font-medium">Marché Agricole Nouvelle Génération</p>
      </div>

      {/* Formulaire */}
      <div className="flex-1 flex flex-col justify-start px-4 pb-8 relative z-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
