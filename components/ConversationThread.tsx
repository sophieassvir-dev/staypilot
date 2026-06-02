'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  reservationId: number
  guestEmail: string
  guestName: string
}

export default function ConversationThread({ reservationId, guestEmail, guestName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<'sent' | 'error' | null>(null)

  async function send() {
    if (!body.trim()) return
    setSending(true)
    setResult(null)
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message_guest',
        reservation_id: reservationId,
        subject: subject || `Message concernant votre séjour`,
        message: body,
      }),
    })
    const data = await res.json()
    setSending(false)
    if (data.ok) {
      setResult('sent')
      setSubject('')
      setBody('')
      setTimeout(() => {
        setResult(null)
        setOpen(false)
        router.refresh()
      }, 1500)
    } else {
      setResult('error')
    }
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid var(--lavender)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: '0.88rem',
    color: 'var(--dark)',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ borderTop: '1px solid var(--lavender)', padding: '12px 20px 16px' }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            fontSize: '0.82rem', padding: '6px 14px', borderRadius: 8,
            border: '1px solid #9B06D4', background: 'white', color: '#9B06D4',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          ↩️ Répondre à {guestName.split(' ')[0]}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
            Vers : <span style={{ color: '#9B06D4' }}>{guestEmail}</span>
          </div>
          <input
            type="text"
            placeholder="Sujet (optionnel)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder={`Votre message à ${guestName.split(' ')[0]}...`}
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={send}
              disabled={sending || !body.trim()}
              className="btn-primary"
              style={{ fontSize: '0.85rem' }}
            >
              {sending ? 'Envoi...' : '📨 Envoyer'}
            </button>
            <button
              onClick={() => { setOpen(false); setResult(null) }}
              style={{ fontSize: '0.85rem', padding: '6px 14px', borderRadius: 6, border: '1px solid var(--lavender)', background: 'white', cursor: 'pointer' }}
            >
              Annuler
            </button>
            {result === 'sent' && <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>✓ Message envoyé !</span>}
            {result === 'error' && <span style={{ fontSize: '0.82rem', color: '#dc2626' }}>Erreur — réessaie</span>}
          </div>
        </div>
      )}
    </div>
  )
}
