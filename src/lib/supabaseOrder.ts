import { supabase } from './supabase'
import { toast } from 'react-hot-toast'

/** Create an order record */
export const createOrder = async (
  userId: string,
  totalAmount: number,
  deliveryCity: string,
  deliveryFee: number
) => {
  try {
    const { data, error } = await supabase.from('orders').insert([
      {
        user_id: userId,
        total_amount: totalAmount,
        delivery_city: deliveryCity,
        delivery_fee: deliveryFee,
        status: 'pending',
      },
    ])
    if (error) throw error
    // return the newly created order id
    return data[0].id as string
  } catch (e: any) {
    console.error('Error creating order', e)
    toast.error('Impossible de créer la commande')
    throw e
  }
}

/** Insert order items linked to an order */
export const addOrderItems = async (
  orderId: string,
  items: {
    product_id: string
    seller_id: string
    qty: number
    price: number
    unit: 'kg' | 'sac' | 'tonne'
  }[]
) => {
  try {
    const rows = items.map((i) => ({
      order_id: orderId,
      product_id: i.product_id,
      seller_id: i.seller_id,
      qty: i.qty,
      price: i.price,
      unit: i.unit,
    }))
    const { error } = await supabase.from('order_items').insert(rows)
    if (error) throw error
  } catch (e: any) {
    console.error('Error adding order items', e)
    toast.error('Impossible d\'enregistrer les articles de la commande')
    throw e
  }
}
