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

const systemPrompt = `You are a BTC & ETH market research assistant. Produce a real-time, source-cited report for Bitcoin (BTC) and Ethereum (ETH).
Follow these rules:
1. Provide separate, detailed analysis for BTC and ETH.
2. For each asset, include Directional Bias (1h & 24h), Confidence, Key Levels, and Flow/Liquidity notes.
3. Output the result strictly as a JSON object with this structure:
{
  "btc_report": "Full markdown text for Bitcoin report...",
  "eth_report": "Full markdown text for Ethereum report...",
  "summary": [
    { "asset": "BTC", "horizon_1h_bias": "Bullish"|"Bearish"|"Sideways", "confidence_1h": number },
    { "asset": "ETH", "horizon_1h_bias": "Bullish"|"Bearish"|"Sideways", "confidence_1h": number }
  ]
}
4. Do not output any markdown code blocks (like \`\`\`json), just the raw JSON string.`

const userPrompt = JSON.stringify({
  now: now.toISOString(),
  window_start: windowStart.toISOString(),
  window_end: windowEnd.toISOString(),
  live_snapshot: snapshot,
  btc_chart_source: btcChart.source,
  eth_chart_source: ethChart.source,
  notes: 'Generate the intraday report now.'
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
    temperature: 0.3,
    response_format: { type: 'json_object' }
  })
})
const dsJson = await dsReq.json()
const contentRaw = dsJson?.choices?.[0]?.message?.content || '{}'

let parsedContent = { btc_report: '', eth_report: '', summary: [] }
try {
  // cleanup potential markdown wrappers if the model ignores the instruction
  const cleanJson = contentRaw.replace(/```json\n?|\n?```/g, '')
  parsedContent = JSON.parse(cleanJson)
} catch (e) {
  console.error('Failed to parse JSON response:', e)
  parsedContent.btc_report = contentRaw // Fallback
  parsedContent.eth_report = contentRaw // Fallback
}

const summary = parsedContent.summary || []

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

const existsForWindow = async (symbol) => {
  const url = `${SUPA_URL}/rest/v1/intraday_reports?symbol=eq.${encodeURIComponent(symbol)}&window_start=eq.${encodeURIComponent(windowStart.toISOString())}&select=id`
  const r = await fetch(url, { headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` } })
  const j = await r.json()
  return Array.isArray(j) && j.length > 0
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
if (!(await existsForWindow('BTC-USDT'))) {
  await insertReport('BTC-USDT', parsedContent.btc_report || 'No report generated', btcBias.bias, btcBias.confidence)
}
if (!(await existsForWindow('ETH-USDT'))) {
  await insertReport('ETH-USDT', parsedContent.eth_report || 'No report generated', ethBias.bias, ethBias.confidence)
}

const evalAll = async (symbol, chart) => {
  const q = await fetch(`${SUPA_URL}/rest/v1/intraday_reports?symbol=eq.${encodeURIComponent(symbol)}&evaluated_at=is.null&order=generated_at.asc`, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
  })
  const rows = await q.json()
  if (!Array.isArray(rows) || rows.length === 0) return
  const arr = chart.data?.prices || []
  for (const row of rows) {
    const startPx = nearestPrice(arr, new Date(row.window_start).getTime())
    const endPx = nearestPrice(arr, new Date(row.window_end).getTime())
    if (!startPx || !endPx) continue
    const pct = ((endPx - startPx) / startPx) * 100
    const realized = pct > 0.2 ? 'Bullish' : pct < -0.2 ? 'Bearish' : 'Sideways'
    const correct = (row.trend_prediction || '').toLowerCase() === realized.toLowerCase()
    await updateEval(row.id, realized, correct)
  }
}

await evalAll('BTC-USDT', btcChart)
await evalAll('ETH-USDT', ethChart)
console.log('Done')
