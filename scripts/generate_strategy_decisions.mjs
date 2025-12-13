import crypto from 'node:crypto'

const DEEPSEEK_API = process.env.DEEPSEEK_API_KEY
const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OWNER_USER_ID = process.env.OWNER_USER_ID
if (!DEEPSEEK_API || !SUPA_URL || !SUPA_KEY || !OWNER_USER_ID) {
  console.error('Missing environment variables');
  process.exit(1)
}

const fetchAssets = async () => {
  const r = await fetch(`${SUPA_URL}/rest/v1/strategy_assets?user_id=eq.${OWNER_USER_ID}&active=eq.true&select=strategy_id,symbol`, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
  })
  return await r.json()
}

const fetchLatestPrompt = async (strategy_id) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/strategy_prompts?user_id=eq.${OWNER_USER_ID}&strategy_id=eq.${strategy_id}&order=version.desc&limit=1`, {
    headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
  })
  const rows = await r.json()
  return rows?.[0]?.content || 'Generate action BUY/SELL/HOLD with confidence and brief rationale.'
}

const dsEval = async (prompt, symbol) => {
  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: 'You are a crypto strategy evaluator. Respond with a compact JSON: { action: "BUY"|"SELL"|"HOLD", confidence: number, content: string }.' },
      { role: 'user', content: JSON.stringify({ prompt, symbol }) },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  }
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API}` }, body: JSON.stringify(body)
  })
  const j = await r.json()
  let out = {}
  try { out = JSON.parse(j?.choices?.[0]?.message?.content || '{}') } catch {}
  return out
}

const insertDecision = async (strategy_id, symbol, action, confidence, content) => {
  const payload = [{ id: crypto.randomUUID(), user_id: OWNER_USER_ID, strategy_id, symbol, action, confidence, content }]
  const r = await fetch(`${SUPA_URL}/rest/v1/strategy_decisions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Prefer': 'return=representation' }, body: JSON.stringify(payload)
  })
  return await r.json()
}

const main = async () => {
  const assets = await fetchAssets()
  for (const a of assets) {
    const prompt = await fetchLatestPrompt(a.strategy_id)
    const res = await dsEval(prompt, a.symbol)
    await insertDecision(a.strategy_id, a.symbol, res.action || 'HOLD', Number(res.confidence || 0.5), String(res.content || ''))
  }
  console.log('Decisions generated')
}

main()
