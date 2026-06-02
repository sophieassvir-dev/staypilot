import { getDb } from '@/lib/db'
import { Invoice } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function FacturesPage() {
  const db = getDb()
  const invoices = db.prepare('SELECT * FROM invoices ORDER BY issued_at DESC').all() as Invoice[]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)' }}>🧾 Factures</h1>
        <Link href="/reservations" className="btn-primary">+ Générer depuis une réservation</Link>
      </div>

      {invoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧾</div>
          <p style={{ color: '#64748b', marginBottom: 20 }}>Aucune facture générée pour l&apos;instant.</p>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Rendez-vous dans <strong>Réservations</strong> et cliquez sur le bouton <strong>🧾 Facture</strong>.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--lavender)' }}>
                {['N° Facture', 'Date', 'Voyageur', 'Logement', 'Séjour', 'Total', 'Statut', 'Email', 'PDF'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--lavender)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4B1DA8', fontSize: '0.88rem' }}>{inv.invoice_number}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                    {format(parseISO(inv.issued_at), 'd MMM yyyy', { locale: fr })}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.88rem' }}>
                    <div>{inv.guest_name}</div>
                    {inv.guest_email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{inv.guest_email}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{inv.property_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#64748b' }}>
                    {format(parseISO(inv.checkin_date), 'd MMM', { locale: fr })} → {format(parseISO(inv.checkout_date), 'd MMM yy', { locale: fr })}
                    <div style={{ fontSize: '0.75rem' }}>{inv.nights} nuit{inv.nights > 1 ? 's' : ''}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>
                    {inv.total.toFixed(0)} €
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {inv.acquittee
                      ? <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a' }}>✅ Acquittée</span>
                      : <span style={{ fontSize: '0.78rem', color: '#64748b' }}>En attente</span>
                    }
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {inv.email_sent
                      ? <span style={{ fontSize: '0.78rem', color: '#16a34a' }}>✅ Envoyé</span>
                      : <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      style={{
                        fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #4B1DA8',
                        background: 'white', color: '#4B1DA8', textDecoration: 'none', fontWeight: 600,
                        display: 'inline-block',
                      }}
                    >
                      ⬇️ PDF
                    </a>
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
