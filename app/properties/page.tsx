import { getDb } from '@/lib/db'
import Link from 'next/link'
import { Property } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function PropertiesPage() {
  const db = getDb()
  const properties = db.prepare('SELECT * FROM properties WHERE active = 1 ORDER BY name').all() as Property[]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)' }}>🏡 Mes biens</h1>
        <Link href="/properties/new" className="btn-primary">+ Ajouter un bien</Link>
      </div>

      {properties.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏡</div>
          <p style={{ color: '#64748b', marginBottom: 20 }}>Aucun bien enregistré pour l&apos;instant</p>
          <Link href="/properties/new" className="btn-primary">+ Ajouter mon premier bien</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {properties.map(p => (
            <Link key={p.id} href={`/properties/${p.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow .2s', borderTop: '4px solid var(--purple)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h2 style={{ fontWeight: 700, color: 'var(--violet)', fontSize: '1.05rem' }}>{p.name}</h2>
                  <span className="badge badge-green">Actif</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8 }}>📍 {p.address}, {p.city}</p>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem', color: '#475569' }}>
                  <span>👤 {p.max_guests} pers.</span>
                  <span>💰 {p.commission_rate}% commission</span>
                </div>
                {p.cleaner_email && (
                  <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#9B06D4' }}>🧹 Ménage configuré</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
