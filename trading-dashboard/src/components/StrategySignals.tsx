
import type { StrategySignal, Strategy } from '../types'
import { useEffect, useState } from 'react'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  PauseIcon,
  ClockIcon,
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success-400'
    if (confidence >= 0.6) return 'text-warning-400'
    return 'text-danger-400'
  }

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success-900/30'
    if (confidence >= 0.6) return 'bg-warning-900/30'
    return 'bg-danger-900/30'
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY':
        return <ArrowUpIcon className="h-5 w-5 text-success-400" />
      case 'SELL':
        return <ArrowDownIcon className="h-5 w-5 text-danger-400" />
      case 'HOLD':
        return <PauseIcon className="h-5 w-5 text-warning-400" />
      default:
        return null
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return 'border-success-500 bg-success-900/10'
      case 'SELL':
        return 'border-danger-500 bg-danger-900/10'
      case 'HOLD':
        return 'border-warning-500 bg-warning-900/10'
      default:
        return 'border-dark-600 bg-dark-800'
    }
  }

  const filtered = localSignals.filter(s => assets.includes(s.symbol))
  // Always render toggles; show empty message when no filtered signals

  return (
    <div className="p-4 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
      {/* Asset toggles */}
      <div className="flex items-center gap-2 mb-2">
        {['BTC-USDT','ETH-USDT'].map(sym => (
          <button key={sym} onClick={() => {
            const next = assets.includes(sym) ? assets.filter(a => a !== sym) : [...assets, sym]
            setAssets(next)
            onAssetsChange && onAssetsChange(next)
          }} className={`px-2 py-1 rounded text-xs ${assets.includes(sym) ? 'bg-success-700 text-white' : 'bg-dark-700 text-dark-200'}`}>
            {assets.includes(sym) ? 'On ' : 'Off '}{sym.replace('-USDT','')}
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="p-4 text-center">
          <h3 className="text-sm font-medium text-dark-300">No signals for selected assets</h3>
        </div>
      )}
      {filtered.map((signal, idx) => (
        <div
          key={signal.id}
          onClick={() => onSignalSelect(signal)}
          className={`strategy-card cursor-pointer p-4 rounded-lg border transition-all duration-200 hover:shadow-lg ${
            getActionColor(signal.action)
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getActionIcon(signal.action)}
              <span className="text-sm font-medium text-white capitalize">
                {signal.action}
              </span>
              <span className="text-xs text-dark-400">
                {getStrategyName(signal.strategy_id)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBg(signal.confidence)} ${getConfidenceColor(signal.confidence)}`}>
                {(signal.confidence * 100).toFixed(0)}% confidence
              </div>
              <ClockIcon className="h-4 w-4 text-dark-400" />
            </div>
          </div>

          {/* Symbol and Time */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-white">{signal.symbol}</span>
                <select
                  value={signal.symbol}
                  onChange={(e) => {
                    const next = [...localSignals]
                    next[idx] = { ...signal, symbol: e.target.value }
                    setLocalSignals(next)
                  }}
                  className="px-2 py-1 rounded bg-dark-700 text-dark-200 text-xs"
                >
                  <option value="BTC-USDT">BTC-USDT</option>
                  <option value="ETH-USDT">ETH-USDT</option>
                </select>
              </div>
              <span className="text-sm text-dark-400">
                {new Date(signal.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Signal Details */}
          <div className="space-y-2 text-xs">
            {signal.metadata.entry_reason && (
              <div>
                <span className="text-dark-400 font-medium">Entry Reason:</span>
                <p className="text-dark-300 mt-1">{signal.metadata.entry_reason}</p>
              </div>
            )}
            
            {signal.metadata.technical_conditions && (
              <div>
                <span className="text-dark-400 font-medium">Technical:</span>
                <p className="text-dark-300 mt-1">{signal.metadata.technical_conditions}</p>
              </div>
            )}
            
            {signal.metadata.risk_assessment && (
              <div>
                <span className="text-dark-400 font-medium">Risk:</span>
                <p className="text-dark-300 mt-1">{signal.metadata.risk_assessment}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                try {
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
                } catch {}
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                signal.action === 'BUY'
                  ? 'bg-success-600 hover:bg-success-700 text-white'
                  : signal.action === 'SELL'
                  ? 'bg-danger-600 hover:bg-danger-700 text-white'
                  : 'bg-dark-600 hover:bg-dark-500 text-dark-100'
              }`}
            >
              Execute {signal.action}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                console.log('View details:', signal)
              }}
              className="px-3 py-2 rounded-md text-sm font-medium bg-dark-700 hover:bg-dark-600 text-dark-200 transition-colors"
            >
              Details
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
