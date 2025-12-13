import crypto from 'node:crypto'

const DEEPSEEK_API = process.env.DEEPSEEK_API_KEY
const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!DEEPSEEK_API || !SUPA_URL || !SUPA_KEY) {
  console.error('Missing environment variables')
  process.exit(1)
}

const coingeckoSimple = async () => {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
  const r = await fetch(url)
  const j = await r.json()
  return { ts: new Date().toISOString(), data: j, source: url }
}

const coingeckoChart = async (id) => {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=1&interval=hourly`
  const r = await fetch(url)
  const j = await r.json()
  return { ts: new Date().toISOString(), data: j, source: url }
}

const nearestPrice = (arr, t) => {
  let best = null
  let bestDiff = Infinity
  for (const [ts, price] of arr) {
    const d = Math.abs(ts - t)
    if (d < bestDiff) { bestDiff = d; best = price }
  }
  return best
}

const now = new Date()
const windowStart = new Date(Math.floor(now.getTime() / 3600000) * 3600000)
const windowEnd = new Date(windowStart.getTime() + 3600000)

const snapshot = await coingeckoSimple()
const btcChart = await coingeckoChart('bitcoin')
const ethChart = await coingeckoChart('ethereum')

const systemPrompt = `You are a BTC & ETH market research assistant focused on crypto macro, market structure, liquidity/flows, and news catalysts. You produce a real-time, source-cited report for Bitcoin (BTC) and Ethereum (ETH) only. Provide general information only — not financial advice. Follow the provided REQUIRED REPORT TEMPLATE exactly. Include Directional Bias for Next 6–12 hours and Next 24 hours with confidence and flipping conditions. Use session-aware notes and calendar context. Use the live data block I provide and include citations. At the end, output a compact JSON array named report_summary with objects: { asset: 'BTC'|'ETH', horizon_1h_bias: 'Bullish'|'Bearish'|'Sideways', confidence_1h: number } suitable for programmatic use. If you cannot confirm a data point, state so.`

const userPrompt = JSON.stringify({
  now: now.toISOString(),
  window_start: windowStart.toISOString(),
  window_end: windowEnd.toISOString(),
  live_snapshot: snapshot,
  btc_chart_source: btcChart.source,
  eth_chart_source: ethChart.source,
  notes: 'Generate the full report per template titled “BTC/ETH Market Report — (UTC timestamp)”.'
})

const dsReq = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API}`
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3
  })
})
const dsJson = await dsReq.json()
const text = dsJson?.choices?.[0]?.message?.content || ''

const summaryMatch = text.match(/report_summary\s*[:=]?\s*([\s\S]*?)(\[.*\])/)
let summary = []
try {
  const jsonBlock = text.match(/\[\s*{[\s\S]*}\s*\]/)?.[0]
  summary = jsonBlock ? JSON.parse(jsonBlock) : []
} catch {}

const getBias = (asset) => {
  const s = summary.find(x => (x.asset || '').toUpperCase() === asset)
  return s ? { bias: s.horizon_1h_bias, confidence: Number(s.confidence_1h || 0) } : { bias: 'Sideways', confidence: 50 }
}

const insertReport = async (symbol, content, pred, conf) => {
  const payload = [{
    id: crypto.randomUUID(),
    symbol,
    timeframe: '1h',
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    generated_at: now.toISOString(),
    content,
    trend_prediction: pred,
    confidence: conf,
  }]
  const r = await fetch(`${SUPA_URL}/rest/v1/intraday_reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  })
  const j = await r.json()
  return j?.[0]
}

const updateEval = async (id, realized, correct) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/intraday_reports?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ realized_trend: realized, is_correct: !!correct, evaluated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  })
  const j = await r.json()
  return j?.[0]
}

const btcBias = getBias('BTC')
const ethBias = getBias('ETH')
await insertReport('BTC-USDT', text, btcBias.bias, btcBias.confidence)
await insertReport('ETH-USDT', text, ethBias.bias, ethBias.confidence)

const evalOne = async (symbol, chart) => {
  const q = await fetch(`${SUPA_URL}/rest/v1/intraday_reports?symbol=eq.${encodeURIComponent(symbol)}&evaluated_at=is.null&order=generated_at.desc&limit=1`, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
  })
  const rows = await q.json()
  const row = rows?.[0]
  if (!row) return
  const arr = chart.data?.prices || []
  const startPx = nearestPrice(arr, new Date(row.window_start).getTime())
  const endPx = nearestPrice(arr, new Date(row.window_end).getTime())
  if (!startPx || !endPx) return
  const pct = ((endPx - startPx) / startPx) * 100
  const realized = pct > 0.2 ? 'Bullish' : pct < -0.2 ? 'Bearish' : 'Sideways'
  const correct = (row.trend_prediction || '').toLowerCase() === realized.toLowerCase()
  await updateEval(row.id, realized, correct)
}

await evalOne('BTC-USDT', btcChart)
await evalOne('ETH-USDT', ethChart)
console.log('Done')
