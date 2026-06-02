'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/properties', label: 'Biens', icon: '🏡' },
  { href: '/calendrier', label: 'Calendrier', icon: '📆' },
  { href: '/reservations', label: 'Réservations', icon: '📅' },
  { href: '/conversations', label: 'Conversations', icon: '✉️' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/stats', label: 'Statistiques', icon: '📊' },
  { href: '/messages-auto', label: 'Messages auto', icon: '🤖' },
  { href: '/factures', label: 'Factures', icon: '🧾' },
  { href: '/gmail', label: 'Gmail', icon: '📬' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{ background: 'var(--gradient)', width: 220, minHeight: '100vh', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ color: 'var(--gold)', fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.5px' }}>✈️ StayPilot</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Gestion LCD automatisée</div>
      </div>
      {links.map(l => {
        const active = pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 10, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500,
              background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: active ? 'white' : 'rgba(255,255,255,0.75)',
              transition: 'all .2s',
            }}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        )
      })}
      <div style={{ marginTop: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center' }}>
        par Soph&apos;assiste
      </div>
    </aside>
  )
}
