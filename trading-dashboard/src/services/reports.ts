import { supabase } from './api'

export const intradayReportService = {
  async getLatest(symbols: string[]) {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('intraday_reports')
      .select('*')
      .in('symbol', symbols)
      .order('generated_at', { ascending: false })
      .limit(symbols.length * 3)
    if (error) throw error
    return data || []
  },
  async getLatestForSymbol(symbol: string) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('intraday_reports')
      .select('*')
      .eq('symbol', symbol)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  },
  async getHistory(symbol: string, limit = 20) {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('intraday_reports')
      .select('*')
      .eq('symbol', symbol)
      .order('generated_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },
  async saveEvaluation(id: string, realized_trend: string, is_correct: boolean) {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('intraday_reports')
      .update({ realized_trend, is_correct, evaluated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async overallAccuracy() {
    if (!supabase) return { accuracy: 0 }
    const { data, error } = await supabase
      .from('intraday_reports')
      .select('is_correct')
    if (error) throw error
    const arr = (data || []).filter(r => r.is_correct !== null && r.is_correct !== undefined)
    const correct = arr.filter(r => r.is_correct).length
    const accuracy = arr.length ? Math.round((correct / arr.length) * 100) : 0
    return { accuracy }
  },
}
