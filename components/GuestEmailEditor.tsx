'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GuestEmailEditor({ reservationId, email }: { reservationId: number; email: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(email ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/reservations/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_email: value || null }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  if (!editing) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {email
        ? <a href={`mailto:${email}`} style={{ color: '#9B06D4', fontSize: '0.9rem', fontWeight: 600 }}>{email}</a>
        : <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>—</span>
      }
      <button
        onClick={() => setEditing(true)}
        style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 5, border: '1px dashed #9B06D4', background: 'white', color: '#9B06D4', cursor: 'pointer' }}
      >
        ✏️ {email ? 'Modifier' : 'Ajouter'}
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        autoFocus
        type="email"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        placeholder="email@exemple.fr"
        style={{ border: '1px solid #9B06D4', borderRadius: 6, padding: '4px 8px', fontSize: '0.88rem', color: 'var(--dark)', width: 220 }}
      />
      <button onClick={save} disabled={saving} className="btn-primary" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
        {saving ? '…' : '✓'}
      </button>
      <button onClick={() => setEditing(false)} style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--lavender)', background: 'white', cursor: 'pointer' }}>
        ✕
      </button>
    </div>
  )
}
