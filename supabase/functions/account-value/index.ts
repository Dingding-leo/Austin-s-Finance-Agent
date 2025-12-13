// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { encode as b64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"

async function decryptBundle(masterPassword: string, bundle: { salt: number[]; iv: number[]; ct: number[] }) {
  const enc = new TextEncoder()
  const salt = new Uint8Array(bundle.salt)
  const iv = new Uint8Array(bundle.iv)
  const ct = new Uint8Array(bundle.ct)
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(masterPassword), { name: 'PBKDF2' }, false, ['deriveBits','deriveKey'])
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  const text = new TextDecoder().decode(new Uint8Array(plainBuf))
  return JSON.parse(text)
}

async function okxSign(secret: string, prehash: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(prehash))
  return b64(sig)
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors })
    const SUPABASE_URL = Deno.env.get('SB_URL') ?? Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SB_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
    const body = await req.json()
    const { masterPassword } = body as any
    if (!masterPassword) return new Response(JSON.stringify({ error: 'Missing masterPassword' }), { status: 400 })
    const { data: row, error } = await supabase.from('okx_credentials').select('*').eq('user_id', user.id).maybeSingle()
    if (error) throw error
    if (!row) return new Response(JSON.stringify({ error: 'No OKX credentials stored' }), { status: 404, headers: cors })
    const creds = await decryptBundle(masterPassword, { salt: row.salt, iv: row.iv, ct: row.ct })
    const apiKey = creds.apiKey, secret = creds.secretKey, passphrase = creds.passphrase
    const host = 'https://www.okx.com'
    const path = '/api/v5/account/balance'
    const method = 'GET'
    const timestamp = new Date().toISOString()
    const prehash = `${timestamp}${method}${path}`
    const signature = await okxSign(secret, prehash)
    const res = await fetch(`${host}${path}`, {
      method,
      headers: {
        'OK-ACCESS-KEY': apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': passphrase,
      }
    })
    const out = await res.json()
    if (!res.ok) return new Response(JSON.stringify({ ok: false, status: res.status, data: out }), { status: res.status, headers: cors })
    const totalEq = Number(out?.data?.[0]?.totalEq || 0)
    return new Response(JSON.stringify({ ok: true, totalEq, currency: 'USDT' }), { status: 200, headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: cors })
  }
}
