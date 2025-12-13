import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { marketService, strategyService } from '../services/supabase'
import MarketDataPanel from '../components/MarketDataPanel'
import IntradayReportBar from '../components/IntradayReportBar'
import StrategySignals from '../components/StrategySignals'
import QuickOrderPanel from '../components/QuickOrderPanel'
import PriceChart from '../components/PriceChart'
import type { MarketPrice, Strategy, StrategySignal } from '../types'

const DEFAULT_SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT']

export default function Dashboard() {
  const { user } = useAuth()
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [signals, setSignals] = useState<StrategySignal[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USDT')
  const [loading, setLoading] = useState(true)
  const [priceSubscription, setPriceSubscription] = useState<(() => void) | null>(null)

  useEffect(() => {
    loadInitialData()
    return () => {
      if (priceSubscription) {
        priceSubscription()
      }
    }
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Load market prices
      const marketPrices = await marketService.getPrices(DEFAULT_SYMBOLS)
      setPrices(marketPrices)
      
      // Load strategies
      if (user) {
        const userStrategies = await strategyService.getStrategies(user.id)
        setStrategies(userStrategies)
      }
      
      // Subscribe to real-time price updates
      const unsubscribe = marketService.subscribeToPrices(DEFAULT_SYMBOLS, (updatedPrice) => {
        setPrices(prev => {
          const updated = prev.map(p => 
            p.symbol === updatedPrice.symbol ? updatedPrice : p
          )
          return updated.length > 0 ? updated : [updatedPrice]
        })
      })
      setPriceSubscription(() => unsubscribe)
      
      // Generate mock signals for active strategies
      const mockSignals: StrategySignal[] = strategies
        .filter(s => s.is_active)
        .map(strategy => ({
          id: `${strategy.id}-${Date.now()}`,
          strategy_id: strategy.id,
          symbol: selectedSymbol,
          action: Math.random() > 0.5 ? 'BUY' : 'SELL',
          confidence: Math.random() * 0.4 + 0.6,
          metadata: {
            entry_reason: 'Technical analysis signal',
            news_analysis: 'Positive market sentiment',
            technical_conditions: 'RSI oversold, MACD bullish crossover',
            risk_assessment: 'Low risk, favorable risk-reward ratio',
          },
          created_at: new Date().toISOString(),
        }))
      setSignals(mockSignals)
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol)
  }

  const handleSignalRefresh = async () => {
    // Refresh signals
    const mockSignals: StrategySignal[] = strategies
      .filter(s => s.is_active)
      .map(strategy => ({
        id: `${strategy.id}-${Date.now()}`,
        strategy_id: strategy.id,
        symbol: selectedSymbol,
        action: Math.random() > 0.5 ? 'BUY' : 'SELL',
        confidence: Math.random() * 0.4 + 0.6,
        metadata: {
          entry_reason: 'Technical analysis signal',
          news_analysis: 'Positive market sentiment',
          technical_conditions: 'RSI oversold, MACD bullish crossover',
          risk_assessment: 'Low risk, favorable risk-reward ratio',
        },
        created_at: new Date().toISOString(),
      }))
    setSignals(mockSignals)
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

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Market Data and Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Data Panel */}
            <div className="trading-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-lg font-semibold text-white">Market Overview</h2>
                <p className="text-sm text-dark-400">Real-time price feeds and market data</p>
              </div>
              <MarketDataPanel 
                prices={prices} 
                onSymbolSelect={handleSymbolSelect}
                selectedSymbol={selectedSymbol}
              />
            </div>

            {/* Price Chart */}
            <div className="trading-card">
              <div className="p-4 border-b border-dark-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedSymbol} Chart</h2>
                    <p className="text-sm text-dark-400">Interactive price chart with technical indicators</p>
                  </div>
                  <div className="flex space-x-2">
                    {['1m', '5m', '15m', '1h', '4h', '1d'].map((timeframe) => (
                      <button
                        key={timeframe}
                        className="px-2 py-1 text-xs font-medium rounded bg-dark-700 text-dark-300 hover:bg-dark-600"
                      >
                        {timeframe}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <PriceChart symbol={selectedSymbol} />
              </div>
            </div>
          </div>

          {/* Right Column - Strategy Signals and Quick Order */}
          <div className="space-y-6">
            {/* Strategy Signals */}
            <div className="trading-card">
              <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Strategy Signals</h2>
                  <p className="text-sm text-dark-400">Live trading signals from active strategies</p>
                </div>
                <button
                  onClick={handleSignalRefresh}
                  className="px-3 py-1 text-xs font-medium rounded bg-primary-600 text-white hover:bg-primary-700"
                >
                  Refresh
                </button>
              </div>
              <StrategySignals 
                signals={signals}
                strategies={strategies}
                onSignalSelect={(signal) => console.log('Signal selected:', signal)}
              />
            </div>

            {/* Quick Order Panel */}
            <div className="trading-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-lg font-semibold text-white">Quick Order</h2>
                <p className="text-sm text-dark-400">Execute trades with predefined settings</p>
              </div>
              <QuickOrderPanel 
                selectedSymbol={selectedSymbol}
                currentPrice={prices.find(p => p.symbol === selectedSymbol)?.last || 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
