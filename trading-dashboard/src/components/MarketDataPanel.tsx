
import type { MarketPrice } from '../types'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface MarketDataPanelProps {
  prices: MarketPrice[]
  onSymbolSelect: (symbol: string) => void
  selectedSymbol: string
}

export default function MarketDataPanel({ prices, onSymbolSelect, selectedSymbol }: MarketDataPanelProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(2)}K`
    }
    return `$${price.toFixed(2)}`
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`
    }
    return volume.toFixed(0)
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {prices.map((price) => {
          const isPositive = price.changePercent24h >= 0
          const isSelected = price.symbol === selectedSymbol
          
          return (
            <div
              key={price.symbol}
              onClick={() => onSymbolSelect(price.symbol)}
              className={`market-ticker cursor-pointer transition-all duration-200 ${
                isSelected ? 'border-primary-500 bg-dark-750' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">{price.symbol}</h3>
                  <p className="text-xs text-dark-400">{new Date(price.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className={`flex items-center ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
                  {isPositive ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-sm font-medium">
                    {formatPercent(price.changePercent24h)}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-dark-400">Last Price</p>
                  <p className="text-sm font-mono font-medium text-white">
                    {formatPrice(price.last)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">24h Change</p>
                  <p className={`text-sm font-mono font-medium ${
                    isPositive ? 'text-success-400' : 'text-danger-400'
                  }`}>
                    {formatPrice(price.change24h)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Bid</p>
                  <p className="text-sm font-mono font-medium text-success-400">
                    {formatPrice(price.bid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Ask</p>
                  <p className="text-sm font-mono font-medium text-danger-400">
                    {formatPrice(price.ask)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-dark-400">24h Volume</p>
                  <p className="text-sm font-mono font-medium text-white">
                    {formatVolume(price.volume)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {prices.length === 0 && (
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-dark-700 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-dark-700 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-dark-400 mt-4">Loading market data...</p>
        </div>
      )}
    </div>
  )
}