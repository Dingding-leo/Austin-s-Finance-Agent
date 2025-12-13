import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { promptService } from '../services/supabase'

interface Props {
  strategyId: string
}

export default function PromptEditor({ strategyId }: Props) {
  const { user } = useAuth()
  const [prompts, setPrompts] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    (async () => {
      if (!user) return
      const list = await promptService.listPrompts(user.id, strategyId)
      setPrompts(list)
      setContent(list[0]?.content || '')
    })()
  }, [user, strategyId])

  const save = async () => {
    if (!user) return
    try {
      const item = await promptService.savePrompt(user.id, strategyId, content)
      const list = await promptService.listPrompts(user.id, strategyId)
      setPrompts(list)
      setStatus(`Saved version ${item.version}`)
    } catch (e: any) {
      setStatus(e?.message || 'Save failed')
    }
  }

  return (
    <div className="trading-card mt-6">
      <div className="p-4 border-b border-dark-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Strategy Prompt</h2>
          <p className="text-sm text-dark-400">Customize and version prompts per strategy</p>
        </div>
        <button onClick={save} className="px-3 py-1 text-xs font-medium rounded bg-primary-600 text-white hover:bg-primary-700">Save Version</button>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-dark-400 mb-2">Edit Prompt</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-48 input-trading" placeholder="Enter strategy prompt..." />
          {status && <p className="mt-2 text-xs text-dark-400">{status}</p>}
          <div className="mt-3">
            <label className="block text-xs text-dark-400 mb-2">Versions</label>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {prompts.map(p => (
                <button key={p.id} onClick={() => { setContent(p.content); setPreview(p.content) }} className="w-full text-left px-2 py-1 rounded bg-dark-800 text-dark-200 hover:bg-dark-700">
                  v{p.version} • {new Date(p.created_at).toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-dark-400 mb-2">Preview</label>
          <div className="p-3 rounded bg-dark-800 text-dark-200 whitespace-pre-wrap min-h-48">{preview || content}</div>
        </div>
      </div>
    </div>
  )
}
