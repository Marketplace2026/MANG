import React, { useState, useEffect, useRef } from 'react'
import { X, Camera, Search, Check, Users, ArrowRight, Loader2, Sparkles, UserPlus } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase, uploadImage, compressImage, BUCKETS } from '@/lib/supabase'

export default function CreateGroupModal({ open, onClose, user, onGroupCreated }) {
  const [step, setStep] = useState(1) // 1: infos du groupe, 2: sélection des membres
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const [search, setSearch] = useState('')
  const [usersList, setUsersList] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open) {
      loadPotentialMembers()
    } else {
      reset()
    }
  }, [open])

  const reset = () => {
    setStep(1)
    setTitle('')
    setDescription('')
    setAvatarFile(null)
    setAvatarPreview(null)
    setSearch('')
    setSelectedUsers([])
    setSubmitting(false)
  }

  const loadPotentialMembers = async (searchQuery = '') => {
    setLoadingUsers(true)
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', user.id)
        .limit(30)

      if (searchQuery.trim()) {
        query = query.ilike('username', `%${searchQuery.trim()}%`)
      }

      const { data } = await query
      setUsersList(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    loadPotentialMembers(val)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const toggleSelectUser = (u) => {
    if (selectedUsers.some(item => item.id === u.id)) {
      setSelectedUsers(prev => prev.filter(item => item.id !== u.id))
    } else {
      setSelectedUsers(prev => [...prev, u])
    }
  }

  const handleNextStep = () => {
    if (!title.trim()) {
      toast.error('Veuillez donner un nom au groupe')
      return
    }
    setStep(2)
  }

  const handleCreateGroup = async () => {
    if (!title.trim()) {
      toast.error('Le nom du groupe est requis')
      return
    }

    setSubmitting(true)
    try {
      let avatarUrl = null
      if (avatarFile) {
        const compressed = await compressImage(avatarFile, 400, 0.75)
        const path = `groups/${Date.now()}.jpg`
        avatarUrl = await uploadImage(BUCKETS.AVATARS || 'avatars', compressed, path)
      }

      const memberIds = selectedUsers.map(u => u.id)

      // 1. Tenter via la RPC create_group_conversation
      const { data: convId, error: rpcError } = await supabase.rpc('create_group_conversation', {
        p_title: title.trim(),
        p_description: description.trim() || null,
        p_avatar_url: avatarUrl,
        p_member_ids: memberIds
      })

      let finalConvId = convId

      // 2. Fallback manuel gracieux si la RPC n'a pas encore été migrée en base
      if (rpcError || !convId) {
        const { data: newConv, error: insErr } = await supabase.from('conversations').insert({
          is_group: true,
          title: title.trim(),
          description: description.trim() || null,
          avatar_url: avatarUrl,
          created_by: user.id,
          buyer_id: user.id,
          seller_id: user.id,
          last_message: `🎉 Groupe "${title.trim()}" créé`,
          last_message_at: new Date().toISOString()
        }).select('id').single()

        if (insErr) throw insErr
        finalConvId = newConv.id

        // Ajouter les membres dans conversation_members
        const allMembers = [
          { conversation_id: finalConvId, user_id: user.id, role: 'admin' },
          ...memberIds.map(uid => ({ conversation_id: finalConvId, user_id: uid, role: 'member' }))
        ]
        await supabase.from('conversation_members').insert(allMembers).catch(() => {})

        // Message initial
        await supabase.from('messages').insert({
          conversation_id: finalConvId,
          sender_id: user.id,
          content: `🎉 ${user.user_metadata?.username || 'Un utilisateur'} a créé le groupe "${title.trim()}"`,
          type: 'text'
        }).catch(() => {})
      }

      toast.success(`Groupe "${title.trim()}" créé avec succès ! 👥`)
      onGroupCreated?.(finalConvId)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la création du groupe')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-[#202c33] rounded-3xl shadow-2xl border border-surface-200 dark:border-[#3a3b3c] overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* HEADER MODAL WHATSAPP */}
        <div className="bg-[#008069] dark:bg-[#111b21] p-4 text-white flex items-center justify-between border-b border-[#006e5a] dark:border-[#2a3942]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <Users size={18} className="text-white"/>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Nouveau Groupe</h3>
              <p className="text-[11px] text-white/70">
                {step === 1 ? 'Étape 1 : Infos du groupe' : `Étape 2 : Ajouter des membres (${selectedUsers.length})`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
          >
            <X size={17} className="text-white"/>
          </button>
        </div>

        {/* CONTENU : ÉTAPE 1 (INFOS GROUPE) */}
        {step === 1 ? (
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Avatar du groupe */}
            <div className="flex flex-col items-center justify-center py-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full bg-[#f0f2f5] dark:bg-[#2a3942] border-2 border-dashed border-[#00a884] flex flex-col items-center justify-center overflow-hidden hover:opacity-90 active:scale-95 transition-all shadow-md group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Aperçu" className="w-full h-full object-cover"/>
                ) : (
                  <>
                    <Camera size={26} className="text-[#00a884] mb-1"/>
                    <span className="text-[9px] font-bold text-dark-500 dark:text-gray-300 uppercase tracking-wider">Photo</span>
                  </>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={20} className="text-white"/>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
              <span className="text-[11px] text-dark-400 dark:text-gray-400 mt-1.5 font-medium">Ajouter une photo de groupe</span>
            </div>

            {/* Nom du groupe */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-dark-700 dark:text-gray-300">
                Nom du groupe *
              </label>
              <input
                type="text"
                maxLength={50}
                placeholder="Ex: Coopérative Maraîchère, Grossistes Maïs..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-[#f0f2f5] dark:bg-[#2a3942] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-dark-900 dark:text-white outline-none border border-transparent focus:border-[#00a884] transition-all"
              />
              <span className="text-[10px] text-dark-400 dark:text-gray-500 block text-right">{title.length} / 50</span>
            </div>

            {/* Description optionnelle */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-dark-700 dark:text-gray-300">
                Description du groupe <span className="font-normal text-dark-400">(optionnel)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Objectif du groupe, règles de négociation, région..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[#f0f2f5] dark:bg-[#2a3942] rounded-xl px-3.5 py-2 text-xs font-medium text-dark-900 dark:text-white outline-none border border-transparent focus:border-[#00a884] transition-all resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              disabled={!title.trim()}
              className="w-full py-3 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md mt-4"
            >
              <span>Suivant : Sélectionner les membres</span>
              <ArrowRight size={14}/>
            </button>
          </div>
        ) : (
          /* CONTENU : ÉTAPE 2 (AJOUT MEMBRES) */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Barre de recherche membres */}
            <div className="p-3 border-b border-surface-200 dark:border-[#3a3b3c] bg-surface-50 dark:bg-[#111b21]">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-gray-400"/>
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur par pseudo..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#2a3942] rounded-xl text-xs font-medium text-dark-900 dark:text-white outline-none border border-surface-200 dark:border-dark-600 focus:border-[#00a884]"
                />
              </div>

              {/* Badges des membres sélectionnés (Horizontal Scroll) */}
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar pb-1">
                  {selectedUsers.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 shrink-0 animate-scale-in"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                        {u.username ? u.username[0].toUpperCase() : 'U'}
                      </span>
                      <span className="truncate max-w-[90px]">@{u.username}</span>
                      <button
                        type="button"
                        onClick={() => toggleSelectUser(u)}
                        className="w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center hover:bg-emerald-300"
                      >
                        <X size={10} className="text-emerald-900 dark:text-white"/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liste des utilisateurs à cocher */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-surface-100 dark:divide-[#2a3942]">
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#00a884]"/>
                </div>
              ) : usersList.length === 0 ? (
                <div className="text-center py-8 text-xs text-dark-400 dark:text-gray-400">
                  Aucun utilisateur trouvé
                </div>
              ) : (
                usersList.map(u => {
                  const isChecked = selectedUsers.some(item => item.id === u.id)
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectUser(u)}
                      className={clsx(
                        'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors active:scale-98 select-none',
                        isChecked
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                          : 'hover:bg-surface-50 dark:hover:bg-[#2a3942]/50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover"/>
                          ) : (
                            u.username ? u.username[0].toUpperCase() : 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-dark-900 dark:text-white truncate">@{u.username}</p>
                          {u.full_name && (
                            <p className="text-[11px] text-dark-500 dark:text-gray-400 truncate">{u.full_name}</p>
                          )}
                        </div>
                      </div>

                      {/* Case à cocher verte ronde façon WhatsApp */}
                      <div className={clsx(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                        isChecked
                          ? 'bg-[#00a884] border-[#00a884] text-white shadow-xs'
                          : 'border-surface-300 dark:border-dark-600 bg-white dark:bg-dark-800'
                      )}>
                        {isChecked && <Check size={12} strokeWidth={3} className="text-white"/>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Barre inférieure de validation */}
            <div className="p-3 bg-surface-50 dark:bg-[#111b21] border-t border-surface-200 dark:border-[#3a3b3c] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2.5 text-xs font-bold text-dark-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-[#2a3942] rounded-xl transition-all"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={submitting}
                className="flex-1 py-3 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white"/>
                    <span>Création du groupe...</span>
                  </>
                ) : (
                  <>
                    <Users size={14}/>
                    <span>Créer le groupe ({selectedUsers.length} membre{selectedUsers.length > 1 ? 's' : ''})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
