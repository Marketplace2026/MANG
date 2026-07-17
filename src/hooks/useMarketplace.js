import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useCacheStore } from '@/store'
import Fuse from 'fuse.js'
import toast from 'react-hot-toast'

// ============================================================
// useShops — Fetch boutiques avec SWR Caching
// ============================================================
export function useShops({ category, hasDelivery, search, limit = 20 } = {}) {
  const cacheKey = `${category || ''}_${hasDelivery || ''}_${search || ''}_${limit}`
  const { shopsCache, setShops } = useCacheStore()
  
  const cachedData = shopsCache[cacheKey] || []
  const [shops, setShopsState] = useState(cachedData)
  const [loading, setLoading] = useState(cachedData.length === 0)
  const [error, setError] = useState(null)

  const fetchShops = useCallback(async () => {
    // Si pas de données en cache, on affiche le loader
    if (!shopsCache[cacheKey] || shopsCache[cacheKey].length === 0) {
      setLoading(true)
    }
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

      setShopsState(result)
      setShops(cacheKey, result) // Enregistrer dans le cache global Zustand
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [category, hasDelivery, search, limit, cacheKey, setShops])

  useEffect(() => { 
    // Synchroniser l'état local si le cache change d'une autre manière (ex: prefetch)
    if (shopsCache[cacheKey]) {
      setShopsState(shopsCache[cacheKey])
    }
    fetchShops() 
  }, [fetchShops, cacheKey])

  return { shops, loading, error, refetch: fetchShops }
}

// ============================================================
// useShop — Fetch boutique individuelle avec SWR Caching
// ============================================================
export function useShop(slugOrId) {
  const { shopDetailsCache, setShopDetails } = useCacheStore()
  const cachedData = shopDetailsCache[slugOrId] || null

  const [shop, setShop] = useState(cachedData?.shop || null)
  const [products, setProducts] = useState(cachedData?.products || [])
  const [loading, setLoading] = useState(!cachedData)
  const { user } = useAuthStore()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  const fetchShop = useCallback(async () => {
    if (!cachedData) {
      setLoading(true)
    }
    try {
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

      // Enregistrer dans le cache Zustand
      setShopDetails(slugOrId, { shop: shopData, products: prods || [] })

      // Vérifier follow/like si connecté
      if (user) {
        const [followRes, likeRes] = await Promise.all([
          supabase.from('shop_followers').select('id').eq('shop_id', shopData.id).eq('user_id', user.id).maybeSingle(),
          supabase.from('shop_likes').select('id').eq('shop_id', shopData.id).eq('user_id', user.id).maybeSingle(),
        ])
        setIsFollowing(!!followRes.data)
        setIsLiked(!!likeRes.data)
      }
    } finally {
      setLoading(false)
    }
  }, [slugOrId, user, cachedData, setShopDetails])

  useEffect(() => {
    if (!slugOrId) return
    
    // Mettre à jour l'état local si le cache global a été mis à jour par prefetch
    if (shopDetailsCache[slugOrId]) {
      setShop(shopDetailsCache[slugOrId].shop)
      setProducts(shopDetailsCache[slugOrId].products)
    }
    fetchShop()
  }, [slugOrId, fetchShop])

  const toggleFollow = async () => {
    if (!user || !shop) return
    const prevFollowing = isFollowing
    setIsFollowing(!prevFollowing)
    setShop(s => ({ ...s, followers_count: s.followers_count + (prevFollowing ? -1 : 1) }))

    try {
      if (prevFollowing) {
        const { error } = await supabase.from('shop_followers').delete().eq('shop_id', shop.id).eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('shop_followers').insert({ shop_id: shop.id, user_id: user.id })
        if (error) throw error
      }
    } catch (e) {
      // Rollback en cas d'erreur
      setIsFollowing(prevFollowing)
      setShop(s => ({ ...s, followers_count: s.followers_count + (prevFollowing ? 1 : -1) }))
      toast.error('Erreur réseau')
    }
  }

  const toggleLike = async () => {
    if (!user || !shop) return
    const prevLiked = isLiked
    setIsLiked(!prevLiked)
    setShop(s => ({ ...s, likes_count: s.likes_count + (prevLiked ? -1 : 1) }))

    try {
      if (prevLiked) {
        const { error } = await supabase.from('shop_likes').delete().eq('shop_id', shop.id).eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('shop_likes').insert({ shop_id: shop.id, user_id: user.id })
        if (error) throw error
      }
    } catch (e) {
      // Rollback en cas d'erreur
      setIsLiked(prevLiked)
      setShop(s => ({ ...s, likes_count: s.likes_count + (prevLiked ? 1 : -1) }))
      toast.error('Erreur réseau')
    }
  }

  return { shop, products, loading, isFollowing, isLiked, toggleFollow, toggleLike, refetch: fetchShop }
}

// ============================================================
// useCategories avec SWR Caching
// ============================================================
export function useCategories() {
  const { categoriesCache, setCategories } = useCacheStore()
  const [categories, setCategoriesState] = useState(categoriesCache || [])
  const [loading, setLoading] = useState(!categoriesCache)

  const groupCats = (data) => {
    const grouped = {}
    ;(data || []).forEach(cat => {
      if (!grouped[cat.group_name]) grouped[cat.group_name] = []
      grouped[cat.group_name].push(cat)
    })
    return Object.entries(grouped).map(([name, items]) => ({ name, items }))
  }

  const [groups, setGroups] = useState(categoriesCache ? groupCats(categoriesCache) : [])

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        const result = data || []
        setCategoriesState(result)
        setGroups(groupCats(result))
        setCategories(result) // Cache Zustand
        setLoading(false)
      })
  }, [setCategories])

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
// useTopShops — Top 5 boutiques premium avec Caching
// ============================================================
export function useTopShops() {
  const { topShopsCache, setTopShops } = useCacheStore()
  const [topShops, setTopShopsState] = useState(topShopsCache || [])

  useEffect(() => {
    supabase
      .from('shops')
      .select('*, owner:profiles(id, username, avatar_url), category:categories(name, icon)')
      .eq('is_active', true)
      .gt('premium_level', 0)
      .order('premium_level', { ascending: false })
      .order('followers_count', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        const result = data || []
        setTopShopsState(result)
        setTopShops(result) // Cache Zustand
      })
  }, [setTopShops])

  return topShops
}
