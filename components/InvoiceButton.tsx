'use client'
import { useState } from 'react'

interface Props {
  reservationId: number
  guestEmail: string | null
}

export default function InvoiceButton({ reservationId, guestEmail }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<null | { emailSent: boolean }>(null)
  const [error, setError] = useState('')
  const [acquittee, setAcquittee] = useState(true)

  const generate = async (sendEmail: boolean, download: boolean) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, send_email: sendEmail, acquittee }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (download) {
        const bytes = new Uint8Array(data.pdfBuffer)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `facture-${data.invoiceNumber}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }

      setDone({ emailSent: !!data.emailSent })
      if (data.emailError) setError(`Email non envoyé : ${data.emailError}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.78rem', color: '#16a34a' }}>
        ✅ {done.emailSent ? 'Email envoyé' : 'Facture générée'}
      </span>
      {error && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</span>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={acquittee}
          onChange={e => setAcquittee(e.target.checked)}
          style={{ accentColor: '#16a34a' }}
        />
        Tampon &quot;Acquittée&quot;
      </label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {guestEmail && (
          <button
            onClick={() => generate(true, false)}
            disabled={loading}
            style={{
              fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: 'none',
              background: '#4B1DA8', color: 'white', cursor: 'pointer', fontWeight: 600,
            }}
          >
            {loading ? '...' : '📧 Envoyer par email'}
          </button>
        )}
        <button
          onClick={() => generate(false, true)}
          disabled={loading}
          style={{
            fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #4B1DA8',
            background: 'white', color: '#4B1DA8', cursor: 'pointer', fontWeight: 600,
          }}
        >
          {loading ? '...' : '⬇️ Télécharger'}
        </button>
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
