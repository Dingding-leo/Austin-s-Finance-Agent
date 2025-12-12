

export default function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Strategy | null>(null)
  const [form, setForm] = useState<Partial<Strategy>>({
    name: '',
    is_active: true,
    max_risk: 0.02,
    parameters: { timeframe: '1h' },
    prompt: '',
    technical_info: '',
  })

  useEffect(() => {
    const run = async () => {
      try {
        const list = await strategyService.getStrategies('mock-admin')
        setStrategies(list)
      } catch (e: any) {
        setError(e.message || 'Failed to load strategies')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const resetForm = () => setForm({ name: '', is_active: true, max_risk: 0.02, parameters: { timeframe: '1h' }, prompt: '', technical_info: '' })

  const handleCreate = async () => {
    try {
      setError('')
      const created = await strategyService.createStrategy({
        user_id: 'mock-admin',
        name: String(form.name || 'New Strategy'),
        parameters: form.parameters || {},
        is_active: Boolean(form.is_active),
        max_risk: Number(form.max_risk || 0.02),
        prompt: String(form.prompt || ''),
        technical_info: String(form.technical_info || ''),
      })
      setStrategies(prev => [created, ...prev])
      resetForm()
    } catch (e: any) {
      setError(e.message || 'Create failed')
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    try {
      setError('')
      const updated = await strategyService.updateStrategy(editing.id, {
        name: String(form.name ?? editing.name),
        parameters: form.parameters ?? editing.parameters,
        is_active: form.is_active ?? editing.is_active,
        max_risk: Number(form.max_risk ?? editing.max_risk),
        prompt: String((form.prompt ?? editing.prompt) || ''),
        technical_info: String((form.technical_info ?? editing.technical_info) || ''),
      })
      setStrategies(prev => prev.map(s => (s.id === updated.id ? updated : s)))
      setEditing(null)
      resetForm()
    } catch (e: any) {
      setError(e.message || 'Update failed')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await strategyService.deleteStrategy(id)
      setStrategies(prev => prev.filter(s => s.id !== id))
    } catch (e: any) {
      setError(e.message || 'Delete failed')
    }
  }

  const perfLabel = (s: Strategy) => {
    const p = s.performance
    if (!p) return 'No performance yet'
    return `${p.trades} trades • ${Math.round(p.win_rate * 100)}% win • PnL ${p.total_pnl.toFixed(2)} • RR ${p.avg_rr.toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Strategy Management</h1>
          <p className="text-dark-400">Add, edit, and monitor AI strategies</p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            resetForm()
          }}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 bg-primary-600 text-white hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          New Strategy
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-danger-900/40 border border-danger-700 p-3">
          <p className="text-sm text-danger-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="trading-card p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-dark-700 rounded w-3/4"></div>
                <div className="h-4 bg-dark-700 rounded w-1/2"></div>
                <div className="h-24 bg-dark-700 rounded"></div>
              </div>
            </div>
          ))
        ) : (
          strategies.map(s => (
            <div key={s.id} className="trading-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{s.name}</h3>
                  <p className="text-xs text-dark-400">Risk {Math.round(s.max_risk * 100)}% • {s.parameters?.timeframe || '—'}</p>
                  <p className="mt-2 text-xs text-dark-300">{perfLabel(s)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${s.is_active ? 'bg-success-900/40 text-success-300' : 'bg-dark-700 text-dark-300'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs text-dark-400">Prompt</p>
                  <p className="text-sm text-white line-clamp-3">{s.prompt || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400">Technical Info</p>
                  <p className="text-sm text-white line-clamp-3">{s.technical_info || '—'}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-dark-700 text-white hover:bg-dark-600"
                  onClick={() => {
                    setEditing(s)
                    setForm({
                      name: s.name,
                      is_active: s.is_active,
                      max_risk: s.max_risk,
                      parameters: s.parameters,
                      prompt: s.prompt,
                      technical_info: s.technical_info,
                    })
                  }}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </button>
                <button
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-danger-700 text-white hover:bg-danger-600"
                  onClick={() => handleDelete(s.id)}
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="trading-card p-6">
        <h4 className="text-white font-semibold mb-4">{editing ? 'Edit Strategy' : 'Create Strategy'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-dark-300 mb-2">Name</label>
            <input
              className="w-full rounded-md px-3 py-2 border border-dark-700 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={String(form.name || '')}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-2">Timeframe</label>
            <input
              className="w-full rounded-md px-3 py-2 border border-dark-700 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={String((form.parameters as any)?.timeframe || '')}
              onChange={e => setForm({ ...form, parameters: { ...(form.parameters || {}), timeframe: e.target.value } })}
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-2">Max Risk (%)</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-md px-3 py-2 border border-dark-700 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={String(form.max_risk ?? 0.02)}
              onChange={e => setForm({ ...form, max_risk: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-600"
            />
            <label htmlFor="active" className="text-sm text-dark-300">Active</label>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-dark-300 mb-2">Prompt</label>
            <textarea
              rows={6}
              className="w-full rounded-md px-3 py-2 border border-dark-700 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={String(form.prompt || '')}
              onChange={e => setForm({ ...form, prompt: e.target.value })}
              placeholder="Describe the strategy instructions for the AI"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-2">Technical Information</label>
            <textarea
              rows={6}
              className="w-full rounded-md px-3 py-2 border border-dark-700 bg-dark-800 text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={String(form.technical_info || '')}
              onChange={e => setForm({ ...form, technical_info: e.target.value })}
              placeholder="Indicators, thresholds, SMC rules, etc."
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          {editing ? (
            <>
              <button
                className="px-4 py-2 rounded-md bg-dark-700 text-white hover:bg-dark-600"
                onClick={() => {
                  setEditing(null)
                  resetForm()
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700"
                onClick={handleUpdate}
              >
                Save Changes
              </button>
            </>
          ) : (
            <button
              className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700"
              onClick={handleCreate}
            >
              Create Strategy
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { strategyService } from '../services/supabase'
import type { Strategy } from '../types'
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
