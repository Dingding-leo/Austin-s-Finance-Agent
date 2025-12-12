
import type { StrategySignal, Strategy } from '../types'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  PauseIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/solid'

interface StrategySignalsProps {
  signals: StrategySignal[]
  strategies: Strategy[]
  onSignalSelect: (signal: StrategySignal) => void
}

export default function StrategySignals({ signals, strategies, onSignalSelect }: StrategySignalsProps) {
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
        return <ChartBarIcon className="h-5 w-5 text-dark-400" />
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

  if (signals.length === 0) {
    return (
      <div className="p-6 text-center">
        <ChartBarIcon className="h-12 w-12 text-dark-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-dark-300 mb-2">No Active Signals</h3>
        <p className="text-dark-500 text-sm">
          Strategy signals will appear here when your active strategies generate trading opportunities.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
      {signals.map((signal) => (
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

          {/* Symbol and Price */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">{signal.symbol}</span>
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
                console.log('Execute signal:', signal)
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