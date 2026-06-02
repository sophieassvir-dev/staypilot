'use client'
import { useState } from 'react'

export default function NotifyButton({ reservationId, label }: { reservationId: number, label: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  const notify = async () => {
    setStatus('loading')
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'menage', reservation_id: reservationId }),
    })
    setStatus(res.ok ? 'sent' : 'error')
    if (res.ok) setTimeout(() => setStatus('idle'), 3000)
  }

  if (status === 'sent') return <span className="badge badge-green">✅ Envoyé</span>
  if (status === 'error') return <span className="badge badge-orange">❌ Erreur</span>

  return (
    <button
      onClick={notify}
      disabled={status === 'loading'}
      style={{
        background: 'var(--cyan-dark)', color: 'white', border: 'none', borderRadius: 6,
        padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', opacity: status === 'loading' ? 0.6 : 1
      }}
    >
      {status === 'loading' ? '...' : label}
    </button>
  )
}
