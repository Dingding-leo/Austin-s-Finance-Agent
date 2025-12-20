import { supabase } from './api'

export const okxCredentialsService = {
  async saveEncrypted(userId: string, bundle: { salt: number[]; iv: number[]; ct: number[] }) {
    if (!supabase) {
      localStorage.setItem(`okx_enc_${userId}`, JSON.stringify(bundle))
      return { ok: true }
    }
    const { error } = await supabase
      .from('okx_credentials')
      .upsert({ user_id: userId, salt: bundle.salt, iv: bundle.iv, ct: bundle.ct, updated_at: new Date().toISOString() })
    if (error) throw error
    return { ok: true }
  },
  async loadEncrypted(userId: string) {
    if (!supabase) {
      const raw = localStorage.getItem(`okx_enc_${userId}`)
      return raw ? JSON.parse(raw) : null
    }
    const { data, error } = await supabase
      .from('okx_credentials')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return { salt: data.salt, iv: data.iv, ct: data.ct }
  },
}
