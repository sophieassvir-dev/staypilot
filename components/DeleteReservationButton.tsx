'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteReservationButton({ reservationId }: { reservationId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Supprimer cette réservation ? Cette action est irréversible.')) return
    setLoading(true)
    await fetch(`/api/reservations/${reservationId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        background: 'none',
        border: '1px solid #fca5a5',
        borderRadius: 6,
        color: '#dc2626',
        fontSize: '0.78rem',
        padding: '4px 10px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? '…' : '🗑 Supprimer'}
    </button>
  )
}
