// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { decryptBundle, okxSign, cors } from "../_shared/crypto.ts"

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors })

    const SUPABASE_URL = Deno.env.get('SB_URL') ?? Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SB_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })

    const body = await req.json()
    const { strategyId, symbol, action, quantity, masterPassword, dryRun = true, tp, sl, leverage, allocationPct } = body as any
    if (!symbol || !action || !masterPassword) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })

    const { data: row, error } = await supabase
      .from('okx_credentials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    if (!row) return new Response(JSON.stringify({ error: 'No OKX credentials stored' }), { status: 404, headers: cors })

    const creds = await decryptBundle(masterPassword, { salt: row.salt, iv: row.iv, ct: row.ct })
    const apiKey = creds.apiKey
    const secret = creds.secretKey
    const passphrase = creds.passphrase
    if (!apiKey || !secret || !passphrase) return new Response(JSON.stringify({ error: 'Invalid decrypted credentials' }), { status: 400 })

    // Build order payload (spot, market)
    const host = 'https://www.okx.com'
    const path = '/api/v5/trade/order'
    const method = 'POST'
    const timestamp = new Date().toISOString()
    const payload: Record<string, any> = {
      instId: symbol,
      tdMode: 'cash',
      side: action.toLowerCase(),
      ordType: 'market',
      sz: String(quantity || ''),
      tgtCcy: 'base_ccy',
    }
    if (tp) payload['tpTriggerPx'] = String(tp)
    if (sl) payload['slTriggerPx'] = String(sl)

    const bodyStr = JSON.stringify(payload)
    const prehash = `${timestamp}${method}${path}${bodyStr}`
    const signature = await okxSign(secret, prehash)

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, request: { path, payload } }), { status: 200, headers: cors })
    }

    const res = await fetch(`${host}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
      },
      body: bodyStr,
    })
    const out = await res.json()
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, data: out }), { status: res.ok ? 200 : res.status, headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: cors })
  }
}


export default handler
