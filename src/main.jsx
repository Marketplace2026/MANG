// Capture précoce de l'événement d'installation PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__mangDeferredPrompt = e
})

if ('serviceWorker' in navigator) { 
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
