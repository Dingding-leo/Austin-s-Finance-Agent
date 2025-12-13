// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const toBase64 = (u8: Uint8Array) => {
  let s = ""
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
  // @ts-ignore
  return btoa(s)
}

async function decryptBundle(masterPassword: string, bundle: { salt: number[]; iv: number[]; ct: number[] }) {
  const enc = new TextEncoder()
  const salt = new Uint8Array(bundle.salt)
  const iv = new Uint8Array(bundle.iv)
  const ct = new Uint8Array(bundle.ct)
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(masterPassword), { name: 'PBKDF2' }, false, ['deriveBits','deriveKey'])
  // Iterations must match SettingsPanel (1000)
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  const text = new TextDecoder().decode(new Uint8Array(plainBuf))
  return JSON.parse(text)
}

async function okxSign(secret: string, prehash: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(prehash))
  return toBase64(new Uint8Array(sig))
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async function handler(req: Request): Promise<Response> {
  console.log('Function started')
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors })

    const SUPABASE_URL = Deno.env.get('SB_URL') ?? Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SB_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    
    console.log('Verifying user...')
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
        console.log('Auth error:', authErr)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
    }
    
    const body = await req.json()
    const { masterPassword } = body as any
    if (!masterPassword) return new Response(JSON.stringify({ error: 'Missing masterPassword' }), { status: 400, headers: cors })

    console.log('Fetching credentials...')
    const { data: row, error } = await supabase.from('okx_credentials').select('*').eq('user_id', user.id).maybeSingle()
    if (error) {
        console.log('DB error:', error)
        throw error
    }
    if (!row) return new Response(JSON.stringify({ error: 'No OKX credentials stored' }), { status: 404, headers: cors })

    console.log('Decrypting...')
    const creds = await decryptBundle(masterPassword, { salt: row.salt, iv: row.iv, ct: row.ct })
    const apiKey = creds.apiKey, secret = creds.secretKey, passphrase = creds.passphrase
    
    const host = 'https://www.okx.com'
    const path = '/api/v5/account/balance'
    const method = 'GET'
    const timestamp = new Date().toISOString()
    const prehash = `${timestamp}${method}${path}`
    const signature = await okxSign(secret, prehash)
    
    console.log('Fetching OKX balance...')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout
    try {
      const res = await fetch(`${host}${path}`, {
        method,
        headers: {
          'OK-ACCESS-KEY': apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': passphrase,
        },
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      const out = await res.json()
      console.log('OKX status:', res.status)
      if (!res.ok) return new Response(JSON.stringify({ ok: false, status: res.status, data: out }), { status: res.status, headers: cors })
      
      const totalEq = Number(out?.data?.[0]?.totalEq || 0)
      return new Response(JSON.stringify({ ok: true, totalEq, currency: 'USDT' }), { status: 200, headers: cors })
    } catch (e) {
      clearTimeout(timeout)
      throw e
    }
  } catch (e) {
    console.error('Handler error:', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: cors })
  }
}
