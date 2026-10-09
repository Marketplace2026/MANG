import React from 'react'
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })

    // Si c'est une erreur de chunk / module dynamique, recharger automatiquement une fois
    const isChunkError = 
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed')

    if (isChunkError) {
      const reloadKey = 'mang_chunk_auto_reload'
      const lastReload = sessionStorage.getItem(reloadKey)
      const now = Date.now()
      if (!lastReload || now - parseInt(lastReload) > 15000) {
        sessionStorage.setItem(reloadKey, now.toString())
        window.location.reload()
      }
    }
  }

  handleHardRefresh = async () => {
    try {
      // Nettoyer tous les caches Service Worker
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
      // Désinscrire temporairement les service workers pour forcer la mise à jour
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.unregister()
        }
      }
    } catch (e) {
      console.warn('Cache clearing error:', e)
    }
    // Recharger la page sans cache
    window.location.href = '/accueil?t=' + Date.now()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-surface-200 text-center flex flex-col items-center">
            
            {/* Logo / Icône */}
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600">
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-xl font-black text-dark-900 mb-2">
              Une mise à jour est disponible
            </h1>
            
            <p className="text-sm text-dark-500 mb-6 leading-relaxed">
              Une nouvelle version de MANG a été déployée ou votre connexion a été interrompue. Rafraîchissez l'application pour charger les dernières données.
            </p>

            {/* Boutons d'action */}
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={this.handleHardRefresh}
                className="w-full h-12 bg-primary-700 hover:bg-primary-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-green active:scale-98 transition-all text-sm"
              >
                <RefreshCw size={18} />
                <span>Recharger l'application</span>
              </button>

              <button
                onClick={() => { window.location.href = '/accueil' }}
                className="w-full h-11 bg-surface-100 hover:bg-surface-200 text-dark-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all text-sm"
              >
                <Home size={18} />
                <span>Retour à l'accueil</span>
              </button>
            </div>

            {/* Détails techniques escamotables en cas de besoin */}
            {this.state.error && (
              <details className="mt-6 text-left w-full bg-surface-100 p-3 rounded-xl text-xs text-dark-700 overflow-auto max-h-40">
                <summary className="font-semibold cursor-pointer text-dark-900">Détails techniques</summary>
                <pre className="mt-2 text-[10px] whitespace-pre-wrap">{this.state.error.toString()}</pre>
              </details>
            )}

          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
