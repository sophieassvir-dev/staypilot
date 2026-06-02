import { getDb } from '@/lib/db'
import { Property } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function StatsPage() {
  const db = getDb()
  const year = new Date().getFullYear()
  const properties = db.prepare('SELECT * FROM properties WHERE active = 1').all() as Property[]

  const globalRevenue = db.prepare(`SELECT SUM(total_revenue) as total, COUNT(*) as count, SUM(nights) as nights FROM reservations WHERE status != 'cancelled' AND strftime('%Y', checkin_date) = ?`).get(year.toString()) as { total: number, count: number, nights: number }

  const byProperty = db.prepare(`
    SELECT p.name, p.commission_rate,
      SUM(r.total_revenue) as revenue,
      SUM(r.nights) as nights,
      COUNT(*) as reservations,
      ROUND(SUM(r.total_revenue) * p.commission_rate / 100, 0) as commission
    FROM reservations r
    JOIN properties p ON r.property_id = p.id
    WHERE r.status != 'cancelled' AND strftime('%Y', r.checkin_date) = ?
    GROUP BY p.id
    ORDER BY revenue DESC
  `).all(year.toString()) as Record<string, string | number>[]

  const byMonth = db.prepare(`
    SELECT strftime('%m', checkin_date) as month, SUM(total_revenue) as revenue, SUM(nights) as nights
    FROM reservations
    WHERE status != 'cancelled' AND strftime('%Y', checkin_date) = ?
    GROUP BY month ORDER BY month
  `).all(year.toString()) as { month: string, revenue: number, nights: number }[]

  const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
  const maxRev = Math.max(...byMonth.map(m => m.revenue), 1)

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 24 }}>📊 Statistiques {year}</h1>

      {/* KPIs globaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Revenus totaux', value: `${(globalRevenue?.total || 0).toFixed(0)} €`, icon: '💶' },
          { label: 'Réservations', value: globalRevenue?.count || 0, icon: '📅' },
          { label: 'Nuits louées', value: globalRevenue?.nights || 0, icon: '🌙' },
          { label: 'Biens gérés', value: properties.length, icon: '🏡' },
        ].map(k => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--violet)' }}>{k.value}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Graphique revenus mensuels */}
      {byMonth.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 20, fontSize: '1rem' }}>Revenus mensuels</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
            {months.map((m, i) => {
              const data = byMonth.find(b => b.month === String(i + 1).padStart(2, '0'))
              const h = data ? Math.max(8, (data.revenue / maxRev) * 120) : 0
              return (
                <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {data && <div style={{ fontSize: '0.65rem', color: 'var(--violet)', fontWeight: 700 }}>{data.revenue.toFixed(0)}€</div>}
                  <div style={{ width: '100%', height: h || 4, background: h ? 'var(--gradient)' : '#e2e8f0', borderRadius: '4px 4px 0 0', transition: 'height .3s' }} />
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{m}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Par bien */}
      {byProperty.length > 0 && (
        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16, fontSize: '1rem' }}>Performance par bien</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--lavender)' }}>
                {['Bien', 'Réservations', 'Nuits', 'Revenus bruts', 'Ma commission'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--violet)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byProperty.map(p => (
                <tr key={p.name as string} style={{ borderBottom: '1px solid var(--lavender)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.88rem' }}>{p.name as string}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.88rem', textAlign: 'center' }}>{p.reservations as number}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.88rem', textAlign: 'center' }}>{p.nights as number}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.88rem', fontWeight: 700 }}>{(p.revenue as number).toFixed(0)} €</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.88rem', fontWeight: 700, color: '#9B06D4' }}>{(p.commission as number).toFixed(0)} € ({p.commission_rate}%)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byProperty.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📊</div>
          <p style={{ color: '#64748b' }}>Les statistiques apparaîtront dès que vous ajouterez des réservations.</p>
        </div>
      )}
    </div>
  )
}
