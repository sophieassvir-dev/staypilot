import { getDb } from '@/lib/db'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import NotifyButton from '@/components/NotifyButton'
import InvoiceButton from '@/components/InvoiceButton'
import DeleteReservationButton from '@/components/DeleteReservationButton'

export const dynamic = 'force-dynamic'

export default function ReservationsPage() {
  const db = getDb()
  const reservations = db.prepare(`
    SELECT r.*, p.name as property_name, p.cleaner_email
    FROM reservations r
    JOIN properties p ON r.property_id = p.id
    ORDER BY r.checkin_date DESC
  `).all() as Record<string, string>[]

  const statusBadge = (s: string) => {
    if (s === 'confirmed') return <span className="badge badge-green">Confirmée</span>
    if (s === 'cancelled') return <span className="badge badge-gray">Annulée</span>
    if (s === 'completed') return <span className="badge badge-blue">Terminée</span>
    return <span className="badge badge-orange">{s}</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)' }}>📅 Réservations</h1>
        <Link href="/reservations/new" className="btn-primary">+ Nouvelle réservation</Link>
      </div>

      {reservations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📅</div>
          <p style={{ color: '#64748b', marginBottom: 20 }}>Aucune réservation enregistrée</p>
          <Link href="/reservations/new" className="btn-primary">+ Ajouter une réservation</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--lavender)' }}>
                {['Bien', 'Voyageur', 'Arrivée', 'Départ', 'Nuits', 'Revenus', 'Statut', 'Formulaire', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--lavender)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 600 }}>{r.property_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.88rem' }}>
                    <Link href={`/reservations/${r.id}`} style={{ fontWeight: 600, color: 'var(--violet)', textDecoration: 'none' }}>
                      {r.guest_name}
                    </Link>
                    {r.lock_code && <div style={{ fontSize: '0.75rem', color: '#9B06D4' }}>Code : {r.lock_code}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{format(parseISO(r.checkin_date), 'd MMM yy', { locale: fr })}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{format(parseISO(r.checkout_date), 'd MMM yy', { locale: fr })}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center' }}>{r.nights}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 700, color: '#166534' }}>{parseFloat(r.total_revenue).toFixed(0)} €</td>
                  <td style={{ padding: '12px 16px' }}>{statusBadge(r.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {Number(r.tally_filled) === 1
                      ? <span title="Formulaire rempli" style={{ fontSize: '1rem' }}>✅</span>
                      : <span title="En attente" style={{ fontSize: '1rem', opacity: 0.3 }}>📋</span>
                    }
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {r.cleaner_email && r.status === 'confirmed' && (
                        <NotifyButton reservationId={parseInt(r.id)} label="🧹 Ménage" />
                      )}
                      <InvoiceButton reservationId={parseInt(r.id)} guestEmail={r.guest_email ?? null} />
                      <DeleteReservationButton reservationId={parseInt(r.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
