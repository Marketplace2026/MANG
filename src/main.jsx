if (typeof window !== 'undefined' && 'serviceWorker' in navigator) { 
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister()
    }
  }).catch(() => {})
  if ('caches' in window) {
    caches.keys().then(names => {
      for (let name of names) caches.delete(name)
    }).catch(() => {})
  }
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
