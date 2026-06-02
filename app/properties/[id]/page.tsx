import { getDb } from '@/lib/db'
import { Property, Reservation } from '@/lib/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import NotifyButton from '@/components/NotifyButton'
import SyncButton from '@/components/SyncButton'

export const dynamic = 'force-dynamic'

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id) as Property | undefined
  if (!property) notFound()

  const reservations = db.prepare('SELECT * FROM reservations WHERE property_id = ? ORDER BY checkin_date DESC LIMIT 10').all(id) as Reservation[]
  const stats = db.prepare(`SELECT SUM(total_revenue) as revenue, COUNT(*) as count, SUM(nights) as nights FROM reservations WHERE property_id = ? AND status != 'cancelled'`).get(id) as { revenue: number, count: number, nights: number }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Link href="/properties" style={{ fontSize: '0.85rem', color: 'var(--violet-medium)', textDecoration: 'none' }}>← Mes biens</Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginTop: 4 }}>{property.name}</h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>📍 {property.address}, {property.city}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {(property as unknown as Record<string, string>).ical_url && <SyncButton />}
          <Link href={`/properties/${id}/edit`} className="btn-secondary" style={{ fontSize: '0.85rem' }}>✏️ Modifier</Link>
          <Link href={`/reservations/new`} className="btn-primary" style={{ fontSize: '0.85rem' }}>+ Réservation</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Revenus totaux', value: `${(stats?.revenue || 0).toFixed(0)} €`, icon: '💶' },
          { label: 'Réservations', value: stats?.count || 0, icon: '📅' },
          { label: 'Nuits louées', value: stats?.nights || 0, icon: '🌙' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--violet)' }}>{k.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12, fontSize: '0.95rem' }}>Informations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Check-in</span><span>{property.checkin_time}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Check-out</span><span>{property.checkout_time}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Capacité</span><span>{property.max_guests} personnes</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Commission</span><span style={{ color: '#9B06D4', fontWeight: 700 }}>{property.commission_rate}%</span></div>
            {property.wifi_name && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Wifi</span><span>{property.wifi_name} / {property.wifi_password}</span></div>}
          </div>
        </div>
        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12, fontSize: '0.95rem' }}>🧹 Prestataire ménage</h2>
          {property.cleaner_email ? (
            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{property.cleaner_name}</div>
              <div style={{ color: '#64748b' }}>{property.cleaner_email}</div>
              <div style={{ marginTop: 8, color: '#9B06D4', fontSize: '0.8rem' }}>✅ Notifications automatiques configurées</div>
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aucun prestataire configuré</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16, fontSize: '0.95rem' }}>Dernières réservations</h2>
        {reservations.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aucune réservation pour ce bien</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reservations.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--lavender)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.guest_name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {format(parseISO(r.checkin_date), 'd MMM', { locale: fr })} → {format(parseISO(r.checkout_date), 'd MMM yy', { locale: fr })} · {r.nights} nuits · Code : {r.lock_code}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#166534', fontSize: '0.88rem' }}>{r.total_revenue.toFixed(0)} €</span>
                  {property.cleaner_email && <NotifyButton reservationId={r.id} label="🧹" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
