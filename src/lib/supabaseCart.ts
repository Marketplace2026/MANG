import { supabase } from './supabase'
import { toast } from 'react-hot-toast'

/** Fetch the cart for a given user */
export const getCart = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single()
    if (error) throw error
    return data.items as any[]
  } catch (e: any) {
    console.error('Error fetching cart', e)
    toast.error('Impossible de récupérer le panier')
    return []
  }
}

/** Upsert the cart items for a user */
export const upsertCart = async (userId: string, items: any[]) => {
  try {
    const { error } = await supabase.from('carts').upsert([
      { user_id: userId, items },
    ])
    if (error) throw error
  } catch (e: any) {
    console.error('Error upserting cart', e)
    toast.error('Impossible de sauvegarder le panier')
    throw e
  }
}

/** Delete a user's cart */
export const deleteCart = async (userId: string) => {
  try {
    const { error } = await supabase.from('carts').delete().eq('user_id', userId)
    if (error) throw error
  } catch (e: any) {
    console.error('Error deleting cart', e)
    toast.error('Impossible de supprimer le panier')
    throw e
  }
}
