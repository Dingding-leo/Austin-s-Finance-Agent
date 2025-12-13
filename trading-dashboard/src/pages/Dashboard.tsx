import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import IntradayReportBar from '../components/IntradayReportBar'
import StrategySignals from '../components/StrategySignals'
import type { StrategySignal } from '../types'
import { strategyAssetsService } from '../services/supabase'
// Temporarily remove other sections; will add back incrementally
import SettingsPanel from '../components/SettingsPanel'
import PromptEditor from '../components/PromptEditor'
 

export default function Dashboard() {
  const [loading] = useState(false)
  const [signals, setSignals] = useState<StrategySignal[]>([])
  const [activeSymbols, setActiveSymbols] = useState<string[]>(['BTC-USDT','ETH-USDT'])
  const { user } = useAuth()
  const [strategyCollapsed, setStrategyCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('strategyPanelCollapsed') === '1'
    } catch { return false }
  })

  const [accountValue, setAccountValue] = useState<number | null>(null)
  const [accountErr, setAccountErr] = useState<string>('')
  const [refreshMs, setRefreshMs] = useState<number>(() => {
    try { return Number(localStorage.getItem('account_value_refresh_ms') || '60000') } catch { return 60000 }
  })

  useEffect(() => {
    const seedSignals: StrategySignal[] = [
      {
        id: `seed-${Date.now()}`,
        strategy_id: 'seed-strategy-1',
        symbol: 'BTC-USDT',
        action: 'BUY',
        confidence: 0.72,
        metadata: {
          entry_reason: 'Macro sentiment supportive; report bias aligns with technical momentum',
          news_analysis: 'No major negative catalysts in last 6h',
          technical_conditions: 'Higher lows, reclaim of key MA, bullish RSI structure',
          risk_assessment: 'Moderate risk; define stop below recent swing low',
        },
        created_at: new Date().toISOString(),
      },
      {
        id: `seed-${Date.now()+1}`,
        strategy_id: 'seed-strategy-2',
        symbol: 'ETH-USDT',
        action: 'HOLD',
        confidence: 0.65,
        metadata: {
          entry_reason: 'Mixed signals; wait for confirmation on volume breakout',
          news_analysis: 'Neutral headlines; watch funding & OI',
          technical_conditions: 'Range-bound; volatility contraction near resistance',
          risk_assessment: 'Low-moderate; avoid chasing until breakout',
        },
        created_at: new Date().toISOString(),
      }
    ]
    setSignals(seedSignals);
    (async () => {
      if (user) {
        const assets = await strategyAssetsService.getAssets(user.id, 'seed-strategy-1')
        const active = assets.filter((a: any) => a.active).map((a: any) => a.symbol)
        if (active.length) setActiveSymbols(active)
      }
    })()
  }, [])

  useEffect(() => {
    let timer: any
    const run = async () => {
      try {
        const mpw = localStorage.getItem('okx_master') || ''
        if (!mpw || !user) return
        // @ts-ignore
        const { supabase } = await import('../services/supabase')
        if (!supabase) return
        const { data, error } = await supabase.functions.invoke('account-value', { body: { masterPassword: mpw }})
        if (error) throw error
        setAccountValue(Number(data?.totalEq || 0))
        setAccountErr('')
      } catch (e: any) {
        setAccountErr(e?.message || 'Failed to fetch account value')
      }
    }
    run()
    timer = setInterval(run, Math.max(15000, refreshMs))
    return () => timer && clearInterval(timer)
  }, [user, refreshMs])

  const toggleStrategyPanel = () => {
    const next = !strategyCollapsed
    setStrategyCollapsed(next)
    try { localStorage.setItem('strategyPanelCollapsed', next ? '1' : '0') } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 overflow-x-hidden">
      <div className="trading-dashboard container max-w-screen-xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text_white mb-2">Live Trading Dashboard</h1>
          <p className="text-dark-400">
            Monitor real-time market data, strategy signals, and execute trades
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm text-white">Account Value: {accountValue !== null ? `$${accountValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` : (accountErr ? '—' : 'Loading...')}</span>
            <div className="flex items-center gap-1">
              <label className="text-xs text-dark-400">Refresh</label>
              <input type="number" value={refreshMs} onChange={(e) => { const v = Number(e.target.value || 60000); setRefreshMs(v); try { localStorage.setItem('account_value_refresh_ms', String(v)) } catch {} }} className="w-20 input-trading text-xs" />
              <span className="text-xs text-dark-400">ms</span>
            </div>
          </div>
        </div>

        {/* Intraday Report Section */}
        <IntradayReportBar />

        {/* Strategy Signals Panel */}
        <div className="trading-card mt-6">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Strategy Signals</h2>
              <p className="text-sm text-dark-400">Live trading signals from active strategies</p>
            </div>
            <button
              onClick={toggleStrategyPanel}
              className="px-3 py-1 text-xs font-medium rounded bg-dark-700 text-dark-200 hover:bg-dark-600"
            >
              {strategyCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
          {!strategyCollapsed && (
            <StrategySignals 
              signals={signals}
              strategies={[]}
              activeSymbols={activeSymbols}
              onAssetsChange={async (next) => {
                setActiveSymbols(next)
                if (user) {
                  for (const sym of ['BTC-USDT','ETH-USDT']) {
                    await strategyAssetsService.setAsset(user.id, 'seed-strategy-1', sym, next.includes(sym))
                  }
                }
              }}
              onSignalSelect={(signal) => console.log('Signal selected:', signal)}
            />
          )}
        </div>

        {/* Secure Settings Panel */}
        <SettingsPanel />

        {/* Prompt Editor */}
        <PromptEditor strategyId="seed-strategy-1" />
      </div>
    </div>
  )
}
