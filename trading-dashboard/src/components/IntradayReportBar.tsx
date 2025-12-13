import { useEffect, useState } from 'react'
import { intradayReportService } from '../services/supabase'

export default function IntradayReportBar() {
  // keep reports only if needed for fallback (unused state removed)
  const [accuracy, setAccuracy] = useState<number>(0)
  const [historyBTC, setHistoryBTC] = useState<any[]>([])
  const [historyETH, setHistoryETH] = useState<any[]>([])
  const [latestBTC, setLatestBTC] = useState<any | null>(null)
  const [latestETH, setLatestETH] = useState<any | null>(null)
  const [open, setOpen] = useState<boolean>(false)
  const [activeReport, setActiveReport] = useState<any | null>(null)

  useEffect(() => {
    const run = async () => {
      const latest = await intradayReportService.getLatest(['BTC-USDT', 'ETH-USDT'])
      const { accuracy } = await intradayReportService.overallAccuracy()
      setAccuracy(accuracy)
      const b = await intradayReportService.getHistory('BTC-USDT', 6)
      const e = await intradayReportService.getHistory('ETH-USDT', 6)
      setHistoryBTC(b)
      setHistoryETH(e)
      const latestB = await intradayReportService.getLatestForSymbol('BTC-USDT')
      const latestE = await intradayReportService.getLatestForSymbol('ETH-USDT')
      setLatestBTC(latestB || b[0] || (latest.find(r => r.symbol === 'BTC-USDT') || null))
      setLatestETH(latestE || e[0] || (latest.find(r => r.symbol === 'ETH-USDT') || null))
    }
    run()
  }, [])

  const latestFor = (symbol: string) => symbol === 'BTC-USDT' ? latestBTC : latestETH

  const Card = ({ symbol, history }: { symbol: string; history: any[] }) => {
    const r = latestFor(symbol)
    const badgeColor = r?.trend_prediction === 'Bullish' ? 'bg-success-900/40 text-success-300' : r?.trend_prediction === 'Bearish' ? 'bg-danger-900/40 text-danger-300' : 'bg-dark-700 text-dark-300'
    return (
      <div className="rounded-md bg-dark-800 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-dark-400">{symbol.replace('-USDT','')}</p>
          <span className={`px-2 py-1 rounded text-xs ${badgeColor}`}>{r?.trend_prediction || 'No bias'}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-dark-400">Confidence</p>
          <p className="text-xs text-white">{r?.confidence ? Math.round(r.confidence) + '%' : '-'}</p>
        </div>
        {r?.content && (
          <p className="mt-3 text-xs text-dark-300 line-clamp-3">{String(r.content).slice(0, 280)}</p>
        )}
        <div className="mt-3">
          <button
            className="px-3 py-1 text-xs font-medium rounded bg-primary-600 text-white hover:bg-primary-700 relative z-20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
            onClick={(e) => { 
              e.stopPropagation();
              setActiveReport(r); 
              setOpen(true);
            }}
            disabled={!r}
          >
            {r ? 'View full report' : 'Report pending...'}
          </button>
        </div>
        <div className="mt-4">
          <p className="text-xs text-dark-400 mb-2">Recent hours</p>
          <div className="flex flex-wrap gap-2">
            {history.map(h => (
              <span key={h.id} className={`px-2 py-1 rounded text-xs ${h.is_correct === true ? 'bg-success-900/40 text-success-300' : h.is_correct === false ? 'bg-danger-900/40 text-danger-300' : 'bg-dark-700 text-dark-300'}`}>
                {new Date(h.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="trading-card mb-6">
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">1‑Hour Intraday Report (BTC/ETH)</h2>
          <p className="text-sm text-dark-400">Updated every 4 hours • Overall prediction accuracy: {accuracy}%</p>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card symbol="BTC-USDT" history={historyBTC} />
        <Card symbol="ETH-USDT" history={historyETH} />
      </div>
      {open && activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="trading-card w-[92%] max-w-3xl">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{activeReport.symbol} Report</h3>
                <p className="text-sm text-dark-400">Window {new Date(activeReport.window_start).toLocaleString()} — {new Date(activeReport.window_end).toLocaleString()}</p>
              </div>
              <button className="px-3 py-1 text-xs rounded bg-dark-700 text-white hover:bg-dark-600" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="mb-3">
                <span className="px-2 py-1 rounded text-xs bg-dark-700 text-white mr-2">Bias: {activeReport.trend_prediction}</span>
                <span className="px-2 py-1 rounded text-xs bg-dark-700 text-white">Confidence: {Math.round(activeReport.confidence || 0)}%</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-white">{activeReport?.content || 'No report content available'}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
