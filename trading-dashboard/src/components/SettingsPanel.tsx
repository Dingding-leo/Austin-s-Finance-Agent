import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { okxCredentialsService } from '../services/supabase'

const encKeyName = 'okx_enc'

async function deriveKey(passphrase: string, salt: BufferSource) {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey'])
  // Reduced iterations to 1,000 to minimize Edge Function CPU usage and latency
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 1000, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function encryptPayload(passphrase: string, payload: Record<string, string>) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { salt: Array.from(salt), iv: Array.from(iv), ct: Array.from(new Uint8Array(ciphertext)) }
}

async function decryptPayload(passphrase: string, bundle: { salt: number[]; iv: number[]; ct: number[] }) {
  const salt = new Uint8Array(bundle.salt)
  const iv = new Uint8Array(bundle.iv)
  const key = await deriveKey(passphrase, salt)
  const ct = new Uint8Array(bundle.ct)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return JSON.parse(new TextDecoder().decode(plain))
}

export default function SettingsPanel() {
  const { user } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [rememberForDashboard, setRememberForDashboard] = useState<boolean>(() => {
    try { return localStorage.getItem('okx_master_remember') === '1' } catch { return false }
  })
  const [status, setStatus] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(encKeyName)
      if (raw) setStatus('Encrypted credentials found (enter master password to load)')
    } catch {}
  }, [])

  const saveLocal = async () => {
    if (!user) { setStatus('Login required'); return }
    if (!masterPassword) { setStatus('Enter a master password to encrypt'); return }
    try {
      const bundle = await encryptPayload(masterPassword, { apiKey, secretKey, passphrase })
      localStorage.setItem(encKeyName, JSON.stringify(bundle))
      setStatus('Saved securely (client-side encryption)')
      setApiKey(''); setSecretKey(''); setPassphrase('')
    } catch {
      setStatus('Save failed')
    }
    try {
      if (rememberForDashboard) {
        localStorage.setItem('okx_master', masterPassword)
        localStorage.setItem('okx_master_remember', '1')
      } else {
        localStorage.removeItem('okx_master')
        localStorage.setItem('okx_master_remember', '0')
      }
    } catch {}
  }

  const loadLocal = async () => {
    try {
      const raw = localStorage.getItem(encKeyName)
      if (!raw) { setStatus('No saved credentials'); return }
      const bundle = JSON.parse(raw)
      const data = await decryptPayload(masterPassword, bundle)
      setApiKey(data.apiKey || '')
      setSecretKey(data.secretKey || '')
      setPassphrase(data.passphrase || '')
      setStatus('Decrypted — edit and save to update')
    } catch {
      setStatus('Decrypt failed (check master password)')
    }
  }

  const saveServer = async () => {
    if (!user) { setStatus('Login required'); return }
    if (!masterPassword) { setStatus('Enter a master password to encrypt'); return }
    try {
      const bundle = await encryptPayload(masterPassword, { apiKey, secretKey, passphrase })
      await okxCredentialsService.saveEncrypted(user.id, bundle)
      setStatus('Saved to server (encrypted per-user)')
      setApiKey(''); setSecretKey(''); setPassphrase('')
      try {
        if (rememberForDashboard) {
          localStorage.setItem('okx_master', masterPassword)
          localStorage.setItem('okx_master_remember', '1')
        } else {
          localStorage.removeItem('okx_master')
          localStorage.setItem('okx_master_remember', '0')
        }
      } catch {}
    } catch {
      setStatus('Server save failed')
    }
  }

  const loadServer = async () => {
    if (!user) { setStatus('Login required'); return }
    try {
      const bundle = await okxCredentialsService.loadEncrypted(user.id)
      if (!bundle) { setStatus('No server credentials found'); return }
      const data = await decryptPayload(masterPassword, bundle)
      setApiKey(data.apiKey || '')
      setSecretKey(data.secretKey || '')
      setPassphrase(data.passphrase || '')
      setStatus('Decrypted from server — edit and save to update')
    } catch {
      setStatus('Server decrypt failed')
    }
  }

  return (
    <div className="trading-card mt-6">
      <div className="p-4 border-b border-dark-700">
        <h2 className="text-lg font-semibold text-white">Secure Settings (OKX)</h2>
        <p className="text-sm text-dark-400">Credentials are encrypted locally with your master password.</p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs text-dark-400 mb-1">Master Password</label>
          <input type="password" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} className="w-full input-trading text-sm" placeholder="Required for encryption/decryption" />
        </div>
        <div className="flex items-center gap-2">
          <input id="remember_master" type="checkbox" checked={rememberForDashboard} onChange={(e) => setRememberForDashboard(e.target.checked)} />
          <label htmlFor="remember_master" className="text-xs text-dark-400">Use this master password for dashboard queries</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-dark-400 mb-1">OKX API Key</label>
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full input-trading text-sm" placeholder="api_key" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Secret Key</label>
            <input value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full input-trading text-sm" placeholder="secret" />
          </div>
          <div>
            <label className="block text-xs text-dark-400 mb-1">Passphrase</label>
            <input value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="w-full input-trading text-sm" placeholder="passphrase" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={saveLocal} className="px-3 py-2 rounded-md text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white">Save Encrypted (Local)</button>
          <button onClick={loadLocal} className="px-3 py-2 rounded-md text-sm font-medium bg-dark-700 hover:bg-dark-600 text-dark-200">Load (Local)</button>
          <button onClick={saveServer} className="px-3 py-2 rounded-md text-sm font-medium bg-success-600 hover:bg-success-700 text-white">Save Encrypted (Server)</button>
          <button onClick={loadServer} className="px-3 py-2 rounded-md text-sm font-medium bg-dark-700 hover:bg-dark-600 text-dark-200">Load (Server)</button>
        </div>
        {status && <p className="text-xs text-dark-400">{status}</p>}
      </div>
    </div>
  )
}
