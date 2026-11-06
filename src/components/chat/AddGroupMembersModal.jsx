import React, { useState, useEffect } from 'react'
import { X, Search, Check, Users, Loader2, UserPlus } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function AddGroupMembersModal({ open, onClose, conversationId, currentMemberIds = [], onMembersAdded }) {
  const [search, setSearch] = useState('')
  const [usersList, setUsersList] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      loadUsers('')
      setSelectedUsers([])
      setSearch('')
    }
  }, [open, conversationId])

  const loadUsers = async (q = '') => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .limit(30)

      if (currentMemberIds.length > 0) {
        query = query.not('id', 'in', `(${currentMemberIds.join(',')})`)
      }

      if (q.trim()) {
        query = query.ilike('username', `%${q.trim()}%`)
      }

      const { data } = await query
      setUsersList(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    loadUsers(val)
  }

  const toggleSelectUser = (u) => {
    if (selectedUsers.some(item => item.id === u.id)) {
      setSelectedUsers(prev => prev.filter(item => item.id !== u.id))
    } else {
      setSelectedUsers(prev => [...prev, u])
    }
  }

  const handleAdd = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Sélectionnez au moins un utilisateur')
      return
    }

    setSubmitting(true)
    try {
      const userIds = selectedUsers.map(u => u.id)

      // 1. Tenter via RPC add_group_members
      const { error: rpcErr } = await supabase.rpc('add_group_members', {
        p_conv_id: conversationId,
        p_user_ids: userIds
      })

      // 2. Fallback manuel si la RPC n'est pas encore migrée
      if (rpcErr) {
        const rows = userIds.map(uid => ({
          conversation_id: conversationId,
          user_id: uid,
          role: 'member'
        }))
        await supabase.from('conversation_members').insert(rows)
      }

      toast.success(`${selectedUsers.length} membre(s) ajouté(s) au groupe !`)
      onMembersAdded?.()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'ajout des membres')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-[#202c33] rounded-3xl shadow-2xl border border-surface-200 dark:border-[#3a3b3c] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-[#008069] dark:bg-[#111b21] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus size={18} />
            <h3 className="font-bold text-sm">Ajouter des membres</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="p-3 border-b border-surface-200 dark:border-[#3a3b3c]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 dark:text-gray-400"/>
            <input
              type="text"
              placeholder="Rechercher par pseudo..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 bg-surface-100 dark:bg-[#2a3942] rounded-xl text-xs font-medium text-dark-900 dark:text-white outline-none border border-transparent focus:border-[#00a884]"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-surface-100 dark:divide-[#2a3942]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#00a884]"/>
            </div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-8 text-xs text-dark-400 dark:text-gray-400">
              Aucun autre utilisateur disponible à ajouter
            </div>
          ) : (
            usersList.map(u => {
              const isChecked = selectedUsers.some(item => item.id === u.id)
              return (
                <div
                  key={u.id}
                  onClick={() => toggleSelectUser(u)}
                  className={clsx(
                    'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors select-none',
                    isChecked ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-surface-50 dark:hover:bg-[#2a3942]/50'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover"/> : (u.username ? u.username[0].toUpperCase() : 'U')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-dark-900 dark:text-white truncate">@{u.username}</p>
                      {u.full_name && <p className="text-[11px] text-dark-500 dark:text-gray-400 truncate">{u.full_name}</p>}
                    </div>
                  </div>
                  <div className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                    isChecked ? 'bg-[#00a884] border-[#00a884] text-white' : 'border-surface-300 dark:border-dark-600 bg-white dark:bg-dark-800'
                  )}>
                    {isChecked && <Check size={12} strokeWidth={3}/>}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="p-3 bg-surface-50 dark:bg-[#111b21] border-t border-surface-200 dark:border-[#3a3b3c] flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-dark-600 dark:text-gray-300">
            Annuler
          </button>
          <button
            onClick={handleAdd}
            disabled={submitting || selectedUsers.length === 0}
            className="flex-1 py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
          >
            {submitting ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            <span>Ajouter ({selectedUsers.length})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
