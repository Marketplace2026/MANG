import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store'
import Fuse from 'fuse.js'

// ============================================================
// useShops — Fetch boutiques avec filtres
// ============================================================
export function useShops({ category, hasDelivery, search, limit = 20 } = {}) {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchShops = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('shops')
        .select(`
          *,
          owner:profiles(id, username, avatar_url, last_seen_at),
          category:categories(id, name, icon)
        `)
        .eq('is_active', true)
        .order('premium_level', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (category) query = query.eq('category_id', category)
      if (hasDelivery) query = query.eq('has_delivery', true)

      const { data, error: err } = await query
      if (err) throw err

      let result = data || []

      // Recherche floue côté client avec Fuse.js
      if (search && search.trim().length > 0) {
        const fuse = new Fuse(result, {
          keys: ['name', 'description', 'city'],
          threshold: 0.4,
          includeScore: true,
        })
        result = fuse.search(search).map(r => r.item)
      }

      setShops(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [category, hasDelivery, search, limit])

  useEffect(() => { fetchShops() }, [fetchShops])

  return { shops, loading, error, refetch: fetchShops }
}

// ============================================================
// useShop — Fetch boutique individuelle
// ============================================================
export function useShop(slugOrId) {
  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    if (!slugOrId) return
    fetchShop()
  }, [slugOrId, user])

  const fetchShop = async () => {
    setLoading(true)
    try {
      // Fetch par slug ou id
      const isUUID = /^[0-9a-f-]{36}$/.test(slugOrId)
      let query = supabase
        .from('shops')
        .select(`
          *,
          owner:profiles(id, username, avatar_url, last_seen_at, city),
          category:categories(id, name, icon)
        `)
      query = isUUID ? query.eq('id', slugOrId) : query.eq('slug', slugOrId)
      const { data: shopData } = await query.single()

      if (!shopData) { setLoading(false); return }
      setShop(shopData)

      // Fetch produits
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopData.id)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
      setProducts(prods || [])

      // Vérifier follow/like si connecté
      if (user) {
        const [followRes, likeRes] = await Promise.all([
          supabase.from('shop_followers').select('id').eq('shop_id', shopData.id).eq('user_id', user.id).single(),
          supabase.from('shop_likes').select('id').eq('shop_id', shopData.id).eq('user_id', user.id).single(),
        ])
        setIsFollowing(!!followRes.data)
        setIsLiked(!!likeRes.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleFollow = async () => {
    if (!user || !shop) return
    if (isFollowing) {
      await supabase.from('shop_followers').delete().eq('shop_id', shop.id).eq('user_id', user.id)
      setIsFollowing(false)
      setShop(s => ({ ...s, followers_count: Math.max(0, s.followers_count - 1) }))
    } else {
      await supabase.from('shop_followers').insert({ shop_id: shop.id, user_id: user.id })
      setIsFollowing(true)
      setShop(s => ({ ...s, followers_count: s.followers_count + 1 }))
    }
  }

  const toggleLike = async () => {
    if (!user || !shop) return
    if (isLiked) {
      await supabase.from('shop_likes').delete().eq('shop_id', shop.id).eq('user_id', user.id)
      setIsLiked(false)
      setShop(s => ({ ...s, likes_count: Math.max(0, s.likes_count - 1) }))
    } else {
      await supabase.from('shop_likes').insert({ shop_id: shop.id, user_id: user.id })
      setIsLiked(true)
      setShop(s => ({ ...s, likes_count: s.likes_count + 1 }))
    }
  }

  return { shop, products, loading, isFollowing, isLiked, toggleFollow, toggleLike, refetch: fetchShop }
}

// ============================================================
// useCategories
// ============================================================
export function useCategories() {
  const [categories, setCategories] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setCategories(data || [])
        // Grouper par group_name
        const grouped = {}
        ;(data || []).forEach(cat => {
          if (!grouped[cat.group_name]) grouped[cat.group_name] = []
          grouped[cat.group_name].push(cat)
        })
        setGroups(Object.entries(grouped).map(([name, items]) => ({ name, items })))
        setLoading(false)
      })
  }, [])

  return { categories, groups, loading }
}

// ============================================================
// useShopComments
// ============================================================
export function useShopComments(shopId) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  const fetchComments = useCallback(async () => {
    if (!shopId) return
    const { data } = await supabase
      .from('shop_comments')
      .select(`
        *,
        user:profiles(id, username, avatar_url),
        replies:shop_comments(
          *,
          user:profiles(id, username, avatar_url)
        )
      `)
      .eq('shop_id', shopId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(30)

    setComments(data || [])
    setLoading(false)
  }, [shopId])

  useEffect(() => { fetchComments() }, [fetchComments])

  const addComment = async (content, parentId = null) => {
    if (!user || !content.trim()) return
    const { data } = await supabase
      .from('shop_comments')
      .insert({ shop_id: shopId, user_id: user.id, content: content.trim(), parent_id: parentId })
      .select('*, user:profiles(id, username, avatar_url)')
      .single()
    if (data) {
      if (parentId) {
        setComments(prev => prev.map(c =>
          c.id === parentId
            ? { ...c, replies: [...(c.replies || []), data] }
            : c
        ))
      } else {
        setComments(prev => [{ ...data, replies: [] }, ...prev])
      }
    }
    return data
  }

  const deleteComment = async (commentId) => {
    await supabase.from('shop_comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  return { comments, loading, addComment, deleteComment, refetch: fetchComments }
}

// ============================================================
// useTopShops — Top 5 boutiques premium
// ============================================================
export function useTopShops() {
  const [topShops, setTopShops] = useState([])

  useEffect(() => {
    supabase
      .from('shops')
      .select('*, owner:profiles(id, username, avatar_url), category:categories(name, icon)')
      .eq('is_active', true)
      .gt('premium_level', 0)
      .order('premium_level', { ascending: false })
      .order('followers_count', { ascending: false })
      .limit(5)
      .then(({ data }) => setTopShops(data || []))
  }, [])

  return topShops
}
