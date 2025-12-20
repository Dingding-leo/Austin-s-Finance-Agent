import { supabase } from './api'
import type { TradingSession } from '../types'

export const sessionService = {
  async getSessions(userId: string): Promise<TradingSession[]> {
    if (!supabase) {
      // Mock data for development
      return [
        {
          id: '1',
          user_id: userId,
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString(),
          start_balance: 10000,
          end_balance: 10250,
          total_pnl: 250,
          trade_count: 5,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    }
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async startSession(userId: string, startBalance: number): Promise<TradingSession> {
    if (!supabase) {
      return {
        id: Date.now().toString(),
        user_id: userId,
        start_time: new Date().toISOString(),
        start_balance: startBalance,
        total_pnl: 0,
        trade_count: 0,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        start_time: new Date().toISOString(),
        start_balance: startBalance,
        total_pnl: 0,
        trade_count: 0,
        metadata: {},
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async endSession(id: string, endBalance: number): Promise<void> {
    if (!supabase) {
      return
    }
    
    const { error } = await supabase
      .from('sessions')
      .update({
        end_time: new Date().toISOString(),
        end_balance: endBalance,
      })
      .eq('id', id)
    
    if (error) throw error
  },
}
