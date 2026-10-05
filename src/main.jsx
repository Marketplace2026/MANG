// Capture précoce de l'événement d'installation PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__mangDeferredPrompt = e
})

// Auto-recovery en cas d'erreur de chargement de chunk Vite (mise à jour de déploiement)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[MANG] Erreur de préchargement de chunk détectée, actualisation...', event)
  const reloadKey = 'mang_chunk_reload_ts'
  const lastReload = sessionStorage.getItem(reloadKey)
  const now = Date.now()
  if (!lastReload || now - parseInt(lastReload) > 10000) {
    sessionStorage.setItem(reloadKey, now.toString())
    window.location.reload()
  }
})

// Enregistrement et mise à jour proactive du Service Worker
if ('serviceWorker' in navigator) { 
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Forcer la recherche de mise à jour dès le chargement
      registration.update().catch(() => {})
    }).catch((err) => {
      console.warn('[MANG] ServiceWorker registration warning:', err)
    })
  })
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import './styles/globals.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
