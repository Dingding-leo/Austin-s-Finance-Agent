import { useEffect, useState } from 'react'
import { intradayReportService } from '../services/supabase'

export default function IntradayReportBar() {
  // keep reports only if needed for fallback (unused state removed)
  const [accuracy, setAccuracy] = useState<number>(0)
  const [latestBTC, setLatestBTC] = useState<any | null>(null)
  const [latestETH, setLatestETH] = useState<any | null>(null)
  const [prices, setPrices] = useState<Record<string, { price: number; change: number }> | null>(null)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('intradayReportCollapsed') === '1' } catch { return false }
  })

  useEffect(() => {
    const run = async () => {
      const latest = await intradayReportService.getLatest(['BTC-USDT', 'ETH-USDT'])
      const { accuracy } = await intradayReportService.overallAccuracy()
      setAccuracy(accuracy)
      const latestB = await intradayReportService.getLatestForSymbol('BTC-USDT')
      const latestE = await intradayReportService.getLatestForSymbol('ETH-USDT')
      setLatestBTC(latestB || (latest.find(r => r.symbol === 'BTC-USDT') || null))
      setLatestETH(latestE || (latest.find(r => r.symbol === 'ETH-USDT') || null))

      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true')
        const j = await r.json()
        setPrices({
          'BTC-USDT': { price: j?.bitcoin?.usd ?? 0, change: j?.bitcoin?.usd_24h_change ?? 0 },
          'ETH-USDT': { price: j?.ethereum?.usd ?? 0, change: j?.ethereum?.usd_24h_change ?? 0 }
        })
      } catch {}
    }
    run()
  }, [])

  const latestFor = (symbol: string) => symbol === 'BTC-USDT' ? latestBTC : latestETH
  const latestGeneratedAt = (() => {
    const ts = latestBTC?.generated_at || latestETH?.generated_at
    if (!ts) return null
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return null
    }
  })()

  const sanitizeText = (s: string) => {
    if (!s) return ''
    let t = s
    t = t.replace(/^#{1,6}\s+/gm, '')
    t = t.replace(/\*\*/g, '')
    t = t.replace(/\*/g, '')
    t = t.replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\b/g, '')
    t = t.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '')
    t = t.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
    t = t.replace(/[ \t]+/g, ' ')
    t = t.replace(/\s+/g, ' ')
    return t.trim()
  }

  const Card = ({ symbol }: { symbol: string }) => {
    const r = latestFor(symbol)
    const badgeColor = r?.trend_prediction === 'Bullish' ? 'bg-success-900/40 text-success-300' : r?.trend_prediction === 'Bearish' ? 'bg-danger-900/40 text-danger-300' : 'bg-dark-700 text-dark-300'
    return (
      <div className="rounded-md bg-dark-800 p-6 w-full">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-white">{symbol.replace('-USDT','')}</p>
          <span className={`px-2 py-1 rounded text-xs ${badgeColor}`}>{r?.trend_prediction || 'No bias'}</span>
        </div>
        {prices && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-dark-300">Price</p>
            <p className="text-sm text-white">${prices[symbol].price?.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className={prices[symbol].change >= 0 ? 'price-positive' : 'price-negative'}>({prices[symbol].change.toFixed(2)}%)</span></p>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-dark-300">Confidence</p>
          <p className="text-sm text-white">{r?.confidence ? Math.round(r.confidence) + '%' : '-'}</p>
        </div>
        {r?.content && (
          <div className="mt-4 text-sm text-dark-300 leading-relaxed whitespace-pre-wrap">
            {sanitizeText(String(r.content))}
          </div>
        )}
      </div>
    )
  }

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('intradayReportCollapsed', next ? '1' : '0') } catch {}
  }

  return (
    <div className="trading-card mb-6 w-[78%] mx-auto px-6">
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">1‑Hour Intraday Report (BTC/ETH){latestGeneratedAt ? ` — Generated at ${latestGeneratedAt}` : ''}</h2>
          <p className="text-sm text-dark-400">Updated hourly • Overall prediction accuracy: {accuracy}%</p>
        </div>
        <button className="px-3 py-1 text-xs rounded bg-dark-700 text-dark-200 hover:bg-dark-600" onClick={toggleCollapsed}>{collapsed ? 'Expand' : 'Collapse'}</button>
      </div>
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card symbol="BTC-USDT" />
          <Card symbol="ETH-USDT" />
        </div>
      )}
    </div>
  )
}
