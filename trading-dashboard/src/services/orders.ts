import { supabase } from './api'
import type { Order, Position } from '../types'

export const orderService = {
  async getOrders(userId: string): Promise<Order[]> {
    if (!supabase) {
      // Mock data for development
      return [
        {
          id: '1',
          user_id: userId,
          symbol: 'BTC-USDT',
          side: 'BUY',
          type: 'MARKET',
          quantity: 0.01,
          status: 'EXECUTED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    }
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order> {
    if (!supabase) {
      return {
        id: Date.now().toString(),
        ...order,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
    
    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    if (!supabase) {
      throw new Error('Mock update not implemented')
    }
    
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async cancelOrder(id: string): Promise<void> {
    if (!supabase) {
      return
    }
    
    const { error } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED' })
      .eq('id', id)
    
    if (error) throw error
  },
}

export const positionService = {
  async getPositions(userId: string): Promise<Position[]> {
    if (!supabase) {
      // Mock data for development
      return [
        {
          id: '1',
          order_id: '1',
          symbol: 'BTC-USDT',
          quantity: 0.01,
          entry_price: 45000,
          current_price: 46000,
          unrealized_pnl: 100,
          is_open: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    }
    
    const { data, error } = await supabase
      .from('positions')
      .select('*, orders!inner(user_id)')
      .eq('orders.user_id', userId)
      .eq('is_open', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async closePosition(id: string): Promise<void> {
    if (!supabase) {
      return
    }
    
    const { error } = await supabase
      .from('positions')
      .update({ 
        is_open: false, 
        closed_at: new Date().toISOString() 
      })
      .eq('id', id)
    
    if (error) throw error
  },
}
