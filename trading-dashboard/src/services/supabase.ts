import { createClient } from '@supabase/supabase-js'
import type { MarketPrice, Strategy, Order, Position, TradingSession } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const isValidUrl = (u: string) => /^https?:\/\//.test(u)
const isPlaceholder = (v: string) => /your_supabase_/i.test(v)

if (!supabaseUrl || !supabaseAnonKey || !isValidUrl(supabaseUrl) || isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
  console.warn('Supabase not configured or invalid. Falling back to mock services.')
}

export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl) && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Authentication service
export const authService = {
  async signIn(email: string, password: string) {
    if (!supabase) {
      const isAdmin = (email === 'admin' || email === 'admin@local') && password === 'admin'
      if (!isAdmin) throw new Error('Supabase not configured. Use admin/admin for mock login.')
      const user = {
        id: 'mock-admin',
        email: 'admin@local',
        user_metadata: { name: 'Admin' },
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('mock_user', JSON.stringify(user))
      return { user }
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  },

  async signUp(email: string, password: string, name: string) {
    if (!supabase) {
      const user = {
        id: 'mock-' + Date.now().toString(),
        email: email || 'user@local',
        user_metadata: { name: name || 'User' },
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('mock_user', JSON.stringify(user))
      return { user }
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })
    
    if (error) throw error
    return data
  },

  async signOut() {
    if (!supabase) {
      localStorage.removeItem('mock_user')
      return
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser() {
    if (!supabase) {
      const raw = localStorage.getItem('mock_user')
      return raw ? JSON.parse(raw) : null
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) {
      // Simple mock subscription no-op
      return () => {}
    }
    
    return supabase.auth.onAuthStateChange(callback)
  },
}

// Market data service
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

// Strategy service
export const strategyService = {
  async getStrategies(userId: string): Promise<Strategy[]> {
    if (!supabase) {
      const raw = localStorage.getItem('mock_strategies')
      if (raw) return JSON.parse(raw)
      const seed = [
        {
          id: '1',
          user_id: userId,
          name: 'Conservative Strategy',
          parameters: { risk_level: 'low', timeframe: '1h' },
          is_active: true,
          max_risk: 0.02,
          prompt: 'Focus on stable entries with tight risk.',
          technical_info: 'Uses MA crossover and RSI thresholds.',
          performance: { since: new Date().toISOString(), trades: 0, win_rate: 0, total_pnl: 0, avg_rr: 0 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: userId,
          name: 'Aggressive Strategy',
          parameters: { risk_level: 'high', timeframe: '15m' },
          is_active: false,
          max_risk: 0.05,
          prompt: 'Seek momentum breakouts with higher RR.',
          technical_info: 'Uses VWAP deviation and volume spikes.',
          performance: { since: new Date().toISOString(), trades: 0, win_rate: 0, total_pnl: 0, avg_rr: 0 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          user_id: userId,
          name: 'SMC Strategy',
          parameters: { risk_level: 'medium', timeframe: '5m' },
          is_active: true,
          max_risk: 0.03,
          prompt: 'Smart Money Concepts: liquidity grabs, BOS, FVG.',
          technical_info: 'Detects BOS/CHOCH, liquidity zones, fair value gaps.',
          performance: { since: new Date().toISOString(), trades: 0, win_rate: 0, total_pnl: 0, avg_rr: 0 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
      localStorage.setItem('mock_strategies', JSON.stringify(seed))
      return seed
    }
    
    const { data, error } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createStrategy(strategy: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>): Promise<Strategy> {
    if (!supabase) {
      const raw = localStorage.getItem('mock_strategies')
      const list: Strategy[] = raw ? JSON.parse(raw) : []
      const item: Strategy = {
        id: Date.now().toString(),
        ...strategy,
        performance: strategy.performance || { since: new Date().toISOString(), trades: 0, win_rate: 0, total_pnl: 0, avg_rr: 0 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      list.push(item)
      localStorage.setItem('mock_strategies', JSON.stringify(list))
      return item
    }
    
    const { data, error } = await supabase
      .from('strategies')
      .insert(strategy)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    if (!supabase) {
      const raw = localStorage.getItem('mock_strategies')
      const list: Strategy[] = raw ? JSON.parse(raw) : []
      const idx = list.findIndex(s => s.id === id)
      if (idx === -1) throw new Error('Strategy not found')
      const updated = { ...list[idx], ...updates, updated_at: new Date().toISOString() }
      list[idx] = updated
      localStorage.setItem('mock_strategies', JSON.stringify(list))
      return updated
    }
    
    const { data, error } = await supabase
      .from('strategies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteStrategy(id: string): Promise<void> {
    if (!supabase) {
      const raw = localStorage.getItem('mock_strategies')
      const list: Strategy[] = raw ? JSON.parse(raw) : []
      const next = list.filter(s => s.id !== id)
      localStorage.setItem('mock_strategies', JSON.stringify(next))
      return
    }
    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async executeStrategy(strategyId: string, symbol: string, action: 'BUY' | 'SELL', quantity: number) {
    if (!supabase) {
      return {
        orderId: Date.now().toString(),
        status: 'EXECUTED',
        message: 'Strategy executed successfully (mock)',
      }
    }
    
    const { data, error } = await supabase
      .functions
      .invoke('execute-strategy', {
        body: { strategyId, symbol, action, quantity },
      })
    
    if (error) throw error
    return data
  },
}

export const intradayReportService = {
  async getLatest(symbols: string[]) {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('intraday_reports')
      .select('*')
      .in('symbol', symbols)
      .order('generated_at', { ascending: false })
      .limit(2)
    if (error) throw error
    return data || []
  },
  async getHistory(symbol: string, limit = 20) {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('intraday_reports')
      .select('*')
      .eq('symbol', symbol)
      .order('generated_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },
  async saveEvaluation(id: string, realized_trend: string, is_correct: boolean) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('intraday_reports')
      .update({ realized_trend, is_correct, evaluated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async overallAccuracy() {
    if (!supabase) return { accuracy: 0 }
    const { data, error } = await supabase
      .from('intraday_reports')
      .select('is_correct')
    if (error) throw error
    const arr = (data || []).filter(r => r.is_correct !== null && r.is_correct !== undefined)
    const correct = arr.filter(r => r.is_correct).length
    const accuracy = arr.length ? Math.round((correct / arr.length) * 100) : 0
    return { accuracy }
  },
}

// Order service
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

// Position service
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

// Session service
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
