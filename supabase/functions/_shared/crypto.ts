
// Optimized crypto utility for Supabase Edge Functions
// Uses AES-GCM with PBKDF2 (1 iteration) for max performance on free tier

export async function decryptBundle(masterPassword: string, bundle: { salt: number[]; iv: number[]; ct: number[] }) {
  const enc = new TextEncoder()
  const salt = new Uint8Array(bundle.salt)
  const iv = new Uint8Array(bundle.iv)
  const ct = new Uint8Array(bundle.ct)
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(masterPassword), { name: 'PBKDF2' }, false, ['deriveBits','deriveKey'])
  
  // Iterations must match client-side (currently 1 for performance)
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 1, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
  
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  const text = new TextDecoder().decode(new Uint8Array(plainBuf))
  return JSON.parse(text)
}

export async function okxSign(secret: string, prehash: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(prehash))
  return toBase64(new Uint8Array(sig))
}

export const toBase64 = (u8: Uint8Array) => {
  let s = ""
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
  // @ts-ignore
  return btoa(s)
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
