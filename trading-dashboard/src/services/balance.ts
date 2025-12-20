import { supabase } from './api'

export const accountBalanceService = {
  async getLatestBalance(userId: string) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('account_balances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (error) throw error
    return data
  },
  
  subscribeToBalance(userId: string, callback: (balance: number) => void) {
    if (!supabase) return () => {}
    
    return supabase
      .channel('account_balances')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'account_balances',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.new && 'total_equity' in payload.new) {
             // @ts-ignore
             callback(payload.new.total_equity)
        }
      })
      .subscribe()
  }
}
