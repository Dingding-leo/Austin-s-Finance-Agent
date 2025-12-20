import { supabase } from './api'
import type { MarketPrice } from '../types'

export const marketService = {
  async getPrices(symbols: string[]): Promise<MarketPrice[]> {
    if (!supabase) {
      // Mock data for development
      return symbols.map(symbol => ({
        symbol,
        bid: Math.random() * 1000 + 100,
        ask: Math.random() * 1000 + 100,
        last: Math.random() * 1000 + 100,
        volume: Math.random() * 1000000,
        change24h: (Math.random() - 0.5) * 100,
        changePercent24h: (Math.random() - 0.5) * 10,
        timestamp: new Date().toISOString(),
      }))
    }
    
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .in('symbol', symbols)
      .order('timestamp', { ascending: false })
      .limit(symbols.length)
    
    if (error) throw error
    return data || []
  },

  subscribeToPrices(symbols: string[], callback: (price: MarketPrice) => void) {
    if (!supabase) {
      // Mock subscription for development
      const interval = setInterval(() => {
        symbols.forEach(symbol => {
          callback({
            symbol,
            bid: Math.random() * 1000 + 100,
            ask: Math.random() * 1000 + 100,
            last: Math.random() * 1000 + 100,
            volume: Math.random() * 1000000,
            change24h: (Math.random() - 0.5) * 100,
            changePercent24h: (Math.random() - 0.5) * 10,
            timestamp: new Date().toISOString(),
          })
        })
      }, 1000)
      
      return () => clearInterval(interval)
    }
    
    return supabase
      .channel('market_prices')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'market_prices',
        filter: `symbol=in.(${symbols.join(',')})`,
      }, (payload) => {
        callback(payload.new as MarketPrice)
      })
      .subscribe()
  },
}
