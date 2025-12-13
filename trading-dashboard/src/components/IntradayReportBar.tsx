import { useEffect, useState } from 'react'
import { intradayReportService } from '../services/supabase'

export default function IntradayReportBar() {
  const [reports, setReports] = useState<any[]>([])
  const [accuracy, setAccuracy] = useState<number>(0)

  useEffect(() => {
    const run = async () => {
      try {
        const latest = await intradayReportService.getLatest(['BTC-USDT', 'ETH-USDT'])
        setReports(latest)
        const { accuracy } = await intradayReportService.overallAccuracy()
        setAccuracy(accuracy)
      } catch (e) {}
    }
    run()
  }, [])

  const getContent = (symbol: string) => reports.find(r => r.symbol === symbol)?.content || 'No report yet'

  return (
    <div className="trading-card mb-6">
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">1‑Hour Intraday Report (BTC/ETH)</h2>
          <p className="text-sm text-dark-400">Updated every 4 hours • Overall prediction accuracy: {accuracy}%</p>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-md bg-dark-800 p-4">
          <p className="text-sm text-dark-400">BTC</p>
          <p className="text-sm text-white whitespace-pre-wrap">{getContent('BTC-USDT')}</p>
        </div>
        <div className="rounded-md bg-dark-800 p-4">
          <p className="text-sm text-dark-400">ETH</p>
          <p className="text-sm text-white whitespace-pre-wrap">{getContent('ETH-USDT')}</p>
        </div>
      </div>
    </div>
  )
}
