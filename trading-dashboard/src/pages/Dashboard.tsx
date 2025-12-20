import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import IntradayReportBar from '../components/IntradayReportBar'
import StrategySignals from '../components/StrategySignals'
import type { StrategySignal } from '../types'
import { strategyAssetsService } from '../services/supabase'
import SettingsPanel, { decryptPayload } from '../components/SettingsPanel'
import PromptEditor from '../components/PromptEditor'
import { SignalIcon, Cog6ToothIcon, CommandLineIcon } from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [loading] = useState(false)
  const [signals, setSignals] = useState<StrategySignal[]>([])
  const [activeSymbols, setActiveSymbols] = useState<string[]>(['BTC-USDT','ETH-USDT'])
  const { user } = useAuth()
  
  const [accountValue, setAccountValue] = useState<number | null>(null)
  const [accountErr, setAccountErr] = useState<string>('')
  const [statusStep, setStatusStep] = useState<string>('')

  // Client-side fetcher for fallback
  const clientSideFetch = async (creds: any) => {
    const host = 'https://www.okx.com'
    const path = '/api/v5/account/balance'
    const method = 'GET'
    const timestamp = new Date().toISOString()
    const prehash = `${timestamp}${method}${path}`
    
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(creds.secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(prehash))
    // @ts-ignore
    const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))

    const res = await fetch(`${host}${path}`, {
      method,
      headers: {
        'OK-ACCESS-KEY': creds.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': creds.passphrase,
      }
    })
    return res.json()
  }

  useEffect(() => {
    const seedSignals: StrategySignal[] = [
      {
        id: `seed-${Date.now()}`,
        strategy_id: 'seed-strategy-1',
        symbol: 'BTC-USDT',
        action: 'BUY',
        confidence: 0.72,
        metadata: {
          entry_reason: 'Macro sentiment supportive; report bias aligns with technical momentum',
          news_analysis: 'No major negative catalysts in last 6h',
          technical_conditions: 'Higher lows, reclaim of key MA, bullish RSI structure',
          risk_assessment: 'Moderate risk; define stop below recent swing low',
        },
        created_at: new Date().toISOString(),
      },
      {
        id: `seed-${Date.now()+1}`,
        strategy_id: 'seed-strategy-2',
        symbol: 'ETH-USDT',
        action: 'HOLD',
        confidence: 0.65,
        metadata: {
          entry_reason: 'Mixed signals; wait for confirmation on volume breakout',
          news_analysis: 'Neutral headlines; watch funding & OI',
          technical_conditions: 'Range-bound; volatility contraction near resistance',
          risk_assessment: 'Low-moderate; avoid chasing until breakout',
        },
        created_at: new Date().toISOString(),
      }
    ]
    setSignals(seedSignals);
    (async () => {
      if (user) {
        const assets = await strategyAssetsService.getAssets(user.id, 'seed-strategy-1')
        const active = assets.filter((a: any) => a.active).map((a: any) => a.symbol)
        if (active.length) setActiveSymbols(active)
      }
    })()
  }, [])

  useEffect(() => {
    let timer: any
    const run = async () => {
      setStatusStep('Starting...')
      try {
        const mpw = localStorage.getItem('okx_master') || ''
        if (!mpw) { 
          setAccountErr('Master password not set')
          setStatusStep('Missing PW')
          return 
        }
        if (!user) { 
          setAccountErr('Not logged in')
          setStatusStep('Guest')
          return 
        }
        // @ts-ignore
        const { supabase, supabaseUrl, accountBalanceService } = await import('../services/supabase')
        if (!supabase) { setAccountErr('Client Error'); return }
        
        setStatusStep('Auth...')
        const session = await supabase.auth.getSession()
        const token = session?.data?.session?.access_token || ''
        if (!token) { setAccountErr('No session'); return }

        // Subscribe to real-time updates from local executor
        accountBalanceService.subscribeToBalance(user.id, (val) => {
             setAccountValue(val)
             setAccountErr('')
             setStatusStep('Live (Local)')
        })

        // Also fetch latest immediately
        const latest = await accountBalanceService.getLatestBalance(user.id)
        if (latest) {
             setAccountValue(latest.total_equity)
             setAccountErr('')
             setStatusStep('Synced (Local)')
             return
        }

        // Fallback: Try direct fetch
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)
        
        try {
          setStatusStep('Fetching...')
          const res = await fetch(`${supabaseUrl}/functions/v1/account-value`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ masterPassword: mpw }),
              signal: controller.signal
          })
          clearTimeout(timeout)
          const json = await res.json().catch(() => ({ error: 'Invalid JSON' }))

          if (!res.ok || json?.ok === false) throw new Error(String(json?.error || 'Error'))
          
          setAccountValue(Number(json?.totalEq || 0))
          setAccountErr('')
          setStatusStep('Done')
        } catch (fetchErr: any) {
           clearTimeout(timeout)
           if (fetchErr.name === 'AbortError' || fetchErr.message.includes('timed out')) {
             setStatusStep('Fallback...')
             try {
               const { okxCredentialsService } = await import('../services/supabase')
               const bundle = await okxCredentialsService.loadEncrypted(user.id)
               if (bundle) {
                 const creds = await decryptPayload(mpw, bundle)
                 const clientData = await clientSideFetch(creds)
                 if (clientData?.data?.[0]?.totalEq) {
                   setAccountValue(Number(clientData.data[0].totalEq))
                   setAccountErr('')
                   setStatusStep('Client Fetch')
                   return
                 }
               }
             } catch {}
             throw new Error('Timeout')
           }
           throw fetchErr
        }
      } catch (e: any) {
        setAccountErr(e?.message || 'Error')
        setStatusStep('Failed')
      }
    }
    run()
    timer = setInterval(run, 15000)
    return () => timer && clearInterval(timer)
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading terminal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md fixed top-0 w-full z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <SignalIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100">Finance<span className="text-blue-500">AI</span> Terminal</h1>
          <div className="h-4 w-px bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${accountValue !== null ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{statusStep || 'Connecting...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Net Account Value</p>
            <div className="text-xl font-bold text-slate-100 mono-num leading-none">
              {accountValue !== null 
                ? `$${accountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : <span className="text-slate-600">---.--</span>
              }
              <span className="text-sm text-slate-500 ml-1">USDT</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="flex items-center gap-3">
             <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
               Local Executor: {accountValue ? 'Active' : 'Waiting'}
             </div>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="pt-20 pb-8 px-6 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-7rem)]">
          
          {/* Left Column: Market Context (Width 8) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
            {/* Row 1: Intraday Reports */}
            <section className="shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Market Brief</h2>
                <span className="text-xs text-slate-600 bg-slate-900 px-2 py-1 rounded border border-slate-800">1H Interval</span>
              </div>
              <IntradayReportBar />
            </section>

            {/* Row 2: Strategy Signals (Fill remaining height) */}
            <section className="flex-1 min-h-0 flex flex-col bg-slate-900/30 rounded-xl border border-slate-800/50 overflow-hidden">
              <StrategySignals 
                signals={signals}
                strategies={[]}
                activeSymbols={activeSymbols}
                onAssetsChange={async (next) => {
                  setActiveSymbols(next)
                  if (user) {
                    for (const sym of ['BTC-USDT','ETH-USDT']) {
                      await strategyAssetsService.setAsset(user.id, 'seed-strategy-1', sym, next.includes(sym))
                    }
                  }
                }}
                onSignalSelect={(signal) => console.log('Signal selected:', signal)}
              />
            </section>
          </div>

          {/* Right Column: Controls & Settings (Width 4) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto thin-scroll pr-1">
            
            {/* Prompt Editor Card */}
            <div className="finance-card">
              <div className="finance-card-header">
                <span className="finance-card-title flex items-center gap-2">
                  <CommandLineIcon className="w-4 h-4 text-purple-500" />
                  Strategy Logic
                </span>
              </div>
              <div className="p-4">
                <PromptEditor strategyId="seed-strategy-1" />
              </div>
            </div>

            {/* Settings Card */}
            <div className="finance-card">
              <div className="finance-card-header">
                <span className="finance-card-title flex items-center gap-2">
                  <Cog6ToothIcon className="w-4 h-4 text-slate-500" />
                  System Config
                </span>
              </div>
              <div className="p-1">
                <SettingsPanel />
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
