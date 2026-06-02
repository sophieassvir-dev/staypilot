import { getDb } from '@/lib/db'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import ConversationThread from '@/components/ConversationThread'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = {
  msg_booking_confirmed: '✅ Confirmation réservation',
  msg_tally_reminder:    '📋 Rappel formulaire',
  msg_pre_checkin:       '🎉 Séjour bientôt',
  msg_checkin_codes:     '🔑 Codes d\'accès',
  msg_post_first_night:  '😊 Lendemain arrivée',
  msg_pre_checkout:      '🧹 Veille départ',
  msg_checkout_day:      '👋 Jour du départ',
  msg_post_checkout:     '⭐ Demande d\'avis',
  tally_welcome:         '📋 Bienvenue Tally',
  menage:                '🧹 Ménage',
  message_guest:         '✉️ Message manuel',
}

interface Notif {
  id: number
  reservation_id: number
  type: string
  recipient: string
  subject: string
  body: string
  sent: number
  sent_at: string | null
  created_at: string
  guest_name: string
  guest_email: string | null
  checkin_date: string
  checkout_date: string
  property_name: string
}

export default function ConversationsPage() {
  const db = getDb()

  const notifs = db.prepare(`
    SELECT n.*, r.guest_name, r.guest_email, r.checkin_date, r.checkout_date, p.name as property_name
    FROM notifications n
    JOIN reservations r ON n.reservation_id = r.id
    JOIN properties p ON r.property_id = p.id
    WHERE n.recipient = r.guest_email OR n.type = 'message_guest'
    ORDER BY n.created_at DESC
  `).all() as Notif[]

  // Regrouper par reservation_id
  const threads = new Map<number, { meta: Notif; messages: Notif[] }>()
  for (const n of notifs) {
    if (!threads.has(n.reservation_id)) {
      threads.set(n.reservation_id, { meta: n, messages: [] })
    }
    threads.get(n.reservation_id)!.messages.push(n)
  }

  const threadList = Array.from(threads.values())

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)' }}>✉️ Conversations</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Messages envoyés aux voyageurs</p>
        </div>
      </div>

      {threadList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>✉️</div>
          <p style={{ color: '#64748b' }}>Aucun message envoyé pour l&apos;instant</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {threadList.map(({ meta, messages }) => (
            <div key={meta.reservation_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* En-tête du fil */}
              <div style={{ padding: '14px 20px', background: 'var(--lavender)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Link
                    href={`/reservations/${meta.reservation_id}`}
                    style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--violet)', textDecoration: 'none' }}
                  >
                    {meta.guest_name}
                  </Link>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                    {meta.property_name} · {format(parseISO(meta.checkin_date), 'd MMM', { locale: fr })} → {format(parseISO(meta.checkout_date), 'd MMM yyyy', { locale: fr })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{messages.length} message{messages.length > 1 ? 's' : ''}</div>
                  {meta.guest_email && (
                    <div style={{ fontSize: '0.72rem', color: '#9B06D4', marginTop: 2 }}>{meta.guest_email}</div>
                  )}
                </div>
              </div>

              {/* Fil des messages */}
              <div style={{ padding: '0 20px' }}>
                {messages.map((msg, i) => (
                  <div key={msg.id} style={{ padding: '14px 0', borderBottom: i < messages.length - 1 ? '1px solid var(--lavender)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--purple)', background: '#f3e8ff', padding: '2px 8px', borderRadius: 12 }}>
                        {TYPE_LABEL[msg.type] || msg.type}
                      </span>
                      <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#94a3b8' }}>
                        {msg.sent_at
                          ? format(new Date(msg.sent_at + 'Z'), 'd MMM yyyy à HH:mm', { locale: fr })
                          : format(new Date(msg.created_at + 'Z'), 'd MMM yyyy', { locale: fr })
                        }
                        <span style={{ marginLeft: 6, color: msg.sent ? '#16a34a' : '#f59e0b' }}>
                          {msg.sent ? '✓ Envoyé' : '⏳ En attente'}
                        </span>
                      </div>
                    </div>
                    {msg.subject && (
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--dark)', marginBottom: 4 }}>{msg.subject}</div>
                    )}
                    <pre style={{ fontSize: '0.82rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'inherit', margin: 0 }}>
                      {msg.body}
                    </pre>
                  </div>
                ))}
              </div>

              {/* Zone de réponse */}
              {meta.guest_email && (
                <ConversationThread
                  reservationId={meta.reservation_id}
                  guestEmail={meta.guest_email}
                  guestName={meta.guest_name}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
