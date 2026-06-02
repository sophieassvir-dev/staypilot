'use client'
import { useState } from 'react'

interface SyncResult {
  propertyName: string
  added: number
  cancelled: number
  errors: string[]
}

export default function SyncButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<SyncResult[]>([])

  const sync = async () => {
    setStatus('loading')
    setResults([])
    try {
      const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      setResults(data.results || [])
      setStatus('done')
      setTimeout(() => setStatus('idle'), 8000)
    } catch {
      setStatus('error')
    }
  }

  const hasIcal = true

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <button
        onClick={sync}
        disabled={status === 'loading'}
        style={{
          background: status === 'done' ? '#166534' : 'var(--cyan-dark)',
          color: 'white', border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600,
          cursor: status === 'loading' ? 'wait' : 'pointer',
          opacity: status === 'loading' ? 0.7 : 1, transition: 'all .2s'
        }}
      >
        {status === 'loading' ? '⏳ Synchronisation...' : status === 'done' ? '✅ Synchronisé' : '🔄 Sync iCal'}
      </button>
      {status === 'done' && results.length > 0 && (
        <div style={{ fontSize: '0.78rem', textAlign: 'right' }}>
          {results.map(r => (
            <div key={r.propertyName} style={{ color: r.errors.length ? '#9a3412' : '#166534' }}>
              {r.propertyName} : {r.added > 0 ? `+${r.added} réservation(s)` : r.errors.length ? r.errors[0] : 'À jour'}
            </div>
          ))}
        </div>
      )}
      {!hasIcal && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ajoutez une URL iCal dans la fiche du bien</div>}
    </div>
  )
}
