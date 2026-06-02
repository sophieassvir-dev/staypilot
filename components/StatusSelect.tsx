'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS = [
  { value: 'confirmed', label: 'Confirmée', color: '#166534', bg: '#dcfce7' },
  { value: 'completed', label: 'Terminée', color: '#1e40af', bg: '#dbeafe' },
  { value: 'cancelled', label: 'Annulée', color: '#64748b', bg: '#f1f5f9' },
]

export default function StatusSelect({ reservationId, current }: { reservationId: number; current: string }) {
  const [status, setStatus] = useState(current)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const change = async (val: string) => {
    setSaving(true)
    setStatus(val)
    await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reservationId, status: val }),
    })
    setSaving(false)
    router.refresh()
  }

  const current_status = STATUS.find(s => s.value === status) ?? STATUS[0]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: current_status.bg, color: current_status.color }}>
        {current_status.label}
      </span>
      <select
        value={status}
        onChange={e => change(e.target.value)}
        disabled={saving}
        style={{ fontSize: '0.82rem', border: '1px solid var(--lavender)', borderRadius: 6, padding: '4px 8px', color: 'var(--dark)', background: 'white', cursor: 'pointer' }}
      >
        {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  )
}
