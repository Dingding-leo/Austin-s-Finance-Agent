import type { StrategySignal, Strategy } from '../types'
import { useEffect, useState } from 'react'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  PauseIcon,
  ClockIcon,
  BoltIcon
} from '@heroicons/react/24/solid'

interface StrategySignalsProps {
  signals: StrategySignal[]
  strategies: Strategy[]
  activeSymbols?: string[]
  onAssetsChange?: (symbols: string[]) => void
  onSignalSelect: (signal: StrategySignal) => void
}

export default function StrategySignals({ signals, strategies, activeSymbols = ['BTC-USDT','ETH-USDT'], onAssetsChange, onSignalSelect }: StrategySignalsProps) {
  const [localSignals, setLocalSignals] = useState<StrategySignal[]>(signals)
  useEffect(() => { setLocalSignals(signals) }, [signals])
  const [assets, setAssets] = useState<string[]>(activeSymbols)
  useEffect(() => { setAssets(activeSymbols) }, [activeSymbols])

  const getStrategyName = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId)
    return strategy?.name || 'Unknown Strategy'
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'SELL': return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    }
  }

  const filtered = localSignals.filter(s => assets.includes(s.symbol))

  return (
    <div className="flex flex-col h-full">
      {/* Header / Filter */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
          <BoltIcon className="w-4 h-4 text-blue-500" />
          Active Signals
        </h3>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
          {['BTC-USDT','ETH-USDT'].map(sym => {
            const isActive = assets.includes(sym)
            return (
              <button 
                key={sym} 
                onClick={() => {
                  const next = isActive ? assets.filter(a => a !== sym) : [...assets, sym]
                  setAssets(next)
                  onAssetsChange && onAssetsChange(next)
                }} 
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  isActive ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {sym.replace('-USDT','')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Signal Feed */}
      <div className="space-y-4 overflow-y-auto thin-scroll pr-2 flex-1">
        {filtered.length === 0 && (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg bg-slate-900/50">
            <p className="text-sm text-slate-500">No active signals for selected assets</p>
          </div>
        )}
        
        {filtered.map((signal) => (
          <div
            key={signal.id}
            onClick={() => onSignalSelect(signal)}
            className="finance-card group cursor-pointer hover:border-slate-600 transition-all duration-200"
          >
            {/* Top Bar: Action & Time */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800/50">
              <div className={`badge ${getActionColor(signal.action)}`}>
                {signal.action === 'BUY' && <ArrowUpIcon className="w-3 h-3" />}
                {signal.action === 'SELL' && <ArrowDownIcon className="w-3 h-3" />}
                {signal.action === 'HOLD' && <PauseIcon className="w-3 h-3" />}
                <span className="font-bold">{signal.action}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ClockIcon className="w-3 h-3" />
                {new Date(signal.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>

            <div className="p-4">
              {/* Main Info */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-white tracking-tight">{signal.symbol}</h4>
                  <span className="text-xs text-slate-500">{getStrategyName(signal.strategy_id)}</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-200 mono-num">{(signal.confidence * 100).toFixed(0)}<span className="text-sm text-slate-500">%</span></div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Confidence</span>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    signal.confidence > 0.7 ? 'bg-emerald-500' : signal.confidence > 0.5 ? 'bg-blue-500' : 'bg-slate-500'
                  }`} 
                  style={{ width: `${signal.confidence * 100}%` }} 
                />
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800/50">
                  <span className="text-slate-500 block mb-1">Reason</span>
                  <p className="text-slate-300 leading-tight line-clamp-2">{signal.metadata.entry_reason || 'N/A'}</p>
                </div>
                <div className="bg-slate-950/50 p-2 rounded border border-slate-800/50">
                  <span className="text-slate-500 block mb-1">Risk</span>
                  <p className="text-slate-300 leading-tight line-clamp-2">{signal.metadata.risk_assessment || 'N/A'}</p>
                </div>
              </div>

              {/* Actions Overlay (visible on hover) */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const qtyStr = window.prompt('Enter quantity to execute:', signal.symbol.startsWith('BTC') ? '0.01' : '0.1') || '0'
                    const qty = parseFloat(qtyStr)
                    const mpw = window.prompt('Enter master password to decrypt OKX keys:', '') || ''
                    if (!qty || !mpw) return
                    // @ts-ignore
                    import('../services/supabase').then(({ strategyService }) => {
                      strategyService.executeStrategy(signal.strategy_id, signal.symbol, signal.action as any, qty, { masterPassword: mpw, dryRun: false }).then(res => {
                        alert((res && res.ok) ? 'Order sent' : 'Order failed')
                      }).catch(err => alert('Error: ' + (err?.message || err)))
                    })
                  }}
                  className={`flex-1 btn-action ${
                    signal.action === 'BUY' ? 'btn-buy' : signal.action === 'SELL' ? 'btn-sell' : 'btn-ghost bg-slate-800'
                  }`}
                >
                  Execute
                </button>
                <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
                  Analyze
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
