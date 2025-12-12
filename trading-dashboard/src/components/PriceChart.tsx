import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'

interface PriceChartProps {
  symbol: string
  height?: number
}

export default function PriceChart({ symbol, height = 400 }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: '#0f172a' },
        textColor: '#e2e8f0',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#475569',
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#475569',
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    // Create candlestick series
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#10b981',
      wickDownColor: '#ef4444',
      wickUpColor: '#10b981',
    })

    // Generate mock data
    const generateMockData = () => {
      const data = []
      const basePrice = Math.random() * 50000 + 30000
      let currentPrice = basePrice
      
      for (let i = 0; i < 100; i++) {
        const time = new Date(Date.now() - (100 - i) * 60000).toISOString()
        const open = currentPrice
        const change = (Math.random() - 0.5) * basePrice * 0.02
        const close = open + change
        const high = Math.max(open, close) + Math.random() * basePrice * 0.01
        const low = Math.min(open, close) - Math.random() * basePrice * 0.01
        
        data.push({
          time: time.slice(0, 19),
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
        })
        
        currentPrice = close
      }
      
      return data
    }

    // Set data
    const mockData = generateMockData()
    candlestickSeries.setData(mockData)
    
    // Fit content
    chart.timeScale().fitContent()

    // Store references
    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // Simulate real-time updates
    const interval = setInterval(() => {
      if (candlestickSeriesRef.current) {
        const lastData = mockData[mockData.length - 1]
        const newPrice = lastData.close + (Math.random() - 0.5) * lastData.close * 0.001
        
        const newCandle = {
          time: new Date().toISOString().slice(0, 19),
          open: lastData.close,
          high: Math.max(lastData.close, newPrice) + Math.random() * lastData.close * 0.0005,
          low: Math.min(lastData.close, newPrice) - Math.random() * lastData.close * 0.0005,
          close: newPrice,
        }
        
        candlestickSeriesRef.current.update(newCandle)
      }
    }, 5000)

    setLoading(false)

    return () => {
      window.removeEventListener('resize', handleResize)
      clearInterval(interval)
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [symbol, height])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-dark-400 text-sm">Loading chart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div 
        ref={chartContainerRef} 
        className="w-full"
        style={{ height: `${height}px` }}
      />
      
      {/* Chart Controls */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <button className="px-2 py-1 text-xs bg-dark-800 text-dark-300 rounded border border-dark-600 hover:bg-dark-700">
          1m
        </button>
        <button className="px-2 py-1 text-xs bg-dark-800 text-dark-300 rounded border border-dark-600 hover:bg-dark-700">
          5m
        </button>
        <button className="px-2 py-1 text-xs bg-dark-800 text-dark-300 rounded border border-dark-600 hover:bg-dark-700">
          1h
        </button>
        <button className="px-2 py-1 text-xs bg-dark-800 text-dark-300 rounded border border-dark-600 hover:bg-dark-700">
          1d
        </button>
      </div>
      
      {/* Symbol Info */}
      <div className="absolute top-4 left-4">
        <div className="bg-dark-800/80 backdrop-blur-sm rounded-md p-2 border border-dark-600">
          <div className="text-sm font-medium text-white">{symbol}</div>
          <div className="text-xs text-dark-400">Lightweight Charts</div>
        </div>
      </div>
    </div>
  )
}