import { getDb } from '@/lib/db'
import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import NotifyButton from '@/components/NotifyButton'
import InvoiceButton from '@/components/InvoiceButton'
import StatusSelect from '@/components/StatusSelect'
import TallyManualForm from '@/components/TallyManualForm'
import SendInvoiceButton from '@/components/SendInvoiceButton'
import TTLockButton from '@/components/TTLockButton'
import GuestEmailEditor from '@/components/GuestEmailEditor'

export const dynamic = 'force-dynamic'

const PLATFORM_LABEL: Record<string, string> = {
  airbnb: '🏠 Airbnb',
  booking: '📘 Booking.com',
  direct: '🤝 Direct',
  autres: '📋 Autres',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--lavender)' }}>
      <span style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.9rem', color: 'var(--dark)', fontWeight: 600 }}>{value || '—'}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 4 }}>
      {children}
    </div>
  )
}

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  const r = db.prepare(`
    SELECT r.*, p.name as property_name, p.cleaner_email, p.wifi_name, p.wifi_password,
           p.checkin_time, p.checkout_time, p.address, p.city
    FROM reservations r
    JOIN properties p ON r.property_id = p.id
    WHERE r.id = ?
  `).get(Number(id)) as Record<string, string | number> | undefined

  if (!r) notFound()

  const invoices = db.prepare('SELECT id, invoice_number, issued_at, guest_email FROM invoices WHERE reservation_id = ? ORDER BY issued_at DESC').all(Number(id)) as { id: number; invoice_number: string; issued_at: string; guest_email: string | null }[]

  const messagesSent: string[] = JSON.parse(String(r.messages_sent || '[]'))

  const hasAnimalOui = String(r.has_animal || '').toLowerCase() === 'oui'

  return (
    <div style={{ maxWidth: 760 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Link href="/reservations" style={{ fontSize: '0.82rem', color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            ← Retour aux réservations
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 4 }}>
            {String(r.guest_name)}
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {String(r.property_name)} · {format(parseISO(String(r.checkin_date)), 'd MMM', { locale: fr })} → {format(parseISO(String(r.checkout_date)), 'd MMM yyyy', { locale: fr })}
          </div>
        </div>
        <StatusSelect reservationId={Number(r.id)} current={String(r.status)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Voyageur */}
        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12, fontSize: '0.95rem' }}>👤 Voyageur</h2>
          <Row label="Nom" value={String(r.guest_name)} />
          <Row label="Email" value={<GuestEmailEditor reservationId={Number(r.id)} email={r.guest_email ? String(r.guest_email) : null} />} />
          <Row label="Plateforme" value={PLATFORM_LABEL[String(r.platform)] ?? String(r.platform)} />
        </div>

        {/* Séjour */}
        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12, fontSize: '0.95rem' }}>📅 Séjour</h2>
          <Row label="Logement" value={String(r.property_name)} />
          <Row label="Arrivée" value={`${format(parseISO(String(r.checkin_date)), 'EEEE d MMMM yyyy', { locale: fr })} à ${r.checkin_time}`} />
          <Row label="Départ" value={`${format(parseISO(String(r.checkout_date)), 'EEEE d MMMM yyyy', { locale: fr })} à ${r.checkout_time}`} />
          <Row label="Durée" value={`${r.nights} nuit${Number(r.nights) > 1 ? 's' : ''}`} />
          <Row label="Prix / nuit" value={`${Number(r.price_per_night).toFixed(0)} €`} />
          <Row label="Total" value={<span style={{ color: '#166534', fontSize: '1rem' }}>{Number(r.total_revenue).toFixed(0)} €</span>} />
        </div>

        {/* Accès */}
        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12, fontSize: '0.95rem' }}>🔑 Accès</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--lavender)' }}>
            <span style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 500 }}>Code serrure</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800, color: '#9B06D4', letterSpacing: 4 }}>
                {String(r.lock_code || '—')}
              </span>
              <TTLockButton reservationId={Number(r.id)} currentCode={r.lock_code ? String(r.lock_code) : null} />
            </div>
          </div>
          <Row label="Wi-Fi" value={r.wifi_name ? `${r.wifi_name}` : null} />
          <Row label="Mot de passe Wi-Fi" value={r.wifi_password ? String(r.wifi_password) : null} />
          <Row label="Adresse" value={r.address ? `${r.address}, ${r.city}` : null} />
        </div>

        {/* Actions */}
        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16, fontSize: '0.95rem' }}>⚡ Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Facture</div>
              <InvoiceButton reservationId={Number(r.id)} guestEmail={r.guest_email ? String(r.guest_email) : null} />
            </div>
            {r.cleaner_email && (
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ménage</div>
                <NotifyButton reservationId={Number(r.id)} label="🧹 Notifier le/la ménagère" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {r.notes && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 8, fontSize: '0.95rem' }}>📝 Notes</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--dark)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{String(r.notes)}</p>
        </div>
      )}

      {/* Factures existantes */}
      {invoices.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12, fontSize: '0.95rem' }}>🧾 Factures générées</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invoices.map(inv => (
              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--lavender)' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#4B1DA8', fontSize: '0.88rem' }}>{inv.invoice_number}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 12 }}>
                    {format(parseISO(inv.issued_at), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <SendInvoiceButton invoiceId={inv.id} guestEmail={inv.guest_email} />
                  <a
                    href={`/api/invoices/${inv.id}/pdf`}
                    target="_blank"
                    style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #4B1DA8', background: 'white', color: '#4B1DA8', textDecoration: 'none', fontWeight: 600 }}
                  >
                    ⬇️ PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire voyageur Tally */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', fontSize: '0.95rem' }}>📋 Formulaire voyageur</h2>
          {r.tally_filled
            ? <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: 20 }}>✅ Rempli</span>
            : <span style={{ fontSize: '0.78rem', color: '#94a3b8', background: '#f1f5f9', padding: '3px 10px', borderRadius: 20 }}>⏳ En attente</span>
          }
        </div>

        {Number(r.tally_filled) === 1 ? (
          <>
            {/* Section voyageurs */}
            <SectionTitle>Voyageurs</SectionTitle>
            <Row label="Nb voyageurs" value={r.guest_count ? String(r.guest_count) : null} />
            <Row label="Prénom 2e voyageur" value={r.guest2_firstname ? String(r.guest2_firstname) : null} />
            <Row label="Mineur(s)" value={r.has_minor != null ? (Number(r.has_minor) === 1 ? 'Oui' : 'Non') : null} />
            <Row label="Téléphone" value={r.guest_phone ? <a href={`tel:${r.guest_phone}`} style={{ color: '#9B06D4' }}>{String(r.guest_phone)}</a> : null} />
            <Row label="Email" value={r.guest_email ? <a href={`mailto:${r.guest_email}`} style={{ color: '#9B06D4' }}>{String(r.guest_email)}</a> : null} />

            {/* Section horaires */}
            <SectionTitle>Horaires prévus</SectionTitle>
            <Row label="Heure d'arrivée" value={r.arrival_time ? String(r.arrival_time) : null} />
            <Row label="Heure de départ" value={r.departure_time ? String(r.departure_time) : null} />

            {/* Section animal */}
            <SectionTitle>Animal</SectionTitle>
            <Row label="Présence d'un animal" value={r.has_animal ? String(r.has_animal) : null} />
            {hasAnimalOui && (
              <>
                <Row label="Gamelles / tapis" value={r.needs_pet_equipment != null ? (Number(r.needs_pet_equipment) === 1 ? 'Oui' : 'Non') : null} />
                <Row label="Nom de l'animal" value={r.pet_name ? String(r.pet_name) : null} />
                <Row label="Type et taille" value={r.pet_description ? String(r.pet_description) : null} />
              </>
            )}

            <div style={{ marginTop: 12 }}>
              <TallyManualForm
                reservationId={Number(r.id)}
                initial={{
                  guest_phone:         r.guest_phone ? String(r.guest_phone) : null,
                  guest_email:         r.guest_email ? String(r.guest_email) : null,
                  guest_count:         r.guest_count ? Number(r.guest_count) : null,
                  guest2_firstname:    r.guest2_firstname ? String(r.guest2_firstname) : null,
                  has_minor:           r.has_minor != null ? Number(r.has_minor) : null,
                  has_animal:          r.has_animal ? String(r.has_animal) : null,
                  arrival_time:        r.arrival_time ? String(r.arrival_time) : null,
                  departure_time:      r.departure_time ? String(r.departure_time) : null,
                  needs_pet_equipment: r.needs_pet_equipment != null ? Number(r.needs_pet_equipment) : null,
                  pet_name:            r.pet_name ? String(r.pet_name) : null,
                  pet_description:     r.pet_description ? String(r.pet_description) : null,
                }}
              />
            </div>
          </>
        ) : (
          <div>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 12 }}>
              Le voyageur n&apos;a pas encore rempli le formulaire d&apos;arrivée.
            </p>
            <TallyManualForm
              reservationId={Number(r.id)}
              initial={{
                guest_phone:         r.guest_phone ? String(r.guest_phone) : null,
                guest_email:         r.guest_email ? String(r.guest_email) : null,
                guest_count:         r.guest_count ? Number(r.guest_count) : null,
                guest2_firstname:    r.guest2_firstname ? String(r.guest2_firstname) : null,
                has_minor:           r.has_minor != null ? Number(r.has_minor) : null,
                has_animal:          r.has_animal ? String(r.has_animal) : null,
                arrival_time:        r.arrival_time ? String(r.arrival_time) : null,
                departure_time:      r.departure_time ? String(r.departure_time) : null,
                needs_pet_equipment: r.needs_pet_equipment != null ? Number(r.needs_pet_equipment) : null,
                pet_name:            r.pet_name ? String(r.pet_name) : null,
                pet_description:     r.pet_description ? String(r.pet_description) : null,
              }}
            />
          </div>
        )}
      </div>

      {/* Messages envoyés */}
      {messagesSent.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12, fontSize: '0.95rem' }}>💬 Messages envoyés</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messagesSent.map((msg, i) => (
              <div key={i} style={{ fontSize: '0.85rem', color: '#16a34a', padding: '4px 0' }}>✅ {msg}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
