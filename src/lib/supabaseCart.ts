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

/** Checkout with wallet */
export const checkoutWithWallet = async (
  userId: string,
  walletBalance: number,
  items: any[]
) => {
  try {
    // Compute total price
    const total = items.reduce((sum, i) => {
      const variantPrice = i.variant?.extraPrice ?? 0
      return sum + (i.product.price + variantPrice) * i.quantity
    }, 0)

    if (walletBalance < total) {
      toast.error('Solde insuffisant')
      return false
    }

    // Debit wallet via RPC (assumes existence)
    const { error: debitErr } = await supabase.rpc('debit_wallet', {
      user_id: userId,
      amount: total,
    })
    if (debitErr) throw debitErr

    // Create order
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({ user_id: userId, total_price: total })
      .single()
    if (orderErr) throw orderErr
    const orderId = orderData.id

    // Create order items
    const orderItems = items.map(it => ({
      order_id: orderId,
      product_id: it.product.id,
      quantity: it.quantity,
      price: it.product.price,
      seller_id: it.product.seller_id,
    }))
    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
    if (itemsErr) throw itemsErr

    // Clear user's cart
    await deleteCart(userId)
    toast.success('Commande créée avec succès')
    return true
  } catch (e: any) {
    console.error('Checkout error', e)
    toast.error('Erreur lors du paiement')
    return false
  }
}

