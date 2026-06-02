'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPropertyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', city: '', max_guests: 2,
    wifi_name: '', wifi_password: '', checkin_time: '16:00', checkout_time: '11:00',
    cleaner_name: '', cleaner_email: '', owner_name: '', owner_email: '',
    commission_rate: 20, platforms: 'airbnb', notes: '', ical_url: '', guide_url: '',
  })

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) router.push('/properties')
    else setLoading(false)
  }

  const field = (label: string, name: string, type = 'text', required = false, placeholder = '') => (
    <div>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>{label}{required && ' *'}</label>
      <input
        type={type} name={name} required={required} placeholder={placeholder}
        value={(form as Record<string, string | number>)[name] as string}
        onChange={handle}
        style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--dark)', outline: 'none', background: 'white' }}
      />
    </div>
  )

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 24 }}>🏡 Ajouter un bien</h1>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>Informations générales</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {field('Nom du bien', 'name', 'text', true, 'Les Embruns')}
            {field('Adresse', 'address', 'text', true, '12 rue de la plage')}
            {field('Ville', 'city', 'text', true, 'Villers-sur-Mer')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {field('Nombre max de personnes', 'max_guests', 'number')}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)', marginBottom: 4 }}>Plateforme</label>
                <select name="platforms" value={form.platforms} onChange={handle} style={{ width: '100%', border: '1px solid var(--lavender)', borderRadius: 8, padding: '8px 12px', fontSize: '0.9rem', color: 'var(--dark)', background: 'white' }}>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking.com</option>
                  <option value="airbnb,booking">Airbnb + Booking</option>
                  <option value="autres">Autres</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>Check-in / Check-out</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            {field('Heure check-in', 'checkin_time', 'time')}
            {field('Heure check-out', 'checkout_time', 'time')}
            {field('Wifi — Réseau', 'wifi_name', 'text', false, 'Embruns-5G')}
            {field('Wifi — Mot de passe', 'wifi_password', 'text', false, '')}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>🧹 Prestataire ménage</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {field('Nom du prestataire', 'cleaner_name', 'text', false, 'Marie Dupont')}
            {field('Email prestataire', 'cleaner_email', 'email', false, 'menage@example.fr')}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8 }}>StayPilot enverra automatiquement un email au prestataire à chaque départ de voyageur.</p>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 16 }}>Propriétaire (si client géré)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {field('Nom du propriétaire', 'owner_name', 'text', false, '')}
            {field('Email propriétaire', 'owner_email', 'email', false, '')}
            {field('Commission (%)', 'commission_rate', 'number')}
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>🔄 Synchronisation automatique (iCal)</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
            Sur Airbnb : Annonce → Disponibilités → Exporter le calendrier → Copier le lien iCal
          </p>
          {field('URL iCal Airbnb', 'ical_url', 'url', false, 'https://www.airbnb.fr/calendar/ical/...')}
          <p style={{ fontSize: '0.78rem', color: '#9B06D4', marginTop: 8 }}>
            ✅ StayPilot synchronisera vos réservations automatiquement toutes les 15 minutes
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>📖 Guide du logement</h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
            Lien envoyé automatiquement au voyageur quand il remplit le formulaire Tally de bienvenue.
          </p>
          {field('URL du guide', 'guide_url', 'url', false, 'https://notion.so/mon-guide-logement')}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : '✅ Enregistrer le bien'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.push('/properties')}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
