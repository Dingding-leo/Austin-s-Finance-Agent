import React, { useState } from 'react'
import { orderService } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowUpIcon, 
  ArrowDownIcon,

  ScaleIcon
} from '@heroicons/react/24/outline'

interface QuickOrderPanelProps {
  selectedSymbol: string
  currentPrice: number
}

export default function QuickOrderPanel({ selectedSymbol, currentPrice }: QuickOrderPanelProps) {
  const { user } = useAuth()
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const order = await orderService.createOrder({
        user_id: user.id,
        symbol: selectedSymbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        price: orderType === 'LIMIT' ? parseFloat(price) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        status: 'PENDING',
      })

      // Reset form
      setQuantity('')
      setPrice('')
      setTakeProfit('')
      setStopLoss('')
      
      console.log('Order created:', order)
    } catch (err: any) {
      setError(err.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const calculateNotional = () => {
    const qty = parseFloat(quantity) || 0
    const orderPrice = orderType === 'LIMIT' ? parseFloat(price) || currentPrice : currentPrice
    return qty * orderPrice
  }

  const presetQuantities = [0.01, 0.05, 0.1, 0.5]

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {/* Order Type Selection */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          className={`flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            side === 'BUY'
              ? 'bg-success-600 text-white'
              : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
          }`}
        >
          <ArrowUpIcon className="h-4 w-4 mr-1" />
          BUY
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={`flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            side === 'SELL'
              ? 'bg-danger-600 text-white'
              : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
          }`}
        >
          <ArrowDownIcon className="h-4 w-4 mr-1" />
          SELL
        </button>
      </div>

      {/* Order Type */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">Order Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOrderType('MARKET')}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              orderType === 'MARKET'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType('LIMIT')}
            className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              orderType === 'LIMIT'
                ? 'bg-primary-600 text-white'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            Limit
          </button>
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-dark-300 mb-2">
          Quantity ({selectedSymbol.split('-')[0]})
        </label>
        <input
          type="number"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full input-trading"
          placeholder="0.00"
          required
        />
        
        {/* Preset quantities */}
        <div className="grid grid-cols-4 gap-1 mt-2">
          {presetQuantities.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setQuantity(preset.toString())}
              className="py-1 px-2 text-xs font-medium rounded bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Limit Price (only for limit orders) */}
      {orderType === 'LIMIT' && (
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Limit Price (USDT)
          </label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full input-trading"
            placeholder={currentPrice.toFixed(2)}
            required
          />
        </div>
      )}

      {/* Current Price Display */}
      <div className="bg-dark-800 rounded-md p-3 border border-dark-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-400">Current Price:</span>
          <span className="font-mono font-medium text-white">
            ${currentPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-dark-400">Notional Value:</span>
          <span className="font-mono font-medium text-white">
            ${calculateNotional().toFixed(2)}
          </span>
        </div>
      </div>

      {/* Risk Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-dark-300">Risk Management</span>
          <ScaleIcon className="h-4 w-4 text-dark-400" />
        </div>
        
        <div>
          <label className="block text-xs text-dark-400 mb-1">Take Profit (Optional)</label>
          <input
            type="number"
            step="0.01"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full input-trading text-sm"
            placeholder="Price level"
          />
        </div>
        
        <div>
          <label className="block text-xs text-dark-400 mb-1">Stop Loss (Optional)</label>
          <input
            type="number"
            step="0.01"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full input-trading text-sm"
            placeholder="Price level"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-danger-900/50 p-3">
          <p className="text-sm text-danger-300">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !quantity}
        className={`w-full py-3 px-4 rounded-md text-sm font-medium transition-colors ${
          side === 'BUY'
            ? 'bg-success-600 hover:bg-success-700 text-white'
            : 'bg-danger-600 hover:bg-danger-700 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {side === 'BUY' ? <ArrowUpIcon className="h-4 w-4 mr-1" /> : <ArrowDownIcon className="h-4 w-4 mr-1" />}
            {side} {selectedSymbol.split('-')[0]}
          </div>
        )}
      </button>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          className="py-2 px-3 rounded bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors"
          onClick={() => {
            setTakeProfit((currentPrice * 1.02).toFixed(2))
            setStopLoss((currentPrice * 0.98).toFixed(2))
          }}
        >
          2% TP/SL
        </button>
        <button
          type="button"
          className="py-2 px-3 rounded bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors"
          onClick={() => {
            setTakeProfit((currentPrice * 1.05).toFixed(2))
            setStopLoss((currentPrice * 0.95).toFixed(2))
          }}
        >
          5% TP/SL
        </button>
      </div>
    </form>
  )
}