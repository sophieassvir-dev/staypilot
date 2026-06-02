'use client'
import { useState } from 'react'

export default function SendInvoiceButton({ invoiceId, guestEmail }: { invoiceId: number; guestEmail: string | null }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!guestEmail) return null

  const send = async () => {
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSending(false)
    }
  }

  if (sent) return <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✅ Envoyée</span>

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={send}
        disabled={sending}
        style={{
          fontSize: '0.75rem', padding: '3px 9px', borderRadius: 6, border: 'none',
          background: '#4B1DA8', color: 'white', cursor: 'pointer', fontWeight: 600,
        }}
      >
        {sending ? '...' : '📧 Envoyer'}
      </button>
      {error && <span style={{ fontSize: '0.72rem', color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
