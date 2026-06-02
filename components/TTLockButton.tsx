'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TTLockButton({ reservationId, currentCode }: { reservationId: number; currentCode: string | null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ttlock/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        onClick={generate}
        disabled={loading}
        style={{
          fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6,
          border: 'none', background: '#7B4FD4', color: 'white',
          cursor: 'pointer', fontWeight: 600,
        }}
      >
        {loading ? '...' : currentCode ? '🔄 Nouveau code' : '🔑 Générer le code'}
      </button>
      {error && <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
