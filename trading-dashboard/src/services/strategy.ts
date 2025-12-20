import { supabase } from './api'
import type { Strategy } from '../types'

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

  async executeStrategy(strategyId: string, symbol: string, action: 'BUY' | 'SELL', quantity: number, opts?: { masterPassword: string; dryRun?: boolean; tp?: number; sl?: number; leverage?: number; allocationPct?: number }) {
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
        body: { strategyId, symbol, action, quantity, masterPassword: opts?.masterPassword || '', dryRun: opts?.dryRun ?? true, tp: opts?.tp, sl: opts?.sl, leverage: opts?.leverage, allocationPct: opts?.allocationPct },
      })
    
    if (error) throw error
    return data
  },
}

export const strategyAssetsService = {
  async getAssets(userId: string, strategyId: string) {
    if (!supabase) {
      const raw = localStorage.getItem(`assets_${userId}_${strategyId}`)
      return raw ? JSON.parse(raw) : []
    }
    const { data, error } = await supabase
      .from('strategy_assets')
      .select('*')
      .eq('user_id', userId)
      .eq('strategy_id', strategyId)
    if (error) throw error
    return data || []
  },
  async setAsset(userId: string, strategyId: string, symbol: string, active: boolean) {
    if (!supabase) {
      const list = await this.getAssets(userId, strategyId)
      const idx = list.findIndex((a: any) => a.symbol === symbol)
      if (idx === -1) list.push({ symbol, active })
      else list[idx].active = active
      localStorage.setItem(`assets_${userId}_${strategyId}`, JSON.stringify(list))
      return { ok: true }
    }
    const { error } = await supabase
      .from('strategy_assets')
      .upsert({ user_id: userId, strategy_id: strategyId, symbol, active, updated_at: new Date().toISOString() })
    if (error) throw error
    return { ok: true }
  },
}

export const promptService = {
  async listPrompts(userId: string, strategyId: string) {
    if (!supabase) {
      const raw = localStorage.getItem(`prompts_${userId}_${strategyId}`)
      return raw ? JSON.parse(raw) : []
    }
    const { data, error } = await supabase
      .from('strategy_prompts')
      .select('*')
      .eq('user_id', userId)
      .eq('strategy_id', strategyId)
      .order('version', { ascending: false })
    if (error) throw error
    return data || []
  },
  async savePrompt(userId: string, strategyId: string, content: string) {
    if (!supabase) {
      const list = await this.listPrompts(userId, strategyId)
      const version = (list[0]?.version || 0) + 1
      const item = { id: Date.now().toString(), user_id: userId, strategy_id: strategyId, version, content, created_at: new Date().toISOString() }
      const next = [item, ...list]
      localStorage.setItem(`prompts_${userId}_${strategyId}`, JSON.stringify(next))
      return item
    }
    const latest = await this.listPrompts(userId, strategyId)
    const version = (latest[0]?.version || 0) + 1
    const { data, error } = await supabase
      .from('strategy_prompts')
      .insert({ user_id: userId, strategy_id: strategyId, version, content })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

export const strategyDecisionService = {
  async listDecisions(userId: string, limit = 50) {
    if (!supabase) {
      const raw = localStorage.getItem(`decisions_${userId}`)
      return raw ? JSON.parse(raw) : []
    }
    const { data, error } = await supabase
      .from('strategy_decisions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },
}
