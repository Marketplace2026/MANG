import React, { useState, useEffect } from 'react'
import {
  Bot, Sparkles, Send, CheckCircle2, ShieldCheck,
  Settings, Key, AlertCircle, RefreshCw, MessageSquare,
  TrendingUp, Award, Zap, Lightbulb
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  generateAutoReply,
  analyzeShopPerformance,
  getGeminiApiKey,
  setGeminiApiKey
} from '@/lib/ai'

export default function VendorCopilotPanel({ shop, products = [] }) {
  const shopId = shop?.id || 'default'
  const storageKey = `mang_copilot_settings_${shopId}`

  // Paramètres du copilote
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {
        enabled: true,
        instructions: 'Livraison possible dans tout le département. Réponse courtoise et incitation à valider sur MANG.',
        tone: 'professional'
      }
    } catch {
      return { enabled: true, instructions: '', tone: 'professional' }
    }
  })

  const [apiKey, setApiKey] = useState(() => getGeminiApiKey() || '')
  const [showKeyConfig, setShowKeyConfig] = useState(false)
  const [auditResult, setAuditResult] = useState(null)
  const [auditing, setAuditing] = useState(false)

  // Simulateur de test
  const [testPrompt, setTestPrompt] = useState('Bonjour, vous livrez à Cotonou ? Quel est votre meilleur prix ?')
  const [testReply, setTestReply] = useState('')
  const [testing, setTesting] = useState(false)

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
      toast.success('Réglages du Copilote enregistrés !')
    } catch {}
  }

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKey)
    toast.success('Clé Gemini enregistrée avec succès !')
    setShowKeyConfig(false)
  }

  const handleRunAudit = async () => {
    setAuditing(true)
    try {
      const result = await analyzeShopPerformance({ shop, products })
      setAuditResult(result)
      toast.success('Audit commercial terminé !')
    } catch {
      toast.error('Erreur lors de l\'audit')
    } finally {
      setAuditing(false)
    }
  }

  const handleTestBot = async () => {
    if (!testPrompt.trim()) return
    setTesting(true)
    try {
      const reply = await generateAutoReply({
        incomingMessage: testPrompt,
        shop,
        products,
        instructions: settings.instructions
      })
      setTestReply(reply)
    } catch {
      toast.error('Erreur de simulation')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-5 pb-8 font-sans">
      
      {/* ── CARTE PRINCIPALE DU COPILOTE ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003d00] via-[#004D00] to-dark-900 p-6 text-white shadow-xl border border-emerald-500/20">
        
        {/* Glow décoratif */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-gold-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Bot className="w-8 h-8 text-gold-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-wide text-white">Copilote Vendeur IA</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gold-400/20 text-gold-300 border border-gold-400/30 flex items-center gap-1">
                  <Sparkles size={11} /> 24h/24 & 7j/7
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1 max-w-xl leading-relaxed">
                Votre assistant commercial intelligent qui répond instantanément aux acheteurs dans la messagerie, même quand vous êtes au champ ou endormi.
              </p>
            </div>
          </div>

          {/* Interrupteur Activation */}
          <div className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-2xl border border-white/15 self-start md:self-auto">
            <div className="text-right">
              <span className="block text-xs font-bold text-white">Répondeur 24/7</span>
              <span className={`text-[10px] font-extrabold uppercase ${settings.enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                {settings.enabled ? 'Activé' : 'Désactivé'}
              </span>
            </div>
            <button
              onClick={() => updateSetting('enabled', !settings.enabled)}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${settings.enabled ? 'bg-emerald-500' : 'bg-white/20'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform transform shadow-md ${settings.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Consignes du Vendeur */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gold-300 mb-1.5 flex items-center gap-1.5">
              <Lightbulb size={14} /> Consignes personnalisées pour le bot :
            </label>
            <textarea
              value={settings.instructions}
              onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
              onBlur={() => updateSetting('instructions', settings.instructions)}
              rows={3}
              placeholder="Ex: Livraison disponible dès 10 000 FCFA. Prix non négociable pour moins de 5 sacs. Appeler si urgence."
              className="w-full text-xs p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-gold-400 transition-all resize-none"
            />
            <p className="text-[10px] text-white/60 mt-1">
              Le Copilote appliquera ces règles à chaque fois qu'un client posera une question.
            </p>
          </div>

          {/* Moteur & Clé Gemini Optionnelle */}
          <div className="flex flex-col justify-between bg-white/5 p-3.5 rounded-2xl border border-white/10">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap size={14} className="text-gold-400" /> Moteur IA : MANG Local + Gemini
                </span>
                <button
                  onClick={() => setShowKeyConfig(!showKeyConfig)}
                  className="text-[11px] text-gold-300 hover:underline flex items-center gap-1"
                >
                  <Key size={12} /> {apiKey ? 'Clé configurée' : 'Ajouter une clé'}
                </button>
              </div>
              <p className="text-[11px] text-white/70 mt-1">
                Le moteur intelligent local fonctionne instantanément à 100% sans configuration. Vous pouvez aussi relier une clé Google Gemini 1.5 Flash gratuite.
              </p>
            </div>

            {showKeyConfig && (
              <div className="mt-3 flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Collez votre clé API Gemini"
                  className="flex-1 text-xs px-3 py-2 rounded-xl bg-black/30 border border-white/20 text-white focus:outline-none"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="px-3 py-2 bg-gold-400 hover:bg-gold-500 text-dark-900 font-bold text-xs rounded-xl transition-colors"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── TESTEUR EN DIRECT (SIMULATEUR DU RÉPONDEUR) ── */}
      <div className="bg-white rounded-3xl p-5 border border-surface-200 shadow-sm">
        <h3 className="text-sm font-black text-dark-900 flex items-center gap-2 mb-2">
          <MessageSquare size={16} className="text-primary-700" />
          Tester les réponses de votre Copilote en direct
        </h3>
        <p className="text-xs text-dark-500 mb-3">
          Saisissez une fausse question d'un acheteur pour voir exactement comment votre Copilote réagira :
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Ex: Quel est le prix du sac et livrez-vous à Calavi ?"
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:border-primary-600 font-medium"
          />
          <button
            onClick={handleTestBot}
            disabled={testing}
            className="px-4 py-2.5 bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-green transition-all"
          >
            {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            <span>Tester</span>
          </button>
        </div>

        {testReply && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex gap-3 animate-fade-in">
            <Bot size={20} className="text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-dark-800 leading-relaxed">
              <span className="font-bold text-emerald-800 block mb-0.5">Réponse générée par le Copilote :</span>
              {testReply}
            </div>
          </div>
        )}
      </div>

      {/* ── AUDIT & CONSEILS COMMERCIAUX IA ── */}
      <div className="bg-white rounded-3xl p-5 border border-surface-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-black text-dark-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-gold-500" />
              Audit & Conseils Commerciaux IA
            </h3>
            <p className="text-xs text-dark-500 mt-0.5">
              Obtenez des recommandations agronomiques et commerciales pour vendre plus et plus vite.
            </p>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={auditing}
            className="px-4 py-2 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-500 hover:to-amber-600 text-dark-900 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            {auditing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{auditResult ? 'Actualiser l\'audit' : 'Lancer l\'audit'}</span>
          </button>
        </div>

        {auditResult && (
          <div className="mt-4 p-4 rounded-2xl bg-surface-50 border border-surface-200 space-y-3">
            <div className="text-xs text-dark-800 space-y-2 whitespace-pre-line leading-relaxed">
              {auditResult}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
