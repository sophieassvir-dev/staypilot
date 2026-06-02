import { getDb } from '@/lib/db'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import SyncButton from '@/components/SyncButton'

export const dynamic = 'force-dynamic'

function getStats() {
  const db = getDb()
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(new Date(), 'yyyy-MM-01')
  const monthEnd = format(new Date(), 'yyyy-MM-31')

  const properties = db.prepare('SELECT COUNT(*) as count FROM properties WHERE active = 1').get() as { count: number }
  const checkins = db.prepare(`SELECT r.*, p.name as property_name FROM reservations r JOIN properties p ON r.property_id = p.id WHERE r.checkin_date = ? AND r.status = 'confirmed'`).all(today)
  const checkouts = db.prepare(`SELECT r.*, p.name as property_name FROM reservations r JOIN properties p ON r.property_id = p.id WHERE r.checkout_date = ? AND r.status = 'confirmed'`).all(today)
  const monthRevenue = db.prepare(`SELECT SUM(total_revenue) as total FROM reservations WHERE status != 'cancelled' AND checkin_date >= ? AND checkin_date <= ?`).get(monthStart, monthEnd) as { total: number }
  const upcoming = db.prepare(`SELECT r.*, p.name as property_name FROM reservations r JOIN properties p ON r.property_id = p.id WHERE r.checkin_date > ? AND r.status = 'confirmed' ORDER BY r.checkin_date ASC LIMIT 5`).all(today)

  return { properties: properties.count, checkins, checkouts, monthRevenue: monthRevenue?.total || 0, upcoming }
}

export default function Dashboard() {
  const { properties, checkins, checkouts, monthRevenue, upcoming } = getStats()
  const todayLabel = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)' }}>Dashboard</h1>
          <p style={{ color: 'var(--violet-medium)', fontSize: '0.9rem', textTransform: 'capitalize' }}>{todayLabel}</p>
        </div>
        <SyncButton />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Biens actifs', value: properties, icon: '🏡', color: 'var(--violet)' },
          { label: "Check-ins aujourd'hui", value: checkins.length, icon: '🔑', color: checkins.length > 0 ? '#9B06D4' : '#94a3b8' },
          { label: "Check-outs aujourd'hui", value: checkouts.length, icon: '🧹', color: checkouts.length > 0 ? '#06B6D4' : '#94a3b8' },
          { label: 'Revenus ce mois', value: `${monthRevenue.toFixed(0)} €`, icon: '💶', color: '#166534' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>⚡ Alertes du jour</h2>
          {checkins.length === 0 && checkouts.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Aucune arrivée ni départ aujourd&apos;hui</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(checkouts as Record<string, string>[]).map(r => (
                <div key={r.id} style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, borderLeft: '3px solid #22c55e' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🧹 Départ — {r.property_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.guest_name} · Notifier le ménage</div>
                </div>
              ))}
              {(checkins as Record<string, string>[]).map(r => (
                <div key={r.id} style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🔑 Arrivée — {r.property_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.guest_name} · Code : {r.lock_code}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>📅 Prochaines arrivées</h2>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 12 }}>Aucune réservation à venir</p>
              <Link href="/reservations/new" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                + Ajouter une réservation
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(upcoming as Record<string, string>[]).map(r => {
                const date = parseISO(r.checkin_date)
                const label = isToday(date) ? "Aujourd'hui" : isTomorrow(date) ? 'Demain' : format(date, 'd MMM', { locale: fr })
                return (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--lavender)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.guest_name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.property_name} · {r.nights} nuit{parseInt(r.nights) > 1 ? 's' : ''}</div>
                    </div>
                    <span className="badge badge-purple">{label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {properties === 0 && (
        <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏡</div>
          <h2 style={{ color: 'var(--violet)', marginBottom: 8 }}>Commencez par ajouter un bien</h2>
          <p style={{ color: '#64748b', marginBottom: 20, fontSize: '0.9rem' }}>StayPilot gérera automatiquement vos réservations, messages et notifications ménage.</p>
          <Link href="/properties/new" className="btn-primary">+ Ajouter mon premier bien</Link>
        </div>
      )}
    </div>
  )
}
