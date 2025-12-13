import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import IntradayReportBar from '../components/IntradayReportBar'
import StrategySignals from '../components/StrategySignals'
import type { StrategySignal } from '../types'
// Temporarily remove other sections; will add back incrementally
import SettingsPanel from '../components/SettingsPanel'
 

export default function Dashboard() {
  useAuth()
  const [loading] = useState(false)
  const [signals, setSignals] = useState<StrategySignal[]>([])
  const [strategyCollapsed, setStrategyCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('strategyPanelCollapsed') === '1'
    } catch { return false }
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
    setSignals(seedSignals)
  }, [])

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
          <h1 className="text-2xl font-bold text-white mb-2">Live Trading Dashboard</h1>
          <p className="text-dark-400">
            Monitor real-time market data, strategy signals, and execute trades
          </p>
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
              onSignalSelect={(signal) => console.log('Signal selected:', signal)}
            />
          )}
        </div>

        {/* Secure Settings Panel */}
        <SettingsPanel />
      </div>
    </div>
  )
}
