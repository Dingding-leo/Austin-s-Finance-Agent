import { useEffect, useState } from 'react'
import { intradayReportService } from '../services/supabase'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid'

export default function IntradayReportBar() {
  const [accuracy, setAccuracy] = useState<number>(0)
  const [latestBTC, setLatestBTC] = useState<any | null>(null)
  const [latestETH, setLatestETH] = useState<any | null>(null)
  const [prices, setPrices] = useState<Record<string, { price: number; change: number }> | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

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
    const priceData = prices ? prices[symbol] : null
    const isBullish = r?.trend_prediction === 'Bullish'
    const isBearish = r?.trend_prediction === 'Bearish'
    const badgeClass = isBullish ? 'badge-green' : isBearish ? 'badge-red' : 'badge-neutral'
    const isExpanded = expanded === symbol

    return (
      <div className="finance-card hover:border-slate-700 transition-colors">
        <div className="p-4">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                {symbol.substring(0, 3)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{symbol.replace('-USDT', '')}</h3>
                {priceData && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="mono-num text-slate-300">${priceData.price.toLocaleString()}</span>
                    <span className={`mono-num ${priceData.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`badge ${badgeClass} mb-1`}>
                {r?.trend_prediction || 'Neutral'}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {r?.confidence ? Math.round(r.confidence) + '% Conf.' : 'N/A'}
              </div>
            </div>
          </div>

          {/* Content Preview */}
          <div className="relative">
            <p className={`text-xs text-slate-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
              {sanitizeText(String(r?.content || 'No report available.'))}
            </p>
            {!isExpanded && r?.content && (
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
            )}
          </div>

          {/* Footer / Expand */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
            <span className="text-[10px] text-slate-600">
              Updated: {r?.generated_at ? new Date(r.generated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
            </span>
            <button 
              onClick={() => setExpanded(isExpanded ? null : symbol)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              {isExpanded ? 'Show Less' : 'Read Analysis'}
              {isExpanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card symbol="BTC-USDT" />
      <Card symbol="ETH-USDT" />
    </div>
  )
}
